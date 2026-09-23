import type { DeckBoard } from '../../../../domain/models/deck';
import {
	type DeckCardGroup,
	groupDeckCardsByName
} from '../../../../domain/deck/group-deck-cards';
import type { BoardGroups } from '../../../../domain/deck/grouping';
import { type ArenaSearch, parseArenaSearch } from './arena-search';

/** The Arena table's two halves: what a search found, and everything else. */
export type ArenaTableSplit = {
	search: ArenaSearch | null;
	/** Null while no valid search is applied, so the table shows one board. */
	matching: DeckCardGroup[] | null;
	others: DeckCardGroup[];
};

export type ArenaTablePart = 'matching' | 'others';

/** The table shows the main board, one entry per card name. */
export function arenaTableGroups(
	cards: Record<DeckBoard, BoardGroups>
): DeckCardGroup[] {
	return groupDeckCardsByName(
		Object.values(cards.main.cardCategories)
			.flatMap((category) => category.cards)
			.filter((card) => card.count > 0)
	);
}

export function splitArenaTable(
	cards: Record<DeckBoard, BoardGroups>,
	query: string
): ArenaTableSplit {
	const groups = arenaTableGroups(cards);
	const search = parseArenaSearch(query);
	if (!search?.ok) return { search, matching: null, others: groups };
	return {
		search,
		matching: groups.filter((group) => search.matches(group)),
		others: groups.filter((group) => !search.matches(group))
	};
}

/** One half of the table; with no search applied, `matching` is empty and `others` is everything. */
export function arenaTablePart(
	cards: Record<DeckBoard, BoardGroups>,
	query: string,
	part: ArenaTablePart
): DeckCardGroup[] {
	const split = splitArenaTable(cards, query);
	return part === 'matching' ? (split.matching ?? []) : split.others;
}
