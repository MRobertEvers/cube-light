import type { Request, Response } from 'express';
import { Router, json } from 'express';

import { Database } from '../../database/app/database';
import { expressNotFound } from '../../utils/express-not-found';
import { isPublicId } from '../../database/app/public-id';

export function createRoutes_Collections(database: Database) {
	const app = Router();

	app.use(json());
	app.post('/', async (req: Request, res: Response) => {
		const { name } = req.body;

		const rowId = await database.createCollection(name);
		const collectionId = (await database.getCollection(rowId))!.PublicId;

		res.status(200);
		res.send(
			JSON.stringify({
				collection_id: collectionId
			})
		);
	});

	app.get('/search', async (req: Request, res: Response) => {
		const pageToken = parseInt(
			(req.query['page-token'] as string) ?? '0',
			10
		);
		const pageLimit = parseInt(
			(req.query['limit'] as string) ?? '9999',
			10
		);

		const collections = await database.listCollections(
			pageToken,
			pageLimit
		);

		const response = collections.map((collection) => ({
			collection_id: collection.PublicId,
			name: collection.Name
		}));

		res.status(200);
		res.setHeader('Content-Type', 'application/json');
		res.send(JSON.stringify(response));
	});

	app.get('/:id', async (req: Request<{ id: string }>, res: Response) => {
		const id = req.params.id;
		if (!isPublicId(id, 'collection')) return expressNotFound(res);

		const collection = await database.getCollectionByPublicId(id);
		if (!collection) {
			return expressNotFound(res);
		}

		const response = {
			collection_id: collection.PublicId,
			name: collection.Name
		};

		res.status(200);
		res.setHeader('Content-Type', 'application/json');
		res.send(JSON.stringify(response));
	});

	return app;
}
