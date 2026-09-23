import { createHash, createPrivateKey, generateKeyPairSync, sign } from 'node:crypto';
import { Resolver } from 'node:dns/promises';

// A minimal ACME (RFC 8555) client built only from Node's standard library, so
// obtaining a publicly trusted certificate adds no dependency to this project.
// Only the DNS-01 challenge is implemented: it is the one that works for a name
// that resolves to a private address and is never reachable from the internet.

export const DIRECTORIES = {
    staging: 'https://acme-staging-v02.api.letsencrypt.org/directory',
    production: 'https://acme-v02.api.letsencrypt.org/directory'
};

export function base64url(input) {
    return Buffer.from(input).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export function newAccountKey() {
    const { privateKey } = generateKeyPairSync('ec', { namedCurve: 'P-256' });
    return privateKey.export({ type: 'pkcs8', format: 'pem' });
}

/** The JWK thumbprint (RFC 7638) the key authorization is built from. */
function thumbprint(jwk) {
    const ordered = { crv: jwk.crv, kty: jwk.kty, x: jwk.x, y: jwk.y };
    return base64url(createHash('sha256').update(JSON.stringify(ordered)).digest());
}

export class AcmeClient {
    constructor(accountKeyPem, directoryUrl) {
        this.key = createPrivateKey(accountKeyPem);
        this.jwk = this.key.asymmetricKeyType ? { ...exportPublicJwk(this.key) } : null;
        this.directoryUrl = directoryUrl;
        this.directory = null;
        this.nonce = null;
        this.kid = null;
    }

    async load() {
        this.directory = await (await fetch(this.directoryUrl)).json();
        return this.directory;
    }

    async takeNonce() {
        if (this.nonce) { const value = this.nonce; this.nonce = null; return value; }
        const response = await fetch(this.directory.newNonce, { method: 'HEAD' });
        return response.headers.get('replay-nonce');
    }

    /** Every ACME request is a JWS POST; an empty payload means POST-as-GET. */
    async post(url, payload) {
        const protectedHeader = {
            alg: 'ES256',
            nonce: await this.takeNonce(),
            url,
            ...(this.kid ? { kid: this.kid } : { jwk: this.jwk })
        };
        const encodedHeader = base64url(JSON.stringify(protectedHeader));
        const encodedPayload = payload === '' ? '' : base64url(JSON.stringify(payload));
        const signature = base64url(sign('sha256', Buffer.from(`${encodedHeader}.${encodedPayload}`), {
            key: this.key, dsaEncoding: 'ieee-p1363'
        }));
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/jose+json' },
            body: JSON.stringify({ protected: encodedHeader, payload: encodedPayload, signature })
        });
        this.nonce = response.headers.get('replay-nonce');
        const text = await response.text();
        const body = text && response.headers.get('content-type')?.includes('json') ? JSON.parse(text) : text;
        if (!response.ok) {
            const detail = body?.detail || response.statusText;
            throw new Error(`ACME ${response.status} at ${new URL(url).pathname}: ${detail}`);
        }
        return { body, headers: response.headers };
    }

    async register(email) {
        const { headers } = await this.post(this.directory.newAccount, {
            termsOfServiceAgreed: true,
            contact: [`mailto:${email}`]
        });
        this.kid = headers.get('location');
        return this.kid;
    }

    async order(domains) {
        const { body, headers } = await this.post(this.directory.newOrder, {
            identifiers: domains.map((value) => ({ type: 'dns', value }))
        });
        return { ...body, url: headers.get('location') };
    }

    async fetchResource(url) { return (await this.post(url, '')).body; }

    /** The TXT value proving control of a name, per RFC 8555 section 8.4. */
    challengeRecord(token) {
        return base64url(createHash('sha256').update(`${token}.${thumbprint(this.jwk)}`).digest());
    }

    async accept(challengeUrl) { return (await this.post(challengeUrl, {})).body; }

    async finalize(finalizeUrl, csrDer) {
        return (await this.post(finalizeUrl, { csr: base64url(csrDer) })).body;
    }

    async certificate(url) { return (await this.post(url, '')).body; }
}

function exportPublicJwk(privateKey) {
    const jwk = privateKey.export({ format: 'jwk' });
    return { crv: jwk.crv, kty: jwk.kty, x: jwk.x, y: jwk.y };
}

/** Waits for a TXT record to be visible on the zone's own nameservers. */
export async function awaitTxt(name, expected, { attempts = 40, delay = 5000, log = () => {} } = {}) {
    const resolver = new Resolver();
    const parent = name.split('.').slice(-2).join('.');
    let servers = [];
    try {
        const plain = new Resolver();
        const nameservers = await plain.resolveNs(parent);
        for (const host of nameservers) servers.push(...await plain.resolve4(host).catch(() => []));
    } catch { /* Fall back to the system resolver. */ }
    if (servers.length) resolver.setServers(servers);
    for (let attempt = 1; attempt <= attempts; attempt++) {
        try {
            const records = (await resolver.resolveTxt(name)).flat();
            if (records.includes(expected)) return true;
            log(`  ${name} has ${records.length ? records.join(', ') : 'no TXT record'} (attempt ${attempt}/${attempts})`);
        } catch (error) {
            log(`  ${name} not resolving yet (attempt ${attempt}/${attempts})`);
        }
        await new Promise((resolve) => setTimeout(resolve, delay));
    }
    return false;
}

/** Polls an ACME resource until it leaves the pending state. */
export async function settle(client, url, { attempts = 40, delay = 3000 } = {}) {
    for (let attempt = 0; attempt < attempts; attempt++) {
        const resource = await client.fetchResource(url);
        if (resource.status !== 'pending' && resource.status !== 'processing') return resource;
        await new Promise((resolve) => setTimeout(resolve, delay));
    }
    throw new Error(`Timed out waiting for ${url}`);
}
