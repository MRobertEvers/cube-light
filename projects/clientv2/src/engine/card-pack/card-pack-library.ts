import type { InstalledCardPack, PackCard, PackCardFace, PackPrinting } from '../../domain/models/card-pack';
import type { CardPackStore } from '../ports';

/** One face as the pack stores it: FACE_FIELDS in refresh-mtgjson.py, trailing empty fields dropped. */
type StoredFace = Array<string | null>;
/** [name, faces, default printing uuid, its set code]. */
type StoredCard = [string, StoredFace[], string | null, string | null];
type StoredPack = { format: number; cards: StoredCard[] };

type Index = { byName: Map<string, PackCard>; byUuid: Map<string, PackCard> };

/**
 * The installed offline card pack, parsed once and kept until it is installed again or
 * removed. Answers by card name (or a face's name) and by default printing.
 */
export class CardPackLibrary {
	private readonly store: CardPackStore;
	private index: Promise<Index | null> | null = null;
	private changes = 0;

	constructor(store: CardPackStore) {
		this.store = store;
	}

	/** Changes whenever the installed pack does, for caches built from it. */
	revision(): number {
		return this.changes;
	}

	async install(onProgress: (received: number, total: number) => void): Promise<InstalledCardPack> {
		const installed = await this.store.install(onProgress);
		this.forget();
		return installed;
	}

	async remove(): Promise<void> {
		await this.store.remove();
		this.forget();
	}

	/** A card by its name or one of its faces' names, ignoring case; null when not installed or unknown. */
	async card(name: string): Promise<PackCard | null> {
		const index = await this.loaded();
		return index ? (index.byName.get(name.trim().toLowerCase()) ?? null) : null;
	}

	/** The card whose default printing is `uuid`, under that printing; null when the pack does not name it. */
	async printing(uuid: string): Promise<PackPrinting | null> {
		const index = await this.loaded();
		const card = index ? index.byUuid.get(uuid) : undefined;
		if (!card || !card.printing) return null;
		return { uuid: card.printing.uuid, name: card.name, setCode: card.printing.setCode, faces: card.faces };
	}

	private forget(): void {
		this.index = null;
		this.changes++;
	}

	private loaded(): Promise<Index | null> {
		if (!this.index) {
			const loading = this.load();
			loading.catch(() => {
				if (this.index === loading) this.index = null;
			});
			this.index = loading;
		}
		return this.index;
	}

	private async load(): Promise<Index | null> {
		const json = await this.store.read();
		if (json === null) return null;
		const pack = JSON.parse(json) as StoredPack;
		if (pack.format !== 1) throw new Error('This offline card data is in an unknown format. Install it again.');
		const byName = new Map<string, PackCard>();
		const byUuid = new Map<string, PackCard>();
		for (const [name, faces, uuid, setCode] of pack.cards) {
			const card: PackCard = { name, faces: faces.map(face), printing: uuid && setCode ? { uuid, setCode } : null };
			byName.set(name.toLowerCase(), card);
			if (card.printing) byUuid.set(card.printing.uuid, card);
		}
		// Face names second, so a card literally named like another card's face keeps its own entry.
		for (const card of byUuid.values()) {
			for (const each of card.faces) if (each.name && !byName.has(each.name.toLowerCase())) byName.set(each.name.toLowerCase(), card);
		}
		return { byName, byUuid };
	}
}

function face(stored: StoredFace): PackCardFace {
	function field(index: number): string | null {
		const value = stored[index];
		return value === undefined || value === '' ? null : value;
	}
	return {
		name: field(0),
		manaCost: field(1),
		type: field(2),
		text: field(3),
		power: field(4),
		toughness: field(5),
		loyalty: field(6),
		defense: field(7)
	};
}
