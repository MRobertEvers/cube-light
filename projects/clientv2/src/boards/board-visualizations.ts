import type { ComponentType } from 'react';
import type { BoardReduxWidgetProps } from './board.types';
import { DecklistBoardReduxWidget } from './DecklistBoard/DecklistBoardReduxWidget';
import { MobileDecklistBoardReduxWidget } from './MobileDecklistBoard/MobileDecklistBoardReduxWidget';
import { MTGArenaTableBoardReduxWidget } from './MTGArenaTableBoard/MTGArenaTableBoardReduxWidget';
import { MobileMTGArenaTableBoardReduxWidget } from './MobileMTGArenaTableBoard/MobileMTGArenaTableBoardReduxWidget';

/**
 * A visualization is a pair of boards showing the same cards the same way: a
 * board for wide screens and its mobile board, built for touch and a narrow
 * screen. Every visualization has both. Decks choose one in their appearance
 * settings.
 */
export type BoardVisualization = {
	/** Saved with the deck, so never rename one. */
	id: string;
	label: string;
	description: string;
	board: ComponentType<BoardReduxWidgetProps>;
	mobileBoard: ComponentType<BoardReduxWidgetProps>;
};

export const BOARD_VISUALIZATIONS = [
	{
		id: 'decklist',
		label: 'Deck list',
		description: 'Rows grouped by card type, with printings and quick edits.',
		board: DecklistBoardReduxWidget,
		mobileBoard: MobileDecklistBoardReduxWidget
	},
	{
		id: 'mtg-arena-table',
		label: 'Tabletop',
		description: 'Card images grouped by mana value, like MTG Arena.',
		board: MTGArenaTableBoardReduxWidget,
		mobileBoard: MobileMTGArenaTableBoardReduxWidget
	}
] as const satisfies readonly BoardVisualization[];

export type BoardVisualizationId = (typeof BOARD_VISUALIZATIONS)[number]['id'];

export const DEFAULT_BOARD_VISUALIZATION: BoardVisualizationId = 'decklist';

/** Ids from newer clients, or of removed visualizations, fall back to the default. */
export function boardVisualizationOf(
	id: string | null | undefined
): (typeof BOARD_VISUALIZATIONS)[number] {
	return (
		BOARD_VISUALIZATIONS.find((visualization) => visualization.id === id) ??
		BOARD_VISUALIZATIONS[0]
	);
}
