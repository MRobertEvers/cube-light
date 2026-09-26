import { cardArtUpdateAvailable, type CardArtStatus } from './card-art';
import { offlineCardDataUpdateAvailable, type CardPackStatus } from './card-pack';

/**
 * Which of the offline data installed on this device the server has a newer build of:
 * the card data (its text pack and name index) and the card art. Each pack names its build
 * by a sha256 the server publishes beside it; data not installed here never needs an update.
 */
export type OfflineDataUpdates = {
	cardData: boolean;
	cardArt: boolean;
};

export const NO_OFFLINE_DATA_UPDATES: OfflineDataUpdates = { cardData: false, cardArt: false };

export function offlineDataUpdates(cardPack: CardPackStatus, cardArt: CardArtStatus): OfflineDataUpdates {
	return { cardData: offlineCardDataUpdateAvailable(cardPack), cardArt: cardArtUpdateAvailable(cardArt) };
}
