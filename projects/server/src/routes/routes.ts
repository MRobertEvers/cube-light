import { NextFunction, Request, Response, Router } from 'express';
import { Database } from '../database/app/database';
import { CardDatabase } from '../database/cards/CardDatabase';
import { PathBuilder } from '../utils/PathBuilder';
import { createRoutesCards } from './cards';
import { createRoutesDecks } from './decks';
import { createRoutesSuggest } from './suggest';
import { createRoutes_Collections } from './collections';
import { createRoutes_StorageLocations } from './storage-locations';

export function createRoutes(database: Database, cardDatabase: CardDatabase): Router {
	const app = Router();
	let pathBuilder = new PathBuilder();

	app.use(async (_: Request, res: Response, next: NextFunction) => {
		res.setHeader('Access-Control-Allow-Origin', '*');
		res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
		res.setHeader('Access-Control-Allow-Methods', 'GET, PUT, POST, DELETE');
		next();
	});

	app.use(createRoutesSuggest(pathBuilder.routes('/suggest'), cardDatabase));
	app.use(createRoutesDecks(pathBuilder.routes('/decks'), database, cardDatabase));
	app.use(createRoutesCards(pathBuilder.routes('/cards'), cardDatabase));

	app.use('/collection', createRoutes_Collections(database));
	app.use('/storage-location', createRoutes_StorageLocations(database));

	return app;
}
