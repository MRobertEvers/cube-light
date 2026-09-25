import type { DeckCardGroup } from '../../../../domain/deck/group-deck-cards';
import type { BoardAnnotations, BoardProps } from '../board.types';

export type MobileMTGArenaTableBoardProps = BoardProps & {
	/** MTG Arena search syntax; see MTGArenaTableBoard/arena-search.ts. */
	search: string;
	onSearchChange: (search: string) => void;
};

export type MobileMTGArenaTableVirtualBoardProps = {
	groups: readonly DeckCardGroup[];
	/** Heads the board when the table is split; always names it for assistive tech. */
	label: string;
	showLabel: boolean;
	emptyText: string;
	onCardEvent: BoardProps['onCardEvent'];
	annotations?: BoardAnnotations;
};
