import React from 'react';
import type { BoardControlsProps } from '../board.types';
import { DeckSidebarControls } from '../controls/DeckSidebarControls';

/** The deck list's controls: a sidebar beside the list. */
export function DecklistBoardControls(props: BoardControlsProps) {
	return <DeckSidebarControls {...props} />;
}
