import { parseArgs } from 'node:util';
import { build, createServer, preview } from 'vite';
import { config } from '../vite.config.mts';
import { buildWorker } from './pwa.mjs';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { loadAcmeConfig, loadDevCertificate } from './dev-certs.mjs';

/** @param {string[]} args */
async function main(args) {
	const { positionals, values } = parseArgs({
		args,
		allowPositionals: true,
		options: {
			port: { type: 'string' },
			host: { type: 'string' },
			open: { type: 'boolean' },
			strictPort: { type: 'boolean' },
			mode: { type: 'string' }
		}
	});
	const [command = 'dev'] = positionals;
	const { port, host, open, strictPort, mode } = values;
	const serverOptions = {
		...(port === undefined ? {} : { port: Number(port) }),
		...(host === undefined ? {} : { host }),
		...(open === undefined ? {} : { open }),
		...(strictPort === undefined ? {} : { strictPort })
	};
	// Without a trusted certificate a LAN origin is not a secure context, so the
	// browser withholds the service worker and the app cannot start up offline.
	const certificate = await loadDevCertificate();
	const secure = certificate === null ? {} : { https: certificate };
	// A publicly trusted certificate is issued for a real domain, so that name
	// has to be accepted alongside the mDNS one the config already allows.
	const acme = await loadAcmeConfig();
	const hosts = acme ? { allowedHosts: [...(config.server.allowedHosts || []), `.${acme.domain}`] } : {};
	const options = {
		...config,
		configFile: false,
		...(mode === undefined ? {} : { mode }),
		server: { ...config.server, ...serverOptions, ...secure, ...hosts },
		preview: { ...config.preview, ...serverOptions, ...secure, ...hosts }
	};
	if (command === 'build') {
		await build(options);
		return;
	}
	if (command === 'preview') {
		const server = await preview(options);
		server.printUrls();
		return;
	}
	if (command !== 'dev') throw new Error(`Unknown Vite command: ${command}`);
	const workerOutput = path.resolve('.pwa-dev');
	await buildWorker({ root: process.cwd(), outDir: workerOutput, production: false });
	options.plugins = [...options.plugins, {
		name: 'development-service-worker',
		configureServer: function (server) {
			server.middlewares.use('/sw.js', async (_req, res) => {
				res.setHeader('Content-Type', 'text/javascript');
				res.setHeader('Cache-Control', 'no-store');
				res.end(await readFile(path.join(workerOutput, 'sw.js')));
			});
		}
	}];
	const server = await createServer(options);
	await server.listen();
	server.printUrls();
	if (!certificate) console.log('  \x1b[2m->  http, so no service worker off localhost. `npm run dev:cert` enables offline start-up on the LAN.\x1b[0m');
	server.bindCLIShortcuts({ print: true });
}

await main(process.argv.slice(2));
