import React from 'react';
import { createPortal } from 'react-dom';
import { Link } from 'react-router-dom';
import { useHeaderBackSlot } from '../Header/HeaderBackSlot';
import { BackIcon } from './BackIcon';

import styles from './back-link.module.css';

type BackLinkProps = React.PropsWithChildren<{
	to: string;
	className?: string;
}>;

/**
 * A page's way back to its parent route. Renders as an inline text link, and on phones
 * moves into the top bar's back slot as an icon button instead.
 */
export function BackLink(props: BackLinkProps) {
	const { to, className, children } = props;
	const slot = useHeaderBackSlot();

	return (
		<>
			<Link
				className={`${styles['link']} ${slot ? styles['has-slot'] : ''} ${className ?? ''}`}
				to={to}
			>
				<BackIcon size={16} />
				<span>{children}</span>
			</Link>
			{slot &&
				createPortal(
					<Link className={styles['header-back']} to={to}>
						<BackIcon size={22} />
						<span className={styles['visually-hidden']}>
							{children}
						</span>
					</Link>,
					slot
				)}
		</>
	);
}

/**
 * A back step within one view, like a dialog's second pane, that isn't a route. Only
 * exists on phones, in the top bar's back slot; render it only while it applies.
 */
export function HeaderBackButton(props: {
	label: string;
	onClick: () => void;
	/** Renders inside an existing HeaderBackSlot instead of portaling to context. */
	inline?: boolean;
}) {
	const { label, onClick, inline = false } = props;
	const slot = useHeaderBackSlot();
	const button = (
		<button
			type="button"
			className={styles['header-back']}
			aria-label={label}
			onClick={onClick}
		>
			<BackIcon size={22} />
		</button>
	);

	return inline ? button : slot && createPortal(button, slot);
}
