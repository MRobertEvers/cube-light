import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { FetchAPIDeckCardResponse } from '../src/api/fetch-api-deck';
import { groupDeckCardsByName } from '../src/utils/group-deck-cards';
import { parseCardList } from '../src/utils/parse-card-list';

function card(
	name: string,
	setCode: string,
	count: number
): FetchAPIDeckCardResponse {
	return {
		name,
		count,
		setCode,
		uuid: `${name}-${setCode}`,
		image: '',
		art: '',
		types: 'Instant',
		manaCost: ''
	};
}

test('groups printings of one name, most copies first', () => {
	const groups = groupDeckCardsByName([
		card('Lightning Bolt', 'SLD', 1),
		card('Counterspell', 'MH2', 4),
		card('Lightning Bolt', 'M10', 2),
		card('Lightning Bolt', '2XM', 1)
	]);
	assert.deepEqual(
		groups.map((group) => [group.name, group.count]),
		[
			['Lightning Bolt', 4],
			['Counterspell', 4]
		]
	);
	assert.deepEqual(
		groups[0].printings.map((printing) => printing.setCode),
		['M10', '2XM', 'SLD']
	);
});

test('keeps different printings of a name apart and notes repeated ones', () => {
	const parsed = parseCardList(
		[
			'1 Lightning Bolt (M10)',
			'1 Lightning Bolt (2XM)',
			'2 Lightning Bolt (M10)'
		].join('\n')
	);
	assert.deepEqual(
		parsed.cards.map(({ count, setCode, lines }) => [
			count,
			setCode,
			lines
		]),
		[
			[3, 'M10', [1, 3]],
			[1, '2XM', [2]]
		]
	);
	assert.deepEqual(
		parsed.notes.map((note) => [note.kind, note.line]),
		[['duplicate', 3]]
	);
	assert.equal(
		parsed.notes[0].kind === 'duplicate' && parsed.notes[0].firstLine,
		1
	);
});

test('a line without a set uses the printing given for that name', () => {
	const parsed = parseCardList(
		['Lightning Bolt', '3 Consider', '2 Lightning Bolt (M10)'].join('\n')
	);
	assert.deepEqual(
		parsed.cards.map(({ name, count, setCode, lines }) => [
			name,
			count,
			setCode,
			lines
		]),
		[
			['Consider', 3, undefined, [2]],
			['Lightning Bolt', 3, 'M10', [1, 3]]
		]
	);
	const [note] = parsed.notes;
	assert.equal(note.kind, 'inferred-set');
	assert.equal(note.line, 1);
	assert.equal(note.kind === 'inferred-set' && note.fromLine, 3);
	assert.equal(note.kind === 'inferred-set' && note.setCode, 'M10');
});
