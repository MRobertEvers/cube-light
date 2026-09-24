import { GoDaddyDns } from './godaddy.mjs';
import { ManualDns } from './manual.mjs';

/**
 * Where the certificate tooling edits DNS. Callers depend only on this interface;
 * `createDnsProvider` picks the implementation from certs/acme.config.json.
 *
 * @typedef {object} DnsProvider
 * @property {boolean} automatic
 *   True when records change without a person, so it can run unattended (from `npm run dev`).
 * @property {(type: string, name: string, data: string, ttl: number) => Promise<string>} setRecord
 *   Makes `name` (a full domain name) hold exactly one `type` record with `data`, and
 *   resolves to a handle that `removeRecord` accepts.
 * @property {(handle: string) => Promise<void>} removeRecord
 *   Deletes the record `setRecord` returned the handle for.
 */

/**
 * The registered domain whose DNS zone holds `config.domain`.
 * @param {import('../dev-certs.mjs').AcmeConfig} config
 */
export function zoneOf(config) {
    return config.zone || config.domain.split('.').slice(-2).join('.');
}

/**
 * The DNS provider `config.dns` names: "godaddy", or "manual" (the default), which asks
 * a person to edit the records. Falls back to manual when an API provider has no credentials.
 * @param {import('../dev-certs.mjs').AcmeConfig} config
 * @param {(line: string) => void} [log]
 * @returns {Promise<DnsProvider>}
 */
export async function createDnsProvider(config, log) {
    if (log === undefined) log = console.log;
    const zone = zoneOf(config);
    if (config.dns === 'godaddy') {
        const provider = await GoDaddyDns.fromConfig(config, zone);
        if (provider) return provider;
        log('  No GoDaddy token is configured (GODADDY_PAT or godaddyPatFile); falling back to manual DNS.');
    } else if (config.dns && config.dns !== 'manual') {
        throw new Error(`Unknown DNS provider "${config.dns}" in acme.config.json; use "godaddy" or "manual".`);
    }
    return new ManualDns(zone, log);
}
