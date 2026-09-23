import React, { useCallback, useMemo, useState } from 'react';
import {
	StorageLocationSummary,
	StorageLocationSummaries
} from 'src/domain/models/library';
import { ComboBox, ComboBoxEvent } from 'src/ui/kit/components/ComboBox/ComboBox';
import { useSavedData } from 'src/ui/kit/hooks/useSavedData';
import { readStorageLocations } from 'src/redux/library/library.thunks';

const NO_LOCATIONS: StorageLocationSummaries = [];

interface LocationsDropdownProps {
	value: string | null;
	onChange: (s: StorageLocationSummary | null) => void;
}

export function LocationsDropdown(props: LocationsDropdownProps) {
	const { value, onChange } = props;
	const locations = useSavedData('locations', readStorageLocations).value ?? NO_LOCATIONS;

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
		(e: ComboBoxEvent<StorageLocationSummary>) => {
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
