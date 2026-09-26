import React, { useEffect, useId, useRef, useState } from 'react';

import styles from './rendered-card.module.css';

const EXPLANATION =
	"Drawn offline from the card's text. The art comes from the offline art pack, which holds each card's default printing, so it may not match the printing you chose.";

/**
 * "Offline preview", centered at the foot of the art window, and why the card may not look
 * like its printing. As a button its explanation shows on hover or focus and toggles on a
 * tap; as a label, for a card that is itself a button, the explanation is its title.
 */
export function OfflineNote(props: { kind: 'button' | 'label' }) {
	const { kind } = props;
	const [open, setOpen] = useState(false);
	const note = useRef<HTMLSpanElement>(null);
	const tip = useId();

	useEffect(
		function () {
			if (!open) return;
			function closeOutside(event: PointerEvent) {
				if (!note.current?.contains(event.target as Node)) setOpen(false);
			}
			function closeOnEscape(event: KeyboardEvent) {
				if (event.key === 'Escape') setOpen(false);
			}
			document.addEventListener('pointerdown', closeOutside);
			document.addEventListener('keydown', closeOnEscape);
			return function () {
				document.removeEventListener('pointerdown', closeOutside);
				document.removeEventListener('keydown', closeOnEscape);
			};
		},
		[open]
	);

	if (kind === 'label') {
		return (
			<span className={styles['offline-note']}>
				<span className={styles['offline-label']} title={EXPLANATION}>
					Offline preview
				</span>
			</span>
		);
	}
	return (
		<span ref={note} className={styles['offline-note']} data-open={open}>
			<button
				type="button"
				className={styles['offline-label']}
				aria-describedby={tip}
				aria-expanded={open}
				onClick={function (event) {
					event.stopPropagation();
					setOpen(!open);
				}}
			>
				Offline preview
			</button>
			<span id={tip} role="tooltip" className={styles['offline-tip']}>
				{EXPLANATION}
			</span>
		</span>
	);
}
