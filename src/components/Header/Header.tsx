import styles from './header.module.css';

export function Header() {
	return (
		<nav className={styles['header']}>
			<section className={styles['header-content']}>Click</section>
		</nav>
	);
}
