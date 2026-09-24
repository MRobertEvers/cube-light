import http from 'node:http';
import { isUsableAddress } from './mdns.mjs';

/**
 * Devices announce themselves here over the tunnel ("I am matthew-mbp-m4; my LAN addresses
 * are …"). The registrant's identity is its tunnel address: WireGuard only accepts packets
 * from a peer whose source address is in that peer's AllowedIPs, and a TCP connection cannot
 * be completed with a spoofed source, so a registration from 10.0.0.2 came from that peer.
 */

export const NAME = /^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?$/;

/**
 * @typedef {Object} Registration
 * @property {string} name
 * @property {string} tunnel The registrant's tunnel address, taken from the connection.
 * @property {string[]} lan Its LAN addresses, most preferred first.
 * @property {number} expires Epoch milliseconds.
 */

/**
 * @typedef {Object} Subnet
 * @property {number} base
 * @property {number} mask
 */

/**
 * @param {string} address
 * @returns {number}
 */
function toNumber(address) {
    return address.split('.').reduce((total, octet) => total * 256 + Number(octet), 0);
}

/**
 * Parses `10.0.0.0/24`.
 * @param {string} cidr
 * @returns {Subnet}
 */
export function parseSubnet(cidr) {
    const parts = cidr.split('/');
    const bits = Number(parts[1]);
    const mask = bits === 0 ? 0 : (0xffffffff << (32 - bits)) >>> 0;
    return { base: (toNumber(parts[0]) & mask) >>> 0, mask };
}

/**
 * @param {Subnet} subnet
 * @param {string} address
 */
export function inSubnet(subnet, address) {
    if (!/^\d+\.\d+\.\d+\.\d+$/.test(address)) return false;
    return ((toNumber(address) & subnet.mask) >>> 0) === subnet.base;
}

/**
 * Node reports IPv4 clients of a dual-stack socket as `::ffff:10.0.0.2`.
 * @param {string | undefined} address
 */
export function plainAddress(address) {
    return (address || '').replace(/^::ffff:/, '');
}

export class Registry {
    /**
     * @param {Subnet} tunnel The WireGuard subnet; only its addresses may register.
     * @param {number} lifetimeMs How long a registration lasts without a refresh.
     */
    constructor(tunnel, lifetimeMs) {
        this.tunnel = tunnel;
        this.lifetimeMs = lifetimeMs;
        /** @type {Map<string, Registration>} */
        this.entries = new Map();
    }

    /**
     * Records `name` for the peer at `tunnel`. A name belongs to whichever tunnel address
     * holds it until it expires; `fixed` (from the hosts file) pins it to one address for good.
     * @param {string} tunnel
     * @param {string} name
     * @param {string[]} lan
     * @param {string | undefined} fixed The hosts file's address for `name`, if any.
     * @returns {Registration}
     */
    register(tunnel, name, lan, fixed) {
        const lower = String(name).toLowerCase();
        if (!inSubnet(this.tunnel, tunnel)) throw new RegistryError(403, 'Register over the WireGuard tunnel.');
        if (!NAME.test(lower)) throw new RegistryError(400, 'The name must be a single DNS label.');
        if (fixed && fixed !== tunnel) throw new RegistryError(409, `${lower} belongs to ${fixed}.`);
        const held = this.entries.get(lower);
        if (held && held.tunnel !== tunnel && held.expires > Date.now())
            throw new RegistryError(409, `${lower} is registered to ${held.tunnel}.`);
        const addresses = (Array.isArray(lan) ? lan : [])
            .map(String)
            .filter((address) => isUsableAddress(address) && !inSubnet(this.tunnel, address))
            .slice(0, 4);
        const entry = { name: lower, tunnel, lan: addresses, expires: Date.now() + this.lifetimeMs };
        this.entries.set(lower, entry);
        return entry;
    }

    /**
     * The live registration for `name`, if any.
     * @param {string} name
     * @returns {Registration | null}
     */
    find(name) {
        const entry = this.entries.get(name);
        if (!entry) return null;
        if (entry.expires > Date.now()) return entry;
        this.entries.delete(name);
        return null;
    }
}

export class RegistryError extends Error {
    /**
     * @param {number} status
     * @param {string} message
     */
    constructor(status, message) {
        super(message);
        this.status = status;
    }
}

/**
 * The address to answer with. A device registered with LAN addresses gets its LAN address
 * when the asker connects to the hub from the same public address (both behind one home
 * router), and its tunnel address otherwise.
 * @param {string} tunnel The device's tunnel address.
 * @param {string[]} lan Its LAN addresses.
 * @param {string | undefined} askerPublic The public address the asker's tunnel comes from.
 * @param {string | undefined} devicePublic The public address the device's tunnel comes from.
 */
export function chooseAddress(tunnel, lan, askerPublic, devicePublic) {
    const together = Boolean(askerPublic) && askerPublic === devicePublic;
    return together && lan.length ? lan[0] : tunnel;
}

/**
 * @typedef {Object} RegistryServerOptions
 * @property {Registry} registry
 * @property {string} listen
 * @property {number} port
 * @property {(name: string) => Promise<string | undefined>} fixedAddress The hosts file's address for a name.
 * @property {(line: string) => void} log
 */

/**
 * `POST /register` with `{"name": "...", "lan": ["192.168.1.148"]}`; answers the stored entry.
 * @param {RegistryServerOptions} options
 * @returns {Promise<http.Server>}
 */
export function startRegistryServer(options) {
    const { registry, listen, port, fixedAddress, log } = options;
    const server = http.createServer((request, response) => {
        function reply(status, body) {
            response.writeHead(status, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' });
            response.end(JSON.stringify(body));
        }
        if (request.method !== 'POST' || request.url !== '/register') { reply(404, { error: 'POST /register' }); return; }
        let body = '';
        request.setEncoding('utf8');
        request.on('data', (chunk) => {
            body += chunk;
            if (body.length > 4096) request.destroy();
        });
        request.on('end', () => {
            const tunnel = plainAddress(request.socket.remoteAddress);
            void (async () => {
                try {
                    const payload = JSON.parse(body || '{}');
                    const fixed = await fixedAddress(String(payload.name || '').toLowerCase());
                    const entry = registry.register(tunnel, payload.name, payload.lan, fixed);
                    log(`registered ${entry.name} → tunnel ${entry.tunnel}, LAN ${entry.lan.join(', ') || 'none'}`);
                    reply(200, { name: entry.name, tunnel: entry.tunnel, lan: entry.lan, expiresInSeconds: Math.round((entry.expires - Date.now()) / 1000) });
                } catch (error) {
                    const status = error instanceof RegistryError ? error.status : 400;
                    log(`refused registration from ${tunnel}: ${error.message}`);
                    reply(status, { error: error.message });
                }
            })();
        });
    });
    return new Promise((resolve, reject) => {
        server.once('error', reject);
        server.listen(port, listen, () => { server.off('error', reject); resolve(server); });
    });
}
