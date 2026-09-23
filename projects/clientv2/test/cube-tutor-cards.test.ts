import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { FetchAPIDeckCardResponse } from '../src/api/fetch-api-deck';
import { groupCubeTutorCards } from '../src/utils/group-cube-tutor-cards';

function card(
	name: string,
	types: string,
	manaCost: string,
	text = '',
	subtypes = ''
): FetchAPIDeckCardResponse {
	return {
		name,
		count: 1,
		types,
		subtypes,
		manaCost,
		text,
		uuid: name,
		setCode: 'TST',
		image: '',
		art: '',
		board: 'main'
	} as FetchAPIDeckCardResponse;
}

test('cube tutor columns split colors by type and the rest by color combination', () => {
	const columns = groupCubeTutorCards([
		card('Swords to Plowshares', 'Instant', '{W}'),
		card('Thraben Inspector', 'Creature', '{W}'),
		card('Mother of Runes', 'Creature', '{W}'),
		card('Lightning Helix', 'Instant', '{R}{W}'),
		card('Fire // Ice', 'Instant', '{1}{U/R}'),
		card('Rakdos Signet', 'Artifact', '{2}', '{1}, {T}: Add {B}{R}.'),
		card('Wurmcoil Engine', 'Artifact, Creature', '{6}'),
		card('Steam Vents', 'Land', '', '', 'Island, Mountain'),
		card('City of Brass', 'Land', '', '{T}: Add one mana of any color.'),
		card('Strip Mine', 'Land', '', '{T}: Add {C}.')
	]);
	const shape = columns.map((column) => [
		column.label,
		column.count,
		column.sections.map((section) => [
			section.label,
			section.groups.map((group) => group.name)
		])
	]);
	assert.deepEqual(shape, [
		['White', 3, [
			['Creature', ['Mother of Runes', 'Thraben Inspector']],
			['Instant', ['Swords to Plowshares']]
		]],
		['Multicolor', 2, [
			['Izzet', ['Fire // Ice']],
			['Boros', ['Lightning Helix']]
		]],
		['Colorless', 2, [
			['Creature', ['Wurmcoil Engine']],
			['Rakdos', ['Rakdos Signet']]
		]],
		['Lands', 3, [
			['Izzet', ['Steam Vents']],
			['Any color', ['City of Brass']],
			['Colorless', ['Strip Mine']]
		]]
	]);
});
