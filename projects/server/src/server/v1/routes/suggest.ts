import { Router } from 'express';
import { Request, Response } from 'express';
import { CardDatabase } from '../../../database/cards/database';

export function createSuggestRoutes(cardDatabase: CardDatabase) {
	const app = Router();

	app.get('/suggest', async (req: Request, res: Response) => {
		const { stub } = req.query;

		const cards = await cardDatabase.queryCardsByNameStub(stub as string);

		const cardNames = cards.map((card) => card.name);
		res.setHeader('Access-Control-Allow-Origin', '*');
		res.setHeader('Content-Type', 'application/json');
		res.send(JSON.stringify(cardNames));
	});

	return app;
}
