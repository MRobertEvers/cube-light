import { test } from 'node:test';
import assert from 'node:assert/strict';
import { indexedDB } from 'fake-indexeddb';
import { IndexedDbDriver } from '../src/platform/indexeddb/indexeddb-driver';

test('a connection the browser closed is reopened for the next transaction', async () => {
	const driver = new IndexedDbDriver('driver-reopen-test', indexedDB);
	await driver.transaction(['meta'], 'readwrite', async (tables) => {
		await tables.put('meta', { partition: 'p', revision: 1 });
	});
	// What iOS Safari does to a backgrounded page: the connection closes under the driver.
	(driver as unknown as { database: IDBDatabase }).database.close();
	const row = await driver.transaction(['meta'], 'readonly', (tables) => tables.get<{ revision: number }>('meta', 'p'));
	assert.equal(row?.revision, 1);
	driver.close();
});
