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
	const serverOptions = {
		...(port === undefined ? {} : { port: Number(port) }),
		...(host === undefined ? {} : { host }),
		...(open === undefined ? {} : { open }),
		...(strictPort === undefined ? {} : { strictPort })
	};
	// Without a trusted certificate a LAN origin is not a secure context, so the
	// browser withholds APIs such as the install prompt.
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
	const server = await createServer(options);
	await server.listen();
	server.printUrls();
	server.bindCLIShortcuts({ print: true });
}

await main(process.argv.slice(2));
