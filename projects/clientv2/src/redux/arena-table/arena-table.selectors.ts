import type { RootState } from '../root-reducers';

export function selectArenaSearch(state: RootState, deckId: string): string {
	return state.arenaTable.searchByDeck[deckId] ?? '';
}
