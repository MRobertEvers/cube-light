import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { DeckCardEntry } from '../src/domain/models/deck';
import { parseArenaSearch } from '../src/ui/features/boards/MTGArenaTableBoard/arena-search';
import { groupDeckCardsByName } from '../src/domain/deck/group-deck-cards';

function card(
	name: string,
	fields: Partial<DeckCardEntry>
): DeckCardEntry {
	const entry: DeckCardEntry = {
		name: fields.name === undefined ? name : fields.name,
		count: fields.count === undefined ? 1 : fields.count,
		image: fields.image === undefined ? '' : fields.image,
		uuid: fields.uuid === undefined ? `${name}-uuid` : fields.uuid,
		art: fields.art === undefined ? '' : fields.art,
		setCode: fields.setCode === undefined ? 'DSK' : fields.setCode,
		types: fields.types === undefined ? 'Creature' : fields.types,
		manaCost: fields.manaCost === undefined ? '' : fields.manaCost,
		board: fields.board === undefined ? 'main' : fields.board,
		text: fields.text === undefined ? '' : fields.text,
		type: fields.type === undefined ? null : fields.type,
		rarity: fields.rarity === undefined ? 'common' : fields.rarity,
		power: fields.power === undefined ? null : fields.power,
		toughness: fields.toughness === undefined ? null : fields.toughness,
		loyalty: fields.loyalty === undefined ? null : fields.loyalty,
		defense: fields.defense === undefined ? null : fields.defense,
		number: fields.number === undefined ? null : fields.number,
		artist: fields.artist === undefined ? null : fields.artist,
		flavorText: fields.flavorText === undefined ? null : fields.flavorText,
		legalities: fields.legalities === undefined ? {} : fields.legalities
	};
	if (fields.images !== undefined) entry.images = fields.images;
	if (fields.subtypes !== undefined) entry.subtypes = fields.subtypes;
	return entry;
}

const DECK = groupDeckCardsByName([
	card('Ravenous Squirrel', {
		manaCost: '{B}{G}',
		type: 'Creature — Squirrel',
		power: '1',
		toughness: '1',
		rarity: 'uncommon',
		count: 4,
		text: 'Whenever you sacrifice an artifact or creature, put a +1/+1 counter on Ravenous Squirrel.'
	}),
	card('Chatterstorm', {
		manaCost: '{1}{G}',
		types: 'Sorcery',
		type: 'Sorcery',
		rarity: 'common',
		count: 4,
		text: 'Create a 1/1 green Squirrel creature token. Storm'
	}),
	card('Mirror Box', {
		manaCost: '{3}',
		types: 'Artifact',
		type: 'Artifact',
		rarity: 'rare',
		count: 1
	}),
	card('Forest', {
		types: 'Land',
		type: 'Basic Land — Forest',
		count: 8
	}),
	card('Woodland Cemetery', {
		types: 'Land',
		type: 'Land',
		rarity: 'rare',
		count: 1,
		text: '{T}: Add {B} or {G}.'
	})
]);

function names(query: string): string[] {
	const search = parseArenaSearch(query);
	assert.ok(search && search.ok, `"${query}" should parse`);
	return DECK.filter((group) => search.matches(group))
		.map((group) => group.name)
		.sort();
}

test('a blank search is no filter', () => {
	assert.equal(parseArenaSearch('   '), null);
});

test('bare words and quoted phrases search names', () => {
	assert.deepEqual(names('squirrel'), ['Ravenous Squirrel']);
	assert.deepEqual(names('"mirror box"'), ['Mirror Box']);
});

test('text keys contain their value', () => {
	assert.deepEqual(names('t:land'), ['Forest', 'Woodland Cemetery']);
	assert.deepEqual(names('o:"+1/+1 counter"'), ['Ravenous Squirrel']);
	assert.deepEqual(names('t!=land'), ['Chatterstorm', 'Mirror Box', 'Ravenous Squirrel']);
});

test('numbers compare, including mana value, power and deck quantity', () => {
	assert.deepEqual(names('mv<=2 -t:land'), ['Chatterstorm', 'Ravenous Squirrel']);
	assert.deepEqual(names('cmc=3'), ['Mirror Box']);
	assert.deepEqual(names('pow>=1'), ['Ravenous Squirrel']);
	assert.deepEqual(names('q>=4'), ['Chatterstorm', 'Forest', 'Ravenous Squirrel']);
});

test('colors compare as sets of the mana cost', () => {
	assert.deepEqual(names('c:g'), ['Chatterstorm', 'Ravenous Squirrel']);
	assert.deepEqual(names('c=g'), ['Chatterstorm']);
	assert.deepEqual(names('c:m'), ['Ravenous Squirrel']);
	assert.deepEqual(names('c:c'), ['Forest', 'Mirror Box', 'Woodland Cemetery']);
	assert.deepEqual(names('c<=g -t:land'), ['Chatterstorm', 'Mirror Box']);
	assert.deepEqual(names('id:bg'), ['Ravenous Squirrel', 'Woodland Cemetery']);
});

test('rarities compare in order', () => {
	assert.deepEqual(names('r>=r'), ['Mirror Box', 'Woodland Cemetery']);
	assert.deepEqual(names('r:uncommon'), ['Ravenous Squirrel']);
});

test('or, negation and parentheses combine terms', () => {
	assert.deepEqual(names('t:artifact or t:sorcery'), ['Chatterstorm', 'Mirror Box']);
	assert.deepEqual(names('-(t:land or c:g)'), ['Mirror Box']);
	assert.deepEqual(names('?spell c:g'), ['Chatterstorm', 'Ravenous Squirrel']);
	assert.deepEqual(names('?basicland'), ['Forest']);
});

test('mana cost search reads costs without braces', () => {
	assert.deepEqual(names('m:bg'), ['Ravenous Squirrel']);
});

test('mistakes explain themselves instead of matching nothing', () => {
	for (const query of ['zz:1', 'mv>x', 't<land', '(t:land', 'c:purple', 'r:epic', '?booster', 'o:"open']) {
		const search = parseArenaSearch(query);
		assert.ok(search && !search.ok, `"${query}" should be rejected`);
		assert.ok(search.error.length > 0);
	}
});
