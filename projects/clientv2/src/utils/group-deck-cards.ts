import type { FetchAPIDeckCardResponse } from '../api/fetch-api-deck';

/** Every printing of one card name in a deck, which the deck list shows as one row. */
export type DeckCardGroup = {
	name: string;
	count: number;
	/** Most copies first, so printings[0] stands for the card in previews. */
	printings: FetchAPIDeckCardResponse[];
};

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
