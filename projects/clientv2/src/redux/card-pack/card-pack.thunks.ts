import type { CardPackStatus, InstalledCardPack, PackCard } from '../../domain/models/card-pack';
import type { AppThunk } from '../thunk';

/** The offline card data on this device, and what the server offers. */
export function readCardPackStatus(): AppThunk<Promise<CardPackStatus>> {
	return function (_dispatch, _getState, engine) {
		return engine.cardPack.status();
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
