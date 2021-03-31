import { Router, urlencoded } from 'express';
import { Request, Response } from 'express';
import { CardDatabase, DetailedCardInfo } from '../database/cards/database';
import { PathBuilder } from '../utils/PathBuilder';

export function createRoutesCards(path: PathBuilder, cardDatabase: CardDatabase) {
	const app = Router();

	app.use(urlencoded());
	app.post(path.pathAt('/search'), async (req: Request, res: Response) => {
		const { names: namesListString } = req.body as {
			names: string;
		};

		const names = namesListString.split(',');

		const cards = await cardDatabase.getCardUuidsByNames(names);

		res.setHeader('Access-Control-Allow-Origin', '*');
		res.setHeader('Content-Type', 'application/json');
		res.send(JSON.stringify(cards));
	});

	app.post(path.pathAt('/details'), async (req: Request, res: Response) => {
		const { uuids: uuidsListString } = req.body as {
			uuids: string;
		};

		const names = uuidsListString.split(',');

		const cards = await cardDatabase.getCardDataByUuids(names);

		res.setHeader('Access-Control-Allow-Origin', '*');
		res.setHeader('Content-Type', 'application/json');
		res.send(JSON.stringify(cards));
	});

	app.get(path.pathAt('/details'), async (req: Request, res: Response) => {
		const { uuid } = req.query as {
			uuid: string;
		};

		const cards = await cardDatabase.getCardDataByUuids([uuid]);

		if (!cards) {
			res.sendStatus(400);
			return;
		}

		const map = cards.reduce((map, item) => {
			map[item.uuid] = item;
			return map;
		}, {} as Record<string, DetailedCardInfo>);

		res.setHeader('Access-Control-Allow-Origin', '*');
		res.setHeader('Content-Type', 'application/json');
		res.send(JSON.stringify(map));
	});

	return app;
}
