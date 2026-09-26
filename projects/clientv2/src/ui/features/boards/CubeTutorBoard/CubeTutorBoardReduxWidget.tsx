import React from 'react';
import { selectOfflineCardArt } from '../../../../redux/card-art/card-art.selectors';
import { selectConnectivity } from '../../../../redux/connectivity/connectivity.selectors';
import { selectDeckCardAction } from '../../../../redux/decks/decks.selectors';
import type { BoardReduxWidgetProps } from '../board.types';
import { useBoardCardEvents } from '../use-board-card-events';
import { useDeckBoardView } from '../use-deck-board-view';
import { CubeTutorBoardOffline } from './CubeTutorBoardOffline';
import { CubeTutorBoardOfflineArt } from './CubeTutorBoardOfflineArt';
import { CubeTutorBoardOnline } from './CubeTutorBoardOnline';
import { useAppSelector } from '../../../../redux/use-app-selector';

/**
 * The CubeTutor board for a deck in the store, previewing card images
 * online; offline, card art and text from the offline art pack when it is
 * installed, card text when not. Renders nothing until the deck loads.
 */
export function CubeTutorBoardReduxWidget(props: BoardReduxWidgetProps) {
	const { deckId, ownershipFilter } = props;
	const view = useDeckBoardView(deckId, ownershipFilter);
	const cardAction = useAppSelector((root) =>
		selectDeckCardAction(root, deckId)
	);
	const connectivity = useAppSelector(selectConnectivity);
	const offlineArt = useAppSelector(selectOfflineCardArt);
	const onCardEvent = useBoardCardEvents(props);
	if (!view) return null;

	if (connectivity === 'online') {
		return (
			<CubeTutorBoardOnline
				cards={view.cards}
				annotations={view.annotations}
				busyGroup={cardAction.busy}
				onCardEvent={onCardEvent}
			/>
		);
	}
	return offlineArt ? (
		<CubeTutorBoardOfflineArt
			cards={view.cards}
			annotations={view.annotations}
			busyGroup={cardAction.busy}
			onCardEvent={onCardEvent}
		/>
	) : (
		<CubeTutorBoardOffline
			cards={view.cards}
			annotations={view.annotations}
			busyGroup={cardAction.busy}
			onCardEvent={onCardEvent}
		/>
	);
}
