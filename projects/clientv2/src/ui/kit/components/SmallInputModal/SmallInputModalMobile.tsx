import React, { useId, useRef } from 'react';
import {
	HotkeyScope,
	useHotkey,
	useHotkeyLayer
} from 'src/ui/kit/hotkeys/Hotkeys';
import { useDocumentScrollLock } from 'src/ui/kit/hooks/useDocumentScrollLock';
import { useVisualViewportFrame } from 'src/ui/kit/hooks/useVisualViewportFrame';
import type { SmallInputModalProps } from './SmallInputModal';

import styles from './small-input-modal-mobile.module.css';

/**
 * A bottom sheet. Its bottom edge follows --keyboard-inset, so it rests on
 * top of the phone keyboard with its actions in view, and the dimmed
 * backdrop still covers the screen behind a translucent keyboard.
 */
export function SmallInputModalMobile(props: SmallInputModalProps) {
	const {
		title,
		onClose,
		closeDisabled = false,
		closeOnEscape = true,
		closeLabel,
		actions,
		onSubmit,
		onKeyDown,
		surfaceRef,
		busy,
		children
	} = props;
	const titleId = useId();
	useDocumentScrollLock();
	useVisualViewportFrame();
	const backdrop = useRef<HTMLDivElement>(null);
	const layer = useHotkeyLayer('sheet', { elementRef: backdrop });
	useHotkey('Escape', onClose, {
		layer,
		enabled: closeOnEscape && !closeDisabled
	});

	const contents = (
		<>
			<header className={styles.header}>
				<h2 id={titleId}>{title}</h2>
				{closeLabel && (
					<button
						type="button"
						className={styles.close}
						aria-label={closeLabel}
						disabled={closeDisabled}
						onClick={onClose}
					>
						×
					</button>
				)}
			</header>
			<div className={styles.body}>
				<HotkeyScope layer={layer}>{children}</HotkeyScope>
			</div>
			{actions && <div className={styles.actions}>{actions}</div>}
		</>
	);

	return (
		<div ref={backdrop} className={styles.backdrop}>
			{onSubmit ? (
				<form
					ref={surfaceRef as React.Ref<HTMLFormElement>}
					className={styles.sheet}
					role="dialog"
					aria-modal="true"
					aria-labelledby={titleId}
					aria-busy={busy}
					onKeyDown={onKeyDown}
					onSubmit={(event) => {
						event.preventDefault();
						onSubmit();
					}}
				>
					{contents}
				</form>
			) : (
				<div
					ref={surfaceRef as React.Ref<HTMLDivElement>}
					className={styles.sheet}
					role="dialog"
					aria-modal="true"
					aria-labelledby={titleId}
					aria-busy={busy}
					onKeyDown={onKeyDown}
				>
					{contents}
				</div>
			)}
		</div>
	);
}
