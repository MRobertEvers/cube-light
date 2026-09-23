import { createAsyncThunk, type ThunkAction, type UnknownAction } from '@reduxjs/toolkit';
import type { ToriMTGEngine } from '../engine/tori-mtg-engine';
import type { RootState } from './root-reducers';

/** createAsyncThunk whose thunks receive the ToriMTGEngine as `extra`. */
export const createAppThunk = createAsyncThunk.withTypes<{ state: RootState; extra: ToriMTGEngine }>();

/**
 * A thunk that returns a value rather than dispatching lifecycle actions: one-off reads,
 * results that are not serializable (Blobs, ArrayBuffers), and stop functions.
 */
export type AppThunk<Result> = ThunkAction<Result, RootState, ToriMTGEngine, UnknownAction>;

/**
 * The message of a failed thunk. `unwrap()` rejects with a plain serialized error rather
 * than an Error, so `instanceof Error` alone would lose the engine's message.
 */
export function errorMessage(error: unknown, fallback: string): string {
	if (error instanceof Error) return error.message;
	const message = (error as { message?: unknown } | null)?.message;
	return typeof message === 'string' && message ? message : fallback;
}
