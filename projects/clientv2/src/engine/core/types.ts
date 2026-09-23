import type { AccountScope, AggregateState, CommandOutcome, CommandRequest, DomainCommand, DomainEvent, LocalSnapshot, PublicUser, Query, Replica, ResourceQuery, Session, StoredResource, SyncPage } from '@torimtg/core';
import type { AuthSession, TokenPair } from '@torimtg/core';
export type { AccountScope, Query, LocalSnapshot } from '@torimtg/core';

export type Intent = {
    partition: string; operationId: string; sequence: number; command: DomainCommand;
    originalBaseRevision: number; dependsOn: string | null; createdAt: string;
    deckDependsOn?: string;
    status: 'queued' | 'sending' | 'retry' | 'accepted' | 'conflict' | 'rejected' | 'discarded';
    prepared: CommandRequest | null; outcome: CommandOutcome | null;
    attempts: number; nextAttemptAt: number; error: string | null;
};
export type JournalEntry = {
    partition: string; sequence: number; operationId: string; at: string;
    fact: { type: 'IntentRecorded'; intent: Intent; events: DomainEvent[] }
        | { type: 'IntentAmended'; command: DomainCommand; events: DomainEvent[] }
        | { type: 'RequestPrepared'; request: CommandRequest }
        | { type: 'IntentSettled'; outcome: CommandOutcome }
        | { type: 'IntentDiscarded'; reason: string };
};
export type LocalNotice = { partition: string; generation: number; localRevision: number };
export type LocalCommit = LocalNotice & { operationId: string };
export type Lease = { scope: AccountScope; owner: string; fence: number; expiresAt: number };
export type ReplicaMeta = {
    partition: string; revision: number; sequence: number; clientId: string;
    cursor: number; bootstrap: { complete: boolean; after: string; watermark: number };
    validatedAt: string | null; refresh: LocalSnapshot['refresh']; error: string | null;
    nextAttemptAt: number; lease: Lease | null; syncRequested: boolean;
};
export type AuthControl = { session: Session | null; generation: number; locked: boolean; pendingLogout: boolean; error: string | null; job: { id: string; type: 'session' | 'login' | 'setup' | 'logout'; status: 'queued' | 'complete' | 'failed' } | null };
export type AuthCredentials = { tokens: TokenPair; serverInstanceId: string; accountId: number; generation: number; refreshRequestId: string | null };
export type ResourceJob = { partition: string; key: string; query: ResourceQuery; generation: number; served: number; attempts: number; nextAttemptAt: number; error: string | null };
export type LocalBlob = { partition: string; id: string; data: Blob; uploaded: number };
export type Dataset = { states: AggregateState[]; catalog: Record<string, unknown>; events: Replica['events']; intents: Intent[]; meta: ReplicaMeta; resources: StoredResource[]; legacyHistory?: unknown[] };

export interface LocalStore {
    open(): Promise<void>;
    close(): void;
    auth(): Promise<AuthControl>;
    startAuth(type: 'session' | 'login' | 'setup' | 'logout'): Promise<string>;
    finishAuth(id: string, session: AuthSession | null, error?: string): Promise<void>;
    credentials(): Promise<AuthCredentials | null>;
    prepareRefresh(): Promise<AuthCredentials>;
    rotateCredentials(previous: AuthCredentials, result: AuthSession): Promise<void>;
    scope(): Promise<AccountScope | null>;
    dataset(scope: AccountScope): Promise<Dataset>;
    commit(scope: AccountScope, command: DomainCommand): Promise<LocalCommit>;
    refresh(scope: AccountScope, resource?: ResourceQuery, retry?: boolean): Promise<void>;
    acquire(scope: AccountScope, owner: string): Promise<Lease | null>;
    renew(lease: Lease): Promise<boolean>;
    release(lease: Lease): Promise<void>;
    prepare(lease: Lease): Promise<Intent | null>;
    settle(lease: Lease, result: CommandOutcome | SyncPage): Promise<LocalNotice>;
    fail(lease: Lease, operationId: string | null, message: string, retryAt: number, terminal?: boolean, authRequired?: boolean): Promise<void>;
    jobs(scope: AccountScope): Promise<ResourceJob[]>;
    /**
     * The stored copy of one resource, if any, its download job, if one was ever queued,
     * and whether sync is paused (backing off after a failure, or waiting for sign-in).
     */
    resourceState(scope: AccountScope, query: ResourceQuery): Promise<{ resource: StoredResource | null; job: ResourceJob | null; syncPaused: boolean }>;
    saveResource(lease: Lease, job: ResourceJob, resource: StoredResource): Promise<LocalNotice>;
    failResource(lease: Lease, job: ResourceJob, message: string, retryAt: number): Promise<void>;
    putBlob(scope: AccountScope, blob: Blob): Promise<string>;
    getBlob(scope: AccountScope, id: string): Promise<LocalBlob | null>;
    uploaded(lease: Lease, id: string, received: number): Promise<void>;
    resolve(scope: AccountScope, operationId: string, choice: 'server' | 'mine'): Promise<LocalNotice>;
    rebuild(scope: AccountScope): Promise<LocalNotice>;
}
export interface ToriMTG {
    commands: { execute(command: DomainCommand): Promise<LocalCommit>; resolve(operationId: string, choice: 'server' | 'mine'): Promise<void> };
    queries: { read<T>(query: Query): Promise<LocalSnapshot<T>>; requestRefresh(query?: Query): Promise<void> };
    open(): Promise<void>;
    subscribe(listener: (notice: LocalNotice) => void): () => void;
    session(): Promise<Session>;
    signIn(username: string, password: string, setup: boolean): Promise<PublicUser>;
    signOut(): Promise<void>;
    saveBlob(blob: Blob): Promise<string>;
    blob(id: string): Promise<Blob>;
    pending(): Promise<Intent[]>;
    exportPending(): Promise<Blob>;
}
