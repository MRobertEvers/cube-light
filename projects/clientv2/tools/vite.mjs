import { parseArgs } from 'node:util';
import { build, createServer, preview } from 'vite';
import { config } from '../vite.config.mts';
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
	// Without a trusted certificate a LAN origin is not a secure context, so the
	// browser withholds APIs such as the install prompt.
	const certificate = await loadDevCertificate();
	// A publicly trusted certificate is issued for a real domain, so that name
	// has to be accepted alongside the mDNS one the config already allows.
	const acme = await loadAcmeConfig();
	/** @param {typeof config.server} base */
	function serverConfig(base) {
		/** @type {Record<string, unknown>} */
		const result = { proxy: base.proxy, port: base.port };
		if (base.strictPort !== undefined) result.strictPort = base.strictPort;
		result.host = base.host;
		result.allowedHosts = base.allowedHosts;
		if (port !== undefined) result.port = Number(port);
		if (host !== undefined) result.host = host;
		if (open !== undefined) result.open = open;
		if (strictPort !== undefined) result.strictPort = strictPort;
		if (certificate !== null) result.https = certificate;
		if (acme) result.allowedHosts = (config.server.allowedHosts || []).concat([`.${acme.domain}`]);
		return result;
	}
	/** @type {Record<string, unknown>} */
	const options = {
		plugins: config.plugins,
		resolve: config.resolve,
		server: serverConfig(config.server),
		preview: serverConfig(config.preview),
		build: config.build,
		configFile: false
	};
	if (mode !== undefined) options.mode = mode;
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
	const server = await createServer(options);
	await server.listen();
	server.printUrls();
	server.bindCLIShortcuts({ print: true });
}

await main(process.argv.slice(2));
