import type { CardPackStatus, InstalledCardPack, PackCard } from '../../domain/models/card-pack';
import type { CardApi } from '../api/cards';
import type { CardPackStore } from '../ports';
import type { CardPackLibrary } from './card-pack-library';

/**
 * The offline card pack: every card's text and default printing, installed on request.
 * Installing also downloads the card-name index, so name search works offline without
 * having searched online first.
 */
export class CardPackApi {
	private readonly store: CardPackStore;
	private readonly library: CardPackLibrary;
	private readonly cards: Pick<CardApi, 'prepareNameSearch' | 'allNames'>;

	constructor(store: CardPackStore, library: CardPackLibrary, cards: Pick<CardApi, 'prepareNameSearch' | 'allNames'>) {
		this.store = store;
		this.library = library;
		this.cards = cards;
	}

	async status(): Promise<CardPackStatus> {
		const [installed, offered] = await Promise.all([this.store.installed(), this.store.offered()]);
		return { installed, offered };
	}

	async install(onProgress: (received: number, total: number) => void): Promise<InstalledCardPack> {
		const installed = await this.library.install(onProgress);
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
