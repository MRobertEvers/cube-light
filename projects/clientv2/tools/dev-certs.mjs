import { readFile } from 'node:fs/promises';
import { X509Certificate } from 'node:crypto';
import path from 'node:path';

export const CERT_DIR = path.resolve('certs');
export const CERT_FILE = path.join(CERT_DIR, 'dev.pem');
export const KEY_FILE = path.join(CERT_DIR, 'dev-key.pem');
export const ACME_CONFIG = path.join(CERT_DIR, 'acme.config.json');

/**
 * certs/acme.config.json: settings for a publicly trusted certificate.
 * @typedef {Object} AcmeConfig
 * @property {string} email Let's Encrypt account contact.
 * @property {string} domain The name the certificate is for, such as dev.example.com.
 * @property {string[]} [extraDomains] More names on the same certificate.
 * @property {string} [zone] The registered domain, when it is not the last two labels of `domain`.
 * @property {'godaddy' | 'manual'} [dns] Which DnsProvider edits the challenge records; manual by default.
 * @property {string} [godaddyPatFile] File holding a GoDaddy Personal Access Token.
 * @property {number} [propagationSeconds] Wait after the nameservers show a record; 60 by default.
 * @property {{ registry: string, name?: string }} [localDns] Where `npm run dev` registers this
 *   machine with local-dns, such as { "registry": "http://10.0.0.1:8053" }; name defaults to the host's.
 */

/**
 * Settings for a publicly trusted certificate, when one is in use.
 * @returns {Promise<AcmeConfig | null>}
 */
export async function loadAcmeConfig() {
    try {
        const config = JSON.parse(await readFile(ACME_CONFIG, 'utf8'));
        return config.domain && config.email ? config : null;
    } catch {
        return null;
    }
}

/**
 * Installing the app, starting it offline, and Web Crypto need a secure context. http://localhost is
 * one; a LAN name such as http://host.local:3000 is not, so testing the installed
 * app from a phone needs a trusted certificate. Returns
 * null when none has been generated, leaving the dev server on plain HTTP.
 */
export async function loadDevCertificate() {
    try {
        const [key, cert] = await Promise.all([readFile(KEY_FILE), readFile(CERT_FILE)]);
        if (new Date(new X509Certificate(cert).validTo).getTime() <= Date.now()) {
            console.log(`  ${CERT_FILE} has expired, so the dev server stays on plain HTTP.`);
            return null;
        }
        return { key, cert };
    } catch {
        return null;
    }
}

/**
 * @typedef {Object} CertificateStatus
 * @property {number} daysLeft
 * @property {boolean} covers Whether it names every requested domain.
 * @property {boolean} staging Whether it is an untrusted Let's Encrypt staging certificate.
 */

/**
 * The saved certificate's status, or null when there is none.
 * @param {string[]} domains
 * @returns {Promise<CertificateStatus | null>}
 */
export async function certificateStatus(domains) {
    try {
        const certificate = new X509Certificate(await readFile(CERT_FILE));
        const names = (certificate.subjectAltName || '').split(', ').map((entry) => entry.replace(/^DNS:/, ''));
        return {
            daysLeft: Math.floor((new Date(certificate.validTo).getTime() - Date.now()) / 86400000),
            covers: domains.every((domain) => names.includes(domain)),
            staging: /STAGING/i.test(certificate.issuer)
        };
    } catch {
        return null;
    }
}
