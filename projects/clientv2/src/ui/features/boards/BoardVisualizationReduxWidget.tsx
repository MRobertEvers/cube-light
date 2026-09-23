import React from 'react';
import { useIsPhoneLayout } from '../../kit/hooks/useIsPhoneLayout';
import { selectDeck } from '../../../redux/decks/decks.selectors';
import type { BoardReduxWidgetProps } from './board.types';
import { boardVisualizationOf } from './board-visualizations';
import type { BoardVisualizationId } from '../../../domain/appearance/board-visualization';
import { useAppSelector } from '../../../redux/use-app-selector';

type BoardVisualizationReduxWidgetProps = BoardReduxWidgetProps & {
	/** Shows this visualization instead of the one the deck chose. */
	visualization?: BoardVisualizationId;
};

/** The deck's chosen visualization: its mobile board on phones, its board elsewhere. */
export function BoardVisualizationReduxWidget(
	props: BoardVisualizationReduxWidgetProps
) {
	const { visualization, deckId, onViewCard, onEditCard } = props;
	const saved = useAppSelector(
		(root) =>
			selectDeck(root, deckId)?.boardVisualization
	);
	const isPhoneLayout = useIsPhoneLayout();
	const pair = boardVisualizationOf(visualization ?? saved);
	const Board = isPhoneLayout ? pair.mobileBoard : pair.board;
	return (
		<Board deckId={deckId} onViewCard={onViewCard} onEditCard={onEditCard} />
	);
}
