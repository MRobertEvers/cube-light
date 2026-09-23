import { DeckDetail } from 'src/domain/models/deck';

export function* iterDeckCardNames(deck: DeckDetail) {
	for (const card of deck.cards) {
		yield card.name;
	}
}
