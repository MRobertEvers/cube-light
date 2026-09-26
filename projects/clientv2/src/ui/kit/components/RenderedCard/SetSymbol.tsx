import React, { type CSSProperties, useId } from 'react';
import setIcons from '../../../../assets/set-symbols/set-icons.json';
import setSymbolSizes from '../../../../assets/set-symbols/set-symbol-sizes.json';
import spriteUrl from '../../../../assets/set-symbols/set-symbols.svg?url';

import styles from './rendered-card.module.css';

const ICONS: Record<string, string> = setIcons;
const SIZES: Record<string, number[]> = setSymbolSizes;

// The set symbol's place on an M15 card, in its 1500-wide units: as tall as 86, at most 180 wide.
const MAX_WIDTH = 180;
const MAX_HEIGHT = 86;

/** The symbol's width and height on the card: as large as fits its place, keeping its shape. */
function fitted(icon: string): [number, number] {
	const size = SIZES[icon];
	if (!size) return [MAX_HEIGHT, MAX_HEIGHT];
	const scale = Math.min(MAX_WIDTH / size[0], MAX_HEIGHT / size[1]);
	return [size[0] * scale, size[1] * scale];
}

/** Each rarity's symbol colors, top to bottom, as printed. */
const RARITY_STOPS: Record<string, [string, string]> = {
	common: ['#1a1718', '#1a1718'],
	uncommon: ['#e3eef4', '#6f8594'],
	rare: ['#f2dca0', '#a3812d'],
	mythic: ['#f7a336', '#bd3a18'],
	special: ['#c8a7e6', '#5c2f86'],
	bonus: ['#c8a7e6', '#5c2f86']
};

/**
 * A set's expansion symbol in its rarity's colors, from the vendored sprite
 * (tools/vendor-set-symbols.mjs), so it draws with no network, sized to fit its place on
 * the card as printed. Sets the sprite does not know show the generic symbol.
 */
export function SetSymbol(props: { setCode: string; rarity: string | null }) {
	const { setCode, rarity } = props;
	const gradient = `set-rarity-${useId().replace(/[^\w-]/g, '')}`;
	const icon = ICONS[setCode.toLowerCase()] ?? 'default';
	const known = rarity ? rarity.toLowerCase() : 'common';
	const stops = RARITY_STOPS[known] ?? RARITY_STOPS.common;
	const size = fitted(icon);
	return (
		<svg className={styles['set-symbol']} style={{ '--symbol-width': size[0], '--symbol-height': size[1] } as CSSProperties} data-rarity={known} aria-hidden="true">
			<defs>
				<linearGradient id={gradient} x1="0" y1="0" x2="0" y2="1">
					<stop offset="0" stopColor={stops[0]} />
					<stop offset="1" stopColor={stops[1]} />
				</linearGradient>
			</defs>
			<use href={`${spriteUrl}#${icon}`} width="100%" height="100%" fill={`url(#${gradient})`} />
		</svg>
	);
}
