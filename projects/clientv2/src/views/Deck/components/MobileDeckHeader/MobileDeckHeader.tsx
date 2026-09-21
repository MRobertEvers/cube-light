import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { LogoIcon } from '../../../../components/LogoIcon/LogoIcon';
import { BannerArtwork } from '../../../../components/BannerArtwork/BannerArtwork';
import { HeaderBackSlot } from '../../../../components/Header/HeaderBackSlot';
import { SiteNavLinks } from '../../../../components/Header/SiteNavLinks';
import type { BannerFrame } from '../../../../utils/banner-crop';
import { concatClassNames } from '../../../../utils/concat-class-names';
import { DeckControlIcon } from '../../DeckControlIcons';
import styles from './mobile-deck-header.module.css';

type Props = {
	backSlotRef: React.Ref<HTMLDivElement>;
	name: string;
	art: string | null;
	artFrame: BannerFrame;
	/** The deck's banner on the page; the bar becomes the deck's as it scrolls under. */
	banner: HTMLElement | null;
	isEditMode: boolean;
	onToggleEdit: () => void;
	isSaving: boolean;
	style?: React.CSSProperties;
};

/**
 * The phone deck page's sticky top bar. It starts as the site bar and, as the deck's
 * banner scrolls beneath it, turns into a compact banner for the deck with the site
 * links tucked into a menu and the deck's edit toggle within reach.
 */
export function MobileDeckHeader(props: Props) {
	const {
		backSlotRef,
		name,
		art,
		artFrame,
		banner,
		isEditMode,
		onToggleEdit,
		isSaving,
		style
	} = props;
	const bar = useRef<HTMLElement>(null);
	const collapsed = useBannerCollapse(bar, banner);
	const [menuOpen, setMenuOpen] = useState(false);
	const menu = useRef<HTMLDivElement>(null);

	useEffect(() => {
		if (!collapsed) setMenuOpen(false);
	}, [collapsed]);

	useEffect(() => {
		if (!menuOpen) return;
		const onPointerDown = (event: PointerEvent) => {
			if (!menu.current?.contains(event.target as Node))
				setMenuOpen(false);
		};
		const onKeyDown = (event: KeyboardEvent) => {
			if (event.key === 'Escape') setMenuOpen(false);
		};
		window.addEventListener('pointerdown', onPointerDown);
		window.addEventListener('keydown', onKeyDown);
		return () => {
			window.removeEventListener('pointerdown', onPointerDown);
			window.removeEventListener('keydown', onKeyDown);
		};
	}, [menuOpen]);

	return (
		<nav ref={bar} className={styles.header} style={style}>
			<HeaderBackSlot ref={backSlotRef} />
			<div className={styles.stage}>
				<div className={styles.site} inert={collapsed}>
					<Link className={styles.brand} to="/">
						<LogoIcon className={styles.brandIcon} />
						<span>Cube Light</span>
					</Link>
					<div className={styles.navigation}>
						<SiteNavLinks />
					</div>
				</div>
				<div className={styles.deck} inert={!collapsed}>
					<div className={styles.art}>
						<BannerArtwork src={art} frame={artFrame} />
					</div>
					<div className={styles.titles}>
						<span className={styles.name}>{name}</span>
						{isEditMode && (
							<span className={styles.mode}>Editing</span>
						)}
					</div>
				</div>
			</div>
			<div ref={menu} className={styles.menu} inert={!collapsed}>
				<button
					type="button"
					className={concatClassNames(
						styles.editToggle,
						isEditMode ? styles.editing : undefined
					)}
					aria-pressed={isEditMode}
					aria-controls="deck-edit-panel"
					onClick={onToggleEdit}
					disabled={isSaving}
				>
					<DeckControlIcon
						name={isEditMode ? 'check' : 'pencil'}
						size={16}
					/>
					{isEditMode ? 'Done' : 'Edit'}
				</button>
				<button
					type="button"
					className={styles.menuButton}
					aria-label="Site menu"
					aria-expanded={menuOpen}
					aria-controls="mobile-deck-header-menu"
					onClick={() => setMenuOpen((open) => !open)}
				>
					<span className={styles.menuIcon} aria-hidden="true" />
				</button>
				{menuOpen && (
					<div
						id="mobile-deck-header-menu"
						className={styles.menuPanel}
					>
						<SiteNavLinks onNavigate={() => setMenuOpen(false)} />
					</div>
				)}
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
		if (!element) return;
		let frame = 0;
		const measure = () => {
			frame = 0;
			let progress = 0;
			if (banner) {
				const rect = banner.getBoundingClientRect();
				const barBottom = element.getBoundingClientRect().bottom;
				progress = rect.height
					? Math.min(
							1,
							Math.max(0, (barBottom - rect.top) / rect.height)
						)
					: 0;
			}
			element.style.setProperty('--collapse', progress.toFixed(3));
			setCollapsed(progress > 0.5);
		};
		const schedule = () => {
			if (!frame) frame = requestAnimationFrame(measure);
		};
		measure();
		window.addEventListener('scroll', schedule, { passive: true });
		window.addEventListener('resize', schedule);
		return () => {
			cancelAnimationFrame(frame);
			window.removeEventListener('scroll', schedule);
			window.removeEventListener('resize', schedule);
		};
	}, [bar, banner]);

	return collapsed;
}
