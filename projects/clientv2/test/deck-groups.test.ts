import { test } from 'node:test';
import assert from 'node:assert/strict';
import { deckTagCounts, groupDeckList, knownDeckTags } from '../src/domain/deck/deck-groups';
import type { DeckGroup, DeckSummary } from '../src/domain/models/deck';

function deck(deckId: string, tags: string[]): DeckSummary {
	return { deckId, name: deckId, art: null, colors: [], tags, createdAt: '', updatedAt: '' };
}

const decks = [
	deck('deck_a', ['Cube', 'Vintage']),
	deck('deck_b', ['cube']),
	deck('deck_c', ['Commander']),
	deck('deck_d', [])
];

function group(groupId: string, tags: string[], match: DeckGroup['match']): DeckGroup {
	return { groupId, name: groupId, tags, match };
}

test('a deck appears in every group it matches and only unmatched decks are ungrouped', () => {
	const list = groupDeckList(decks, [
		group('group_cubes', ['CUBE'], 'any'),
		group('group_vintage_cubes', ['cube', 'vintage'], 'all'),
		group('group_empty', ['Modern'], 'any')
	]);
	assert.deepEqual(
		list.sections.map((section) => section.decks.map((item) => item.deckId)),
		[['deck_a', 'deck_b'], ['deck_a'], []]
	);
	assert.deepEqual(list.ungrouped.map((item) => item.deckId), ['deck_c', 'deck_d']);
});

test('without groups every deck is ungrouped', () => {
	const list = groupDeckList(decks, []);
	assert.equal(list.sections.length, 0);
	assert.equal(list.ungrouped.length, decks.length);
});

test('known tags keep their first spelling and count decks ignoring case', () => {
	assert.deepEqual(knownDeckTags(decks), ['Commander', 'Cube', 'Vintage']);
	assert.equal(deckTagCounts(decks).get('cube'), 2);
});
