import { Router } from 'express';
import bodyParser from 'body-parser';
import { Request, Response } from 'express';
import { Database } from '../../../../database/app/database';
import { CardDatabase } from '../../../../database/cards/database';
import { fetchCardDataByScryFallIds } from '../../../../external/scryfall';

export function createCardsAPI(database: Database, cardDatabase: CardDatabase) {
	const { Deck, DeckCard } = database;
	const app = Router();

	app.use(bodyParser.json());
	app.options('/decks/:id/cards', async (req: Request, res: Response) => {
		res.status(200);
		res.setHeader('Access-Control-Allow-Origin', '*');
		res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
		res.setHeader('Access-Control-Allow-Methods', 'GET, PUT, POST');
		res.send();
	});
	app.post('/decks/:id/cards', async (req: Request, res: Response) => {
		const { id } = req.params;
		const { cardName, action = 'add', count = 1 } = req.body as {
			cardName: string;
			action?: 'add' | 'remove' | 'set';
			count?: number;
		};

		res.setHeader('Access-Control-Allow-Origin', '*');
		res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
		if (!cardName) {
			res.sendStatus(400);
			return;
		}
		const deck = await Deck.findOne({
			where: {
				DeckId: id
			},
			include: [DeckCard]
		});

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
		const card = await DeckCard.findOne({
			where: {
				DeckId: id,
				Uuid: cardData.uuid
			}
		});

		switch (action) {
			case 'add':
				{
					if (card) {
						await DeckCard.upsert({
							DeckCardId: card.DeckCardId,
							DeckId: id,
							Uuid: cardData.scryfallId,
							Count: card.Count + count
						});
					} else {
						await DeckCard.upsert({
							DeckId: id,
							Uuid: cardData.scryfallId,
							Count: count
						});
					}

					if (!deck.Art) {
						const arts = await fetchCardDataByScryFallIds([cardData.scryfallId]);
						if (arts.data.length > 0) {
							await Deck.upsert({
								DeckId: deck.DeckId,
								Art: arts.data[0].image_uris.art_crop
							});
						}
					}
				}
				break;
			case 'remove':
				if (card) {
					if (card.Count - count <= 0) {
						await card.destroy();
					} else {
						await DeckCard.upsert({
							DeckCardId: card.DeckCardId,
							DeckId: id,
							Uuid: cardData.scryfallId,
							Count: card.Count - count
						});
					}
				} else {
					res.sendStatus(404);
					return;
				}
				break;
			case 'set':
				if (card) {
					if (count <= 0) {
						await card.destroy();
					} else {
						await DeckCard.upsert({
							DeckCardId: card.DeckCardId,
							DeckId: id,
							Uuid: cardData.scryfallId,
							Count: count
						});
					}
				} else {
					await DeckCard.upsert({
						DeckId: id,
						Uuid: cardData.scryfallId,
						Count: count
					});
				}
				break;
		}

		res.sendStatus(200);
	});

	return app;
}
