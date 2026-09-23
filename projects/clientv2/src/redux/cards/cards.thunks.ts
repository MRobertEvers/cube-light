import type { CardPrinting } from '../../domain/models/card';
import type { CardListProblem } from '../../domain/card-names/card-list-problem';
import type { AppThunk } from '../thunk';

/** Every printing of a card, downloaded once and then answered from this device. */
export function readCardPrintings(name: string): AppThunk<Promise<CardPrinting[]>> {
	return function (_dispatch, _getState, engine) {
		return engine.cards.printings(name);
	};
}

/** Every card name, for matching what the person types or what a scan reads. */
export function readAllCardNames(): AppThunk<Promise<string[]>> {
	return function (_dispatch, _getState, engine) {
		return engine.cards.allNames();
	};
}

/** Starts the card-list checker; resolves once it can answer. */
export function prepareCardListChecks(): AppThunk<Promise<void>> {
	return function (_dispatch, _getState, engine) {
		return engine.cards.prepareListChecks();
	};
}

/** Lines of a pasted list whose name is not a card, with suggestions for each. */
export function checkCardList(text: string): AppThunk<Promise<CardListProblem[]>> {
	return function (_dispatch, _getState, engine) {
		return engine.cards.checkList(text);
	};
}

/** Card names completing what has been typed. */
export function completeCardName(query: string): AppThunk<Promise<string[]>> {
	return function (_dispatch, _getState, engine) {
		return engine.cards.completeName(query);
	};
}
