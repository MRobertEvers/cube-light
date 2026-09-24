import dgram from 'node:dgram';
import net from 'node:net';
import { readFile, stat } from 'node:fs/promises';
import { parseArgs } from 'node:util';
import { pathToFileURL } from 'node:url';
import {
    RCODE_NOERROR,
    RCODE_NXDOMAIN,
    RCODE_SERVFAIL,
    TYPE_A,
    buildResponse,
    parseQuery
} from './dns-message.mjs';
import { isUsableAddress, resolveMdns } from './mdns.mjs';
import { Registry, chooseAddress, parseSubnet, plainAddress, startRegistryServer } from './registry.mjs';
import { createEndpointReader } from './endpoints.mjs';

/**
 * local-dns: a small DNS server for the WireGuard host. It answers `<host>.<zone>` (for
 * example matthew-mbp-m4.local.mrobertevers.com) with that device's private address, and
 * forwards every other query to a public resolver. Device names never go to public DNS.
 *
 * Addresses come from, in order: live registrations (devices announce their tunnel and LAN
 * addresses over the tunnel), the static hosts file, and mDNS. A registered device is answered
 * with its LAN address when the asker's tunnel comes from the same public address (both behind
 * one home router) and with its tunnel address otherwise.
 */

const TYPE_ANY = 255;
const FORWARD_TIMEOUT_MS = 3000;
const NEGATIVE_CACHE_MS = 5000;

/**
 * @typedef {Object} LocalDnsOptions
 * @property {string} zone The private zone, such as local.mrobertevers.com.
 * @property {string} [listen] Address to listen on; 0.0.0.0 by default.
 * @property {number} [port] UDP and TCP port; 53 by default. 0 picks a free one.
 * @property {string} [upstream] Resolver for every other name; 1.1.1.1 by default.
 * @property {number} [upstreamPort] 53 by default.
 * @property {string} [hostsFile] Lines of `name address`, checked before mDNS; reread when it changes.
 * @property {boolean} [mdns] Ask `<host>.local` over multicast DNS; true by default.
 *   Works only when this machine is on the same LAN segment as the devices.
 * @property {number} [ttl] Seconds clients may cache a local answer; 30 by default.
 * @property {number} [registryPort] Accept `POST /register` on `listen` at this port; off when unset.
 * @property {string} [tunnelSubnet] The WireGuard subnet registrants must come from; 10.0.0.0/24 by default.
 * @property {string} [endpointsFile] Written by wg-endpoints.sh: each peer's public address.
 * @property {number} [registrationLifetimeMs] How long a registration lasts unrefreshed; 10 minutes by default.
 * @property {number} [locationTtl] TTL for answers that depend on where the asker is; 10 s by default.
 * @property {(host: string) => Promise<string[]>} [lookupMdns] Replaces the mDNS lookup (tests).
 * @property {(tunnel: string) => Promise<string | undefined>} [publicAddressOf] Replaces the endpoints file (tests).
 * @property {(line: string) => void} [log]
 */

/**
 * @typedef {Object} LocalDnsServer
 * @property {number} port The port both listeners are bound to.
 * @property {number | null} registryPort The registration port, when registrations are on.
 * @property {() => Promise<void>} close
 */

/**
 * Parses a hosts file: `name address` per line, `#` comments. Names are single labels.
 * @param {string} text
 * @returns {Map<string, string>}
 */
export function parseHosts(text) {
    const hosts = new Map();
    for (const line of text.split('\n')) {
        const fields = line.replace(/#.*/, '').trim().split(/\s+/);
        if (fields.length < 2) continue;
        hosts.set(fields[0].toLowerCase(), fields[1]);
    }
    return hosts;
}

/**
 * Starts the UDP and TCP listeners.
 * @param {LocalDnsOptions} options
 * @returns {Promise<LocalDnsServer>}
 */
export async function startLocalDns(options) {
    const {
        zone,
        listen = '0.0.0.0',
        port = 53,
        upstream = '1.1.1.1',
        upstreamPort = 53,
        hostsFile,
        mdns = true,
        ttl = 30,
        registryPort,
        tunnelSubnet = '10.0.0.0/24',
        endpointsFile,
        registrationLifetimeMs = 600000,
        locationTtl = 10,
        lookupMdns = function (host) { return resolveMdns(host); },
        publicAddressOf = createEndpointReader(endpointsFile, 2000),
        log = function () {}
    } = options;
    const registry = new Registry(parseSubnet(tunnelSubnet), registrationLifetimeMs);
    const suffix = `.${zone.toLowerCase()}`;
    const cache = new Map();
    let hosts = { mtimeMs: -1, entries: new Map() };

    async function staticHosts() {
        if (!hostsFile) return hosts.entries;
        try {
            const info = await stat(hostsFile);
            if (info.mtimeMs !== hosts.mtimeMs) hosts = { mtimeMs: info.mtimeMs, entries: parseHosts(await readFile(hostsFile, 'utf8')) };
        } catch (error) {
            log(`Could not read ${hostsFile}: ${error.message}`);
        }
        return hosts.entries;
    }

    /** The addresses for a single-label host, from the hosts file, then mDNS; cached. */
    async function lookup(host) {
        const fixed = (await staticHosts()).get(host);
        if (fixed) return [fixed];
        if (!mdns) return [];
        const cached = cache.get(host);
        if (cached && cached.expires > Date.now()) return cached.addresses;
        const addresses = (await lookupMdns(host)).filter(isUsableAddress);
        cache.set(host, { addresses, expires: Date.now() + (addresses.length ? ttl * 1000 : NEGATIVE_CACHE_MS) });
        return addresses;
    }

    /**
     * The address and TTL for `host` as seen by `asker`, or null when it is unknown.
     * @param {string} host
     * @param {string} asker The querying client's address.
     * @returns {Promise<{ addresses: string[], ttl: number } | null>}
     */
    async function addressFor(host, asker) {
        const entry = registry.find(host);
        if (entry) {
            if (!entry.lan.length) return { addresses: [entry.tunnel], ttl };
            const address = chooseAddress(entry.tunnel, entry.lan, await publicAddressOf(asker), await publicAddressOf(entry.tunnel));
            return { addresses: [address], ttl: locationTtl };
        }
        const addresses = await lookup(host);
        return addresses.length ? { addresses, ttl } : null;
    }

    /**
     * The response to a query for a name in the zone.
     * @param {import('./dns-message.mjs').Question} question
     * @param {string} asker
     */
    async function answer(question, asker) {
        const host = question.name === zone.toLowerCase() ? '' : question.name.slice(0, -suffix.length);
        // The zone itself exists but holds no records; deeper names are never devices.
        if (!host) return buildResponse(question, { rcode: RCODE_NOERROR });
        if (host.includes('.')) return buildResponse(question, { rcode: RCODE_NXDOMAIN });
        const found = await addressFor(host, asker);
        log(`${question.name} for ${asker} → ${found ? found.addresses.join(', ') : 'not found'}`);
        if (!found) return buildResponse(question, { rcode: RCODE_NXDOMAIN });
        // AAAA, HTTPS and other types get an empty answer, so clients fall back to A.
        const wantsA = question.type === TYPE_A || question.type === TYPE_ANY;
        return buildResponse(question, { rcode: RCODE_NOERROR, addresses: wantsA ? found.addresses : [], ttl: found.ttl });
    }

    function inZone(name) {
        return name === zone.toLowerCase() || name.endsWith(suffix);
    }

    function forwardUdp(message) {
        return new Promise((resolve, reject) => {
            const socket = dgram.createSocket('udp4');
            const timer = setTimeout(() => { socket.close(); reject(new Error('Upstream timed out.')); }, FORWARD_TIMEOUT_MS);
            socket.on('error', (error) => { clearTimeout(timer); socket.close(); reject(error); });
            socket.on('message', (reply) => { clearTimeout(timer); socket.close(); resolve(reply); });
            socket.send(message, upstreamPort, upstream);
        });
    }

    function forwardTcp(message) {
        return new Promise((resolve, reject) => {
            const socket = net.connect(upstreamPort, upstream);
            const frames = createFrameReader((reply) => { socket.end(); resolve(reply); });
            socket.setTimeout(FORWARD_TIMEOUT_MS, () => { socket.destroy(); reject(new Error('Upstream timed out.')); });
            socket.on('error', reject);
            socket.on('data', frames);
            socket.write(frame(message));
        });
    }

    /** The response bytes for one query from `asker`, or null to stay silent. */
    async function respond(message, forward, asker) {
        let question = null;
        try { question = parseQuery(message); } catch { return null; }
        if (!question) return null;
        if (inZone(question.name)) return answer(question, asker);
        try { return await forward(message); }
        catch (error) {
            log(`Forwarding ${question.name} failed: ${error.message}`);
            return buildResponse(question, { rcode: RCODE_SERVFAIL });
        }
    }

    const udp = dgram.createSocket('udp4');
    udp.on('message', (message, remote) => {
        void respond(message, forwardUdp, remote.address).then((reply) => {
            if (reply) udp.send(reply, remote.port, remote.address);
        });
    });

    const tcp = net.createServer((socket) => {
        socket.setTimeout(10000, () => socket.destroy());
        socket.on('error', () => socket.destroy());
        socket.on('data', createFrameReader((message) => {
            void respond(message, forwardTcp, plainAddress(socket.remoteAddress)).then((reply) => {
                if (reply && !socket.destroyed) socket.write(frame(reply));
            });
        }));
    });

    await new Promise((resolve, reject) => {
        udp.once('error', reject);
        udp.bind(port, listen, () => { udp.off('error', reject); resolve(); });
    });
    const bound = udp.address().port;
    await new Promise((resolve, reject) => {
        tcp.once('error', reject);
        tcp.listen(bound, listen, () => { tcp.off('error', reject); resolve(); });
    });
    let registryServer = null;
    if (registryPort !== undefined) {
        registryServer = await startRegistryServer({
            registry,
            listen,
            port: registryPort,
            fixedAddress: async function (name) { return (await staticHosts()).get(name); },
            log
        });
    }
    log(`Answering *${suffix} on ${listen}:${bound} (hosts file: ${hostsFile || 'none'}, mDNS: ${mdns ? 'on' : 'off'}, `
        + `registrations: ${registryServer ? `port ${registryServer.address().port}` : 'off'}); forwarding the rest to ${upstream}.`);

    return {
        port: bound,
        registryPort: registryServer ? registryServer.address().port : null,
        close: function () {
            return new Promise((resolve) => {
                udp.close();
                if (registryServer) registryServer.close();
                tcp.close(() => resolve());
            });
        }
    };
}

/**
 * DNS over TCP prefixes each message with its length.
 * @param {Buffer} message
 */
function frame(message) {
    const length = Buffer.alloc(2);
    length.writeUInt16BE(message.length, 0);
    return Buffer.concat([length, message]);
}

/**
 * A `data` handler that reassembles length-prefixed messages and passes each to `onMessage`.
 * @param {(message: Buffer) => void} onMessage
 */
function createFrameReader(onMessage) {
    let pending = Buffer.alloc(0);
    return function (chunk) {
        pending = Buffer.concat([pending, chunk]);
        while (pending.length >= 2 && pending.length >= 2 + pending.readUInt16BE(0)) {
            const length = pending.readUInt16BE(0);
            onMessage(pending.subarray(2, 2 + length));
            pending = pending.subarray(2 + length);
        }
    };
}

async function main() {
    const { values } = parseArgs({
        options: {
            zone: { type: 'string' },
            listen: { type: 'string' },
            port: { type: 'string' },
            upstream: { type: 'string' },
            hosts: { type: 'string' },
            'no-mdns': { type: 'boolean' },
            ttl: { type: 'string' },
            'registry-port': { type: 'string' },
            'tunnel-subnet': { type: 'string' },
            endpoints: { type: 'string' },
            quiet: { type: 'boolean' }
        }
    });
    if (!values.zone) {
        console.error('Usage: node local-dns.mjs --zone local.example.com [--listen 0.0.0.0] [--port 53]\n'
            + '         [--upstream 1.1.1.1] [--hosts hosts.txt] [--no-mdns] [--ttl 30] [--quiet]\n'
            + '         [--registry-port 8053 --tunnel-subnet 10.0.0.0/24 --endpoints /run/local-dns/endpoints]');
        process.exitCode = 1;
        return;
    }
    await startLocalDns({
        zone: values.zone,
        listen: values.listen,
        port: values.port === undefined ? undefined : Number(values.port),
        upstream: values.upstream,
        hostsFile: values.hosts,
        mdns: !values['no-mdns'],
        ttl: values.ttl === undefined ? undefined : Number(values.ttl),
        registryPort: values['registry-port'] === undefined ? undefined : Number(values['registry-port']),
        tunnelSubnet: values['tunnel-subnet'],
        endpointsFile: values.endpoints,
        log: values.quiet ? undefined : function (line) { console.log(`${new Date().toISOString()} ${line}`); }
    });
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href)
    await main().catch((error) => { console.error(error.message); process.exitCode = 1; });
