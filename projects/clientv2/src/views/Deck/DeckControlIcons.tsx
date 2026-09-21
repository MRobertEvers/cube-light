import React from 'react';

const PATHS = {
	chevron: <path d="M6 9l6 6 6-6" />,
	pencil: <path d="M4 20h4L19 9l-4-4L4 16Z" />,
	check: <path d="M5 12.5l4.5 4.5L19 7" />,
	search: (
		<>
			<circle cx="11" cy="11" r="7" />
			<path d="M20 20l-4-4" />
		</>
	),
	list: (
		<>
			<path d="M9 6h12M9 12h12M9 18h12" />
			<path d="M4 6h.01M4 12h.01M4 18h.01" />
		</>
	),
	camera: (
		<>
			<path d="M3 8h4l2-3h6l2 3h4v11H3Z" />
			<circle cx="12" cy="13" r="3.5" />
		</>
	)
};

export function DeckControlIcon(props: {
	name: keyof typeof PATHS;
	size?: number;
	className?: string;
}) {
	const { name, size = 18, className } = props;
	return (
		<svg
			className={className}
			width={size}
			height={size}
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			strokeWidth={2}
			strokeLinecap="round"
			strokeLinejoin="round"
			aria-hidden="true"
		>
			{PATHS[name]}
		</svg>
	);
}
