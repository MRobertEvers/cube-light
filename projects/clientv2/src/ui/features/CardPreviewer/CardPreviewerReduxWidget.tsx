import React from 'react';
import { selectOfflineCardArt } from '../../../redux/card-art/card-art.selectors';
import { selectConnectivity } from '../../../redux/connectivity/connectivity.selectors';
import { useAppSelector } from '../../../redux/use-app-selector';
import { useIsPhoneLayout } from '../../kit/hooks/useIsPhoneLayout';
import type { CardPreviewerProps } from './card-previewer.types';
import { CardPreviewerDesktopOffline } from './CardPreviewerDesktopOffline';
import { CardPreviewerDesktopOfflineArt } from './CardPreviewerDesktopOfflineArt';
import { CardPreviewerDesktopOnline } from './CardPreviewerDesktopOnline';
import { CardPreviewerMobileOffline } from './CardPreviewerMobileOffline';
import { CardPreviewerMobileOfflineArt } from './CardPreviewerMobileOfflineArt';
import { CardPreviewerMobileOnline } from './CardPreviewerMobileOnline';

/**
 * The card previewer for this layout and connection: the image needs the server; offline,
 * the art comes from the offline art pack when it is installed; the text is always here.
 */
export function CardPreviewerReduxWidget(props: CardPreviewerProps) {
	const connectivity = useAppSelector(selectConnectivity);
	const offlineArt = useAppSelector(selectOfflineCardArt);
	const phone = useIsPhoneLayout();
	if (phone) {
		if (connectivity === 'online') return <CardPreviewerMobileOnline card={props.card} onClose={props.onClose} />;
		return offlineArt ? <CardPreviewerMobileOfflineArt card={props.card} onClose={props.onClose} /> : <CardPreviewerMobileOffline card={props.card} onClose={props.onClose} />;
	}
	if (connectivity === 'online') return <CardPreviewerDesktopOnline card={props.card} onClose={props.onClose} />;
	return offlineArt ? <CardPreviewerDesktopOfflineArt card={props.card} onClose={props.onClose} /> : <CardPreviewerDesktopOffline card={props.card} onClose={props.onClose} />;
}
