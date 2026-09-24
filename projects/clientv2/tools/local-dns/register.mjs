import { execFileSync } from 'node:child_process';
import os from 'node:os';

/**
 * Announces this machine to local-dns over the WireGuard tunnel: its name and LAN addresses.
 * local-dns learns the tunnel address from the connection itself, so nothing here is trusted
 * beyond what the tunnel already proves.
 */

// Interfaces that are never the LAN: VPN tunnels, container and VM bridges.
const VIRTUAL = /^(utun|tun|tap|wg|ipsec|ppp|bridge|docker|br-|veth|vmnet|vboxnet|virbr|awdl|llw|lo)/;
// Physical interfaces first, so the server's first choice is the real LAN.
const PHYSICAL = /^(en|eth|wl)/;

/**
 * This machine's name as a single DNS label: the macOS LocalHostName (the `.local` name),
 * else the first label of the host name.
 * @returns {string}
 */
export function machineName() {
    let name = '';
    if (process.platform === 'darwin') {
        try { name = execFileSync('scutil', ['--get', 'LocalHostName'], { encoding: 'utf8' }).trim(); }
        catch { /* Fall back to the host name. */ }
    }
    if (!name) name = os.hostname().split('.')[0];
    return name.toLowerCase().replace(/[^a-z0-9-]/g, '-');
}

/**
 * This machine's private IPv4 addresses on physical interfaces, preferred first.
 * @returns {string[]}
 */
export function lanAddresses() {
    const found = [];
    const interfaces = os.networkInterfaces();
    for (const name of Object.keys(interfaces).sort((a, b) => Number(!PHYSICAL.test(a)) - Number(!PHYSICAL.test(b)))) {
        if (VIRTUAL.test(name)) continue;
        for (const entry of interfaces[name] || [])
            if (entry.family === 'IPv4' && !entry.internal && /^(10\.|172\.(1[6-9]|2\d|3[01])\.|192\.168\.)/.test(entry.address))
                found.push(entry.address);
    }
    return found;
}

/**
 * @typedef {Object} RegistrationOptions
 * @property {string} registry Such as http://10.0.0.1:8053.
 * @property {string} [name] Defaults to machineName().
 * @property {number} [intervalMs] How often to refresh; 2 minutes by default (registrations last 10).
 * @property {(line: string) => void} [log]
 */

/**
 * Registers now and then every `intervalMs`, picking up LAN address changes. Logs when the
 * outcome changes rather than on every refresh. Returns a function that stops it.
 * @param {RegistrationOptions} options
 * @returns {() => void}
 */
export function startRegistration(options) {
    const { registry, name = machineName(), intervalMs = 120000, log = console.log } = options;
    let last = '';
    async function register() {
        let outcome;
        try {
            const response = await fetch(new URL('/register', registry), {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name, lan: lanAddresses() }),
                signal: AbortSignal.timeout(5000)
            });
            const body = await response.json().catch(() => ({}));
            outcome = response.ok
                ? `registered ${body.name} (tunnel ${body.tunnel}, LAN ${(body.lan || []).join(', ') || 'none'}) with ${registry}`
                : `${registry} refused ${name}: ${body.error || response.status}`;
        } catch (error) {
            outcome = `could not reach ${registry} to register ${name} (is WireGuard up?): ${error.message}`;
        }
        if (outcome !== last) log(`  local-dns: ${outcome}`);
        last = outcome;
    }
    void register();
    const timer = setInterval(register, intervalMs);
    timer.unref();
    return function stop() { clearInterval(timer); };
}
