import test from 'node:test';
import assert from 'node:assert/strict';
import type { DeckDetail } from '../src/domain/models/deck';
import type { DeckTopStyle } from '../src/domain/appearance/deck-top-style';
import type { ToriMTGEngine } from '../src/engine/tori-mtg-engine';
import { configureStore } from '@reduxjs/toolkit';
import { deckSaved, decksSlice, setInitialDeck } from '../src/redux/decks/decksSlice';
import { groupDeck } from '../src/domain/deck/grouping';
import { appearanceActions, appearanceSettingsSlice } from '../src/redux/appearance-settings/appearanceSettingsSlice';
import { appearanceView } from '../src/redux/appearance-settings/appearance-settings.selectors';
import { saveStyle, saveVisualization } from '../src/redux/appearance-settings/appearance-settings.thunks';

const deckId = 'deck-1';

function deckWith(topStyle: DeckTopStyle, boardVisualization: string): DeckDetail {
	return {
		name: 'Test deck',
		icon: null,
		artwork: {},
		bannerCardUuid: null,
		bannerCard: null,
		palette: null,
		bannerCrop: null,
		topStyle,
		boardVisualization,
		cards: [],
		lastEdit: '2026-09-26T00:00:00.000Z'
	};
}

/**
 * An engine whose saves return the saved deck but whose change events never arrive, the
 * slowest case the settings page has to handle.
 */
function engineWithoutChangeEvents(): ToriMTGEngine {
	let saved = deckWith('card', 'decklist');
	let revision = 1;
	const decks = {
		setTopStyle: async function (_deckId: string, topStyle: DeckTopStyle) {
			saved = deckWith(topStyle, saved.boardVisualization ?? 'decklist');
			revision += 1;
			return { value: saved, revision };
		},
		setBoardVisualization: async function (_deckId: string, boardVisualization: string) {
			saved = deckWith(saved.topStyle, boardVisualization);
			revision += 1;
			return { value: saved, revision };
		}
	};
	return { decks } as unknown as ToriMTGEngine;
}

function openSettings() {
	// Only the slices the settings page reads; the app's store adds the rest.
	const store = configureStore({
		reducer: {
			decks: decksSlice.reducer,
			appearanceSettings: appearanceSettingsSlice.reducer
		},
		middleware: (getDefaultMiddleware) =>
			getDefaultMiddleware({ thunk: { extraArgument: engineWithoutChangeEvents() } })
	});
	store.dispatch(setInitialDeck({ deckId, data: groupDeck(deckWith('card', 'decklist')), revision: 1 }));
	store.dispatch(appearanceActions.openAppearanceDeck(deckId));
	const view = () => {
		const state = store.getState();
		return appearanceView(state.appearanceSettings, deckId, state.decks.byId[deckId], null);
	};
	return { store, view };
}

test('saving the top style never shows the old style again', async () => {
	const { store, view } = openSettings();
	store.dispatch(appearanceActions.changeStyle('full-art'));

	const seen: string[] = [];
	const unsubscribe = store.subscribe(() => seen.push(view().style));
	await store.dispatch(saveStyle({ deckId, style: 'full-art' }));
	unsubscribe();

	assert.deepEqual(seen.filter((style) => style !== 'full-art'), []);
	assert.equal(view().styleChanged, false);
	assert.equal(store.getState().appearanceSettings.status.style.message, 'Deck top style saved.');
});

test('saving the card view never shows the old view again', async () => {
	const { store, view } = openSettings();
	store.dispatch(appearanceActions.changeVisualization('cube-tutor'));

	const seen: string[] = [];
	const unsubscribe = store.subscribe(() => seen.push(view().visualization));
	await store.dispatch(saveVisualization({ deckId, visualization: 'cube-tutor' }));
	unsubscribe();

	assert.deepEqual(seen.filter((visualization) => visualization !== 'cube-tutor'), []);
	assert.equal(view().visualizationChanged, false);
});

test('a saved deck older than the store keeps the newer one', () => {
	const { store } = openSettings();
	store.dispatch(setInitialDeck({ deckId, data: groupDeck(deckWith('full-art', 'decklist')), revision: 5 }));
	store.dispatch(deckSaved({ deckId, saved: { value: deckWith('card', 'decklist'), revision: 3 } }));
	assert.equal(store.getState().decks.byId[deckId].topStyle, 'full-art');
});
