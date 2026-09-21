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
const { createRoutesImages } = require('../build/src/routes/images');
const { cors } = require('../build/src/auth/middleware');

const id = '67f4c93b-080c-4196-b095-6a120a221988';
const jpeg = Buffer.from([0xff, 0xd8, 0xff, 0xd9]);

test('serves a Scryfall image once, persists it, and handles browser caching', async () => {
	const directory = await mkdtemp(path.join(tmpdir(), 'mtg-card-images-'));
	let server;
	let downloads = 0;
	try {
		const cache = new FileImageCache(directory);
		const images = new CardImageService(cache, async (url, options) => {
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
