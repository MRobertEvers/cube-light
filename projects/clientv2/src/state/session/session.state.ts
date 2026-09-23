import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import type { AuthUser, UserProfile } from '../../domain/models/session';
import { createAppThunk } from '../thunk';

export type SessionState =
	| { status: 'loading' }
	| { status: 'unreachable' }
	| { status: 'signed-out'; setupRequired: boolean }
	/** `expired`: the server stopped accepting the session while the app was open. */
	| {
			status: 'signed-in';
			user: AuthUser;
			expired: boolean;
			/** Counts sign-ins, so a page that failed while signed out mounts afresh. */
			epoch: number;
	  };

export const loadSession = createAppThunk('session/load', async function (_input: void, api) {
	return api.extra.session.current();
});

export const signIn = createAppThunk(
	'session/signIn',
	async function (input: { username: string; password: string; setup: boolean }, api) {
		const { username, password, setup } = input;
		const { session } = api.extra;
		return setup ? session.createFirstAccount(username, password) : session.signIn(username, password);
	}
);

export const signOut = createAppThunk('session/signOut', async function (_input: void, api) {
	await api.extra.session.signOut().catch(() => undefined);
});

export const saveProfileArt = createAppThunk('session/saveProfileArt', async function (artwork: UserProfile, api) {
	return api.extra.profile.setArtwork(artwork);
});

const initialState = { status: 'loading' } as SessionState;

export const sessionSlice = createSlice({
	name: 'session',
	initialState,
	reducers: {
		/** The engine reported the session ended; ask the person to sign in over the app. */
		expired: function (state) {
			if (state.status === 'signed-in') state.expired = true;
		}
	},
	extraReducers: function (builder) {
		builder
			.addCase(loadSession.pending, () => ({ status: 'loading' }))
			.addCase(loadSession.fulfilled, (_state, action) => {
				const { user, setupRequired } = action.payload;
				return user ? { status: 'signed-in', user, expired: false, epoch: 0 } : { status: 'signed-out', setupRequired };
			})
			.addCase(loadSession.rejected, () => ({ status: 'unreachable' }))
			.addCase(signIn.fulfilled, (state, action: PayloadAction<AuthUser>) => ({
				status: 'signed-in',
				user: action.payload,
				expired: false,
				epoch: state.status === 'signed-in' ? state.epoch + 1 : 0
			}))
			// Leave the signed-in state first, so the sign-out notice is not taken for an expiry.
			.addCase(signOut.pending, () => ({ status: 'signed-out', setupRequired: false }))
			.addCase(saveProfileArt.fulfilled, (state, action) => {
				if (state.status === 'signed-in') state.user = action.payload;
			});
	}
});

export function selectSession(state: { session: SessionState }): SessionState {
	return state.session;
}
