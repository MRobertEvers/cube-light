import { Router } from 'express';
import { Database } from '../database/app/database';
import { CardDatabase } from '../database/cards/CardDatabase';
import { PathBuilder } from '../utils/PathBuilder';
import { createRoutesCards } from './cards';
import { createRoutesDecks } from './decks';
import { createRoutesSuggest } from './suggest';

export function createRoutes(database: Database, cardDatabase: CardDatabase): Router {
	const app = Router();
	let pathBuilder = new PathBuilder();

	app.use(createRoutesSuggest(pathBuilder.routes('/suggest'), cardDatabase));
	app.use(createRoutesDecks(pathBuilder.routes('/decks'), database, cardDatabase));
	app.use(createRoutesCards(pathBuilder.routes('/cards'), cardDatabase));

	return app;
}
