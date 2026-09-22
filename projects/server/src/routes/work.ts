import { json, raw, Router, text } from 'express';
import type { NextFunction, Request, Response } from 'express';
import { randomBytes } from 'crypto';
import { Database, WorkItem } from '../database/app/database';
import { CardDatabase } from '../database/cards/CardDatabase';
import { isPublicId } from '../database/app/public-id';
import {
	applyImport,
	resolveImportCards,
	validImportCards
} from '../app/import-deck-cards';
import { imageBaseUrl } from '../images/image-base-url';

/** Runners renew well inside this; a closed desktop tab frees its items once it lapses. */
const LEASE_MS = 90 * 1000;
const MAX_IMAGE_BYTES = 25 * 1024 * 1024;
const IMAGE_TYPES = [
	'image/jpeg',
	'image/png',
	'image/webp',
	'image/heic',
	'image/heif',
	'image/gif'
];

function leaseExpiry(): string {
	return new Date(Date.now() + LEASE_MS).toISOString();
}

/** A running item whose lease lapsed is waiting again, even before another runner claims it. */
function effectiveStatus(item: WorkItem): WorkItem['Status'] {
	return item.Status === 'running' &&
		item.LeaseExpiresAt !== null &&
		item.LeaseExpiresAt < new Date().toISOString()
		? 'pending'
		: item.Status;
}

function workItemResponse(req: Request, item: WorkItem) {
	return {
		workId: item.PublicId,
		kind: item.Kind,
		pipeline: item.Pipeline,
		deck: item.DeckPublicId
			? { deckId: item.DeckPublicId, name: item.DeckName }
			: null,
		status: effectiveStatus(item),
		fileName: item.FileName,
		progress: { completed: item.Completed, total: item.Total },
		cardsAdded: item.CardsAdded,
		error: item.Error,
		imageUrl: `${imageBaseUrl(req)}/work/${item.PublicId}/image`,
		createdAt: item.CreatedAt,
		updatedAt: item.UpdatedAt
	};
}

function validToken(token: unknown): token is string {
	return typeof token === 'string' && /^[A-Za-z0-9_-]{16,64}$/.test(token);
}

export function createRoutesWork(
	database: Database,
	cardDatabase: CardDatabase
): Router {
	const app = Router();

	// CORS headers come from the app-wide middleware; preflights just need an answer.
	app.use('/work', (req: Request, res: Response, next: NextFunction) => {
		if (req.method === 'OPTIONS') {
			res.sendStatus(204);
			return;
		}
		next();
	});
	app.use('/work', json());

	app.get('/work', async (req: Request, res: Response) => {
		const items = await database.listWorkItems();
		res.setHeader('Cache-Control', 'no-store');
		res.json({
			items: items.map((item) => workItemResponse(req, item))
		});
	});

	app.post(
		'/work/card-image-ocr',
		raw({ type: 'image/*', limit: MAX_IMAGE_BYTES }),
		async (req: Request, res: Response) => {
			const deckId = req.query.deckId;
			const fileName = req.query.fileName;
			const pipeline = req.query.pipeline ?? 'card-aware';
			const contentType = req.get('Content-Type')?.split(';')[0].trim();
			if (
				(pipeline !== 'card-aware' && pipeline !== 'paddle-only') ||
				typeof deckId !== 'string' ||
				typeof fileName !== 'string' ||
				fileName.length > 255 ||
				!contentType ||
				!IMAGE_TYPES.includes(contentType) ||
				!Buffer.isBuffer(req.body) ||
				req.body.length === 0
			) {
				res.sendStatus(400);
				return;
			}
			const deck = await database.getDeckByPublicId(deckId);
			if (!deck) {
				res.sendStatus(404);
				return;
			}
			const workId = await database.createWorkItem({
				kind: 'card-image-ocr',
				pipeline,
				deckId: deck.DeckId,
				fileName: fileName || 'photo',
				contentType,
				image: req.body
			});
			const item = await database.getWorkItem(workId);
			res.status(201).json(workItemResponse(req, item!));
		}
	);

	app.get(
		'/work/:id/image',
		async (req: Request<{ id: string }>, res: Response) => {
			if (!isPublicId(req.params.id, 'work')) {
				res.sendStatus(404);
				return;
			}
			const image = await database.getWorkItemImage(req.params.id);
			if (!image) {
				res.sendStatus(404);
				return;
			}
			// Items never change their image, only disappear.
			res.setHeader('Cache-Control', 'private, max-age=86400');
			res.setHeader('Content-Type', image.ContentType);
			res.setHeader('X-Content-Type-Options', 'nosniff');
			res.send(Buffer.from(image.Image));
		}
	);

	app.post(
		'/work/:id/claim',
		async (req: Request<{ id: string }>, res: Response) => {
			const token = randomBytes(18).toString('hex');
			if (
				!isPublicId(req.params.id, 'work') ||
				!(await database.claimWorkItem(
					req.params.id,
					token,
					leaseExpiry()
				))
			) {
				res.sendStatus(409);
				return;
			}
			res.json({ token });
		}
	);

	app.post(
		'/work/:id/progress',
		async (req: Request<{ id: string }>, res: Response) => {
			const { token, completed, total } = req.body ?? {};
			if (
				!validToken(token) ||
				!Number.isInteger(completed) ||
				!Number.isInteger(total) ||
				completed < 0 ||
				total < 0 ||
				completed > total
			) {
				res.sendStatus(400);
				return;
			}
			const renewed = await database.renewWorkItem(
				req.params.id,
				token,
				{ completed, total },
				leaseExpiry()
			);
			res.sendStatus(renewed ? 204 : 409);
		}
	);

	// Cards are added here, all at once and only by the claim holder, so a scan that was
	// abandoned partway and picked up again elsewhere can't add the same cards twice.
	app.post(
		'/work/:id/complete',
		async (req: Request<{ id: string }>, res: Response) => {
			const { token, cards } = req.body ?? {};
			if (
				!validToken(token) ||
				!(
					(Array.isArray(cards) && cards.length === 0) ||
					validImportCards(cards)
				)
			) {
				res.sendStatus(400);
				return;
			}
			const item = await database.getWorkItem(req.params.id);
			const deck =
				item?.DeckPublicId &&
				(await database.getDeckByPublicId(item.DeckPublicId));
			if (!item || !deck) {
				res.sendStatus(404);
				return;
			}
			const resolved =
				cards.length === 0
					? { edits: [], firstCard: undefined, unknownCards: [] }
					: await resolveImportCards(cardDatabase, cards);
			const cardsAdded = resolved.edits.reduce(
				(total, edit) => total + edit.count,
				0
			);
			if (
				!(await database.finishWorkItem(req.params.id, token, {
					status: 'completed',
					cardsAdded
				}))
			) {
				res.sendStatus(409);
				return;
			}
			await applyImport(database, deck, resolved);
			res.json({
				added: cardsAdded,
				unknownCards: resolved.unknownCards
			});
		}
	);

	app.post(
		'/work/:id/fail',
		async (req: Request<{ id: string }>, res: Response) => {
			const { token, error } = req.body ?? {};
			if (!validToken(token) || typeof error !== 'string') {
				res.sendStatus(400);
				return;
			}
			const failed = await database.finishWorkItem(req.params.id, token, {
				status: 'failed',
				error: error.slice(0, 500)
			});
			res.sendStatus(failed ? 204 : 409);
		}
	);

	// Sent with sendBeacon as the runner's tab closes, which only allows a plain-text body.
	app.post(
		'/work/:id/release',
		text(),
		async (req: Request<{ id: string }>, res: Response) => {
			const token = typeof req.body === 'string' ? req.body.trim() : '';
			if (!validToken(token)) {
				res.sendStatus(400);
				return;
			}
			res.sendStatus(
				(await database.releaseWorkItem(req.params.id, token))
					? 204
					: 409
			);
		}
	);

	app.post(
		'/work/:id/retry',
		async (req: Request<{ id: string }>, res: Response) => {
			res.sendStatus(
				(await database.retryWorkItem(req.params.id)) ? 204 : 409
			);
		}
	);

	app.delete(
		'/work/:id',
		async (req: Request<{ id: string }>, res: Response) => {
			res.sendStatus(
				(await database.deleteWorkItem(req.params.id)) ? 204 : 404
			);
		}
	);

	return app;
}
