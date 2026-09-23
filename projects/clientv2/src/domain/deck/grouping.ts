import type {
	DeckBoard,
	DeckCardEntry,
	DeckDetail
} from '../models/deck';

export type TypeGroup = {
	count: number;
	cards: DeckCardEntry[];
};

export type BoardGroups = {
	count: number;
	cardCategories: {
		[x: string]: TypeGroup;
	};
};

export type GroupedDeck = DeckDetail & {
	/** The main board, grouped. The same object as `boards.main`. */
	deck: BoardGroups;
	/** Every board, grouped by card type. */
	boards: Record<DeckBoard, BoardGroups>;
};


export function groupDeck(data: DeckDetail): GroupedDeck {
	const { cards, sideboard = [] } = data;
	const main = groupBoardCards(cards);

	return {
		...data,
		sideboard,
		deck: main,
		boards: { main, side: groupBoardCards(sideboard) }
	};
}

/** Groups one board's entries by card type, counting every copy. */
export function groupBoardCards(
	cards: readonly DeckCardEntry[]
): BoardGroups {
	const deck: BoardGroups = {
		count: 0,
		cardCategories: {}
	};
	const deckCards = deck.cardCategories;
	for (const card of cards) {
		// Creature takes precedence over other types when grouping the deck.
		const category = /\bCreature\b/i.test(card.types) ? 'Creature' : card.types;
		if (!(category in deckCards)) {
			deckCards[category] = {
				count: 0,
				cards: []
			};
		}

		const count = card.count;

		deckCards[category].count += count;
		deckCards[category].cards.push(card);

		deck.count += count;
	}

	return deck;
}
