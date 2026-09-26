import React, { useCallback } from 'react';
import { arenaSearchChanged } from '../../../../redux/arena-table/arenaTableSlice';
import { selectArenaSearch } from '../../../../redux/arena-table/arena-table.selectors';
import { selectOfflineCardArt } from '../../../../redux/card-art/card-art.selectors';
import { selectConnectivity } from '../../../../redux/connectivity/connectivity.selectors';
import { selectDeckCardAction } from '../../../../redux/decks/decks.selectors';
import { useAppDispatch } from '../../../../redux/use-app-dispatch';
import { useAppSelector } from '../../../../redux/use-app-selector';
import type { BoardReduxWidgetProps } from '../board.types';
import { useBoardCardEvents } from '../use-board-card-events';
import { useDeckBoardView } from '../use-deck-board-view';
import { MobileMTGArenaTableBoardOffline } from './MobileMTGArenaTableBoardOffline';
import { MobileMTGArenaTableBoardOfflineArt } from './MobileMTGArenaTableBoardOfflineArt';
import { MobileMTGArenaTableBoardOnline } from './MobileMTGArenaTableBoardOnline';

/**
 * The phone tabletop for a deck in the store, with its search kept in the
 * store: card images online; offline, card art and text from the offline art pack when
 * it is installed, card text when not. Renders nothing until the deck loads.
 */
export function MobileMTGArenaTableBoardReduxWidget(props: BoardReduxWidgetProps) {
	const { deckId, ownershipFilter } = props;
	const dispatch = useAppDispatch();
	const view = useDeckBoardView(deckId, ownershipFilter);
	const cardAction = useAppSelector((root) =>
		selectDeckCardAction(root, deckId)
	);
	const search = useAppSelector((root) => selectArenaSearch(root, deckId));
	const connectivity = useAppSelector(selectConnectivity);
	const offlineArt = useAppSelector(selectOfflineCardArt);
	const onCardEvent = useBoardCardEvents(props);
	const onSearchChange = useCallback(
		(next: string) => dispatch(arenaSearchChanged({ deckId, search: next })),
		[deckId, dispatch]
	);
	if (!view) return null;

	if (connectivity === 'online') {
		return (
			<MobileMTGArenaTableBoardOnline
				cards={view.cards}
				annotations={view.annotations}
				busyGroup={cardAction.busy}
				onCardEvent={onCardEvent}
				search={search}
				onSearchChange={onSearchChange}
			/>
		);
	}
	return offlineArt ? (
		<MobileMTGArenaTableBoardOfflineArt
			cards={view.cards}
			annotations={view.annotations}
			busyGroup={cardAction.busy}
			onCardEvent={onCardEvent}
			search={search}
			onSearchChange={onSearchChange}
		/>
	) : (
		<MobileMTGArenaTableBoardOffline
			cards={view.cards}
			annotations={view.annotations}
			busyGroup={cardAction.busy}
			onCardEvent={onCardEvent}
			search={search}
			onSearchChange={onSearchChange}
		/>
	);
}
