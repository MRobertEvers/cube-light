import type { DeckCardEntry } from '../models/deck';
import { manaValue } from './group-deck-cards';

export const MANA_COLORS = ['W', 'U', 'B', 'R', 'G', 'C'] as const;
export type ManaColor = (typeof MANA_COLORS)[number];

export type CurveBucket = {
	label: string;
	creatures: number;
	nonCreatures: number;
};

export type TypeBreakdown = {
	type: string;
	count: number;
	/** Most copies first. */
	subtypes: { name: string; count: number }[];
};

export type DeckStats = {
	creatures: number;
	nonCreatures: number;
	lands: number;
	curve: CurveBucket[];
	/** Mana value per nonland copy; null when there are none. */
	averageManaValue: number | null;
	pips: Record<ManaColor, number>;
	totalPips: number;
	types: TypeBreakdown[];
};

/** A card is filed under the first of its types listed here, so an Artifact Creature counts as a Creature. */
const TYPE_PRECEDENCE = [
	'Creature',
	'Land',
	'Planeswalker',
	'Battle',
	'Instant',
	'Sorcery',
	'Artifact',
	'Enchantment',
	'Kindred',
	'Tribal'
];
export const TYPE_ORDER = [
	'Creature',
	'Planeswalker',
	'Battle',
	'Instant',
	'Sorcery',
	'Artifact',
	'Enchantment',
	'Kindred',
	'Tribal',
	'Land',
	'Other'
];

function listOf(value: string | undefined): string[] {
	return (value ?? '')
		.split(',')
		.map((part) => part.trim())
		.filter(Boolean);
}

export function primaryType(card: DeckCardEntry): string {
	const types = listOf(card.types);
	return TYPE_PRECEDENCE.find((type) => types.includes(type)) ?? 'Other';
}

/** Each colored half of a hybrid symbol is a pip of that color; generic and variable mana are not pips. */
function addPips(
	pips: Record<ManaColor, number>,
	manaCost: string,
	copies: number
) {
	for (const match of manaCost.matchAll(/\{([^}]+)\}/g))
		for (const symbol of new Set(match[1].split('/')))
			if ((MANA_COLORS as readonly string[]).includes(symbol))
				pips[symbol as ManaColor] += copies;
}

export function deckStats(cards: readonly DeckCardEntry[]): DeckStats {
	const stats: DeckStats = {
		creatures: 0,
		nonCreatures: 0,
		lands: 0,
		curve: ['1-', '2', '3', '4', '5', '6+'].map((label) => ({
			label,
			creatures: 0,
			nonCreatures: 0
		})),
		averageManaValue: null,
		pips: { W: 0, U: 0, B: 0, R: 0, G: 0, C: 0 },
		totalPips: 0,
		types: []
	};
	const types = new Map<string, Map<string, number>>();
	const typeCounts = new Map<string, number>();
	let totalManaValue = 0;
	for (const card of cards) {
		if (card.count <= 0) continue;
		const type = primaryType(card);
		typeCounts.set(type, (typeCounts.get(type) ?? 0) + card.count);
		const subtypes = types.get(type) ?? new Map<string, number>();
		for (const subtype of listOf(card.subtypes))
			subtypes.set(subtype, (subtypes.get(subtype) ?? 0) + card.count);
		types.set(type, subtypes);
		addPips(stats.pips, card.manaCost, card.count);
		if (type === 'Land') {
			stats.lands += card.count;
			continue;
		}
		const value = manaValue(card.manaCost);
		const bucket = stats.curve[Math.min(Math.max(Math.floor(value), 1), 6) - 1];
		totalManaValue += value * card.count;
		if (listOf(card.types).includes('Creature')) {
			stats.creatures += card.count;
			bucket.creatures += card.count;
		} else {
			stats.nonCreatures += card.count;
			bucket.nonCreatures += card.count;
		}
	}
	const spells = stats.creatures + stats.nonCreatures;
	if (spells) stats.averageManaValue = totalManaValue / spells;
	stats.totalPips = MANA_COLORS.reduce(
		(total, color) => total + stats.pips[color],
		0
	);
	stats.types = TYPE_ORDER.filter((type) => typeCounts.has(type)).map(
		(type) => ({
			type,
			count: typeCounts.get(type) ?? 0,
			subtypes: Array.from(types.get(type) ?? [])
				.map((entry) => ({ name: entry[0], count: entry[1] }))
				.sort((a, b) => b.count - a.count || a.name.localeCompare(b.name))
		})
	);
	return stats;
}
