import type { LocalSnapshot } from '@torimtg/core';

export type OfflineState = {
	revision: number;
	pending: number;
	conflicts: number;
	status: LocalSnapshot['refresh'];
	lastValidatedAt: string | null;
	error: string | null;
};
