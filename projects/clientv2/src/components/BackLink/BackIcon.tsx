import React from 'react';

/** Left chevron shared by every back control, so they all read the same. */
export function BackIcon(props: { size?: number }) {
	const { size = 20 } = props;
	return (
		<svg viewBox="0 0 16 16" width={size} height={size} aria-hidden="true">
			<path
				d="M10 3.5L5.5 8l4.5 4.5"
				fill="none"
				stroke="currentColor"
				strokeWidth="1.8"
				strokeLinecap="round"
				strokeLinejoin="round"
			/>
		</svg>
	);
}
