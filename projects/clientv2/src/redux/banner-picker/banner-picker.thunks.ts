import { createAppThunk } from '../thunk';

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
		await context.extra.banners.chooseCard(deckId, uuid);
	}
);
