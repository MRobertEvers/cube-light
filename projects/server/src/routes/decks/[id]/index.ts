import { Router } from 'express';
import { Request, Response } from 'express';
import { createNameLookupTree } from '../../../app/create-name-lookup-tree';
import { CardInfo, Database } from '../../../database/app/database';
import { CardDatabase } from '../../../database/cards/database';
import { fetchCardDataByScryFallIds, ScryfallCardInfo } from '../../../external/scryfall';
import { PathBuilder } from '../../../utils/PathBuilder';
import { Mapped } from '../../../utils/templates.types';
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

		const cardInfos = await cardDatabase.queryCardInfo(deckCards.map((dc) => dc.Uuid));

		const cardInfosMapped: Record<string, CardInfo> = cardInfos.reduce((map, card) => {
			map[card.scryfallId] = card;
			return map;
		}, {} as Record<string, CardInfo>);

		const cardImages =
			cardInfos.length > 0
				? (await fetchCardDataByScryFallIds(cardInfos.map((card) => card.scryfallId))).data
				: [];

		const cardImagesMapped: Record<string, ScryfallCardInfo> = cardImages.reduce(
			(map, card) => {
				map[card.id] = card;
				return map;
			},
			{} as Record<string, ScryfallCardInfo>
		);

		res.setHeader('Access-Control-Allow-Origin', '*');
		res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
		res.setHeader('Content-Type', 'application/json');

		const cardData = deckCards.map((card) => {
			const cardImage = cardImagesMapped[card.Uuid];
			const cardData = cardInfosMapped[card.Uuid];
			return {
				...cardData,
				image: cardImage?.image_uris.small,
				art: cardImage?.image_uris.art_crop,
				count: card.Count
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
