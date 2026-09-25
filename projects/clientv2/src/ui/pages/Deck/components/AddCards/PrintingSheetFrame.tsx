import React, { ReactNode, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import type { CardPrinting } from 'src/domain/models/card';
import { BackIcon } from 'src/ui/kit/components/BackLink/BackIcon';
import { useVisualViewportFrame } from 'src/ui/kit/hooks/useVisualViewportFrame';
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

/** The line's printing and the person's pick among the loaded printings. */
export function usePrintingSheetSelection(printings: CardPrinting[], setCode: string | null) {
	// Undefined until the user picks, so the line's own set code shows until then.
	const [pickedUuid, setPickedUuid] = useState<string | null>();
	const lineUuid =
		printings.find((printing) => printing.setCode.toUpperCase() === setCode)
			?.uuid ?? null;
	const selectedUuid = pickedUuid === undefined ? lineUuid : pickedUuid;
	const selected = printings.find(
		(printing) => printing.uuid === selectedUuid
	);
	const changed = pickedUuid !== undefined && pickedUuid !== lineUuid;
	return { selectedUuid, selected, changed, pick: setPickedUuid };
}

/**
 * The print version sheet around a list of printings: header with back and Use, a status
 * message, and the "any printing" reset. Slides over the page from the right on wide
 * screens and fills the screen on phones.
 */
export function PrintingSheetFrame(props: {
	name: string;
	titleId: string;
	selected: CardPrinting | undefined;
	changed: boolean;
	/** Loading, failure or empty-list text shown above the list, if any. */
	message: ReactNode;
	/** Hides the "any printing" reset while nothing is picked, keeping its space. */
	anyHidden: boolean;
	onAny: () => void;
	onPick: (setCode: string | null) => void;
	onClose: () => void;
	children: ReactNode;
}) {
	const { name, titleId, selected, changed, onPick, onClose } = props;
	useVisualViewportFrame();
	const backRef = useRef<HTMLButtonElement>(null);

	useEffect(() => {
		backRef.current?.focus();
	}, []);

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
					{props.message}
					{/* Stays mounted while hidden so clearing the pick doesn't shift the list. */}
					<button
						type="button"
						className={styles['any']}
						hidden={props.anyHidden}
						onClick={props.onAny}
					>
						Use any printing instead
					</button>
					{props.children}
				</div>
			</section>
		</div>,
		document.body
	);
}
