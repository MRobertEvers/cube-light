import type { AccountScope, CommandOutcome, CommandRequest, ResourceQuery, Session, StoredResource, SyncPage } from '@torimtg/core';
import type { LocalBlob, ReplicaMeta, ServerApi } from '../types';
import type { LocalStore } from '../types';
import type { AuthSession } from '@torimtg/core';
import { queryKey } from './local-store';

export class TransportError extends Error {
    readonly status: number;
    readonly retryAfter: number;
    constructor(message: string, status: number, retryAfter?: number) {
        super(message); this.status = status; this.retryAfter = retryAfter === undefined ? 0 : retryAfter;
    }
}

/** Worker-only HTTP adapter. Retry policy and durable state belong to the coordinator. */
export class HttpServerApi implements ServerApi {
    private readonly base: string;
    private readonly authStore: LocalStore;
    private refreshing: Promise<void> | null = null;
    constructor(base: string, authStore: LocalStore) { this.base = base.replace(/\/$/, ''); this.authStore = authStore; }

    private async request(path: string, options?: RequestInit, authenticateArg?: boolean): Promise<Response> {
        const authenticate = authenticateArg === undefined ? true : authenticateArg;
        if (authenticate) {
            const credentials = await this.authStore.credentials();
            if (credentials && credentials.tokens.accessExpiresAt - Date.now() < 60000) await this.refresh();
        }
        try { return await this.transport(path, options, authenticate); }
        catch (error) {
            if (!authenticate || !(error instanceof TransportError) || error.status !== 401 || !await this.authStore.credentials()) throw error;
            await this.refresh();
            return this.transport(path, options, true);
        }
    }

    private async refresh(): Promise<void> {
        if (!this.refreshing) this.refreshing = this.rotate().finally(() => { this.refreshing = null; });
        return this.refreshing;
    }

    private async rotate(): Promise<void> {
        const credentials = await this.authStore.prepareRefresh();
        if (credentials.tokens.refreshExpiresAt <= Date.now()) throw new TransportError('Sign in again to sync your saved edits.', 401);
        const response = await this.transport('/auth/refresh', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ refreshToken: credentials.tokens.refreshToken, requestId: credentials.refreshRequestId }) }, false);
        await this.authStore.rotateCredentials(credentials, await response.json());
    }

    private async transport(path: string, options: RequestInit | undefined, authenticate: boolean): Promise<Response> {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 15000);
        try {
            const headers = new Headers(options?.headers);
            if (authenticate) {
                const credentials = await this.authStore.credentials();
                if (credentials) headers.set('Authorization', `Bearer ${credentials.tokens.accessToken}`);
            }
            const response = await fetch(this.base + path, { ...options, headers, credentials: 'omit', signal: controller.signal, cache: 'no-store' });
            if (!response.ok) {
                const body = await response.clone().json().catch(() => null);
                const retry = response.headers.get('Retry-After');
                const retryAfter = retry ? (/^\d+$/.test(retry) ? Date.now() + Number(retry) * 1000 : Date.parse(retry)) : 0;
                throw new TransportError(body?.error || `Server request failed (${response.status}).`, response.status, retryAfter);
            }
            return response;
        } catch (error) {
            if (error instanceof TransportError) throw error;
            throw new TransportError('Server unavailable. Changes are saved on this device.', 0);
        } finally { clearTimeout(timeout); }
    }

    private async json<T>(path: string, body: unknown): Promise<T> {
        return (await this.request(path, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })).json();
    }

    async command(request: CommandRequest): Promise<CommandOutcome> {
        const result = await this.json<CommandOutcome>('/sync/v1/commands', request);
        if (result.operationId !== request.operationId || !['accepted', 'conflict', 'rejected'].includes(result.status) || !Array.isArray(result.replicas) || !Array.isArray(result.events)) throw new TransportError('Unsupported command response.', 426);
        return result;
    }

    async pull(scope: AccountScope, meta: ReplicaMeta, operationIds: string[]): Promise<SyncPage> {
        const bootstrap = !meta.bootstrap.complete;
        const result = await this.json<SyncPage>(`/sync/v1/${bootstrap ? 'bootstrap' : 'changes'}`, { protocolVersion: 1, serverInstanceId: scope.serverInstanceId, accountId: scope.accountId, cursor: meta.cursor, operationIds, ...(bootstrap ? { after: meta.bootstrap.after, watermark: meta.bootstrap.watermark } : {}) });
        if (result.protocolVersion !== 1 || !Array.isArray(result.replicas) || !Array.isArray(result.outcomes) || !Number.isSafeInteger(result.cursor)) throw new TransportError('Unsupported replication response.', 426);
        return result;
    }

    async resource(query: ResourceQuery): Promise<StoredResource> {
        let path: string;
        switch (query.type) {
            case 'card.details': path = `/cards/details?uuid=${encodeURIComponent(query.uuid)}`; break;
            case 'card.printings': path = `/cards/printings?name=${encodeURIComponent(query.name)}`; break;
            case 'card.resolve': path = `/sync/v1/resolve-card?name=${encodeURIComponent(query.name)}${query.setCode ? `&setCode=${encodeURIComponent(query.setCode)}` : ''}`; break;
            case 'card.suggestions': path = `/suggest?stub=${encodeURIComponent(query.stub)}`; break;
            case 'card.names': path = `/suggest/card-names/${query.format}`; break;
            case 'blob': path = `/sync/v1/blobs/${encodeURIComponent(query.id)}`; break;
            case 'history': path = `/sync/v1/history/${encodeURIComponent(query.id)}`; break;
        }
        const response = await this.request(path);
        return { key: queryKey(query), body: await response.blob(), status: response.status, contentType: response.headers.get('Content-Type') || 'application/octet-stream', validatedAt: new Date().toISOString() };
    }

    async upload(scope: AccountScope, blob: LocalBlob): Promise<number> {
        const chunk = new Uint8Array(await blob.data.slice(blob.uploaded, blob.uploaded + 1024 * 1024).arrayBuffer());
        let binary = '';
        for (let start = 0; start < chunk.length; start += 8192) binary += String.fromCharCode(...chunk.subarray(start, start + 8192));
        const result = await this.json<{ received: number }>(`/sync/v1/blobs/${blob.id}/chunks`, { accountId: scope.accountId, offset: blob.uploaded, total: blob.data.size, contentType: blob.data.type, data: btoa(binary) });
        if (!Number.isSafeInteger(result.received) || result.received <= blob.uploaded || result.received > blob.data.size) throw new TransportError('Invalid upload receipt.', 426);
        return result.received;
    }

    async authenticate(type: string, credentials?: { username: string; password: string }): Promise<AuthSession> {
        if (type === 'logout') {
            const saved = await this.authStore.credentials();
            await this.request('/auth/logout', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ refreshToken: saved?.tokens.refreshToken }) }, false);
            return (await this.request('/auth/session', undefined, false)).json();
        }
        if (type === 'login' || type === 'setup') {
            if (!credentials) throw new TransportError('Enter your sign-in details again.', 400);
            const response = await this.request(`/auth/${type}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(credentials) }, false);
            const reply = await response.json() as AuthSession;
            if (!reply.tokens || reply.tokens.tokenType !== 'Bearer') throw new TransportError('Server did not issue bearer credentials.', 426);
            return { ...reply, setupRequired: false };
        }
        return (await this.request('/auth/session')).json();
    }
}
