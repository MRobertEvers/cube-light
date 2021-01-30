import React from 'react';
import { Link } from 'react-router-dom';
import { Logo } from '../Logo/Logo';
import { LogoIcon } from '../LogoIcon/LogoIcon';

import styles from './header.module.css';

export function Header() {
	return (
		<nav className={styles['header']}>
			<section className={styles['header-content']}>
				<Link to="/">
					<LogoIcon style={{ height: '44px' }} />
				</Link>
			</section>
		</nav>
	);
}
