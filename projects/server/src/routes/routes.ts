import { Router } from 'express';
import { KVStore } from '../auth/kv-store';
import { cors, loadBearerSession, requireSession } from '../auth/middleware';
import { UserStore } from '../auth/UserStore';
import { Database } from '../database/app/database';
import { CardDatabase } from '../database/cards/CardDatabase';
import { CardImageService } from '../images/card-images';
import { PathBuilder } from '../utils/PathBuilder';
import { createRoutesCards } from './cards';
import { createRoutesDecks } from './decks';
import { createRoutesSuggest } from './suggest';
import { createRoutes_Collections } from './collections';
import { createRoutes_StorageLocations } from './storage-locations';
import { createRoutesImages } from './images';
import { createRoutesWork } from './work';
import { createRoutesAuth } from './auth';
import { createSyncRoutes } from '../sync/routes';

/** Card data and images are the same for everyone; all else needs a session. */
const PUBLIC_PREFIXES = ['/auth', '/suggest', '/cards', '/images'];

export type AuthServices = {
	users: UserStore;
	kv: KVStore;
};

export function createRoutes(
	database: Database,
	cardDatabase: CardDatabase,
	images: CardImageService,
	auth: AuthServices
): Router {
	const app = Router();
	let pathBuilder = new PathBuilder();

	app.use(cors);
	const syncReady = database.sync.initialize();
	app.use(async (_req, _res, next) => { await syncReady; next(); });
	app.use(loadBearerSession(database.tokens));
	// Old clients must refresh, rather than write behind the canonical event ledger.
	app.use((req, res, next) => {
		if (!['GET', 'HEAD', 'OPTIONS'].includes(req.method) && /^(\/decks|\/collection|\/storage-location|\/work|\/auth\/profile)(\/|$)/.test(req.path)) {
			res.status(426).json({ error: 'Refresh the application to use local-first synchronization.' });
			return;
		}
		next();
	});
	app.use(createRoutesAuth(auth.users, database.tokens, auth.kv, database.sync));
	app.use(requireSession(PUBLIC_PREFIXES));
	app.use(createSyncRoutes(database.sync, cardDatabase));

	app.use(createRoutesSuggest(pathBuilder.routes('/suggest'), cardDatabase));
	app.use(
		createRoutesDecks(pathBuilder.routes('/decks'), database, cardDatabase)
	);
	app.use(createRoutesCards(pathBuilder.routes('/cards'), cardDatabase));
	app.use(createRoutesImages(images));
	app.use(createRoutesWork(database, cardDatabase));

	app.use('/collection', createRoutes_Collections(database));
	app.use('/storage-location', createRoutes_StorageLocations(database));

	return app;
}
