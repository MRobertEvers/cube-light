import { cardPackUpdateAvailable, type CardPackStatus, type InstalledCardPack, type PackCard } from '../../domain/models/card-pack';
import type { CardApi } from '../api/cards';
import type { CardPackStore } from '../ports';
import type { CardPackLibrary } from './card-pack-library';

/**
 * The offline card pack: every card's text and default printing, installed on request.
 * Installing also downloads the card-name index, so name search works offline without
 * having searched online first. Each names its build by a sha256 the server publishes, so
 * the status tells whether either is out of date.
 */
export class CardPackApi {
	private readonly store: CardPackStore;
	private readonly library: CardPackLibrary;
	private readonly cards: Pick<CardApi, 'prepareNameSearch' | 'allNames' | 'nameIndexDigest' | 'redownloadNameIndex'>;

	constructor(store: CardPackStore, library: CardPackLibrary, cards: Pick<CardApi, 'prepareNameSearch' | 'allNames' | 'nameIndexDigest' | 'redownloadNameIndex'>) {
		this.store = store;
		this.library = library;
		this.cards = cards;
	}

	async status(): Promise<CardPackStatus> {
		const [installed, offered, namesHere, namesOffered] = await Promise.all([
			this.store.installed(),
			this.store.offered(),
			this.cards.nameIndexDigest().catch(() => null),
			this.store.offeredNames()
		]);
		return { installed, offered, namesHere, namesOffered };
	}

	/**
	 * Installs the pack, or updates it: the pack is downloaded unless the one here is the
	 * one offered, and the name index is always downloaded again. A name index that cannot
	 * be downloaded now leaves the one here, which the next read refreshes.
	 */
	async install(onProgress: (received: number, total: number) => void): Promise<InstalledCardPack> {
		const [here, offered] = await Promise.all([this.store.installed(), this.store.offered()]);
		const installed =
			here !== null && !cardPackUpdateAvailable({ installed: here, offered: offered, namesHere: null, namesOffered: null })
				? here
				: await this.library.install(onProgress);
		await this.cards.redownloadNameIndex().catch(() => {});
		await Promise.all([this.cards.prepareNameSearch(), this.cards.allNames()]);
		return installed;
	}

	remove(): Promise<void> {
		return this.library.remove();
	}

	/** A card by its name or one of its faces' names, ignoring case; null when it is not in the installed pack. */
	lookup(name: string): Promise<PackCard | null> {
		return this.library.card(name);
	}
}
