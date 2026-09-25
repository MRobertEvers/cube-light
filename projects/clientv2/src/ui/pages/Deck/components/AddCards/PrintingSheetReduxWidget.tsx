import React from 'react';
import { selectConnectivity } from 'src/redux/connectivity/connectivity.selectors';
import { useAppSelector } from 'src/redux/use-app-selector';
import type { PrintingSheetProps } from './PrintingSheetFrame';
import { PrintingSheetOffline } from './PrintingSheetOffline';
import { PrintingSheetOnline } from './PrintingSheetOnline';

export type { PrintingSheetProps } from './PrintingSheetFrame';

/**
 * Picks a card list line's print version: card art when the server can be reached, the
 * device's own printings as text when it cannot.
 */
export function PrintingSheetReduxWidget(props: PrintingSheetProps) {
	const connectivity = useAppSelector(selectConnectivity);
	if (connectivity === 'online') {
		return <PrintingSheetOnline name={props.name} setCode={props.setCode} onPick={props.onPick} onClose={props.onClose} />;
	}
	return <PrintingSheetOffline name={props.name} setCode={props.setCode} onPick={props.onPick} onClose={props.onClose} />;
}
