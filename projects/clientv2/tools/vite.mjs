import { parseArgs } from 'node:util';
import { build, createServer, preview } from 'vite';
import { config } from '../vite.config.mts';
import { buildWorker } from './pwa.mjs';
import { readFile } from 'node:fs/promises';
import path from 'node:path';

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
	const options = {
		...config,
		configFile: false,
		...(mode === undefined ? {} : { mode }),
		server: { ...config.server, ...serverOptions },
		preview: { ...config.preview, ...serverOptions }
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
	server.bindCLIShortcuts({ print: true });
}

await main(process.argv.slice(2));
