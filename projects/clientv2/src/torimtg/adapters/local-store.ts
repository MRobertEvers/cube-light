import { applyEvent, canonicalJson, decide, preview } from '@torimtg/core';
import type { AccountScope, AggregateState, Checkpoint, CommandOutcome, CommandRequest, DomainCommand, Replica, ResourceQuery, Session, StoredResource, SyncPage } from '@torimtg/core';
import type { AuthSession } from '@torimtg/core';
import type { AuthCredentials } from '../types';
import type { AuthControl, Dataset, Intent, JournalEntry, Lease, LocalBlob, LocalCommit, LocalNotice, LocalStore, ReplicaMeta, ResourceJob } from '../types';
import { IndexedDbDriver, TABLES } from './indexeddb-driver';
import type { Tables } from './indexeddb-driver';

type StoredReplica = Replica & { partition: string };
type StoredView = { partition: string; id: string; state: AggregateState };
type StoredCheckpoint = { partition: string; id: string; sequence: number; checkpoint: Checkpoint };
type StoredEvent = { partition: string; id: string; sequence: number; event: Replica['events'][number] };
const INITIAL_AUTH: AuthControl = { session: null, generation: 0, locked: false, pendingLogout: false, error: null, job: null };

export async function hash(value: unknown): Promise<string> {
    const bytes = new TextEncoder().encode(canonicalJson(value));
    return bytesHash(bytes);
}

async function bytesHash(bytes: BufferSource): Promise<string> {
    const result = await crypto.subtle.digest('SHA-256', bytes);
    return Array.from(new Uint8Array(result), (byte) => byte.toString(16).padStart(2, '0')).join('');
}

export function queryKey(query: ResourceQuery): string { return canonicalJson(query); }
export function outstanding(intent: Intent): boolean { return !['accepted', 'discarded'].includes(intent.status); }

function newMeta(partition: string): ReplicaMeta {
    return { partition, revision: 0, sequence: 0, clientId: crypto.randomUUID(), cursor: 0, bootstrap: { complete: false, after: '', watermark: 0 }, validatedAt: null, refresh: 'idle', error: null, nextAttemptAt: 0, lease: null, syncRequested: true };
}

async function authValue(tables: Tables): Promise<AuthControl> {
    return (await tables.get<{ value: AuthControl }>('control', 'auth'))?.value || structuredClone(INITIAL_AUTH);
}

function scopeOf(auth: AuthControl): AccountScope | null {
    const user = auth.session?.user;
    if (!user || auth.locked || !auth.session?.serverInstanceId) return null;
    return { partition: `${auth.session.serverInstanceId}:${user.id}:shared`, serverInstanceId: auth.session.serverInstanceId, accountId: user.id, generation: auth.generation };
}

async function checked(tables: Tables, scope: AccountScope, lease?: Lease): Promise<ReplicaMeta> {
    const active = scopeOf(await authValue(tables));
    if (!active || active.partition !== scope.partition || active.generation !== scope.generation) throw new Error('The active account changed.');
    const meta = await tables.get<ReplicaMeta>('meta', scope.partition) || newMeta(scope.partition);
    if (lease && (!meta.lease || meta.lease.owner !== lease.owner || meta.lease.fence !== lease.fence || meta.lease.expiresAt <= Date.now())) throw new Error('Sync lease expired.');
    return meta;
}

function notice(scope: AccountScope, meta: ReplicaMeta): LocalNotice { return { partition: scope.partition, generation: scope.generation, localRevision: meta.revision }; }

async function journal(tables: Tables, meta: ReplicaMeta, operationId: string, fact: JournalEntry['fact']): Promise<void> {
    await tables.put('journal', { partition: meta.partition, sequence: ++meta.sequence, operationId, at: new Date().toISOString(), fact });
}

async function project(tables: Tables, partition: string): Promise<void> {
    const bases = await tables.all<StoredReplica>('base', partition);
    const intents = (await tables.all<Intent>('outbox', partition)).filter(outstanding).sort((a, b) => a.sequence - b.sequence);
    const states = new Map(bases.map((base) => [base.id, base.state]));
    for (const intent of intents) {
        try {
            const state = preview(states.get(intent.command.id) || null, intent.command, intent.createdAt);
            if (state) states.set(state.id, state);
            if (intent.command.type === 'work.complete') {
                const deck = states.get(intent.command.deckId);
                if (deck) states.set(deck.id, preview(deck, { type: 'deck.cards', id: deck.id, edits: intent.command.edits }, intent.createdAt)!);
            }
        } catch { /* The retained intent is shown in conflicts instead of reviving deleted data. */ }
    }
    for (const old of await tables.all<StoredView>('views', partition)) if (!states.has(old.id)) await tables.remove('views', [partition, old.id]);
    for (const state of states.values()) await tables.put('views', { partition, id: state.id, state });
}

/** Retention follows verified event coverage and dependencies, never a blind clear(). */
async function compact(tables: Tables, partition: string): Promise<void> {
    const balances = await tables.all<StoredCheckpoint>('checkpoints', partition);
    const grouped = new Map<string, StoredCheckpoint[]>();
    for (const balance of balances) grouped.set(balance.id, [...(grouped.get(balance.id) || []), balance]);
    const floors = new Map<string, number>();
    for (const [id, checkpoints] of grouped) {
        checkpoints.sort((a, b) => b.sequence - a.sequence);
        floors.set(id, checkpoints[Math.min(1, checkpoints.length - 1)].sequence);
        for (const old of checkpoints.slice(2)) await tables.remove('checkpoints', [partition, id, old.sequence]);
    }
    for (const entry of await tables.all<StoredEvent>('events', partition)) {
        if (entry.sequence <= (floors.get(entry.id) || 0)) await tables.remove('events', [partition, entry.id, entry.sequence]);
    }
    const intents = await tables.all<Intent>('outbox', partition);
    const referenced = new Set(intents.filter(outstanding).flatMap((intent) => [intent.dependsOn, intent.deckDependsOn]).filter(Boolean));
    const cutoff = Date.now() - 30 * 24 * 60 * 60 * 1000;
    const removable = new Set(intents.filter((intent) => !outstanding(intent) && !referenced.has(intent.operationId) && Date.parse(intent.createdAt) < cutoff && (intent.status === 'discarded' || Object.entries(intent.outcome?.revisions || {}).every((entry) => (floors.get(entry[0]) || 0) >= entry[1]))).map((intent) => intent.operationId));
    for (const entry of await tables.all<JournalEntry>('journal', partition)) if (removable.has(entry.operationId)) await tables.remove('journal', [partition, entry.sequence]);
    for (const id of removable) await tables.remove('outbox', [partition, id]);
}

/** Verify outside an IDB transaction: WebCrypto must never suspend a live transaction. */
async function verifyReplica(replica: Replica): Promise<void> {
    const checkpoint = replica.checkpoint;
    if (checkpoint.schemaVersion !== 1 || checkpoint.reducerVersion !== 1 || checkpoint.aggregateId !== replica.id || checkpoint.state.id !== replica.id || await hash(checkpoint.state) !== checkpoint.stateHash) throw new Error('Invalid checkpoint. Synchronization stopped without discarding local changes.');
    let state: AggregateState = checkpoint.state;
    let sequence = checkpoint.throughSequence;
    let ledgerHash = checkpoint.ledgerHash;
    for (const event of replica.events) {
        const { eventHash, ...unsigned } = event;
        if (event.aggregateId !== replica.id || event.eventSchemaVersion !== 1 || event.aggregateSequence !== sequence + 1 || event.previousEventHash !== ledgerHash || await hash(unsigned) !== eventHash) throw new Error('The event ledger has a gap or invalid hash.');
        state = applyEvent(state, event.event, replica.id, event.recordedAt);
        sequence = event.aggregateSequence;
        ledgerHash = eventHash;
    }
    if (sequence !== replica.sequence || ledgerHash !== replica.hash || await hash(state) !== await hash(replica.state)) throw new Error('The downloaded state does not balance.');
}

export class IndexedDbLocalStore implements LocalStore {
    private readonly driver: IndexedDbDriver;
    constructor(driver?: IndexedDbDriver) { this.driver = driver === undefined ? new IndexedDbDriver() : driver; }
    open(): Promise<void> { return this.driver.open(); }
    close(): void { this.driver.close(); }

    auth(): Promise<AuthControl> { return this.driver.transaction(['control'], 'readonly', authValue); }
    async scope(): Promise<AccountScope | null> { return scopeOf(await this.auth()); }

    async startAuth(type: 'session' | 'login' | 'setup' | 'logout'): Promise<string> {
        return this.driver.transaction(['control'], 'readwrite', async (tables) => {
            const auth = await authValue(tables);
            const id = crypto.randomUUID();
            if (type === 'logout') { auth.locked = true; auth.pendingLogout = true; auth.generation++; }
            if (type === 'login' || type === 'setup') { auth.locked = true; auth.generation++; }
            auth.job = { id, type, status: 'queued' }; auth.error = null;
            await tables.put('control', { key: 'auth', value: auth });
            return id;
        });
    }

    async finishAuth(id: string, session: AuthSession | null, error?: string): Promise<void> {
        await this.driver.transaction(['control', 'meta'], 'readwrite', async (tables) => {
            const auth = await authValue(tables);
            if (auth.job?.id !== id) return;
            auth.job.status = error ? 'failed' : 'complete'; auth.error = error || null;
            if (!error && session) {
                if (auth.session?.user?.id !== session.user?.id || auth.session?.serverInstanceId !== session.serverInstanceId) auth.generation++;
                const { tokens, ...identity } = session;
                auth.session = identity; auth.locked = !session.user; auth.pendingLogout = false;
                if (tokens && session.user) await tables.put('control', { key: 'credentials', value: { tokens, serverInstanceId: session.serverInstanceId, accountId: session.user.id, generation: auth.generation, refreshRequestId: null } });
                else if (!session.user) await tables.remove('control', 'credentials');
                const scope = scopeOf(auth);
                if (scope) {
                    const meta = await tables.get<ReplicaMeta>('meta', scope.partition) || newMeta(scope.partition);
                    meta.refresh = 'queued'; meta.error = null; meta.nextAttemptAt = 0; meta.syncRequested = true;
                    await tables.put('meta', meta);
                }
            }
            await tables.put('control', { key: 'auth', value: auth });
        });
    }

    credentials(): Promise<AuthCredentials | null> {
        return this.driver.transaction(['control'], 'readonly', async (tables) => (await tables.get<{ value: AuthCredentials }>('control', 'credentials'))?.value || null);
    }

    async prepareRefresh(): Promise<AuthCredentials> {
        return this.driver.transaction(['control'], 'readwrite', async (tables) => {
            const auth = await authValue(tables);
            const credentials = (await tables.get<{ value: AuthCredentials }>('control', 'credentials'))?.value;
            if (!credentials || auth.locked || credentials.generation !== auth.generation) throw new Error('Sign in to renew your session.');
            credentials.refreshRequestId ||= crypto.randomUUID();
            await tables.put('control', { key: 'credentials', value: credentials });
            return credentials;
        });
    }

    async rotateCredentials(previous: AuthCredentials, result: AuthSession): Promise<void> {
        await this.driver.transaction(['control'], 'readwrite', async (tables) => {
            const auth = await authValue(tables);
            const current = (await tables.get<{ value: AuthCredentials }>('control', 'credentials'))?.value;
            if (!current || auth.locked || auth.generation !== previous.generation || current.tokens.refreshToken !== previous.tokens.refreshToken) return;
            if (!result.tokens || result.user?.id !== previous.accountId || result.serverInstanceId !== previous.serverInstanceId) throw new Error('Refresh returned a different account or server.');
            await tables.put('control', { key: 'credentials', value: { ...previous, tokens: result.tokens, refreshRequestId: null } });
            auth.session = { user: result.user, serverInstanceId: result.serverInstanceId, setupRequired: result.setupRequired };
            await tables.put('control', { key: 'auth', value: auth });
        });
    }

    async dataset(scope: AccountScope): Promise<Dataset> {
        return this.driver.transaction(['control', 'meta', 'views', 'catalog', 'events', 'outbox', 'resources'], 'readonly', async (tables) => {
            const meta = await checked(tables, scope);
            const states = (await tables.all<StoredView>('views', scope.partition)).map((row) => row.state);
            const catalog: Record<string, unknown> = {};
            for (const row of await tables.all<{ id: string; value: unknown }>('catalog', scope.partition)) catalog[row.id] = row.value;
            return { states, catalog, meta, events: (await tables.all<{ event: Replica['events'][number] }>('events', scope.partition)).map((row) => row.event), intents: (await tables.all<Intent>('outbox', scope.partition)).sort((a, b) => a.sequence - b.sequence), resources: await tables.all<StoredResource>('resources', scope.partition) };
        });
    }

    async commit(scope: AccountScope, command: DomainCommand): Promise<LocalCommit> {
        return this.driver.transaction(TABLES, 'readwrite', async (tables) => {
            const meta = await checked(tables, scope);
            const result = await this.appendIntent(tables, meta, scope, command);
            await project(tables, scope.partition);
            meta.revision++; meta.syncRequested = true; meta.nextAttemptAt = 0;
            await tables.put('meta', meta);
            return { ...notice(scope, meta), operationId: result.operationId };
        });
    }

    private async appendIntent(tables: Tables, meta: ReplicaMeta, scope: AccountScope, command: DomainCommand): Promise<Intent> {
        const allIntents = await tables.all<Intent>('outbox', scope.partition);
        let deckDependsOn: string | undefined;
        if (command.type === 'work.complete') {
            const deck = await tables.get<StoredReplica>('base', [scope.partition, command.deckId]);
            command = { ...command, deckRevision: deck?.sequence || 0 };
            const deckId = command.deckId;
            deckDependsOn = allIntents.filter((intent) => intent.command.id === deckId && outstanding(intent)).sort((a, b) => b.sequence - a.sequence)[0]?.operationId;
        }
        const view = await tables.get<StoredView>('views', [scope.partition, command.id]);
        const events = decide(view?.state || null, command);
        if (command.type.startsWith('profile.') && command.id !== `profile_${scope.accountId}`) throw new Error('Cannot edit another account.');
        const base = await tables.get<StoredReplica>('base', [scope.partition, command.id]);
        const previous = (await tables.all<Intent>('outbox', scope.partition)).filter((intent) => outstanding(intent) && intent.command.id === command.id).sort((a, b) => b.sequence - a.sequence)[0];
        const intent: Intent = { partition: scope.partition, operationId: crypto.randomUUID(), sequence: meta.sequence + 1, command, originalBaseRevision: base?.sequence || 0, dependsOn: previous?.operationId || null, createdAt: new Date().toISOString(), status: 'queued', prepared: null, outcome: null, attempts: 0, nextAttemptAt: 0, error: null };
        if (deckDependsOn) intent.deckDependsOn = deckDependsOn;
        await journal(tables, meta, intent.operationId, { type: 'IntentRecorded', intent: structuredClone(intent), events });
        await tables.put('outbox', intent);
        return intent;
    }

    async refresh(scope: AccountScope, resource?: ResourceQuery, retry?: boolean): Promise<void> {
        await this.driver.transaction(['control', 'meta', 'jobs', 'outbox'], 'readwrite', async (tables) => {
            const meta = await checked(tables, scope);
            if (resource) {
                const key = queryKey(resource);
                const previous = await tables.get<ResourceJob>('jobs', [scope.partition, key]);
                await tables.put('jobs', { partition: scope.partition, key, query: resource, generation: (previous?.generation || 0) + 1, served: previous?.served || 0, attempts: 0, nextAttemptAt: 0, error: null });
            }
            meta.syncRequested = true; meta.nextAttemptAt = 0; meta.refresh = 'queued';
            if (retry) for (const intent of await tables.all<Intent>('outbox', scope.partition)) if (intent.status === 'retry') { intent.nextAttemptAt = 0; await tables.put('outbox', intent); }
            await tables.put('meta', meta);
        });
    }

    async acquire(scope: AccountScope, owner: string): Promise<Lease | null> {
        return this.driver.transaction(['control', 'meta'], 'readwrite', async (tables) => {
            const meta = await checked(tables, scope);
            if (meta.lease && meta.lease.expiresAt > Date.now()) return null;
            const lease = { scope, owner, fence: (meta.lease?.fence || 0) + 1, expiresAt: Date.now() + 90000 };
            meta.lease = lease;
            await tables.put('meta', meta);
            return lease;
        });
    }

    async renew(lease: Lease): Promise<boolean> {
        return this.driver.transaction(['control', 'meta'], 'readwrite', async (tables) => {
            const meta = await checked(tables, lease.scope, lease);
            meta.lease!.expiresAt = Date.now() + 90000;
            await tables.put('meta', meta); return true;
        });
    }

    async release(lease: Lease): Promise<void> {
        await this.driver.transaction(['meta'], 'readwrite', async (tables) => {
            const meta = await tables.get<ReplicaMeta>('meta', lease.scope.partition);
            if (meta?.lease?.owner === lease.owner && meta.lease.fence === lease.fence) {
                meta.lease.expiresAt = 0;
                await tables.put('meta', meta);
            }
        });
    }

    async prepare(lease: Lease): Promise<Intent | null> {
        return this.driver.transaction(['control', 'meta', 'outbox', 'journal'], 'readwrite', async (tables) => {
            const scope = lease.scope;
            const meta = await checked(tables, scope, lease);
            if (meta.refresh === 'auth-required') return null;
            const intents = (await tables.all<Intent>('outbox', scope.partition)).sort((a, b) => a.sequence - b.sequence);
            for (const intent of intents) {
                if (!['queued', 'sending', 'retry'].includes(intent.status) || intent.nextAttemptAt > Date.now()) continue;
                const previous = intent.dependsOn ? intents.find((item) => item.operationId === intent.dependsOn) : null;
                if (previous && previous.status !== 'accepted') continue;
                const deckPrevious = intent.deckDependsOn ? intents.find((item) => item.operationId === intent.deckDependsOn) : null;
                if (deckPrevious && deckPrevious.status !== 'accepted') continue;
                if (!intent.prepared) {
                    const expectedRevision = previous?.outcome?.revisions[intent.command.id] ?? intent.originalBaseRevision;
                    intent.prepared = { protocolVersion: 1, serverInstanceId: scope.serverInstanceId, accountId: scope.accountId, datasetId: 'shared', operationId: intent.operationId, clientId: meta.clientId, expectedRevision, command: intent.command };
                    if (deckPrevious && intent.prepared.command.type === 'work.complete') intent.prepared.command = { ...intent.prepared.command, deckRevision: deckPrevious.outcome!.revisions[intent.prepared.command.deckId] };
                    await journal(tables, meta, intent.operationId, { type: 'RequestPrepared', request: intent.prepared });
                }
                intent.status = 'sending'; intent.attempts++;
                await tables.put('outbox', intent); await tables.put('meta', meta);
                return intent;
            }
            return null;
        });
    }

    async settle(lease: Lease, result: CommandOutcome | SyncPage): Promise<LocalNotice> {
        const outcomes = 'operationId' in result ? [result] : result.outcomes;
        const replicas = [...result.replicas, ...outcomes.flatMap((outcome) => outcome.replicas)];
        for (const replica of replicas) await verifyReplica(replica);
        return this.driver.transaction(TABLES, 'readwrite', async (tables) => {
            const scope = lease.scope;
            const meta = await checked(tables, scope, lease);
            if (!('operationId' in result) && (result.protocolVersion !== 1 || result.serverInstanceId !== scope.serverInstanceId)) throw new Error('Server identity or protocol changed.');
            for (const replica of replicas) {
                if (replica.state.kind === 'profile' && replica.state.userId !== scope.accountId) throw new Error('Received another account\'s profile.');
                const previous = await tables.get<StoredReplica>('base', [scope.partition, replica.id]);
                if (previous && previous.sequence > replica.sequence) continue;
                if (previous && previous.sequence === replica.sequence && previous.hash !== replica.hash) throw new Error('Conflicting event identities at the same sequence.');
                await tables.put('base', { ...replica, partition: scope.partition });
                await tables.put('checkpoints', { partition: scope.partition, id: replica.id, sequence: replica.checkpoint.throughSequence, checkpoint: replica.checkpoint });
                for (const event of replica.events) await tables.put('events', { partition: scope.partition, id: replica.id, sequence: event.aggregateSequence, event });
            }
            for (const outcome of outcomes) {
                const intent = await tables.get<Intent>('outbox', [scope.partition, outcome.operationId]);
                if (!intent || ['accepted', 'discarded'].includes(intent.status)) continue;
                intent.status = outcome.status; intent.outcome = outcome; intent.error = outcome.message || null;
                await journal(tables, meta, intent.operationId, { type: 'IntentSettled', outcome });
                await tables.put('outbox', intent);
            }
            if (!('operationId' in result)) {
                const page = result as SyncPage & { after?: string; watermark?: number };
                for (const [id, value] of Object.entries(result.catalog)) await tables.put('catalog', { partition: scope.partition, id, value });
                if (result.bootstrapComplete !== undefined) {
                    meta.bootstrap = { complete: result.bootstrapComplete, after: page.after || '', watermark: page.watermark || 0 };
                    if (result.bootstrapComplete) meta.cursor = result.cursor;
                } else meta.cursor = Math.max(meta.cursor, result.cursor);
                meta.validatedAt = new Date().toISOString(); meta.refresh = result.hasMore ? 'queued' : 'idle'; meta.error = null; meta.nextAttemptAt = 0;
                meta.syncRequested = result.hasMore;
            }
            await project(tables, scope.partition);
            meta.revision++;
            if (meta.revision % 100 === 0) await compact(tables, scope.partition);
            await tables.put('meta', meta);
            return notice(scope, meta);
        });
    }

    async fail(lease: Lease, operationId: string | null, message: string, retryAt: number, terminal?: boolean, authRequired?: boolean): Promise<void> {
        await this.driver.transaction(['control', 'meta', 'outbox', 'journal'], 'readwrite', async (tables) => {
            const meta = await checked(tables, lease.scope, lease);
            if (operationId) {
                const intent = await tables.get<Intent>('outbox', [lease.scope.partition, operationId]);
                if (intent) {
                    intent.status = terminal ? 'rejected' : 'retry'; intent.nextAttemptAt = retryAt; intent.error = message;
                    if (terminal) await journal(tables, meta, operationId, { type: 'IntentSettled', outcome: { operationId, status: 'rejected', message, events: [], replicas: [], revisions: {} } });
                    await tables.put('outbox', intent);
                }
            }
            meta.refresh = authRequired ? 'auth-required' : 'failed'; meta.error = message; meta.nextAttemptAt = terminal ? 0 : retryAt; meta.revision++;
            await tables.put('meta', meta);
        });
    }

    async jobs(scope: AccountScope): Promise<ResourceJob[]> {
        return this.driver.transaction(['control', 'meta', 'jobs'], 'readonly', async (tables) => {
            await checked(tables, scope);
            return (await tables.all<ResourceJob>('jobs', scope.partition)).filter((job) => job.served < job.generation && job.nextAttemptAt <= Date.now());
        });
    }

    async saveResource(lease: Lease, job: ResourceJob, resource: StoredResource): Promise<LocalNotice> {
        return this.driver.transaction(['control', 'meta', 'jobs', 'resources', 'catalog'], 'readwrite', async (tables) => {
            const meta = await checked(tables, lease.scope, lease);
            await tables.put('resources', { ...resource, partition: lease.scope.partition, key: job.key });
            const current = await tables.get<ResourceJob>('jobs', [lease.scope.partition, job.key]);
            if (current) { current.served = job.generation; current.error = null; current.attempts = 0; await tables.put('jobs', current); }
            meta.revision++;
            await tables.put('meta', meta);
            return notice(lease.scope, meta);
        });
    }

    async failResource(lease: Lease, job: ResourceJob, message: string, retryAt: number): Promise<void> {
        await this.driver.transaction(['control', 'meta', 'jobs'], 'readwrite', async (tables) => {
            const meta = await checked(tables, lease.scope, lease);
            const current = await tables.get<ResourceJob>('jobs', [lease.scope.partition, job.key]);
            if (current) { current.error = message; current.attempts++; current.nextAttemptAt = retryAt; await tables.put('jobs', current); }
            meta.error = message; meta.revision++; await tables.put('meta', meta);
        });
    }

    async putBlob(scope: AccountScope, data: Blob): Promise<string> {
        if (!data.size || data.size > 25 * 1024 * 1024) throw new Error('Images must be between 1 byte and 25 MB.');
        const id = `blob_${await bytesHash(await data.arrayBuffer())}`;
        await this.driver.transaction(['control', 'meta', 'blobs'], 'readwrite', async (tables) => {
            await checked(tables, scope);
            if (!await tables.get('blobs', [scope.partition, id])) await tables.put('blobs', { partition: scope.partition, id, data, uploaded: 0 });
        });
        return id;
    }
    async getBlob(scope: AccountScope, id: string): Promise<LocalBlob | null> {
        return this.driver.transaction(['control', 'meta', 'blobs'], 'readonly', async (tables) => { await checked(tables, scope); return await tables.get<LocalBlob>('blobs', [scope.partition, id]) || null; });
    }
    async uploaded(lease: Lease, id: string, received: number): Promise<void> {
        await this.driver.transaction(['control', 'meta', 'blobs'], 'readwrite', async (tables) => {
            await checked(tables, lease.scope, lease);
            const blob = await tables.get<LocalBlob>('blobs', [lease.scope.partition, id]);
            if (blob) { blob.uploaded = received; await tables.put('blobs', blob); }
        });
    }

    async resolve(scope: AccountScope, operationId: string, choice: 'server' | 'mine'): Promise<LocalNotice> {
        return this.driver.transaction(TABLES, 'readwrite', async (tables) => {
            const meta = await checked(tables, scope);
            const all = (await tables.all<Intent>('outbox', scope.partition)).sort((a, b) => a.sequence - b.sequence);
            const target = all.find((item) => item.operationId === operationId);
            if (!target || !['conflict', 'rejected'].includes(target.status)) throw new Error('Only settled conflicts or rejected edits can be resolved.');
            const selected = new Set([operationId]);
            const commands: DomainCommand[] = [];
            for (const intent of all) {
                if (intent.dependsOn && selected.has(intent.dependsOn)) selected.add(intent.operationId);
                if (!selected.has(intent.operationId) || !outstanding(intent)) continue;
                if (intent.status === 'sending') throw new Error('Wait for delivery to settle before resolving this edit.');
                commands.push(intent.command); intent.status = 'discarded';
                await tables.put('outbox', intent);
                await journal(tables, meta, intent.operationId, { type: 'IntentDiscarded', reason: choice });
            }
            await project(tables, scope.partition);
            if (choice === 'mine') for (const command of commands) { await this.appendIntent(tables, meta, scope, command); await project(tables, scope.partition); }
            meta.revision++; meta.syncRequested = true; meta.nextAttemptAt = 0;
            await tables.put('meta', meta); return notice(scope, meta);
        });
    }

    async rebuild(scope: AccountScope): Promise<LocalNotice> {
        const captured = await this.driver.transaction(['control', 'meta', 'checkpoints', 'events'], 'readonly', async (tables) => ({ meta: await checked(tables, scope), balances: await tables.all<StoredCheckpoint>('checkpoints', scope.partition), events: await tables.all<StoredEvent>('events', scope.partition) }));
        const newest = new Map<string, StoredCheckpoint>();
        for (const balance of captured.balances) if (!newest.has(balance.id) || newest.get(balance.id)!.sequence < balance.sequence) newest.set(balance.id, balance);
        const replicas: StoredReplica[] = [];
        for (const balance of newest.values()) {
            const events = captured.events.filter((entry) => entry.id === balance.id && entry.sequence > balance.sequence).sort((a, b) => a.sequence - b.sequence).map((entry) => entry.event);
            let state = balance.checkpoint.state;
            for (const event of events) state = applyEvent(state, event.event, balance.id, event.recordedAt);
            const last = events[events.length - 1];
            const replica: StoredReplica = { partition: scope.partition, id: balance.id, checkpoint: balance.checkpoint, events, state, sequence: last?.aggregateSequence || balance.sequence, hash: last?.eventHash || balance.checkpoint.ledgerHash };
            await verifyReplica(replica); replicas.push(replica);
        }
        return this.driver.transaction(TABLES, 'readwrite', async (tables) => {
            const meta = await checked(tables, scope);
            if (meta.revision !== captured.meta.revision) throw new Error('Data changed during reconstruction. Retry to use the latest ledger.');
            for (const row of await tables.all<StoredReplica>('base', scope.partition)) await tables.remove('base', [scope.partition, row.id]);
            for (const replica of replicas) await tables.put('base', replica);
            const entries = (await tables.all<JournalEntry>('journal', scope.partition)).sort((a, b) => a.sequence - b.sequence);
            const intents = new Map<string, Intent>();
            for (const entry of entries) {
                const fact = entry.fact;
                if (fact.type === 'IntentRecorded') intents.set(entry.operationId, structuredClone(fact.intent));
                const intent = intents.get(entry.operationId);
                if (!intent) continue;
                if (fact.type === 'RequestPrepared') intent.prepared = fact.request;
                if (fact.type === 'IntentSettled') { intent.status = fact.outcome.status; intent.outcome = fact.outcome; intent.error = fact.outcome.message || null; }
                if (fact.type === 'IntentDiscarded') intent.status = 'discarded';
            }
            for (const intent of intents.values()) await tables.put('outbox', intent);
            await project(tables, scope.partition);
            meta.revision++; await tables.put('meta', meta); return notice(scope, meta);
        });
    }
}
