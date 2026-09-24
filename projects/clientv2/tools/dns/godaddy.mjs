import { readFile } from 'node:fs/promises';
import os from 'node:os';

const API = 'https://api.godaddy.com/v3/domains';

/**
 * The PAT from GODADDY_PAT, else from the file `config.godaddyPatFile` names; null when neither is set.
 * @param {import('../dev-certs.mjs').AcmeConfig} config
 * @returns {Promise<string | null>}
 */
async function loadToken(config) {
    if (process.env.GODADDY_PAT) return process.env.GODADDY_PAT.trim();
    if (!config.godaddyPatFile) return null;
    const file = config.godaddyPatFile.replace(/^~(?=\/)/, os.homedir());
    const token = (await readFile(file, 'utf8')).trim();
    if (!token) throw new Error(`${file} is empty.`);
    return token;
}

/**
 * A DnsProvider for a GoDaddy-managed zone, through the Domains v3 API. It authenticates
 * with a Personal Access Token (`gd_pat_…`) that has the `domains.dns:update` scope.
 * https://developer.godaddy.com/en/docs/api-users/auth
 */
export class GoDaddyDns {
    /**
     * The provider for `zone`, or null when no token is configured.
     * @param {import('../dev-certs.mjs').AcmeConfig} config
     * @param {string} zone
     * @returns {Promise<GoDaddyDns | null>}
     */
    static async fromConfig(config, zone) {
        const token = await loadToken(config);
        return token ? new GoDaddyDns(token, zone) : null;
    }

    /**
     * @param {string} token
     * @param {string} zone The registered domain, such as example.com.
     */
    constructor(token, zone) {
        this.automatic = true;
        this.token = token;
        this.zone = zone;
    }

    /**
     * The record name relative to the zone: `_acme-challenge.dev` for `_acme-challenge.dev.example.com`.
     * @param {string} name
     */
    relative(name) {
        if (name === this.zone) return '@';
        if (!name.endsWith(`.${this.zone}`)) throw new Error(`${name} is not in the ${this.zone} zone.`);
        return name.slice(0, -(this.zone.length + 1));
    }

    /**
     * @param {string} method
     * @param {string} path Relative to the zone.
     * @param {unknown} [body] Sent as JSON.
     */
    async request(method, path, body) {
        const headers = { Authorization: `Bearer ${this.token}`, Accept: 'application/json' };
        if (body !== undefined) headers['Content-Type'] = 'application/json';
        const response = await fetch(`${API}/zones/${encodeURIComponent(this.zone)}${path}`, {
            method,
            headers,
            body: body === undefined ? undefined : JSON.stringify(body)
        });
        if (!response.ok) {
            const detail = (await response.text()).slice(0, 300);
            const hint = response.status === 401 ? ' The token is missing, expired or revoked.'
                : response.status === 403 ? ' The token needs the domains.dns:update scope.' : '';
            throw new Error(`GoDaddy ${method} ${path} failed (${response.status}).${hint} ${detail}`);
        }
        return response.status === 204 ? null : response.json();
    }

    /**
     * Every record of `type` named `name` (a full domain name).
     * @param {string} type
     * @param {string} name
     * @returns {Promise<Array<{ recordId: string, name: string, type: string, data: string, ttl: number }>>}
     */
    async find(type, name) {
        const query = new URLSearchParams({ type, name: this.relative(name), pageSize: '100' });
        const page = await this.request('GET', `/dns-records?${query}`);
        const relative = this.relative(name);
        return (page.items || []).filter((record) => record.type === type && record.name === relative);
    }

    /**
     * Makes `name` hold exactly one `type` record with `data`; the handle is its recordId.
     * @param {string} type
     * @param {string} name
     * @param {string} data
     * @param {number} ttl GoDaddy's minimum is 600.
     * @returns {Promise<string>}
     */
    async setRecord(type, name, data, ttl) {
        const body = { type, name: this.relative(name), data, ttl };
        const existing = await this.find(type, name);
        for (const extra of existing.slice(1)) await this.removeRecord(extra.recordId);
        if (existing.length) {
            if (existing[0].data === data) return existing[0].recordId;
            return (await this.request('PUT', `/dns-records/${existing[0].recordId}`, body)).recordId || existing[0].recordId;
        }
        return (await this.request('POST', '/dns-records', body)).recordId;
    }

    /** @param {string} recordId */
    async removeRecord(recordId) {
        await this.request('DELETE', `/dns-records/${recordId}`);
    }
}
