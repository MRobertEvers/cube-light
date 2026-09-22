import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../Auth/AuthGate';
import { UserBop } from '../UserBop/UserBop';
import styles from './account-menu.module.css';

export function AccountMenu() {
	const { user, signOut } = useAuth();
	const [open, setOpen] = useState(false);
	const menu = useRef<HTMLDivElement>(null);

	useEffect(() => {
		if (!open) return;
		function closeOnPointer(event: PointerEvent) {
			if (!menu.current?.contains(event.target as Node)) setOpen(false);
		}
		function closeOnEscape(event: KeyboardEvent) {
			if (event.key === 'Escape') setOpen(false);
		}
		window.addEventListener('pointerdown', closeOnPointer);
		window.addEventListener('keydown', closeOnEscape);
		return function () {
			window.removeEventListener('pointerdown', closeOnPointer);
			window.removeEventListener('keydown', closeOnEscape);
		};
	}, [open]);

	return (
		<div className={styles.menu} ref={menu}>
			<button
				type="button"
				className={styles.trigger}
				aria-label={`User menu for ${user.username}`}
				aria-expanded={open}
				aria-controls="account-menu"
				onClick={() => setOpen((current) => !current)}
			>
				<UserBop profile={user.profile} />
			</button>
			{open && (
				<div id="account-menu" className={styles.panel}>
					<p>{user.username}</p>
					<Link to="/profile" onClick={() => setOpen(false)}>
						Profile
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
