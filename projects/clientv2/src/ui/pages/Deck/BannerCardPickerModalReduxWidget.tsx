import React from 'react';
import { useAppSelector } from '../../../redux/use-app-selector';
import { selectBannerPicker } from '../../../redux/banner-picker/banner-picker.selectors';
import { selectConnectivity } from '../../../redux/connectivity/connectivity.selectors';
import { BannerCardPickerModalOffline } from './BannerCardPickerModalOffline';
import { BannerCardPickerModalOnline } from './BannerCardPickerModalOnline';

export type BannerCardPickerModalProps = {
	deckId: string;
	deckName: string;
	open: boolean;
	onClose: () => void;
	onSaved: () => void;
};

/**
 * The banner card picker for this connection: printing art when the server can be
 * reached, the device's own printings as text when it cannot.
 */
export function BannerCardPickerModalReduxWidget(props: BannerCardPickerModalProps) {
	const picker = useAppSelector(selectBannerPicker);
	const connectivity = useAppSelector(selectConnectivity);
	if (!props.open || !picker.open || picker.deckId !== props.deckId) return null;
	if (connectivity === 'online') {
		return <BannerCardPickerModalOnline deckId={props.deckId} deckName={props.deckName} open={props.open} onClose={props.onClose} onSaved={props.onSaved} />;
	}
	return <BannerCardPickerModalOffline deckId={props.deckId} deckName={props.deckName} open={props.open} onClose={props.onClose} onSaved={props.onSaved} />;
}
