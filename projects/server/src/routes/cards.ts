import { Router, urlencoded } from 'express';
import { Request, Response } from 'express';
import { getCardsDetails } from '../app/get-cards-details';
import { CardDatabase, DetailedCardInfo } from '../database/cards/CardDatabase';
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

		const uuids = uuidsListString.split(',');
		const cards = await getCardsDetails(uuids, cardDatabase);

		res.setHeader('Access-Control-Allow-Origin', '*');
		res.setHeader('Content-Type', 'application/json');
		res.send(JSON.stringify(cards));
	});

	app.get(path.pathAt('/details'), async (req: Request, res: Response) => {
		const { uuid } = req.query as {
			uuid: string;
		};

		const [card] = await getCardsDetails([uuid], cardDatabase);

		if (!card) {
			res.sendStatus(400);
			return;
		}

		res.setHeader('Access-Control-Allow-Origin', '*');
		res.setHeader('Content-Type', 'application/json');
		res.send(JSON.stringify(card));
	});

	return app;
}
