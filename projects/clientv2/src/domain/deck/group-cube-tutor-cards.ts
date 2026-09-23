import type { DeckCardEntry } from '../models/deck';
import { primaryType, TYPE_ORDER } from './stats';
import {
	type DeckCardGroup,
	groupDeckCardsByName,
	manaValue
} from './group-deck-cards';

const COLORS = ['W', 'U', 'B', 'R', 'G'] as const;
type Color = (typeof COLORS)[number];

/** Which column a card is filed in, CubeTutor style. */
export type CubeTutorColumnKey =
	| Color
	| 'multicolor'
	| 'colorless'
	| 'land';

export type CubeTutorSection = {
	label: string;
	count: number;
	/** By mana value, then name. */
	groups: DeckCardGroup[];
};

export type CubeTutorColumn = {
	key: CubeTutorColumnKey;
	label: string;
	count: number;
	sections: CubeTutorSection[];
};

const COLUMNS: { key: CubeTutorColumnKey; label: string }[] = [
	{ key: 'W', label: 'White' },
	{ key: 'U', label: 'Blue' },
	{ key: 'B', label: 'Black' },
	{ key: 'R', label: 'Red' },
	{ key: 'G', label: 'Green' },
	{ key: 'multicolor', label: 'Multicolor' },
	{ key: 'colorless', label: 'Colorless' },
	{ key: 'land', label: 'Lands' }
];

/** Every color combination by name, keyed in WUBRG order, in the order sections are shown. */
const COMBINATION_NAMES: [string, string][] = [
	['W', 'White'],
	['U', 'Blue'],
	['B', 'Black'],
	['R', 'Red'],
	['G', 'Green'],
	['WU', 'Azorius'],
	['UB', 'Dimir'],
	['BR', 'Rakdos'],
	['RG', 'Gruul'],
	['WG', 'Selesnya'],
	['WB', 'Orzhov'],
	['UR', 'Izzet'],
	['BG', 'Golgari'],
	['WR', 'Boros'],
	['UG', 'Simic'],
	['WUB', 'Esper'],
	['UBR', 'Grixis'],
	['BRG', 'Jund'],
	['WRG', 'Naya'],
	['WUG', 'Bant'],
	['WBG', 'Abzan'],
	['WUR', 'Jeskai'],
	['UBG', 'Sultai'],
	['WBR', 'Mardu'],
	['URG', 'Temur'],
	['UBRG', 'Non-white'],
	['WBRG', 'Non-blue'],
	['WURG', 'Non-black'],
	['WUBG', 'Non-red'],
	['WUBR', 'Non-green'],
	['WUBRG', 'Five-color']
];
const COMBINATION_ORDER = COMBINATION_NAMES.map((entry) => entry[1]);
const COMBINATION_BY_KEY = new Map(COMBINATION_NAMES);

const ANY_COLOR = 'Any color';
const COLORLESS = 'Colorless';

const BASIC_LAND_COLORS: Record<string, Color> = {
	Plains: 'W',
	Island: 'U',
	Swamp: 'B',
	Mountain: 'R',
	Forest: 'G'
};

/** The colors of every mana symbol in `text`; each half of a hybrid symbol counts. */
function symbolColors(text: string | undefined): Set<Color> {
	const colors = new Set<Color>();
	for (const match of (text ?? '').matchAll(/\{([^}]+)\}/g))
		for (const symbol of match[1].split('/'))
			if ((COLORS as readonly string[]).includes(symbol))
				colors.add(symbol as Color);
	return colors;
}

function combinationName(colors: Set<Color>): string | null {
	const key = COLORS.filter((color) => colors.has(color)).join('');
	return COMBINATION_BY_KEY.get(key) ?? null;
}

/** The colors a land makes or fetches: its mana symbols and basic land types. */
function landColors(card: DeckCardEntry): Set<Color> {
	const colors = symbolColors(card.text);
	const words = `${card.subtypes ?? ''} ${card.text ?? ''}`;
	for (const [type, color] of Object.entries(BASIC_LAND_COLORS))
		if (new RegExp(`\\b${type}\\b`).test(words)) colors.add(color);
	return colors;
}

/** Column and section for one card: spells by the colors of their cost, lands and colorless cards by the colors they produce. */
function place(card: DeckCardEntry): {
	column: CubeTutorColumnKey;
	section: string;
} {
	const type = primaryType(card);
	const costColors = symbolColors(card.manaCost);
	if (type === 'Land' && costColors.size === 0) {
		const colors = landColors(card);
		if (colors.size > 0)
			return { column: 'land', section: combinationName(colors)! };
		return {
			column: 'land',
			section: /mana of any (one )?color/i.test(card.text ?? '')
				? ANY_COLOR
				: COLORLESS
		};
	}
	if (costColors.size === 1)
		return { column: [...costColors][0], section: type };
	if (costColors.size > 1)
		return { column: 'multicolor', section: combinationName(costColors)! };
	const produced = symbolColors(card.text);
	return {
		column: 'colorless',
		section: produced.size > 0 ? combinationName(produced)! : type
	};
}

/** Types first, then color combinations, then any-color and colorless lands. */
function sectionRank(label: string): number {
	const type = TYPE_ORDER.indexOf(label);
	if (type >= 0) return type;
	const combination = COMBINATION_ORDER.indexOf(label);
	if (combination >= 0) return TYPE_ORDER.length + combination;
	return (
		TYPE_ORDER.length +
		COMBINATION_ORDER.length +
		(label === ANY_COLOR ? 0 : 1)
	);
}

function compareByManaValue(a: DeckCardGroup, b: DeckCardGroup): number {
	return (
		manaValue(a.printings[0].manaCost) -
			manaValue(b.printings[0].manaCost) || a.name.localeCompare(b.name)
	);
}

function total(groups: readonly { count: number }[]): number {
	return groups.reduce((sum, group) => sum + group.count, 0);
}

/**
 * Files cards the way CubeTutor shows a cube: a column per color, then
 * multicolor, colorless and lands. Mono-colored columns are split by card type,
 * the rest by color combination. Empty columns are left out.
 */
export function groupCubeTutorCards(
	cards: readonly DeckCardEntry[]
): CubeTutorColumn[] {
	const placed = new Map<CubeTutorColumnKey, Map<string, DeckCardGroup[]>>();
	for (const group of groupDeckCardsByName(
		cards.filter((card) => card.count > 0)
	)) {
		const { column, section } = place(group.printings[0]);
		const sections = placed.get(column) ?? new Map();
		placed.set(column, sections);
		sections.set(section, [...(sections.get(section) ?? []), group]);
	}
	return COLUMNS.flatMap(({ key, label }) => {
		const sections = placed.get(key);
		if (!sections) return [];
		const sorted = [...sections.entries()]
			.sort((a, b) => sectionRank(a[0]) - sectionRank(b[0]))
			.map(([section, groups]) => ({
				label: section,
				count: total(groups),
				groups: groups.sort(compareByManaValue)
			}));
		return [{ key, label, count: total(sorted), sections: sorted }];
	});
}
