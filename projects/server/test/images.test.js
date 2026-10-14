const test = require('node:test');
const assert = require('node:assert/strict');
const { mkdtemp, readFile, readdir, rm, unlink } = require('node:fs/promises');
const { tmpdir } = require('node:os');
const path = require('node:path');
const { once } = require('node:events');
const { fork } = require('node:child_process');
const express = require('express');
const { ArtCacheImageCache } = require('../build/src/images/ArtCacheImageCache');
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

/**
 * @typedef {Object} Scratch
 * @property {string} root  the art cache folder
 * @property {string} index  this "machine's" index of it
 * @property {(options?: { index?: string, now?: () => number }) => any} open  an ArtCacheImageCache on root
 */

/**
 * Runs body with a fresh art cache folder and index (a temporary folder each), then closes every
 * cache it opened and removes both.
 * @param {(scratch: Scratch) => Promise<void>} body
 */
async function withArtCache(body) {
	const directory = await mkdtemp(path.join(tmpdir(), 'artcache-test-'));
	const opened = [];
	const scratch = {
		root: path.join(directory, 'art'),
		index: path.join(directory, 'index', 'this-machine.sqlite'),
		open(options) {
			const cache = new ArtCacheImageCache(scratch.root, {
				index: scratch.index,
				...options
			});
			opened.push(cache);
			return cache;
		}
	};
	try {
		await body(scratch);
	} finally {
		for (const cache of opened) cache.close();
		await rm(directory, { recursive: true, force: true });
	}
}

function sleep(milliseconds) {
	return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

test('serves a Scryfall image once, persists it, and handles browser caching', () => withArtCache(async (scratch) => {
	let server;
	let downloads = 0;
	try {
		const cache = scratch.open();
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
			await readFile(path.join(scratch.root, 'art_crop', `${id}.jpg`)),
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
			scratch.open(),
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
	}
}));

test('serves a double-faced card\'s back from Scryfall\'s back images, apart from its front', () => withArtCache(async (scratch) => {
	let server;
	const asked = [];
	try {
		const images = new CardImageService(scratch.open(), new NativeImageMeasurer(), async (url) => {
			asked.push(url);
			return new Response(jpeg, { headers: { 'Content-Type': 'image/jpeg' } });
		});
		const app = express();
		app.use(createRoutesImages(images));
		server = app.listen(0, '127.0.0.1');
		await once(server, 'listening');
		const base = `http://127.0.0.1:${server.address().port}/images/normal`;

		const back = await fetch(`${base}/${id}-back.jpg`);
		assert.equal(back.status, 200);
		assert.deepEqual(asked, [`https://cards.scryfall.io/normal/back/6/7/${id}.jpg`]);
		assert.deepEqual(await readFile(path.join(scratch.root, 'normal', `${id}-back.jpg`)), jpeg);

		// The front is its own image, asked for separately.
		assert.equal((await fetch(`${base}/${id}.jpg`)).status, 200);
		assert.deepEqual(asked, [
			`https://cards.scryfall.io/normal/back/6/7/${id}.jpg`,
			`https://cards.scryfall.io/normal/front/6/7/${id}.jpg`
		]);

		// Only `-back` names a face.
		assert.equal((await fetch(`${base}/${id}-side.jpg`)).status, 400);
		assert.equal(cardImageUrl('http://x', id, 'normal', 'back'), `http://x/images/normal/${id}-back.jpg`);
		assert.equal(cardImageUrl('http://x', id, 'normal'), `http://x/images/normal/${id}.jpg`);
	} finally {
		if (server) {
			server.close();
			await once(server, 'close');
		}
	}
}));

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

test('measures an image when it is stored and serves the measurements', () => withArtCache(async (scratch) => {
	let server;
	try {
		const counter = { downloads: 0 };
		const cache = scratch.open();
		const images = new CardImageService(cache, new NativeImageMeasurer(), scryfallServing(twoTone, counter));
		const app = express();
		app.use(cors);
		app.use(createRoutesImages(images));
		server = app.listen(0, '127.0.0.1');
		await once(server, 'listening');
		const base = `http://127.0.0.1:${server.address().port}/images/art_crop/${id}`;

		assert.equal((await fetch(`${base}.jpg`)).status, 200);
		const stored = await cache.getMeta(`art_crop/${id}`);
		// Measurements live in this machine's index, not beside the image in the shared folder.
		assert.deepEqual(await readdir(path.join(scratch.root, 'art_crop')), [`${id}.jpg`]);
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
	}
}));

test('measures images stored without measurements on first request', () => withArtCache(async (scratch) => {
	const cache = scratch.open();
	await cache.set(`art_crop/${id}`, twoTone);
	const counter = { downloads: 0 };
	const images = new CardImageService(cache, new NativeImageMeasurer(), scryfallServing(twoTone, counter));
	const [first, second] = await Promise.all([images.meta(id, 'art_crop'), images.meta(id, 'art_crop')]);
	assert.deepEqual(first, second);
	assert.equal(first.width, 32);
	assert.equal(counter.downloads, 0);
	assert.deepEqual(await cache.getMeta(`art_crop/${id}`), first);
}));

test('an image that cannot be decoded is still served, without measurements', () => withArtCache(async (scratch) => {
	const cache = scratch.open();
	const counter = { downloads: 0 };
	const images = new CardImageService(cache, new NativeImageMeasurer(), scryfallServing(jpeg, counter));
	assert.deepEqual(await images.get(id, 'art_crop'), jpeg);
	assert.equal(await images.meta(id, 'art_crop'), null);
	assert.equal(await cache.getMeta(`art_crop/${id}`), null);
}));

test('measurements from an older measurer are taken again', () => withArtCache(async (scratch) => {
	const cache = scratch.open();
	await cache.set(`art_crop/${id}`, twoTone);
	await cache.setMeta(`art_crop/${id}`, { version: 1, variant: 'art_crop', id, width: 1, height: 1, palette: null });
	const images = new CardImageService(cache, new NativeImageMeasurer(), scryfallServing(twoTone, { downloads: 0 }));
	const meta = await images.meta(id, 'art_crop');
	assert.equal(meta.version, 2);
	assert.equal(meta.width, 32);
	assert.equal(typeof meta.preview, 'string');
}));

/** A stand-in for Scryfall serving image after a pause, counting its requests. */
function slowScryfall(image, counter, milliseconds) {
	return async () => {
		counter.downloads++;
		await sleep(milliseconds);
		return new Response(image, { headers: { 'Content-Type': 'image/jpeg' } });
	};
}

function scryfallMustNotBeCalled() {
	throw new Error('Scryfall should not be called');
}

test('two servers sharing one cache and index download an image once', () => withArtCache(async (scratch) => {
	const counter = { downloads: 0 };
	const first = new CardImageService(scratch.open(), new NativeImageMeasurer(), slowScryfall(twoTone, counter, 400));
	const second = new CardImageService(scratch.open(), new NativeImageMeasurer(), slowScryfall(twoTone, counter, 400));
	const [a, b] = await Promise.all([first.get(id, 'art_crop'), second.get(id, 'art_crop')]);
	assert.deepEqual(a, twoTone);
	assert.deepEqual(b, twoTone);
	assert.equal(counter.downloads, 1);
	// The one that waited reads the other's measurements from the shared index.
	assert.equal((await second.meta(id, 'art_crop')).width, 32);
	assert.equal(counter.downloads, 1);
}));

test('another machine finds the image in the folder without downloading it', () => withArtCache(async (scratch) => {
	const counter = { downloads: 0 };
	const here = new CardImageService(scratch.open(), new NativeImageMeasurer(), scryfallServing(twoTone, counter));
	assert.deepEqual(await here.get(id, 'art_crop'), twoTone);

	const elsewhereCache = scratch.open({ index: path.join(path.dirname(scratch.index), 'other-machine.sqlite') });
	const elsewhere = new CardImageService(elsewhereCache, new NativeImageMeasurer(), scryfallMustNotBeCalled);
	assert.deepEqual(await elsewhere.get(id, 'art_crop'), twoTone);
	// Each machine measures for itself.
	assert.equal(await elsewhereCache.getMeta(`art_crop/${id}`), null);
	assert.equal((await elsewhere.meta(id, 'art_crop')).width, 32);
	assert.equal(counter.downloads, 1);
}));

test('a 404 is recorded and not asked of Scryfall again within the hour', () => withArtCache(async (scratch) => {
	let now = 1_800_000_000;
	const clock = () => now;
	let requests = 0;
	async function missing() {
		requests++;
		return new Response(null, { status: 404 });
	}
	const images = new CardImageService(scratch.open({ now: clock }), new NativeImageMeasurer(), missing);
	assert.equal(await images.get(id, 'art_crop'), null);
	assert.equal(requests, 1);
	assert.equal(await images.get(id, 'art_crop'), null);
	// Nor by another process on this machine.
	const neighbour = new CardImageService(scratch.open({ now: clock }), new NativeImageMeasurer(), missing);
	assert.equal(await neighbour.get(id, 'art_crop'), null);
	assert.equal(requests, 1);

	now += 3601;
	assert.equal(await images.get(id, 'art_crop'), null);
	assert.equal(requests, 2);
}));

test('a failed request throws once and is then not asked again within the hour', () => withArtCache(async (scratch) => {
	let requests = 0;
	async function broken() {
		requests++;
		return new Response('busy', { status: 503 });
	}
	const images = new CardImageService(scratch.open(), new NativeImageMeasurer(), broken);
	await assert.rejects(images.get(id, 'art_crop'), /503/);
	assert.equal(await images.get(id, 'art_crop'), null);
	assert.equal(requests, 1);
	// No temporary file is left behind.
	assert.deepEqual(await readdir(path.join(scratch.root, 'art_crop')).catch(() => []), []);
}));

test('an image deleted behind the cache is forgotten and downloaded again', () => withArtCache(async (scratch) => {
	const counter = { downloads: 0 };
	const images = new CardImageService(scratch.open(), new NativeImageMeasurer(), scryfallServing(twoTone, counter));
	assert.deepEqual(await images.get(id, 'art_crop'), twoTone);
	const file = path.join(scratch.root, 'art_crop', `${id}.jpg`);
	await unlink(file);
	assert.deepEqual(await images.get(id, 'art_crop'), twoTone);
	assert.equal(counter.downloads, 2);
	assert.deepEqual(await readFile(file), twoTone);
}));

test('files already in the folder (an old cache moved in) are taken in', () => withArtCache(async (scratch) => {
	const { mkdir, writeFile } = require('node:fs/promises');
	await mkdir(path.join(scratch.root, 'art_crop'), { recursive: true });
	await writeFile(path.join(scratch.root, 'art_crop', `${id}.jpg`), twoTone);
	const images = new CardImageService(scratch.open(), new NativeImageMeasurer(), scryfallMustNotBeCalled);
	assert.deepEqual(await images.get(id, 'art_crop'), twoTone);
	assert.equal((await images.meta(id, 'art_crop')).height, 24);
}));

/** The child's next message; rejects when it exits first, so a crashed worker fails the test. */
function nextMessage(child) {
	return new Promise((resolve, reject) => {
		function onMessage(message) {
			child.off('exit', onExit);
			resolve(message);
		}
		function onExit(code) {
			child.off('message', onMessage);
			reject(new Error(`worker exited (${code}) before answering`));
		}
		child.once('message', onMessage);
		child.once('exit', onExit);
	});
}

test('server processes sharing one cache and index download an image once', { timeout: 60_000 }, () => withArtCache(async (scratch) => {
	const worker = path.join(__dirname, 'fixtures', 'artcache-worker.js');
	const image = path.join(__dirname, 'fixtures', 'two-tone.jpg');
	const children = [0, 1, 2].map(() =>
		fork(worker, [scratch.root, scratch.index, id, image], { stdio: ['ignore', 'inherit', 'inherit', 'ipc'] })
	);
	try {
		await Promise.all(children.map((child) => nextMessage(child)));
		const results = children.map((child) => nextMessage(child));
		for (const child of children) child.send('go');
		const reports = await Promise.all(results);
		for (const report of reports) {
			assert.equal(report.error, undefined);
			assert.equal(report.same, true);
		}
		assert.equal(reports.reduce((sum, report) => sum + report.downloads, 0), 1);
		await Promise.all(children.map((child) => (child.exitCode === null ? once(child, 'exit') : null)));
	} finally {
		for (const child of children) if (child.exitCode === null) child.kill();
	}
	assert.deepEqual(await readFile(path.join(scratch.root, 'art_crop', `${id}.jpg`)), twoTone);
}));
