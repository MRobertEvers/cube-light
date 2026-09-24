import React, { useEffect, useRef, useState } from 'react';
import { SiteNavLinks } from './SiteNavLinks';
import { useHotkey, useHotkeyLayer } from '../../hotkeys/Hotkeys';
import styles from './site-menu.module.css';

type Props = {
	/** The page's own controls, listed above the site links. */
	items?: React.ReactNode;
};

/**
 * The site links folded into a hamburger, for bars too narrow to list them. Choosing
 * any link or button in the panel closes it.
 */
export function SiteMenu(props: Props) {
	const { items } = props;
	const [menuOpen, setMenuOpen] = useState(false);
	const menu = useRef<HTMLDivElement>(null);

	useEffect(() => {
		if (!menuOpen) return;
		function onPointerDown(event: PointerEvent) {
			if (!menu.current?.contains(event.target as Node))
				setMenuOpen(false);
		}
		window.addEventListener('pointerdown', onPointerDown);
		return function () {
			window.removeEventListener('pointerdown', onPointerDown);
		};
	}, [menuOpen]);
	const layer = useHotkeyLayer('menu', {
		elementRef: menu,
		enabled: menuOpen
	});
	useHotkey('Escape', () => setMenuOpen(false), {
		layer,
		enabled: menuOpen
	});

	return (
		<div ref={menu} className={styles.menu}>
			<button
				type="button"
				className={styles.menuButton}
				aria-label="Site menu"
				aria-expanded={menuOpen}
				aria-controls="site-menu"
				onClick={() => setMenuOpen((open) => !open)}
			>
				<span className={styles.menuIcon} aria-hidden="true" />
			</button>
			{menuOpen && (
				<div id="site-menu" className={styles.menuPanel}>
					{items && (
						<div
							className={styles.pageItems}
							onClick={(event) => {
								if ((event.target as Element).closest('a, button'))
									setMenuOpen(false);
							}}
						>
							{items}
						</div>
					)}
					<SiteNavLinks onNavigate={() => setMenuOpen(false)} />
				</div>
			)}
		</div>
	);
}
