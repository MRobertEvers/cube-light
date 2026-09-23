import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { FetchAPIDeckCardResponse } from '../src/api/fetch-api-deck';
import { deckStats } from '../src/utils/deck-stats';

function card(
	types: string,
	subtypes: string,
	manaCost: string,
	count = 1
): FetchAPIDeckCardResponse {
	return {
		name: `${types} ${subtypes} ${manaCost}`,
		count,
		types,
		subtypes,
		manaCost,
		uuid: manaCost,
		setCode: 'TST',
		image: '',
		art: '',
		board: 'main'
	} as FetchAPIDeckCardResponse;
}

test('deck stats split creatures, curve, pips and types', () => {
	const stats = deckStats([
		card('Creature', 'Human, Soldier', '{W}', 2),
		card('Artifact, Creature', 'Golem', '{4}'),
		card('Instant', '', '{1}{U/R}'),
		card('Sorcery', '', '{6}{B}{B}'),
		card('Land', 'Island', '', 3),
		card('Enchantment', 'Aura', '{0}', 0)
	]);
	assert.equal(stats.creatures, 3);
	assert.equal(stats.nonCreatures, 2);
	assert.equal(stats.lands, 3);
	assert.deepEqual(
		stats.curve.map((bucket) => [bucket.label, bucket.creatures, bucket.nonCreatures]),
		[['1-', 2, 0], ['2', 0, 1], ['3', 0, 0], ['4', 1, 0], ['5', 0, 0], ['6+', 0, 1]]
	);
	assert.equal(stats.averageManaValue, (1 * 2 + 4 + 2 + 8) / 5);
	assert.deepEqual(stats.pips, { W: 2, U: 1, B: 2, R: 1, G: 0, C: 0 });
	assert.equal(stats.totalPips, 6);
	assert.deepEqual(stats.types, [
		{ type: 'Creature', count: 3, subtypes: [{ name: 'Human', count: 2 }, { name: 'Soldier', count: 2 }, { name: 'Golem', count: 1 }] },
		{ type: 'Instant', count: 1, subtypes: [] },
		{ type: 'Sorcery', count: 1, subtypes: [] },
		{ type: 'Land', count: 3, subtypes: [{ name: 'Island', count: 3 }] }
	]);
});
