import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
	FetchStorageLocationsLocationResponse,
	FetchStorageLocationsResponse,
	fetchAPIStorageLocations
} from 'src/api/fetch-api-storage-locations';
import { ComboBox, ComboBoxEvent } from 'src/components/ComboBox/ComboBox';

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
		fetchAPIStorageLocations().then(setLocations);
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
		[value]
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
		[]
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
