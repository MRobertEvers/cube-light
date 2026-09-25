import React from 'react';
import type { StorageLocationSummaries } from 'src/domain/models/library';

import styles from './location-select.module.css';

type LocationSelectProps = {
	id: string;
	locations: StorageLocationSummaries;
	/** Null files nothing: the copies stay unplaced. */
	value: string | null;
	onChange: (locationId: string | null) => void;
	disabled?: boolean;
	/** What choosing no location says. */
	noneLabel?: string;
};

/** Picks a storage location, or none. */
export function LocationSelect(props: LocationSelectProps) {
	const { id, locations, value, onChange, disabled, noneLabel = 'Not placed' } = props;
	return (
		<select
			id={id}
			className={styles.select}
			value={value ?? ''}
			disabled={disabled}
			onChange={(event) => onChange(event.target.value || null)}
		>
			<option value="">{noneLabel}</option>
			{locations.map((location) => (
				<option key={location.locationId} value={location.locationId}>
					{location.name}
				</option>
			))}
		</select>
	);
}
