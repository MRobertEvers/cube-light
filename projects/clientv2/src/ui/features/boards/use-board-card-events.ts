import { useCallback } from 'react';
import { deleteDeckCardGroup, moveDeckCardGroup } from '../../../redux/decks/decks.thunks';
import { useAppDispatch } from '../../../redux/use-app-dispatch';
import type { BoardCardEvent, BoardReduxWidgetProps } from './board.types';

/** Routes a board's card events: edits go to the store, dialogs to the page. */
export function useBoardCardEvents(props: BoardReduxWidgetProps) {
	const { deckId, onViewCard, onEditCard } = props;
	const dispatch = useAppDispatch();
	return useCallback(
		(event: BoardCardEvent) => {
			switch (event.type) {
				case 'view':
					onViewCard(event.card, event.group);
					break;
				case 'edit':
					onEditCard(event.group);
					break;
				case 'move':
					void dispatch(
						moveDeckCardGroup({ deckId, group: event.group })
					);
					break;
				case 'delete':
					void dispatch(
						deleteDeckCardGroup({ deckId, group: event.group })
					);
					break;
			}
		},
		[deckId, dispatch, onEditCard, onViewCard]
	);
}
