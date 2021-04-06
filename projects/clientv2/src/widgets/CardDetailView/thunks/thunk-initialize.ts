import { createAsyncThunk } from '@reduxjs/toolkit';
import { fetchAPICardDetails, FetchAPICardDetailsResponse } from 'src/api/fetch-api-card-details';

export type ThunkInitializeArgs = {
	cardUuid: string;
};

export type ThunkInitializeResult = {
	cardUuid: string;
	cardDetails: FetchAPICardDetailsResponse;
};

export const thunkInitialize = createAsyncThunk<ThunkInitializeResult, ThunkInitializeArgs>(
	'CommandsCardDetailView/thunkInitialize',
	async (args) => {
		const { cardUuid } = args;

		const cardDetails = await fetchAPICardDetails(cardUuid);

		return { cardDetails, cardUuid };
	}
);
