import React from 'react';
import type { BoardControlsProps } from '../board.types';
import { DeckToolbarControls } from '../controls/DeckToolbarControls';

/** The cube view's controls: one compact row, so the color columns get the page's whole width. */
export function CubeTutorBoardControls(props: BoardControlsProps) {
	return <DeckToolbarControls {...props} />;
}
