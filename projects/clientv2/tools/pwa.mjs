import { build } from 'vite';
import { readdir, readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import path from 'node:path';

/** @param {{ root: string, outDir: string, production: boolean }} options */
export async function buildWorker(options) {
    const { root, outDir, production } = options;
    const files = production ? ['/index.html', '/manifest.webmanifest', '/favicon.png', '/apple-touch-icon.png'] : [];
    if (production) {
        for (const name of await readdir(path.join(outDir, 'assets'))) {
            // Lazy application chunks and small WASM runtimes are needed on an offline route.
            const optionalOcr = /^(ort|worker-entry|experimental-scanner|ocr-recognizer|title-index|paddle-region-reader)/.test(name);
            if (!optionalOcr && /\.(js|css|wasm|woff2?|svg|png)$/.test(name)) files.push(`/assets/${name}`);
        }
    }
    const digest = createHash('sha256');
    for (const file of files) digest.update(await readFile(path.join(outDir, file.slice(1))));
    await build({
        configFile: false, root, publicDir: false,
        define: { __PRECACHE__: JSON.stringify(files), __BUILD_ID__: JSON.stringify(production ? digest.digest('hex').slice(0, 16) : 'development') },
        build: { outDir, emptyOutDir: false, copyPublicDir: false, sourcemap: true, lib: { entry: path.join(root, 'src/service-worker/sw.ts'), name: 'ToriMTGWorker', formats: ['iife'], fileName: function () { return 'sw.js'; } } }
    });
}
