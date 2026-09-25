import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { AggregateState } from '@torimtg/core';
import { projectQuery } from '../src/engine/core/projections';
import type { CardCatalog } from '../src/engine/core/card-catalog';
import {
	deckOwnership,
	deckOwnershipSummary,
	missingForDeck,
	ownedPrintingFor,
	rowOwnership,
	suggestOwnedNames
} from '../src/domain/library/ownership';
import type { CollectionDetail, LocationDetail, Ownership } from '../src/domain/models/library';
import type { DeckCardEntry } from '../src/domain/models/deck';

const at = '2026-09-25T00:00:00.000Z';
const boxA = 'location_aaaaaaaaaaaaaaaa';
const gone = 'location_gonegonegonegone';

function printing(uuid: string, name: string, setCode: string) {
	return { uuid, printing: { uuid, name, setCode, setName: null, image: null, art: null } };
}

const cards: CardCatalog = {
	'bolt-2xm': printing('bolt-2xm', 'Lightning Bolt', '2XM'),
	'bolt-m11': printing('bolt-m11', 'Lightning Bolt', 'M11'),
	'spear-bro': printing('spear-bro', 'Monastery Swiftspear', 'BRO'),
	'skewer-rna': printing('skewer-rna', 'Skewer the Critics', 'RNA')
};

function common(id: string) {
	return { id, deleted: false, createdAt: at, updatedAt: at };
}

const states: AggregateState[] = [
	Object.assign(common('collection_binderbinderbind'), { kind: 'collection' as const, name: 'Binder', cards: { 'bolt-2xm': 3, 'spear-bro': 2, 'unknown-x': 1 }, stored: { 'bolt-2xm': { [boxA]: 2, [gone]: 1 } } }),
	Object.assign(common('collection_bulkbulkbulkbulk'), { kind: 'collection' as const, name: 'Bulk', cards: { 'bolt-m11': 1 } }),
	Object.assign(common('collection_wishwishwishwish'), { kind: 'collection' as const, name: 'Wishlist', role: 'wanted' as const, cards: { 'skewer-rna': 2 } }),
	Object.assign(common(boxA), { kind: 'location' as const, name: 'Long box A', description: 'Closet' }),
	Object.assign(common('deck_burnburnburnburn'), { kind: 'deck' as const, name: 'Burn', cards: { 'bolt-2xm': 4, 'spear-bro': 4, 'skewer-rna': 2 }, art: null, bannerCardUuid: null, palette: null, bannerCrop: null, topStyle: 'card' as const, bannerBlend: null }),
	Object.assign(common('deck_boroborosborosbor'), { kind: 'deck' as const, name: 'Boros', cards: { 'bolt-m11': 2 }, art: null, bannerCardUuid: null, palette: null, bannerCrop: null, topStyle: 'card' as const, bannerBlend: null })
];

function project<T>(query: Parameters<typeof projectQuery>[4]): T {
	return projectQuery({ states } as never, cards, {} as never, { url: (id: string) => id } as never, query) as T;
}

function entry(uuid: string, name: string, count: number): DeckCardEntry {
	return { uuid, name, count, image: '', art: '', setCode: '', types: 'Instant', manaCost: '', board: 'main' } as DeckCardEntry;
}

test('ownership adds up owned collections by printing and by name, and lists decks', () => {
	const ownership = project<Ownership>({ type: 'ownership' });
	assert.equal(ownership.byName['lightning bolt'].owned, 4);
	assert.deepEqual(ownership.byName['lightning bolt'].uuids, ['bolt-2xm', 'bolt-m11']);
	assert.deepEqual(ownership.byName['lightning bolt'].inDecks, { deck_burnburnburnburn: 4, deck_boroborosborosbor: 2 });
	assert.equal(ownership.byName['skewer the critics'].owned, 0);
	assert.equal(ownership.byName['skewer the critics'].wanted, 2);
	// A copy placed in a deleted location counts as unplaced.
	assert.deepEqual(ownership.byUuid['bolt-2xm'].byLocation, { [boxA]: 2, '': 1 });
	// A printing not yet described is kept by UUID but has no name yet.
	assert.equal(ownership.byUuid['unknown-x'].name, '');
	assert.equal(Object.values(ownership.byName).some((name) => name.name === ''), false);
});

test('a collection reads its placements without deleted locations, and a location gathers every collection', () => {
	const binder = project<CollectionDetail>({ type: 'collection', id: 'collection_binderbinderbind' });
	assert.deepEqual(binder.stored, { 'bolt-2xm': { [boxA]: 2 } });
	assert.deepEqual(binder.orphaned, { 'bolt-2xm': 1 });
	assert.equal(binder.copies, 6);
	assert.equal(binder.unplaced, 4);
	const box = project<LocationDetail>({ type: 'location', id: boxA });
	assert.equal(box.copies, 2);
	assert.deepEqual(box.sources, { 'bolt-2xm': { collection_binderbinderbind: 2 } });
	assert.equal(box.description, 'Closet');
});

test('deck rows are owned, partial or missing by name, and free copies leave out other decks', () => {
	const ownership = project<Ownership>({ type: 'ownership' });
	const bolt = rowOwnership(ownership, 'deck_burnburnburnburn', 'Lightning Bolt', 4);
	assert.deepEqual(bolt, { need: 4, owned: 4, inOtherDecks: 2, free: 2, wanted: 0, status: 'owned' });
	const deck = [entry('bolt-2xm', 'Lightning Bolt', 4), entry('spear-bro', 'Monastery Swiftspear', 4), entry('skewer-rna', 'Skewer the Critics', 2)];
	const rows = deckOwnership(ownership, 'deck_burnburnburnburn', deck);
	assert.equal(rows['monastery swiftspear'].status, 'partial');
	assert.equal(rows['skewer the critics'].status, 'missing');
	assert.deepEqual(deckOwnershipSummary(rows), { ownedCopies: 6, totalCopies: 10, partialNames: 1, missingNames: 1, missingCopies: 4 });
	assert.deepEqual(missingForDeck(ownership, deck), [{ uuid: 'spear-bro', name: 'Monastery Swiftspear', count: 2 }, { uuid: 'skewer-rna', name: 'Skewer the Critics', count: 2 }]);
});

test('owned suggestions match anywhere in a name, prefer prefixes, and pick the most-held printing', () => {
	const ownership = project<Ownership>({ type: 'ownership' });
	assert.deepEqual(suggestOwnedNames(ownership, null, 'sw', 10).map((item) => item.name), ['Monastery Swiftspear']);
	assert.deepEqual(suggestOwnedNames(ownership, null, 'o', 10).map((item) => item.name), ['Lightning Bolt', 'Monastery Swiftspear']);
	assert.equal(suggestOwnedNames(ownership, null, 'skewer', 10).length, 0, 'wanted cards are not owned');
	assert.equal(ownedPrintingFor(ownership, 'lightning bolt'), 'bolt-2xm');
});
