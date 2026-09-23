import React from 'react';
import type { BoardControlsProps } from '../board.types';
import { MobileDeckSummaryControls } from '../controls/MobileDeckSummaryControls';

/** The mobile cube view's controls: the deck summary above the colors. */
export function MobileCubeTutorBoardControls(props: BoardControlsProps) {
	return <MobileDeckSummaryControls {...props} />;
}
