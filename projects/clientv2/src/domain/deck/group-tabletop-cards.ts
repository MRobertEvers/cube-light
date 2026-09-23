import type { DeckCardEntry } from '../models/deck';
import {
	type DeckCardGroup,
	groupDeckCardsByName,
	manaValue
} from './group-deck-cards';

export type TabletopColumn = {
	label: string;
	groups: DeckCardGroup[];
	count: number;
};

/** Keep lands separate from zero-cost spells, and combine copies across printings. */
export function groupTabletopCards(
	cards: readonly DeckCardEntry[]
): TabletopColumn[] {
	return groupTabletopColumns(
		groupDeckCardsByName(cards.filter((card) => card.count > 0))
	);
}

/** Columns by mana value for cards already grouped by name, lands last. */
export function groupTabletopColumns(
	groups: readonly DeckCardGroup[]
): TabletopColumn[] {
	const columns = new Map<number, DeckCardGroup[]>();
	for (const group of groups) {
		const card = group.printings[0];
		const value = /\bLand\b/i.test(card.types)
			? Infinity
			: manaValue(card.manaCost);
		const column = columns.get(value) ?? [];
		column.push(group);
		columns.set(value, column);
	}
	return [...columns.entries()]
		.sort((a, b) => a[0] - b[0])
		.map((entry) => {
			const [value, groups] = entry;
			return {
				label: value === Infinity ? 'Lands' : `Mana value ${value}`,
				groups: groups.sort((a, b) => a.name.localeCompare(b.name)),
				count: groups.reduce((total, group) => total + group.count, 0)
			};
		});
}
