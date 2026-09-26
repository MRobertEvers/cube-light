import type { CardArtStatus, InstalledCardArt } from '../../domain/models/card-art';
import type { CardArtStore } from '../ports';
import type { CardPackLibrary } from './card-pack-library';

/** What a card's art is found by: its printing, then its name's default printing. */
export type CardArtKey = { name: string; uuid: string };

/**
 * The offline card art pack: a small image of every card's art, installed on request.
 * Once installed, ShellWorker answers card art requests from it when the server cannot,
 * and views drawn for offline use ask for a card's art here by name.
 */
export class CardArtApi {
	private readonly store: CardArtStore;
	private readonly library: Pick<CardPackLibrary, 'card' | 'revision'>;
	/** Object URLs by printing uuid, null when the pack has no art for it. */
	private readonly urls = new Map<string, Promise<string | null>>();
	/** The text pack's revision the cached answers were found with. */
	private urlsRevision: number;

	constructor(store: CardArtStore, library: Pick<CardPackLibrary, 'card' | 'revision'>) {
		this.store = store;
		this.library = library;
		this.urlsRevision = library.revision();
	}

	async status(): Promise<CardArtStatus> {
		const [installed, offered, asked] = await Promise.all([this.store.installed(), this.store.offered(), this.store.asked()]);
		return { installed, offered, asked };
	}

	/** Whether art is installed on this device, without asking the server what it offers. */
	async isInstalled(): Promise<boolean> {
		return (await this.store.installed()) !== null;
	}

	async install(onProgress: (received: number, total: number) => void): Promise<InstalledCardArt> {
		const installed = await this.store.install(onProgress);
		this.forget();
		return installed;
	}

	async remove(): Promise<void> {
		await this.store.remove();
		this.forget();
	}

	/** Records that this device was offered the art, so it is not offered again. */
	markAsked(): Promise<void> {
		return this.store.markAsked();
	}

	/**
	 * An object URL of a card's installed art: its own printing's when that is the default
	 * printing the pack holds, else its name's default printing's. Null when none is installed.
	 */
	artFor(card: CardArtKey): Promise<string | null> {
		if (this.urlsRevision !== this.library.revision()) this.forget();
		const cached = this.urls.get(card.uuid);
		if (cached) return cached;
		const finding = this.find(card);
		finding.catch(() => {
			if (this.urls.get(card.uuid) === finding) this.urls.delete(card.uuid);
		});
		this.urls.set(card.uuid, finding);
		return finding;
	}

	private async find(card: CardArtKey): Promise<string | null> {
		const own = await this.store.art(card.uuid);
		if (own) return URL.createObjectURL(own);
		const named = await this.library.card(card.name);
		if (!named?.printing || named.printing.uuid === card.uuid) return null;
		const fallback = await this.store.art(named.printing.uuid);
		return fallback ? URL.createObjectURL(fallback) : null;
	}

	/** Drops cached URLs, after the art or the text pack it is found through changes. */
	private forget(): void {
		for (const url of this.urls.values()) {
			void url.then((found) => {
				if (found) URL.revokeObjectURL(found);
			}, () => {});
		}
		this.urls.clear();
		this.urlsRevision = this.library.revision();
	}
}
