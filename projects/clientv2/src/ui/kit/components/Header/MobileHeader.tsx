import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { LogoIcon } from '../LogoIcon/LogoIcon';
import { BannerArtwork } from '../BannerArtwork/BannerArtwork';
import { HeaderBackSlot } from './HeaderBackSlot';
import { SiteMenu } from './SiteMenu';
import { AccountMenu } from './AccountMenu';
import { InstallAppButton } from '../InstallApp/InstallAppButton';
import type { BannerFrame } from '../../../../domain/appearance/banner-crop';
import type { ArtworkInfo } from '../../../../domain/appearance/artwork';
import styles from './mobile-header.module.css';

/** A page's own identity the phone bar turns into as the page's banner scrolls under. */
export type HeaderBannerIdentity = {
	name: string;
	art: string | null;
	/** The server-measured sidecar of `art`: placed and previewed before it loads. */
	artInfo?: ArtworkInfo | null;
	artFrame: BannerFrame;
	/** The page's banner element; null until it mounts. */
	banner: HTMLElement | null;
};

type Props = {
	backSlotRef?: React.Ref<HTMLDivElement>;
	identity?: HeaderBannerIdentity;
	style?: React.CSSProperties;
	/** The page's own controls, listed above the site links in the hamburger. */
	menuItems?: React.ReactNode;
};

/**
 * The phone top bar: brand, the site links in a hamburger, install and account. Page
 * controls fold into the hamburger too, so the bar stays one row. Given a banner identity, the bar sticks and cross-fades
 * from the brand to that identity as the banner scrolls beneath it.
 */
export function MobileHeader(props: Props) {
	const { backSlotRef, identity, style, menuItems } = props;
	const bar = useRef<HTMLElement>(null);
	const collapsed = useBannerCollapse(bar, identity ? identity.banner : null);

	return (
		<nav
			ref={bar}
			className={
				identity ? `${styles.header} ${styles.sticky}` : styles.header
			}
			style={style}
		>
			<div className={styles.bar}>
				<HeaderBackSlot ref={backSlotRef} />
				<div className={styles.stage}>
					<div className={styles.site} inert={collapsed}>
						<Link
							className={styles.brand}
							to="/"
							aria-label="Cube Light home"
						>
							<LogoIcon className={styles.brandIcon} />
							<span>Cube Light</span>
						</Link>
					</div>
					{identity && (
						<div className={styles.identity} inert={!collapsed}>
							<div className={styles.art}>
								<BannerArtwork
									src={identity.art}
									artwork={identity.artInfo}
									frame={identity.artFrame}
								/>
							</div>
							<div className={styles.titles}>
								<span className={styles.name}>
									{identity.name}
								</span>
							</div>
						</div>
					)}
				</div>
				<SiteMenu items={menuItems} />
				<InstallAppButton />
				<AccountMenu />
			</div>
		</nav>
	);
}

/**
 * Tracks how far the banner has slid under the bar as `--collapse` (0 to 1) on the
 * bar, written straight to the element so scrolling does not re-render. Returns
 * whether the bar has passed halfway, which decides which half takes input.
 */
function useBannerCollapse(
	bar: React.RefObject<HTMLElement | null>,
	banner: HTMLElement | null
) {
	const [collapsed, setCollapsed] = useState(false);

	useEffect(() => {
		const element = bar.current;
		if (!element || !banner) return;
		const measuredElement = element;
		const measuredBanner = banner;
		let frame = 0;
		function measure() {
			frame = 0;
			const rect = measuredBanner.getBoundingClientRect();
			const barBottom = measuredElement.getBoundingClientRect().bottom;
			const progress = rect.height
				? Math.min(1, Math.max(0, (barBottom - rect.top) / rect.height))
				: 0;
			measuredElement.style.setProperty(
				'--collapse',
				progress.toFixed(3)
			);
			setCollapsed(progress > 0.5);
		}
		function schedule() {
			if (!frame) frame = requestAnimationFrame(measure);
		}
		measure();
		window.addEventListener('scroll', schedule, { passive: true });
		window.addEventListener('resize', schedule);
		return function () {
			cancelAnimationFrame(frame);
			window.removeEventListener('scroll', schedule);
			window.removeEventListener('resize', schedule);
			measuredElement.style.removeProperty('--collapse');
		};
	}, [bar, banner]);

	return collapsed;
}
