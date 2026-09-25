/**
 * The offline card art pack's IndexedDB database, shared by the page (which installs it)
 * and ShellWorker (which answers card art requests from it offline).
 *
 * Stores: `chunks` (chunk file name → Blob of WebP images back to back) and `meta`
 * (`index` → the pack's index and install time; `asked` → true once the device was offered it).
 */

const DATABASE = 'torimtg-card-art';
export const CHUNKS = 'chunks';
export const META = 'meta';

/** CardArt.index.json, as card-images.py writes it. */
export type CardArtIndex = {
	format: number;
	version: string;
	cards: number;
	bytes: number;
	chunks: Array<{ file: string; bytes: number; sha256: string }>;
	/** Scryfall id → [chunk, offset, length]. */
	art: Record<string, [number, number, number]>;
};

export type InstalledIndex = { index: CardArtIndex; installedAt: string };

export function openCardArtDatabase(): Promise<IDBDatabase> {
	return new Promise(function (resolve, reject) {
		const request = indexedDB.open(DATABASE, 1);
		request.onupgradeneeded = function () {
			request.result.createObjectStore(CHUNKS);
			request.result.createObjectStore(META);
		};
		request.onsuccess = function () {
			resolve(request.result);
		};
		request.onerror = function () {
			reject(request.error);
		};
	});
}

/** Runs `run` in one transaction and resolves with its request's result once the transaction completes. */
export async function inCardArtDatabase<T>(stores: string[], mode: IDBTransactionMode, run: (transaction: IDBTransaction) => IDBRequest | null): Promise<T> {
	const database = await openCardArtDatabase();
	try {
		return await new Promise<T>(function (resolve, reject) {
			const transaction = database.transaction(stores, mode);
			const request = run(transaction);
			transaction.oncomplete = function () {
				resolve((request ? request.result : undefined) as T);
			};
			transaction.onerror = function () {
				reject(transaction.error);
			};
			transaction.onabort = function () {
				reject(transaction.error ?? new Error('Card art storage was aborted.'));
			};
		});
	} finally {
		database.close();
	}
}

let cachedIndex: { at: string; index: CardArtIndex } | null = null;

/** The installed art for a Scryfall id as a WebP Blob; null when no pack is installed or it has no art for the id. */
export async function readCardArt(scryfallId: string): Promise<Blob | null> {
	const installed = await inCardArtDatabase<InstalledIndex | undefined>([META], 'readonly', (transaction) => transaction.objectStore(META).get('index'));
	if (!installed) return null;
	// The index is large; parse-free reuse while the same install is current.
	if (!cachedIndex || cachedIndex.at !== installed.installedAt) cachedIndex = { at: installed.installedAt, index: installed.index };
	const place = cachedIndex.index.art[scryfallId];
	if (!place) return null;
	const [chunk, offset, length] = place;
	const file = cachedIndex.index.chunks[chunk]?.file;
	if (!file) return null;
	const blob = await inCardArtDatabase<Blob | undefined>([CHUNKS], 'readonly', (transaction) => transaction.objectStore(CHUNKS).get(file));
	return blob ? blob.slice(offset, offset + length, 'image/webp') : null;
}
