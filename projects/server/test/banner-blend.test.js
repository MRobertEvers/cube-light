const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const zlib = require('node:zlib');
const test = require('node:test');
const express = require('express');
const { Database } = require('../build/src/database/app/database');
const { createRoutesDecks } = require('../build/src/routes/decks');
const { PathBuilder } = require('../build/src/utils/PathBuilder');

function png(width, height, noise = false) {
	function chunk(name, data) {
		const type = Buffer.from(name), raw = Buffer.concat([type, data]);
		let crc = 0xffffffff;
		for (const byte of raw) { crc ^= byte; for (let i = 0; i < 8; i++) crc = crc & 1 ? (crc >>> 1) ^ 0xedb88320 : crc >>> 1; }
		const len = Buffer.alloc(4), end = Buffer.alloc(4); len.writeUInt32BE(data.length); end.writeUInt32BE((crc ^ 0xffffffff) >>> 0);
		return Buffer.concat([len, raw, end]);
	}
	const header = Buffer.alloc(13); header.writeUInt32BE(width); header.writeUInt32BE(height, 4); header[8] = 8; header[9] = 2;
	const raw = Buffer.alloc((width * 3 + 1) * height, 0);
	let seed = 12345;
	if (noise) for (let y = 0; y < height; y++) for (let x = 1; x <= width * 3; x++) {
		seed ^= seed << 13; seed ^= seed >>> 17; seed ^= seed << 5;
		raw[y * (width * 3 + 1) + x] = seed & 255;
	}
	return Buffer.concat([Buffer.from('89504e470d0a1a0a', 'hex'), chunk('IHDR', header), chunk('IDAT', zlib.deflateSync(raw)), chunk('IEND', Buffer.alloc(0))]);
}

test('generated banners persist, have immutable URLs, and reject stale renders', async () => {
	const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'cube-blend-'));
	const file = path.join(directory, 'app.sqlite');
	let database = await Database.Sqlite(file);
	const id = String(await database.createDeck('Blend test'));
	const publicId = (await database.getDeck(id)).PublicId;
	const art = '/images/art_crop/1e8f9ef5-762f-438f-b06b-9c30c4e364f0.jpg';
	await database.setDeckArt(Number(id), art, 'test-card');
	const app = express();
	app.use(createRoutesDecks(new PathBuilder('/decks'), database, { queryCardInfo: async () => [], getCardDataByUuids: async () => [] }));
	const server = await new Promise(resolve => { const server = app.listen(0, '127.0.0.1', () => resolve(server)); });
	try {
		const base = `http://127.0.0.1:${server.address().port}`;
		const url = `${base}/decks/${publicId}`;
		const config = { method: 'multiband', contentAware: true, position: 0.5, width: 0.18, surface: '#f2e9e6' };
		const crop = { desktop: { x: 0.5, y: 0.5, zoom: 1 }, mobile: { x: 0.5, y: 0.5, zoom: 1 } };
		const images = { desktop: png(1440, 224, true).toString('base64'), mobile: png(720, 224).toString('base64'), tile: png(640, 224).toString('base64') };
		const payload = { source: base + art, config, crop, images };
		const put = body => fetch(`${url}/banner-blend`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
		assert.equal((await put(payload)).status, 204);
		let response = await (await fetch(url)).json();
		assert.deepEqual(response.bannerBlend.config, config);
		const imageUrl = response.bannerBlend.images.desktop;
		const image = await fetch(imageUrl);
		assert.equal(image.status, 200);
		assert.match(image.headers.get('cache-control'), /immutable/);
		assert.deepEqual(Buffer.from(await image.arrayBuffer()), Buffer.from(images.desktop, 'base64'));
		assert.equal((await fetch(imageUrl, { headers: { 'If-None-Match': image.headers.get('etag') } })).status, 304);
		assert.equal((await put({ ...payload, config: { ...config, width: 9 } })).status, 400);
		assert.equal((await put({ ...payload, images: { ...images, tile: images.desktop } })).status, 400);
		assert.equal((await put({ ...payload, source: base + '/wrong.jpg' })).status, 409);
		await database.setDeckBannerCrop(id, JSON.stringify({ ...crop, desktop: { ...crop.desktop, x: 1.1 } }));
		assert.equal((await put(payload)).status, 409);
		response = await (await fetch(url)).json();
		assert.equal(response.bannerBlend.images, null);
		await database.close(); database = await Database.Sqlite(file);
		assert.deepEqual(JSON.parse((await database.getDeckBannerBlend(id)).ConfigJson), config);
		const revision = imageUrl.split('/').pop().replace('.png', '');
		assert.deepEqual(Buffer.from(await database.getDeckBannerBlendImage(id, 'desktop', revision)), Buffer.from(images.desktop, 'base64'));
	} finally {
		await new Promise(resolve => server.close(resolve)); await database.close(); fs.rmSync(directory, { recursive: true, force: true });
	}
});
