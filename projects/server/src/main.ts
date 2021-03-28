import express from 'express';
import { Server } from './server/Server';
import path from 'path';

import { Database } from './database/app/database';
import { CardDatabase } from './database/cards/database';
import { createSuggestRoutes } from './server/v1/routes/suggest';
import { createDeckAPI } from './server/v1/routes/decks/[id]';
import { createDecksAPI } from './server/v1/routes/decks';
import { createCardsAPI } from './server/v1/routes/decks/[id]/cards';

const PORT = 4040;

async function main() {
	const cDb = new CardDatabase(path.join(__dirname, '../assets/AllPrintings.sqlite'));
	const db = await Database.createDatabase('database.sqlite');

	const app = express();

	app.use(createDeckAPI(db, cDb));
	app.use(createDecksAPI(db, cDb));
	app.use(createCardsAPI(db, cDb));
	app.use(createSuggestRoutes(cDb));

	const server = new Server(
		{
			port: PORT,
			host: 'localhost'
		},
		app
	);

	server.start();
}

main();
