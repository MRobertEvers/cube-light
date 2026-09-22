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
const { createRoutesWork } = require('../build/src/routes/work');
const { PathBuilder } = require('../build/src/utils/PathBuilder');

test('queues a photo, lets one runner claim it, and adds its cards once', async () => {
	const directory = await mkdtemp(path.join(tmpdir(), 'cube-work-queue-'));
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
	app.use(createRoutesWork(database, cards));
	const server = app.listen(0, '127.0.0.1');
	try {
		await once(server, 'listening');
		const base = `http://127.0.0.1:${server.address().port}`;
		function post(url, body) {
			return fetch(`${base}${url}`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(body)
			});
		}
		const { deckId } = await (
			await post('/decks/', { name: 'Phone deck' })
		).json();
		const photo = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 1, 2, 3]);

		const queued = await fetch(
			`${base}/work/card-image-ocr?deckId=${deckId}&fileName=table.jpg`,
			{
				method: 'POST',
				headers: { 'Content-Type': 'image/jpeg' },
				body: photo
			}
		);
		assert.equal(queued.status, 201);
		const item = await queued.json();
		assert.equal(item.status, 'pending');
		assert.equal(item.deck.name, 'Phone deck');

		const image = await fetch(`${base}/work/${item.workId}/image`);
		assert.equal(image.headers.get('content-type'), 'image/jpeg');
		assert.deepEqual(Buffer.from(await image.arrayBuffer()), photo);

		const claim = await post(`/work/${item.workId}/claim`);
		assert.equal(claim.status, 200);
		const { token } = await claim.json();
		assert.equal(
			(await post(`/work/${item.workId}/claim`)).status,
			409,
			'a second desktop cannot claim a running item'
		);
		assert.equal(
			(
				await post(`/work/${item.workId}/progress`, {
					token,
					completed: 3,
					total: 10
				})
			).status,
			204
		);
		let [listed] = (await (await fetch(`${base}/work`)).json()).items;
		assert.equal(listed.status, 'running');
		assert.deepEqual(listed.progress, { completed: 3, total: 10 });

		assert.equal(
			(
				await post(`/work/${item.workId}/complete`, {
					token: 'x'.repeat(36),
					cards: [{ name: 'Shock', count: 1 }]
				})
			).status,
			409,
			'only the claim holder can complete'
		);
		const completed = await post(`/work/${item.workId}/complete`, {
			token,
			cards: [
				{ name: 'Shock', count: 2 },
				{ name: 'Forest', count: 3 }
			]
		});
		assert.equal(completed.status, 200);
		assert.deepEqual(await completed.json(), {
			added: 5,
			unknownCards: []
		});
		assert.equal(
			(
				await post(`/work/${item.workId}/complete`, {
					token,
					cards: [{ name: 'Shock', count: 2 }]
				})
			).status,
			409,
			'a finished item cannot add its cards again'
		);
		const deck = await database.getDeckByPublicId(deckId);
		const deckCards = await database.getDeckCards(String(deck.DeckId));
		assert.deepEqual(deckCards.map((card) => card.Count).sort(), [2, 3]);
		[listed] = (await (await fetch(`${base}/work`)).json()).items;
		assert.equal(listed.status, 'completed');
		assert.equal(listed.cardsAdded, 5);

		const removed = await fetch(`${base}/work/${item.workId}`, {
			method: 'DELETE'
		});
		assert.equal(removed.status, 204);
		assert.deepEqual(
			(await (await fetch(`${base}/work`)).json()).items,
			[]
		);
	} finally {
		server.close();
		await database.close();
		await rm(directory, { recursive: true, force: true });
	}
});

test('failed items can be retried and deleting a deck removes its queued work', async () => {
	const directory = await mkdtemp(path.join(tmpdir(), 'cube-work-queue-'));
	const database = await Database.Sqlite(
		path.join(directory, 'decks.sqlite')
	);
	try {
		const deckRowId = await database.createDeck('Doomed');
		const workId = await database.createWorkItem({
			kind: 'card-image-ocr',
			deckId: deckRowId,
			fileName: 'photo.jpg',
			contentType: 'image/jpeg',
			image: Buffer.from([1])
		});
		assert.ok(
			await database.claimWorkItem(
				workId,
				'a'.repeat(36),
				new Date(Date.now() + 60000).toISOString()
			)
		);
		assert.ok(
			await database.finishWorkItem(workId, 'a'.repeat(36), {
				status: 'failed',
				error: 'OCR crashed'
			})
		);
		assert.equal((await database.getWorkItem(workId)).Error, 'OCR crashed');
		assert.ok(await database.retryWorkItem(workId));
		assert.equal((await database.getWorkItem(workId)).Status, 'pending');

		// A runner that stopped renewing loses the item to the next claim.
		assert.ok(
			await database.claimWorkItem(
				workId,
				'b'.repeat(36),
				new Date(Date.now() - 1000).toISOString()
			)
		);
		assert.ok(
			await database.claimWorkItem(
				workId,
				'c'.repeat(36),
				new Date(Date.now() + 60000).toISOString()
			)
		);
		assert.equal(
			await database.renewWorkItem(
				workId,
				'b'.repeat(36),
				{ completed: 1, total: 2 },
				new Date(Date.now() + 60000).toISOString()
			),
			false
		);

		// A closing tab hands its item straight back instead of waiting out the lease.
		assert.equal(
			await database.releaseWorkItem(workId, 'b'.repeat(36)),
			false
		);
		assert.ok(await database.releaseWorkItem(workId, 'c'.repeat(36)));
		assert.equal((await database.getWorkItem(workId)).Status, 'pending');

		await database.deleteDeck(String(deckRowId));
		assert.deepEqual(await database.listWorkItems(), []);
	} finally {
		await database.close();
		await rm(directory, { recursive: true, force: true });
	}
});
