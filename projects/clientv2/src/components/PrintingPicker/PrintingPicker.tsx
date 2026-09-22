import React, { ReactNode, useMemo, useState } from 'react';
import { CardPrinting } from '../../api/fetch-api-card-printings';

import styles from './printing-picker.module.css';

type PrintingView = 'grid' | 'compact';
const PRINTING_VIEW_KEY = 'printing-picker-view';

function readPrintingView(): PrintingView {
	try {
		return localStorage.getItem(PRINTING_VIEW_KEY) === 'compact'
			? 'compact'
			: 'grid';
	} catch {
		return 'grid';
	}
}

export type PrintingPickerProps = {
	printings: CardPrinting[];
	selectedUuid: string | null;
	onSelect: (uuid: string) => void;
	/** Radio group name; must be unique on the page. */
	name: string;
	/** Which image the grid view shows. Compact rows always prefer the art crop. */
	image: 'card' | 'art';
	disabled?: boolean;
	/** Grows to fill a flex column and scrolls the list, instead of a fixed-height list. */
	fill?: boolean;
	/** Shown in place of the list while there are no printings, keeping the picker's footprint. */
	placeholder?: ReactNode;
	'aria-label'?: string;
	'aria-labelledby'?: string;
};

export function PrintingPicker(props: PrintingPickerProps) {
	const { printings, selectedUuid, onSelect, name, image, disabled } = props;
	const [view, setView] = useState<PrintingView>(readPrintingView);
	const [query, setQuery] = useState('');

	const visiblePrintings = useMemo(() => {
		const needle = query.trim().toLowerCase();
		if (!needle) return printings;
		return printings.filter(
			(printing) =>
				printing.setCode.toLowerCase().includes(needle) ||
				!!printing.setName?.toLowerCase().includes(needle)
		);
	}, [printings, query]);

	const empty = printings.length === 0;
	if (empty && props.placeholder === undefined) return null;

	function changeView(next: PrintingView) {
		setView(next);
		try {
			localStorage.setItem(PRINTING_VIEW_KEY, next);
		} catch {
			/* preference is optional */
		}
	}
	function imageFor(printing: CardPrinting) {
		return (
			(view === 'compact' || image === 'art'
				? (printing.art ?? printing.image)
				: (printing.image ?? printing.art)) ?? undefined
		);
	}

	return (
		<div
			className={`${styles['picker']} ${props.fill ? styles['fill'] : ''}`}
		>
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
				<div
					className={styles['view-toggle']}
					role="group"
					aria-label="Printing layout"
				>
					{(['grid', 'compact'] as const).map((option) => (
						<button
							key={option}
							type="button"
							aria-pressed={view === option}
							onClick={() => changeView(option)}
						>
							{option === 'grid' ? 'Grid' : 'Compact'}
						</button>
					))}
				</div>
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
					className={`${styles['list']} ${styles[view]} ${image === 'art' ? styles['art'] : ''}`}
					role="radiogroup"
					aria-label={props['aria-label']}
					aria-labelledby={props['aria-labelledby']}
				>
					{visiblePrintings.map((printing) => (
						<label
							className={styles['option']}
							key={printing.uuid}
							title={printing.setName ?? undefined}
						>
							<input
								type="radio"
								name={name}
								value={printing.uuid}
								checked={printing.uuid === selectedUuid}
								disabled={disabled}
								onChange={() => onSelect(printing.uuid)}
							/>
							<img
								src={imageFor(printing)}
								alt=""
								loading="lazy"
							/>
							<span>{printing.setCode}</span>
						</label>
					))}
				</div>
			)}
		</div>
	);
}
