import React from 'react';
import { Link } from 'react-router-dom';

/** The site's top-level destinations, styled by whichever bar or menu holds them. */
export function SiteNavLinks(props: { onNavigate?: () => void }) {
	const { onNavigate } = props;

	return (
		<>
			<Link to="/" onClick={onNavigate}>
				Decks
			</Link>
			<Link to="/collection" onClick={onNavigate}>
				Collection
			</Link>
		</>
	);
}
