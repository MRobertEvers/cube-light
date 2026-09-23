import type { ToriMTGEngine } from '../engine/tori-mtg-engine';
import type { AppDispatch } from './use-app-dispatch';
import { offlineSlice } from './offline/offlineSlice';
import { sessionSlice } from './session/sessionSlice';
import { scansSlice } from './scans/scansSlice';
import { refreshLocalDecks } from './decks/decks.thunks';
import { refreshLocalDeckGroups } from './deck-groups/deck-groups.thunks';

export const ACCOUNT_RESET = 'torimtg/accountReset';

/**
 * Keeps Redux in step with the engine: every engine event becomes an action. Change events
 * reread the deck list, the deck groups and every deck the store holds; changes that arrive during a reread
 * collapse into one more pass. Returns a function that stops listening.
 */
export function startProjections(dispatch: AppDispatch, events: ToriMTGEngine['events']): () => void {
	let account: string | null = null;
	let refreshing = false;
	let dirty = false;
	async function refresh() {
		refreshing = true;
		try {
			while (dirty) {
				dirty = false;
				await dispatch(refreshLocalDecks());
				await dispatch(refreshLocalDeckGroups());
			}
		} catch {
			/* An account lock discards pending reads. */
		} finally {
			refreshing = false;
		}
	}
	return events.subscribe((event) => {
		switch (event.type) {
			case 'data-changed':
				if (account !== null && account !== event.account) dispatch({ type: ACCOUNT_RESET });
				account = event.account;
				dirty = true;
				if (!refreshing) void refresh();
				return;
			case 'sync-status':
				dispatch(offlineSlice.actions.received(event.status));
				return;
			case 'session-expired':
				dispatch(sessionSlice.actions.expired());
				return;
			case 'work-queue-changed':
				dispatch(scansSlice.actions.workQueueChanged({ items: event.items, error: event.error }));
				return;
			case 'scans-changed':
				dispatch(scansSlice.actions.scansChanged(event.scans));
				return;
		}
	});
}
