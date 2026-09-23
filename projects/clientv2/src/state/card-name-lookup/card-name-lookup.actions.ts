import { createAppThunk } from '../thunk';

type ThunkGetCardNameLookupArgs = void;
type ThunkGetCardNameLookupResult = boolean;

const thunkGetCardNameLookup = createAppThunk<
	ThunkGetCardNameLookupResult,
	ThunkGetCardNameLookupArgs
>('usersList/getPages', async function getPagesThunk(_args, context) {
	const { cards } = context.extra;
	await cards.prepareNameSearch();

	return true;
});

export const ActionsCardNameLookup = {
	getCardNameLookup: thunkGetCardNameLookup
};

/** Card names matching `query`, best first. The first call loads the name index. */
export const searchCardNames = createAppThunk(
	'cardNameLookup/search',
	async function (query: string, context) {
		const { cards } = context.extra;
		return cards.suggestNames(query);
	}
);
