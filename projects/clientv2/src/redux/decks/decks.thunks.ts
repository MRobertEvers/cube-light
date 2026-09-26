import { createAppThunk, type AppThunk } from '../thunk';
import type { RootState } from '../root-reducers';
import type { DeckBoard, DeckDetail, DeckHistory } from '../../domain/models/deck';
import { groupDeck } from '../../domain/deck/grouping';
import { otherBoard } from '../../domain/deck/boards';
import { decksSlice } from './decksSlice';
import { selectDeckCardActionIdle } from './decks.selectors';
import type { DeckCardGroupInput, DeckCardSteps } from './decks.types';

export const loadDecks = createAppThunk('decks/loadList', async function (_input: void, api) {
	const { value, revision } = await api.extra.decks.list();
	return { data: value, revision };
});
export const loadDeck = createAppThunk(
	'decks/loadDeck',
	async function (deckId: string, api) {
		const { value, revision } = await api.extra.decks.get(deckId);
		return { data: groupDeck(value), revision };
	}
);

function isDeckCardActionIdle(input: DeckCardGroupInput, api: { getState: () => RootState }) {
	const { deckId } = input;
	const { getState } = api;
	return selectDeckCardActionIdle(getState(), deckId);
}

/** Moves every copy of a card to the other board as one edit. */
export const moveDeckCardGroup = createAppThunk(
	'decks/moveCardGroup',
	async function (input: DeckCardGroupInput, api) {
		const { deckId, group } = input;
		const { decks } = api.extra;
		await decks.moveCards(deckId, {
			from: group.board,
			to: otherBoard(group.board),
			cards: group.printings.map((card) => ({
				uuid: card.uuid,
				count: card.count
			}))
		});
	},
	{ condition: isDeckCardActionIdle }
);

/** Removes every printing of a card from its board. */
export const deleteDeckCardGroup = createAppThunk(
	'decks/deleteCardGroup',
	async function (input: DeckCardGroupInput, api) {
		const { deckId, group } = input;
		const { decks } = api.extra;
		await decks.removeCards(deckId, group.board, group.printings.map((card) => card.uuid));
	},
	{ condition: isDeckCardActionIdle }
);

/** Adds copies of a named card to each board in `counts`, as one edit, in `printing` when given. */
export const addCardByName = createAppThunk(
	'decks/addCardByName',
	async function (
		input: { deckId: string; cardName: string; counts: Record<DeckBoard, number>; printing?: string },
		api
	) {
		const { deckId, cardName, counts, printing } = input;
		const { decks } = api.extra;
		await decks.addCardByName(deckId, cardName, counts, printing);
	}
);

/**
 * Saves card editor steps as soon as they are taken, then puts the saved deck in the store
 * before it settles. The engine orders them against earlier steps and syncs them; later
 * answers reach the store through its change events.
 */
export const editDeckCards = createAppThunk(
	'decks/editCards',
	async function (input: DeckCardSteps, api) {
		const { deckId, steps } = input;
		const { decks } = api.extra;
		const saved = await decks.applyCardSteps(deckId, steps);
		if (saved) api.dispatch(decksSlice.actions.deckSaved({ deckId, saved }));
	}
);

/** Creates a deck and returns its id. */
export function createDeck(name: string): AppThunk<Promise<string>> {
	return function (_dispatch, _getState, engine) {
		return engine.decks.create(name);
	};
}

export function deleteDeck(deckId: string): AppThunk<Promise<void>> {
	return function (_dispatch, _getState, engine) {
		return engine.decks.delete(deckId);
	};
}

export function renameDeck(deckId: string, name: string): AppThunk<Promise<void>> {
	return function (_dispatch, _getState, engine) {
		return engine.decks.rename(deckId, name);
	};
}

/** Replaces the deck's tags. */
export function saveDeckTags(deckId: string, tags: string[]): AppThunk<Promise<void>> {
	return function (_dispatch, _getState, engine) {
		return engine.decks.setTags(deckId, tags);
	};
}

/** Returns the new note's id. */
export function addDeckNote(deckId: string, text: string): AppThunk<Promise<string>> {
	return function (_dispatch, _getState, engine) {
		return engine.decks.addNote(deckId, text);
	};
}

export function editDeckNote(deckId: string, noteId: string, text: string): AppThunk<Promise<void>> {
	return function (_dispatch, _getState, engine) {
		return engine.decks.editNote(deckId, noteId, text);
	};
}

export function removeDeckNote(deckId: string, noteId: string): AppThunk<Promise<void>> {
	return function (_dispatch, _getState, engine) {
		return engine.decks.removeNote(deckId, noteId);
	};
}

/** The deck as saved, without putting it in the store. */
export function readDeck(deckId: string): AppThunk<Promise<DeckDetail>> {
	return async function (_dispatch, _getState, engine) {
		return (await engine.decks.get(deckId)).value;
	};
}

/** Every saved edit to the deck, newest first. */
export function readDeckHistory(deckId: string): AppThunk<Promise<DeckHistory>> {
	return function (_dispatch, _getState, engine) {
		return engine.decks.history(deckId);
	};
}

/**
 * Rereads the deck list and every deck the store holds from this device, after a change
 * event. Never waits on the server; decks deleted elsewhere leave the store.
 */
export function refreshLocalDecks(): AppThunk<Promise<void>> {
	return async function (dispatch, getState, engine) {
		const list = await engine.decks.listLocal();
		if (list) dispatch(decksSlice.actions.listReceived({ data: list.value, revision: list.revision }));
		for (const deckId of Object.keys(getState().decks.byId)) {
			const { deck, deleted, revision } = await engine.decks.getLocal(deckId);
			if (deck) dispatch(decksSlice.actions.setInitialDeck({ deckId, data: groupDeck(deck), revision }));
			else if (deleted) dispatch(decksSlice.actions.deckDeleted({ deckId, revision }));
		}
	};
}
