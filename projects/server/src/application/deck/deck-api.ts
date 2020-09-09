import { Express } from 'express';
import { Database } from '../../database/app/database';
import { CardDatabase } from '../../database/cards/database';
import { Request, Response } from 'express';
import bodyParser from 'body-parser';
import { DeckCard } from '../../database/app/tables/deck-card';
import { Deck } from '../../database/app/tables/deck';

export function useDeckApi(app: Express, database: Database, cardDatabase: CardDatabase) {
	const { Deck, DeckCard } = database;

	app.options('/deck/:id', async (req: Request, res: Response) => {
		res.status(200);
		res.setHeader('Access-Control-Allow-Origin', '*');
		res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
		res.setHeader('Access-Control-Allow-Methods', 'GET, PUT, POST');
		res.send();
	});
	app.get('/deck/:id', async (req: Request, res: Response) => {
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

		res.setHeader('Access-Control-Allow-Origin', '*');
		res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
		res.setHeader('Content-Type', 'application/json');
		const data = result.toJSON() as Deck;
		const cardData = data.Deck_Cards.map((card) => {
			// TODO: Better loop
			const cardData = cardInfos.find((info) => info.scryfallId === card.Uuid);
			return {
				...cardData,
				count: card.Count
			};
		});

		res.send(
			JSON.stringify({
				name: data.Name,
				cards: cardData
			})
		);
	});

	app.get('/suggest', async (req: Request, res: Response) => {
		const { stub } = req.query;

		const cards = await cardDatabase.queryCardsByNameStub(stub as string);

		const cardNames = cards.map((card) => card.name);
		res.setHeader('Access-Control-Allow-Origin', '*');
		res.setHeader('Content-Type', 'application/json');
		res.send(JSON.stringify(cardNames));
	});

	app.use(bodyParser.json());
	app.options('/deck/:id/cards', async (req: Request, res: Response) => {
		res.status(200);
		res.setHeader('Access-Control-Allow-Origin', '*');
		res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
		res.setHeader('Access-Control-Allow-Methods', 'GET, PUT, POST');
		res.send();
	});
	app.post('/deck/:id/cards', async (req: Request, res: Response) => {
		const { id } = req.params;
		const { cardName } = req.body;

		res.setHeader('Access-Control-Allow-Origin', '*');
		res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
		if (!cardName) {
			res.sendStatus(400);
			return;
		}
		const result = await Deck.findOne({
			where: {
				DeckId: id
			},
			include: [DeckCard]
		});

		if (!result) {
			res.sendStatus(404);
			return;
		}

		const cards = await cardDatabase.queryCardsByName(cardName);
		if (cards.length === 0) {
			res.sendStatus(404);
			return;
		}
		const card = await DeckCard.findOne({
			where: {
				DeckId: id,
				Uuid: cards[0].scryfallId
			}
		});

		if (card) {
			await DeckCard.upsert({
				DeckCardId: card.DeckCardId,
				DeckId: id,
				Uuid: cards[0].scryfallId,
				Count: card.Count + 1
			});
		} else {
			await DeckCard.upsert({
				DeckId: id,
				Uuid: cards[0].scryfallId,
				Count: 1
			});
		}

		res.sendStatus(200);
	});
}
