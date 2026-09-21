import { test } from 'node:test';
import assert from 'node:assert/strict';
import { bestCardName, prepareCardNames } from '../src/utils/card-name-match';

const names = prepareCardNames([
	'Hedge Whisperer', 'Hedron Archive', 'Tunnel Tipster', 'Roxanne, Starfall Savant', 'Turn // Burn', 'Exile',
	'Vigilance', 'Breach', 'Incite', 'Deal Damage', 'Predator Dragon', 'Wizards of the _____', 'Creature Guy',
	'Enchantmentize', 'Prosperity', 'Island', 'Forest', 'Rope'
]);
const match = (text: string) => bestCardName(text, names)?.name ?? null;

test('matches blurry title reads', () => {
	assert.equal(match('Hedge Whihyperer'), 'Hedge Whisperer');
	assert.equal(match('Tunnel Tipsnt'), 'Tunnel Tipster');
	assert.equal(match('Roxanne. Starfall Savant'), 'Roxanne, Starfall Savant');
	assert.equal(match('Forest'), 'Forest');
	assert.equal(match('Rope'), 'Rope');
});

test('rejects rules text, type lines and copyright lines', () => {
	for (const text of ['turn.', 'exile.)', 'deals 3 damage to', 'battlefield, it', 'Scry 2. (Then exile',
		'Creature - Dragon', '2026 Wizards of the Coast', 'Vigilance', 'Reach', 'Incine', 'Creature',
		'Enchantment', 'PRASPERITY', 'asic Land - Island']) {
		assert.equal(match(text), null, text);
	}
});
