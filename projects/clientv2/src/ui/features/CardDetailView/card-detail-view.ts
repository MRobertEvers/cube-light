import { ActionReducerMapBuilder, createReducer } from '@reduxjs/toolkit';
import { CardDetails } from 'src/domain/models/card';
import { CommandsCardDetailView } from './card-detail-view.commands';
import {
	CardDetailViewReadyState,
	CardDetailViewState,
	CardDetailViewStatus
} from './card-detail-view.types';

export const initialCardDetailViewState: CardDetailViewState = {
	status: CardDetailViewStatus.INITIAL
};

function parseLoadedDataToState(
	cardUuid: string,
	data: CardDetails
): CardDetailViewReadyState {
	return {
		status: CardDetailViewStatus.READY,
		cardUuid: cardUuid,
		cardDetails: data
	};
}

function buildCardDetailViewReducer(
	builder: ActionReducerMapBuilder<CardDetailViewState>
) {
	builder.addCase(
		CommandsCardDetailView.initialize.pending,
		(slice, action) => {
			slice.status = CardDetailViewStatus.LOADING;
		}
	);

	builder.addCase(
		CommandsCardDetailView.initialize.fulfilled,
		(slice, action) => {
			const { cardUuid, cardDetails } = action.payload;
			return parseLoadedDataToState(cardUuid, cardDetails);
		}
	);

	return builder;
}

export function isCardDetailViewReady(
	state: CardDetailViewState
): state is CardDetailViewReadyState {
	return state.status === CardDetailViewStatus.READY;
}

export const reducerCardDetailView = createReducer<CardDetailViewState>(
	initialCardDetailViewState,
	buildCardDetailViewReducer
);
