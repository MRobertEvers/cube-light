import { createAsyncThunk, createSlice, PayloadAction } from '@reduxjs/toolkit';
import { fetchAPIDecks, FetchDecksResponse } from '../../api/fetch-api-decks';
import { groupDeck } from '../../workers/deck.functions';
import type { DeckBoard, FetchAPIDeckResponse } from '../../api/fetch-api-deck';
import {
	fetchAPIEditDeckCards,
	fetchAPIMoveDeckCards
} from '../../api/fetch-api-edit-deck-card';
import { otherBoard } from '../../utils/deck-boards';
import type { DeckCardGroup } from '../../utils/group-deck-cards';
import type { ToriMTG } from '../../torimtg/types';
import { readAvailable, readAvailableSnapshot } from '../../torimtg/ui-api';
import {
	applySteps,
	countEdits,
	countsIn,
	printingCounts,
	type DeckCardStep
} from '../../utils/deck-card-steps';
import { GetDeckResponse } from '../../workers/deck.worker.messages';

export type DecksState = {
	list: FetchDecksResponse | null;
	byId: Record<string, GetDeckResponse>;
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

export const loadDecks = createAsyncThunk('decks/loadList', async function (_input: void, api) {
	const { tori } = api.extra as { tori: ToriMTG };
	const snapshot = await readAvailableSnapshot<FetchDecksResponse>(tori, { type: 'decks' });
	return { data: snapshot.data || [], revision: snapshot.localRevision };
});
export const loadDeck = createAsyncThunk(
	'decks/loadDeck',
	async function (deckId: string, api) {
		const { tori } = api.extra as { tori: ToriMTG };
		const snapshot = await readAvailableSnapshot<FetchAPIDeckResponse>(tori, { type: 'deck', id: deckId });
		if (!snapshot.data) throw new Error('This deck was deleted or is not downloaded.');
		return { data: groupDeck(snapshot.data), revision: snapshot.localRevision };
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
export const moveDeckCardGroup = createAsyncThunk(
	'decks/moveCardGroup',
	async function (input: DeckCardGroupInput, api) {
		const { deckId, group } = input;
		await fetchAPIMoveDeckCards(deckId, {
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
export const deleteDeckCardGroup = createAsyncThunk(
	'decks/deleteCardGroup',
	async function (input: DeckCardGroupInput, api) {
		const { deckId, group } = input;
		await fetchAPIEditDeckCards(deckId, {
			board: group.board,
			remove: group.printings.map((card) => card.uuid),
			upsert: []
		});
	},
	{ condition: isDeckCardActionIdle }
);

type DeckCardSteps = { deckId: string; steps: DeckCardStep[] };

// Each deck's card steps commit one after another, in the order they were taken.
const deckCardEdits = new Map<string, Promise<unknown>>();

/**
 * Saves card editor steps as soon as they are taken. Each resolves against the deck as
 * committed locally, including every earlier step, so quick steps never undo each other,
 * then rereads the deck into the store before it settles. Sending to the server,
 * joining steps still waiting to be sent, and reconciling the server's answer belong
 * to ToriMTG; later answers reach the store through its change notices.
 */
export const editDeckCards = createAsyncThunk(
	'decks/editCards',
	async function (input: DeckCardSteps, api) {
		const { deckId, steps } = input;
		const { tori } = api.extra as { tori: ToriMTG };
		async function commit() {
			const query = { type: 'deck' as const, id: deckId };
			const current = await tori.queries.read<FetchAPIDeckResponse>(query);
			if (!current.data) throw new Error('This deck was deleted or is not downloaded.');
			const before = printingCounts([...current.data.cards, ...(current.data.sideboard ?? [])]);
			const after = applySteps(before, steps);
			const edits = countEdits(before, after);
			if (edits.length === 0) return;
			// A printing new to the deck needs its details to be filed; download it first.
			for (const edit of edits) {
				const held = countsIn(before, edit.uuid);
				if (edit.count > 0 && held.main + held.side === 0)
					await readAvailable(tori, { type: 'resource', resource: { type: 'card.details', uuid: edit.uuid } });
			}
			await tori.commands.execute({ type: 'deck.cards', id: deckId, edits });
			const saved = await tori.queries.read<FetchAPIDeckResponse>(query);
			if (saved.data)
				api.dispatch(decksSlice.actions.setInitialDeck({ deckId, data: groupDeck(saved.data), revision: saved.localRevision }));
		}
		const previous = deckCardEdits.get(deckId) ?? Promise.resolve();
		const next = previous.catch(() => undefined).then(commit);
		deckCardEdits.set(deckId, next);
		try {
			await next;
		} finally {
			if (deckCardEdits.get(deckId) === next) deckCardEdits.delete(deckId);
		}
	}
);

const CARD_ACTION_FAILURES = [
	{ thunk: moveDeckCardGroup, verb: 'move' },
	{ thunk: deleteDeckCardGroup, verb: 'delete' }
];

export const decksSlice = createSlice({
	name: 'decks',
	initialState,
	reducers: {
		listReceived: function (state, action: PayloadAction<{ data: FetchDecksResponse; revision: number }>) {
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
			action: PayloadAction<FetchDecksResponse>
		) {
			state.list = action.payload;
		},
		setInitialDeck: function (
			state,
			action: PayloadAction<{ deckId: string; data: GetDeckResponse; revision?: number }>
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
