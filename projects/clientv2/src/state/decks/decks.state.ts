import { createAppThunk, type AppThunk } from '../thunk';
import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import type { DeckBoard, DeckDetail, DeckHistory, DeckSummaries } from '../../domain/models/deck';
import { groupDeck } from '../../domain/deck/grouping';
import { otherBoard } from '../../domain/deck/boards';
import type { DeckCardGroup } from '../../domain/deck/group-deck-cards';
import type { DeckCardStep } from '../../domain/deck/card-steps';
import { GroupedDeck } from '../../domain/deck/grouping';

export type DecksState = {
	list: DeckSummaries | null;
	byId: Record<string, GroupedDeck>;
	listError: string | null;
	errorsById: Record<string, string>;
	listRequestId: string | null;
	requestIdsById: Record<string, string>;
	listRevision: number;
	revisionsById: Record<string, number>;
	/** Card row edits made from a board, one at a time per deck. */
	cardActionsById: Record<string, DeckCardAction>;
};

export type DeckCardAction = {
	/** The card row with an edit in flight. */
	busy: { board: DeckBoard; name: string } | null;
	error: string | null;
};

const IDLE_CARD_ACTION: DeckCardAction = { busy: null, error: null };

const initialState: DecksState = {
	list: null,
	byId: {},
	listError: null,
	errorsById: {},
	listRequestId: null,
	requestIdsById: {},
	listRevision: 0,
	revisionsById: {},
	cardActionsById: {}
};

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

type DeckCardGroupInput = { deckId: string; group: DeckCardGroup };

function isDeckCardActionIdle(
	input: DeckCardGroupInput,
	api: { getState: () => unknown }
) {
	const { deckId } = input;
	const { getState } = api;
	return !(getState() as DecksRootState).decks.cardActionsById[deckId]?.busy;
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

type DeckCardSteps = { deckId: string; steps: DeckCardStep[] };

/** Adds copies of a named card to each board in `counts`, as one edit. */
export const addCardByName = createAppThunk(
	'decks/addCardByName',
	async function (
		input: { deckId: string; cardName: string; counts: Record<DeckBoard, number> },
		api
	) {
		const { deckId, cardName, counts } = input;
		const { decks } = api.extra;
		await decks.addCardByName(deckId, cardName, counts);
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
		if (saved)
			api.dispatch(decksSlice.actions.setInitialDeck({ deckId, data: groupDeck(saved.value), revision: saved.revision }));
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

const CARD_ACTION_FAILURES = [
	{ thunk: moveDeckCardGroup, verb: 'move' },
	{ thunk: deleteDeckCardGroup, verb: 'delete' }
];

export const decksSlice = createSlice({
	name: 'decks',
	initialState,
	reducers: {
		listReceived: function (state, action: PayloadAction<{ data: DeckSummaries; revision: number }>) {
			if (action.payload.revision >= state.listRevision) { state.list = action.payload.data; state.listRevision = action.payload.revision; }
		},
		deckDeleted: function (state, action: PayloadAction<{ deckId: string; revision: number }>) {
			const { deckId, revision } = action.payload;
			if (revision < (state.revisionsById[deckId] || 0)) return;
			delete state.byId[deckId]; state.revisionsById[deckId] = revision;
			state.errorsById[deckId] = 'This deck has been deleted.';
		},
		setInitialDecks: function (
			state,
			action: PayloadAction<DeckSummaries>
		) {
			state.list = action.payload;
		},
		setInitialDeck: function (
			state,
			action: PayloadAction<{ deckId: string; data: GroupedDeck; revision?: number }>
		) {
			if (action.payload.revision !== undefined && action.payload.revision < (state.revisionsById[action.payload.deckId] || 0)) return;
			state.byId[action.payload.deckId] = action.payload.data;
			if (action.payload.revision !== undefined) state.revisionsById[action.payload.deckId] = action.payload.revision;
		}
	},
	extraReducers: function (builder) {
		builder
			.addCase(loadDecks.pending, (state, action) => {
				state.listRequestId = action.meta.requestId;
				state.listError = null;
			})
			.addCase(loadDecks.fulfilled, (state, action) => {
				if (state.listRequestId !== action.meta.requestId) return;
				if (action.payload.revision >= state.listRevision) { state.list = action.payload.data; state.listRevision = action.payload.revision; }
				state.listRequestId = null;
			})
			.addCase(loadDecks.rejected, (state, action) => {
				if (state.listRequestId !== action.meta.requestId) return;
				state.listError =
					action.error.message ?? 'Unable to load decks';
				state.listRequestId = null;
			})
			.addCase(loadDeck.pending, (state, action) => {
				const deckId = action.meta.arg;
				state.requestIdsById[deckId] = action.meta.requestId;
				delete state.errorsById[deckId];
			})
			.addCase(loadDeck.fulfilled, (state, action) => {
				const deckId = action.meta.arg;
				if (state.requestIdsById[deckId] !== action.meta.requestId)
					return;
				if (action.payload.revision >= (state.revisionsById[deckId] || 0)) { state.byId[deckId] = action.payload.data; state.revisionsById[deckId] = action.payload.revision; }
				delete state.requestIdsById[deckId];
			})
			.addCase(loadDeck.rejected, (state, action) => {
				const deckId = action.meta.arg;
				if (state.requestIdsById[deckId] !== action.meta.requestId)
					return;
				state.errorsById[deckId] =
					action.error.message ?? 'Unable to load deck';
				delete state.requestIdsById[deckId];
			});
		for (const failure of CARD_ACTION_FAILURES) {
			const { thunk, verb } = failure;
			builder
				.addCase(thunk.pending, (state, action) => {
					const { deckId, group } = action.meta.arg;
					state.cardActionsById[deckId] = {
						busy: { board: group.board, name: group.name },
						error: null
					};
				})
				.addCase(thunk.fulfilled, (state, action) => {
					delete state.cardActionsById[action.meta.arg.deckId];
				})
				.addCase(thunk.rejected, (state, action) => {
					const { deckId, group } = action.meta.arg;
					// A rejected condition means another edit is still running.
					if (action.meta.condition) return;
					state.cardActionsById[deckId] = {
						busy: null,
						error: `Unable to ${verb} ${group.name}. Please try again.`
					};
				});
		}
	}
});

export const { setInitialDecks, setInitialDeck } = decksSlice.actions;

type DecksRootState = { decks: DecksState };

export function selectDecks(state: DecksRootState) {
	return state.decks.list;
}
export function selectDecksError(state: DecksRootState) {
	return state.decks.listError;
}
export function selectDeck(state: DecksRootState, deckId: string) {
	return state.decks.byId[deckId];
}
export function selectDeckError(state: DecksRootState, deckId: string) {
	return state.decks.errorsById[deckId];
}
export function selectDeckCardAction(state: DecksRootState, deckId: string) {
	return state.decks.cardActionsById[deckId] ?? IDLE_CARD_ACTION;
}
