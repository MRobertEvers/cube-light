import type { DeckBoard } from '../../../../domain/models/deck';
import type { DeckCardGroup } from '../../../../domain/deck/group-deck-cards';
import type { BoardGroups } from '../../../../domain/deck/grouping';
import type { ArenaSearch } from './arena-search';
import { type ArenaTablePart, splitArenaTable } from './split-arena-table';

/** One virtual board of the table: its cards, its heading, and what it says while empty. */
export type ArenaTableBoardPart = {
	part: ArenaTablePart;
	groups: readonly DeckCardGroup[];
	label: string;
	showLabel: boolean;
	emptyText: string;
};

/** The virtual boards a tabletop shows for a search, and the counts its search status reports. */
export type ArenaTableLayout = {
	search: ArenaSearch | null;
	/** Whether a valid search split the table in two. */
	split: boolean;
	matchingCount: number;
	total: number;
	parts: ArenaTableBoardPart[];
};

function countCards(groups: readonly DeckCardGroup[]): number {
	return groups.reduce((total, group) => total + group.count, 0);
}

/**
 * The tabletop for a search: one main board, or, once a valid search applies,
 * the cards it finds above everything else. Desktop and phone tabletops share it.
 */
export function arenaTableLayout(
	cards: Record<DeckBoard, BoardGroups>,
	query: string
): ArenaTableLayout {
	const { search, matching, others } = splitArenaTable(cards, query);
	const matchingCount = matching ? countCards(matching) : 0;
	const total = matchingCount + countCards(others);
	if (!matching) {
		return {
			search,
			split: false,
			matchingCount,
			total,
			parts: [
				{
					part: 'others',
					groups: others,
					label: 'Main board',
					showLabel: false,
					emptyText: 'This deck is empty. Add cards to start your tabletop.'
				}
			]
		};
	}
	return {
		search,
		split: true,
		matchingCount,
		total,
		parts: [
			{
				part: 'matching',
				groups: matching,
				label: 'Matching',
				showLabel: true,
				emptyText: 'No cards match this search.'
			},
			{
				part: 'others',
				groups: others,
				label: 'Everything else',
				showLabel: true,
				emptyText: 'Every card matches this search.'
			}
		]
	};
}
