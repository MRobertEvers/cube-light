import type { DeckGroup } from '../../domain/models/deck';

export type DeckGroupsState = {
	/** Null until the profile has been read. */
	groups: DeckGroup[] | null;
	revision: number;
	error: string | null;
};
