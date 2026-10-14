import type { DeckCardEntry, DeckDetail } from '../models/deck';

function cardLine(card: DeckCardEntry): string {
	return card.setCode ? `${card.count} ${card.name} (${card.setCode})` : `${card.count} ${card.name}`;
}

function boardLines(cards: DeckCardEntry[]): string[] {
	return cards
		.slice()
		.sort((a, b) => a.name.localeCompare(b.name) || a.setCode.localeCompare(b.setCode))
		.map(cardLine);
}

/**
 * The deck as a plain-text list in the common MTG decklist format (`4 Name (SET)`, then a
 * `Sideboard` section), which Paste list, Arena, Moxfield and CubeCobra all read.
 */
export function deckListText(deck: Pick<DeckDetail, 'cards' | 'sideboard'>): string {
	const main = boardLines(deck.cards);
	const side = boardLines(deck.sideboard ?? []);
	if (side.length === 0) return main.join('\n') + '\n';
	return main.concat(['', 'Sideboard'], side).join('\n') + '\n';
}
