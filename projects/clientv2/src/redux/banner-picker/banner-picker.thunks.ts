import { createAppThunk } from '../thunk';
import { deckSaved } from '../decks/decksSlice';

export const loadBannerPrintings = createAppThunk(
	'bannerPicker/loadPrintings',
	async (args: { deckId: string; name: string }, context) => {
		const { name } = args;
		const { cards } = context.extra;
		return cards.printings(name);
	}
);

/** Shows the chosen printing's artwork in the banner and renders a fresh blend for it. */
export const saveBannerSelection = createAppThunk(
	'bannerPicker/save',
	async (args: { deckId: string; uuid: string }, context) => {
		const { deckId, uuid } = args;
		const saved = await context.extra.banners.chooseCard(deckId, uuid);
		context.dispatch(deckSaved({ deckId, saved }));
	}
);
