import type { DeckSummaries } from '../domain/models/deck';
import { createToriMTG } from './core/core';
import { LocalReader } from './core/local-reader';
import type { LocalStore, ToriMTG } from './core/types';
import { BannersApi } from './api/banners';
import { CardApi } from './api/cards';
import { DeckApi } from './api/decks';
import { LibraryApi } from './api/library';
import { ProfileApi } from './api/profile';
import { ScansApi } from './api/scans';
import { SessionApi } from './api/session';
import { SyncApi } from './api/sync';
import { WorkApi } from './api/work';
import { EngineEvents } from './events';
import { ArtworkSidecars } from './jobs/artwork-sidecars';
import { BannerBlending } from './jobs/banner-blending';
import { DeferredWorkRunner } from './jobs/deferred-work-runner';
import { ImageImportQueue } from './jobs/image-import-queue';
import { WorkQueue } from './jobs/work-queue';
import type {
	BannerRenderer,
	BlobUrlResolver,
	CardListLinter,
	CardNameIndexBuilder,
	CardScanner,
	Crypto,
	DeviceProfile,
	OfflineShell,
	PageLifecycle,
	SyncHost
} from './ports';

/**
 * The engine's whole surface: one semantic method per thing a person does. Thunks are the
 * only callers. Nothing here exposes storage rows, outbox intents, worker messages or HTTP.
 */
export type ToriMTGEngine = {
	session: Pick<SessionApi, 'current' | 'signIn' | 'createFirstAccount' | 'signOut'>;
	decks: Pick<
		DeckApi,
		| 'list' | 'listLocal' | 'get' | 'getLocal' | 'history'
		| 'create' | 'rename' | 'delete' | 'setPalette' | 'setTopStyle' | 'setBoardVisualization'
		| 'addCardByName' | 'applyCardSteps' | 'moveCards' | 'removeCards' | 'importList'
		| 'addNote' | 'editNote' | 'removeNote' | 'setTags'
	>;
	banners: Pick<BannersApi, 'chooseCard' | 'crop' | 'render' | 'preview' | 'cancelPreview' | 'subjectMask' | 'cancelSubjectMask'>;
	cards: Pick<
		CardApi,
		'details' | 'printings' | 'allNames' | 'prepareNameSearch' | 'suggestNames' | 'prepareListChecks' | 'checkList' | 'completeName'
	>;
	library: Pick<
		LibraryApi,
		| 'overview' | 'overviewLocal' | 'getCollection' | 'getCollectionLocal' | 'getLocation' | 'getLocationLocal'
		| 'createCollection' | 'renameCollection' | 'setCollectionRole' | 'deleteCollection'
		| 'createStorageLocation' | 'describeStorageLocation' | 'deleteStorageLocation'
		| 'addCardByName' | 'addCards' | 'importList' | 'removeCards' | 'moveCards' | 'placeCards'
		| 'addMissingFromDeck' | 'applyCardSteps'
	>;
	profile: Pick<ProfileApi, 'setArtwork' | 'printingView' | 'setPrintingView' | 'deckGroups' | 'setDeckGroups'>;
	scans: Pick<
		ScansApi,
		| 'scansAreSlowHere' | 'scanPhoto' | 'queueForDesktop' | 'runQueued' | 'runQueuedScansHere' | 'watchQueue'
		| 'addCandidate' | 'dismiss' | 'retry' | 'remove'
	>;
	sync: Pick<SyncApi, 'pendingEdits' | 'keepMine' | 'useServer' | 'exportUnsynced' | 'retryNow'>;
	offlineShell: Pick<OfflineShell, 'watch' | 'running' | 'mode' | 'setMode'>;
	events: Pick<EngineEvents, 'subscribe'>;
};

/** What the engine is built from. app/ supplies platform adapters and worker clients. */
export type EnginePorts = {
	store: LocalStore;
	crypto: Crypto;
	syncHost: SyncHost;
	blobs: BlobUrlResolver;
	lifecycle: PageLifecycle;
	device: DeviceProfile;
	bannerRenderer: BannerRenderer;
	cardScanner: CardScanner;
	nameIndexBuilder: CardNameIndexBuilder;
	cardListLinter: CardListLinter;
	offlineShell: OfflineShell;
};

export function createToriMTGEngine(ports: EnginePorts): ToriMTGEngine {
	const { store, crypto, syncHost, blobs, lifecycle, device, bannerRenderer, cardScanner, nameIndexBuilder, cardListLinter, offlineShell } = ports;
	const events = new EngineEvents();
	const tori = createToriMTG(store, syncHost, blobs, lifecycle);
	const reader = new LocalReader(tori);
	const cards = new CardApi(reader, nameIndexBuilder, cardListLinter);
	const decks = new DeckApi(tori, reader, cards, new ArtworkSidecars(tori, reader));
	const work = new WorkApi(tori, reader, cards, crypto);
	const workQueue = new WorkQueue(work, events, lifecycle);
	const imageImports = new ImageImportQueue(decks, cards, cardScanner, events);
	const runner = new DeferredWorkRunner(work, workQueue, imageImports, events, lifecycle, device);
	publishChanges(tori, events);
	return {
		session: new SessionApi(tori),
		decks,
		banners: new BannersApi(decks, new BannerBlending(bannerRenderer, decks), device),
		cards,
		library: new LibraryApi(tori, reader, cards),
		profile: new ProfileApi(tori),
		scans: new ScansApi(workQueue, imageImports, runner, device),
		sync: new SyncApi(tori),
		offlineShell,
		events
	};
}

/**
 * Turns the core's change notices into engine events: data-changed for every notice, the
 * sync status after it, and session-expired when the account signs out or the server
 * refuses the session. Notices that arrive while the status is read collapse into one read.
 */
function publishChanges(tori: ToriMTG, events: EngineEvents): void {
	let account: string | null = null;
	let reading = false;
	let dirty = false;
	async function readStatus() {
		reading = true;
		try {
			while (dirty) {
				dirty = false;
				const snapshot = await tori.queries.read<DeckSummaries>({ type: 'decks' });
				const { localRevision, pendingCount, conflictCount, refresh, lastValidatedAt, lastError } = snapshot;
				events.emit({ type: 'sync-status', status: { localRevision, pendingCount, conflictCount, refresh, lastValidatedAt, lastError } });
				if (refresh === 'auth-required') events.emit({ type: 'session-expired' });
			}
		} catch {
			/* An account lock discards pending reads. */
		} finally {
			reading = false;
		}
	}
	tori.subscribe((notice) => {
		const previous = account;
		account = notice.partition;
		// An empty partition means this account signed out, possibly in another tab.
		if (previous && !notice.partition) events.emit({ type: 'session-expired' });
		events.emit({ type: 'data-changed', account: notice.partition, revision: notice.localRevision });
		dirty = true;
		if (!reading) void readStatus();
	});
}
