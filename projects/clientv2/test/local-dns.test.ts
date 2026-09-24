import { test } from 'node:test';
import assert from 'node:assert/strict';
import dgram from 'node:dgram';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { startLocalDns } from '../tools/local-dns/local-dns.mjs';
import { buildQuery, buildResponse, parseQuery, readAddresses } from '../tools/local-dns/dns-message.mjs';

const ZONE = 'local.example.com';

/** Sends `message` over UDP and resolves to the first reply. */
function ask(port: number, message: Buffer): Promise<Buffer> {
	return new Promise((resolve, reject) => {
		const socket = dgram.createSocket('udp4');
		const timer = setTimeout(() => { socket.close(); reject(new Error('No reply.')); }, 2000);
		socket.on('message', (reply) => { clearTimeout(timer); socket.close(); resolve(reply); });
		socket.send(message, port, '127.0.0.1');
	});
}

function query(name: string, type: number): Buffer {
	const message = buildQuery(1234, name);
	message.writeUInt16BE(type, message.length - 4);
	return message;
}

function rcode(reply: Buffer): number {
	return reply.readUInt16BE(2) & 0xf;
}

/** A fake public resolver that answers every A query with 203.0.113.9. */
async function fakeUpstream(): Promise<{ port: number; close: () => void }> {
	const socket = dgram.createSocket('udp4');
	socket.on('message', (message, remote) => {
		const question = parseQuery(message);
		socket.send(buildResponse(question, { rcode: 0, addresses: ['203.0.113.9'] }), remote.port, remote.address);
	});
	await new Promise<void>((resolve) => socket.bind(0, '127.0.0.1', () => resolve()));
	return { port: socket.address().port, close: () => socket.close() };
}

test('answers zone names from the hosts file and mDNS, and forwards other names', async () => {
	const directory = await mkdtemp(path.join(os.tmpdir(), 'local-dns-'));
	const hostsFile = path.join(directory, 'hosts.txt');
	await writeFile(hostsFile, '# fixed addresses\nNAS 192.168.1.30\n');
	const upstream = await fakeUpstream();
	const asked: string[] = [];
	const server = await startLocalDns({
		zone: ZONE,
		listen: '127.0.0.1',
		port: 0,
		upstream: '127.0.0.1',
		upstreamPort: upstream.port,
		hostsFile,
		lookupMdns: async (host: string) => {
			asked.push(host);
			// Loopback and link-local answers are unusable from another device and are dropped.
			return host === 'laptop' ? ['127.0.0.1', '169.254.3.4', '192.168.1.20'] : [];
		}
	});
	try {
		const fixed = await ask(server.port, query(`nas.${ZONE}`, 1));
		assert.deepEqual(readAddresses(fixed, `nas.${ZONE}`), ['192.168.1.30']);

		const found = await ask(server.port, query(`Laptop.${ZONE}`, 1));
		assert.deepEqual(readAddresses(found, `laptop.${ZONE}`), ['192.168.1.20']);

		// Other types for a known device answer empty, so clients fall back to A.
		const aaaa = await ask(server.port, query(`laptop.${ZONE}`, 28));
		assert.equal(rcode(aaaa), 0);
		assert.equal(aaaa.readUInt16BE(6), 0);

		assert.equal(rcode(await ask(server.port, query(`ghost.${ZONE}`, 1))), 3);
		assert.equal(rcode(await ask(server.port, query(`a.b.${ZONE}`, 1))), 3);

		// The cached laptop answer is reused, and the hosts file is checked before mDNS.
		assert.deepEqual(asked.filter((host) => host === 'laptop'), ['laptop']);
		assert.ok(!asked.includes('nas'));

		const forwarded = await ask(server.port, query('example.org', 1));
		assert.deepEqual(readAddresses(forwarded, 'example.org'), ['203.0.113.9']);
	} finally {
		await server.close();
		upstream.close();
		await rm(directory, { recursive: true, force: true });
	}
});

test('registrations: only tunnel peers, one owner per name, hosts file wins', async () => {
	const { Registry, parseSubnet } = await import('../tools/local-dns/registry.mjs');
	const registry = new Registry(parseSubnet('10.0.0.0/24'), 60000);
	const entry = registry.register('10.0.0.2', 'Laptop', ['10.0.0.2', '192.168.1.20', '8.8.8.8'], undefined);
	// Tunnel and public addresses are not LAN addresses.
	assert.deepEqual(entry.lan, ['192.168.1.20']);
	assert.equal(registry.find('laptop')?.tunnel, '10.0.0.2');
	assert.throws(() => registry.register('10.0.0.9', 'laptop', [], undefined), /registered to 10\.0\.0\.2/);
	assert.throws(() => registry.register('192.168.1.5', 'other', [], undefined), /tunnel/);
	assert.throws(() => registry.register('10.0.0.9', 'nas', [], '10.0.0.3'), /belongs to 10\.0\.0\.3/);
	assert.throws(() => registry.register('10.0.0.9', 'a.b', [], undefined), /single DNS label/);
});

test('answers the LAN address only when asker and device share a public address', async () => {
	const { chooseAddress } = await import('../tools/local-dns/registry.mjs');
	assert.equal(chooseAddress('10.0.0.2', ['192.168.1.20'], '203.0.113.5', '203.0.113.5'), '192.168.1.20');
	assert.equal(chooseAddress('10.0.0.2', ['192.168.1.20'], '198.51.100.7', '203.0.113.5'), '10.0.0.2');
	assert.equal(chooseAddress('10.0.0.2', ['192.168.1.20'], undefined, undefined), '10.0.0.2');
	assert.equal(chooseAddress('10.0.0.2', [], '203.0.113.5', '203.0.113.5'), '10.0.0.2');
});

test('a device that registers is answered by location', async () => {
	let location: string | undefined = 'home';
	const server = await startLocalDns({
		zone: ZONE,
		listen: '127.0.0.1',
		port: 0,
		mdns: false,
		registryPort: 0,
		tunnelSubnet: '127.0.0.0/8',
		publicAddressOf: async () => (location === 'home' ? '203.0.113.5' : undefined)
	});
	try {
		const response = await fetch(`http://127.0.0.1:${server.registryPort}/register`, {
			method: 'POST',
			body: JSON.stringify({ name: 'laptop', lan: ['192.168.1.20'] })
		});
		assert.equal(response.status, 200);
		assert.equal((await response.json()).tunnel, '127.0.0.1');

		const home = await ask(server.port, query(`laptop.${ZONE}`, 1));
		assert.deepEqual(readAddresses(home, `laptop.${ZONE}`), ['192.168.1.20']);

		location = undefined;
		const away = await ask(server.port, query(`laptop.${ZONE}`, 1));
		assert.deepEqual(readAddresses(away, `laptop.${ZONE}`), ['127.0.0.1']);
	} finally {
		await server.close();
	}
});
