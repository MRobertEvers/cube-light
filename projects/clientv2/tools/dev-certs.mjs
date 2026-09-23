import { readFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

export const CERT_DIR = path.resolve('certs');
export const CERT_FILE = path.join(CERT_DIR, 'dev.pem');
export const KEY_FILE = path.join(CERT_DIR, 'dev-key.pem');
export const ACME_CONFIG = path.join(CERT_DIR, 'acme.config.json');

/** Settings for a publicly trusted certificate, when one is in use. */
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
        return { key, cert };
    } catch {
        return null;
    }
}
