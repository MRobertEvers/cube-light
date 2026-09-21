import React from 'react';
import { Link } from 'react-router-dom';
import { LogoIcon } from '../LogoIcon/LogoIcon';

import styles from './header.module.css';

export type HeaderProps = React.PropsWithChildren<{}>;

export function Header(props: HeaderProps) {
	const { children } = props;

	return (
		<nav className={styles['header']}>
			<section className={styles['header-content']}>
				<Link className={styles['brand']} to="/">
					<LogoIcon className={styles['brand-icon']} />
					<span>Cube Light</span>
				</Link>
				<div className={styles['navigation']}>
					<Link to="/">Decks</Link>
					<Link to="/collection">Collection</Link>
				</div>
				<div className={styles['actions']}>{children}</div>
			</section>
		</nav>
	);
}
