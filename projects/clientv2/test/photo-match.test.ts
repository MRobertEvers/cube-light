import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildIndex, matchDetections, rankNames } from '../src/platform/card-scanner/photo-match.js';

const index = buildIndex([
	'Sheoldred, the Apocalypse',
	"Sheoldred's Edict",
	'Case of the Locked Hothouse',
	'Corpses of the Lost',
	'Iridescent Vinelasher',
	'Iridescent Tiger',
	'Fell',
	'Go for the Throat'
]);
const box = [[0, 0], [400, 0], [400, 40], [0, 40]];

test('an ellipsis-truncated name matches the name it starts', () => {
	assert.equal(rankNames('Sheoldred, the Apoc... ②', index)[0].name, 'Sheoldred, the Apocalypse');
	assert.equal(rankNames('Case of the Locked Hot…', index)[0].name, 'Case of the Locked Hothouse');
});

test('a full name never matches a shorter name by prefix', () => {
	assert.equal(rankNames('Iridescent Tiger', index)[0].name, 'Iridescent Tiger');
});

test('a deck-list count before the name is ignored', () => {
	const [candidate] = matchDetections(
		[{ items: [{ text: '4x( Iridescent Vinelasher', score: 0.95, poly: box }] }],
		index
	);
	assert.equal(candidate.name, 'Iridescent Vinelasher');
	assert.equal(candidate.status, 'accepted');
});

function row(text: string, y: number) {
	return { text, score: 0.99, poly: [[700, y], [1400, y], [1400, y + 190], [700, y + 190]] };
}

test('a short exact name in a column of accepted names is accepted', () => {
	const candidates = matchDetections(
		[{ items: [row('Iridescent Vinelasher', 290), row('Fell', 600), row('Go for the Throat', 910)] }],
		index
	);
	assert.deepEqual(
		candidates.map((c) => [c.name, c.status]),
		[['Iridescent Vinelasher', 'accepted'], ['Fell', 'accepted'], ['Go for the Throat', 'accepted']]
	);
});

test('a short exact name on its own stays in review', () => {
	const [candidate] = matchDetections([{ items: [row('Fell', 600)] }], index);
	assert.equal(candidate.status, 'review');
});
