import { build } from 'vite';
import { readdir, readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import path from 'node:path';

/**
 * Builds ShellWorker into `<outDir>/sw.js`, with the list of built files to precache
 * and a build id derived from their contents. Runs after the app build.
 * @param {{ root: string, outDir: string }} options
 */
export async function buildShellWorker(options) {
    const { root, outDir } = options;
    const files = ['/index.html', '/manifest.webmanifest', '/favicon.png', '/favicon-32.png', '/apple-touch-icon.png'];
    for (const name of await readdir(path.join(outDir, 'assets'))) {
        // The OCR runtime and models are tens of megabytes and only needed for scanning; they are cached on first use.
        const optionalOcr = /^(ort|worker-entry|experimental-scanner|card-ocr|title-index|paddle-region-reader)/.test(name);
        if (!optionalOcr && /\.(js|css|wasm|woff2?|svg|png)$/.test(name)) files.push(`/assets/${name}`);
    }
    const digest = createHash('sha256');
    for (const file of files) digest.update(await readFile(path.join(outDir, file.slice(1))));
    await build({
        configFile: false, root, publicDir: false, logLevel: 'warn',
        define: { __PRECACHE__: JSON.stringify(files), __BUILD_ID__: JSON.stringify(digest.digest('hex').slice(0, 16)) },
        build: { outDir, emptyOutDir: false, copyPublicDir: false, lib: { entry: path.join(root, 'src/workers/shell/shell.worker.ts'), name: 'ShellWorker', formats: ['iife'], fileName: function () { return 'sw.js'; } } }
    });
}
