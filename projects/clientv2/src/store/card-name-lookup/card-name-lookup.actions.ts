import { createAsyncThunk } from '@reduxjs/toolkit';
import { fetchAPINameLookup } from 'src/api/fetch-api-get-card-names-lookup';

type ThunkGetCardNameLookupArgs = void;
type ThunkGetCardNameLookupResult = boolean;

const thunkGetCardNameLookup = createAsyncThunk<
	ThunkGetCardNameLookupResult,
	ThunkGetCardNameLookupArgs
>('usersList/getPages', async function getPagesThunk() {
	await fetchAPINameLookup();

	return true;
});

export const ActionsCardNameLookup = {
	getCardNameLookup: thunkGetCardNameLookup
};
