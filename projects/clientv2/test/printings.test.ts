import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { FetchAPIDeckCardResponse } from '../src/api/fetch-api-deck';
import {
	deckCardEditTarget,
	groupDeckCardsByName
} from '../src/utils/group-deck-cards';
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
		manaCost: '',
		text: '',
		type: 'Instant',
		rarity: null,
		power: null,
		toughness: null,
		loyalty: null,
		defense: null,
		number: null,
		artist: null,
		flavorText: null,
		legalities: {}
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
		parsed.cards.map((options) => {
			const { count, setCode, lines } = options;
			return [count, setCode, lines];
		}),
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
		parsed.cards.map((options) => {
			const { name, count, setCode, lines } = options;
			return [name, count, setCode, lines];
		}),
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

test('sideboard sections and SB: lines go to the side board, apart from the main board', () => {
	const parsed = parseCardList(
		[
			'Deck',
			'4 Lightning Bolt (M10)',
			'SB: 1 Lightning Bolt (M10)',
			'',
			'Sideboard',
			'2 Lightning Bolt (M10)',
			'3 Negate',
			'Maybeboard',
			'1 Opt',
			'SB: 1 Duress'
		].join('\n')
	);
	assert.deepEqual(
		parsed.cards.map((options) => {
			const { name, count, board, lines } = options;
			return [board, name, count, lines];
		}),
		[
			['main', 'Lightning Bolt', 4, [2]],
			['side', 'Lightning Bolt', 3, [3, 6]],
			['side', 'Negate', 3, [7]],
			['side', 'Duress', 1, [10]]
		]
	);
	assert.deepEqual(
		parsed.skipped.map((issue) => [issue.line, issue.message]),
		[[9, 'Maybeboard cards are not added']]
	);
});

test('a missing set is only inferred from the same board', () => {
	const parsed = parseCardList(
		['2 Negate (M20)', 'Sideboard', '1 Negate'].join('\n')
	);
	assert.deepEqual(
		parsed.cards.map((options) => {
			const { board, count, setCode } = options;
			return [board, count, setCode];
		}),
		[
			['main', 2, 'M20'],
			['side', 1, undefined]
		]
	);
	assert.deepEqual(parsed.notes, []);
});

test('lines before any heading go to the chosen board; headings still decide their own lines', () => {
	const parsed = parseCardList(
		['2 Negate', 'Deck', '4 Island', 'Sideboard', '1 Duress'].join('\n'),
		'side'
	);
	assert.deepEqual(
		parsed.cards.map((card) => [card.board, card.name]),
		[
			['side', 'Negate'],
			['main', 'Island'],
			['side', 'Duress']
		]
	);
});

test('the card editor opens on every board’s printings of a name', () => {
	const main = { ...card('Negate', 'M20', 2), board: 'main' as const };
	const side = { ...card('Negate', 'M20', 1), board: 'side' as const };
	const other = { ...card('Duress', 'M20', 1), board: 'side' as const };
	const [group] = groupDeckCardsByName([side]);
	const target = deckCardEditTarget(group, [main, side, other]);
	assert.equal(target.board, 'side');
	assert.deepEqual(
		target.printings.map((entry) => [entry.board, entry.count]),
		[
			['main', 2],
			['side', 1]
		]
	);
});
