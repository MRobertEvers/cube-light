import type { DeckCardGroup } from '../../../../domain/deck/group-deck-cards';
import type { BoardAnnotations, BoardProps } from '../board.types';

export type MTGArenaTableBoardProps = BoardProps & {
	/** MTG Arena search syntax; see arena-search.ts. */
	search: string;
	onSearchChange: (search: string) => void;
};

export type MTGArenaTableVirtualBoardProps = {
	groups: readonly DeckCardGroup[];
	/** Heads the board when the table is split; always names it for assistive tech. */
	label: string;
	showLabel: boolean;
	cardWidth: number;
	emptyText: string;
	onCardEvent: BoardProps['onCardEvent'];
	annotations?: BoardAnnotations;
};

/** One card of a tabletop stack or row, desktop or phone. */
export type TabletopCardProps = {
	group: DeckCardGroup;
	onCardEvent: BoardProps['onCardEvent'];
	annotations?: BoardAnnotations;
};
