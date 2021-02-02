import React from 'react';
import { Link } from 'react-router-dom';
import { Logo } from '../Logo/Logo';
import { LogoIcon } from '../LogoIcon/LogoIcon';

import styles from './header.module.css';

export type HeaderProps = React.PropsWithChildren<{}>;

export function Header(props: HeaderProps) {
	const { children } = props;

	return (
		<nav className={styles['header']}>
			<section className={styles['header-content']}>
				<Link to="/">
					<LogoIcon style={{ height: '44px' }} />
				</Link>
				{children}
			</section>
		</nav>
	);
}
