import { build } from 'vite';
import { createReadStream } from 'node:fs';
import { readdir, readFile, stat, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import path from 'node:path';

/**
 * The URL ShellWorker precaches the release's page under. A static server ignores the query
 * and answers with index.html; the dev server answers with the committed release's
 * index.html instead of its own development page.
 */
export const SHELL_PAGE = '/index.html?shell=release';

/**
 * Builds ShellWorker into `<outDir>/sw.js`, with the list of built files to precache
 * and a build id derived from their contents. Runs after the app build.
 * @param {{ root: string, outDir: string, buildInfo: string }} options buildInfo is the
 *   app's `__BUILD_INFO__` as JSON, which the worker records as the release it installed.
 */
export async function buildShellWorker(options) {
    const { root, outDir, buildInfo } = options;
    const files = ['/index.html', '/manifest.webmanifest', '/favicon.png', '/favicon-32.png', '/apple-touch-icon.png'];
    for (const name of await readdir(path.join(outDir, 'assets'))) {
        // The OCR runtime and models are tens of megabytes and only needed for scanning; they are cached on first use.
        const optionalOcr = /^(ort|worker-entry|experimental-scanner|card-ocr|title-index|paddle-region-reader)/.test(name);
        if (!optionalOcr && /\.(js|css|wasm|woff2?|svg|png)$/.test(name)) files.push(`/assets/${name}`);
    }
    const digest = createHash('sha256');
    for (const file of files) digest.update(await readFile(path.join(outDir, file.slice(1))));
    const precache = files.map(function (file) { return file === '/index.html' ? SHELL_PAGE : file; });
    const code = await bundleShellWorker({ root, precache, buildId: digest.digest('hex').slice(0, 16), buildInfo });
    await writeFile(path.join(outDir, 'sw.js'), code);
}

/**
 * Serves the committed release (`release/`, written by `npm run release`) from the dev
 * server: its ShellWorker at `/sw.js`, its page at SHELL_PAGE, and its `/assets/`. Pages
 * then load from the release unless the device is in development mode.
 *
 * With no release, `/sw.js` is ShellWorker with nothing to precache, rebuilt when its
 * source changes, and every page comes from the dev server.
 * @param {{ root: string }} options
 * @returns {import('vite').Plugin}
 */
export function serveShellWorker(options) {
    const { root } = options;
    const release = path.join(root, 'release');
    const source = path.join(root, 'src/workers/shell/shell.worker.ts');
    /** @type {Promise<string> | null} */
    let unreleased = null;
    return {
        name: 'serve-shell-worker',
        apply: 'serve',
        configureServer: function (server) {
            server.watcher.on('change', function (file) {
                if (path.resolve(file) === source) unreleased = null;
            });
            server.middlewares.use(function (request, response, next) {
                if (request.method !== 'GET' && request.method !== 'HEAD') return next();
                const url = new URL(request.url || '/', 'http://localhost');
                /** @type {string | null} */
                let file = null;
                if (url.pathname === '/sw.js') file = path.join(release, 'sw.js');
                else if (url.pathname + url.search === SHELL_PAGE) file = path.join(release, 'index.html');
                else if (url.pathname.startsWith('/assets/')) file = path.join(release, decodeURIComponent(url.pathname));
                if (file === null || !file.startsWith(release + path.sep)) return next();
                const found = file;
                stat(found).then(
                    function (info) {
                        if (!info.isFile()) return next();
                        response.setHeader('Content-Type', contentType(found));
                        // Asset names carry a content hash; the worker and page must always be revalidated.
                        response.setHeader('Cache-Control', url.pathname.startsWith('/assets/') ? 'public, max-age=31536000, immutable' : 'no-cache');
                        if (request.method === 'HEAD') return response.end();
                        createReadStream(found).pipe(response);
                    },
                    function () {
                        if (url.pathname !== '/sw.js') return next();
                        unreleased = unreleased || bundleShellWorker({ root, precache: [], buildId: 'unreleased', buildInfo: 'null' });
                        unreleased.then(
                            function (text) {
                                response.setHeader('Content-Type', 'text/javascript');
                                response.setHeader('Cache-Control', 'no-cache');
                                response.end(text);
                            },
                            function (error) {
                                unreleased = null;
                                next(error);
                            }
                        );
                    }
                );
            });
        }
    };
}

/** @param {string} file */
function contentType(file) {
    const types = {
        '.html': 'text/html; charset=utf-8',
        '.js': 'text/javascript; charset=utf-8',
        '.mjs': 'text/javascript; charset=utf-8',
        '.css': 'text/css; charset=utf-8',
        '.json': 'application/json',
        '.wasm': 'application/wasm',
        '.woff': 'font/woff',
        '.woff2': 'font/woff2',
        '.png': 'image/png',
        '.jpg': 'image/jpeg',
        '.svg': 'image/svg+xml'
    };
    return types[/** @type {keyof typeof types} */ (path.extname(file))] || 'application/octet-stream';
}

/**
 * ShellWorker as one classic script, with its precache list and build id filled in.
 * @param {{ root: string, precache: string[], buildId: string, buildInfo: string }} options
 * @returns {Promise<string>}
 */
async function bundleShellWorker(options) {
    const { root, precache, buildId, buildInfo } = options;
    const result = await build({
        configFile: false, root, publicDir: false, logLevel: 'warn',
        define: { __PRECACHE__: JSON.stringify(precache), __SHELL_PAGE__: JSON.stringify(SHELL_PAGE), __BUILD_ID__: JSON.stringify(buildId), __RELEASE__: buildInfo },
        build: { write: false, copyPublicDir: false, lib: { entry: path.join(root, 'src/workers/shell/shell.worker.ts'), name: 'ShellWorker', formats: ['iife'], fileName: function () { return 'sw.js'; } } }
    });
    const outputs = Array.isArray(result) ? result : [result];
    const chunk = outputs[0].output.find(function (item) { return item.type === 'chunk'; });
    if (!chunk || chunk.type !== 'chunk') throw new Error('ShellWorker build produced no script');
    return chunk.code;
}
