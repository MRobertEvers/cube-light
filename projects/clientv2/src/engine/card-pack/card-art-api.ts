import type { CardArtStatus, InstalledCardArt } from '../../domain/models/card-art';
import type { CardArtStore } from '../ports';

/**
 * The offline card art pack: a small image of every card's art, installed on request.
 * Once installed, ShellWorker answers card art requests from it when the server cannot.
 */
export class CardArtApi {
	private readonly store: CardArtStore;

	constructor(store: CardArtStore) {
		this.store = store;
	}

	async status(): Promise<CardArtStatus> {
		const [installed, offered, asked] = await Promise.all([this.store.installed(), this.store.offered(), this.store.asked()]);
		return { installed, offered, asked };
	}

	install(onProgress: (received: number, total: number) => void): Promise<InstalledCardArt> {
		return this.store.install(onProgress);
	}

	remove(): Promise<void> {
		return this.store.remove();
	}

	/** Records that this device was offered the art, so it is not offered again. */
	markAsked(): Promise<void> {
		return this.store.markAsked();
	}
}
