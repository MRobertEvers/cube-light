import path from 'path';
import { Router } from 'express';
import { Request, Response } from 'express';
import { CardDatabase } from '../database/cards/CardDatabase';
import { PathBuilder } from '../utils/PathBuilder';

const NAME_INDEX_FILEPATH = path.join(__dirname, '..', 'public', 'NameLookup.nmi');
const NAME_WASM_FILEPATH = path.join(__dirname, '..', 'public', 'name-index.wasm');
export function createRoutesSuggest(path: PathBuilder, cardDatabase: CardDatabase) {
	const app = Router();
	let allNames: Promise<string[]> | undefined;

	app.get(path.pathAt('/'), async (req: Request, res: Response) => {
		const { stub } = req.query;

		const cards = await cardDatabase.queryCardsByNameStub(stub as string);

		const cardNames = cards.map((card) => card.name);
		res.setHeader('Access-Control-Allow-Origin', '*');
		res.setHeader('Content-Type', 'application/json');
		res.send(JSON.stringify(cardNames));
	});

	app.get(path.pathAt('/card-names/index'), (_req: Request, res: Response) => {
		res.setHeader('Access-Control-Allow-Origin', '*');
		res.type('application/octet-stream');
		res.sendFile(NAME_INDEX_FILEPATH);
	});

	app.get(path.pathAt('/card-names/all'), async (_req: Request, res: Response) => {
		res.setHeader('Access-Control-Allow-Origin', '*');
		try {
			allNames ??= cardDatabase.queryAllCardNames().catch((error) => {
				allNames = undefined;
				throw error;
			});
			res.json(await allNames);
		} catch {
			res.sendStatus(500);
		}
	});

	app.get(path.pathAt('/card-names/wasm'), (_req: Request, res: Response) => {
		res.setHeader('Access-Control-Allow-Origin', '*');
		res.type('application/wasm');
		res.sendFile(NAME_WASM_FILEPATH);
	});

	return app;
}
