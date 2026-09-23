import React from 'react';
import { useSelector } from 'react-redux';
import { useIsPhoneLayout } from '../hooks/useIsPhoneLayout';
import { selectDeck } from '../store/decks/decks.state';
import type { BoardReduxWidgetProps } from './board.types';
import {
	type BoardVisualizationId,
	boardVisualizationOf
} from './board-visualizations';

type BoardVisualizationReduxWidgetProps = BoardReduxWidgetProps & {
	/** Shows this visualization instead of the one the deck chose. */
	visualization?: BoardVisualizationId;
};

/** The deck's chosen visualization: its mobile board on phones, its board elsewhere. */
export function BoardVisualizationReduxWidget(
	props: BoardVisualizationReduxWidgetProps
) {
	const { visualization, ...boardProps } = props;
	const { deckId } = boardProps;
	const saved = useSelector(
		(root: Parameters<typeof selectDeck>[0]) =>
			selectDeck(root, deckId)?.boardVisualization
	);
	const isPhoneLayout = useIsPhoneLayout();
	const pair = boardVisualizationOf(visualization ?? saved);
	const Board = isPhoneLayout ? pair.mobileBoard : pair.board;
	return <Board {...boardProps} />;
}
