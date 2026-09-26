import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../Auth/AuthGate';
import { UserBop } from '../UserBop/UserBop';
import { useHotkey, useHotkeyLayer } from '../../hotkeys/Hotkeys';
import { useAppSelector } from '../../../../redux/use-app-selector';
import { selectOfflineDataNeedsUpdate } from '../../../../redux/offline-data/offline-data.selectors';
import styles from './account-menu.module.css';

export function AccountMenu() {
	const { user, signOut } = useAuth();
	const [open, setOpen] = useState(false);
	// Installed offline data the server has a newer build of: updated from Profile.
	const update = useAppSelector(selectOfflineDataNeedsUpdate);
	const menu = useRef<HTMLDivElement>(null);

	useEffect(() => {
		if (!open) return;
		function closeOnPointer(event: PointerEvent) {
			if (!menu.current?.contains(event.target as Node)) setOpen(false);
		}
		window.addEventListener('pointerdown', closeOnPointer);
		return function () {
			window.removeEventListener('pointerdown', closeOnPointer);
		};
	}, [open]);
	const layer = useHotkeyLayer('menu', { elementRef: menu, enabled: open });
	useHotkey('Escape', () => setOpen(false), { layer, enabled: open });

	return (
		<div className={styles.menu} ref={menu}>
			<button
				type="button"
				className={styles.trigger}
				aria-label={update ? `User menu for ${user.username}, offline data update available` : `User menu for ${user.username}`}
				aria-expanded={open}
				aria-controls="account-menu"
				onClick={() => setOpen((current) => !current)}
			>
				<UserBop profile={user.profile} />
				{update && <span className={styles.badge} aria-hidden="true" />}
			</button>
			{open && (
				<div id="account-menu" className={styles.panel}>
					<p>{user.username}</p>
					<Link to="/profile" onClick={() => setOpen(false)}>
						Profile
						{update && <span className={styles.note}>Offline data update available</span>}
					</Link>
					<button
						type="button"
						onClick={() => {
							setOpen(false);
							void signOut();
						}}
					>
						Sign out
					</button>
				</div>
			)}
		</div>
	);
}
