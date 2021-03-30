import { Router } from 'express';
import { Database } from '../database/app/database';
import { CardDatabase } from '../database/cards/database';
import { PathBuilder } from '../utils/PathBuilder';
import { createRoutesDecks } from './decks';
import { createRoutesSuggest } from './suggest';

export function createRoutes(database: Database, cardDatabase: CardDatabase): Router {
	const app = Router();
	let pathBuilder = new PathBuilder();

	app.use(createRoutesSuggest(pathBuilder.routes('/suggest'), cardDatabase));
	app.use(createRoutesDecks(pathBuilder.routes('/decks'), database, cardDatabase));

	return app;
}
