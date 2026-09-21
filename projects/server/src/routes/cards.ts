import { Request, Response, Router, urlencoded } from 'express';
import { getCardsDetails } from '../app/get-cards-details';
import { CardDatabase } from '../database/cards/CardDatabase';
import { imageBaseUrl } from '../images/image-base-url';
import { cardImageUrl } from '../images/card-images';
import { PathBuilder } from '../utils/PathBuilder';

export function createRoutesCards(
	path: PathBuilder,
	cardDatabase: CardDatabase
) {
	const app = Router();

	app.use(urlencoded());
	app.post(path.pathAt('/search'), async (req: Request, res: Response) => {
		const { names: namesListString } = req.body as {
			names: string;
		};

		const names = namesListString.split(',');

		const cards = await cardDatabase.getCardUuidsByNames(names);

		res.setHeader('Content-Type', 'application/json');
		res.send(JSON.stringify(cards));
	});

	app.post(path.pathAt('/details'), async (req: Request, res: Response) => {
		const { uuids: uuidsListString } = req.body as {
			uuids: string;
		};

		const uuids = uuidsListString.split(',');
		const cards = await getCardsDetails(
			uuids,
			cardDatabase,
			imageBaseUrl(req)
		);

		res.setHeader('Content-Type', 'application/json');
		res.send(JSON.stringify(cards));
	});

	app.get(path.pathAt('/details'), async (req: Request, res: Response) => {
		const { uuid } = req.query as {
			uuid: string;
		};

		const [card] = await getCardsDetails(
			[uuid],
			cardDatabase,
			imageBaseUrl(req)
		);

		if (!card) {
			res.sendStatus(400);
			return;
		}

		res.setHeader('Content-Type', 'application/json');
		res.send(JSON.stringify(card));
	});

	app.get(path.pathAt('/printings'), async (req: Request, res: Response) => {
		const name = req.query.name;
		if (typeof name !== 'string' || !name.trim() || name.length > 1024) {
			res.sendStatus(400);
			return;
		}
		const cards = await cardDatabase.queryCardsByName(name.trim());
		const baseUrl = imageBaseUrl(req);
		res.json(
			cards.map((card) => ({
				name: card.name,
				uuid: card.uuid,
				setCode: card.setCode,
				setName: card.setName,
				image: cardImageUrl(baseUrl, card.scryfallId, 'normal'),
				art: cardImageUrl(baseUrl, card.scryfallId, 'art_crop')
			}))
		);
	});

	return app;
}
