import type { ComponentType } from 'react';
import { selectConnectivity } from '../../../redux/connectivity/connectivity.selectors';
import { useAppSelector } from '../../../redux/use-app-selector';
import type { CardHoverPreviewProps } from './card-previewer.types';
import { CardHoverPreviewOffline } from './CardHoverPreviewOffline';
import { CardHoverPreviewOnline } from './CardHoverPreviewOnline';

/** The hover preview for this connection, for a board widget to hand its board. */
export function useCardHoverPreview(): ComponentType<CardHoverPreviewProps> {
	const connectivity = useAppSelector(selectConnectivity);
	return connectivity === 'online' ? CardHoverPreviewOnline : CardHoverPreviewOffline;
}
