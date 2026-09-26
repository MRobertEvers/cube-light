import { DECK_COLORS, type DeckColor, manaCostColors } from '../deck/deck-colors';

/**
 * The frame a card is drawn in when no image of it can be shown, chosen from its text
 * the way a printed card's frame follows its colors.
 * - mono: one color.
 * - hybrid: two colors, every colored symbol hybrid; drawn split between them.
 * - gold: two or more colors otherwise.
 * - artifact: a colorless artifact.
 * - colorless: any other colorless card.
 * - land: a land with no mana cost; `colors` are the mana it makes, empty for none.
 */
export type CardFrame =
	| { kind: 'mono'; color: DeckColor }
	| { kind: 'hybrid'; colors: [DeckColor, DeckColor] }
	| { kind: 'gold'; colors: DeckColor[] }
	| { kind: 'artifact' }
	| { kind: 'colorless' }
	| { kind: 'land'; colors: DeckColor[] };

export type CardFrameFace = { manaCost: string | null; type: string | null; text: string | null };

const BASIC_LAND_COLORS: Record<string, DeckColor> = { Plains: 'W', Island: 'U', Swamp: 'B', Mountain: 'R', Forest: 'G' };

/** The colors of mana a land makes: from its basic land types and its "Add …" abilities. */
export function landColors(face: CardFrameFace): DeckColor[] {
	const found = new Set<DeckColor>();
	for (const word of (face.type ?? '').split(/\s+/)) if (BASIC_LAND_COLORS[word]) found.add(BASIC_LAND_COLORS[word]);
	for (const line of (face.text ?? '').split('\n')) {
		const add = /\badd\b([^.]*)/i.exec(line)?.[1];
		if (!add) continue;
		if (/any color|any one color|any combination of colors/i.test(add)) for (const color of DECK_COLORS) found.add(color);
		for (const color of manaCostColors([add])) found.add(color);
	}
	return DECK_COLORS.filter((color) => found.has(color));
}

/** Whether every colored symbol in `manaCost` is a two-color hybrid, like {W/U}. */
function allHybrid(manaCost: string): boolean {
	const colored = Array.from(manaCost.matchAll(/\{[^}]+\}/g), (match) => manaCostColors([match[0]]).length).filter((count) => count > 0);
	return colored.length > 0 && colored.every((count) => count === 2);
}

export function cardFrame(face: CardFrameFace): CardFrame {
	const manaCost = face.manaCost ?? '';
	const colors = manaCostColors([manaCost]);
	const type = face.type ?? '';
	if (colors.length === 0 && /\bLand\b/.test(type)) return { kind: 'land', colors: landColors(face) };
	if (colors.length === 0) return /\bArtifact\b/.test(type) ? { kind: 'artifact' } : { kind: 'colorless' };
	if (colors.length === 1) return { kind: 'mono', color: colors[0] };
	if (colors.length === 2 && allHybrid(manaCost)) return { kind: 'hybrid', colors: [colors[0], colors[1]] };
	return { kind: 'gold', colors };
}
