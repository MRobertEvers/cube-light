import React from 'react';
import styles from './modal.module.css';

export function Modal(props: React.PropsWithChildren<{ wide?: boolean }>) {
	const { children, wide } = props;
	return (
		<div className={styles['modal-container']}>
			<div className={`${styles['modal-container-contents']} ${wide ? styles['wide'] : ''}`}>{children}</div>
		</div>
	);
}
