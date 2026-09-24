import { test } from 'node:test';
import assert from 'node:assert/strict';
import { previewFromPixels } from '@torimtg/core';
import type { StoredResource } from '@torimtg/core';
import { queryKey } from '../src/engine/local-store/local-store';
import {
	artworkFor,
	buildImageSidecars,
	deckArtworkUrls,
	missingSidecars,
	sidecarQuery
} from '../src/engine/core/image-sidecars';
import type { Dataset } from '../src/engine/core/types';

const measured = '67f4c93b-080c-4196-b095-6a120a221988';
const gray = '00365412-41db-427c-9109-8f69c17c326d';
const unasked = '0186d255-2fd6-4261-9c4c-394d4417d396';
const stale = '1e8f9ef5-762f-438f-b06b-9c30c4e364f0';
const palette = { accent: '#7a3431', surface: '#eadcd9', wash: '#f6f0ef', border: '#d8c2be' };
const preview = previewFromPixels(2, 1, [200, 40, 40, 255, 40, 40, 200, 255]);

function resource(id: string, status: number, body: unknown): StoredResource {
	return {
		key: queryKey(sidecarQuery({ variant: 'art_crop', id })),
		body: new Blob([status === 200 ? JSON.stringify(body) : '']),
		status,
		contentType: 'application/json',
		validatedAt: '2026-09-23T00:00:00.000Z'
	};
}

function dataset(resources: StoredResource[]): Dataset {
	return { states: [], catalog: {}, events: [], intents: [], meta: {} as Dataset['meta'], resources };
}

test('sidecars join a deck by the image, whoever serves its url', async () => {
	const sidecars = await buildImageSidecars(
		dataset([
			resource(measured, 200, { version: 2, variant: 'art_crop', id: measured, width: 626, height: 457, palette, preview }),
			resource(gray, 404, null),
			resource(stale, 200, { version: 1, variant: 'art_crop', id: stale, width: 1, height: 1, palette: null })
		])
	);
	const local = `/api/images/art_crop/${measured}.jpg`;
	const cdn = `https://cards.scryfall.io/art_crop/front/6/7/${measured}.jpg`;
	const artwork = artworkFor([local, cdn, `/api/images/art_crop/${gray}.jpg`, `/api/images/art_crop/${unasked}.jpg`], sidecars);

	const info = artwork[local];
	assert.ok(info);
	assert.equal(info.width, 626);
	assert.equal(info.height, 457);
	assert.deepEqual(info.palette, palette);
	// The preview arrives decoded, ready for an <img>, with no network needed.
	assert.match(info.preview ?? '', /^data:image\/png;base64,/);
	assert.deepEqual(artwork[cdn], artwork[local]);
	// The server said it has none: answered, so not asked again.
	assert.equal(artwork[`/api/images/art_crop/${gray}.jpg`], null);
	assert.equal(`/api/images/art_crop/${unasked}.jpg` in artwork, false);
	// A sidecar from an older measurer counts as missing, so it is downloaded again.
	assert.deepEqual(missingSidecars([`/api/images/art_crop/${stale}.jpg`], artworkFor([`/api/images/art_crop/${stale}.jpg`], sidecars)), [{ variant: 'art_crop', id: stale }]);
	assert.deepEqual(
		missingSidecars([local, `/api/images/art_crop/${gray}.jpg`, `/api/images/art_crop/${unasked}.jpg`, `/images/art_crop/${unasked}.jpg`, 'https://example.com/x.png', null], artwork),
		[{ variant: 'art_crop', id: unasked }]
	);
});

test('a deck asks about its icon, banner card and first card with art', () => {
	assert.deepEqual(
		deckArtworkUrls({ icon: '/i.jpg', bannerCard: { art: '/b.jpg' }, cards: [{ art: '' }, { art: '/c.jpg' }, { art: '/d.jpg' }] }),
		['/i.jpg', '/b.jpg', '/c.jpg']
	);
	assert.deepEqual(deckArtworkUrls({ icon: null, bannerCard: null, cards: [] }), []);
});
