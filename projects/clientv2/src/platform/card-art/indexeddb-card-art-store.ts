import type { CardArtInfo, InstalledCardArt } from '../../domain/models/card-art';
import type { CardArtStore } from '../../engine/ports';
import { CHUNKS, META, artInIndex, inCardArtDatabase, type CardArtIndex, type InstalledIndex } from './card-art-database';

/**
 * The offline card art pack in its own IndexedDB database (see card-art-database.ts),
 * downloaded chunk by chunk. A chunk already stored with the same checksum is kept, so an
 * interrupted install resumes and an update only fetches what changed.
 */
export class IndexedDbCardArtStore implements CardArtStore {
	private readonly base: string;
	/** The installed index, read once for art lookups; the index is large. */
	private index: Promise<InstalledIndex | null> | null = null;

	constructor(apiBase: string) {
		this.base = apiBase.replace(/\/$/, '');
	}

	async offered(): Promise<CardArtInfo | null> {
		const index = await this.offeredIndex().catch(() => null);
		return index ? infoOf(index) : null;
	}

	async installed(): Promise<InstalledCardArt | null> {
		const installed = await inCardArtDatabase<InstalledIndex | undefined>([META], 'readonly', (transaction) => transaction.objectStore(META).get('index'));
		if (!installed) return null;
		const info = infoOf(installed.index);
		return { version: info.version, format: info.format, cards: info.cards, bytes: info.bytes, chunks: info.chunks, installedAt: installed.installedAt };
	}

	async install(onProgress: (received: number, total: number) => void): Promise<InstalledCardArt> {
		const index = await this.offeredIndex();
		const kept = await inCardArtDatabase<InstalledIndex | undefined>([META], 'readonly', (transaction) => transaction.objectStore(META).get('index'));
		const keptChunks = new Map((kept ? kept.index.chunks : []).map((chunk) => [chunk.file, chunk.sha256]));
		let received = 0;
		for (const chunk of index.chunks) {
			const stored = keptChunks.get(chunk.file) === chunk.sha256
				? await inCardArtDatabase<Blob | undefined>([CHUNKS], 'readonly', (transaction) => transaction.objectStore(CHUNKS).get(chunk.file))
				: undefined;
			if (!stored || stored.size !== chunk.bytes) {
				const response = await fetch(`${this.base}/cards/art/${chunk.file}`, { cache: 'no-store', credentials: 'omit' });
				if (!response.ok) throw new Error(`Card art download failed (${response.status}).`);
				const blob = await response.blob();
				if (blob.size !== chunk.bytes) throw new Error('A card art download was cut short. Try again.');
				await inCardArtDatabase([CHUNKS], 'readwrite', (transaction) => transaction.objectStore(CHUNKS).put(blob, chunk.file));
			}
			received += chunk.bytes;
			onProgress(received, index.bytes);
		}
		const installedAt = new Date().toISOString();
		const current = new Set(index.chunks.map((chunk) => chunk.file));
		await inCardArtDatabase([CHUNKS, META], 'readwrite', function (transaction) {
			// Chunks of an older pack that this one does not use.
			for (const file of keptChunks.keys()) if (!current.has(file)) transaction.objectStore(CHUNKS).delete(file);
			return transaction.objectStore(META).put({ index: index, installedAt: installedAt }, 'index');
		});
		this.index = null;
		const info = infoOf(index);
		return { version: info.version, format: info.format, cards: info.cards, bytes: info.bytes, chunks: info.chunks, installedAt: installedAt };
	}

	async remove(): Promise<void> {
		await inCardArtDatabase([CHUNKS, META], 'readwrite', function (transaction) {
			transaction.objectStore(CHUNKS).clear();
			return transaction.objectStore(META).delete('index');
		});
		this.index = null;
	}

	async art(printingUuid: string): Promise<Blob | null> {
		const installed = await this.installedIndex();
		const scryfallId = installed?.index.printings?.[printingUuid];
		return installed && scryfallId ? artInIndex(installed.index, scryfallId) : null;
	}

	async asked(): Promise<boolean> {
		return (await inCardArtDatabase<boolean | undefined>([META], 'readonly', (transaction) => transaction.objectStore(META).get('asked'))) === true;
	}

	async markAsked(): Promise<void> {
		await inCardArtDatabase([META], 'readwrite', (transaction) => transaction.objectStore(META).put(true, 'asked'));
	}

	private async offeredIndex(): Promise<CardArtIndex> {
		const response = await fetch(`${this.base}/cards/art/index`, { cache: 'no-store', credentials: 'omit' });
		if (!response.ok) throw new Error('The server has no card art to download.');
		const index = (await response.json()) as CardArtIndex;
		if (index.format !== 1 && index.format !== 2) throw new Error('The server offers card art in an unknown format.');
		return index;
	}

	private installedIndex(): Promise<InstalledIndex | null> {
		if (!this.index) {
			const reading = inCardArtDatabase<InstalledIndex | undefined>([META], 'readonly', (transaction) => transaction.objectStore(META).get('index')).then((found) => found ?? null);
			reading.catch(() => {
				if (this.index === reading) this.index = null;
			});
			this.index = reading;
		}
		return this.index;
	}
}

function infoOf(index: CardArtIndex): CardArtInfo {
	return { version: index.version, format: index.format, cards: index.cards, bytes: index.bytes, chunks: index.chunks.length };
}
