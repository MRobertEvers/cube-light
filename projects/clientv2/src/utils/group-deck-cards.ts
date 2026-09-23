import type { DeckBoard, FetchAPIDeckCardResponse } from '../api/fetch-api-deck';

/** Every printing of one card name in one board of a deck, which the deck list shows as one row. */
export type DeckCardGroup = {
	name: string;
	/** The board of printings[0]. Groups are built from one board's entries at a time. */
	board: DeckBoard;
	count: number;
	/** Most copies first, so printings[0] stands for the card in previews. */
	printings: FetchAPIDeckCardResponse[];
};

/**
 * Every printing of one card name in every board, which the card editor changes
 * together. `board` is the board it was opened from.
 */
export type DeckCardEditTarget = {
	name: string;
	board: DeckBoard;
	/** One entry per printing and board; a printing in both boards appears twice. */
	printings: FetchAPIDeckCardResponse[];
};

/** The editor's view of `group`: its name's printings from all of `cards`, any board. */
export function deckCardEditTarget(
	group: DeckCardGroup,
	cards: readonly FetchAPIDeckCardResponse[]
): DeckCardEditTarget {
	return {
		name: group.name,
		board: group.board,
		printings: cards.filter((card) => card.name === group.name)
	};
}

/** Mana value outside the stack: variable symbols are zero, hybrid costs count once. */
export function manaValue(manaCost: string): number {
	return [...manaCost.matchAll(/\{([^}]+)\}/g)].reduce((total, match) => {
		const values = match[1].split('/').map((symbol) => {
			if (/^\d+$/.test(symbol)) return Number(symbol);
			if (/^[XYZP]$/.test(symbol)) return 0;
			if (symbol === 'HW') return 0.5;
			return 1;
		});
		return total + Math.max(...values);
	}, 0);
}

export function compareDeckCardGroupsByManaCost(
	a: DeckCardGroup,
	b: DeckCardGroup
): number {
	return (
		manaValue(a.printings[0].manaCost) - manaValue(b.printings[0].manaCost) ||
		a.name.localeCompare(b.name)
	);
}

/** Groups deck entries (one per printing) by card name, keeping the order names first appear. */
export function groupDeckCardsByName(
	cards: readonly FetchAPIDeckCardResponse[]
): DeckCardGroup[] {
	const groups = new Map<string, DeckCardGroup>();
	for (const card of cards) {
		const group = groups.get(card.name);
		if (group) {
			group.count += card.count;
			group.printings.push(card);
		} else {
			groups.set(card.name, {
				name: card.name,
				board: card.board ?? 'main',
				count: card.count,
				printings: [card]
			});
		}
	}
	for (const group of groups.values())
		group.printings.sort(
			(a, b) => b.count - a.count || a.setCode.localeCompare(b.setCode)
		);
	return [...groups.values()];
}
