const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');
const { DatabaseSync } = require('node:sqlite');
const express = require('express');
const { Database } = require('../build/src/database/app/database');
const { createRoutesDecks } = require('../build/src/routes/decks');
const { createRoutes_Collections } = require('../build/src/routes/collections');
const { createRoutes_StorageLocations } = require('../build/src/routes/storage-locations');
const { PathBuilder } = require('../build/src/utils/PathBuilder');

test('existing rows get stable typed public IDs and API routes reject row IDs', async () => {
	const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'cube-light-public-ids-'));
	const filepath = path.join(directory, 'app.sqlite');
	const legacy = new DatabaseSync(filepath);
	legacy.exec(`
		CREATE TABLE Decks (DeckId INTEGER PRIMARY KEY, Name TEXT NOT NULL, Art TEXT, Owner INTEGER,
			CreatedAt TEXT NOT NULL, UpdatedAt TEXT NOT NULL);
		CREATE TABLE Collections (CollectionId INTEGER PRIMARY KEY, Name TEXT NOT NULL,
			CreatedAt TEXT NOT NULL, UpdatedAt TEXT NOT NULL);
		CREATE TABLE StorageLocations (StorageLocationId INTEGER PRIMARY KEY, Name TEXT NOT NULL,
			CreatedAt TEXT NOT NULL, UpdatedAt TEXT NOT NULL);
		INSERT INTO Decks VALUES (7, 'Old deck', NULL, NULL, '2020-01-01', '2020-01-01');
		INSERT INTO Collections VALUES (8, 'Old collection', '2020-01-01', '2020-01-01');
		INSERT INTO StorageLocations VALUES (9, 'Old shelf', '2020-01-01', '2020-01-01');
	`);
	legacy.close();

	let database = await Database.Sqlite(filepath);
	let server;
	try {
		const deckId = (await database.getDeck('7')).PublicId;
		const collectionId = (await database.getCollection(8)).PublicId;
		const locationId = (await database.getStorageLocation(9)).PublicId;
		assert.match(deckId, /^deck_[A-Za-z0-9_-]{16}$/);
		assert.match(collectionId, /^collection_[A-Za-z0-9_-]{16}$/);
		assert.match(locationId, /^location_[A-Za-z0-9_-]{16}$/);
		await database.close();
		database = await Database.Sqlite(filepath);
		assert.equal((await database.getDeck('7')).PublicId, deckId);
		assert.equal((await database.getCollection(8)).PublicId, collectionId);
		assert.equal((await database.getStorageLocation(9)).PublicId, locationId);

		const app = express();
		app.use(createRoutesDecks(new PathBuilder('/decks'), database, {
			queryCardInfo: async () => [], getCardDataByUuids: async () => []
		}));
		app.use('/collection', createRoutes_Collections(database));
		app.use('/storage-location', createRoutes_StorageLocations(database));
		server = await new Promise((resolve) => {
			const listener = app.listen(0, '127.0.0.1', () => resolve(listener));
		});
		const base = `http://127.0.0.1:${server.address().port}`;
		const post = (url, name) => fetch(base + url, {
			method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name })
		});
		const createdDeck = await (await post('/decks', 'New deck')).json();
		const createdCollection = await (await post('/collection', 'New collection')).json();
		const createdLocation = await (await post('/storage-location', 'New shelf')).json();
		assert.match(createdDeck.deckId, /^deck_[A-Za-z0-9_-]{16}$/);
		assert.match(createdCollection.collection_id, /^collection_[A-Za-z0-9_-]{16}$/);
		assert.match(createdLocation.storage_location_id, /^location_[A-Za-z0-9_-]{16}$/);
		assert.notEqual(createdDeck.deckId, deckId);
		assert.equal((await fetch(`${base}/decks/7`)).status, 404);
		assert.equal((await fetch(`${base}/collection/8`)).status, 404);
		assert.equal((await fetch(`${base}/storage-location/9`)).status, 404);
		assert.equal((await fetch(`${base}/decks/${deckId}`)).status, 200);
		assert.equal((await fetch(`${base}/collection/${collectionId}`)).status, 200);
		assert.equal((await fetch(`${base}/storage-location/${locationId}`)).status, 200);
		assert.deepEqual((await (await fetch(`${base}/decks`)).json()).map((deck) => deck.deckId), [deckId, createdDeck.deckId]);
		assert.deepEqual((await (await fetch(`${base}/decks?pageStart=1&pageSize=1`)).json()).map((deck) => deck.deckId), [createdDeck.deckId]);
		assert.deepEqual((await (await fetch(`${base}/collection/search`)).json()).map((item) => item.collection_id), [collectionId, createdCollection.collection_id]);
		assert.deepEqual((await (await fetch(`${base}/storage-location/search`)).json()).map((item) => item.storage_location_id), [locationId, createdLocation.storage_location_id]);
	} finally {
		if (server) await new Promise((resolve) => server.close(resolve));
		await database.close();
		fs.rmSync(directory, { recursive: true, force: true });
	}
});
