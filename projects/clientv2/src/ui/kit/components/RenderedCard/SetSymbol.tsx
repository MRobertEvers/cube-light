import React, { useId } from 'react';
import setIcons from '../../../../assets/set-symbols/set-icons.json';
import spriteUrl from '../../../../assets/set-symbols/set-symbols.svg?url';

import styles from './rendered-card.module.css';

const ICONS: Record<string, string> = setIcons;

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
 * (tools/vendor-set-symbols.mjs), so it draws with no network. Sets the sprite does not
 * know show the generic symbol.
 */
export function SetSymbol(props: { setCode: string; rarity: string | null }) {
	const { setCode, rarity } = props;
	const gradient = `set-rarity-${useId().replace(/[^\w-]/g, '')}`;
	const icon = ICONS[setCode.toLowerCase()] ?? 'default';
	const known = rarity ? rarity.toLowerCase() : 'common';
	const stops = RARITY_STOPS[known] ?? RARITY_STOPS.common;
	return (
		<svg className={styles['set-symbol']} data-rarity={known} aria-hidden="true">
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
