import { build } from 'vite';
import { readdir, readFile, writeFile } from 'node:fs/promises';
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
    const code = await bundleShellWorker({ root, precache: files, buildId: digest.digest('hex').slice(0, 16) });
    await writeFile(path.join(outDir, 'sw.js'), code);
}

/**
 * Serves ShellWorker at `/sw.js` from the dev server, where the client registers it as
 * `/sw.js?mode=development`. It precaches nothing; each server start gets its own build
 * id, and the bundle is rebuilt when the worker's source changes.
 * @param {{ root: string }} options
 * @returns {import('vite').Plugin}
 */
export function serveShellWorker(options) {
    const { root } = options;
    const source = path.join(root, 'src/workers/shell/shell.worker.ts');
    const buildId = Date.now().toString(36);
    /** @type {Promise<string> | null} */
    let code = null;
    return {
        name: 'serve-shell-worker',
        apply: 'serve',
        configureServer: function (server) {
            server.watcher.on('change', function (file) {
                if (path.resolve(file) === source) code = null;
            });
            server.middlewares.use(function (request, response, next) {
                if (request.method !== 'GET' || request.url?.split('?')[0] !== '/sw.js') return next();
                code = code || bundleShellWorker({ root, precache: [], buildId });
                code.then(
                    function (text) {
                        response.setHeader('Content-Type', 'text/javascript');
                        response.setHeader('Cache-Control', 'no-cache');
                        response.end(text);
                    },
                    function (error) {
                        code = null;
                        next(error);
                    }
                );
            });
        }
    };
}

/**
 * ShellWorker as one classic script, with its precache list and build id filled in.
 * @param {{ root: string, precache: string[], buildId: string }} options
 * @returns {Promise<string>}
 */
async function bundleShellWorker(options) {
    const { root, precache, buildId } = options;
    const result = await build({
        configFile: false, root, publicDir: false, logLevel: 'warn',
        define: { __PRECACHE__: JSON.stringify(precache), __BUILD_ID__: JSON.stringify(buildId) },
        build: { write: false, copyPublicDir: false, lib: { entry: path.join(root, 'src/workers/shell/shell.worker.ts'), name: 'ShellWorker', formats: ['iife'], fileName: function () { return 'sw.js'; } } }
    });
    const outputs = Array.isArray(result) ? result : [result];
    const chunk = outputs[0].output.find(function (item) { return item.type === 'chunk'; });
    if (!chunk || chunk.type !== 'chunk') throw new Error('ShellWorker build produced no script');
    return chunk.code;
}
