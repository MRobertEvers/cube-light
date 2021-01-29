import styles from './modal.module.css';

export function Modal(props: React.PropsWithChildren<{}>) {
	const { children } = props;
	return (
		<div className={styles['modal-container']}>
			<div className={styles['modal-container-contents']}>{children}</div>
		</div>
	);
}
