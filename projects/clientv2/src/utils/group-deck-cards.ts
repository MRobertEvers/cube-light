import type { FetchAPIDeckCardResponse } from '../api/fetch-api-deck';

/** Every printing of one card name in a deck, which the deck list shows as one row. */
export type DeckCardGroup = {
	name: string;
	count: number;
	/** Most copies first, so printings[0] stands for the card in previews. */
	printings: FetchAPIDeckCardResponse[];
};

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
