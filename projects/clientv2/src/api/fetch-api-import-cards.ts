import { API_URI } from '../config/api-url';
import { apiFetch } from './utils';

export type ImportedCard = { name: string; count: number; setCode?: string };

export class ImportCardsError extends Error {
	readonly unknownCards: string[];

	constructor(message: string, unknownCardsArg?: string[]) {
		const unknownCards =
			unknownCardsArg === undefined ? [] : unknownCardsArg;

		super(message);
		this.unknownCards = unknownCards;
	}
}

export async function fetchAPIImportCards(
	deckId: string,
	cards: ImportedCard[]
): Promise<void> {
	const response = await apiFetch(`${API_URI}/decks/${deckId}/cards/import`, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({ cards })
	});
	if (!response.ok) {
		const details = (await response.json().catch(() => null)) as {
			error?: string;
			unknownCards?: string[];
		} | null;
		throw new ImportCardsError(
			details?.error || 'Could not add cards to the deck',
			details?.unknownCards
		);
	}
}
