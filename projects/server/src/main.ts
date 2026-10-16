import express from 'express';
import { Server } from './server/Server';
import path from 'path';
import fs from 'fs';

import { Database } from './database/app/database';
import { CardDatabase } from './database/cards/CardDatabase';
import { createRoutes } from './routes/routes';
import { CardImageService } from './images/card-images';
import { ArtCacheImageCache } from './images/ArtCacheImageCache';
import { artcache } from './images/artcache';
import { NativeImageMeasurer } from './images/image-measurer';
import { DepthMapService } from './images/depth/depth-maps';
import { createKVStore } from './auth/kv-store';
import { UserStore } from './auth/UserStore';
import { SharedDatabase } from './sync/shared-database';
import { ArtMirror } from './images/art-mirror';

const CARD_DATABASE_PATH = path.join(__dirname, './assets/AllPrintings.sqlite');
/** The repository's root, where .env lives (build/src/main.js is four folders down). */
const REPOSITORY = path.resolve(__dirname, '../../../..');
/** How long a stop waits for the last merge into the shared database. */
const STOP_TIMEOUT_MS = 30 * 1000;

async function main() {
	loadSettings();
	const databasePath = process.env.CUBE_DATABASE || 'database.sqlite';
	if (process.env.CUBE_SHARED_DATABASE) {
		await SharedDatabase.seed(databasePath, process.env.CUBE_SHARED_DATABASE).catch((error) => {
			console.error('Shared database: unable to start from the shared copy', error);
		});
	}

	const cDb = new CardDatabase(CARD_DATABASE_PATH);
	const db = await Database.Sqlite(databasePath);
	// Accounts' columns are UserStore's; both are made before the first merge reads them.
	const users = await UserStore.Sqlite(databasePath);
	await db.sync.initialize();
	const shared = await openSharedDatabase(databasePath, db);
	const artCache = await openArtCache();
	const images = new CardImageService(artCache, new NativeImageMeasurer(), undefined, openArtMirror());
	const depthMaps = openDepthMaps(images, artCache);

	const kv = createKVStore();
	const auth = {
		users,
		kv
	};

	const app = express();
	// Behind the client server and a reverse proxy, the sign-in limits need the browser's address.
	if (process.env.CUBE_TRUST_PROXY) app.set('trust proxy', process.env.CUBE_TRUST_PROXY);

	app.use(createRoutes(db, cDb, images, auth, depthMaps));

	const server = new Server(
		{
			port: Number(process.env.CUBE_API_PORT || 4040),
			// '::' accepts IPv4 and IPv6, so the host.local mDNS name works on the LAN.
			host: process.env.CUBE_API_HOST || '::'
		},
		app
	);

	await server.start();
	stopOnSignals(shared);
}

/**
 * Settings from the repository's .env (CUBE_ENV_FILE names another; .env.template lists them).
 * A variable already set in the environment wins over the file.
 */
function loadSettings(): void {
	const file = process.env.CUBE_ENV_FILE || path.join(REPOSITORY, '.env');
	if (!fs.existsSync(file)) return;
	(process as unknown as { loadEnvFile(file: string): void }).loadEnvFile(file);
	console.log(`Settings: ${file}`);
}

/**
 * The application database's copy on the NAS (CUBE_SHARED_DATABASE), shared with the other
 * cube-light servers: merged at boot, after changes here and every CUBE_SHARED_SYNC_SECONDS.
 */
async function openSharedDatabase(databasePath: string, db: Database): Promise<SharedDatabase | null> {
	const file = process.env.CUBE_SHARED_DATABASE;
	if (!file) {
		console.log('Shared database: none (CUBE_SHARED_DATABASE is not set)');
		return null;
	}
	const shared = await SharedDatabase.open({
		local: databasePath,
		shared: file,
		intervalMs: Number(process.env.CUBE_SHARED_SYNC_SECONDS || 300) * 1000,
		changeDelayMs: Number(process.env.CUBE_SHARED_CHANGE_SECONDS || 30) * 1000
	});
	console.log(`Shared database: ${shared.shared} (this server's: ${shared.local})`);
	db.sync.onChange(() => shared.changed());
	await shared.start();
	return shared;
}

/** A stop gives the shared database the last changes first, for at most STOP_TIMEOUT_MS. */
function stopOnSignals(shared: SharedDatabase | null): void {
	let stopping = false;
	for (const signal of ['SIGINT', 'SIGTERM'] as const) {
		process.on(signal, () => {
			if (stopping) return;
			stopping = true;
			const done = shared ? shared.stop() : Promise.resolve();
			const timeout = new Promise((resolve) => setTimeout(resolve, STOP_TIMEOUT_MS).unref());
			Promise.race([done, timeout]).finally(() => process.exit(0));
		});
	}
}

/** A second art cache behind this machine's (TORIMTG_ART_MIRROR): the NAS's art folder. */
function openArtMirror(): ArtMirror | null {
	const root = process.env.TORIMTG_ART_MIRROR;
	if (!root) return null;
	const mirror = new ArtMirror(root);
	console.log(`Card art mirror: ${mirror.root}`);
	return mirror;
}

/**
 * The card art folder shared with torimtgd (3rd/artcache/FORMAT.md): TORIMTG_ART_CACHE, else
 * artcache's default (TMG_SCRYFALL_CACHE, else <per-user data>/torimtg/scryfall_cache). Its index
 * is this machine's: TORIMTG_ART_INDEX, else artcache's default.
 */
async function openArtCache(): Promise<ArtCacheImageCache> {
	const root = process.env.TORIMTG_ART_CACHE || artcache.defaultRoot();
	if (!root) {
		throw new Error('No card art folder: set TORIMTG_ART_CACHE');
	}
	await waitForArtFolder(root);
	const cache = new ArtCacheImageCache(root, {
		index: process.env.TORIMTG_ART_INDEX || null
	});
	console.log(`Card art: ${cache.root} (this machine's index: ${cache.indexPath})`);
	return cache;
}

/**
 * A card art folder on a share that is not mounted yet (at login, before the NAS is) has no parent
 * either. Waits for it rather than failing: a failed start leaves the watcher waiting for a file
 * change, not starting the server again. A new folder in a place that exists is made as usual.
 */
async function waitForArtFolder(root: string): Promise<void> {
	let said = false;
	while (!fs.existsSync(root) && !fs.existsSync(path.dirname(root))) {
		if (!said) {
			console.log(`Waiting for the card art folder ${root} (is its share mounted?)`);
			said = true;
		}
		await new Promise((resolve) => setTimeout(resolve, 5000));
	}
}

/**
 * Height maps ("parallax art") of the art crops, made on request in the same folder; off with
 * CUBELIGHT_DEPTH=0. The model is models/depth-anything-v2-small/model.onnx (CUBELIGHT_DEPTH_MODEL).
 */
function openDepthMaps(images: CardImageService, artCache: ArtCacheImageCache): DepthMapService | null {
	if (process.env.CUBELIGHT_DEPTH === '0') return null;
	const depthMaps = new DepthMapService(images, {
		root: artCache.root,
		index: artCache.indexPath
	});
	const status = depthMaps.status();
	console.log(status.available ? `Parallax art: ${status.stamp}` : `Parallax art is off: ${status.reason}`);
	return depthMaps;
}

main();
