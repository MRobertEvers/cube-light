import dgram from 'node:dgram';
import { randomInt } from 'node:crypto';
import { buildQuery, readAddresses } from './dns-message.mjs';

const MDNS_ADDRESS = '224.0.0.251';
const MDNS_PORT = 5353;

/**
 * Whether `address` can be reached from another device: private LAN and VPN ranges,
 * not loopback or link-local, which mDNS replies often include.
 * @param {string} address
 */
export function isUsableAddress(address) {
    const octets = address.split('.').map(Number);
    const first = octets[0];
    const second = octets[1];
    if (first === 10) return true;
    if (first === 172 && second >= 16 && second <= 31) return true;
    if (first === 192 && second === 168) return true;
    if (first === 100 && second >= 64 && second <= 127) return true; // Carrier-grade NAT, used by some VPNs.
    return false;
}

/**
 * @typedef {Object} MdnsOptions
 * @property {number} [timeoutMs] How long to collect replies; 750 by default.
 */

/**
 * The usable IPv4 addresses for `host.local`, asked over multicast DNS. It queries from an
 * ordinary port ("legacy unicast", RFC 6762 §6.7), so responders answer it directly and it
 * never competes with the system's own mDNS responder for port 5353.
 * @param {string} host A single label, such as matthew-mbp-m4.
 * @param {MdnsOptions} [options]
 * @returns {Promise<string[]>}
 */
export function resolveMdns(host, options) {
    const { timeoutMs = 750 } = options === undefined ? {} : options;
    const name = `${host.toLowerCase()}.local`;
    return new Promise((resolve) => {
        const socket = dgram.createSocket({ type: 'udp4' });
        const found = new Set();
        let done = false;
        let timer = null;
        function finish() {
            if (done) return;
            done = true;
            clearTimeout(timer);
            socket.close();
            resolve(Array.from(found).filter(isUsableAddress));
        }
        timer = setTimeout(finish, timeoutMs);
        socket.on('error', finish);
        socket.on('message', (message) => {
            for (const address of readAddresses(message, name)) found.add(address);
            // The first usable answer is enough; a host answers for all its addresses at once.
            if (Array.from(found).some(isUsableAddress)) finish();
        });
        socket.bind(0, () => {
            socket.setMulticastTTL(255);
            socket.send(buildQuery(randomInt(1, 0xffff), name), MDNS_PORT, MDNS_ADDRESS);
        });
    });
}
