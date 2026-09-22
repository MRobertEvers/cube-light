import React from 'react';
import { Link } from 'react-router-dom';
import { useWorkCounts } from 'src/utils/work-status';

import styles from './site-nav-links.module.css';

/** The site's top-level destinations, styled by whichever bar or menu holds them. */
export function SiteNavLinks(props: { onNavigate?: () => void }) {
	const { onNavigate } = props;
	const work = useWorkCounts();

	return (
		<>
			<Link to="/" onClick={onNavigate}>
				Decks
			</Link>
			<Link to="/collection" onClick={onNavigate}>
				Collection
			</Link>
			{/* Only there while something is queued; the page itself is always at /queue. */}
			{work.total > 0 && (
				<Link
					to="/queue"
					onClick={onNavigate}
					className={styles.queue}
					aria-label={
						work.open > 0
							? `Queue, ${work.open} open item${work.open === 1 ? '' : 's'}`
							: 'Queue'
					}
				>
					Queue
					{work.open > 0 && (
						<span className={styles.badge} aria-hidden="true">
							{work.open}
						</span>
					)}
				</Link>
			)}
		</>
	);
}
