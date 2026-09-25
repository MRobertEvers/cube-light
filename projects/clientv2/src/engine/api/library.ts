import type { CardEdit, CollectionRole, PlacementMove, Query } from '@torimtg/core';
import type { ToriMTG } from '../core/types';
import type { LocalReader } from '../core/local-reader';
import { newId } from '../../domain/ids';
import { applySteps, countEdits, countsIn, printingCounts, type DeckCardStep } from '../../domain/deck/card-steps';
import { missingForDeck } from '../../domain/library/ownership';
import type { DeckDetail, ImportedCard } from '../../domain/models/deck';
import type {
	CollectionCardCount,
	CollectionDetail,
	CollectionSummaries,
	LocationDetail,
	Ownership,
	StorageLocationSummaries
} from '../../domain/models/library';
import type { CardApi } from './cards';
import type { Versioned } from './versioned';

/** The library's lists and the ownership they add up to, read together. */
export type LibraryOverview = {
	collections: CollectionSummaries;
	locations: StorageLocationSummaries;
	ownership: Ownership;
};

/** Collections of cards, the storage locations their copies are kept in, and what that adds up to. */
export class LibraryApi {
	private readonly tori: ToriMTG;
	private readonly reader: LocalReader;
	private readonly cards: CardApi;
	/** Each collection's card steps commit one after another, in the order they were taken. */
	private readonly stepQueues = new Map<string, Promise<unknown>>();

	constructor(tori: ToriMTG, reader: LocalReader, cards: CardApi) {
		this.tori = tori;
		this.reader = reader;
		this.cards = cards;
	}

	/** Every collection, location and what is owned; waits for the first download when nothing is on this device yet. */
	async overview(): Promise<Versioned<LibraryOverview>> {
		await this.reader.available<CollectionSummaries>({ type: 'collections' });
		const local = await this.overviewLocal();
		return local ?? { value: { collections: [], locations: [], ownership: { byUuid: {}, byName: {} } }, revision: 0 };
	}

	/** The library as saved on this device, without waiting. Null before the first download. */
	async overviewLocal(): Promise<Versioned<LibraryOverview> | null> {
		const collections = await this.tori.queries.read<CollectionSummaries>({ type: 'collections' });
		if (collections.presence === 'missing') return null;
		const locations = await this.tori.queries.read<StorageLocationSummaries>({ type: 'locations' });
		const ownership = await this.tori.queries.read<Ownership>({ type: 'ownership' });
		// The oldest of the three reads, so a later change always wins in the store.
		const revision = Math.min(collections.localRevision, locations.localRevision, ownership.localRevision);
		return { value: { collections: collections.data ?? [], locations: locations.data ?? [], ownership: ownership.data ?? { byUuid: {}, byName: {} } }, revision };
	}

	/** One collection; waits for a download when it is not on this device yet. */
	async getCollection(collectionId: string): Promise<Versioned<CollectionDetail>> {
		const snapshot = await this.reader.available<CollectionDetail>({ type: 'collection', id: collectionId });
		if (!snapshot.data) throw new Error('This collection was deleted or is not downloaded.');
		return { value: snapshot.data, revision: snapshot.localRevision };
	}

	/** One collection as saved on this device. `deleted` once it is gone for good. */
	async getCollectionLocal(collectionId: string): Promise<{ collection: CollectionDetail | null; deleted: boolean; revision: number }> {
		const snapshot = await this.tori.queries.read<CollectionDetail>({ type: 'collection', id: collectionId });
		return { collection: snapshot.data, deleted: !snapshot.data && snapshot.presence === 'complete', revision: snapshot.localRevision };
	}

	/** One storage location and every copy kept there; waits for a download when it is not on this device yet. */
	async getLocation(locationId: string): Promise<Versioned<LocationDetail>> {
		const snapshot = await this.reader.available<LocationDetail>({ type: 'location', id: locationId });
		if (!snapshot.data) throw new Error('This storage location was deleted or is not downloaded.');
		return { value: snapshot.data, revision: snapshot.localRevision };
	}

	async getLocationLocal(locationId: string): Promise<{ location: LocationDetail | null; deleted: boolean; revision: number }> {
		const snapshot = await this.tori.queries.read<LocationDetail>({ type: 'location', id: locationId });
		return { location: snapshot.data, deleted: !snapshot.data && snapshot.presence === 'complete', revision: snapshot.localRevision };
	}

	/** Returns the new collection's id. */
	async createCollection(name: string, roleArg?: CollectionRole): Promise<string> {
		const role = roleArg === undefined ? 'owned' : roleArg;
		const id = newId('collection');
		await this.tori.commands.execute({ type: 'collection.create', id, name });
		if (role !== 'owned') await this.tori.commands.execute({ type: 'collection.role', id, role });
		return id;
	}

	async renameCollection(collectionId: string, name: string): Promise<void> {
		await this.tori.commands.execute({ type: 'collection.rename', id: collectionId, name });
	}

	async setCollectionRole(collectionId: string, role: CollectionRole): Promise<void> {
		await this.tori.commands.execute({ type: 'collection.role', id: collectionId, role });
	}

	async deleteCollection(collectionId: string): Promise<void> {
		await this.tori.commands.execute({ type: 'collection.delete', id: collectionId });
	}

	/** Returns the new storage location's id. */
	async createStorageLocation(name: string, description?: string): Promise<string> {
		const id = newId('location');
		await this.tori.commands.execute({ type: 'location.create', id, name });
		if (description !== undefined && description.trim()) await this.tori.commands.execute({ type: 'location.describe', id, name, description });
		return id;
	}

	/** Renames a storage location and replaces its description; an empty description removes it. */
	async describeStorageLocation(locationId: string, name: string, description: string): Promise<void> {
		await this.tori.commands.execute({ type: 'location.describe', id: locationId, name, description });
	}

	/** Copies kept there stay in their collections, unplaced. */
	async deleteStorageLocation(locationId: string): Promise<void> {
		await this.tori.commands.execute({ type: 'location.delete', id: locationId });
	}

	/** Adds copies of a named card, and files them in `locationId` when one is given. */
	async addCardByName(collectionId: string, cardName: string, count: number, locationId: string | null): Promise<void> {
		const { uuid } = await this.cards.resolve(cardName);
		await this.addCards(collectionId, [{ uuid, count }], locationId);
	}

	/** Adds copies of printings, and files them in `locationId` when one is given. */
	async addCards(collectionId: string, cards: CollectionCardCount[], locationId: string | null): Promise<void> {
		const counts = cards.filter((card) => card.count > 0);
		if (!counts.length) return;
		const edits: CardEdit[] = counts.map((card) => ({ uuid: card.uuid, action: 'add', count: card.count }));
		await this.tori.commands.execute({ type: 'collection.cards', id: collectionId, edits });
		if (locationId) await this.placeCards(collectionId, counts.map((card) => ({ uuid: card.uuid, from: null, to: locationId, count: card.count })));
	}

	/** Adds every card in a pasted list, as one edit. */
	async importList(collectionId: string, cards: ImportedCard[]): Promise<void> {
		const edits = (await this.cards.importEdits(cards)).map((edit): CardEdit => ({ uuid: edit.uuid, action: edit.action, count: edit.count }));
		await this.tori.commands.execute({ type: 'collection.cards', id: collectionId, edits });
	}

	/** Takes these printings out of the collection entirely, as one edit. */
	async removeCards(collectionId: string, printings: string[]): Promise<void> {
		await this.tori.commands.execute({ type: 'collection.cards', id: collectionId, edits: printings.map((uuid): CardEdit => ({ uuid, action: 'set', count: 0 })) });
	}

	/** Moves copies to another collection: they leave this one first, so no copy is ever counted twice. */
	async moveCards(fromCollectionId: string, toCollectionId: string, cards: CollectionCardCount[]): Promise<void> {
		if (fromCollectionId === toCollectionId) return;
		const { value: from } = await this.getCollection(fromCollectionId);
		const held = new Map(from.cards.map((card) => [card.uuid, card.count]));
		const moved = cards.map((card) => ({ uuid: card.uuid, count: Math.min(card.count, held.get(card.uuid) || 0) })).filter((card) => card.count > 0);
		if (!moved.length) return;
		await this.tori.commands.execute({ type: 'collection.cards', id: fromCollectionId, edits: moved.map((card): CardEdit => ({ uuid: card.uuid, action: 'remove', count: card.count })) });
		await this.addCards(toCollectionId, moved, null);
	}

	/** Moves copies between storage locations; `null` is unplaced. */
	async placeCards(collectionId: string, moves: PlacementMove[]): Promise<void> {
		if (!moves.length) return;
		await this.tori.commands.execute({ type: 'collection.place', id: collectionId, moves });
	}

	/**
	 * Adds to `collectionId` every copy a deck lists beyond what the owned collections hold.
	 * Returns how many copies were added.
	 */
	async addMissingFromDeck(deckId: string, collectionId: string): Promise<number> {
		const deck = await this.tori.queries.read<DeckDetail>({ type: 'deck', id: deckId });
		if (!deck.data) throw new Error('This deck was deleted or is not downloaded.');
		const owned = await this.tori.queries.read<Ownership>({ type: 'ownership' });
		const missing = missingForDeck(owned.data ?? { byUuid: {}, byName: {} }, deck.data.cards.concat(deck.data.sideboard ?? []));
		await this.addCards(collectionId, missing.map((card) => ({ uuid: card.uuid, count: card.count })), null);
		return missing.reduce((total, card) => total + card.count, 0);
	}

	/**
	 * Saves card editor steps as soon as they are taken, as the deck editor does. A collection
	 * has one list, so only main-board changes apply.
	 */
	async applyCardSteps(collectionId: string, steps: DeckCardStep[]): Promise<Versioned<CollectionDetail> | null> {
		const previous = this.stepQueues.get(collectionId) ?? Promise.resolve();
		const next = previous.catch(() => undefined).then(() => this.commitCardSteps(collectionId, steps));
		this.stepQueues.set(collectionId, next);
		try {
			return await next;
		} finally {
			if (this.stepQueues.get(collectionId) === next) this.stepQueues.delete(collectionId);
		}
	}

	private async commitCardSteps(collectionId: string, steps: DeckCardStep[]): Promise<Versioned<CollectionDetail> | null> {
		const query: Query = { type: 'collection', id: collectionId };
		const current = await this.tori.queries.read<CollectionDetail>(query);
		if (!current.data) throw new Error('This collection was deleted or is not downloaded.');
		const before = printingCounts(current.data.cards);
		const edits = countEdits(before, applySteps(before, steps.filter((step) => step.type !== 'move'))).filter((edit) => edit.board === undefined);
		if (!edits.length) return null;
		// A printing new to the collection needs its details to be filed; download it first.
		for (const edit of edits) if (edit.count > 0 && countsIn(before, edit.uuid).main === 0) await this.cards.describe(edit.uuid);
		await this.tori.commands.execute({ type: 'collection.cards', id: collectionId, edits });
		const saved = await this.tori.queries.read<CollectionDetail>(query);
		return saved.data ? { value: saved.data, revision: saved.localRevision } : null;
	}
}
