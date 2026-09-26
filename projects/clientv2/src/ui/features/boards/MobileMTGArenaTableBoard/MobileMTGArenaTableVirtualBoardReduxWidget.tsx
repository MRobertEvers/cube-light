import React, { useMemo } from 'react';
import { selectOfflineCardArt } from '../../../../redux/card-art/card-art.selectors';
import { selectConnectivity } from '../../../../redux/connectivity/connectivity.selectors';
import { selectArenaSearch } from '../../../../redux/arena-table/arena-table.selectors';
import { selectDeck } from '../../../../redux/decks/decks.selectors';
import type { BoardReduxWidgetProps } from '../board.types';
import { useBoardCardEvents } from '../use-board-card-events';
import { MobileMTGArenaTableVirtualBoardOffline } from './MobileMTGArenaTableVirtualBoardOffline';
import { MobileMTGArenaTableVirtualBoardOfflineArt } from './MobileMTGArenaTableVirtualBoardOfflineArt';
import { MobileMTGArenaTableVirtualBoardOnline } from './MobileMTGArenaTableVirtualBoardOnline';
import { type ArenaTablePart, arenaTablePart } from '../MTGArenaTableBoard/split-arena-table';
import { useAppSelector } from '../../../../redux/use-app-selector';

export type MobileMTGArenaTableVirtualBoardReduxWidgetProps = BoardReduxWidgetProps & {
	/** Which half of the deck's table, by the deck's Arena search in the store. */
	part: ArenaTablePart;
	label: string;
	showLabel: boolean;
	emptyText: string;
};

/** One phone tabletop virtual board for a deck in the store, as images online and, offline, art and text from the offline art pack or text alone. Renders nothing until the deck loads. */
export function MobileMTGArenaTableVirtualBoardReduxWidget(
	props: MobileMTGArenaTableVirtualBoardReduxWidgetProps
) {
	const { deckId, part, label, showLabel, emptyText } = props;
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
			<MobileMTGArenaTableVirtualBoardOnline
				groups={groups}
				label={label}
				showLabel={showLabel}
				emptyText={emptyText}
				onCardEvent={onCardEvent}
			/>
		);
	}
	return offlineArt ? (
		<MobileMTGArenaTableVirtualBoardOfflineArt
			groups={groups}
			label={label}
			showLabel={showLabel}
			emptyText={emptyText}
			onCardEvent={onCardEvent}
		/>
	) : (
		<MobileMTGArenaTableVirtualBoardOffline
			groups={groups}
			label={label}
			showLabel={showLabel}
			emptyText={emptyText}
			onCardEvent={onCardEvent}
		/>
	);
}
