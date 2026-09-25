import React from 'react';
import { selectConnectivity } from 'src/redux/connectivity/connectivity.selectors';
import { useAppSelector } from 'src/redux/use-app-selector';
import type { ManagePrintingsProps } from './manage-printings.types';
import { ManagePrintingsOffline } from './ManagePrintingsOffline';
import { ManagePrintingsOnline } from './ManagePrintingsOnline';

/** The card editor for this connection: printing images need the server, the text does not. */
export function ManagePrintingsReduxWidget(props: ManagePrintingsProps) {
	const connectivity = useAppSelector(selectConnectivity);
	return connectivity === 'online' ? (
		<ManagePrintingsOnline target={props.target} cards={props.cards} onSteps={props.onSteps} onClose={props.onClose} />
	) : (
		<ManagePrintingsOffline target={props.target} cards={props.cards} onSteps={props.onSteps} onClose={props.onClose} />
	);
}
