import { Request, Response, Router, urlencoded } from 'express';
import nodePath from 'path';
import { getCardsDetails } from '../app/get-cards-details';
import { CardDatabase } from '../database/cards/CardDatabase';
import { imageBaseUrl } from '../images/image-base-url';
import { cardImageUrl } from '../images/card-images';
import { PathBuilder } from '../utils/PathBuilder';

// Built by tools/scripts/refresh-mtgjson.py; copy-static links them into the build.
const CARD_PACK_FILEPATH = nodePath.join(__dirname, '..', 'assets', 'CardPack.json.gz');
const CARD_PACK_INFO_FILEPATH = nodePath.join(__dirname, '..', 'assets', 'CardPack.info.json');
// Built by tools/scripts/card-images.py art-pack; copy-static links the folder into the build.
const CARD_ART_DIRECTORY = nodePath.join(__dirname, '..', 'assets', 'card-art');

export function createRoutesCards(
	path: PathBuilder,
	cardDatabase: CardDatabase
) {
	const app = Router();

	app.use(urlencoded());

	// The offline card pack: every card's text, gzip-compressed JSON the client stores as is.
	app.get(path.pathAt('/pack'), (_req: Request, res: Response) => {
		res.type('application/gzip');
		res.setHeader('Cache-Control', 'no-cache');
		res.sendFile(CARD_PACK_FILEPATH, function (error) {
			if (error && !res.headersSent) res.sendStatus(404);
		});
	});

	// The offline card art pack: its index, then its chunks, which never change once named.
	app.get(path.pathAt('/art/index'), (_req: Request, res: Response) => {
		res.setHeader('Cache-Control', 'no-cache');
		res.sendFile(nodePath.join(CARD_ART_DIRECTORY, 'CardArt.index.json'), { headers: { 'Content-Type': 'application/json' } }, function (error) {
			if (error && !res.headersSent) res.sendStatus(404);
		});
	});
	// What the art pack is, without its index's offsets: its size and the index's sha256,
	// which names this build of it, so a client can tell its copy is out of date.
	app.get(path.pathAt('/art/info'), (_req: Request, res: Response) => {
		res.setHeader('Cache-Control', 'no-cache');
		res.sendFile(nodePath.join(CARD_ART_DIRECTORY, 'CardArt.info.json'), { headers: { 'Content-Type': 'application/json' } }, function (error) {
			if (error && !res.headersSent) res.sendStatus(404);
		});
	});
	app.get(path.pathAt('/art/:file'), (req: Request<{ file: string }>, res: Response) => {
		if (!/^CardArt-\d{2}\.bin$/.test(req.params.file)) {
			res.sendStatus(400);
			return;
		}
		res.type('application/octet-stream');
		res.setHeader('Cache-Control', 'no-cache');
		res.sendFile(nodePath.join(CARD_ART_DIRECTORY, req.params.file), function (error) {
			if (error && !res.headersSent) res.sendStatus(404);
		});
	});

	// What the pack holds and its size, so a client can offer it before downloading.
	app.get(path.pathAt('/pack/info'), (_req: Request, res: Response) => {
		res.setHeader('Cache-Control', 'no-cache');
		res.sendFile(CARD_PACK_INFO_FILEPATH, { headers: { 'Content-Type': 'application/json' } }, function (error) {
			if (error && !res.headersSent) res.sendStatus(404);
		});
	});
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
