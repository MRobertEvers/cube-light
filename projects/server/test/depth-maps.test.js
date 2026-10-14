const test = require('node:test');
const assert = require('node:assert/strict');
const { mkdtemp, readFile, rm, writeFile } = require('node:fs/promises');
const { tmpdir } = require('node:os');
const path = require('node:path');
const { once } = require('node:events');
const { inflateSync } = require('node:zlib');
const express = require('express');
const { ArtCacheImageCache } = require('../build/src/images/ArtCacheImageCache');
const { CardImageService } = require('../build/src/images/card-images');
const { NativeImageMeasurer } = require('../build/src/images/image-measurer');
const { artcache, nowSeconds } = require('../build/src/images/artcache');
const {
	DepthMapService,
	DEFAULT_DEPTH_MODEL,
	depthModelProblem
} = require('../build/src/images/depth/depth-maps');
const { DEPTH_STAMP } = require('../build/src/images/depth/height-map');
const { encodeGreyPng } = require('../build/src/images/depth/png');
const { createRoutesDepthMaps } = require('../build/src/routes/depth-maps');

const jpeg = require('node:fs').readFileSync(path.join(__dirname, 'fixtures/two-tone.jpg'));
const MISSING_ID = '00000000-0000-4000-8000-000000000404';
const haveModel = depthModelProblem(DEFAULT_DEPTH_MODEL) === null;

/**
 * @typedef {Object} Setup
 * @property {string} directory
 * @property {string} index
 * @property {DepthMapService} depthMaps
 * @property {string} url
 * @property {() => Promise<void>} close
 */

/** A server with height maps over a fresh art cache whose Scryfall stand-in serves the fixture.
 * @param {Object} [options]
 * @param {string} [options.modelPath]
 * @param {number} [options.waitMs]
 * @returns {Promise<Setup>} */
async function setUp(options) {
	const { modelPath = DEFAULT_DEPTH_MODEL, waitMs = 60000 } = options === undefined ? {} : options;
	const directory = await mkdtemp(path.join(tmpdir(), 'cube-light-depth-'));
	const index = path.join(directory, 'index.sqlite');
	const cache = new ArtCacheImageCache(path.join(directory, 'art'), { index });
	const images = new CardImageService(cache, new NativeImageMeasurer(), async (url) =>
		url.includes(MISSING_ID)
			? new Response('', { status: 404 })
			: new Response(jpeg, { headers: { 'Content-Type': 'image/jpeg' } })
	);
	const depthMaps = new DepthMapService(images, { root: cache.root, index, modelPath, waitMs });
	const app = express();
	app.use(createRoutesDepthMaps(depthMaps));
	const server = app.listen(0, '127.0.0.1');
	await once(server, 'listening');
	return {
		directory,
		index,
		depthMaps,
		url: `http://127.0.0.1:${server.address().port}`,
		async close() {
			server.close();
			await depthMaps.close();
			cache.close();
			await rm(directory, { recursive: true, force: true });
		}
	};
}

/** A greyscale PNG's size, its torimtg-version and its bytes (filter 0 rows, as ours are). */
function readPng(png) {
	assert.deepEqual([...png.subarray(0, 8)], [137, 80, 78, 71, 13, 10, 26, 10]);
	let at = 8;
	const out = { width: 0, height: 0, version: null, idat: [] };
	while (at < png.length) {
		const length = png.readUInt32BE(at);
		const type = png.toString('latin1', at + 4, at + 8);
		const data = png.subarray(at + 8, at + 8 + length);
		if (type === 'IHDR') {
			out.width = data.readUInt32BE(0);
			out.height = data.readUInt32BE(4);
		}
		if (type === 'tEXt' && out.idat.length === 0) {
			const nul = data.indexOf(0);
			if (data.toString('latin1', 0, nul) === 'torimtg-version') out.version = data.toString('latin1', nul + 1);
		}
		if (type === 'IDAT') out.idat.push(data);
		at += 12 + length;
	}
	const raw = inflateSync(Buffer.concat(out.idat));
	const pixels = Buffer.alloc(out.width * out.height);
	for (let y = 0; y < out.height; y++) {
		assert.equal(raw[y * (out.width + 1)], 0);
		raw.copy(pixels, y * out.width, y * (out.width + 1) + 1, (y + 1) * (out.width + 1));
	}
	return { width: out.width, height: out.height, version: out.version, pixels };
}

test('a model that is only a Git LFS pointer turns height maps off, and says why', async () => {
	const directory = await mkdtemp(path.join(tmpdir(), 'cube-light-depth-'));
	const pointer = path.join(directory, 'model.onnx');
	await writeFile(pointer, 'version https://git-lfs.github.com/spec/v1\noid sha256:afb6\nsize 99060839\n');
	const setup = await setUp({ modelPath: pointer });
	try {
		const status = await (await fetch(`${setup.url}/images/depth`)).json();
		assert.equal(status.available, false);
		assert.match(status.reason, /Git LFS pointer/);
		assert.equal(status.stamp, DEPTH_STAMP);
		const response = await fetch(`${setup.url}/images/depth/67f4c93b-080c-4196-b095-6a120a221988.png`);
		assert.equal(response.status, 404);
	} finally {
		await setup.close();
		await rm(directory, { recursive: true, force: true });
	}
});

test('a height map is made on request, kept in the art cache and served from it', { skip: !haveModel && 'no depth model' }, async () => {
	const setup = await setUp();
	const id = '67f4c93b-080c-4196-b095-6a120a221988';
	try {
		assert.equal((await fetch(`${setup.url}/images/depth/not-an-id.png`)).status, 400);
		assert.equal((await fetch(`${setup.url}/images/depth/${MISSING_ID}.png`)).status, 404); // no art

		const first = await fetch(`${setup.url}/images/depth/${id}.png`);
		assert.equal(first.status, 200);
		assert.equal(first.headers.get('content-type'), 'image/png');
		assert.equal(first.headers.get('cache-control'), 'public, max-age=86400');
		const png = Buffer.from(await first.arrayBuffer());
		const map = readPng(png);
		assert.equal(map.version, DEPTH_STAMP);
		assert.ok(map.width > 0 && map.height > 0);
		// The tone curve spans Arena's bytes: farthest 105, nearest 223.
		assert.equal(Math.min(...map.pixels), 105);
		assert.equal(Math.max(...map.pixels), 223);
		// In the art cache, beside the art, where torimtgd looks for it too.
		assert.deepEqual(await readFile(path.join(setup.directory, 'art', 'depth', `${id}.png`)), png);

		const again = await fetch(`${setup.url}/images/depth/${id}.png`);
		assert.equal(again.status, 200);
		assert.deepEqual(Buffer.from(await again.arrayBuffer()), png);
		const conditional = await fetch(`${setup.url}/images/depth/${id}.png`, {
			headers: { 'If-None-Match': again.headers.get('etag') }
		});
		assert.equal(conditional.status, 304);
	} finally {
		await setup.close();
	}
});

test('a map another process on this machine is making is answered 503 with Retry-After', { skip: !haveModel && 'no depth model' }, async () => {
	const setup = await setUp();
	const id = '11111111-2222-4333-8444-555555555555';
	const neighbour = artcache.open(path.join(setup.directory, 'art'), setup.index);
	try {
		assert.equal(neighbour.claim('depth', id, DEPTH_STAMP, 300, nowSeconds()), true);
		const response = await fetch(`${setup.url}/images/depth/${id}.png`);
		assert.equal(response.status, 503);
		assert.equal(response.headers.get('retry-after'), '3');
		assert.equal(response.headers.get('cache-control'), 'no-store');
	} finally {
		neighbour.close();
		await setup.close();
	}
});

test('a map of an older pipeline is served and made again; a newer one is kept', { skip: !haveModel && 'no depth model' }, async () => {
	const setup = await setUp();
	const older = 'aaaaaaaa-0000-4000-8000-000000000001';
	const newer = 'aaaaaaaa-0000-4000-8000-000000000002';
	const model = DEPTH_STAMP.slice(0, DEPTH_STAMP.lastIndexOf(' pipeline '));
	try {
		const flat = new Uint8Array(4 * 4).fill(160);
		const depthDir = path.join(setup.directory, 'art', 'depth');
		await require('node:fs/promises').mkdir(depthDir, { recursive: true });
		const oldPng = encodeGreyPng(4, 4, flat, `${model} pipeline 0`);
		const newPng = encodeGreyPng(4, 4, flat, `${model} pipeline 99`);
		await writeFile(path.join(depthDir, `${older}.png`), oldPng);
		await writeFile(path.join(depthDir, `${newer}.png`), newPng);

		assert.deepEqual((await setup.depthMaps.get(older)).png, oldPng); // meanwhile, the old one
		assert.deepEqual((await setup.depthMaps.get(newer)).png, newPng);
		// The older map is made again in the background; the newer one is left as it is.
		for (let i = 0; i < 600; i++) {
			const map = readPng(await readFile(path.join(depthDir, `${older}.png`)));
			if (map.version === DEPTH_STAMP) break;
			await new Promise((resolve) => setTimeout(resolve, 50));
		}
		assert.equal(readPng(await readFile(path.join(depthDir, `${older}.png`))).version, DEPTH_STAMP);
		assert.deepEqual(await readFile(path.join(depthDir, `${newer}.png`)), newPng);
	} finally {
		await setup.close();
	}
});
