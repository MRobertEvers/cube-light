import { createAppThunk } from '../thunk';
import { ImportCardsError, type ImportedCard } from '../../domain/models/deck';
import type { ImportRejection } from './add-cards.types';

export const importDeckCards = createAppThunk<
	void,
	{ deckId: string; cards: ImportedCard[] },
	{ rejectValue: ImportRejection }
>('addCards/import', async (args, context) => {
	const { deckId, cards } = args;
	const { dispatch, rejectWithValue } = context;
	const { decks } = context.extra;
	try {
		await decks.importList(deckId, cards);
	} catch (cause) {
		if (
			cause instanceof ImportCardsError &&
			cause.unknownCards.length > 0
		) {
			return rejectWithValue({
				message:
					'Fix or remove the unknown cards, then try again. Nothing was added.',
				unknownCards: cause.unknownCards.map((name) =>
					name.toLowerCase()
				)
			});
		}
		throw cause;
	}
});
