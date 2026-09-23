import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
	type CardCatalog,
	detailsOf,
	identityOf,
	overviewOf,
	recordCards
} from '../src/engine/core/card-catalog';

const printing = {
	uuid: 'bolt-m10',
	name: 'Lightning Bolt',
	setCode: 'M10',
	setName: 'Magic 2010',
	image: '/normal.jpg',
	art: '/art.jpg'
};

const overview = {
	uuid: 'bolt-m10',
	name: 'Lightning Bolt',
	scryfallId: 'scry',
	setCode: 'M10',
	types: 'Instant',
	subtypes: '',
	manaCost: '{R}',
	text: 'Lightning Bolt deals 3 damage to any target.',
	type: 'Instant',
	rarity: 'common',
	power: null,
	toughness: null,
	loyalty: null,
	defense: null,
	number: '146',
	artist: null,
	flavorText: null,
	legalities: {},
	image: '/small.jpg',
	images: {
		small: '/small.jpg',
		normal: '/normal.jpg',
		large: '/large.jpg',
		art_crop: '/art.jpg'
	},
	art: '/art.jpg'
};

test('a printing names a card but never answers for its overview or details', () => {
	const cards: CardCatalog = {};
	recordCards(cards, 'card.printings', [printing]);
	assert.equal(overviewOf(cards['bolt-m10']), null);
	assert.equal(detailsOf(cards['bolt-m10']), null);
	assert.equal(identityOf(cards['bolt-m10'])?.name, 'Lightning Bolt');
});

test('a printing recorded after an overview does not overwrite it', () => {
	const cards: CardCatalog = {};
	recordCards(cards, 'sync', overview);
	recordCards(cards, 'card.printings', [printing]);
	assert.equal(overviewOf(cards['bolt-m10'])?.types, 'Instant');
	assert.equal(overviewOf(cards['bolt-m10'])?.image, '/small.jpg');
});

test('a source returning a thinner shape than it declares is not recorded', () => {
	const cards: CardCatalog = {};
	recordCards(cards, 'card.resolve', printing);
	recordCards(cards, 'card.details', overview);
	assert.equal(cards['bolt-m10'], undefined);
});

test('details stand in offline from an overview without inventing sets', () => {
	const cards: CardCatalog = {};
	recordCards(cards, 'sync', overview);
	const details = detailsOf(cards['bolt-m10']);
	assert.equal(details?.highResImage, '/normal.jpg');
	assert.equal(details && 'sets' in details, false);
});

test('full details also provide the overview', () => {
	const cards: CardCatalog = {};
	recordCards(cards, 'card.details', {
		uuid: overview.uuid,
		name: overview.name,
		scryfallId: overview.scryfallId,
		setCode: overview.setCode,
		types: overview.types,
		subtypes: overview.subtypes,
		manaCost: overview.manaCost,
		text: overview.text,
		type: overview.type,
		rarity: overview.rarity,
		power: overview.power,
		toughness: overview.toughness,
		loyalty: overview.loyalty,
		defense: overview.defense,
		number: overview.number,
		artist: overview.artist,
		flavorText: overview.flavorText,
		legalities: overview.legalities,
		image: overview.image,
		images: overview.images,
		art: overview.art,
		sets: [['M10', 'Magic 2010']],
		highResImage: '/normal.jpg'
	});
	assert.equal(overviewOf(cards['bolt-m10'])?.manaCost, '{R}');
	assert.equal(
		overviewOf(cards['bolt-m10']) && 'sets' in overviewOf(cards['bolt-m10'])!,
		false
	);
});
