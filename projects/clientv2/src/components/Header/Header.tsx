import React from 'react';
import { Link } from 'react-router-dom';
import { LogoIcon } from '../LogoIcon/LogoIcon';
import { HeaderBackSlot } from './HeaderBackSlot';
import { SiteNavLinks } from './SiteNavLinks';

import styles from './header.module.css';

export type HeaderProps = React.PropsWithChildren<{
	/** Receives the phone-only back button slot that BackLink portals into. */
	backSlotRef?: React.Ref<HTMLDivElement>;
}>;

export function Header(props: HeaderProps) {
	const { children, backSlotRef } = props;

	return (
		<nav className={styles['header']}>
			<section className={styles['header-content']}>
				<HeaderBackSlot ref={backSlotRef} />
				<Link className={styles['brand']} to="/">
					<LogoIcon className={styles['brand-icon']} />
					<span>Cube Light</span>
				</Link>
				<div className={styles['navigation']}>
					<SiteNavLinks />
				</div>
				<div className={styles['actions']}>{children}</div>
			</section>
		</nav>
	);
}
