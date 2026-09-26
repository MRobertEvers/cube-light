import React, { useMemo } from 'react';
import { selectOfflineCardArt } from '../../../../redux/card-art/card-art.selectors';
import { selectConnectivity } from '../../../../redux/connectivity/connectivity.selectors';
import { selectArenaSearch } from '../../../../redux/arena-table/arena-table.selectors';
import { selectDeck } from '../../../../redux/decks/decks.selectors';
import type { BoardReduxWidgetProps } from '../board.types';
import { useBoardCardEvents } from '../use-board-card-events';
import { MTGArenaTableVirtualBoardOffline } from './MTGArenaTableVirtualBoardOffline';
import { MTGArenaTableVirtualBoardOfflineArt } from './MTGArenaTableVirtualBoardOfflineArt';
import { MTGArenaTableVirtualBoardOnline } from './MTGArenaTableVirtualBoardOnline';
import { type ArenaTablePart, arenaTablePart } from './split-arena-table';
import { useAppSelector } from '../../../../redux/use-app-selector';

export type MTGArenaTableVirtualBoardReduxWidgetProps = BoardReduxWidgetProps & {
	/** Which half of the deck's table, by the deck's Arena search in the store. */
	part: ArenaTablePart;
	label: string;
	showLabel: boolean;
	cardWidth: number;
	emptyText: string;
};

/** One tabletop virtual board for a deck in the store, as images online and, offline, art and text from the offline art pack or text alone. Renders nothing until the deck loads. */
export function MTGArenaTableVirtualBoardReduxWidget(
	props: MTGArenaTableVirtualBoardReduxWidgetProps
) {
	const { deckId, part, label, showLabel, cardWidth, emptyText } = props;
	const data = useAppSelector((root) => selectDeck(root, deckId));
	const search = useAppSelector((root) => selectArenaSearch(root, deckId));
	const connectivity = useAppSelector(selectConnectivity);
	const offlineArt = useAppSelector(selectOfflineCardArt);
	const onCardEvent = useBoardCardEvents(props);
	const groups = useMemo(
		() => (data ? arenaTablePart(data.boards, search, part) : []),
		[data, search, part]
	);
	if (!data) return null;

	if (connectivity === 'online') {
		return (
			<MTGArenaTableVirtualBoardOnline
				groups={groups}
				label={label}
				showLabel={showLabel}
				cardWidth={cardWidth}
				emptyText={emptyText}
				onCardEvent={onCardEvent}
			/>
		);
	}
	return offlineArt ? (
		<MTGArenaTableVirtualBoardOfflineArt
			groups={groups}
			label={label}
			showLabel={showLabel}
			cardWidth={cardWidth}
			emptyText={emptyText}
			onCardEvent={onCardEvent}
		/>
	) : (
		<MTGArenaTableVirtualBoardOffline
			groups={groups}
			label={label}
			showLabel={showLabel}
			cardWidth={cardWidth}
			emptyText={emptyText}
			onCardEvent={onCardEvent}
		/>
	);
}
