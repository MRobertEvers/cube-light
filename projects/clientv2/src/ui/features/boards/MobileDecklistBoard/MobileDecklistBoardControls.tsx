import React from 'react';
import type { BoardControlsProps } from '../board.types';
import { MobileDeckSummaryControls } from '../controls/MobileDeckSummaryControls';

/** The mobile deck list's controls: the deck summary above the list. */
export function MobileDecklistBoardControls(props: BoardControlsProps) {
	return <MobileDeckSummaryControls {...props} />;
}
