import React, { useMemo, useState } from 'react';
import { filterPrintings } from './filter-printings';
import type { PrintingPickerOfflineProps } from './printing-picker.types';

import styles from './printing-picker.module.css';

/** Printings as text rows (set code and name) to choose from; card art needs the server. */
export function PrintingPickerOffline(props: PrintingPickerOfflineProps) {
	const { printings, selectedUuid, onSelect, name, disabled } = props;
	const [query, setQuery] = useState('');
	const visiblePrintings = useMemo(() => filterPrintings(printings, query), [printings, query]);

	const empty = printings.length === 0;
	if (empty && props.placeholder === undefined) return null;

	return (
		<div className={`${styles['picker']} ${props.fill ? styles['fill'] : ''}`}>
			<div className={styles['tools']}>
				<input
					className={styles['search']}
					type="search"
					placeholder="Search sets"
					aria-label="Search printings by set name or code"
					value={query}
					disabled={empty}
					onChange={(event) => setQuery(event.target.value)}
				/>
			</div>
			{empty && (
				<div className={styles['placeholder']}>{props.placeholder}</div>
			)}
			{!empty && visiblePrintings.length === 0 && (
				<p className={styles['message']}>
					No sets match “{query.trim()}”.
				</p>
			)}
			{visiblePrintings.length > 0 && (
				<div
					className={`${styles['list']} ${styles['text']}`}
					role="radiogroup"
					aria-label={props['aria-label']}
					aria-labelledby={props['aria-labelledby']}
				>
					{visiblePrintings.map((printing) => (
						<label className={styles['option']} key={printing.uuid}>
							<input
								type="radio"
								name={name}
								value={printing.uuid}
								checked={printing.uuid === selectedUuid}
								disabled={disabled}
								onChange={() => onSelect(printing.uuid)}
							/>
							<span className={styles['set-code']}>{printing.setCode}</span>
							{printing.setName && <span className={styles['set-name']}>{printing.setName}</span>}
						</label>
					))}
				</div>
			)}
		</div>
	);
}
