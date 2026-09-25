import type { CardArtStatus, InstalledCardArt } from '../../domain/models/card-art';
import type { AppThunk } from '../thunk';

/** The card art on this device, what the server offers, and whether this device was asked. */
export function readCardArtStatus(): AppThunk<Promise<CardArtStatus>> {
	return function (_dispatch, _getState, engine) {
		return engine.cardArt.status();
	};
}

/**
 * Downloads and installs the card art, reporting bytes as they arrive. The card text pack
 * comes with it when it is missing: art alone cannot be looked up by name.
 */
export function installCardArt(onProgress: (received: number, total: number) => void): AppThunk<Promise<InstalledCardArt>> {
	return async function (_dispatch, _getState, engine) {
		const text = await engine.cardPack.status();
		if (!text.installed && text.offered) await engine.cardPack.install(function () {});
		return engine.cardArt.install(onProgress);
	};
}

export function removeCardArt(): AppThunk<Promise<void>> {
	return function (_dispatch, _getState, engine) {
		return engine.cardArt.remove();
	};
}

/** Records that this device was offered the card art, whatever the answer. */
export function markCardArtAsked(): AppThunk<Promise<void>> {
	return function (_dispatch, _getState, engine) {
		return engine.cardArt.markAsked();
	};
}
