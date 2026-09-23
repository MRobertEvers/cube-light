import type { DeckCardEntry } from '../../../../domain/models/deck';
import type { DeckCardGroup } from '../../../../domain/deck/group-deck-cards';
import { manaValue } from '../../../../domain/deck/group-deck-cards';

/**
 * MTG Arena's deck builder search syntax, as far as a deck's cards can answer it:
 *
 * - Bare words and "quoted phrases" search card names.
 * - `key:value` terms, where the operator is one of `: = != < > <= >=`.
 *   Text keys contain their value; number, rarity and color keys compare it.
 * - Terms side by side must all match; `or` between terms lets either match;
 *   `-` in front of a term or group negates it; parentheses group.
 * - `?spell`, `?permanent` and `?basicland` test what a card is.
 *
 * Colors come from the mana cost, since that's what a deck's cards carry.
 */

export type ArenaSearch =
	| { ok: true; matches: (group: DeckCardGroup) => boolean }
	| { ok: false; error: string };

type TextField = (card: DeckCardEntry) => string;
type NumberField = (
	card: DeckCardEntry,
	count: number
) => number | null;

type Key =
	| { kind: 'text'; field: TextField }
	| { kind: 'number'; field: NumberField }
	| { kind: 'rarity' }
	| { kind: 'color'; identity: boolean }
	| { kind: 'mana' };

function typeLine(card: DeckCardEntry): string {
	return card.type ?? `${card.types} ${card.subtypes ?? ''}`;
}

function numberOf(value: string | null | undefined): number | null {
	if (value === null || value === undefined || value === '') return null;
	const number = Number(value);
	return Number.isFinite(number) ? number : null;
}

const KEYS: Record<string, Key> = {
	name: { kind: 'text', field: function (card) { return card.name; } },
	t: { kind: 'text', field: typeLine },
	o: { kind: 'text', field: function (card) { return card.text ?? ''; } },
	s: { kind: 'text', field: function (card) { return card.setCode; } },
	f: { kind: 'text', field: function (card) { return card.flavorText ?? ''; } },
	a: { kind: 'text', field: function (card) { return card.artist ?? ''; } },
	mv: { kind: 'number', field: function (card) { return manaValue(card.manaCost); } },
	pow: { kind: 'number', field: function (card) { return numberOf(card.power); } },
	tou: { kind: 'number', field: function (card) { return numberOf(card.toughness); } },
	loy: { kind: 'number', field: function (card) { return numberOf(card.loyalty); } },
	q: { kind: 'number', field: function (_card, count) { return count; } },
	r: { kind: 'rarity' },
	c: { kind: 'color', identity: false },
	id: { kind: 'color', identity: true },
	m: { kind: 'mana' }
};

const ALIASES: Record<string, string> = {
	n: 'name',
	type: 't',
	oracle: 'o',
	text: 'o',
	e: 's',
	set: 's',
	flavor: 'f',
	artist: 'a',
	cmc: 'mv',
	power: 'pow',
	toughness: 'tou',
	loyalty: 'loy',
	quantity: 'q',
	rarity: 'r',
	color: 'c',
	ci: 'id',
	identity: 'id',
	mana: 'm'
};

const RARITIES = ['common', 'uncommon', 'rare', 'mythic'];
const RARITY_LETTERS: Record<string, string> = {
	c: 'common',
	u: 'uncommon',
	r: 'rare',
	m: 'mythic'
};

const COLOR_WORDS: Record<string, string> = {
	white: 'w',
	blue: 'u',
	black: 'b',
	red: 'r',
	green: 'g'
};

const SPECIALS: Record<string, (card: DeckCardEntry) => boolean> =
	{
		spell: function (card) {
			return !/\bLand\b/i.test(typeLine(card));
		},
		permanent: function (card) {
			return /\b(Artifact|Battle|Creature|Enchantment|Land|Planeswalker)\b/i.test(
				typeLine(card)
			);
		},
		basicland: function (card) {
			return /\bBasic\b.*\bLand\b/i.test(typeLine(card));
		}
	};

type Operator = ':' | '=' | '!=' | '<' | '>' | '<=' | '>=';

type Token =
	| { kind: '(' | ')' | 'not' | 'or' | 'and' }
	| { kind: 'term'; test: Test };

type Test = (card: DeckCardEntry, count: number) => boolean;

class SearchError extends Error {}

function compare(a: number, operator: Operator, b: number): boolean {
	switch (operator) {
		case ':':
		case '=':
			return a === b;
		case '!=':
			return a !== b;
		case '<':
			return a < b;
		case '>':
			return a > b;
		case '<=':
			return a <= b;
		case '>=':
			return a >= b;
	}
}

/** Colors named by mana symbols; hybrid symbols name both halves. */
function colorsIn(text: string): Set<string> {
	const colors = new Set<string>();
	for (const match of text.matchAll(/\{([^}]+)\}/g))
		for (const part of match[1].toLowerCase().split('/'))
			if ('wubrg'.includes(part)) colors.add(part);
	return colors;
}

function colorTest(
	name: string,
	operator: Operator,
	value: string,
	identity: boolean
): Test {
	function colorsOf(card: DeckCardEntry) {
		return colorsIn(
			identity ? `${card.manaCost} ${card.text ?? ''}` : card.manaCost
		);
	}
	const wanted = value.toLowerCase();
	if (wanted === 'm' || wanted === 'multicolor') {
		if (operator !== ':' && operator !== '=')
			throw new SearchError(`${name}${operator}${value} isn't a comparison Arena makes.`);
		return function (card) {
			return colorsOf(card).size >= 2;
		};
	}
	const target = new Set<string>();
	if (wanted !== 'c' && wanted !== 'colorless') {
		const letters = COLOR_WORDS[wanted] ?? wanted;
		for (const letter of letters) {
			if (!'wubrg'.includes(letter))
				throw new SearchError(
					`"${value}" isn't a color. Use letters from WUBRG, a color's name, C for colorless or M for multicolor.`
				);
			target.add(letter);
		}
	}
	return function (card) {
		const colors = colorsOf(card);
		const within = Array.from(colors).every((color) => target.has(color));
		const covers = Array.from(target).every((color) => colors.has(color));
		const same = within && covers;
		switch (operator) {
			// Like Arena, c:r finds every red card, and c=r only mono-red ones.
			case ':':
				return target.size === 0 ? colors.size === 0 : covers;
			case '=':
				return same;
			case '!=':
				return !same;
			case '<=':
				return within;
			case '<':
				return within && !same;
			case '>=':
				return covers;
			case '>':
				return covers && !same;
		}
	};
}

function termTest(rawKey: string, operator: Operator, value: string): Test {
	const name = ALIASES[rawKey] ?? rawKey;
	const key = KEYS[name];
	if (!key) throw new SearchError(`"${rawKey}" isn't a search key.`);
	if (value === '')
		throw new SearchError(`${rawKey}${operator} needs a value after it.`);
	switch (key.kind) {
		case 'text': {
			if (operator !== ':' && operator !== '=' && operator !== '!=')
				throw new SearchError(
					`${rawKey} searches text, so use ${rawKey}: or ${rawKey}!=.`
				);
			const needle = value.toLowerCase();
			const field = key.field;
			function contains(card: DeckCardEntry) {
				return field(card).toLowerCase().includes(needle);
			}
			return operator === '!='
				? function (card) {
						return !contains(card);
					}
				: contains;
		}
		case 'number': {
			const wanted = Number(value);
			if (!Number.isFinite(wanted))
				throw new SearchError(`${rawKey} compares numbers, not "${value}".`);
			const field = key.field;
			return function (card, count) {
				const actual = field(card, count);
				return actual !== null && compare(actual, operator, wanted);
			};
		}
		case 'rarity': {
			const wanted = RARITY_LETTERS[value.toLowerCase()] ?? value.toLowerCase();
			const rank = RARITIES.indexOf(wanted);
			if (rank < 0)
				throw new SearchError(
					`"${value}" isn't a rarity. Use common, uncommon, rare or mythic (or C, U, R, M).`
				);
			return function (card) {
				const actual = RARITIES.indexOf((card.rarity ?? '').toLowerCase());
				return actual >= 0 && compare(actual, operator, rank);
			};
		}
		case 'color':
			return colorTest(rawKey, operator, value, key.identity);
		case 'mana': {
			if (operator !== ':' && operator !== '=' && operator !== '!=')
				throw new SearchError(`m searches mana costs, so use m: or m!=.`);
			// Arena spells costs without braces, so m:gu finds {1}{G}{U}.
			const needle = value.toLowerCase().replace(/[{}]/g, '');
			function contains(card: DeckCardEntry) {
				return card.manaCost
					.toLowerCase()
					.replace(/[{}]/g, '')
					.includes(needle);
			}
			return operator === '!='
				? function (card) {
						return !contains(card);
					}
				: contains;
		}
	}
}

const KEYED = /^([a-z]+)(!=|<=|>=|:|=|<|>)/i;

function readValue(query: string, start: number): { value: string; end: number } {
	if (query[start] === '"') {
		const close = query.indexOf('"', start + 1);
		if (close < 0) throw new SearchError('A quote is missing its closing ".');
		return { value: query.slice(start + 1, close), end: close + 1 };
	}
	let end = start;
	while (end < query.length && !/[\s()]/.test(query[end])) end++;
	return { value: query.slice(start, end), end };
}

function tokenize(query: string): Token[] {
	const tokens: Token[] = [];
	let at = 0;
	while (at < query.length) {
		const char = query[at];
		if (/\s/.test(char)) {
			at++;
		} else if (char === '(' || char === ')') {
			tokens.push({ kind: char });
			at++;
		} else if (char === '-' && at + 1 < query.length && !/\s/.test(query[at + 1])) {
			tokens.push({ kind: 'not' });
			at++;
		} else if (char === '?') {
			const { value, end } = readValue(query, at + 1);
			const special = SPECIALS[value.toLowerCase()];
			if (!special)
				throw new SearchError(
					`?${value} isn't supported here. Try ?spell, ?permanent or ?basicland.`
				);
			tokens.push({ kind: 'term', test: special });
			at = end;
		} else {
			const keyed = KEYED.exec(query.slice(at));
			if (keyed) {
				const [whole, key, operator] = keyed;
				const { value, end } = readValue(query, at + whole.length);
				tokens.push({
					kind: 'term',
					test: termTest(key.toLowerCase(), operator as Operator, value)
				});
				at = end;
				continue;
			}
			const { value, end } = readValue(query, at);
			const word = value.toLowerCase();
			if (char !== '"' && word === 'or') tokens.push({ kind: 'or' });
			else if (char !== '"' && word === 'and') tokens.push({ kind: 'and' });
			else
				tokens.push({
					kind: 'term',
					test: function (card) {
						return card.name.toLowerCase().includes(word);
					}
				});
			at = end;
		}
	}
	return tokens;
}

/** `or` binds loosest, then side-by-side terms, then `-` and parentheses. */
function parse(tokens: Token[]): Test {
	let at = 0;
	function peek() {
		return tokens[at];
	}
	function either(): Test {
		const options = [both()];
		while (peek()?.kind === 'or') {
			at++;
			options.push(both());
		}
		return options.length === 1
			? options[0]
			: function (card, count) {
					return options.some((test) => test(card, count));
				};
	}
	function both(): Test {
		const all: Test[] = [];
		while (at < tokens.length) {
			const kind = peek().kind;
			if (kind === 'or' || kind === ')') break;
			if (kind === 'and') {
				at++;
				continue;
			}
			all.push(single());
		}
		if (all.length === 0)
			throw new SearchError('Something is missing next to "or" or a parenthesis.');
		return all.length === 1
			? all[0]
			: function (card, count) {
					return all.every((test) => test(card, count));
				};
	}
	function single(): Test {
		const token = tokens[at++];
		if (token.kind === 'not') {
			if (at >= tokens.length) throw new SearchError('"-" needs something to negate.');
			const inner = single();
			return function (card, count) {
				return !inner(card, count);
			};
		}
		if (token.kind === '(') {
			const inner = either();
			if (peek()?.kind !== ')') throw new SearchError('A "(" is missing its ")".');
			at++;
			return inner;
		}
		if (token.kind === 'term') return token.test;
		throw new SearchError(`Unexpected "${token.kind}".`);
	}
	const test = either();
	if (at < tokens.length) throw new SearchError('A ")" has no "(" to close.');
	return test;
}

/**
 * Reads an Arena search. A blank query is null, meaning no filter. A card
 * matches when any of its printings does, counting all its copies for q.
 */
export function parseArenaSearch(query: string): ArenaSearch | null {
	if (!query.trim()) return null;
	try {
		const test = parse(tokenize(query));
		return {
			ok: true,
			matches: function (group) {
				return group.printings.some((card) => test(card, group.count));
			}
		};
	} catch (error) {
		if (error instanceof SearchError) return { ok: false, error: error.message };
		throw error;
	}
}
