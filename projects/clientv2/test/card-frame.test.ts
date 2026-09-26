import { test } from 'node:test';
import assert from 'node:assert/strict';
import { cardFrame, landColors } from '../src/domain/models/card-frame';

function face(manaCost: string | null, type: string | null, text: string | null = null) {
	return { manaCost, type, text };
}

test('one color draws a mono frame', () => {
	assert.deepEqual(cardFrame(face('{1}{U}', 'Creature — Human Wizard')), { kind: 'mono', color: 'U' });
	assert.deepEqual(cardFrame(face('{G/P}', 'Instant')), { kind: 'mono', color: 'G' });
	assert.deepEqual(cardFrame(face('{2/W}{2/W}', 'Sorcery')), { kind: 'mono', color: 'W' });
});

test('two colors are hybrid only when every colored symbol is hybrid', () => {
	assert.deepEqual(cardFrame(face('{R/W}', 'Creature — Kithkin Avatar')), { kind: 'hybrid', colors: ['W', 'R'] });
	assert.deepEqual(cardFrame(face('{2}{B/G}{B/G}', 'Creature')), { kind: 'hybrid', colors: ['B', 'G'] });
	assert.deepEqual(cardFrame(face('{R/G}{G}', 'Creature')), { kind: 'gold', colors: ['R', 'G'] });
	assert.deepEqual(cardFrame(face('{U}{R}', 'Instant')), { kind: 'gold', colors: ['U', 'R'] });
	assert.deepEqual(cardFrame(face('{W}{U}{B}', 'Creature')), { kind: 'gold', colors: ['W', 'U', 'B'] });
});

test('colorless cards are artifacts or colorless', () => {
	assert.deepEqual(cardFrame(face('{3}', 'Artifact — Equipment')), { kind: 'artifact' });
	assert.deepEqual(cardFrame(face('{1}{U}', 'Artifact Creature — Thopter')), { kind: 'mono', color: 'U' });
	assert.deepEqual(cardFrame(face('{10}', 'Legendary Creature — Eldrazi')), { kind: 'colorless' });
	assert.deepEqual(cardFrame(face(null, null)), { kind: 'colorless' });
});

test('lands take the colors of the mana they make', () => {
	assert.deepEqual(cardFrame(face(null, 'Basic Land — Forest', '({T}: Add {G}.)')), { kind: 'land', colors: ['G'] });
	assert.deepEqual(cardFrame(face(null, 'Land — Island Swamp')), { kind: 'land', colors: ['U', 'B'] });
	assert.deepEqual(landColors(face(null, 'Land', '{T}: Add {C}.\n{T}, Pay 1 life: Add {R} or {W}.')), ['W', 'R']);
	assert.deepEqual(landColors(face(null, 'Land', '{T}: Add one mana of any color.')), ['W', 'U', 'B', 'R', 'G']);
	assert.deepEqual(landColors(face(null, 'Land', 'When this enters, sacrifice it unless you return a land.')), []);
	// Dryad Arbor has no cost but is green through its color indicator; lands without costs still read as lands.
	assert.deepEqual(cardFrame(face(null, 'Land Creature — Forest Dryad')), { kind: 'land', colors: ['G'] });
});
