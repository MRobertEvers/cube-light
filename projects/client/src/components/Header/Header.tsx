import Link from 'next/link';

import styles from './header.module.css';

export function Header() {
	return (
		<nav className={styles['header']}>
			<section className={styles['header-content']}>
				<Link href="/">
					<a>
						<h2 style={{ margin: 0 }}>CubeLite</h2>
					</a>
				</Link>
			</section>
		</nav>
	);
}
