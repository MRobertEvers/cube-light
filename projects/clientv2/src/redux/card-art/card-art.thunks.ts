import { cardArtUpdateAvailable, type CardArtStatus, type InstalledCardArt } from '../../domain/models/card-art';
import { offlineDataSlice } from '../offline-data/offlineDataSlice';
import type { AppThunk } from '../thunk';
import { cardArtSlice } from './cardArtSlice';

/** Reads whether card art is installed here, for views to choose their offline-art form. */
export function loadCardArtInstalled(): AppThunk<Promise<void>> {
	return async function (dispatch, _getState, engine) {
		dispatch(cardArtSlice.actions.installedChanged(await engine.cardArt.isInstalled()));
	};
}

/** An object URL of a card's installed art, by its printing then its name; null when there is none. */
export function loadCardArt(card: { name: string; uuid: string }): AppThunk<Promise<string | null>> {
	return function (_dispatch, _getState, engine) {
		return engine.cardArt.artFor({ name: card.name, uuid: card.uuid });
	};
}

/**
 * The card art on this device, what the server offers, and whether this device was asked.
 * Whether it has an update is recorded when the server answered.
 */
export function readCardArtStatus(): AppThunk<Promise<CardArtStatus>> {
	return async function (dispatch, _getState, engine) {
		const status = await engine.cardArt.status();
		if (status.offered !== null || status.installed === null) dispatch(offlineDataSlice.actions.cardArtChecked(cardArtUpdateAvailable(status)));
		return status;
	};
}

/**
 * Downloads and installs the card art, reporting bytes as they arrive. The card text pack
 * comes with it when it is missing: art alone cannot be looked up by name.
 */
export function installCardArt(onProgress: (received: number, total: number) => void): AppThunk<Promise<InstalledCardArt>> {
	return async function (dispatch, _getState, engine) {
		const text = await engine.cardPack.status();
		if (!text.installed && text.offered) await engine.cardPack.install(function () {});
		const installed = await engine.cardArt.install(onProgress);
		dispatch(cardArtSlice.actions.installedChanged(true));
		return installed;
	};
}

export function removeCardArt(): AppThunk<Promise<void>> {
	return async function (dispatch, _getState, engine) {
		await engine.cardArt.remove();
		dispatch(cardArtSlice.actions.installedChanged(false));
	};
}

/** Records that this device was offered the card art, whatever the answer. */
export function markCardArtAsked(): AppThunk<Promise<void>> {
	return function (_dispatch, _getState, engine) {
		return engine.cardArt.markAsked();
	};
}
