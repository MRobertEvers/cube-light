import type { UserProfile } from '../../domain/models/session';
import { createAppThunk } from '../thunk';

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
