import { readFile } from 'node:fs/promises';

/**
 * Where each WireGuard peer's tunnel currently comes from. `wg-endpoints.sh` (run as root)
 * writes `<tunnel address> <endpoint>` lines every few seconds, so local-dns itself needs no
 * network-admin privilege to learn them.
 */

/**
 * The host part of `1.2.3.4:5678` or `[2001:db8::1]:5678`; undefined for `(none)`.
 * @param {string} endpoint
 * @returns {string | undefined}
 */
export function endpointHost(endpoint) {
    const bracketed = /^\[([^\]]+)\]:\d+$/.exec(endpoint);
    if (bracketed) return bracketed[1];
    const plain = /^([\d.]+):\d+$/.exec(endpoint);
    return plain ? plain[1] : undefined;
}

/**
 * @param {string} text
 * @returns {Map<string, string>} tunnel address → public address
 */
export function parseEndpoints(text) {
    const endpoints = new Map();
    for (const line of text.split('\n')) {
        const fields = line.trim().split(/\s+/);
        if (fields.length < 2) continue;
        const host = endpointHost(fields[1]);
        if (host) endpoints.set(fields[0], host);
    }
    return endpoints;
}

/**
 * A lookup of a peer's public address by tunnel address, reading `file` at most every `maxAgeMs`.
 * Without a file every lookup is undefined, which makes local-dns answer tunnel addresses.
 * @param {string | undefined} file
 * @param {number} maxAgeMs
 * @returns {(tunnel: string) => Promise<string | undefined>}
 */
export function createEndpointReader(file, maxAgeMs) {
    let cached = new Map();
    let readAt = 0;
    return async function publicAddressOf(tunnel) {
        if (!file) return undefined;
        if (Date.now() - readAt > maxAgeMs) {
            readAt = Date.now();
            cached = await readFile(file, 'utf8').then(parseEndpoints, () => new Map());
        }
        return cached.get(tunnel);
    };
}
