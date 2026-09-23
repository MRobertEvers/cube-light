import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
	FetchStorageLocationsLocationResponse,
	FetchStorageLocationsResponse
} from 'src/api/fetch-api-storage-locations';
import { ComboBox, ComboBoxEvent } from 'src/components/ComboBox/ComboBox';
import { observeLocalQuery } from '../../../torimtg/observe';

interface LocationsDropdownProps {
	value: string | null;
	onChange: (s: FetchStorageLocationsLocationResponse | null) => void;
}

export function LocationsDropdown(props: LocationsDropdownProps) {
	const { value, onChange } = props;

	const [locations, setLocations] = useState<FetchStorageLocationsResponse>(
		[]
	);

	useEffect(() => {
		return observeLocalQuery<FetchStorageLocationsResponse>({ type: 'locations' }, setLocations);
	}, []);

	const locationSuggestions = useMemo(
		() =>
			locations.map((loc) => ({
				id: loc.storage_location_id,
				value: loc,
				label: loc.name
			})),
		[locations]
	);

	const ddValue = useMemo(
		() => locations.find((loc) => loc.storage_location_id === value),
		[value, locations]
	);

	const [controlledValue, setControlledValue] = useState<string>(
		ddValue?.name ?? ''
	);
	const [prevValue, setPrevValue] = useState(value);
	if (value !== prevValue) {
		setControlledValue(ddValue?.name ?? '');
		setPrevValue(value);
	}

	const onEvent = useCallback(
		(e: ComboBoxEvent<FetchStorageLocationsLocationResponse>) => {
			if (e.type === 'selected') {
				onChange(e.payload.value);
			} else if (e.type === 'changed') {
				setControlledValue(e.payload);
				onChange(null);
			}
		},
		[onChange]
	);

	return (
		<ComboBox
			showSuggestions="auto"
			suggestions={locationSuggestions}
			onEvent={onEvent}
			value={controlledValue}
		/>
	);
}
