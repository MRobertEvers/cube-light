import express from 'express';
import { Server } from './server/Server';
import path from 'path';

import { Database } from './database/app/database';
import { CardDatabase } from './database/cards/CardDatabase';
import { createRoutes } from './routes/routes';
import { CardImageService } from './images/card-images';
import { ArtCacheImageCache } from './images/ArtCacheImageCache';
import { artcache } from './images/artcache';
import { NativeImageMeasurer } from './images/image-measurer';
import { createKVStore } from './auth/kv-store';
import { UserStore } from './auth/UserStore';

const PORT = 4040;

const CARD_DATABASE_PATH = path.join(__dirname, './assets/AllPrintings.sqlite');

async function main() {
	const cDb = new CardDatabase(CARD_DATABASE_PATH);
	const db = await Database.Sqlite('database.sqlite');
	const images = new CardImageService(openArtCache(), new NativeImageMeasurer());

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

/**
 * The card art folder shared with torimtgd (3rd/artcache/FORMAT.md): TORIMTG_ART_CACHE, else
 * artcache's default (TMG_SCRYFALL_CACHE, else <per-user data>/torimtg/scryfall_cache). Its index
 * is this machine's: TORIMTG_ART_INDEX, else artcache's default.
 */
function openArtCache(): ArtCacheImageCache {
	const root = process.env.TORIMTG_ART_CACHE || artcache.defaultRoot();
	if (!root) {
		throw new Error('No card art folder: set TORIMTG_ART_CACHE');
	}
	const cache = new ArtCacheImageCache(root, {
		index: process.env.TORIMTG_ART_INDEX || null
	});
	console.log(`Card art: ${cache.root} (this machine's index: ${cache.indexPath})`);
	return cache;
}

main();
