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
 * The count defaults to 1. Cards under a sideboard or maybeboard section (or prefixed with
 * `SB:`) are skipped because decks only have a main board.
 */

export type ParsedCard = {
	name: string;
	count: number;
	setCode?: string;
	/** 1-based source lines, so errors can point back to the input. */
	lines: number[];
};

export type CardListIssue = {
	line: number;
	text: string;
	message: string;
};

export type ParsedCardList = {
	cards: ParsedCard[];
	skipped: CardListIssue[];
	errors: CardListIssue[];
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
const SKIPPED_SECTIONS = new Set([
	'sideboard',
	'side',
	'maybeboard',
	'maybe',
	'considering'
]);
const SECTION_PATTERN = /^([a-z ]+?)\s*:?\s*(?:\(\d+\))?$/i;
const CARD_PATTERN =
	/^(?:(\d+)\s*x?\s+)?(.+?)(?:\s+\(([a-z0-9]{2,6})\)(?:\s+\S+)?)?(?:\s+\*[a-z]\*)?$/i;

export function parseCardList(text: string): ParsedCardList {
	const merged = new Map<string, ParsedCard>();
	const skipped: CardListIssue[] = [];
	const errors: CardListIssue[] = [];
	let inSkippedSection = false;

	text.split(/\r?\n/).forEach((raw, index) => {
		const line = index + 1;
		let body = raw.trim();
		if (!body || body.startsWith('//') || body.startsWith('#')) return;

		const section = SECTION_PATTERN.exec(body)?.[1].toLowerCase();
		if (
			section &&
			(MAIN_SECTIONS.has(section) || SKIPPED_SECTIONS.has(section))
		) {
			inSkippedSection = SKIPPED_SECTIONS.has(section);
			return;
		}

		const isSideboardLine = /^SB:\s*/i.test(body);
		body = body.replace(/^SB:\s*/i, '');
		if (inSkippedSection || isSideboardLine) {
			skipped.push({
				line,
				text: raw,
				message: 'Sideboard cards are not added'
			});
			return;
		}

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
		const key = `${name.toLowerCase()}|${setCode ?? ''}`;
		const existing = merged.get(key);
		if (existing) {
			existing.count = Math.min(MAX_COUNT, existing.count + count);
			existing.lines.push(line);
		} else {
			merged.set(key, {
				name,
				count,
				...(setCode ? { setCode } : {}),
				lines: [line]
			});
		}
	});

	return { cards: [...merged.values()], skipped, errors };
}
