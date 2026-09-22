const test = require('node:test'),
	assert = require('node:assert/strict'),
	fs = require('node:fs'),
	os = require('node:os'),
	path = require('node:path');
const { Database } = require('../build/src/database/app/database');
const { DatabaseSync } = require('node:sqlite');
test('a queued image retains its selected pipeline', async () => {
	const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'cube-pipeline-')),
		file = path.join(dir, 'app.sqlite'),
		db = await Database.Sqlite(file);
	try {
		const deckId = await db.createDeck('Test');
		for (const pipeline of ['card-aware', 'paddle-only']) {
			const id = await db.createWorkItem({
				kind: 'card-image-ocr',
				pipeline,
				deckId,
				fileName: 'photo.jpg',
				contentType: 'image/jpeg',
				image: Buffer.from([1, 2, 3])
			});
			assert.equal((await db.getWorkItem(id)).Pipeline, pipeline);
		}
	} finally {
		await db.close();
		fs.rmSync(dir, { recursive: true, force: true });
	}
});
test('old queued rows migrate to the compact default', async () => {
	const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'cube-pipeline-old-')),
		file = path.join(dir, 'app.sqlite');
	let db = await Database.Sqlite(file);
	const deckId = await db.createDeck('Legacy'),
		id = await db.createWorkItem({
			kind: 'card-image-ocr',
			deckId,
			fileName: 'old.jpg',
			contentType: 'image/jpeg',
			image: Buffer.from([1])
		});
	await db.close();
	const old = new DatabaseSync(file);
	old.exec('ALTER TABLE WorkItems DROP COLUMN Pipeline');
	old.close();
	db = await Database.Sqlite(file);
	try {
		assert.equal((await db.getWorkItem(id)).Pipeline, 'card-aware');
	} finally {
		await db.close();
		fs.rmSync(dir, { recursive: true, force: true });
	}
});
