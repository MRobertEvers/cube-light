import React, { ReactNode, useMemo, useState, useEffect } from 'react';
import type { CardPrinting } from '../../../../domain/models/card';
import { useSelector } from 'react-redux';
import type { PrintingView } from '../../../../domain/models/session';
import { useAppDispatch } from '../../../../state/use-app-dispatch';
import { readPrintingView, savePrintingView } from '../../../../state/profile/profile.thunks';
import { selectDataRevision } from '../../../../state/offline.state';

import styles from './printing-picker.module.css';

const PRINTING_VIEW_KEY = 'printing-picker-view';


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
	const [view, setView] = useState<PrintingView>('grid');
	const [saveError, setSaveError] = useState<string | null>(null);
	const dispatch = useAppDispatch();
	// Rereads whenever saved data changes, so a view chosen on another device shows here.
	const revision = useSelector(selectDataRevision);
	useEffect(() => {
		async function read() {
			const saved = await dispatch(readPrintingView());
			if (saved) setView(saved);
			else if (localStorage.getItem(PRINTING_VIEW_KEY)) {
				// Moves a view chosen before it was synced into the profile.
				const printingView = localStorage.getItem(PRINTING_VIEW_KEY) === 'compact' ? 'compact' : 'grid';
				await dispatch(savePrintingView(printingView));
				localStorage.removeItem(PRINTING_VIEW_KEY); setView(printingView);
			}
		}
		void read().catch(() => undefined);
	}, [dispatch, revision]);
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

	async function changeView(next: PrintingView) {
		try {
			await dispatch(savePrintingView(next));
			setView(next); setSaveError(null);
		} catch (error) {
			setSaveError(error instanceof Error ? error.message : 'Could not save this preference.');
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
			{saveError && <p role="alert">{saveError}</p>}
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
