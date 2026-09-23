import React from 'react';
import { useDocumentScrollLock } from 'src/ui/kit/hooks/useDocumentScrollLock';
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

	return (
		<div
			className={`${styles['modal-container']} ${fullScreenOnMobile ? styles['mobile-full-screen'] : ''}`}
		>
			<div
				className={`${styles['modal-container-contents']} ${wide ? styles['wide'] : ''} ${extraWide ? styles['extra-wide'] : ''}`}
			>
				{children}
			</div>
		</div>
	);
}
