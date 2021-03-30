import { Router } from 'express';
import { Request, Response } from 'express';
import { CardDatabase } from '../database/cards/database';
import { PathBuilder } from '../utils/PathBuilder';

export function createRoutesCards(path: PathBuilder, cardDatabase: CardDatabase) {
	const app = Router();

	app.get(path.pathAt('/'), async (req: Request, res: Response) => {
		const { names: namesListString } = req.query as {
			names: string;
		};

		const names = namesListString.split(',');

		const cards = await cardDatabase.getCardUuidsByNames(names);

		res.setHeader('Access-Control-Allow-Origin', '*');
		res.setHeader('Content-Type', 'application/json');
		res.send(JSON.stringify(cards));
	});

	return app;
}
