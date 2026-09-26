import { offlineCardDataUpdateAvailable, type CardPackStatus, type InstalledCardPack, type PackCard } from '../../domain/models/card-pack';
import { offlineDataSlice } from '../offline-data/offlineDataSlice';
import type { AppThunk } from '../thunk';

/**
 * The offline card data on this device, and what the server offers. Whether it has an
 * update is recorded when the server answered.
 */
export function readCardPackStatus(): AppThunk<Promise<CardPackStatus>> {
	return async function (dispatch, _getState, engine) {
		const status = await engine.cardPack.status();
		if (status.offered !== null || status.installed === null) dispatch(offlineDataSlice.actions.cardDataChecked(offlineCardDataUpdateAvailable(status)));
		return status;
	};
}

/** Downloads and installs the offline card data, reporting bytes as they arrive. */
export function installCardPack(onProgress: (received: number, total: number) => void): AppThunk<Promise<InstalledCardPack>> {
	return function (_dispatch, _getState, engine) {
		return engine.cardPack.install(onProgress);
	};
}

export function removeCardPack(): AppThunk<Promise<void>> {
	return function (_dispatch, _getState, engine) {
		return engine.cardPack.remove();
	};
}

/** A card's text from the installed offline card data; null when it is not there. */
export function lookupPackCard(name: string): AppThunk<Promise<PackCard | null>> {
	return function (_dispatch, _getState, engine) {
		return engine.cardPack.lookup(name);
	};
}
