/** Every board visualization a deck can choose. Saved with the deck, so never rename one. */
export const BOARD_VISUALIZATION_IDS = ['decklist', 'mtg-arena-table', 'cube-tutor'] as const;

export type BoardVisualizationId = (typeof BOARD_VISUALIZATION_IDS)[number];

export const DEFAULT_BOARD_VISUALIZATION: BoardVisualizationId = 'decklist';

/** Ids from newer clients, or of removed visualizations, fall back to the default. */
export function boardVisualizationIdOf(id: string | null | undefined): BoardVisualizationId {
	return BOARD_VISUALIZATION_IDS.find((known) => known === id) ?? DEFAULT_BOARD_VISUALIZATION;
}
