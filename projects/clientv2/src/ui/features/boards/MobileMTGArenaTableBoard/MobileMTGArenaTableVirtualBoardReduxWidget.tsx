import React, { useMemo } from 'react';
import { selectArenaSearch } from '../../../../redux/arena-table/arena-table.selectors';
import { selectDeck } from '../../../../redux/decks/decks.selectors';
import type { BoardReduxWidgetProps } from '../board.types';
import { useBoardCardEvents } from '../use-board-card-events';
import { MobileMTGArenaTableVirtualBoard } from './MobileMTGArenaTableVirtualBoard';
import { type ArenaTablePart, arenaTablePart } from '../MTGArenaTableBoard/split-arena-table';
import { useAppSelector } from '../../../../redux/use-app-selector';

export type MobileMTGArenaTableVirtualBoardReduxWidgetProps = BoardReduxWidgetProps & {
	/** Which half of the deck's table, by the deck's Arena search in the store. */
	part: ArenaTablePart;
	label: string;
	showLabel: boolean;
	emptyText: string;
};

/** One MobileMTGArenaTableVirtualBoard for a deck in the store. Renders nothing until the deck loads. */
export function MobileMTGArenaTableVirtualBoardReduxWidget(
	props: MobileMTGArenaTableVirtualBoardReduxWidgetProps
) {
	const { deckId, part, label, showLabel, emptyText } = props;
	const data = useAppSelector((root) => selectDeck(root, deckId));
	const search = useAppSelector((root) => selectArenaSearch(root, deckId));
	const onCardEvent = useBoardCardEvents(props);
	const groups = useMemo(
		() => (data ? arenaTablePart(data.boards, search, part) : []),
		[data, search, part]
	);
	if (!data) return null;

	return (
		<MobileMTGArenaTableVirtualBoard
			groups={groups}
			label={label}
			showLabel={showLabel}
			emptyText={emptyText}
			onCardEvent={onCardEvent}
		/>
	);
}
