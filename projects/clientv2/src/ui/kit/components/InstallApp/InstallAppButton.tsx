import React, { useEffect, useRef, useState } from 'react';
import { usePwaInstall } from './PwaInstallProvider';
import { useHotkey, useHotkeyLayer } from '../../hotkeys/Hotkeys';
import styles from './install-app.module.css';

export function InstallAppButton() {
	const { mode, prompt } = usePwaInstall();
	const [instructionsOpen, setInstructionsOpen] = useState(false);
	const closeButton = useRef<HTMLButtonElement>(null);

	useEffect(() => {
		if (!instructionsOpen) return;
		closeButton.current?.focus();
	}, [instructionsOpen]);
	const layer = useHotkeyLayer('popover', { enabled: instructionsOpen });
	useHotkey('Escape', () => setInstructionsOpen(false), {
		layer,
		enabled: instructionsOpen
	});

	if (!mode) return null;

	function install() {
		if (mode === 'native') {
			void prompt();
			return;
		}
		setInstructionsOpen(true);
	}

	return (
		<>
			<button
				type="button"
				className={styles.trigger}
				aria-label="Add Cube Light to your home screen"
				title="Add to home screen"
				onClick={install}
			>
				<InstallIcon />
			</button>
			{instructionsOpen && (
				<div
					className={styles.backdrop}
					role="presentation"
					onPointerDown={(event) => {
						if (event.target === event.currentTarget)
							setInstructionsOpen(false);
					}}
				>
					<section
						className={styles.dialog}
						role="dialog"
						aria-modal="true"
						aria-labelledby="install-app-title"
					>
						<div className={styles.dialogIcon} aria-hidden="true">
							<ShareIcon />
						</div>
						<h2 id="install-app-title">Add Cube Light</h2>
						<p>
							Open your browser’s Share menu, then choose
							<strong> Add to Home Screen</strong>.
						</p>
						<button
							ref={closeButton}
							type="button"
							className={styles.close}
							onClick={() => setInstructionsOpen(false)}
						>
							Got it
						</button>
					</section>
				</div>
			)}
		</>
	);
}

function InstallIcon() {
	return (
		<svg
			className={styles.icon}
			viewBox="0 0 24 24"
			aria-hidden="true"
		>
			<path d="M12 3v11m0 0 4-4m-4 4-4-4" />
			<path d="M5 15v4a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-4" />
		</svg>
	);
}

function ShareIcon() {
	return (
		<svg className={styles.shareIcon} viewBox="0 0 24 24">
			<path d="M12 16V3m0 0L8 7m4-4 4 4" />
			<path d="M7 10H5a2 2 0 0 0-2 2v7a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7a2 2 0 0 0-2-2h-2" />
		</svg>
	);
}
