import type { CardNamesInfo, CardPackInfo, InstalledCardPack } from '../../domain/models/card-pack';
import type { CardPackStore } from '../../engine/ports';

const DATABASE = 'torimtg-card-pack';
const STORE = 'pack';
const KEY = 'installed';

type Row = { info: InstalledCardPack; body: Blob };

/**
 * The offline card pack in its own IndexedDB database, apart from account data: it is the
 * same for everyone and only changes when the person installs it again. It is stored as
 * downloaded, gzip-compressed, and decompressed when read. IndexedDB, unlike Cache
 * Storage, also works on plain-HTTP LAN addresses.
 */
export class IndexedDbCardPackStore implements CardPackStore {
	private readonly base: string;

	constructor(apiBase: string) {
		this.base = apiBase.replace(/\/$/, '');
	}

	async offered(): Promise<CardPackInfo | null> {
		try {
			const response = await fetch(`${this.base}/cards/pack/info`, { cache: 'no-store', credentials: 'omit' });
			return response.ok ? ((await response.json()) as CardPackInfo) : null;
		} catch {
			return null;
		}
	}

	async offeredNames(): Promise<CardNamesInfo | null> {
		try {
			const response = await fetch(`${this.base}/suggest/card-names/info`, { cache: 'no-store', credentials: 'omit' });
			return response.ok ? ((await response.json()) as CardNamesInfo) : null;
		} catch {
			return null;
		}
	}

	async installed(): Promise<InstalledCardPack | null> {
		const row = await this.get();
		return row ? row.info : null;
	}

	async install(onProgress: (received: number, total: number) => void): Promise<InstalledCardPack> {
		const info = await this.offered();
		if (!info) throw new Error('The server has no offline card data to download.');
		const response = await fetch(`${this.base}/cards/pack`, { cache: 'no-store', credentials: 'omit' });
		if (!response.ok || !response.body) throw new Error(`Download failed (${response.status}).`);
		const reader = response.body.getReader();
		const chunks: Uint8Array[] = [];
		let received = 0;
		for (;;) {
			const { done, value } = await reader.read();
			if (done) break;
			chunks.push(value);
			received += value.length;
			onProgress(received, info.bytes);
		}
		const body = new Blob(chunks as BlobPart[], { type: 'application/gzip' });
		// The server rebuilt the pack between the two requests, or the download was cut short.
		if (body.size !== info.bytes || !(await matchesDigest(body, info.sha256))) throw new Error('The download did not match the offered card data. Try again.');
		const installed: InstalledCardPack = {
			version: info.version,
			date: info.date,
			builtAt: info.builtAt,
			cards: info.cards,
			bytes: info.bytes,
			sha256: info.sha256,
			installedAt: new Date().toISOString()
		};
		await this.put({ info: installed, body });
		return installed;
	}

	async remove(): Promise<void> {
		await this.request('readwrite', (store) => store.delete(KEY));
	}

	async read(): Promise<string | null> {
		const row = await this.get();
		if (!row) return null;
		const stream = row.body.stream().pipeThrough(new DecompressionStream('gzip'));
		return new Response(stream).text();
	}

	private async get(): Promise<Row | null> {
		const row = await this.request<Row | undefined>('readonly', (store) => store.get(KEY));
		return row ?? null;
	}

	private async put(row: Row): Promise<void> {
		await this.request('readwrite', (store) => store.put(row, KEY));
	}

	private async request<T>(mode: IDBTransactionMode, run: (store: IDBObjectStore) => IDBRequest): Promise<T> {
		const database = await open();
		try {
			return await new Promise<T>(function (resolve, reject) {
				const transaction = database.transaction(STORE, mode);
				const request = run(transaction.objectStore(STORE));
				transaction.oncomplete = function () {
					resolve(request.result as T);
				};
				transaction.onerror = function () {
					reject(transaction.error);
				};
				transaction.onabort = function () {
					reject(transaction.error ?? new Error('Card data storage was aborted.'));
				};
			});
		} finally {
			database.close();
		}
	}
}

function open(): Promise<IDBDatabase> {
	return new Promise(function (resolve, reject) {
		const request = indexedDB.open(DATABASE, 1);
		request.onupgradeneeded = function () {
			request.result.createObjectStore(STORE);
		};
		request.onsuccess = function () {
			resolve(request.result);
		};
		request.onerror = function () {
			reject(request.error);
		};
	});
}

/** Whether `body` hashes to `sha256`; true where the browser has no digest (an insecure origin). */
async function matchesDigest(body: Blob, sha256: string): Promise<boolean> {
	if (!globalThis.crypto?.subtle) return true;
	const digest = new Uint8Array(await crypto.subtle.digest('SHA-256', await body.arrayBuffer()));
	const hex = Array.from(digest, function (byte) {
		return byte.toString(16).padStart(2, '0');
	}).join('');
	return hex === sha256;
}
