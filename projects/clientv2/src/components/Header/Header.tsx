import React from 'react';
import { Link } from 'react-router-dom';
import styles from './header.module.css';

export function Header() {
	return (
		<nav className={styles['header']}>
			<section className={styles['header-content']}>
				<Link to="/">
					<h2 style={{ margin: 0 }}>CubeLite</h2>
				</Link>
			</section>
		</nav>
	);
}
