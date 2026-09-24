import { parseArgs } from 'node:util';
import { build, createServer, preview } from 'vite';
import { config } from '../vite.config.mts';
import { loadAcmeConfig, loadDevCertificate } from './dev-certs.mjs';
import { certificateDomains, ensureCertificate } from './letsencrypt.mjs';
import { startRegistration } from './local-dns/register.mjs';

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
	// browser withholds the install prompt and the offline shell worker.
	if (command === 'dev' || command === 'preview') await ensureCertificate();
	const certificate = await loadDevCertificate();
	// A publicly trusted certificate is issued for a real domain, so its names have to
	// be accepted alongside the mDNS ones the config already allows. A leading dot
	// matches the name and every subdomain, which also covers a `*.` wildcard.
	const acme = await loadAcmeConfig();
	const certificateHosts = acme ? certificateDomains(acme).map((name) => `.${name.replace(/^\*\./, '')}`) : [];
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
		if (acme) result.allowedHosts = (config.server.allowedHosts || []).concat(certificateHosts);
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
	// Tell local-dns this machine's name and LAN addresses, so phones reach it by name.
	if (acme && acme.localDns && acme.localDns.registry)
		startRegistration({ registry: acme.localDns.registry, name: acme.localDns.name });
	server.bindCLIShortcuts({ print: true });
}

await main(process.argv.slice(2));
