import express from 'express';
import { Server } from './server/Server';
import path from 'path';

import { Database } from './database/app/database';
import { CardDatabase } from './database/cards/database';
import { createRoutes } from './routes/routes';

const PORT = 4040;

const CARD_DATABASE_PATH = path.join(__dirname, './assets/AllPrintings.sqlite');

async function main() {
	const cDb = new CardDatabase(CARD_DATABASE_PATH);
	const db = await Database.createDatabase('database.sqlite');

	const app = express();

	app.use(createRoutes(db, cDb));

	app.listen(PORT, () => {
		console.log(`Listening on port ${PORT}`);
	});

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
