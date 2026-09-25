import { test } from 'node:test';
import assert from 'node:assert/strict';
import { collectionCardsIn, locationCardsFrom, placementMoves, placementTotals } from '../src/domain/library/placements';
import type { CollectionDetail, LocationDetail } from '../src/domain/models/library';
import type { DeckCardEntry } from '../src/domain/models/deck';

function entry(uuid: string, count: number): DeckCardEntry {
	return { uuid, name: uuid, count, image: '', art: '', setCode: 'SET', types: 'Instant', manaCost: '', board: 'main' } as DeckCardEntry;
}

const collection: CollectionDetail = {
	collectionId: 'collection_aaaaaaaaaaaaaaaa',
	name: 'Binder',
	role: 'owned',
	cards: [entry('bolt', 4), entry('helix', 2)],
	stored: { bolt: { boxA: 3 } },
	copies: 6,
	unplaced: 3,
	orphaned: {},
	updatedAt: ''
};

test('a collection filtered by placement counts only the copies each filter covers', () => {
	assert.deepEqual(collectionCardsIn(collection, { type: 'all' }).map((card) => [card.uuid, card.count]), [['bolt', 4], ['helix', 2]]);
	assert.deepEqual(collectionCardsIn(collection, { type: 'unplaced' }).map((card) => [card.uuid, card.count]), [['bolt', 1], ['helix', 2]]);
	assert.deepEqual(collectionCardsIn(collection, { type: 'location', locationId: 'boxA' }).map((card) => [card.uuid, card.count]), [['bolt', 3]]);
	assert.equal(collection.cards[0].count, 4, 'filtering never changes the collection');
	assert.deepEqual(placementTotals(collection), { unplaced: 3, byLocation: { boxA: 3 } });
});

test('a location filtered by collection counts only that collection’s copies', () => {
	const location: LocationDetail = { locationId: 'boxA', name: 'Box', description: null, cards: [entry('bolt', 5)], sources: { bolt: { c1: 3, c2: 2 } }, collections: { c1: 'Binder', c2: 'Bulk' }, copies: 5 };
	assert.deepEqual(locationCardsFrom(location, 'c2').map((card) => [card.uuid, card.count]), [['bolt', 2]]);
	assert.equal(locationCardsFrom(location, null)[0].count, 5);
});

test('placement moves go straight between locations and use the unplaced pool for the rest', () => {
	assert.deepEqual(placementMoves('bolt', { a: 3, b: 0 }, { a: 1, b: 2 }), [{ uuid: 'bolt', from: 'a', to: 'b', count: 2 }]);
	assert.deepEqual(placementMoves('bolt', { a: 3 }, { a: 1 }), [{ uuid: 'bolt', from: 'a', to: null, count: 2 }]);
	assert.deepEqual(placementMoves('bolt', { a: 1 }, { a: 1, b: 2 }), [{ uuid: 'bolt', from: null, to: 'b', count: 2 }]);
	assert.deepEqual(placementMoves('bolt', { a: 2 }, { a: 2 }), []);
});
