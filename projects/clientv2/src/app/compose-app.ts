import { createToriMTGEngine } from '../engine/tori-mtg-engine';
import { OutboxLocalStore } from '../engine/local-store/local-store';
import { IndexedDbDriver } from '../platform/indexeddb/indexeddb-driver';
import { WebCrypto } from '../platform/crypto';
import { BlobUrls } from '../platform/blob-urls';
import { HttpSyncTransport } from '../platform/http/http-sync-transport';
import { InThreadSyncHost } from '../platform/sync/in-thread-sync-host';
import { BrowserPageLifecycle } from '../platform/page-lifecycle';
import { BrowserDevice } from '../platform/device';
import { BrowserCardScanner } from '../platform/card-scanner/browser-card-scanner';
import { WasmNameIndexBuilder } from '../platform/wasm/name-index-builder';
import { API_URI } from '../platform/api-url';
import { BannerBlendWorkerClient } from '../workers/banner-blend/banner-blend.client';
import { CardListLintWorkerClient } from '../workers/card-list-lint/card-list-lint.client';
import { configureStore, type StoreType } from '../redux/configure-store';
import { startProjections } from '../redux/projections';

/**
 * The one place the app's objects are built, so reading this function shows the whole
 * dependency graph. The engine gets platform adapters and worker clients through its
 * ports; Redux gets the engine; React gets only the store.
 */
export function composeApp(): StoreType {
	const crypto = new WebCrypto();
	const localStore = new OutboxLocalStore(new IndexedDbDriver('torimtg-v1', indexedDB), crypto);
	const transport = new HttpSyncTransport(API_URI, localStore);
	const syncHost = new InThreadSyncHost(localStore, transport, crypto);
	const blobs = new BlobUrls(localStore, syncHost.announce);
	const engine = createToriMTGEngine({
		store: localStore,
		crypto,
		syncHost,
		blobs,
		lifecycle: new BrowserPageLifecycle(),
		device: new BrowserDevice(),
		bannerRenderer: new BannerBlendWorkerClient(),
		cardScanner: new BrowserCardScanner(),
		nameIndexBuilder: new WasmNameIndexBuilder(),
		cardListLinter: new CardListLintWorkerClient()
	});
	const store = configureStore(engine);
	startProjections(store.dispatch, engine.events);
	return store;
}
