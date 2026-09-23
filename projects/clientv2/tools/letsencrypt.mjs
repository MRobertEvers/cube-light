import { execFile } from 'node:child_process';
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { createInterface } from 'node:readline/promises';
import { promisify } from 'node:util';
import path from 'node:path';
import { AcmeClient, DIRECTORIES, awaitTxt, newAccountKey, settle } from './acme.mjs';
import { ACME_CONFIG, CERT_DIR, CERT_FILE, KEY_FILE, loadAcmeConfig } from './dev-certs.mjs';

const run = promisify(execFile);
const ACCOUNT_KEY = path.join(CERT_DIR, 'account-key.pem');

// openssl ships with macOS, so key and CSR generation needs nothing installed.
async function makeCsr(domains) {
    const keyPath = path.join(CERT_DIR, 'cert-key.pem');
    const csrPath = path.join(CERT_DIR, 'request.der');
    await run('openssl', ['ecparam', '-genkey', '-name', 'prime256v1', '-noout', '-out', keyPath]);
    const subjectAltName = domains.map((name) => `DNS:${name}`).join(',');
    await run('openssl', ['req', '-new', '-key', keyPath, '-subj', `/CN=${domains[0]}`,
        '-addext', `subjectAltName=${subjectAltName}`, '-outform', 'DER', '-out', csrPath]);
    return { key: await readFile(keyPath), csr: await readFile(csrPath), keyPath, csrPath };
}

async function ask(question) {
    const rl = createInterface({ input: process.stdin, output: process.stdout });
    const answer = await rl.question(question);
    rl.close();
    return answer;
}

// GoDaddy restricts its API to qualifying accounts; when it refuses, the record
// is added by hand instead and everything else still runs unattended.
async function presentGoDaddy(config, name, value) {
    const zone = config.domain.split('.').slice(-2).join('.');
    const relative = name.slice(0, -(zone.length + 1));
    const response = await fetch(`https://api.godaddy.com/v1/domains/${zone}/records/TXT/${encodeURIComponent(relative)}`, {
        method: 'PUT',
        headers: {
            Authorization: `sso-key ${process.env.GODADDY_KEY}:${process.env.GODADDY_SECRET}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify([{ data: value, ttl: 600 }])
    });
    if (response.ok) return true;
    const detail = await response.text();
    console.log(`\n  GoDaddy's API refused this (${response.status}): ${detail.slice(0, 200)}`);
    console.log('  Falling back to adding the record by hand.\n');
    return false;
}

async function main() {
    const config = await loadAcmeConfig();
    if (!config) {
        console.error(`Create ${ACME_CONFIG}:\n` + JSON.stringify({
            email: 'you@example.com',
            domain: 'dev.example.com',
            dns: 'manual'
        }, null, 2));
        process.exitCode = 1;
        return;
    }
    const production = process.argv.includes('--production');
    const domains = [config.domain, ...(config.extraDomains || [])];
    await mkdir(CERT_DIR, { recursive: true });

    let accountKey;
    try { accountKey = await readFile(ACCOUNT_KEY, 'utf8'); }
    catch { accountKey = newAccountKey(); await writeFile(ACCOUNT_KEY, accountKey, { mode: 0o600 }); }

    const client = new AcmeClient(accountKey, production ? DIRECTORIES.production : DIRECTORIES.staging);
    console.log(`Using Let's Encrypt ${production ? 'production' : 'STAGING'}.`);
    if (!production) console.log('Staging certificates are not trusted; re-run with --production when this works.\n');
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

            let automatic = false;
            if (config.dns === 'godaddy' && process.env.GODADDY_KEY) automatic = await presentGoDaddy(config, record, value);
            if (!automatic) {
                console.log('\nAdd this DNS record, then press Enter:\n');
                console.log(`    Type:  TXT`);
                console.log(`    Name:  ${record}`);
                console.log(`    Value: ${value}\n`);
                console.log('  (At GoDaddy the Name field usually omits the domain, so enter:');
                console.log(`   ${record.slice(0, -(config.domain.split('.').slice(-2).join('.').length + 1))})\n`);
                await ask('  Press Enter once saved... ');
            }
            placed.push({ record, value });

            process.stdout.write('Waiting for DNS to publish it...\n');
            const visible = await awaitTxt(record, value, { log: (line) => console.log(line) });
            if (!visible) throw new Error(`${record} never showed the expected value. Check the record and try again.`);
            console.log('  Published.\n');

            await client.accept(challenge.url);
            const settled = await settle(client, authorizationUrl);
            if (settled.status !== 'valid') {
                throw new Error(`Validation failed: ${JSON.stringify(settled.challenges?.find((c) => c.type === 'dns-01')?.error || settled.status)}`);
            }
            console.log(`Validated ${authorization.identifier.value}.`);
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

        console.log(`\nWrote ${CERT_FILE}`);
        console.log('Restart the dev server; it serves HTTPS automatically now.');
        if (!production) console.log('\nThis is a STAGING certificate. Re-run with --production for a real one.');
        console.log('\nYou can delete the _acme-challenge TXT record now.');
    } catch (error) {
        if (placed.length) console.log(`\nYou may remove the TXT record(s): ${placed.map((entry) => entry.record).join(', ')}`);
        throw error;
    }
}

await main().catch((error) => { console.error(`\n${error.message}`); process.exitCode = 1; });
