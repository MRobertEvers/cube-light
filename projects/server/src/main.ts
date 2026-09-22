import express from 'express';
import { Server } from './server/Server';
import path from 'path';
import os from 'os';

import { Database } from './database/app/database';
import { CardDatabase } from './database/cards/CardDatabase';
import { createRoutes } from './routes/routes';
import { CardImageService } from './images/card-images';
import { FileImageCache } from './images/FileImageCache';
import { createKVStore } from './auth/kv-store';
import { UserStore } from './auth/UserStore';

const PORT = 4040;

const CARD_DATABASE_PATH = path.join(__dirname, './assets/AllPrintings.sqlite');

async function main() {
	const cDb = new CardDatabase(CARD_DATABASE_PATH);
	const db = await Database.Sqlite('database.sqlite');
	const images = new CardImageService(
		new FileImageCache(path.join(os.homedir(), 'Documents/mtg-card-images'))
	);

	const kv = createKVStore();
	const auth = {
		users: await UserStore.Sqlite('database.sqlite'),
		kv
	};

	const app = express();

	app.use(createRoutes(db, cDb, images, auth));

	const server = new Server(
		{
			port: PORT,
			// '::' accepts IPv4 and IPv6, so the host.local mDNS name works on the LAN.
			host: '::'
		},
		app
	);

	server.start();
}

main();
