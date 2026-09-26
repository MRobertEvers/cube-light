import path from 'path';
import { Router } from 'express';
import { Request, Response } from 'express';
import { CardDatabase } from '../database/cards/CardDatabase';
import { PathBuilder } from '../utils/PathBuilder';

const NAME_INDEX_FILEPATH = path.join(
	__dirname,
	'..',
	'public',
	'NameLookup.nmi'
);
// Written beside the index by tools/scripts/build-name-index.js.
const NAME_INDEX_INFO_FILEPATH = path.join(
	path.dirname(NAME_INDEX_FILEPATH),
	'NameLookup.info.json'
);
const NAME_WASM_FILEPATH = path.join(
	__dirname,
	'..',
	'public',
	'name-index.wasm'
);
export function createRoutesSuggest(
	path: PathBuilder,
	cardDatabase: CardDatabase
) {
	const app = Router();
	let allNames: Promise<string[]> | undefined;

	app.get(path.pathAt('/'), async (req: Request, res: Response) => {
		const { stub } = req.query;

		const cards = await cardDatabase.queryCardsByNameStub(stub as string);

		const cardNames = cards.map((card) => card.name);
		res.setHeader('Content-Type', 'application/json');
		res.send(JSON.stringify(cardNames));
	});

	app.get(
		path.pathAt('/card-names/index'),
		(_req: Request, res: Response) => {
			res.type('application/octet-stream');
			res.sendFile(NAME_INDEX_FILEPATH);
		}
	);

	// The index's card data version and sha256, so a client can tell its copy is out of date.
	app.get(
		path.pathAt('/card-names/info'),
		(_req: Request, res: Response) => {
			res.setHeader('Cache-Control', 'no-cache');
			res.sendFile(
				NAME_INDEX_INFO_FILEPATH,
				{ headers: { 'Content-Type': 'application/json' } },
				function (error) {
					if (error && !res.headersSent) res.sendStatus(404);
				}
			);
		}
	);

	app.get(
		path.pathAt('/card-names/all'),
		async (_req: Request, res: Response) => {
			try {
				allNames ??= cardDatabase.queryAllCardNames().catch((error) => {
					allNames = undefined;
					throw error;
				});
				res.json(await allNames);
			} catch {
				res.sendStatus(500);
			}
		}
	);

	app.get(path.pathAt('/card-names/wasm'), (_req: Request, res: Response) => {
		res.type('application/wasm');
		res.sendFile(NAME_WASM_FILEPATH);
	});

	return app;
}
