import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import type { AuthUser } from '../../domain/models/session';
import { loadSession, saveProfileArt, signIn, signOut } from './session.thunks';
import type { SessionState } from './session.types';

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
