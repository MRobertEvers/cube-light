import { randomBytes } from 'crypto';
import { applyEvent, DomainError } from '@torimtg/core';
import type { AggregateState, Checkpoint, DomainEvent, EventEnvelope, CardQuantityChange } from '@torimtg/core';
import type { SqliteTransaction } from '../database/sqlite';
import { digest } from './repository';

/**
 * Merging one application database's shared data into another: the event ledger, the accounts
 * and the uploaded blobs. Everything else (sessions, signing keys, receipts, scan leases, this
 * server's identity) belongs to one server and is never merged.
 *
 * Each aggregate is a hash chain. Where one database's chain extends the other's, the missing
 * events are copied verbatim. Where the two have forked (both servers changed the aggregate
 * since they last met), the source's chain is kept and the target's own events after the fork
 * are replayed on top of it, as a git rebase does: card quantity changes are recomputed from
 * their deltas, other events are applied as they were. An event that no longer applies (its
 * aggregate was deleted meanwhile, say) is dropped and reported as a conflict.
 */

export type MergeConflict = { aggregateId: string; kind: string; detail: string };
export type MergeResult = {
    /** Aggregates whose chain changed in the target. */
    aggregates: number;
    /** Events the target's chains gained (copied and rebased). */
    events: number;
    /** Target events replayed onto the source's chain after a fork. */
    rebased: number;
    users: number;
    blobs: number;
    conflicts: MergeConflict[];
};

type HeadRow = { Id: string; Sequence: number; Hash: string };
type UserRow = {
    UserId: number; Name: string | null; Username: string; PasswordHash: string;
    ProfileCardName: string | null; ProfileCardUuid: string | null; ProfileArt: string | null; ProfileCropJson: string | null;
    CreatedAt: string; UpdatedAt: string; token_generation: number;
};

/** Brings everything `source` has that `target` lacks into `target`. Both are open transactions. */
export function mergeInto(target: SqliteTransaction, source: SqliteTransaction): MergeResult {
    const result: MergeResult = { aggregates: 0, events: 0, rebased: 0, users: 0, blobs: 0, conflicts: [] };
    const skippedProfiles = mergeUsers(target, source, result);
    result.blobs = mergeBlobs(target, source);
    for (const head of source.all<HeadRow>('SELECT Id, Sequence, Hash FROM SyncHeads ORDER BY Id')) {
        if (skippedProfiles.has(head.Id)) continue;
        mergeAggregate(target, source, head, result);
    }
    return result;
}

/**
 * Accounts by id and name. A new account keeps its id, so its profile aggregate (profile_<id>)
 * lines up. The newer password and profile columns win; the token generation only rises, so
 * "sign out everywhere" on one server signs out the other's devices too. An account whose id
 * or name is another account's on the other side is a conflict, and its profile is not merged.
 */
function mergeUsers(target: SqliteTransaction, source: SqliteTransaction, result: MergeResult): Set<string> {
    const skipped = new Set<string>();
    const columns = new Set(target.all<{ name: string }>('PRAGMA table_info(Users)').map((column) => column.name));
    if (!columns.has('PasswordHash') || !columns.has('token_generation')) return skipped;
    const sourceColumns = new Set(source.all<{ name: string }>('PRAGMA table_info(Users)').map((column) => column.name));
    if (!sourceColumns.has('PasswordHash') || !sourceColumns.has('token_generation')) return skipped;
    const select = `SELECT UserId, Name, Username, PasswordHash, ProfileCardName, ProfileCardUuid, ProfileArt, ProfileCropJson,
        CreatedAt, UpdatedAt, token_generation FROM Users`;
    for (const user of source.all<UserRow>(`${select} WHERE PasswordHash IS NOT NULL ORDER BY UserId`)) {
        const byId = target.get<UserRow>(`${select} WHERE UserId=?`, [user.UserId]);
        const byName = target.get<UserRow>(`${select} WHERE Username=? COLLATE NOCASE`, [user.Username]);
        if (byName && byName.UserId !== user.UserId) {
            skipped.add(`profile_${user.UserId}`);
            result.conflicts.push({ aggregateId: `profile_${user.UserId}`, kind: 'account', detail: `The account ${user.Username} has id ${user.UserId} here and ${byName.UserId} there.` });
            continue;
        }
        if (!byId) {
            target.run(`INSERT INTO Users (UserId, Name, Username, PasswordHash, ProfileCardName, ProfileCardUuid, ProfileArt, ProfileCropJson,
                CreatedAt, UpdatedAt, token_generation) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, [user.UserId, user.Name, user.Username,
                user.PasswordHash, user.ProfileCardName, user.ProfileCardUuid, user.ProfileArt, user.ProfileCropJson, user.CreatedAt, user.UpdatedAt,
                user.token_generation]);
            result.users++;
            continue;
        }
        if (byId.Username && byId.Username.toLowerCase() !== user.Username.toLowerCase()) {
            skipped.add(`profile_${user.UserId}`);
            result.conflicts.push({ aggregateId: `profile_${user.UserId}`, kind: 'account', detail: `Account id ${user.UserId} is ${byId.Username} here and ${user.Username} there.` });
            continue;
        }
        let changed = false;
        if (user.UpdatedAt > byId.UpdatedAt && (user.PasswordHash !== byId.PasswordHash || user.ProfileCardUuid !== byId.ProfileCardUuid
            || user.ProfileArt !== byId.ProfileArt || user.ProfileCropJson !== byId.ProfileCropJson || user.ProfileCardName !== byId.ProfileCardName)) {
            target.run(`UPDATE Users SET PasswordHash=?, ProfileCardName=?, ProfileCardUuid=?, ProfileArt=?, ProfileCropJson=?, UpdatedAt=?
                WHERE UserId=?`, [user.PasswordHash, user.ProfileCardName, user.ProfileCardUuid, user.ProfileArt, user.ProfileCropJson,
                user.UpdatedAt, user.UserId]);
            changed = true;
        }
        if (user.token_generation > byId.token_generation) {
            target.run('UPDATE Users SET token_generation=? WHERE UserId=?', [user.token_generation, user.UserId]);
            changed = true;
        }
        if (changed) result.users++;
    }
    return skipped;
}

/** Blobs are named by their content's hash, so any the target lacks are copied as they are. */
function mergeBlobs(target: SqliteTransaction, source: SqliteTransaction): number {
    const present = new Set(target.all<{ Id: string }>('SELECT Id FROM SyncBlobs').map((row) => row.Id));
    let copied = 0;
    for (const row of source.all<{ Id: string }>('SELECT Id FROM SyncBlobs')) {
        if (present.has(row.Id)) continue;
        const blob = source.get<{ Id: string; ContentType: string; Data: Uint8Array }>('SELECT Id, ContentType, Data FROM SyncBlobs WHERE Id=?', [row.Id])!;
        target.run('INSERT OR IGNORE INTO SyncBlobs VALUES (?, ?, ?)', [blob.Id, blob.ContentType, blob.Data]);
        copied++;
    }
    return copied;
}

function mergeAggregate(target: SqliteTransaction, source: SqliteTransaction, sourceHead: HeadRow, result: MergeResult): void {
    const id = sourceHead.Id;
    const targetHead = target.get<HeadRow>('SELECT Id, Sequence, Hash FROM SyncHeads WHERE Id=?', [id]);
    if (targetHead && targetHead.Hash === sourceHead.Hash && targetHead.Sequence === sourceHead.Sequence) return;
    const common = targetHead ? commonLength(target, source, id, Math.min(targetHead.Sequence, sourceHead.Sequence)) : 0;
    // The target is ahead of (or level with) the source: nothing to bring over.
    if (targetHead && common === sourceHead.Sequence) return;

    const previousSequence = targetHead ? targetHead.Sequence : 0;
    const forked = targetHead ? readEvents(target, id, common) : [];
    if (forked.length) {
        target.run('DELETE FROM SyncEvents WHERE AggregateId=? AND Sequence>?', [id, common]);
        target.run('DELETE FROM SyncCheckpoints WHERE AggregateId=? AND Sequence>?', [id, common]);
    }
    // One commit position per aggregate, so the change feed pages through merged aggregates.
    const position = target.run('INSERT INTO SyncCommits(OperationId) VALUES (?)', [`shared-merge:${randomBytes(12).toString('hex')}`]).lastID;
    const incoming = readEvents(source, id, common);
    for (const envelope of incoming) {
        target.run('INSERT INTO SyncEvents VALUES (?, ?, ?, ?, ?)', [envelope.eventId, id, envelope.aggregateSequence, position, JSON.stringify(envelope)]);
    }
    let replayed = replay(target, id);
    for (const envelope of forked) {
        let event: DomainEvent;
        let state: AggregateState;
        try {
            event = rebaseEvent(replayed.state, envelope.event);
            state = applyEvent(replayed.state, event, id, envelope.recordedAt);
        } catch (error) {
            if (!(error instanceof DomainError)) throw error;
            result.conflicts.push({ aggregateId: id, kind: 'dropped-event', detail: `${error.message} ${JSON.stringify(envelope)}` });
            continue;
        }
        const unsigned = {
            eventId: randomBytes(16).toString('hex'), aggregateId: id, aggregateSequence: replayed.sequence + 1, commitPosition: position,
            operationId: envelope.operationId, actorId: envelope.actorId, recordedAt: envelope.recordedAt, eventSchemaVersion: 1 as const,
            previousEventHash: replayed.hash, event
        };
        const rebased: EventEnvelope = {
            eventId: unsigned.eventId, aggregateId: unsigned.aggregateId, aggregateSequence: unsigned.aggregateSequence,
            commitPosition: unsigned.commitPosition, operationId: unsigned.operationId, actorId: unsigned.actorId, recordedAt: unsigned.recordedAt,
            eventSchemaVersion: unsigned.eventSchemaVersion, previousEventHash: unsigned.previousEventHash, event: unsigned.event, eventHash: digest(unsigned)
        };
        target.run('INSERT INTO SyncEvents VALUES (?, ?, ?, ?, ?)', [rebased.eventId, id, rebased.aggregateSequence, position, JSON.stringify(rebased)]);
        replayed = { state, sequence: rebased.aggregateSequence, hash: rebased.eventHash, lastEventId: rebased.eventId };
        result.rebased++;
    }
    // Clients skip a replica older than the one they hold, and refuse one with the same sequence
    // and another hash; a rebase that dropped events can leave the chain no longer than before.
    if (forked.length && replayed.sequence <= previousSequence) {
        result.conflicts.push({ aggregateId: id, kind: 'shortened', detail: `Rebased to sequence ${replayed.sequence}, devices may hold ${previousSequence}.` });
    }
    target.run('INSERT INTO SyncHeads VALUES (?, ?, ?, ?, ?) ON CONFLICT(Id) DO UPDATE SET Sequence=excluded.Sequence, Hash=excluded.Hash, State=excluded.State, Position=excluded.Position',
        [id, replayed.sequence, replayed.hash, JSON.stringify(replayed.state), position]);
    const checkpoint: Checkpoint = {
        aggregateId: id, throughSequence: replayed.sequence, throughEventId: replayed.lastEventId, schemaVersion: 1, reducerVersion: 1,
        stateHash: digest(replayed.state), ledgerHash: replayed.hash, createdAt: new Date().toISOString(), state: replayed.state
    };
    target.run('INSERT OR REPLACE INTO SyncCheckpoints VALUES (?, ?, ?, ?)', [id, replayed.sequence, position, JSON.stringify(checkpoint)]);
    result.aggregates++;
    result.events += incoming.length;
}

/** How many leading events the two chains share. Chains are hashed, so equal at k means equal before k. */
function commonLength(target: SqliteTransaction, source: SqliteTransaction, id: string, upTo: number): number {
    function same(sequence: number): boolean {
        const ours = eventHash(target, id, sequence);
        return ours !== null && ours === eventHash(source, id, sequence);
    }
    if (upTo === 0 || same(upTo)) return upTo;
    let low = 0;
    let high = upTo - 1;
    while (low < high) {
        const middle = Math.ceil((low + high) / 2);
        if (same(middle)) low = middle;
        else high = middle - 1;
    }
    return low;
}

function eventHash(tx: SqliteTransaction, id: string, sequence: number): string | null {
    const row = tx.get<{ Envelope: string }>('SELECT Envelope FROM SyncEvents WHERE AggregateId=? AND Sequence=?', [id, sequence]);
    return row ? (JSON.parse(row.Envelope) as EventEnvelope).eventHash : null;
}

function readEvents(tx: SqliteTransaction, id: string, after: number): EventEnvelope[] {
    return tx.all<{ Envelope: string }>('SELECT Envelope FROM SyncEvents WHERE AggregateId=? AND Sequence>? ORDER BY Sequence', [id, after])
        .map((row) => JSON.parse(row.Envelope) as EventEnvelope);
}

/** The aggregate's state from its whole chain, checking every link as SyncRepository does. */
function replay(tx: SqliteTransaction, id: string): { state: AggregateState; sequence: number; hash: string; lastEventId: string } {
    let state: AggregateState | null = null;
    let sequence = 0;
    let hash = '';
    let lastEventId = '';
    for (const event of readEvents(tx, id, 0)) {
        const unsigned = {
            eventId: event.eventId, aggregateId: event.aggregateId, aggregateSequence: event.aggregateSequence, commitPosition: event.commitPosition,
            operationId: event.operationId, actorId: event.actorId, recordedAt: event.recordedAt, eventSchemaVersion: event.eventSchemaVersion,
            previousEventHash: event.previousEventHash, event: event.event
        };
        if (event.aggregateId !== id || event.eventSchemaVersion !== 1 || event.aggregateSequence !== sequence + 1 || event.previousEventHash !== hash
            || digest(unsigned) !== event.eventHash) throw new Error(`The shared database's ledger for ${id} does not balance.`);
        state = applyEvent(state, event.event, id, event.recordedAt);
        sequence = event.aggregateSequence;
        hash = event.eventHash;
        lastEventId = event.eventId;
    }
    if (!state) throw new Error(`The shared database has no events for ${id}.`);
    return { state, sequence, hash, lastEventId };
}

/**
 * The event as it applies on top of `state`. Quantity changes carry the counts before and after,
 * which the other server's edits have moved, so they are recomputed from their deltas (never
 * below zero). Everything else sets a value and applies as it is.
 */
function rebaseEvent(state: AggregateState, event: DomainEvent): DomainEvent {
    if (event.type !== 'CardQuantitiesAdjusted' && event.type !== 'CollectionCardsAdjusted') return event;
    const counts = new Map<string, number>();
    const changes = event.changes.map((change) => {
        const board = change.board === 'side' ? 'side' : 'main';
        const key = `${board}:${change.uuid}`;
        let held = 0;
        if (state.kind === 'deck') held = (board === 'side' ? state.sideboard || {} : state.cards)[change.uuid] || 0;
        else if (state.kind === 'collection') held = (state.cards || {})[change.uuid] || 0;
        const previous = counts.has(key) ? counts.get(key)! : held;
        const resulting = Math.max(0, previous + change.delta);
        counts.set(key, resulting);
        const rebased: CardQuantityChange = { uuid: change.uuid, previous, delta: resulting - previous, resulting };
        if (change.board !== undefined) rebased.board = change.board;
        return rebased;
    });
    return { ...event, changes };
}
