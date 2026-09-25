import React from 'react';
import { selectConnectivity } from '../../../../redux/connectivity/connectivity.selectors';
import { useAppSelector } from '../../../../redux/use-app-selector';
import type { PrintingPickerOnlineProps } from './printing-picker.types';
import { PrintingPickerOffline } from './PrintingPickerOffline';
import { PrintingPickerOnline } from './PrintingPickerOnline';

/** The printing picker for this connection: card art needs the server, set names do not. */
export function PrintingPickerReduxWidget(props: PrintingPickerOnlineProps) {
	const connectivity = useAppSelector(selectConnectivity);
	if (connectivity === 'online') {
		return (
			<PrintingPickerOnline
				printings={props.printings}
				selectedUuid={props.selectedUuid}
				onSelect={props.onSelect}
				name={props.name}
				image={props.image}
				disabled={props.disabled}
				fill={props.fill}
				placeholder={props.placeholder}
				aria-label={props['aria-label']}
				aria-labelledby={props['aria-labelledby']}
			/>
		);
	}
	return (
		<PrintingPickerOffline
			printings={props.printings}
			selectedUuid={props.selectedUuid}
			onSelect={props.onSelect}
			name={props.name}
			disabled={props.disabled}
			fill={props.fill}
			placeholder={props.placeholder}
			aria-label={props['aria-label']}
			aria-labelledby={props['aria-labelledby']}
		/>
	);
}
