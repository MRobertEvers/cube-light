import type { ComponentType } from 'react';
import type { DeckView } from '../deck-chrome/DeckViewSwitch';
import type { BoardControlsProps, BoardReduxWidgetProps } from './board.types';
import {
	boardVisualizationIdOf,
	type BoardVisualizationId
} from '../../../domain/appearance/board-visualization';
import { DecklistBoardReduxWidget } from './DecklistBoard/DecklistBoardReduxWidget';
import { DecklistBoardControls } from './DecklistBoard/DecklistBoardControls';
import { MobileDecklistBoardControls } from './MobileDecklistBoard/MobileDecklistBoardControls';
import { MTGArenaTableBoardControls } from './MTGArenaTableBoard/MTGArenaTableBoardControls';
import { MobileMTGArenaTableBoardControls } from './MobileMTGArenaTableBoard/MobileMTGArenaTableBoardControls';
import { CubeTutorBoardControls } from './CubeTutorBoard/CubeTutorBoardControls';
import { MobileCubeTutorBoardControls } from './MobileCubeTutorBoard/MobileCubeTutorBoardControls';
import { MobileDecklistBoardReduxWidget } from './MobileDecklistBoard/MobileDecklistBoardReduxWidget';
import { MTGArenaTableBoardReduxWidget } from './MTGArenaTableBoard/MTGArenaTableBoardReduxWidget';
import { MobileMTGArenaTableBoardReduxWidget } from './MobileMTGArenaTableBoard/MobileMTGArenaTableBoardReduxWidget';
import { CubeTutorBoardReduxWidget } from './CubeTutorBoard/CubeTutorBoardReduxWidget';
import { MobileCubeTutorBoardReduxWidget } from './MobileCubeTutorBoard/MobileCubeTutorBoardReduxWidget';

/** How the deck page arranges itself around a board on wide screens. */
export type DeckPageLayout = {
	/**
	 * `side` puts the visualization's controls in a column beside the board;
	 * `top` puts them above it, so the board gets the page's whole width.
	 */
	controls: 'side' | 'top';
	/** `content` keeps the page's reading width; `full` spans the window. */
	width: 'content' | 'full';
};

/** How the deck page arranges itself around a mobile board. Phones always stack the controls above it. */
export type MobileDeckPageLayout = {
	/** `content` keeps the page's side gutters; `full` runs the board edge to edge. */
	width: 'content' | 'full';
};

/**
 * A visualization is a pair of boards showing the same cards the same way: a
 * board for wide screens and its mobile board, built for touch and a narrow
 * screen. Each brings the deck controls that suit it and the page layout it
 * wants. Every visualization has both halves. Decks choose one in their
 * appearance settings, and the deck page's other tabs keep its controls.
 */
export type BoardVisualization = {
	/** Saved with the deck, so never rename one. */
	id: BoardVisualizationId;
	label: string;
	description: string;
	board: ComponentType<BoardReduxWidgetProps>;
	controls: ComponentType<BoardControlsProps>;
	layout: DeckPageLayout;
	mobileBoard: ComponentType<BoardReduxWidgetProps>;
	mobileControls: ComponentType<BoardControlsProps>;
	mobileLayout: MobileDeckPageLayout;
};

export const BOARD_VISUALIZATIONS = [
	{
		id: 'decklist',
		label: 'Deck list',
		description:
			'Rows grouped by card type, with printings and quick edits.',
		board: DecklistBoardReduxWidget,
		controls: DecklistBoardControls,
		layout: { controls: 'side', width: 'content' },
		mobileBoard: MobileDecklistBoardReduxWidget,
		mobileControls: MobileDecklistBoardControls,
		mobileLayout: { width: 'content' }
	},
	{
		id: 'mtg-arena-table',
		label: 'Tabletop',
		description: 'Card images grouped by mana value, like MTG Arena.',
		// Columns by mana value grow sideways, so the board takes the window's width.
		board: MTGArenaTableBoardReduxWidget,
		controls: MTGArenaTableBoardControls,
		layout: { controls: 'top', width: 'full' },
		mobileBoard: MobileMTGArenaTableBoardReduxWidget,
		mobileControls: MobileMTGArenaTableBoardControls,
		mobileLayout: { width: 'content' }
	},
	{
		id: 'cube-tutor',
		label: 'Cube',
		description:
			'A column per color, split by card type or color pair, like CubeTutor.',
		// A column per color needs every bit of the screen's width.
		board: CubeTutorBoardReduxWidget,
		controls: CubeTutorBoardControls,
		layout: { controls: 'top', width: 'full' },
		mobileBoard: MobileCubeTutorBoardReduxWidget,
		mobileControls: MobileCubeTutorBoardControls,
		mobileLayout: { width: 'full' }
	}
] as const satisfies readonly BoardVisualization[];

/** Ids from newer clients, or of removed visualizations, fall back to the default. */
export function boardVisualizationOf(
	id: string | null | undefined
): (typeof BOARD_VISUALIZATIONS)[number] {
	const known = boardVisualizationIdOf(id);
	return BOARD_VISUALIZATIONS.find((visualization) => visualization.id === known)!;
}

/**
 * The visualization a deck page arranges itself for. The tabletop route pins
 * Tabletop; every other tab uses the deck's choice, so its controls stay put.
 */
export function deckPageVisualization(
	view: DeckView,
	saved: string | null | undefined
): (typeof BOARD_VISUALIZATIONS)[number] {
	return boardVisualizationOf(
		view === 'tabletop' ? 'mtg-arena-table' : saved
	);
}

/** Whether a deck page tab shows the board, rather than stats or notes. */
export function deckViewShowsBoard(view: DeckView): boolean {
	return view === 'list' || view === 'tabletop';
}
