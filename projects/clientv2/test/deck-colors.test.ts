import { test } from 'node:test';
import assert from 'node:assert/strict';
import { manaCostColors } from '../src/domain/deck/deck-colors';

test('lists every color in any mana cost, in WUBRG order', () => {
	assert.deepEqual(manaCostColors(['{2}{G}', '{R}{W}', '{1}{G}{G}']), ['W', 'R', 'G']);
});

test('counts both halves of hybrid and the color of Phyrexian and two-brid symbols', () => {
	assert.deepEqual(manaCostColors(['{U/B}']), ['U', 'B']);
	assert.deepEqual(manaCostColors(['{G/P}', '{2/W}']), ['W', 'G']);
});

test('generic, colorless and variable mana name no color', () => {
	assert.deepEqual(manaCostColors(['{X}{C}{3}', '']), []);
});
