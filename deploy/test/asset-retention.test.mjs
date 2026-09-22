import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, rm, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { retainClientAssets } from '../../scripts/retain-client-assets.mjs';

async function startServer(root, retained) {
  const child = spawn(process.execPath, [new URL('../serve-client.mjs', import.meta.url).pathname], {
    env: { ...process.env, CLIENT_DIST_ROOT: root, CLIENT_ASSET_ROOT: retained, HOST: '127.0.0.1', PORT: '0' },
    stdio: ['ignore', 'pipe', 'pipe']
  });
  const origin = await new Promise((resolve, reject) => {
    child.on('error', reject);
    child.on('exit', code => reject(Error(`Static server exited ${code}`)));
    child.stdout.on('data', chunk => {
      const match = String(chunk).match(/http:\/\/127\.0\.0\.1:\d+/);
      if (match) resolve(match[0]);
    });
  });
  return { child, origin };
}

test('a newer deployment serves old lazy modules and workers without reviving models or HTML', { timeout: 15000 }, async () => {
  const temp = await mkdtemp(path.join(tmpdir(), 'cube-assets-'));
  const old = path.join(temp, 'old');
  const current = path.join(temp, 'current');
  const retained = path.join(temp, 'retained');
  let server;
  try {
    await mkdir(path.join(old, 'assets'), { recursive: true });
    await mkdir(path.join(current, 'assets'), { recursive: true });
    await writeFile(path.join(old, 'assets/verifier-oldhash.js'), 'export const version="old";');
    await writeFile(path.join(old, 'assets/worker-oldhash.js'), 'self.postMessage("old worker");');
    await writeFile(path.join(current, 'assets/main-newhash.js'), 'export const version="new";');
    await writeFile(path.join(current, 'index.html'), '<main>current release</main>');
    await retainClientAssets({ source: path.join(old, 'assets'), destination: retained });
    await retainClientAssets({ source: path.join(current, 'assets'), destination: retained });
    await rm(old, { recursive: true });
    // Even accidental retained files outside /assets must never become reachable.
    await mkdir(path.join(retained, 'ocr/models/glm'), { recursive: true });
    await writeFile(path.join(retained, 'ocr/models/glm/config.json'), '{}');
    server = await startServer(current, retained);
    const oldResponse = await fetch(server.origin + '/assets/verifier-oldhash.js');
    assert.equal(oldResponse.status, 200);
    assert.match(oldResponse.headers.get('content-type'), /javascript/);
    assert.match(oldResponse.headers.get('cache-control'), /immutable/);
    assert.equal(await oldResponse.text(), 'export const version="old";');
    assert.equal(await (await fetch(server.origin + '/assets/worker-oldhash.js')).text(), 'self.postMessage("old worker");');
    for (const route of ['/', '/deck/some-deck']) {
      assert.equal(await (await fetch(server.origin + route)).text(), '<main>current release</main>');
    }
    for (const route of ['/assets/missing.js', '/ocr/models/glm/config.json', '/assets/../outside.js']) {
      assert.equal((await fetch(server.origin + route)).status, 404);
    }
    const partial = await fetch(server.origin + '/assets/verifier-oldhash.js', { headers: { Range: 'bytes=0-5' } });
    assert.equal(partial.status, 206);
    assert.equal(await partial.text(), 'export');
    const head = await fetch(server.origin + '/assets/verifier-oldhash.js', { method: 'HEAD' });
    assert.equal(head.status, 200);
    assert.equal(await head.text(), '');
  } finally {
    if (server) {
      const exited = once(server.child, 'exit');
      server.child.kill();
      await exited;
    }
    await rm(temp, { recursive: true, force: true });
  }
});

test('retention is repeatable and refuses conflicting contents at an immutable URL', async () => {
  const temp = await mkdtemp(path.join(tmpdir(), 'cube-assets-'));
  try {
    const source = path.join(temp, 'source');
    const destination = path.join(temp, 'retained');
    await mkdir(source);
    await writeFile(path.join(source, 'module-hash.js'), 'original');
    await retainClientAssets({ source, destination });
    await retainClientAssets({ source, destination });
    await writeFile(path.join(source, 'module-hash.js'), 'different');
    await assert.rejects(retainClientAssets({ source, destination }), /immutable asset/);
    assert.equal(await readFile(path.join(destination, 'module-hash.js'), 'utf8'), 'original');
  } finally {
    await rm(temp, { recursive: true, force: true });
  }
});
