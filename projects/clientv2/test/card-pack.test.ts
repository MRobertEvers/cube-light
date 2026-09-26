import { test } from 'node:test';
import assert from 'node:assert/strict';
import { overviewOf, recordCards, recordPackPrintings, type CardCatalog } from '../src/engine/core/card-catalog';
import { CardPackLibrary } from '../src/engine/card-pack/card-pack-library';
import type { CardPackStore } from '../src/engine/ports';
import type { PackPrinting } from '../src/domain/models/card-pack';

const PACK = {
	format: 1,
	version: 'test',
	fields: [],
	cards: [
		['Fire // Ice', [['Fire', '{1}{R}', 'Instant', 'Fire deals 2 damage.'], ['Ice', '{1}{U}', 'Instant', 'Tap target permanent.']], 'uuid-fire-ice', 'WC02'],
		['Tarmogoyf', [[null, '{1}{G}', 'Creature — Lhurgoyf', 'Power is card types.', '*', '1+*']], 'uuid-goyf', 'FUT'],
		['Only A Back Face', [[null, '', 'Legendary Artifact']], null, null]
	]
};

function store(pack: unknown): CardPackStore {
	return {
		offered: async () => null,
		offeredNames: async () => null,
		installed: async () => null,
		install: async () => { throw new Error('not used'); },
		remove: async () => {},
		read: async () => (pack === null ? null : JSON.stringify(pack))
	};
}

const goyf: PackPrinting = {
	uuid: 'uuid-goyf',
	name: 'Tarmogoyf',
	setCode: 'FUT',
	faces: [{ name: null, manaCost: '{1}{G}', type: 'Legendary Snow Artifact Creature — Lhurgoyf Beast', text: 'Power is card types.', power: '*', toughness: '1+*', loyalty: null, defense: null }]
};

test('pack text files an undescribed printing with types parsed like the server', () => {
	const catalog: CardCatalog = {};
	recordPackPrintings(catalog, [goyf]);
	const overview = overviewOf(catalog['uuid-goyf']);
	assert.equal(overview?.name, 'Tarmogoyf');
	assert.equal(overview?.types, 'Artifact, Creature');
	assert.equal(overview?.subtypes, 'Lhurgoyf, Beast');
	assert.equal(overview?.manaCost, '{1}{G}');
	assert.equal(overview?.power, '*');
});

test('a server overview wins over pack text, whichever arrives first', () => {
	const catalog: CardCatalog = {};
	const server = { uuid: 'uuid-goyf', name: 'Tarmogoyf', scryfallId: 's', setCode: 'FUT', types: 'Creature', subtypes: 'Lhurgoyf', manaCost: '{1}{G}', text: 'server text', type: 'Creature — Lhurgoyf', rarity: 'rare', power: '*', toughness: '1+*', loyalty: null, defense: null, number: '153', artist: 'Justin Murray', flavorText: null, legalities: {} };
	recordCards(catalog, 'sync', server);
	recordPackPrintings(catalog, [goyf]);
	assert.equal(overviewOf(catalog['uuid-goyf'])?.text, 'server text');
	assert.equal(catalog['uuid-goyf'].pack, undefined);
});

test('the library finds cards by name, face name and default printing', async () => {
	const library = new CardPackLibrary(store(PACK));
	assert.equal((await library.card('tarmogoyf'))?.printing?.uuid, 'uuid-goyf');
	assert.equal((await library.card('Ice'))?.name, 'Fire // Ice');
	assert.equal((await library.card('Only A Back Face'))?.printing, null);
	assert.equal(await library.card('No Such Card'), null);
	const printing = await library.printing('uuid-fire-ice');
	assert.equal(printing?.setCode, 'WC02');
	assert.equal(printing?.faces[1].text, 'Tap target permanent.');
});

test('with no pack installed, the library answers nothing', async () => {
	const library = new CardPackLibrary(store(null));
	assert.equal(await library.card('Tarmogoyf'), null);
	assert.equal(await library.printing('uuid-goyf'), null);
});
