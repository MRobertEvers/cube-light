import { Router } from 'express';
import { Request, Response } from 'express';
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
		const result = await Deck.findOne({
			where: {
				DeckId: id
			},
			include: [DeckCard]
		});

		if (!result) {
			res.sendStatus(404);
		}

		const cardInfos = await cardDatabase.queryCardInfo(result.Deck_Cards.map((dc) => dc.Uuid));
		const cardInfosMapped: Mapped<CardInfo> = cardInfos.reduce((map, card) => {
			map[card.scryfallId] = card;
			return map;
		}, {});

		const cardImages =
			cardInfos.length > 0
				? (await fetchCardDataByScryFallIds(cardInfos.map((card) => card.scryfallId))).data
				: [];
		const cardImagesMapped: Mapped<ScryfallCardInfo> = cardImages.reduce((map, card) => {
			map[card.id] = card;
			return map;
		}, {});

		res.setHeader('Access-Control-Allow-Origin', '*');
		res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
		res.setHeader('Content-Type', 'application/json');
		const data = result.toJSON() as any;
		const cardData = data.Deck_Cards.map((card) => {
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
				name: data.Name,
				icon: cardData.length > 0 ? cardData[0].art : null,
				cards: cardData,
				lastEdit: data.UpdatedAt
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

	const builder = pathBuilder.routes('/cards');
	app.use(createRoutesDecksIdCards(builder, database, cardDatabase));

	return app;
}
