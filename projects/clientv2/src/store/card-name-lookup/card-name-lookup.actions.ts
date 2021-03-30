import { createAsyncThunk } from '@reduxjs/toolkit';
import { fetchAPINameLookup } from 'src/api/fetch-api-get-card-names-lookup';

type ThunkGetCardNameLookupArgs = void;
type ThunkGetCardNameLookupResult = any;

const thunkGetCardNameLookup = createAsyncThunk<
	ThunkGetCardNameLookupArgs,
	ThunkGetCardNameLookupResult
>('usersList/getPages', async function getPagesThunk() {
	const result = await fetchAPINameLookup();

	return result;
});

export const ActionsCardNameLookup = {
	getCardNameLookup: thunkGetCardNameLookup
};
