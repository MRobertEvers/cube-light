import { Router, json } from 'express';
import { Request, Response } from 'express';
import { Database } from '../../../database/app/database';
import { CardDatabase } from '../../../database/cards/CardDatabase';
import { cardImagePath } from '../../../images/card-images';
import {
	applyImport,
	resolveImportCards,
	validImportCards
} from '../../../app/import-deck-cards';
import { PathBuilder } from '../../../utils/PathBuilder';

export function createRoutesDecksIdCards(
	pathBuilder: PathBuilder,
	database: Database,
	cardDatabase: CardDatabase
) {
	const app = Router();

	const routePath = pathBuilder.pathAt('/');

	app.use(json());
	app.options(routePath, async (req: Request, res: Response) => {
		res.status(200);
		res.send();
	});
	app.options(
		pathBuilder.pathAt('/import'),
		(_req: Request, res: Response) => {
			res.sendStatus(200);
		}
	);
	app.post(
		pathBuilder.pathAt('/import'),
		async (req: Request<{ id: string }>, res: Response) => {
			const cards: unknown = req.body?.cards;
			if (!validImportCards(cards)) {
				res.sendStatus(400);
				return;
			}
			const deck = await database.getDeckByPublicId(req.params.id);
			if (!deck) {
				res.sendStatus(404);
				return;
			}
			const resolved = await resolveImportCards(cardDatabase, cards);
			const { unknownCards } = resolved;
			if (unknownCards.length > 0) {
				res.status(400).json({
					error:
						unknownCards.length === 1
							? `Unknown card: ${unknownCards[0]}`
							: `Unknown cards: ${unknownCards.join(', ')}`,
					unknownCards
				});
				return;
			}
			res.json({ added: await applyImport(database, deck, resolved) });
		}
	);
	const editPath = pathBuilder.pathAt('/edit');
	app.options(editPath, (_req: Request, res: Response) => {
		res.sendStatus(204);
	});
	app.post(editPath, async (req: Request<{ id: string }>, res: Response) => {
		const { id } = req.params;

		const { remove, upsert } = (req.body || {}) as {
			remove: string[];
			upsert: Array<{ uuid: string; count: number }>;
		};
		if (
			!Array.isArray(remove) ||
			!remove.every((uuid) => typeof uuid === 'string') ||
			!Array.isArray(upsert) ||
			!upsert.every(
				(item) =>
					item &&
					typeof item.uuid === 'string' &&
					Number.isInteger(item.count) &&
					item.count > 0
			)
		) {
			res.sendStatus(400);
			return;
		}

		const deck = await database.getDeckByPublicId(id);

		if (!deck) {
			res.sendStatus(400);
			return;
		}

		const upsertUuids = Array.from(new Set(upsert.map((item) => item.uuid)));
		const foundUpsertCards = await cardDatabase.queryCardInfo(upsertUuids);
		if (foundUpsertCards.length !== upsertUuids.length) {
			res.sendStatus(400);
			return;
		}

		database.applyDeckCardEdit(
			String(deck.DeckId),
			upsert
				.map((item) => ({
					uuid: item.uuid,
					count: item.count,
					action: 'set' as const
				}))
				.concat(
					remove.map((uuid) => ({
						uuid,
						count: 0,
						action: 'set' as const
					}))
				)
		);

		res.status(200);
		res.send();
	});
	app.post(routePath, async (req: Request<{ id: string }>, res: Response) => {
		const { id } = req.params;

		const {
			cardName,
			action = 'add',
			count = 1
		} = (req.body || {}) as {
			cardName: string;
			action?: 'add' | 'remove' | 'set';
			count?: number;
		};

		if (
			typeof cardName !== 'string' ||
			!cardName.trim() ||
			!['add', 'remove', 'set'].includes(action) ||
			!Number.isInteger(count) ||
			count < 0 ||
			(action !== 'set' && count === 0)
		) {
			res.sendStatus(400);
			return;
		}
		const deck = await database.getDeckByPublicId(id);

		if (!deck) {
			res.sendStatus(404);
			return;
		}

		const cards = await cardDatabase.queryCardsByName(cardName);
		if (cards.length === 0) {
			res.sendStatus(404);
			return;
		}
		const cardData = cards[0];
		const card = await database.findDeckCard(
			String(deck.DeckId),
			cardData.uuid
		);
		if (action === 'remove' && !card) {
			res.sendStatus(404);
			return;
		}
		const edit = database.applyDeckCardEdit(String(deck.DeckId), [
			{ uuid: cardData.uuid, action, count }
		]);
		if (edit?.cardsIn.length && !deck.Art) {
			const art = cardImagePath(cardData.scryfallId, 'art_crop');
			if (art) await database.setDeckArt(deck.DeckId, art, cardData.uuid);
		}

		res.sendStatus(200);
	});

	return app;
}
