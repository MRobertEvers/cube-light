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

// A LAN address is not a trustworthy origin, so the browser withholds service
// workers and the secure-context half of Web Crypto. This is how the app is
// reached from a phone during development.
function lanAddress() {
    for (const entries of Object.values(os.networkInterfaces()))
        for (const entry of entries || [])
            if (entry.family === 'IPv4' && !entry.internal) return entry.address;
    return null;
}

test('syncs from an insecure LAN origin with no service worker', { timeout: 120000 }, async (t) => {
    const host = lanAddress();
    if (!host) return t.skip('No non-loopback IPv4 address available.');
    const directory = await mkdtemp(path.join(os.tmpdir(), 'torimtg-lan-'));
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
    app.use('/api', (req, _res, next) => { requests.push({ path: req.path, bearer: !!req.get('Authorization')?.startsWith('Bearer ') }); next(); });
    app.use('/api', createRoutes(db, cards, {}, { users, kv }));
    const dist = path.resolve('dist');
    app.use(express.static(dist));
    app.use((_req, res) => res.sendFile(path.join(dist, 'index.html')));
    const server = await new Promise((resolve) => { const listener = app.listen(0, '0.0.0.0', () => resolve(listener)); });
    const base = `http://${host}:${server.address().port}`;
    const browser = await chromium.launch({ channel: 'chrome', headless: true });
    const context = await browser.newContext();
    const page = await context.newPage();
    page.setDefaultTimeout(20000);
    const errors = [];
    page.on('pageerror', (error) => errors.push(error.message));
    try {
        await page.goto(base);

        // The premise: this origin really is missing the secure-context APIs.
        const environment = await page.evaluate(() => ({
            secure: window.isSecureContext,
            worker: 'serviceWorker' in navigator,
            subtle: typeof crypto.subtle,
            uuid: typeof crypto.randomUUID
        }));
        assert.equal(environment.secure, false, 'expected an insecure context');
        assert.equal(environment.worker, false, 'expected no service worker support');
        assert.equal(environment.subtle, 'undefined', 'expected crypto.subtle to be absent');
        assert.equal(environment.uuid, 'undefined', 'expected crypto.randomUUID to be absent');

        // Account creation drives the whole auth path through the window host.
        await page.getByLabel('Username', { exact: true }).fill('lan-owner');
        await page.getByLabel('Password', { exact: true }).fill('local-test-password');
        await page.getByLabel('Repeat password', { exact: true }).fill('local-test-password');
        await page.getByRole('button', { name: 'Create account', exact: true }).click();
        await page.getByRole('heading', { name: 'Your decks' }).waitFor();
        assert.equal(await page.evaluate(() => !!navigator.serviceWorker?.controller), false, 'no worker should be controlling the page');

        // Bootstrap completes, proving pull + checkpoint hash verification ran
        // through the pure-JS SHA-256.
        await page.waitForFunction(async () => {
            const db = await new Promise((resolve) => { const request = indexedDB.open('torimtg-v1'); request.onsuccess = () => resolve(request.result); });
            const rows = await new Promise((resolve) => { const request = db.transaction('meta').objectStore('meta').getAll(); request.onsuccess = () => resolve(request.result); });
            db.close(); return rows.some((row) => row.bootstrap.complete);
        });

        // An edit made while offline must queue locally and reach the server later.
        await context.setOffline(true);
        await page.getByRole('button', { name: 'Create a deck' }).click();
        await page.getByRole('button', { name: 'New deck', exact: true }).click();
        await page.getByRole('textbox').last().fill('LAN test deck');
        await page.getByRole('button', { name: 'Ok', exact: true }).click();
        await page.waitForURL(/\/deck\/deck_/);
        await page.getByRole('heading', { name: 'LAN test deck', exact: true }).waitFor();
        const id = new URL(page.url()).pathname.split('/')[2];
        assert.equal(db.sync.readState(id), null, 'the offline edit must not have reached the server yet');

        await context.setOffline(false);
        await page.locator('details summary').filter({ hasText: /saved on this device|Offline|Refresh|Synced/ }).first().click();
        await page.getByRole('button', { name: 'Retry sync', exact: true }).click();
        await page.waitForFunction(async () => {
            const db = await new Promise((resolve) => { const request = indexedDB.open('torimtg-v1'); request.onsuccess = () => resolve(request.result); });
            const rows = await new Promise((resolve) => { const request = db.transaction('outbox').objectStore('outbox').getAll(); request.onsuccess = () => resolve(request.result); });
            db.close(); return rows.length > 0 && rows.every((row) => row.status === 'accepted');
        });
        await expect.poll(() => db.sync.readState(id), { timeout: 20000 }).not.toBeNull();
        assert.equal(db.sync.readState(id).name, 'LAN test deck');
        assert.ok(requests.filter((request) => request.path.startsWith('/sync/v1')).every((request) => request.bearer), 'sync must stay bearer-authenticated');

        // A reload while online must rehydrate from the server-backed replica.
        await page.reload();
        await page.getByRole('heading', { name: 'LAN test deck', exact: true }).waitFor();
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
