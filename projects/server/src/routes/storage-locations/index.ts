import type { Request, Response } from 'express';
import { Router, json } from 'express';

import { Database } from '../../database/app/database';
import { expressNotFound } from '../../utils/express-not-found';
import { isPublicId } from '../../database/app/public-id';

export function createRoutes_StorageLocations(database: Database) {
	const app = Router();

	app.use(json());
	app.post('/', async (req: Request, res: Response) => {
		const { name } = req.body;

		const rowId = await database.createStorageLocation(name);
		const storageLocationId = (await database.getStorageLocation(rowId))!
			.PublicId;

		res.status(200);
		res.send(
			JSON.stringify({
				storage_location_id: storageLocationId
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

		const locations = await database.listStorageLocations(
			pageToken,
			pageLimit
		);

		const response = locations.map((location) => ({
			storage_location_id: location.PublicId,
			name: location.Name
		}));

		res.status(200);
		res.setHeader('Content-Type', 'application/json');
		res.send(JSON.stringify(response));
	});

	app.get('/:id', async (req: Request<{ id: string }>, res: Response) => {
		const id = req.params.id;
		if (!isPublicId(id, 'location')) return expressNotFound(res);

		const location = await database.getStorageLocationByPublicId(id);
		if (!location) {
			return expressNotFound(res);
		}

		const response = {
			storage_location_id: location.PublicId,
			name: location.Name
		};

		res.status(200);
		res.setHeader('Content-Type', 'application/json');
		res.send(JSON.stringify(response));
	});

	return app;
}
