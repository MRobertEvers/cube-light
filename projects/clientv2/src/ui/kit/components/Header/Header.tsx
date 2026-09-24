import React from 'react';
import { Link } from 'react-router-dom';
import { LogoIcon } from '../LogoIcon/LogoIcon';
import { HeaderBackSlot } from './HeaderBackSlot';
import { SiteNavLinks } from './SiteNavLinks';
import { AccountMenu } from './AccountMenu';
import { MobileHeader, HeaderBannerIdentity } from './MobileHeader';
import { InstallAppButton } from '../InstallApp/InstallAppButton';
import { useIsPhoneLayout } from '../../hooks/useIsPhoneLayout';

import styles from './header.module.css';

/**
 * A page's own controls, placed per layout: inline in the desktop bar, or at the top of
 * the phone's hamburger. Pages give each layout the form that suits it, such as a
 * dropdown on desktop and its items listed flat on phones.
 */
export type HeaderChrome = {
	desktop?: React.ReactNode;
	mobile?: React.ReactNode;
};

export type HeaderProps = {
	chrome?: HeaderChrome;
	/** Receives the phone-only back button slot that BackLink portals into. */
	backSlotRef?: React.Ref<HTMLDivElement>;
	/** On phones, what the bar becomes as the page's banner scrolls under it. */
	identity?: HeaderBannerIdentity;
	style?: React.CSSProperties;
};

/** The site's top bar: links inline on wider screens, in a hamburger on phones. */
export function Header(props: HeaderProps) {
	const { chrome, backSlotRef, identity, style } = props;
	const isPhone = useIsPhoneLayout();

	if (isPhone)
		return (
			<MobileHeader
				backSlotRef={backSlotRef}
				identity={identity}
				style={style}
				menuItems={chrome?.mobile}
			/>
		);

	return (
		<nav className={styles['header']} style={style}>
			<section className={styles['header-content']}>
				<HeaderBackSlot ref={backSlotRef} />
				<Link
					className={styles['brand']}
					to="/"
					aria-label="Cube Light home"
				>
					<LogoIcon className={styles['brand-icon']} />
					<span>Cube Light</span>
				</Link>
				<div className={styles['navigation']}>
					<SiteNavLinks />
				</div>
				<div className={styles['actions']}>{chrome?.desktop}</div>
				<div className={styles['account']}>
					<InstallAppButton />
					<AccountMenu />
				</div>
			</section>
		</nav>
	);
}
