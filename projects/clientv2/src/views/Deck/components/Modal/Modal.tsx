import React from 'react';
import styles from './modal.module.css';

export function Modal(props: React.PropsWithChildren<{ wide?: boolean; fullScreenOnMobile?: boolean }>) {
	const { children, wide, fullScreenOnMobile } = props;
	return (
		<div className={`${styles['modal-container']} ${fullScreenOnMobile ? styles['mobile-full-screen'] : ''}`}>
			<div className={`${styles['modal-container-contents']} ${wide ? styles['wide'] : ''}`}>{children}</div>
		</div>
	);
}
