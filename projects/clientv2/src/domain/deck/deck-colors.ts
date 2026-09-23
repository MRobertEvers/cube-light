export const DECK_COLORS = ['W', 'U', 'B', 'R', 'G'] as const;
export type DeckColor = (typeof DECK_COLORS)[number];

/**
 * The colors named in any of `manaCosts`, in WUBRG order. Each colored half of a hybrid or
 * Phyrexian symbol counts; generic, colorless and variable mana do not.
 */
export function manaCostColors(manaCosts: Iterable<string>): DeckColor[] {
	const found = new Set<string>();
	for (const manaCost of manaCosts)
		for (const match of manaCost.matchAll(/\{([^}]+)\}/g))
			for (const symbol of match[1].split('/')) found.add(symbol);
	return DECK_COLORS.filter((color) => found.has(color));
}
