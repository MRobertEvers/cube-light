import { Router } from 'express';
import { Request, Response } from 'express';
import { createNameLookupTree } from '../../../app/create-name-lookup-tree';
import {
	DeckOverviewCardInfo,
	getDeckOverviewCardInfo
} from '../../../app/get-deck-overview-card-info';
import { Database } from '../../../database/app/database';
import { CardDatabase } from '../../../database/cards/CardDatabase';
import { PathBuilder } from '../../../utils/PathBuilder';
import { createRoutesDecksIdCards } from './cards';

export function createRoutesDecksId(
	pathBuilder: PathBuilder,
	database: Database,
	cardDatabase: CardDatabase
): Router {
	const { Deck, DeckCard } = database;
	const app = Router();

	const routePath = pathBuilder.pathAt('/');

	app.options(routePath, async (req: Request, res: Response) => {
		res.status(200);
		res.setHeader('Access-Control-Allow-Origin', '*');
		res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
		res.setHeader('Access-Control-Allow-Methods', 'GET, PUT, POST, DELETE');
		res.send();
	});
	app.get(routePath, async (req: Request, res: Response) => {
		const { id } = req.params;
		const deck = await Deck.findByPk(id, {
			include: [DeckCard]
		});

		if (!deck) {
			res.sendStatus(404);
			return;
		}

		// TODO: Typesafe findbypk function
		const deckCards = deck.Deck_Cards!;
		const deckCardsUuids = deckCards.map((dc) => dc.Uuid);

		const cards = await getDeckOverviewCardInfo(deckCardsUuids, cardDatabase);

		const cardInfosMapped = cards.reduce((map, card) => {
			map[card.uuid] = card;
			return map;
		}, {} as Record<string, DeckOverviewCardInfo>);

		res.setHeader('Access-Control-Allow-Origin', '*');
		res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
		res.setHeader('Content-Type', 'application/json');

		const cardData = deckCards.map((deckCard) => {
			const cardData = cardInfosMapped[deckCard.Uuid];
			return {
				...cardData,
				count: deckCard.Count
			};
		});

		res.send(
			JSON.stringify({
				name: deck.Name,
				icon: cardData.length > 0 ? cardData[0].art : null,
				cards: cardData,
				lastEdit: deck.UpdatedAt
			})
		);
	});
	app.delete(routePath, async (req: Request, res: Response) => {
		const { id } = req.params;
		res.setHeader('Access-Control-Allow-Origin', '*');
		res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
		res.setHeader('Content-Type', 'application/json');

		await Deck.destroy({
			where: {
				DeckId: id
			}
		});

		res.status(200);
		res.send(
			JSON.stringify({
				success: true
			})
		);
	});

	app.get(pathBuilder.pathAt('/card-names'), async (req: Request, res: Response) => {
		const { id } = req.params;
		res.setHeader('Access-Control-Allow-Origin', '*');
		res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
		res.setHeader('Content-Type', 'application/json');

		const deck = await Deck.findByPk(id, {
			include: [DeckCard]
		});

		if (!deck) {
			res.sendStatus(404);
			return;
		}

		// TODO: Typesafe findbypk function
		const deckCards = deck.Deck_Cards!;

		const cards = await cardDatabase.queryCardInfo(deckCards.map((card) => card.Uuid));

		const lookupTree = createNameLookupTree(cards.map((card) => card.name));

		res.status(200);
		res.send(JSON.stringify(lookupTree));
	});

	const builder = pathBuilder.routes('/cards');
	app.use(createRoutesDecksIdCards(builder, database, cardDatabase));

	return app;
}
