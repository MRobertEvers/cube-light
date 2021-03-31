import path from 'path';
import { Router } from 'express';
import { Request, Response } from 'express';
import { CardDatabase } from '../database/cards/CardDatabase';
import { PathBuilder } from '../utils/PathBuilder';

const NAME_LOOKUP_TREE_FILEPATH = path.join(__dirname, '..', 'public', 'NameLookup.json');
export function createRoutesSuggest(path: PathBuilder, cardDatabase: CardDatabase) {
	const app = Router();

	app.get(path.pathAt('/'), async (req: Request, res: Response) => {
		const { stub } = req.query;

		const cards = await cardDatabase.queryCardsByNameStub(stub as string);

		const cardNames = cards.map((card) => card.name);
		res.setHeader('Access-Control-Allow-Origin', '*');
		res.setHeader('Content-Type', 'application/json');
		res.send(JSON.stringify(cardNames));
	});

	app.use(path.pathAt('/card-names'), async (req: Request, res: Response) => {
		res.setHeader('Access-Control-Allow-Origin', '*');
		res.setHeader('Content-Type', 'application/json');
		res.sendFile(NAME_LOOKUP_TREE_FILEPATH);
	});

	return app;
}
