import { Router, json } from 'express';
import { Request, Response } from 'express';
import { Database } from '../../../database/app/database';
import { CardDatabase } from '../../../database/cards/CardDatabase';
import { cardImagePath } from '../../../images/card-images';
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
		res.setHeader('Access-Control-Allow-Origin', '*');
		res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
		res.setHeader('Access-Control-Allow-Methods', 'GET, PUT, POST');
		res.send();
	});
	app.options(
		pathBuilder.pathAt('/import'),
		(_req: Request, res: Response) => {
			res.setHeader('Access-Control-Allow-Origin', '*');
			res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
			res.setHeader('Access-Control-Allow-Methods', 'POST');
			res.sendStatus(200);
		}
	);
	app.post(
		pathBuilder.pathAt('/import'),
		async (req: Request<{ id: string }>, res: Response) => {
			res.setHeader('Access-Control-Allow-Origin', '*');
			res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
			const cards = req.body?.cards as
				| Array<{ name?: unknown; count?: unknown; setCode?: unknown }>
				| undefined;
			if (
				!Array.isArray(cards) ||
				cards.length === 0 ||
				cards.length > 1000 ||
				!cards.every(
					(card) =>
						card &&
						typeof card.name === 'string' &&
						card.name.trim() &&
						Number.isInteger(card.count) &&
						(card.count as number) > 0 &&
						(card.count as number) <= 999 &&
						(card.setCode === undefined ||
							typeof card.setCode === 'string')
				)
			) {
				res.sendStatus(400);
				return;
			}
			const deck = await database.getDeckByPublicId(req.params.id);
			if (!deck) {
				res.sendStatus(404);
				return;
			}
			const edits: Array<{ uuid: string; action: 'add'; count: number }> =
				[];
			let firstCard:
				| Awaited<ReturnType<CardDatabase['queryCardsByName']>>[number]
				| undefined;
			const unknownCards: string[] = [];
			for (const card of cards) {
				const printings = await cardDatabase.queryCardsByName(
					(card.name as string).trim()
				);
				const setCode =
					typeof card.setCode === 'string'
						? card.setCode.toUpperCase()
						: undefined;
				const found =
					printings.find(
						(printing) => printing.setCode.toUpperCase() === setCode
					) ?? printings[0];
				if (!found) {
					unknownCards.push(card.name as string);
					continue;
				}
				firstCard ??= found;
				edits.push({
					uuid: found.uuid,
					action: 'add',
					count: card.count as number
				});
			}
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
			const edit = database.applyDeckCardEdit(String(deck.DeckId), edits);
			if (edit?.cardsIn.length && !deck.Art && firstCard) {
				const art = cardImagePath(firstCard.scryfallId, 'art_crop');
				if (art)
					await database.setDeckArt(deck.DeckId, art, firstCard.uuid);
			}
			res.json({
				added: cards.reduce(
					(total, card) => total + (card.count as number),
					0
				)
			});
		}
	);
	const editPath = pathBuilder.pathAt('/edit');
	app.options(editPath, (_req: Request, res: Response) => {
		res.setHeader('Access-Control-Allow-Origin', '*');
		res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
		res.setHeader('Access-Control-Allow-Methods', 'POST');
		res.sendStatus(204);
	});
	app.post(editPath, async (req: Request<{ id: string }>, res: Response) => {
		const { id } = req.params;
		res.setHeader('Access-Control-Allow-Origin', '*');
		res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

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

		const upsertUuids = [...new Set(upsert.map((item) => item.uuid))];
		const foundUpsertCards = await cardDatabase.queryCardInfo(upsertUuids);
		if (foundUpsertCards.length !== upsertUuids.length) {
			res.sendStatus(400);
			return;
		}

		database.applyDeckCardEdit(String(deck.DeckId), [
			...upsert.map((item) => ({ ...item, action: 'set' as const })),
			...remove.map((uuid) => ({
				uuid,
				count: 0,
				action: 'set' as const
			}))
		]);

		res.status(200);
		res.setHeader('Access-Control-Allow-Origin', '*');
		res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
		res.setHeader('Access-Control-Allow-Methods', 'GET, PUT, POST');
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

		res.setHeader('Access-Control-Allow-Origin', '*');
		res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
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
