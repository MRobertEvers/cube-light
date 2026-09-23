import React from 'react';
import type { BoardControlsProps } from '../board.types';
import { MobileDeckSummaryControls } from '../controls/MobileDeckSummaryControls';

/** The mobile tabletop's controls: the deck summary above the rows. */
export function MobileMTGArenaTableBoardControls(props: BoardControlsProps) {
	return <MobileDeckSummaryControls {...props} />;
}
