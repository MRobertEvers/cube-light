import React from 'react';
import { selectConnectivity } from '../../../redux/connectivity/connectivity.selectors';
import { useAppSelector } from '../../../redux/use-app-selector';
import { useIsPhoneLayout } from '../../kit/hooks/useIsPhoneLayout';
import type { CardPreviewerProps } from './card-previewer.types';
import { CardPreviewerDesktopOffline } from './CardPreviewerDesktopOffline';
import { CardPreviewerDesktopOnline } from './CardPreviewerDesktopOnline';
import { CardPreviewerMobileOffline } from './CardPreviewerMobileOffline';
import { CardPreviewerMobileOnline } from './CardPreviewerMobileOnline';

/** The card previewer for this layout and connection: the image needs the server, the text does not. */
export function CardPreviewerReduxWidget(props: CardPreviewerProps) {
	const connectivity = useAppSelector(selectConnectivity);
	const phone = useIsPhoneLayout();
	if (phone) {
		return connectivity === 'online' ? <CardPreviewerMobileOnline card={props.card} onClose={props.onClose} /> : <CardPreviewerMobileOffline card={props.card} onClose={props.onClose} />;
	}
	return connectivity === 'online' ? <CardPreviewerDesktopOnline card={props.card} onClose={props.onClose} /> : <CardPreviewerDesktopOffline card={props.card} onClose={props.onClose} />;
}
