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

/**
 * @param {number} width
 * @param {number} height
 * @param {boolean} [noiseArg]
 */
function png(width, height, noiseArg) {
	const noise = noiseArg === undefined ? false : noiseArg;

	function chunk(name, data) {
		const type = Buffer.from(name),
			raw = Buffer.concat([type, data]);
		let crc = 0xffffffff;
		for (const byte of raw) {
			crc ^= byte;
			for (let i = 0; i < 8; i++)
				crc = crc & 1 ? (crc >>> 1) ^ 0xedb88320 : crc >>> 1;
		}
		const len = Buffer.alloc(4),
			end = Buffer.alloc(4);
		len.writeUInt32BE(data.length);
		end.writeUInt32BE((crc ^ 0xffffffff) >>> 0);
		return Buffer.concat([len, raw, end]);
	}
	const header = Buffer.alloc(13);
	header.writeUInt32BE(width);
	header.writeUInt32BE(height, 4);
	header[8] = 8;
	header[9] = 2;
	const raw = Buffer.alloc((width * 3 + 1) * height, 0);
	let seed = 12345;
	if (noise)
		for (let y = 0; y < height; y++)
			for (let x = 1; x <= width * 3; x++) {
				seed ^= seed << 13;
				seed ^= seed >>> 17;
				seed ^= seed << 5;
				raw[y * (width * 3 + 1) + x] = seed & 255;
			}
	return Buffer.concat([
		Buffer.from('89504e470d0a1a0a', 'hex'),
		chunk('IHDR', header),
		chunk('IDAT', zlib.deflateSync(raw)),
		chunk('IEND', Buffer.alloc(0))
	]);
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
	app.use(
		createRoutesDecks(new PathBuilder('/decks'), database, {
			queryCardInfo: async function () {
				return [];
			},
			getCardDataByUuids: async function () {
				return [];
			}
		})
	);
	const server = await new Promise((resolve) => {
		const server = app.listen(0, '127.0.0.1', () => resolve(server));
	});
	try {
		const base = `http://127.0.0.1:${server.address().port}`;
		const url = `${base}/decks/${publicId}`;
		const config = {
			method: 'multiband',
			contentAware: true,
			position: 0.5,
			width: 0.18,
			surface: '#f2e9e6'
		};
		const crop = {
			desktop: { x: 0.5, y: 0.5, zoom: 1 },
			mobile: { x: 0.5, y: 0.5, zoom: 1 }
		};
		const images = {
			desktop: png(1440, 224, true).toString('base64'),
			mobile: png(720, 224).toString('base64'),
			tile: png(640, 224).toString('base64')
		};
		const payload = { source: base + art, config, crop, images };
		function put(body) {
			return fetch(`${url}/banner-blend`, {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(body)
			});
		}
		assert.equal((await put(payload)).status, 204);
		let response = await (await fetch(url)).json();
		assert.deepEqual(response.bannerBlend.config, config);
		const imageUrl = response.bannerBlend.images.desktop;
		const image = await fetch(imageUrl);
		assert.equal(image.status, 200);
		assert.match(image.headers.get('cache-control'), /immutable/);
		assert.deepEqual(
			Buffer.from(await image.arrayBuffer()),
			Buffer.from(images.desktop, 'base64')
		);
		assert.equal(
			(
				await fetch(imageUrl, {
					headers: { 'If-None-Match': image.headers.get('etag') }
				})
			).status,
			304
		);
		assert.equal(
			(await put({ ...payload, config: { ...config, width: 9 } })).status,
			400
		);
		assert.equal(
			(
				await put({
					...payload,
					images: { ...images, tile: images.desktop }
				})
			).status,
			400
		);
		assert.equal(
			(await put({ ...payload, source: base + '/wrong.jpg' })).status,
			409
		);
		await database.setDeckBannerCrop(
			id,
			JSON.stringify({ ...crop, desktop: { ...crop.desktop, x: 1.1 } })
		);
		assert.equal((await put(payload)).status, 409);
		response = await (await fetch(url)).json();
		assert.equal(response.bannerBlend.images, null);
		await database.close();
		database = await Database.Sqlite(file);
		assert.deepEqual(
			JSON.parse((await database.getDeckBannerBlend(id)).ConfigJson),
			config
		);
		const revision = imageUrl.split('/').pop().replace('.png', '');
		assert.deepEqual(
			Buffer.from(
				await database.getDeckBannerBlendImage(id, 'desktop', revision)
			),
			Buffer.from(images.desktop, 'base64')
		);
	} finally {
		await new Promise((resolve) => server.close(resolve));
		await database.close();
		fs.rmSync(directory, { recursive: true, force: true });
	}
});

test('v2 subject-protection configs validate, persist, change the revision, and keep history compact', async () => {
	const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'cube-blend-v2-'));
	const file = path.join(directory, 'app.sqlite');
	let database = await Database.Sqlite(file);
	const id = String(await database.createDeck('Blend v2'));
	const publicId = (await database.getDeck(id)).PublicId;
	const art = '/images/art_crop/bbbf8c3a-6c74-42fd-bb8d-61e3f0a77848.jpg';
	await database.setDeckArt(Number(id), art, 'test-card');
	const app = express();
	app.use(
		createRoutesDecks(new PathBuilder('/decks'), database, {
			queryCardInfo: async function () {
				return [];
			},
			getCardDataByUuids: async function () {
				return [];
			}
		})
	);
	const server = await new Promise((resolve) => {
		const server = app.listen(0, '127.0.0.1', () => resolve(server));
	});
	try {
		const base = `http://127.0.0.1:${server.address().port}`;
		const url = `${base}/decks/${publicId}`;
		const crop = {
			desktop: { x: 0.5, y: 0.5, zoom: 1 },
			mobile: { x: 0.5, y: 0.5, zoom: 1 }
		};
		const images = {
			desktop: png(1440, 224).toString('base64'),
			mobile: png(720, 224).toString('base64'),
			tile: png(640, 224).toString('base64')
		};
		function put(body) {
			return fetch(`${url}/banner-blend`, {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(body)
			});
		}
		const protection = {
			source: base + art,
			rect: { x: 0.2, y: 0.05, width: 0.66, height: 0.9 },
			strokes: [
				{
					label: 'foreground',
					radius: 0.02,
					points: [0.5, 0.1, 0.52, 0.12]
				},
				{ label: 'background', radius: 0.03, points: [0.9, 0.9] }
			]
		};
		const config = {
			version: 2,
			method: 'multiband',
			contentAware: true,
			position: 0.5,
			width: 0.18,
			surface: '#f2e9e6',
			protectSubject: true,
			protection,
			feather: 4,
			decontamination: 0.9
		};

		// Existing (v1) artifacts written by the previous release keep working after migration.
		const legacy = {
			method: 'poisson',
			contentAware: true,
			position: 0.49,
			width: 0.13,
			surface: '#f2e9e6'
		};
		assert.equal(
			(await put({ source: base + art, config: legacy, crop, images }))
				.status,
			204
		);
		const legacyUrl = (await (await fetch(url)).json()).bannerBlend.images
			.desktop;
		assert.deepEqual(
			JSON.parse((await database.getDeckBannerBlend(id)).ConfigJson),
			legacy
		);

		async function bad(mutate) {
			const c = structuredClone(config);
			mutate(c);
			return (await put({ source: base + art, config: c, crop, images }))
				.status;
		}
		assert.equal(
			await bad((c) => {
				c.feather = 40;
			}),
			400
		);
		assert.equal(
			await bad((c) => {
				c.decontamination = 2;
			}),
			400
		);
		assert.equal(
			await bad((c) => {
				c.protection.rect.x = 0.9;
			}),
			400
		);
		assert.equal(
			await bad((c) => {
				c.protection.strokes[0].points.push(0.5);
			}),
			400
		);
		assert.equal(
			await bad((c) => {
				c.protection.strokes[0].label = 'maybe';
			}),
			400
		);
		assert.equal(
			await bad((c) => {
				c.protection.strokes = Array.from(
					{ length: 65 },
					() => c.protection.strokes[0]
				);
			}),
			400
		);
		assert.equal(
			await bad((c) => {
				c.extra = 1;
			}),
			400
		);
		assert.equal(
			await bad((c) => {
				c.version = 1;
			}),
			400
		);
		assert.equal(
			await bad((c) => {
				c.protection = null;
				c.protectSubject = false;
			}),
			204
		);
		assert.equal(
			(await put({ source: base + art, config, crop, images })).status,
			204
		);
		const response = await (await fetch(url)).json();
		assert.deepEqual(response.bannerBlend.config, config);
		const protectedUrl = response.bannerBlend.images.desktop;
		assert.notEqual(protectedUrl, legacyUrl);

		// Identical images under a different algorithm version or protection get a different immutable URL.
		assert.equal(
			(
				await put({
					source: base + art,
					config: { ...config, version: 3 },
					crop,
					images
				})
			).status,
			204
		);
		const versionUrl = (await (await fetch(url)).json()).bannerBlend.images
			.desktop;
		assert.notEqual(versionUrl, protectedUrl);
		assert.equal((await fetch(versionUrl)).status, 200);

		const history = await (await fetch(`${url}/history`)).json();
		const values = history.edits
			.flatMap((edit) => edit.details)
			.filter((d) => d.field === 'bannerBlend')
			.map((d) => d.after);
		assert.ok(values.length >= 2);
		for (const value of values)
			assert.ok(
				!value.includes('points'),
				'history omits brush point lists'
			);

		// Reload: config (with protection mask) and images persist across restarts.
		const revision = versionUrl.split('/').pop().replace('.png', '');
		await database.close();
		database = await Database.Sqlite(file);
		const saved = JSON.parse(
			(await database.getDeckBannerBlend(id)).ConfigJson
		);
		assert.deepEqual(saved.protection, protection);
		assert.deepEqual(
			Buffer.from(
				await database.getDeckBannerBlendImage(id, 'desktop', revision)
			),
			Buffer.from(images.desktop, 'base64')
		);
	} finally {
		await new Promise((resolve) => server.close(resolve));
		await database.close();
		fs.rmSync(directory, { recursive: true, force: true });
	}
});

test('migration adds HistoryJson without disturbing blends saved by the previous schema', async () => {
	const directory = fs.mkdtempSync(
		path.join(os.tmpdir(), 'cube-blend-migrate-')
	);
	const file = path.join(directory, 'app.sqlite');
	let database = await Database.Sqlite(file);
	try {
		const id = String(await database.createDeck('Old blend'));
		await database.setDeckArt(Number(id), '/images/art_crop/x.jpg', 'card');
		const legacy = JSON.stringify({
			method: 'multiband',
			contentAware: true,
			position: 0.5,
			width: 0.18,
			surface: '#f2e9e6'
		});
		const images = {
			desktop: png(1440, 224),
			mobile: png(720, 224),
			tile: png(640, 224)
		};
		assert.equal(
			await database.setDeckBannerBlend(
				id,
				'/images/art_crop/x.jpg',
				'/images/art_crop/x.jpg',
				null,
				legacy,
				'a'.repeat(64),
				images
			),
			true
		);
		// Recreate the pre-migration table shape (no HistoryJson), as written by the previous release.
		database.db.exec(
			'ALTER TABLE DeckBannerBlends DROP COLUMN HistoryJson'
		);
		await database.close();
		database = await Database.Sqlite(file);
		const row = await database.getDeckBannerBlend(id);
		assert.equal(row.ConfigJson, legacy);
		assert.equal(row.Revision, 'a'.repeat(64));
		assert.deepEqual(
			Buffer.from(
				await database.getDeckBannerBlendImage(
					id,
					'desktop',
					'a'.repeat(64)
				)
			),
			images.desktop
		);
	} finally {
		await database.close();
		fs.rmSync(directory, { recursive: true, force: true });
	}
});

test("decks without chosen art save and serve blends for their first card's art", async () => {
	const directory = fs.mkdtempSync(
		path.join(os.tmpdir(), 'cube-blend-fallback-')
	);
	const file = path.join(directory, 'app.sqlite');
	const database = await Database.Sqlite(file);
	const id = String(await database.createDeck('Fallback art'));
	const publicId = (await database.getDeck(id)).PublicId;
	const scryfallId = '1e8f9ef5-762f-438f-b06b-9c30c4e364f0';
	const card = {
		uuid: 'card-1',
		name: 'Guttersnipe',
		scryfallId,
		types: 'Creature',
		manaCost: '{2}{R}'
	};
	await database.addDeckCards(id, [{ uuid: card.uuid, count: 1 }]);
	const app = express();
	app.use(
		createRoutesDecks(new PathBuilder('/decks'), database, {
			queryCardInfo: async function () {
				return [card];
			},
			getCardDataByUuids: async function () {
				return [card];
			}
		})
	);
	const server = await new Promise((resolve) => {
		const server = app.listen(0, '127.0.0.1', () => resolve(server));
	});
	try {
		const base = `http://127.0.0.1:${server.address().port}`;
		const url = `${base}/decks/${publicId}`;
		const before = await (await fetch(url)).json();
		assert.equal(before.icon, `${base}/images/art_crop/${scryfallId}.jpg`);
		const config = {
			method: 'multiband',
			contentAware: true,
			position: 0.5,
			width: 0.18,
			surface: '#f2e9e6'
		};
		const crop = {
			desktop: { x: 0.5, y: 0.5, zoom: 1 },
			mobile: { x: 0.5, y: 0.5, zoom: 1 }
		};
		const images = {
			desktop: png(1440, 224).toString('base64'),
			mobile: png(720, 224).toString('base64'),
			tile: png(640, 224).toString('base64')
		};
		const response = await fetch(`${url}/banner-blend`, {
			method: 'PUT',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ source: before.icon, config, crop, images })
		});
		assert.equal(response.status, 204);
		const after = await (await fetch(url)).json();
		assert.deepEqual(after.bannerBlend.config, config);
		assert.ok(after.bannerBlend.images);
		const list = await (await fetch(`${base}/decks`)).json();
		assert.ok(
			list.find((deck) => deck.deckId === publicId).bannerBlend.images
		);
	} finally {
		await new Promise((resolve) => server.close(resolve));
		await database.close();
		fs.rmSync(directory, { recursive: true, force: true });
	}
});
