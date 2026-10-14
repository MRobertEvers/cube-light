import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { DeckBoard, DeckCardEntry } from '../src/domain/models/deck';
import { deckListText } from '../src/domain/deck/deck-list-text';
import { parseCardList } from '../src/domain/card-names/parse-card-list';

function card(name: string, count: number, setCode: string, board: DeckBoard): DeckCardEntry {
	return { name, count, setCode, board, uuid: `${name}-${setCode}`, types: '', manaCost: '', image: '', art: '' } as DeckCardEntry;
}

test('a deck exports one line per printing, sorted, with a sideboard section', () => {
	const text = deckListText({
		cards: [card('Lightning Bolt', 4, 'M10', 'main'), card('Counterspell', 2, 'MH2', 'main'), card('Counterspell', 1, 'TMP', 'main')],
		sideboard: [card('Duress', 3, 'M19', 'side')]
	});
	assert.equal(text, '2 Counterspell (MH2)\n1 Counterspell (TMP)\n4 Lightning Bolt (M10)\n\nSideboard\n3 Duress (M19)\n');
});

test('a deck without a sideboard exports no sideboard section', () => {
	assert.equal(deckListText({ cards: [card('Island', 1, 'LEA', 'main')] }), '1 Island (LEA)\n');
});

test('an exported list pastes back in as the same cards', () => {
	const parsed = parseCardList(
		deckListText({
			cards: [card('Lightning Bolt', 4, 'M10', 'main')],
			sideboard: [card('Duress', 3, 'M19', 'side')]
		})
	);
	assert.deepEqual(parsed.errors, []);
	assert.deepEqual(
		parsed.cards.map((parsedCard) => [parsedCard.count, parsedCard.name, parsedCard.setCode, parsedCard.board]),
		[
			[4, 'Lightning Bolt', 'M10', 'main'],
			[3, 'Duress', 'M19', 'side']
		]
	);
});
