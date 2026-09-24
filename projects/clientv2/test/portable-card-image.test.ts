import assert from 'node:assert/strict';
import { test } from 'node:test';
import { portableCardImageUrl } from '../src/domain/models/session';

const ID = 'cc6b2f8b-8fac-4483-b560-4ede70ff7010';

test('rewrites a card image on the server\'s own address to the /api proxy', () => {
	assert.equal(
		portableCardImageUrl(`http://matthew-mbp-m4.local:4040/images/art_crop/${ID}.jpg`),
		`/api/images/art_crop/${ID}.jpg`
	);
});

test('rewrites an absolute /api card image to the relative form', () => {
	assert.equal(portableCardImageUrl(`https://cube.example/api/images/normal/${ID}.jpg`), `/api/images/normal/${ID}.jpg`);
});

test('keeps portable and non-card URLs unchanged', () => {
	assert.equal(portableCardImageUrl(`/api/images/small/${ID}.jpg`), `/api/images/small/${ID}.jpg`);
	assert.equal(portableCardImageUrl('https://cards.scryfall.io/art_crop/front/c/c/x.jpg'), 'https://cards.scryfall.io/art_crop/front/c/c/x.jpg');
	assert.equal(portableCardImageUrl('blob:https://cube.example/1234'), 'blob:https://cube.example/1234');
});
