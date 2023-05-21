import type { Request, Response } from 'express';
import { Router, json } from 'express';

import { Database } from '../../database/app/database';
import { expressNotFound } from '../../utils/express-not-found';
import { Op } from 'sequelize';
import { expressBadRequest } from '../../utils/express-bad-request';

export function createRoutes_StorageLocations(database: Database) {
	const { StorageLocation } = database;
	const app = Router();

	app.use(json());
	app.post('/', async (req: Request, res: Response) => {
		const { name } = req.body;
		res.setHeader('Access-Control-Allow-Origin', '*');
		res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

		const location = await StorageLocation.create({
			Name: name
		});

		res.status(200);
		res.send(
			JSON.stringify({
				storage_location_id: location.StorageLocationId
			})
		);
	});

	app.get('/search', async (req: Request, res: Response) => {
		const pageToken = parseInt((req.query['page-token'] as string) ?? '0', 10);
		const pageLimit = parseInt((req.query['limit'] as string) ?? '9999', 10);

		const locations = await StorageLocation.findAll({
			where: {
				StorageLocationId: {
					[Op.gte]: pageToken
				}
			},
			limit: pageLimit
		});

		const response = locations.map((location) => {
			return {
				storage_location_id: location.StorageLocationId,
				name: location.Name
			};
		});

		res.status(200);
		res.setHeader('Content-Type', 'application/json');
		res.send(JSON.stringify(response));
	});

	app.get('/:id', async (req: Request, res: Response) => {
		const id = parseInt(req.params.id, 10);
		if (isNaN(id)) {
			return expressBadRequest(res);
		}

		const location = await StorageLocation.findByPk(id);
		if (!location) {
			return expressNotFound(res);
		}

		const response = {
			storage_location_id: location.StorageLocationId,
			name: location.Name
		};

		res.status(200);
		res.setHeader('Content-Type', 'application/json');
		res.send(JSON.stringify(response));
	});

	return app;
}
