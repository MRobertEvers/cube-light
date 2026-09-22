import React, { useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
	CardPrinting,
	fetchAPICardPrintings
} from 'src/api/fetch-api-card-printings';
import { PrintingPicker } from 'src/components/PrintingPicker/PrintingPicker';
import { BackIcon } from 'src/components/BackLink/BackIcon';
import styles from './printing-sheet.module.css';

export type PrintingSheetProps = {
	/** The card whose printings are listed. */
	name: string;
	/** The line's current set code, or null for any printing. */
	setCode: string | null;
	/** Called with the chosen set code, or null to clear it. */
	onPick: (setCode: string | null) => void;
	onClose: () => void;
};

/**
 * Picks a card list line's print version. Slides over the page from the right on wide
 * screens and fills the screen on phones.
 */
export function PrintingSheet(props: PrintingSheetProps) {
	const { name, setCode, onPick, onClose } = props;
	const [printings, setPrintings] = useState<CardPrinting[]>([]);
	const [status, setStatus] = useState<'loading' | 'ready' | 'failed'>(
		'loading'
	);
	// Undefined until the user picks, so the line's own set code shows until then.
	const [pickedUuid, setPickedUuid] = useState<string | null>();
	const backRef = useRef<HTMLButtonElement>(null);
	const titleId = useId();
	const radioName = useId();

	useEffect(() => {
		backRef.current?.focus();
	}, []);

	useEffect(() => {
		const controller = new AbortController();
		setStatus('loading');
		void fetchAPICardPrintings(name, controller.signal)
			.then((items) => {
				setPrintings(items.filter((item) => !!item.image));
				setStatus('ready');
			})
			.catch((error: unknown) => {
				if (!(
					error instanceof DOMException && error.name === 'AbortError'
				))
					setStatus('failed');
			});
		return function () {
			return controller.abort();
		};
	}, [name]);

	const lineUuid =
		printings.find((printing) => printing.setCode.toUpperCase() === setCode)
			?.uuid ?? null;
	const selectedUuid = pickedUuid === undefined ? lineUuid : pickedUuid;
	const selected = printings.find(
		(printing) => printing.uuid === selectedUuid
	);
	const changed = pickedUuid !== undefined && pickedUuid !== lineUuid;

	return createPortal(
		<div
			className={styles['scrim']}
			onMouseDown={(event) => {
				if (event.target === event.currentTarget) onClose();
			}}
		>
			<section
				className={styles['sheet']}
				role="dialog"
				aria-modal="true"
				aria-labelledby={titleId}
				onKeyDown={(event) => {
					// Keeps Escape from also closing the dialog underneath.
					if (event.key === 'Escape') {
						event.preventDefault();
						event.stopPropagation();
						onClose();
					}
				}}
			>
				<header className={styles['header']}>
					<button
						ref={backRef}
						type="button"
						className={styles['back']}
						aria-label="Back to card list"
						onClick={onClose}
					>
						<BackIcon />
					</button>
					<div className={styles['title']}>
						<h2 id={titleId}>Print version</h2>
						<p>
							{name} ·{' '}
							{selected ? selected.setCode : 'Any printing'}
						</p>
					</div>
					<button
						type="button"
						className={styles['done']}
						disabled={!changed}
						onClick={() => onPick(selected?.setCode ?? null)}
					>
						Use
					</button>
				</header>
				<div className={styles['body']}>
					{status === 'loading' && (
						<p className={styles['message']} role="status">
							Loading print versions…
						</p>
					)}
					{status === 'failed' && (
						<p className={styles['message']} role="alert">
							Print versions could not be loaded.
						</p>
					)}
					{status === 'ready' && printings.length === 0 && (
						<p className={styles['message']}>
							No print versions found for {name}.
						</p>
					)}
					{/* Stays mounted while hidden so clearing the pick doesn't shift the list. */}
					<button
						type="button"
						className={styles['any']}
						hidden={!selectedUuid}
						onClick={() => setPickedUuid(null)}
					>
						Use any printing instead
					</button>
					<PrintingPicker
						printings={printings}
						selectedUuid={selectedUuid}
						onSelect={setPickedUuid}
						name={radioName}
						image="card"
						fill
						aria-labelledby={titleId}
					/>
				</div>
			</section>
		</div>,
		document.body
	);
}
