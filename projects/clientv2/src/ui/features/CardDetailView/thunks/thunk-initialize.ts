import { createAppThunk } from '../../../../state/thunk';
import type { CardDetails } from 'src/domain/models/card';

export type ThunkInitializeArgs = {
	cardUuid: string;
};

export type ThunkInitializeResult = {
	cardUuid: string;
	cardDetails: CardDetails;
};

export const thunkInitialize = createAppThunk<
	ThunkInitializeResult,
	ThunkInitializeArgs
>('CommandsCardDetailView/thunkInitialize', async (args, context) => {
	const { cardUuid } = args;
	const { cards } = context.extra;

	const cardDetails = await cards.details(cardUuid);

	return { cardDetails, cardUuid };
});
