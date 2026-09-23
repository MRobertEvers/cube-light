import { CardDetails } from 'src/domain/models/card';

export enum CardDetailViewStatus {
	INITIAL = 'CardDetailViewStatus/INITIAL',
	LOADING = 'CardDetailViewStatus/LOADING',
	READY = 'CardDetailViewStatus/READY',
	ERROR = 'CardDetailViewStatus/ERROR'
}

export type CardDetailViewReadyState = {
	status: CardDetailViewStatus.READY;
	cardUuid: string;
	cardDetails: CardDetails;
};

export type CardDetailViewState =
	| {
			status:
				| CardDetailViewStatus.INITIAL
				| CardDetailViewStatus.LOADING
				| CardDetailViewStatus.ERROR;
	  }
	| CardDetailViewReadyState;
