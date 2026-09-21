const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const test = require('node:test');
const { KVStore } = require('../build/Release/kv_store.node');

const store = () => new KVStore(crypto.randomBytes(16));
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

test('set, get, overwrite, and delete', () => {
	const kv = store();
	assert.equal(kv.get('a'), null);
	kv.set('a', 'one');
	kv.set('b', '');
	assert.equal(kv.get('a'), 'one');
	assert.equal(kv.get('b'), '');
	kv.set('a', 'a much longer replacement value ✓');
	assert.equal(kv.get('a'), 'a much longer replacement value ✓');
	kv.set('a', 'x');
	assert.equal(kv.get('a'), 'x');
	assert.equal(kv.size, 2);
	assert.equal(kv.del('a'), true);
	assert.equal(kv.del('a'), false);
	assert.equal(kv.get('a'), null);
	assert.equal(kv.size, 1);
});

test('keys longer than the inline buffer and non-ASCII keys', () => {
	const kv = store();
	const long = 'k'.repeat(10000);
	kv.set(long, 'v');
	kv.set('ключ', 'значение');
	assert.equal(kv.get(long), 'v');
	assert.equal(kv.get('k'.repeat(9999)), null);
	assert.equal(kv.get('ключ'), 'значение');
});

test('expiry, ttl, and persist', async () => {
	const kv = store();
	kv.set('short', 'v', 30);
	kv.set('forever', 'v');
	assert.equal(kv.ttl('forever'), -1);
	assert.equal(kv.ttl('missing'), -2);
	const left = kv.ttl('short');
	assert.ok(left > 0 && left <= 30, `ttl ${left}`);
	kv.set('kept', 'v', 30);
	assert.equal(kv.expire('kept', 0), true);
	await sleep(60);
	assert.equal(kv.get('short'), null);
	assert.equal(kv.ttl('short'), -2);
	assert.equal(kv.get('kept'), 'v');
	assert.equal(kv.expire('short', 1000), false);
});

test('sweep reclaims expired keys without disturbing live ones', async () => {
	const kv = store();
	for (let i = 0; i < 5000; i++) kv.set(`gone:${i}`, 'v', 20);
	for (let i = 0; i < 5000; i++) kv.set(`live:${i}`, String(i));
	await sleep(40);
	let removed = 0;
	for (let pass = 0; pass < 100 && kv.size > 5000; pass++) removed += kv.sweep(1024);
	assert.equal(removed, 5000);
	assert.equal(kv.size, 5000);
	for (let i = 0; i < 5000; i++) assert.equal(kv.get(`live:${i}`), String(i));
});

test('incr counts from zero and keeps the TTL it started with', async () => {
	const kv = store();
	assert.equal(kv.incr('n', 50), 1);
	assert.equal(kv.incr('n', 5000), 2);
	assert.ok(kv.ttl('n') <= 50);
	await sleep(80);
	assert.equal(kv.incr('n'), 1);
	assert.equal(kv.ttl('n'), -1);
	kv.set('neg', '-3');
	assert.equal(kv.incr('neg'), -2);
	kv.set('text', 'abc');
	assert.throws(() => kv.incr('text'), /not an integer/);
});

test('rejects bad arguments', () => {
	assert.throws(() => new KVStore(Buffer.alloc(8)), /16-byte seed/);
	const kv = store();
	assert.throws(() => kv.get(1), /key must be a string/);
	assert.throws(() => kv.set('a', 2), /value must be a string/);
	assert.throws(() => kv.set('a', 'b', -1), /ttl/);
	assert.throws(() => kv.get.call({}, 'a'), TypeError);
});

test('matches a Map under random inserts and deletes', () => {
	const kv = store();
	const model = new Map();
	let seed = 1;
	const random = () => ((seed = (seed * 1103515245 + 12345) >>> 0) % 3000);
	for (let step = 0; step < 200000; step++) {
		const key = `k${random()}`;
		if (step % 3 === 0) {
			assert.equal(kv.del(key), model.delete(key));
		} else {
			kv.set(key, String(step));
			model.set(key, String(step));
		}
	}
	assert.equal(kv.size, model.size);
	for (let i = 0; i < 3000; i++)
		assert.equal(kv.get(`k${i}`), model.get(`k${i}`) ?? null);
});
