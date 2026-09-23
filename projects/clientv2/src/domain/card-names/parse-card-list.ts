/**
 * Parses a newline-delimited card list in the common MTG decklist format shared by
 * Arena, MTGO, Moxfield and most other deck sites:
 *
 *   list    := line ('\n' line)*
 *   line    := blank | comment | section | card
 *   comment := ('//' | '#') any*
 *   section := ('Deck' | 'Main' | 'Mainboard' | 'Commander' | 'Companion'
 *              | 'Sideboard' | 'Maybeboard' | 'Considering') ':'? ('(' count ')')?
 *   card    := 'SB:'? (count 'x'?)? name ('(' set ')' collector?)? foil?
 *   foil    := '*F*' | '*E*'
 *
 * The count defaults to 1. Cards before any section go to `defaultBoard`, the main board
 * unless the caller picks another. Cards under a main section go to the main board, and
 * cards under a sideboard section (or prefixed with `SB:`) go to the side board. Cards under a maybeboard section are skipped because decks have no
 * maybeboard.
 */

import type { DeckBoard } from '@torimtg/core';

export type ParsedCard = {
	name: string;
	count: number;
	setCode?: string;
	board: DeckBoard;
	/** 1-based source lines, so errors can point back to the input. */
	lines: number[];
};

export type CardListIssue = {
	line: number;
	text: string;
	message: string;
};

/**
 * How a line was combined with another rather than added on its own. Neither blocks
 * adding the list; they say what will happen and offer to write it out.
 */
export type CardListNote =
	| (CardListIssue & {
			kind: 'duplicate';
			/** The first line naming the same card and printing, which this one adds to. */
			firstLine: number;
	  })
	| (CardListIssue & {
			kind: 'inferred-set';
			/** The printing given for the same card on `fromLine`, used for this line too. */
			setCode: string;
			fromLine: number;
	  });

export type ParsedCardList = {
	cards: ParsedCard[];
	skipped: CardListIssue[];
	errors: CardListIssue[];
	notes: CardListNote[];
};

const MAX_COUNT = 999;
const MAIN_SECTIONS = new Set([
	'deck',
	'main',
	'mainboard',
	'main deck',
	'commander',
	'companion'
]);
const SIDE_SECTIONS = new Set(['sideboard', 'side']);
const SKIPPED_SECTIONS = new Set(['maybeboard', 'maybe', 'considering']);
const SECTION_PATTERN = /^([a-z ]+?)\s*:?\s*(?:\(\d+\))?$/i;
const CARD_PATTERN =
	/^(?:(\d+)\s*x?\s+)?(.+?)(?:\s+\(([a-z0-9]{2,6})\)(?:\s+\S+)?)?(?:\s+\*[a-z]\*)?$/i;

export type ColumnSpan = { start: number; end: number };

export type CardNameSpan = ColumnSpan & {
	/** The name; start and end are its column range in the raw line, end exclusive. */
	name: string;
	/** The count's digits, or null when the line has none (a count of 1). */
	count: ColumnSpan | null;
	/** The printing, `(SET)` plus any collector number, or null when unset. */
	printing: (ColumnSpan & { setCode: string }) | null;
};

/**
 * Finds the card name in one raw line, for editors that mark or complete it in place.
 * Returns null for lines without a card: blank lines, comments and section headers.
 */
export function locateCardName(raw: string): CardNameSpan | null {
	const leading = raw.length - raw.trimStart().length;
	const body = raw.trim();
	if (!body || body.startsWith('//') || body.startsWith('#')) return null;
	const section = SECTION_PATTERN.exec(body)?.[1].toLowerCase();
	if (section && isSectionName(section)) return null;
	const prefix = /^(?:SB:\s*)?/i.exec(body)![0].length;
	const card = body.slice(prefix);
	const match = CARD_PATTERN.exec(card);
	if (!match?.[2]) return null;
	// CARD_PATTERN tries the count first, so this is where its name group starts.
	const cardStart = leading + prefix;
	const start = cardStart + /^(?:\d+\s*x?\s+)?/i.exec(card)![0].length;
	const end = start + match[2].length;
	const printing = match[3]
		? /^\s+(\([a-z0-9]{2,6}\)(?:\s+(?!\*[a-z]\*$)\S+)?)/i.exec(
				raw.slice(end)
			)
		: null;
	const printingStart = printing
		? end + printing[0].length - printing[1].length
		: 0;
	return {
		name: match[2].trim().replace(/\s+/g, ' '),
		start,
		end,
		count: match[1]
			? { start: cardStart, end: cardStart + match[1].length }
			: null,
		printing: printing
			? {
					start: printingStart,
					end: printingStart + printing[1].length,
					setCode: match[3].toUpperCase()
				}
			: null
	};
}

function isSectionName(section: string): boolean {
	return (
		MAIN_SECTIONS.has(section) ||
		SIDE_SECTIONS.has(section) ||
		SKIPPED_SECTIONS.has(section)
	);
}

export function parseCardList(
	text: string,
	defaultBoardArg?: DeckBoard
): ParsedCardList {
	const defaultBoard =
		defaultBoardArg === undefined ? 'main' : defaultBoardArg;
	const merged = new Map<string, ParsedCard>();
	const skipped: CardListIssue[] = [];
	const errors: CardListIssue[] = [];
	const notes: CardListNote[] = [];
	let inSkippedSection = false;
	let sectionBoard: DeckBoard = defaultBoard;

	text.split(/\r?\n/).forEach((raw, index) => {
		const line = index + 1;
		let body = raw.trim();
		if (!body || body.startsWith('//') || body.startsWith('#')) return;

		const section = SECTION_PATTERN.exec(body)?.[1].toLowerCase();
		if (section && isSectionName(section)) {
			inSkippedSection = SKIPPED_SECTIONS.has(section);
			sectionBoard = SIDE_SECTIONS.has(section) ? 'side' : 'main';
			return;
		}

		const isSideboardLine = /^SB:\s*/i.test(body);
		body = body.replace(/^SB:\s*/i, '');
		if (inSkippedSection && !isSideboardLine) {
			skipped.push({
				line,
				text: raw,
				message: 'Maybeboard cards are not added'
			});
			return;
		}
		const board: DeckBoard = isSideboardLine ? 'side' : sectionBoard;

		const match = CARD_PATTERN.exec(body);
		const count = match?.[1] ? Number(match[1]) : 1;
		const name = match?.[2].trim().replace(/\s+/g, ' ');
		if (!match || !name) {
			errors.push({
				line,
				text: raw,
				message: 'Could not read this line'
			});
			return;
		}
		if (count < 1 || count > MAX_COUNT) {
			errors.push({
				line,
				text: raw,
				message: `Count must be between 1 and ${MAX_COUNT}`
			});
			return;
		}

		const setCode = match[3]?.toUpperCase();
		const key = `${board}|${name.toLowerCase()}|${setCode ?? ''}`;
		const existing = merged.get(key);
		if (existing) {
			existing.count = Math.min(MAX_COUNT, existing.count + count);
			existing.lines.push(line);
			notes.push({
				kind: 'duplicate',
				line,
				text: raw,
				firstLine: existing.lines[0],
				message: `Same card and printing as line ${existing.lines[0]}`
			});
		} else {
			merged.set(
				key,
				setCode
					? { name, count, setCode, board, lines: [line] }
					: { name, count, board, lines: [line] }
			);
		}
	});

	// A line without a printing takes the one given for the same card elsewhere in the
	// same board, rather than whichever printing the server would pick.
	const lines = text.split(/\r?\n/);
	for (const [key, card] of merged) {
		if (card.setCode) continue;
		const name = card.name.toLowerCase();
		const printed = Array.from(merged.values())
			.filter(
				(other) =>
					other.setCode &&
					other.board === card.board &&
					other.name.toLowerCase() === name
			)
			.sort((a, b) => a.lines[0] - b.lines[0])[0];
		if (!printed) continue;
		const fromLine = printed.lines[0];
		printed.count = Math.min(MAX_COUNT, printed.count + card.count);
		printed.lines = printed.lines.concat(card.lines).sort((a, b) => a - b);
		merged.delete(key);
		for (const line of card.lines)
			notes.push({
				kind: 'inferred-set',
				line,
				text: lines[line - 1],
				setCode: printed.setCode!,
				fromLine,
				message: `No set given, so it uses ${printed.setCode} from line ${fromLine}`
			});
	}

	return {
		cards: Array.from(merged.values()),
		skipped,
		errors,
		notes: notes.sort((a, b) => a.line - b.line)
	};
}
