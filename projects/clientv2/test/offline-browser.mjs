import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';
import { chromium, expect } from '@playwright/test';

const requireServer = createRequire(new URL('../../server/package.json', import.meta.url));
const express = requireServer('express');
const { Database } = requireServer('./build/src/database/app/database');
const { UserStore } = requireServer('./build/src/auth/UserStore');
const { createKVStore } = requireServer('./build/src/auth/kv-store');
const { createRoutes } = requireServer('./build/src/routes/routes');

test('saves offline, keeps the edit across a reload, and syncs it with bearer auth', { timeout: 120000 }, async () => {
    const directory = await mkdtemp(path.join(os.tmpdir(), 'torimtg-browser-'));
    const db = await Database.Sqlite(path.join(directory, 'app.sqlite'));
    const users = await UserStore.Sqlite(path.join(directory, 'app.sqlite'));
    const kv = createKVStore();
    const cards = {
        queryCardInfo: async function () { return []; },
        getCardDataByUuids: async function () { return []; },
        getCardRulesByUuids: async function () { return []; },
        queryAllCardNames: async function () { return []; }
    };
    const app = express();
    const requests = [];
    app.use('/api', (req, _res, next) => {
        requests.push({ path: req.path, bearer: !!req.get('Authorization')?.startsWith('Bearer '), cookie: !!req.get('Cookie') });
        next();
    });
    app.use('/api', createRoutes(db, cards, {}, { users, kv }));
    const dist = path.resolve('dist');
    app.use(express.static(dist));
    app.use((_req, res) => res.sendFile(path.join(dist, 'index.html')));
    const server = await new Promise((resolve) => { const listener = app.listen(0, '127.0.0.1', () => resolve(listener)); });
    const base = `http://127.0.0.1:${server.address().port}`;
    const browser = await chromium.launch({ channel: 'chrome', headless: true });
    const context = await browser.newContext();
    const page = await context.newPage();
    page.setDefaultTimeout(15000);
    const errors = [];
    page.on('pageerror', (error) => errors.push(error.message));
    try {
        await page.goto(base);
        await page.getByLabel('Username', { exact: true }).fill('offline-owner');
        await page.getByLabel('Password', { exact: true }).fill('local-test-password');
        await page.getByLabel('Repeat password', { exact: true }).fill('local-test-password');
        await page.getByRole('button', { name: 'Create account', exact: true }).click();
        await page.getByRole('heading', { name: 'Your decks' }).waitFor();
        await page.waitForFunction(async () => {
            const db = await new Promise((resolve) => { const request = indexedDB.open('torimtg-v1'); request.onsuccess = () => resolve(request.result); });
            const rows = await new Promise((resolve) => { const request = db.transaction('meta').objectStore('meta').getAll(); request.onsuccess = () => resolve(request.result); });
            db.close(); return rows.some((row) => row.bootstrap.complete);
        });
        await context.setOffline(true);
        await page.getByRole('button', { name: 'Create a deck' }).click();
        await page.getByRole('button', { name: 'New deck', exact: true }).click();
        await page.getByRole('textbox').last().fill('Offline test deck');
        await page.getByRole('button', { name: 'Ok', exact: true }).click();
        await page.waitForURL(/\/deck\/deck_/);
        await page.getByRole('heading', { name: 'Offline test deck', exact: true }).waitFor();
        const id = new URL(page.url()).pathname.split('/')[2];
        assert.equal(db.sync.readState(id), null);
        // There is no service worker, so the page itself needs the network to load.
        await context.setOffline(false);
        await page.reload();
        await page.getByRole('heading', { name: 'Offline test deck', exact: true }).waitFor();
        await page.locator('details summary').filter({ hasText: /saved on this device|Offline|Refresh|Synced/ }).first().click();
        await page.getByRole('button', { name: 'Retry sync', exact: true }).click();
        await page.waitForFunction(async () => {
            const db = await new Promise((resolve) => { const request = indexedDB.open('torimtg-v1'); request.onsuccess = () => resolve(request.result); });
            const rows = await new Promise((resolve) => { const request = db.transaction('outbox').objectStore('outbox').getAll(); request.onsuccess = () => resolve(request.result); });
            db.close(); return rows.length > 0 && rows.every((row) => row.status === 'accepted');
        });
        await expect.poll(() => db.sync.readState(id), { timeout: 20000 }).not.toBeNull();
        assert.ok(db.sync.readState(id), `Missing ${id}; requests: ${JSON.stringify(requests)}; history: ${JSON.stringify(db.sync.readPage(1, 0, []).replicas.map((item) => item.id))}`);
        assert.equal(db.sync.readState(id).name, 'Offline test deck');
        assert.equal(db.sync.history(id).length, 1);
        assert.ok(requests.filter((request) => request.path.startsWith('/sync/v1')).every((request) => request.bearer && !request.cookie));
        // Force the persisted access credential to need renewal, without exposing it to test logs.
        await page.evaluate(async () => {
            const db = await new Promise((resolve) => { const request = indexedDB.open('torimtg-v1'); request.onsuccess = () => resolve(request.result); });
            await new Promise((resolve, reject) => {
                const transaction = db.transaction('control', 'readwrite');
                const store = transaction.objectStore('control');
                const request = store.get('credentials');
                request.onsuccess = () => { const row = request.result; row.value.tokens.accessExpiresAt = 0; store.put(row); };
                transaction.oncomplete = resolve; transaction.onabort = reject;
            });
            db.close();
        });
        await page.getByRole('button', { name: 'Retry sync', exact: true }).click();
        await expect.poll(() => requests.some((request) => request.path === '/auth/refresh'), { timeout: 20000 }).toBe(true);
        assert.equal(db.tokens.revokePrincipal(1), 1);
        await page.getByRole('button', { name: 'Retry sync', exact: true }).click();
        await page.getByRole('heading', { name: 'Your session ended' }).waitFor();
        await page.getByLabel('Password', { exact: true }).fill('local-test-password');
        await page.getByRole('button', { name: 'Sign in', exact: true }).click();
        await page.getByRole('heading', { name: 'Your session ended' }).waitFor({ state: 'hidden' });
        assert.deepEqual(errors, []);
    } catch (error) {
        console.error('Browser state:', await page.locator('body').innerText());
        console.error('Browser errors:', errors);
        throw error;
    } finally {
        await browser.close(); await new Promise((resolve) => server.close(resolve));
        await users.close(); await db.close(); await rm(directory, { recursive: true, force: true });
    }
});
