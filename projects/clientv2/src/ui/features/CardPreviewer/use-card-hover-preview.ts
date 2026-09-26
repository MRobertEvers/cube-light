import type { ComponentType } from 'react';
import { selectOfflineCardArt } from '../../../redux/card-art/card-art.selectors';
import { selectConnectivity } from '../../../redux/connectivity/connectivity.selectors';
import { useAppSelector } from '../../../redux/use-app-selector';
import type { CardHoverPreviewProps } from './card-previewer.types';
import { CardHoverPreviewOffline } from './CardHoverPreviewOffline';
import { CardHoverPreviewOfflineArt } from './CardHoverPreviewOfflineArt';
import { CardHoverPreviewOnline } from './CardHoverPreviewOnline';

/** The hover preview for this connection and whether offline art is installed, for a board widget to hand its board. */
export function useCardHoverPreview(): ComponentType<CardHoverPreviewProps> {
	const connectivity = useAppSelector(selectConnectivity);
	const offlineArt = useAppSelector(selectOfflineCardArt);
	if (connectivity === 'online') return CardHoverPreviewOnline;
	return offlineArt ? CardHoverPreviewOfflineArt : CardHoverPreviewOffline;
}
