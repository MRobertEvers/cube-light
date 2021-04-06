import { FetchAPICardDetailsResponse } from 'src/api/fetch-api-card-details';

export enum CardDetailViewStatus {
	INITIAL = 'CardDetailViewStatus/INITIAL',
	LOADING = 'CardDetailViewStatus/LOADING',
	READY = 'CardDetailViewStatus/READY',
	ERROR = 'CardDetailViewStatus/ERROR'
}

export type CardDetailViewReadyState = {
	status: CardDetailViewStatus.READY;
	cardUuid: string;
	cardDetails: FetchAPICardDetailsResponse;
};

export type CardDetailViewState =
	| {
			status:
				| CardDetailViewStatus.INITIAL
				| CardDetailViewStatus.LOADING
				| CardDetailViewStatus.ERROR;
	  }
	| CardDetailViewReadyState;
