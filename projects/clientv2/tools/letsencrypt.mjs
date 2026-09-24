import { execFile } from 'node:child_process';
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { promisify } from 'node:util';
import { pathToFileURL } from 'node:url';
import path from 'node:path';
import { AcmeClient, DIRECTORIES, awaitTxt, newAccountKey, settle } from './acme.mjs';
import { ACME_CONFIG, CERT_DIR, CERT_FILE, KEY_FILE, certificateStatus, loadAcmeConfig } from './dev-certs.mjs';
import { createDnsProvider } from './dns/provider.mjs';

const run = promisify(execFile);
const ACCOUNT_KEY = path.join(CERT_DIR, 'account-key.pem');

/**
 * A new key and certificate request for `domains`. openssl ships with macOS, so this needs nothing installed.
 * @param {string[]} domains
 */
async function makeCsr(domains) {
    const keyPath = path.join(CERT_DIR, 'cert-key.pem');
    const csrPath = path.join(CERT_DIR, 'request.der');
    await run('openssl', ['ecparam', '-genkey', '-name', 'prime256v1', '-noout', '-out', keyPath]);
    const subjectAltName = domains.map((name) => `DNS:${name}`).join(',');
    await run('openssl', ['req', '-new', '-key', keyPath, '-subj', `/CN=${domains[0]}`,
        '-addext', `subjectAltName=${subjectAltName}`, '-outform', 'DER', '-out', csrPath]);
    return { key: await readFile(keyPath), csr: await readFile(csrPath), keyPath, csrPath };
}

/**
 * The names the certificate covers.
 * @param {import('./dev-certs.mjs').AcmeConfig} config
 * @returns {string[]}
 */
export function certificateDomains(config) {
    return [config.domain].concat(config.extraDomains || []);
}

/**
 * @typedef {Object} IssueOptions
 * @property {boolean} production Let's Encrypt production (trusted) rather than staging.
 * @property {(line: string) => void} [log]
 */

/**
 * Obtains a certificate for the configured names by DNS-01 and writes it to certs/,
 * adding and then removing the challenge TXT records through `dns`.
 * @param {import('./dev-certs.mjs').AcmeConfig} config
 * @param {import('./dns/provider.mjs').DnsProvider} dns
 * @param {IssueOptions} options
 */
export async function issueCertificate(config, dns, options) {
    const { production, log = console.log } = options;
    const domains = certificateDomains(config);
    await mkdir(CERT_DIR, { recursive: true });

    let accountKey;
    try { accountKey = await readFile(ACCOUNT_KEY, 'utf8'); }
    catch { accountKey = newAccountKey(); await writeFile(ACCOUNT_KEY, accountKey, { mode: 0o600 }); }

    const client = new AcmeClient(accountKey, production ? DIRECTORIES.production : DIRECTORIES.staging);
    log(`Using Let's Encrypt ${production ? 'production' : 'STAGING'} for ${domains.join(', ')}.`);
    if (!production) log('Staging certificates are not trusted; re-run with --production when this works.\n');
    await client.load();
    await client.register(config.email);

    const order = await client.order(domains);
    const placed = [];
    try {
        for (const authorizationUrl of order.authorizations) {
            const authorization = await client.fetchResource(authorizationUrl);
            if (authorization.status === 'valid') continue;
            const challenge = authorization.challenges.find((entry) => entry.type === 'dns-01');
            if (!challenge) throw new Error(`No dns-01 challenge offered for ${authorization.identifier.value}`);
            const record = `_acme-challenge.${authorization.identifier.value}`;
            const value = client.challengeRecord(challenge.token);

            if (dns.automatic) log(`Adding TXT ${record}...`);
            placed.push({ record, handle: await dns.setRecord('TXT', record, value, 600) });

            log('Waiting for DNS to publish it...');
            const visible = await awaitTxt(record, value, { log });
            if (!visible) throw new Error(`${record} never showed the expected value. Check the record and try again.`);
            // The nameservers are anycast: other regions, where Let's Encrypt looks, can lag behind ours.
            const settleSeconds = config.propagationSeconds === undefined ? 60 : config.propagationSeconds;
            log(`  Published; giving it ${settleSeconds}s to reach every region.`);
            await new Promise((resolve) => setTimeout(resolve, settleSeconds * 1000));

            await client.accept(challenge.url);
            const settled = await settle(client, authorizationUrl);
            if (settled.status !== 'valid') {
                throw new Error(`Validation failed: ${JSON.stringify(settled.challenges?.find((c) => c.type === 'dns-01')?.error || settled.status)}`);
            }
            log(`Validated ${authorization.identifier.value}.`);
        }

        const { key, csr, keyPath, csrPath } = await makeCsr(domains);
        await client.finalize(order.finalize, csr);
        const completed = await settle(client, order.url);
        if (completed.status !== 'valid') throw new Error(`Order ended as ${completed.status}`);
        const chain = await client.certificate(completed.certificate);
        await writeFile(CERT_FILE, chain);
        await writeFile(KEY_FILE, key, { mode: 0o600 });
        await rm(csrPath, { force: true });
        await rm(keyPath, { force: true });
        log(`Wrote ${CERT_FILE}`);
    } finally {
        // The challenge records are only needed while Let's Encrypt validates.
        for (const entry of placed)
            await dns.removeRecord(entry.handle).catch((error) => log(`  Could not remove ${entry.record}: ${error.message}`));
    }
}

/** Renew this many days before expiry, as Let's Encrypt recommends. */
const RENEW_DAYS = 30;

/**
 * For the dev server: obtains a trusted certificate when there is none, it is a staging
 * one, it misses a configured name, or it expires within RENEW_DAYS. Runs only with an
 * automatic DNS provider, since it cannot stop to ask for DNS records; never throws.
 * @param {(line: string) => void} [log]
 */
export async function ensureCertificate(log) {
    if (log === undefined) log = console.log;
    const config = await loadAcmeConfig();
    if (!config) return;
    const status = await certificateStatus(certificateDomains(config));
    if (status && status.covers && !status.staging && status.daysLeft > RENEW_DAYS) return;
    const reason = !status ? 'There is no HTTPS certificate yet'
        : !status.covers ? `The certificate does not cover ${certificateDomains(config).join(', ')}`
        : status.staging ? 'The certificate is an untrusted staging one'
        : `The certificate expires in ${status.daysLeft} days`;
    let dns = null;
    try { dns = await createDnsProvider(config, (line) => log(`  ${line}`)); }
    catch (error) { log(`  Could not set up DNS: ${error.message}`); }
    // Unattended: renew only when the DNS provider needs no one at the keyboard.
    if (!dns || !dns.automatic) {
        log(`  ${reason}. Run \`npm run dev:cert:le -- --production\` to get one.`);
        return;
    }
    log(`  ${reason}; requesting one from Let's Encrypt.`);
    try { await issueCertificate(config, dns, { production: true, log: (line) => log(`  ${line}`) }); }
    catch (error) { log(`  Could not get a certificate: ${error.message}`); }
}

async function main() {
    const config = await loadAcmeConfig();
    if (!config) {
        console.error(`Create ${ACME_CONFIG}:\n` + JSON.stringify({
            email: 'you@example.com',
            domain: 'dev.example.com',
            dns: 'godaddy',
            godaddyPatFile: '~/path/to/godaddy_dns_pat'
        }, null, 2) + '\n\n`dns` is "godaddy" or "manual"; godaddyPatFile holds a GoDaddy Personal Access Token.');
        process.exitCode = 1;
        return;
    }
    const production = process.argv.includes('--production');
    await issueCertificate(config, await createDnsProvider(config), { production });
    console.log('\nRestart the dev server; it serves HTTPS automatically now.');
    if (!production) console.log('This is a STAGING certificate. Re-run with --production for a real one.');
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href)
    await main().catch((error) => { console.error(`\n${error.message}`); process.exitCode = 1; });
