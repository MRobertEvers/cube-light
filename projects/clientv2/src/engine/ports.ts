import type {
	AccountScope,
	AuthSession,
	CommandOutcome,
	CommandRequest,
	ResourceQuery,
	StoredResource,
	SyncPage
} from '@torimtg/core';
import type { LocalBlob, LocalNotice, ReplicaMeta } from './core/types';
import type {
	BannerBlendJob,
	BannerBlendProgress,
	BannerBlendVariant,
	BannerProtection,
	BannerSubjectMask
} from '../domain/appearance/banner-blend';
import type { CardImagePipeline } from '../domain/scans/image-scan-pipelines';
import type { CardImageCandidate, ImageRegion } from '../domain/scans/scan-candidates';
import type { TableName } from './local-store/schema';
import type { CardListProblem } from '../domain/card-names/card-list-problem';
import type { OfflineShellStatus } from '../domain/models/offline-shell';
import type { BuildInfo, ShellMode } from '../domain/models/build-info';
import type { Connectivity } from '../domain/models/connectivity';
import type { CardPackInfo, InstalledCardPack } from '../domain/models/card-pack';

/**
 * Everything the ToriMTGEngine needs from outside itself. The engine imports only these
 * interfaces; platform/ adapters and workers/ clients implement them, and app/ wires them.
 */

// ── Storage ──────────────────────────────────────────────────────────────────

export type TableKey = string | number | Array<string | number>;

/** One transaction's view of the local tables. */
export interface Tables {
	get<T>(table: TableName, key: TableKey): Promise<T | undefined>;
	all<T>(table: TableName, partition?: string): Promise<T[]>;
	put(table: TableName, value: unknown): Promise<void>;
	remove(table: TableName, key: TableKey): Promise<void>;
}

/** Durable tables with atomic transactions (IndexedDB in the browser). */
export interface TableDatabase {
	open(): Promise<void>;
	close(): void;
	transaction<T>(
		tables: readonly TableName[],
		mode: 'readonly' | 'readwrite',
		work: (tables: Tables) => Promise<T>
	): Promise<T>;
}

export interface Crypto {
	randomUUID(): string;
	/** A real SHA-256: it checks hashes the server computed. */
	sha256Hex(data: BufferSource): Promise<string>;
}

// ── Sync ─────────────────────────────────────────────────────────────────────

/** Runs the SyncCoordinator and reports what it changed in local storage. */
export interface SyncHost {
	connect(): Promise<void>;
	wake(): Promise<void>;
	authenticate(id: string, credentials?: { username: string; password: string }): Promise<void>;
	subscribe(listener: (notice: LocalNotice) => void): () => void;
}

/** The server's sync protocol. Errors are SyncTransportErrors. */
export interface SyncTransport {
	command(request: CommandRequest): Promise<CommandOutcome>;
	pull(scope: AccountScope, meta: ReplicaMeta, operationIds: string[]): Promise<SyncPage>;
	resource(query: ResourceQuery): Promise<StoredResource>;
	upload(scope: AccountScope, blob: LocalBlob): Promise<number>;
	authenticate(type: string, credentials?: { username: string; password: string }): Promise<AuthSession>;
}

/** The offline card pack: its download from the server and its storage on this device. */
export interface CardPackStore {
	/** The pack the server offers; null when it cannot be reached or has none. */
	offered(): Promise<CardPackInfo | null>;
	installed(): Promise<InstalledCardPack | null>;
	/** Downloads the offered pack and replaces the installed one, reporting bytes as they arrive. */
	install(onProgress: (received: number, total: number) => void): Promise<InstalledCardPack>;
	remove(): Promise<void>;
	/** The installed pack's JSON, decompressed; null when none is installed. */
	read(): Promise<string | null>;
}

/** Whether the server can be reached now. */
export interface Reachability {
	current(): Connectivity;
	/** Calls the listener on every change. Returns a stop function. */
	watch(listener: (connectivity: Connectivity) => void): () => void;
}

/** Told how each server request went, by the transport that makes it. */
export interface ReachabilityReport {
	/** The server answered, whatever the answer. */
	answered(): void;
	/** No answer: the request failed, timed out, or a proxy said the server is down. */
	unanswered(): void;
}

/** A failed server request; status 0 means the server could not be reached. */
export class SyncTransportError extends Error {
	readonly status: number;
	readonly retryAfter: number;
	constructor(message: string, status: number, retryAfter?: number) {
		super(message);
		this.status = status;
		this.retryAfter = retryAfter === undefined ? 0 : retryAfter;
	}
}

// ── The page around the engine ───────────────────────────────────────────────

/** Turns a stored blob id into a URL an image element can load. */
export interface BlobUrlResolver {
	url(id: string): string;
}

/** When the person comes back to the app, and when they leave it. */
export interface PageLifecycle {
	/** Called on focus, when the page becomes visible again, and when the network returns. */
	onResume(listener: () => void): () => void;
	/** Called when the page is about to go away. */
	onLeave(listener: () => void): () => void;
	isVisible(): boolean;
}

export interface DeviceProfile {
	/** Phones and tablets, where heavy image work is slow. */
	isMobile(): boolean;
}

/** The service worker that caches the built app so it can start offline. */
export interface OfflineShell {
	/** Calls the listener with the current status and on every change. Returns a stop function. */
	watch(listener: (status: OfflineShellStatus) => void): () => void;
	/** The build this page is running. */
	running(): BuildInfo;
	/** The release the active service worker holds, which loads offline; null when none is installed. */
	installedRelease(): Promise<BuildInfo | null>;
	/** Which build the service worker loads pages from on this device. */
	mode(): Promise<ShellMode>;
	/** Saves which build to load pages from, then reloads the page into it. */
	setMode(mode: ShellMode): Promise<void>;
}

// ── Off-thread work ──────────────────────────────────────────────────────────

export type BannerImages = Record<BannerBlendVariant, string>;

/** Renders banner blends and subject masks (BannerBlendWorker). New work replaces old work of the same kind. */
export interface BannerRenderer {
	render(job: BannerBlendJob, onProgress?: (progress: BannerBlendProgress) => void): Promise<{ images: BannerImages; timings: Record<string, number> }>;
	preview(job: BannerBlendJob): Promise<BannerImages>;
	subjectMask(src: string, protection: BannerProtection, feather: number, onProgress?: (progress: BannerBlendProgress) => void): Promise<BannerSubjectMask & { milliseconds: number }>;
	cancel(kind: 'render' | 'preview' | 'mask'): void;
}

export type CardScanUpdate = {
	phase: 'loading' | 'scanning';
	completed: number;
	total: number;
	region: ImageRegion | null;
	candidates: CardImageCandidate[];
	message?: string;
	indeterminate?: boolean;
};

/** Reads card names off a photo (CardOcrWorker and TitleIndexWorker). */
export interface CardScanner {
	scan(
		photo: File,
		names: string[],
		onUpdate: (update: CardScanUpdate) => void,
		isCancelled: () => boolean,
		options: { pipeline: CardImagePipeline }
	): Promise<{ candidates: CardImageCandidate[]; width: number; height: number }>;
}

export interface CardNameSearch {
	getFirstNMatches(prefix: string): string[];
}

/** A searchable index of every card name. */
export interface CardNameIndex {
	createSearchCursor(limit: number): CardNameSearch;
}

/** Builds the card-name index from its WebAssembly module and data. */
export interface CardNameIndexBuilder {
	build(moduleBytes: ArrayBuffer, indexBytes: Uint8Array): Promise<CardNameIndex>;
}

/** Checks pasted card lists against every card name (CardListLintWorker). */
export interface CardListLinter {
	/** Loads the name index. Call once before the first check; a failed prepare may be retried. */
	prepare(indexBytes: ArrayBuffer): Promise<void>;
	/** Lines whose name is not a card, with suggestions. */
	analyze(text: string): Promise<CardListProblem[]>;
	/** Card names completing what has been typed. */
	complete(query: string): Promise<string[]>;
}
