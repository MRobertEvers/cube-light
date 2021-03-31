import { json, Router } from 'express';
import type { Request, Response } from 'express';

import { Op } from 'sequelize';
import { CardDatabase } from '../../database/cards/CardDatabase';
import { Database } from '../../database/app/database';
import { PathBuilder } from '../../utils/PathBuilder';
import { createRoutesDecksId } from './[id]';

export function createRoutesDecks(
	pathBuilder: PathBuilder,
	database: Database,
	cardDatabase: CardDatabase
) {
	const { Deck } = database;
	const app = Router();

	const routePath = pathBuilder.pathAt('/');

	app.use(json());
	app.options(routePath, async (req: Request, res: Response) => {
		res.status(200);
		res.setHeader('Access-Control-Allow-Origin', '*');
		res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
		res.setHeader('Access-Control-Allow-Methods', 'GET, PUT, POST, DELETE');
		res.send();
	});
	app.post(routePath, async (req: Request, res: Response) => {
		const { name } = req.body;
		res.setHeader('Access-Control-Allow-Origin', '*');
		res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

		const deck = await Deck.create({
			Name: name
		});

		res.status(200);
		res.send(
			JSON.stringify({
				deckId: deck.DeckId
			})
		);
	});
	app.get(routePath, async (req: Request, res: Response) => {
		const { pageStart = '0', pageSize = '15' } = req.params;
		const pageStartVal = parseInt(pageStart);
		const pageSizeVal = parseInt(pageSize);

		res.setHeader('Access-Control-Allow-Origin', '*');
		if (
			typeof pageStartVal !== 'number' ||
			typeof pageSizeVal !== 'number' ||
			pageStartVal < 0 ||
			pageSizeVal <= 0
		) {
			res.sendStatus(400);
			return;
		}

		const decks = await Deck.findAll({
			where: {
				DeckId: {
					[Op.gte]: pageStartVal
				}
			},
			limit: pageSizeVal
		});

		const response = decks.map((deck) => {
			return {
				deckId: deck.DeckId,
				name: deck.Name,
				art: deck.Art
			};
		});

		res.status(200);
		res.setHeader('Content-Type', 'application/json');
		res.send(JSON.stringify(response));
	});

	const builder = pathBuilder.routes('/:id');
	app.use(createRoutesDecksId(builder, database, cardDatabase));

	return app;
}
