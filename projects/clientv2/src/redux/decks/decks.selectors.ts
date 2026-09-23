import type { RootState } from '../root-reducers';
import type { DeckCardAction } from './decks.types';

const IDLE_CARD_ACTION: DeckCardAction = { busy: null, error: null };

export function selectDecks(state: RootState) {
	return state.decks.list;
}
export function selectDecksError(state: RootState) {
	return state.decks.listError;
}
export function selectDeck(state: RootState, deckId: string) {
	return state.decks.byId[deckId];
}
export function selectDeckError(state: RootState, deckId: string) {
	return state.decks.errorsById[deckId];
}
export function selectDeckCardAction(state: RootState, deckId: string) {
	return state.decks.cardActionsById[deckId] ?? IDLE_CARD_ACTION;
}
/** False while a card row edit is in flight for the deck. */
export function selectDeckCardActionIdle(state: RootState, deckId: string) {
	return !state.decks.cardActionsById[deckId]?.busy;
}
