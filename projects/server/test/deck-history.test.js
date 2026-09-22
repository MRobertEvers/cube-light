const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');
const express = require('express');
const { Database } = require('../build/src/database/app/database');
const { createRoutesDecksId } = require('../build/src/routes/decks/[id]');
const { PathBuilder } = require('../build/src/utils/PathBuilder');

test('deck history records card UUIDs and copy counts for adds, swaps, and removals', async () => {
	const directory = fs.mkdtempSync(
		path.join(os.tmpdir(), 'cube-light-history-')
	);
	const filepath = path.join(directory, 'app.sqlite');
	const database = await Database.Sqlite(filepath);
	try {
		const deckId = String(await database.createDeck('Test deck'));
		const add = database.applyDeckCardEdit(deckId, [
			{ uuid: 'card-a', action: 'add', count: 3 }
		]);
		assert.deepEqual(add.cardsIn, [{ uuid: 'card-a', count: 3 }]);
		assert.deepEqual(add.cardsOut, []);

		assert.equal(
			database.applyDeckCardEdit(deckId, [
				{ uuid: 'card-a', action: 'set', count: 3 }
			]),
			null
		);
		const swap = database.applyDeckCardEdit(deckId, [
			{ uuid: 'card-b', action: 'add', count: 2 },
			{ uuid: 'card-a', action: 'remove', count: 1 }
		]);
		assert.deepEqual(swap.cardsIn, [{ uuid: 'card-b', count: 2 }]);
		assert.deepEqual(swap.cardsOut, [{ uuid: 'card-a', count: 1 }]);

		database.applyDeckCardEdit(deckId, [
			{ uuid: 'card-a', action: 'set', count: 0 }
		]);
		assert.deepEqual(
			(await database.getDeckCards(deckId)).map((args) => {
				const { Uuid, Count } = args;
				return [Uuid, Count];
			}),
			[['card-b', 2]]
		);
		const history = await database.getDeckEditHistory(deckId);
		assert.equal(history.length, 3);
		assert.deepEqual(history[0].cardsOut, [{ uuid: 'card-a', count: 2 }]);
		assert.deepEqual(history[1].cardsIn, [{ uuid: 'card-b', count: 2 }]);
		assert.deepEqual(history[1].cardsOut, [{ uuid: 'card-a', count: 1 }]);
		assert.ok(history[0].id > history[1].id);
		assert.ok(history.every((edit) => edit.createdAt));

		await database.updateDeckDetails(deckId, 'Renamed deck');
		await database.setDeckPalette(deckId, '{"accent":"#123456"}');
		await database.updateDeckDetails(deckId, 'Renamed deck');
		await database.setDeckPalette(deckId, '{"accent":"#123456"}');
		const updatedHistory = await database.getDeckEditHistory(deckId);
		assert.equal(updatedHistory.length, 5);
		assert.deepEqual(updatedHistory[0].details, [
			{
				field: 'palette',
				before: null,
				after: '{"accent":"#123456"}'
			}
		]);
		assert.deepEqual(updatedHistory[1].details, [
			{
				field: 'name',
				before: 'Test deck',
				after: 'Renamed deck'
			}
		]);
	} finally {
		await database.close();
		fs.rmSync(directory, { recursive: true, force: true });
	}
});

test('history endpoint returns named cards with their UUIDs', async () => {
	const directory = fs.mkdtempSync(
		path.join(os.tmpdir(), 'cube-light-history-api-')
	);
	const database = await Database.Sqlite(path.join(directory, 'app.sqlite'));
	const deckId = String(await database.createDeck('API deck'));
	const publicId = (await database.getDeck(deckId)).PublicId;
	database.applyDeckCardEdit(deckId, [
		{ uuid: 'card-a', action: 'add', count: 2 }
	]);
	const cards = {
		queryCardInfo: async function () {
			return [{ uuid: 'card-a', name: 'Example card' }];
		}
	};
	const app = express();
	app.use(
		createRoutesDecksId(new PathBuilder('/decks/:id'), database, cards)
	);
	const server = await new Promise((resolve) => {
		const listener = app.listen(0, '127.0.0.1', () => resolve(listener));
	});
	try {
		const port = server.address().port;
		const response = await fetch(
			`http://127.0.0.1:${port}/decks/${publicId}/history`
		);
		assert.equal(response.status, 200);
		const body = await response.json();
		assert.equal(body.deckName, 'API deck');
		assert.equal(body.deckId, publicId);
		assert.deepEqual(body.edits[0].cardsIn, [
			{ uuid: 'card-a', count: 2, name: 'Example card' }
		]);
		assert.deepEqual(body.edits[0].cardsOut, []);
		assert.equal(
			(await fetch(`http://127.0.0.1:${port}/decks/999/history`)).status,
			404
		);
	} finally {
		await new Promise((resolve) => server.close(resolve));
		await database.close();
		fs.rmSync(directory, { recursive: true, force: true });
	}
});

test('banner crops are validated, saved, returned, and recorded in history', async () => {
	const directory = fs.mkdtempSync(
		path.join(os.tmpdir(), 'cube-light-crop-api-')
	);
	const database = await Database.Sqlite(path.join(directory, 'app.sqlite'));
	const deckId = String(await database.createDeck('Crop test'));
	const publicId = (await database.getDeck(deckId)).PublicId;
	const app = express();
	app.use(express.json());
	app.use(
		createRoutesDecksId(new PathBuilder('/decks/:id'), database, {
			queryCardInfo: async function () {
				return [];
			},
			getCardRulesByUuids: async function () { return []; },
			getCardDataByUuids: async function () {
				return [];
			}
		})
	);
	const server = await new Promise((resolve) => {
		const listener = app.listen(0, '127.0.0.1', () => resolve(listener));
	});
	try {
		const url = `http://127.0.0.1:${server.address().port}/decks/${publicId}`;
		const crop = {
			desktop: { x: 0.25, y: 0.7, zoom: 1.4 },
			mobile: { x: 1.12, y: 0.3, zoom: 2 }
		};
		function put(bannerCrop) {
			return fetch(`${url}/banner-crop`, {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ bannerCrop })
			});
		}
		assert.equal((await put(crop)).status, 204);
		assert.deepEqual((await (await fetch(url)).json()).bannerCrop, crop);
		assert.equal(
			(await put({ ...crop, mobile: { ...crop.mobile, zoom: 8 } }))
				.status,
			400
		);
		assert.equal(
			(await put({ ...crop, mobile: { ...crop.mobile, x: 1.13 } }))
				.status,
			400
		);
		assert.deepEqual((await (await fetch(url)).json()).bannerCrop, crop);
		function putStyle(topStyle) {
			return fetch(`${url}/top-style`, {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ topStyle })
			});
		}
		assert.equal((await (await fetch(url)).json()).topStyle, 'card');
		assert.equal((await putStyle('full-art')).status, 204);
		assert.equal((await (await fetch(url)).json()).topStyle, 'full-art');
		assert.equal((await putStyle('invalid')).status, 400);
		assert.equal((await (await fetch(url)).json()).topStyle, 'full-art');
		const history = await database.getDeckEditHistory(deckId);
		assert.deepEqual(history[0].details, [
			{ field: 'topStyle', before: 'card', after: 'full-art' }
		]);
		assert.deepEqual(history[1].details, [
			{ field: 'bannerCrop', before: null, after: JSON.stringify(crop) }
		]);
	} finally {
		await new Promise((resolve) => server.close(resolve));
		await database.close();
		fs.rmSync(directory, { recursive: true, force: true });
	}
});
