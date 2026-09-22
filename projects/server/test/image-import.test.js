const test = require('node:test');
const assert = require('node:assert/strict');
const { mkdtemp, rm } = require('node:fs/promises');
const { tmpdir } = require('node:os');
const path = require('node:path');
const { once } = require('node:events');
const express = require('express');
const { Database } = require('../build/src/database/app/database');
const { CardDatabase } = require('../build/src/database/cards/CardDatabase');
const { createRoutesDecks } = require('../build/src/routes/decks');
const { PathBuilder } = require('../build/src/utils/PathBuilder');

test('imports reviewed card names as one deck edit and rejects unknown names atomically', async () => {
	const directory = await mkdtemp(path.join(tmpdir(), 'cube-image-import-'));
	const database = await Database.Sqlite(
		path.join(directory, 'decks.sqlite')
	);
	const cards = new CardDatabase(
		path.join(__dirname, '../build/src/assets/AllPrintings.sqlite')
	);
	const app = express();
	app.use(
		createRoutesDecks(new PathBuilder().routes('/decks'), database, cards)
	);
	const server = app.listen(0, '127.0.0.1');
	try {
		await once(server, 'listening');
		const base = `http://127.0.0.1:${server.address().port}`;
		function request(url, body) {
			return fetch(`${base}${url}`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(body)
			});
		}
		const created = await request('/decks/', { name: 'Photo deck' });
		assert.equal(created.status, 200);
		const { deckId } = await created.json();
		const deck = await database.getDeckByPublicId(deckId);
		assert.ok(deck);
		const rowId = String(deck.DeckId);
		const imported = await request(`/decks/${deckId}/cards/import`, {
			cards: [
				{ name: 'Shock', count: 2 },
				{ name: 'Forest', count: 3 }
			]
		});
		assert.equal(imported.status, 200);
		assert.deepEqual(await imported.json(), { added: 5 });
		let deckCards = await database.getDeckCards(rowId);
		assert.equal(deckCards.length, 2);
		assert.deepEqual(deckCards.map((card) => card.Count).sort(), [2, 3]);
		assert.equal((await database.getDeckEditHistory(rowId)).length, 1);

		const invalid = await request(`/decks/${deckId}/cards/import`, {
			cards: [
				{ name: 'Shock', count: 1 },
				{ name: 'This Is Not A Card', count: 1 }
			]
		});
		assert.equal(invalid.status, 400);
		deckCards = await database.getDeckCards(rowId);
		assert.deepEqual(deckCards.map((card) => card.Count).sort(), [2, 3]);
		assert.equal((await database.getDeckEditHistory(rowId)).length, 1);
	} finally {
		await new Promise((resolve) => server.close(resolve));
		await Promise.all([database.close(), cards.close()]);
		await rm(directory, { recursive: true, force: true });
	}
});
