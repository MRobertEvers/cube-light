import React, { useRef } from 'react';
import { HotkeyScope, useHotkeyLayer } from 'src/ui/kit/hotkeys/Hotkeys';
import { useDocumentScrollLock } from 'src/ui/kit/hooks/useDocumentScrollLock';
import { useVisualViewportFrame } from 'src/ui/kit/hooks/useVisualViewportFrame';
import styles from './modal.module.css';

export function Modal(
	props: React.PropsWithChildren<{
		wide?: boolean;
		extraWide?: boolean;
		fullScreenOnMobile?: boolean;
	}>
) {
	const { children, wide, extraWide, fullScreenOnMobile } = props;
	useDocumentScrollLock();
	useVisualViewportFrame();
	const container = useRef<HTMLDivElement>(null);
	const layer = useHotkeyLayer('dialog', { elementRef: container });

	return (
		<div
			ref={container}
			className={`${styles['modal-container']} ${fullScreenOnMobile ? styles['mobile-full-screen'] : ''}`}
		>
			<div
				className={`${styles['modal-container-contents']} ${wide ? styles['wide'] : ''} ${extraWide ? styles['extra-wide'] : ''}`}
			>
				<HotkeyScope layer={layer}>{children}</HotkeyScope>
			</div>
		</div>
	);
}
