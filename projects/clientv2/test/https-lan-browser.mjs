import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm, readFile } from 'node:fs/promises';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { fileURLToPath } from 'node:url';
import https from 'node:https';
import os from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';
import { chromium } from '@playwright/test';

const run = promisify(execFile);
const requireServer = createRequire(new URL('../../server/package.json', import.meta.url));
const express = requireServer('express');
const { Database } = requireServer('./build/src/database/app/database');
const { UserStore } = requireServer('./build/src/auth/UserStore');
const { createKVStore } = requireServer('./build/src/auth/kv-store');
const { createRoutes } = requireServer('./build/src/routes/routes');

function lanAddress() {
    for (const entries of Object.values(os.networkInterfaces()))
        for (const entry of entries || [])
            if (entry.family === 'IPv4' && !entry.internal) return entry.address;
    return null;
}

async function selfSigned(directory, host) {
    await run('openssl', ['req', '-x509', '-newkey', 'rsa:2048', '-nodes',
        '-keyout', path.join(directory, 'key.pem'), '-out', path.join(directory, 'cert.pem'),
        '-days', '2', '-subj', '/CN=localhost',
        '-addext', `subjectAltName=DNS:localhost,IP:127.0.0.1,IP:${host}`]);
    return directory;
}

async function mkcertSigned(directory, host) {
    await run('mkcert', ['-cert-file', path.join(directory, 'cert.pem'), '-key-file', path.join(directory, 'key.pem'), host, 'localhost', '127.0.0.1']);
    return directory;
}

async function serve(directory) {
    const db = await Database.Sqlite(path.join(directory, 'app.sqlite'));
    const users = await UserStore.Sqlite(path.join(directory, 'app.sqlite'));
    const cards = {
        queryCardInfo: async function () { return []; },
        getCardDataByUuids: async function () { return []; },
        getCardRulesByUuids: async function () { return []; },
        queryAllCardNames: async function () { return []; }
    };
    const app = express();
    app.use('/api', createRoutes(db, cards, {}, { users, kv: createKVStore() }));
    const dist = fileURLToPath(new URL('../dist', import.meta.url));
    app.use(express.static(dist));
    app.use((_req, res) => res.sendFile(path.join(dist, 'index.html')));
    const server = https.createServer({
        key: await readFile(path.join(directory, 'key.pem')),
        cert: await readFile(path.join(directory, 'cert.pem'))
    }, app);
    await new Promise((resolve) => server.listen(0, '0.0.0.0', resolve));
    return { db, users, server, port: server.address().port };
}

async function signUp(page, name) {
    await page.getByLabel('Username', { exact: true }).fill(name);
    await page.getByLabel('Password', { exact: true }).fill('local-test-password');
    await page.getByLabel('Repeat password', { exact: true }).fill('local-test-password');
    await page.getByRole('button', { name: 'Create account', exact: true }).click();
    await page.getByRole('heading', { name: 'Your decks' }).waitFor();
}

// Chrome reports a secure context for an HTTPS origin whose certificate it was
// told to ignore, but still refuses to register a service worker there. The app
// must stay usable rather than dead-ending on "Can't reach the server".
test('an HTTPS origin whose certificate is untrusted still syncs through the window', { timeout: 180000 }, async (t) => {
    const host = lanAddress();
    if (!host) return t.skip('No non-loopback IPv4 address available.');
    try { await run('openssl', ['version']); } catch { return t.skip('openssl is unavailable.'); }
    const directory = await mkdtemp(path.join(os.tmpdir(), 'torimtg-untrusted-'));
    await selfSigned(directory, host);
    const { db, users, server, port } = await serve(directory);
    const browser = await chromium.launch({ channel: 'chrome', headless: true });
    const context = await browser.newContext({ ignoreHTTPSErrors: true });
    const page = await context.newPage();
    page.setDefaultTimeout(30000);
    const errors = [];
    page.on('pageerror', (error) => errors.push(error.message));
    try {
        await page.goto(`https://${host}:${port}`);
        assert.equal(await page.evaluate(() => window.isSecureContext), true);
        await signUp(page, 'untrusted-owner');
        assert.equal(await page.evaluate(() => !!navigator.serviceWorker.controller), false, 'the worker must not have registered');

        await page.getByRole('button', { name: 'New Deck', exact: true }).click();
        await page.getByRole('textbox').last().fill('Fallback deck');
        await page.getByRole('button', { name: 'Ok', exact: true }).click();
        await page.waitForURL(/\/deck\/deck_/);
        const id = new URL(page.url()).pathname.split('/')[2];
        await page.waitForFunction(async () => {
            const store = await new Promise((resolve) => { const request = indexedDB.open('torimtg-v1'); request.onsuccess = () => resolve(request.result); });
            const rows = await new Promise((resolve) => { const request = store.transaction('outbox').objectStore('outbox').getAll(); request.onsuccess = () => resolve(request.result); });
            store.close(); return rows.length > 0 && rows.every((row) => row.status === 'accepted');
        });
        assert.equal(db.sync.readState(id).name, 'Fallback deck', 'the edit must still reach the server');
        assert.deepEqual(errors, []);
    } catch (error) {
        console.error('Browser state:', await page.locator('body').innerText());
        throw error;
    } finally {
        await browser.close(); await new Promise((resolve) => server.close(resolve));
        await users.close(); await db.close(); await rm(directory, { recursive: true, force: true });
    }
});

// The payoff of a trusted certificate: it makes the LAN origin a real secure
// context, so the worker installs and the app starts up with no network.
test('a LAN origin with a trusted certificate starts up with no network', { timeout: 180000 }, async (t) => {
    const host = lanAddress();
    if (!host) return t.skip('No non-loopback IPv4 address available.');
    // Any locally trusted certificate proves the point; mkcert is simply the
    // quickest way to obtain one in a test. The shipped path is Let's Encrypt.
    try { await run('mkcert', ['-version']); } catch { return t.skip('No locally trusted certificate authority available for this check.'); }
    const directory = await mkdtemp(path.join(os.tmpdir(), 'torimtg-trusted-'));
    await mkcertSigned(directory, host);
    const { db, users, server, port } = await serve(directory);
    // No ignoreHTTPSErrors: the certificate must be trusted on its own merits.
    const browser = await chromium.launch({ channel: 'chrome', headless: true });
    const context = await browser.newContext();
    const page = await context.newPage();
    page.setDefaultTimeout(30000);
    const errors = [];
    page.on('pageerror', (error) => errors.push(error.message));
    try {
        await page.goto(`https://${host}:${port}`);
        assert.equal(await page.evaluate(() => window.isSecureContext), true);
        await signUp(page, 'trusted-owner');
        await page.waitForFunction(() => navigator.serviceWorker.controller !== null);

        await page.getByRole('button', { name: 'New Deck', exact: true }).click();
        await page.getByRole('textbox').last().fill('Offline capable deck');
        await page.getByRole('button', { name: 'Ok', exact: true }).click();
        await page.waitForURL(/\/deck\/deck_/);
        await page.getByRole('heading', { name: 'Offline capable deck', exact: true }).waitFor();

        // The point of the exercise: a cold start with the network cut.
        await context.setOffline(true);
        await page.reload();
        await page.getByRole('heading', { name: 'Offline capable deck', exact: true }).waitFor();
        assert.deepEqual(errors, []);
    } catch (error) {
        console.error('Browser state:', await page.locator('body').innerText());
        throw error;
    } finally {
        await browser.close(); await new Promise((resolve) => server.close(resolve));
        await users.close(); await db.close(); await rm(directory, { recursive: true, force: true });
    }
});
