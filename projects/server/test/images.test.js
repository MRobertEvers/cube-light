const test = require('node:test');
const assert = require('node:assert/strict');
const { mkdtemp, readFile, rm } = require('node:fs/promises');
const { tmpdir } = require('node:os');
const path = require('node:path');
const { once } = require('node:events');
const express = require('express');
const { FileImageCache } = require('../build/src/images/FileImageCache');
const {
	CardImageService,
	cardImageUrl,
	localDeckArtUrl
} = require('../build/src/images/card-images');
const { NativeImageMeasurer } = require('../build/src/images/image-measurer');
const { createRoutesImages } = require('../build/src/routes/images');
const { cors } = require('../build/src/auth/middleware');
const { thumbHashToApproximateAspectRatio } = require('@torimtg/core');

const id = '67f4c93b-080c-4196-b095-6a120a221988';
const jpeg = Buffer.from([0xff, 0xd8, 0xff, 0xd9]);

test('serves a Scryfall image once, persists it, and handles browser caching', async () => {
	const directory = await mkdtemp(path.join(tmpdir(), 'mtg-card-images-'));
	let server;
	let downloads = 0;
	try {
		const cache = new FileImageCache(directory);
		const images = new CardImageService(cache, new NativeImageMeasurer(), async (url, options) => {
			downloads++;
			assert.equal(
				url,
				`https://cards.scryfall.io/art_crop/front/6/7/${id}.jpg`
			);
			assert.equal(
				options.headers['User-Agent'],
				'CubeLight/1.0 (card image cache)'
			);
			assert.equal(options.headers.Accept, 'image/jpeg');
			return new Response(jpeg, {
				headers: { 'Content-Type': 'image/jpeg' }
			});
		});
		const app = express();
		app.use(cors);
		app.use(createRoutesImages(images));
		server = app.listen(0, '127.0.0.1');
		await once(server, 'listening');
		const url = `http://127.0.0.1:${server.address().port}/images/art_crop/${id}.jpg`;

		const [first, second] = await Promise.all([fetch(url), fetch(url)]);
		assert.equal(first.status, 200);
		assert.equal(second.status, 200);
		assert.deepEqual(Buffer.from(await first.arrayBuffer()), jpeg);
		assert.deepEqual(Buffer.from(await second.arrayBuffer()), jpeg);
		assert.equal(downloads, 1);
		assert.equal(
			first.headers.get('cache-control'),
			'public, max-age=31536000'
		);
		assert.equal(first.headers.get('access-control-allow-origin'), '*');
		assert.equal(first.headers.get('content-type'), 'image/jpeg');
		assert.equal(first.headers.get('content-length'), String(jpeg.length));
		assert.equal(first.headers.get('x-content-type-options'), 'nosniff');
		assert.match(first.headers.get('etag'), /^"[0-9a-f]{64}"$/);
		assert.deepEqual(
			await readFile(path.join(directory, 'art_crop', `${id}.jpg`)),
			jpeg
		);

		const conditional = await fetch(url, {
			headers: { 'If-None-Match': first.headers.get('etag') }
		});
		assert.equal(conditional.status, 304);
		assert.equal(
			conditional.headers.get('etag'),
			first.headers.get('etag')
		);
		assert.equal(
			conditional.headers.get('cache-control'),
			'public, max-age=31536000'
		);
		assert.equal((await conditional.arrayBuffer()).byteLength, 0);
		const head = await fetch(url, { method: 'HEAD' });
		assert.equal(head.status, 200);
		assert.equal(head.headers.get('content-length'), String(jpeg.length));
		assert.equal((await head.arrayBuffer()).byteLength, 0);
		assert.equal(downloads, 1);

		const restarted = new CardImageService(
			new FileImageCache(directory),
			new NativeImageMeasurer(),
			async () => {
				throw new Error(
					'Scryfall should not be called for a cached image'
				);
			}
		);
		assert.deepEqual(await restarted.get(id, 'art_crop'), jpeg);
		assert.equal((await fetch(url.replace(id, 'invalid'))).status, 400);
	} finally {
		if (server) await new Promise((resolve) => server.close(resolve));
		await rm(directory, { recursive: true, force: true });
	}
});

test('rewrites saved Scryfall deck art to the local image endpoint', () => {
	const base = 'http://localhost:4040';
	assert.equal(
		cardImageUrl(base, id, 'small'),
		`${base}/images/small/${id}.jpg`
	);
	assert.equal(
		localDeckArtUrl(
			base,
			`https://cards.scryfall.io/art_crop/front/6/7/${id}.jpg`
		),
		`${base}/images/art_crop/${id}.jpg`
	);
	assert.equal(
		localDeckArtUrl(base, `/images/art_crop/${id}.jpg`),
		`${base}/images/art_crop/${id}.jpg`
	);
});

/** A 32x24 JPEG: three quarters orange-red, one quarter blue. */
const twoTone = require('node:fs').readFileSync(path.join(__dirname, 'fixtures/two-tone.jpg'));

function scryfallServing(image, counter) {
	return async () => {
		counter.downloads++;
		return new Response(image, { headers: { 'Content-Type': 'image/jpeg' } });
	};
}

test('measures an image when it is stored and serves the sidecar', async () => {
	const directory = await mkdtemp(path.join(tmpdir(), 'mtg-card-images-'));
	let server;
	try {
		const counter = { downloads: 0 };
		const images = new CardImageService(new FileImageCache(directory), new NativeImageMeasurer(), scryfallServing(twoTone, counter));
		const app = express();
		app.use(cors);
		app.use(createRoutesImages(images));
		server = app.listen(0, '127.0.0.1');
		await once(server, 'listening');
		const base = `http://127.0.0.1:${server.address().port}/images/art_crop/${id}`;

		assert.equal((await fetch(`${base}.jpg`)).status, 200);
		const stored = JSON.parse(await readFile(path.join(directory, 'art_crop', `${id}.json`), 'utf8'));
		assert.equal(stored.version, 2);
		assert.equal(stored.variant, 'art_crop');
		assert.equal(stored.id, id);
		assert.equal(stored.width, 32);
		assert.equal(stored.height, 24);
		assert.match(stored.palette.accent, /^#[0-9a-f]{6}$/);
		// A ThumbHash of a landscape image: a couple of dozen bytes, not a picture.
		const preview = Buffer.from(stored.preview, 'base64');
		assert.ok(preview.length > 5 && preview.length < 40);
		assert.ok(thumbHashToApproximateAspectRatio(preview) > 1);

		const response = await fetch(`${base}.json`);
		assert.equal(response.status, 200);
		assert.equal(response.headers.get('cache-control'), 'public, max-age=86400');
		assert.deepEqual(await response.json(), stored);
		assert.equal(counter.downloads, 1);
		assert.equal((await fetch(`${base.replace(id, 'invalid')}.json`)).status, 400);
	} finally {
		if (server) await new Promise((resolve) => server.close(resolve));
		await rm(directory, { recursive: true, force: true });
	}
});

test('measures images stored before sidecars existed on first request', async () => {
	const directory = await mkdtemp(path.join(tmpdir(), 'mtg-card-images-'));
	try {
		const cache = new FileImageCache(directory);
		await cache.set(`art_crop/${id}`, twoTone);
		const counter = { downloads: 0 };
		const images = new CardImageService(cache, new NativeImageMeasurer(), scryfallServing(twoTone, counter));
		const [first, second] = await Promise.all([images.meta(id, 'art_crop'), images.meta(id, 'art_crop')]);
		assert.deepEqual(first, second);
		assert.equal(first.width, 32);
		assert.equal(counter.downloads, 0);
		assert.deepEqual(await cache.getMeta(`art_crop/${id}`), first);
	} finally {
		await rm(directory, { recursive: true, force: true });
	}
});

test('an image that cannot be decoded is still served, without a sidecar', async () => {
	const directory = await mkdtemp(path.join(tmpdir(), 'mtg-card-images-'));
	try {
		const cache = new FileImageCache(directory);
		const counter = { downloads: 0 };
		const images = new CardImageService(cache, new NativeImageMeasurer(), scryfallServing(jpeg, counter));
		assert.deepEqual(await images.get(id, 'art_crop'), jpeg);
		assert.equal(await images.meta(id, 'art_crop'), null);
		assert.equal(await cache.getMeta(`art_crop/${id}`), null);
	} finally {
		await rm(directory, { recursive: true, force: true });
	}
});

test('a sidecar from an older measurer is measured again', async () => {
	const directory = await mkdtemp(path.join(tmpdir(), 'mtg-card-images-'));
	try {
		const cache = new FileImageCache(directory);
		await cache.set(`art_crop/${id}`, twoTone);
		await cache.setMeta(`art_crop/${id}`, { version: 1, variant: 'art_crop', id, width: 1, height: 1, palette: null });
		const images = new CardImageService(cache, new NativeImageMeasurer(), scryfallServing(twoTone, { downloads: 0 }));
		const meta = await images.meta(id, 'art_crop');
		assert.equal(meta.version, 2);
		assert.equal(meta.width, 32);
		assert.equal(typeof meta.preview, 'string');
	} finally {
		await rm(directory, { recursive: true, force: true });
	}
});
