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

	const grouped: GroupedDeck = {
		name: data.name,
		icon: data.icon,
		artwork: data.artwork,
		bannerCardUuid: data.bannerCardUuid,
		bannerCard: data.bannerCard,
		palette: data.palette,
		bannerCrop: data.bannerCrop,
		topStyle: data.topStyle,
		cards,
		sideboard,
		lastEdit: data.lastEdit,
		deck: main,
		boards: { main, side: groupBoardCards(sideboard) }
	};
	if ('bannerBlend' in data) grouped.bannerBlend = data.bannerBlend;
	if ('boardVisualization' in data)
		grouped.boardVisualization = data.boardVisualization;
	if ('notes' in data) grouped.notes = data.notes;
	if ('tags' in data) grouped.tags = data.tags;
	return grouped;
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
		// Land takes precedence over every other type, then Creature.
		const category = /\bLand\b/i.test(card.types)
			? 'Land'
			: /\bCreature\b/i.test(card.types)
				? 'Creature'
				: card.types;
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
