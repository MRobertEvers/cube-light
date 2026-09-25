import { createHash, randomBytes } from 'crypto';
import { applyEvent, canonicalJson, decide, isPublicId, CHECKPOINT_AGE_MS, CHECKPOINT_EVENTS, DomainError } from '@torimtg/core';
import type { AggregateState, CardEdit, Checkpoint, CollectionState, CommandOutcome, CommandRequest, DomainEvent, EventEnvelope, NamedState, PlacementMove, Replica, DeckState, WorkState } from '@torimtg/core';
import { SqliteDatabase, SqliteTransaction } from '../database/sqlite';

type HeadRow = { Id: string; Sequence: number; Hash: string; State: string; Position: number };
type EventRow = { Envelope: string };

export function digest(value: unknown): string {
    return createHash('sha256').update(canonicalJson(value)).digest('hex');
}

/** Owns the event/receipt/projection transaction. Callers never receive SQL handles. */
export class SyncRepository {
    readonly database: SqliteDatabase;
    serverInstanceId = '';

    constructor(database: SqliteDatabase) { this.database = database; }

    async initialize(): Promise<void> {
        await this.database.exec(`
            CREATE TABLE IF NOT EXISTS SyncMeta (Key TEXT PRIMARY KEY, Value TEXT NOT NULL);
            CREATE TABLE IF NOT EXISTS SyncHeads (Id TEXT PRIMARY KEY, Sequence INTEGER NOT NULL, Hash TEXT NOT NULL, State TEXT NOT NULL, Position INTEGER NOT NULL);
            CREATE TABLE IF NOT EXISTS SyncCommits (Position INTEGER PRIMARY KEY AUTOINCREMENT, OperationId TEXT NOT NULL);
            CREATE TABLE IF NOT EXISTS SyncEvents (Id TEXT PRIMARY KEY, AggregateId TEXT NOT NULL, Sequence INTEGER NOT NULL, Position INTEGER NOT NULL, Envelope TEXT NOT NULL, UNIQUE(AggregateId, Sequence));
            CREATE INDEX IF NOT EXISTS SyncEvents_Position ON SyncEvents(Position);
            CREATE TABLE IF NOT EXISTS SyncCheckpoints (AggregateId TEXT NOT NULL, Sequence INTEGER NOT NULL, Position INTEGER NOT NULL, Balance TEXT NOT NULL, PRIMARY KEY(AggregateId, Sequence));
            CREATE TABLE IF NOT EXISTS SyncReceipts (AccountId INTEGER NOT NULL, OperationId TEXT NOT NULL, RequestHash TEXT NOT NULL, Outcome TEXT NOT NULL, PRIMARY KEY(AccountId, OperationId));
            CREATE TABLE IF NOT EXISTS SyncBlobs (Id TEXT PRIMARY KEY, ContentType TEXT NOT NULL, Data BLOB NOT NULL);
            CREATE TABLE IF NOT EXISTS SyncBlobChunks (Id TEXT NOT NULL, Offset INTEGER NOT NULL, Total INTEGER NOT NULL, ContentType TEXT NOT NULL, Data BLOB NOT NULL, PRIMARY KEY(Id, Offset));
            CREATE TABLE IF NOT EXISTS SyncWorkClaims (Id TEXT PRIMARY KEY, Token TEXT NOT NULL, ExpiresAt INTEGER NOT NULL, Completed INTEGER NOT NULL DEFAULT 0, Total INTEGER NOT NULL DEFAULT 0);
        `);
        this.database.transaction((tx) => {
            let identity = tx.get<{ Value: string }>("SELECT Value FROM SyncMeta WHERE Key='instance'");
            if (!identity) {
                identity = { Value: randomBytes(16).toString('hex') };
                tx.run("INSERT INTO SyncMeta VALUES ('instance', ?)", [identity.Value]);
            }
            this.serverInstanceId = identity.Value;
            if (!tx.get("SELECT 1 FROM SyncMeta WHERE Key='legacy-imported'")) {
                this.importLegacy(tx);
                tx.run("INSERT INTO SyncMeta VALUES ('legacy-imported', '1')");
            }
            // Collections were first imported by name only; their cards follow in a step of their own.
            if (!tx.get("SELECT 1 FROM SyncMeta WHERE Key='legacy-collection-cards-imported'")) {
                this.importLegacyCollectionCards(tx);
                tx.run("INSERT INTO SyncMeta VALUES ('legacy-collection-cards-imported', '1')");
            }
        });
    }

    private importLegacy(tx: SqliteTransaction): void {
        const now = new Date().toISOString();
        const decks = tx.all<any>('SELECT * FROM Decks');
        for (const row of decks) {
            const cards: Record<string, number> = {};
            for (const card of tx.all<any>('SELECT Uuid, Count FROM Deck_Cards WHERE DeckId=?', [row.DeckId])) cards[card.Uuid] = (cards[card.Uuid] || 0) + card.Count;
            const state: DeckState = { id: row.PublicId, kind: 'deck', name: row.Name, deleted: false, cards, art: row.Art, bannerCardUuid: row.BannerCardUuid, palette: parseJson(row.PaletteJson), bannerCrop: parseJson(row.BannerCropJson), topStyle: row.TopStyle || 'card', bannerBlend: null, createdAt: row.CreatedAt, updatedAt: row.UpdatedAt };
            const blend = tx.get<any>('SELECT * FROM DeckBannerBlends WHERE DeckId=?', [row.DeckId]);
            if (blend) {
                const images = { desktop: this.importBlob(tx, blend.DesktopImage, 'image/png'), mobile: this.importBlob(tx, blend.MobileImage, 'image/png'), tile: this.importBlob(tx, blend.TileImage, 'image/png') };
                state.bannerBlend = { config: JSON.parse(blend.ConfigJson), source: blend.SourceArt || '', crop: parseJson(blend.CropJson) || { desktop: { x: .5, y: .5, zoom: 1 }, mobile: { x: .5, y: .5, zoom: 1 } }, images };
            }
            this.opening(tx, state, { type: 'DeckImportedFromLegacy', state }, now);
        }
        for (const kind of ['collection', 'location'] as const) {
            const table = kind === 'collection' ? 'Collections' : 'StorageLocations';
            for (const row of tx.all<any>(`SELECT * FROM ${table}`)) {
                const state = { id: row.PublicId, kind, name: row.Name, deleted: false, createdAt: row.CreatedAt, updatedAt: row.UpdatedAt } as NamedState;
                this.opening(tx, state, { type: kind === 'collection' ? 'CollectionImportedFromLegacy' : 'StorageLocationImportedFromLegacy', state }, now);
            }
        }
        for (const row of tx.all<any>('SELECT * FROM WorkItems')) {
            const deck = decks.find((item) => item.DeckId === row.DeckId);
            if (!deck) continue;
            const state: WorkState = { id: row.PublicId, kind: 'work', deckId: deck.PublicId, deleted: false, fileName: row.FileName, contentType: row.ContentType, blobId: this.importBlob(tx, row.Image, row.ContentType), pipeline: row.Pipeline, status: row.Status === 'running' ? 'pending' : row.Status, completed: 0, total: 0, cardsAdded: row.CardsAdded, error: row.Error, createdAt: row.CreatedAt, updatedAt: row.UpdatedAt };
            this.opening(tx, state, { type: 'WorkImportedFromLegacy', state }, now);
        }
        for (const row of tx.all<any>('SELECT * FROM Users')) {
            const state = { id: `profile_${row.UserId}`, kind: 'profile' as const, userId: row.UserId, deleted: false, profile: row.ProfileCardUuid ? { cardName: row.ProfileCardName, cardUuid: row.ProfileCardUuid, art: row.ProfileArt, crop: parseJson(row.ProfileCropJson) } : null, printingView: 'grid' as const, createdAt: row.CreatedAt, updatedAt: row.UpdatedAt };
            this.opening(tx, state, { type: 'ProfileImportedFromLegacy', state }, now);
        }
    }

    /** Files each legacy Collection_Cards row into its collection, and into its storage location when it had one. */
    private importLegacyCollectionCards(tx: SqliteTransaction): void {
        if (!tx.get("SELECT 1 FROM sqlite_master WHERE type='table' AND name='Collection_Cards'")) return;
        const rows = tx.all<any>(`SELECT c.PublicId AS CollectionId, l.PublicId AS LocationId, cc.Uuid, cc.Count
            FROM Collection_Cards cc JOIN Collections c ON c.CollectionId = cc.CollectionId
            LEFT JOIN StorageLocations l ON l.StorageLocationId = cc.StorageLocationId
            WHERE cc.Uuid IS NOT NULL AND cc.Count > 0`);
        const byCollection = new Map<string, any[]>();
        for (const row of rows) {
            if (!/^[A-Za-z0-9_-]{1,128}$/.test(row.Uuid)) continue;
            const list = byCollection.get(row.CollectionId) || [];
            list.push(row);
            byCollection.set(row.CollectionId, list);
        }
        const now = new Date().toISOString();
        for (const entry of byCollection) {
            const id = entry[0];
            const head = tx.get<HeadRow>('SELECT * FROM SyncHeads WHERE Id=?', [id]);
            if (!head) continue;
            let state = JSON.parse(head.State) as CollectionState;
            if (state.kind !== 'collection' || state.deleted) continue;
            const edits: CardEdit[] = entry[1].map((row) => ({ uuid: row.Uuid, action: 'add', count: row.Count }));
            const moves: PlacementMove[] = entry[1].filter((row) => row.LocationId && isPublicId(row.LocationId, 'location')).map((row) => ({ uuid: row.Uuid, from: null, to: row.LocationId, count: row.Count }));
            const events = decide(state, { type: 'collection.cards', id, edits });
            state = events.reduce<CollectionState>((current, event) => applyEvent(current, event, id, now) as CollectionState, state);
            if (moves.length) for (const event of decide(state, { type: 'collection.place', id, moves })) events.push(event);
            if (!events.length) continue;
            const operationId = `legacy-cards:${id}`;
            const position = tx.run('INSERT INTO SyncCommits(OperationId) VALUES (?)', [operationId]).lastID;
            this.append(tx, id, events, operationId, 0, now, position);
        }
    }

    private importBlob(tx: SqliteTransaction, bytes: Uint8Array, contentType: string): string {
        const id = `blob_${createHash('sha256').update(bytes).digest('hex')}`;
        tx.run('INSERT OR IGNORE INTO SyncBlobs VALUES (?, ?, ?)', [id, contentType, bytes]);
        return id;
    }

    private opening(tx: SqliteTransaction, state: AggregateState, event: DomainEvent, at: string): void {
        const operationId = `legacy:${state.id}`;
        const position = tx.run('INSERT INTO SyncCommits(OperationId) VALUES (?)', [operationId]).lastID;
        this.append(tx, state.id, [event], operationId, 0, at, position);
    }

    private append(tx: SqliteTransaction, id: string, events: DomainEvent[], operationId: string, actorId: number, at: string, position: number): EventEnvelope[] {
        const head = tx.get<HeadRow>('SELECT * FROM SyncHeads WHERE Id=?', [id]);
        let state: AggregateState | null = head ? JSON.parse(head.State) : null;
        let sequence = head?.Sequence || 0;
        let hash = head?.Hash || '';
        const envelopes: EventEnvelope[] = [];
        for (const event of events) {
            const unsigned = { eventId: randomBytes(16).toString('hex'), aggregateId: id, aggregateSequence: ++sequence, commitPosition: position, operationId, actorId, recordedAt: at, eventSchemaVersion: 1 as const, previousEventHash: hash, event };
            const envelope: EventEnvelope = { eventId: unsigned.eventId, aggregateId: unsigned.aggregateId, aggregateSequence: unsigned.aggregateSequence, commitPosition: unsigned.commitPosition, operationId: unsigned.operationId, actorId: unsigned.actorId, recordedAt: unsigned.recordedAt, eventSchemaVersion: unsigned.eventSchemaVersion, previousEventHash: unsigned.previousEventHash, event: unsigned.event, eventHash: digest(unsigned) };
            state = applyEvent(state, event, id, at);
            hash = envelope.eventHash;
            tx.run('INSERT INTO SyncEvents VALUES (?, ?, ?, ?, ?)', [envelope.eventId, id, sequence, position, JSON.stringify(envelope)]);
            envelopes.push(envelope);
        }
        if (!state || !events.length) return envelopes;
        tx.run('INSERT INTO SyncHeads VALUES (?, ?, ?, ?, ?) ON CONFLICT(Id) DO UPDATE SET Sequence=excluded.Sequence, Hash=excluded.Hash, State=excluded.State, Position=excluded.Position', [id, sequence, hash, JSON.stringify(state), position]);
        const previous = tx.get<{ Balance: string }>('SELECT Balance FROM SyncCheckpoints WHERE AggregateId=? ORDER BY Sequence DESC LIMIT 1', [id]);
        const checkpoint: Checkpoint | null = previous ? JSON.parse(previous.Balance) : null;
        if (!checkpoint || sequence - checkpoint.throughSequence >= CHECKPOINT_EVENTS || Date.parse(at) - Date.parse(checkpoint.createdAt) >= CHECKPOINT_AGE_MS) {
            const replayed = this.reconstruct(tx, id, position);
            if (digest(replayed.state) !== digest(state)) throw new Error('Checkpoint does not balance with the ledger.');
            const balance: Checkpoint = { aggregateId: id, throughSequence: sequence, throughEventId: envelopes[envelopes.length - 1].eventId, schemaVersion: 1, reducerVersion: 1, stateHash: digest(state), ledgerHash: hash, createdAt: at, state };
            tx.run('INSERT INTO SyncCheckpoints VALUES (?, ?, ?, ?)', [id, sequence, position, JSON.stringify(balance)]);
        }
        return envelopes;
    }

    private reconstruct(tx: SqliteTransaction, id: string, position: number): { state: AggregateState; sequence: number; hash: string; events: EventEnvelope[]; checkpoint: Checkpoint | null } {
        const row = tx.get<{ Balance: string }>('SELECT Balance FROM SyncCheckpoints WHERE AggregateId=? AND Position<=? ORDER BY Sequence DESC LIMIT 1', [id, position]);
        const checkpoint: Checkpoint | null = row ? JSON.parse(row.Balance) : null;
        let state: AggregateState | null = checkpoint?.state || null;
        let sequence = checkpoint?.throughSequence || 0;
        let hash = checkpoint?.ledgerHash || '';
        if (checkpoint && digest(state) !== checkpoint.stateHash) throw new Error('Invalid checkpoint hash.');
        const events = tx.all<EventRow>('SELECT Envelope FROM SyncEvents WHERE AggregateId=? AND Sequence>? AND Position<=? ORDER BY Sequence', [id, sequence, position]).map((entry) => JSON.parse(entry.Envelope) as EventEnvelope);
        for (const event of events) {
            const eventHash = event.eventHash;
            const unsigned = { eventId: event.eventId, aggregateId: event.aggregateId, aggregateSequence: event.aggregateSequence, commitPosition: event.commitPosition, operationId: event.operationId, actorId: event.actorId, recordedAt: event.recordedAt, eventSchemaVersion: event.eventSchemaVersion, previousEventHash: event.previousEventHash, event: event.event };
            if (event.eventSchemaVersion !== 1 || event.aggregateSequence !== sequence + 1 || event.previousEventHash !== hash || digest(unsigned) !== eventHash) throw new Error('Invalid event ledger.');
            state = applyEvent(state, event.event, id, event.recordedAt);
            sequence = event.aggregateSequence;
            hash = eventHash;
        }
        if (!state) throw new DomainError('Aggregate not found.');
        return { state, sequence, hash, events, checkpoint };
    }

    private replica(tx: SqliteTransaction, id: string, positionArg?: number): Replica {
        const position = positionArg === undefined ? Number.MAX_SAFE_INTEGER : positionArg;
        const restored = this.reconstruct(tx, id, position);
        if (!restored.checkpoint) throw new Error('Aggregate has no opening checkpoint.');
        return { id, state: restored.state, sequence: restored.sequence, hash: restored.hash, events: restored.events, checkpoint: restored.checkpoint };
    }

    commit(request: CommandRequest, accountId: number): CommandOutcome {
        if (!request || request.protocolVersion !== 1 || request.serverInstanceId !== this.serverInstanceId || request.accountId !== accountId || request.datasetId !== 'shared' || typeof request.operationId !== 'string' || !/^[A-Za-z0-9_-]{16,80}$/.test(request.operationId) || !Number.isSafeInteger(request.expectedRevision) || request.expectedRevision < 0) throw new DomainError('Invalid sync envelope or account.');
        if (request.command.type.startsWith('profile.') && request.command.id !== `profile_${accountId}`) throw new DomainError('Cannot edit another account.');
        const requestHash = digest(request);
        return this.database.transaction((tx) => {
            const existing = tx.get<{ RequestHash: string; Outcome: string }>('SELECT * FROM SyncReceipts WHERE AccountId=? AND OperationId=?', [accountId, request.operationId]);
            if (existing) {
                if (existing.RequestHash !== requestHash) throw new DomainError('Operation ID reused with different content.');
                return JSON.parse(existing.Outcome);
            }
            const command = request.command;
            const head = tx.get<HeadRow>('SELECT * FROM SyncHeads WHERE Id=?', [command.id]);
            const state: AggregateState | null = head ? JSON.parse(head.State) : null;
            const outcome: CommandOutcome = { operationId: request.operationId, status: 'accepted', events: [], replicas: [], revisions: {} };
            const at = new Date().toISOString();
            tx.run('SAVEPOINT command_effects');
            try {
                if ((head?.Sequence || 0) !== request.expectedRevision) {
                    outcome.status = 'conflict'; outcome.message = 'This item changed on another device.';
                } else {
                    const events = decide(state, command);
                    if (command.type === 'deck.blend') for (const id of Object.values(command.blend.images)) this.requireBlob(tx, id);
                    if (command.type === 'work.queue') {
                        this.requireBlob(tx, command.blobId);
                        const deck = tx.get<HeadRow>('SELECT * FROM SyncHeads WHERE Id=?', [command.deckId]);
                        if (!deck || JSON.parse(deck.State).deleted) throw new DomainError('The destination deck was deleted.');
                    }
                    this.validateClaim(tx, request, state);
                    let deckEvents: DomainEvent[] = [];
                    if (command.type === 'work.complete') {
                        const deck = tx.get<HeadRow>('SELECT * FROM SyncHeads WHERE Id=?', [command.deckId]);
                        if (!deck || (state as WorkState).deckId !== command.deckId || deck.Sequence !== command.deckRevision) throw new DomainError('The scan destination changed; review its cards before completing.');
                        deckEvents = decide(JSON.parse(deck.State), { type: 'deck.cards', id: command.deckId, edits: command.edits });
                    }
                    const position = events.length || deckEvents.length ? tx.run('INSERT INTO SyncCommits(OperationId) VALUES (?)', [request.operationId]).lastID : 0;
                    outcome.events = this.append(tx, command.id, events, request.operationId, accountId, at, position);
                    if (command.type === 'work.complete') outcome.events = outcome.events.concat(this.append(tx, command.deckId, deckEvents, request.operationId, accountId, at, position));
                    this.updateClaim(tx, request);
                }
            } catch (error) {
                if (!(error instanceof DomainError)) throw error;
                tx.run('ROLLBACK TO command_effects');
                outcome.events = [];
                outcome.status = 'rejected'; outcome.message = error.message;
            }
            tx.run('RELEASE command_effects');
            for (const id of new Set([command.id].concat(outcome.events.map((event) => event.aggregateId)))) {
                if (!tx.get('SELECT 1 FROM SyncHeads WHERE Id=?', [id])) continue;
                const replica = this.replica(tx, id);
                outcome.replicas.push(replica); outcome.revisions[id] = replica.sequence;
            }
            tx.run('INSERT INTO SyncReceipts VALUES (?, ?, ?, ?)', [accountId, request.operationId, requestHash, JSON.stringify(outcome)]);
            return outcome;
        });
    }

    private requireBlob(tx: SqliteTransaction, id: string): void {
        if (!tx.get('SELECT 1 FROM SyncBlobs WHERE Id=?', [id])) throw new DomainError('The referenced upload has not finished.');
    }

    private validateClaim(tx: SqliteTransaction, request: CommandRequest, state: AggregateState | null): void {
        const command = request.command;
        if (!command.type.startsWith('work.') || !('token' in command)) return;
        if (!/^[a-f0-9-]{16,64}$/.test(command.token)) throw new DomainError('Invalid scan claim.');
        const claim = tx.get<{ Token: string; ExpiresAt: number }>('SELECT * FROM SyncWorkClaims WHERE Id=?', [command.id]);
        if (command.type === 'work.start') {
            if (claim && claim.ExpiresAt > Date.now() && claim.Token !== command.token) throw new DomainError('Another device is running this scan.');
        } else if (!claim || claim.Token !== command.token || claim.ExpiresAt <= Date.now() || state?.kind !== 'work' || state.status !== 'running') throw new DomainError('The scan claim expired or belongs to another device.');
    }

    private updateClaim(tx: SqliteTransaction, request: CommandRequest): void {
        const command = request.command;
        if (command.type === 'work.start') tx.run('INSERT INTO SyncWorkClaims VALUES (?, ?, ?, 0, 0) ON CONFLICT(Id) DO UPDATE SET Token=excluded.Token, ExpiresAt=excluded.ExpiresAt, Completed=0, Total=0', [command.id, command.token, Date.now() + 90000]);
        else if (command.type === 'work.progress') tx.run('UPDATE SyncWorkClaims SET ExpiresAt=?, Completed=?, Total=? WHERE Id=?', [Date.now() + 90000, command.completed, command.total, command.id]);
        else if (['work.complete', 'work.fail', 'work.release', 'work.delete'].includes(command.type)) tx.run('DELETE FROM SyncWorkClaims WHERE Id=?', [command.id]);
    }

    readPage(accountId: number, cursor: number, operationIds: string[], bootstrap?: { after: string; watermark: number }): { replicas: Replica[]; outcomes: CommandOutcome[]; cursor: number; hasMore: boolean; after: string; watermark: number } {
        return this.database.transaction((tx) => {
            this.maintain(tx);
            const maximum = tx.get<{ Position: number }>('SELECT COALESCE(MAX(Position), 0) AS Position FROM SyncCommits')!.Position;
            const watermark = bootstrap?.watermark || maximum;
            let ids: string[];
            let nextCursor = cursor;
            let hasMore: boolean;
            if (bootstrap) {
                const rows = tx.all<{ AggregateId: string }>('SELECT DISTINCT AggregateId FROM SyncEvents WHERE Position<=? AND AggregateId>? AND (AggregateId NOT LIKE \'profile_%\' OR AggregateId=?) ORDER BY AggregateId LIMIT 33', [watermark, bootstrap.after, `profile_${accountId}`]);
                ids = rows.slice(0, 32).map((row) => row.AggregateId); hasMore = rows.length > 32;
                nextCursor = watermark;
            } else {
                const positions = tx.all<{ Position: number }>('SELECT Position FROM SyncCommits WHERE Position>? ORDER BY Position LIMIT 33', [cursor]);
                hasMore = positions.length > 32;
                nextCursor = positions.slice(0, 32).pop()?.Position || cursor;
                ids = tx.all<{ AggregateId: string }>('SELECT DISTINCT AggregateId FROM SyncEvents WHERE Position>? AND Position<=? AND (AggregateId NOT LIKE \'profile_%\' OR AggregateId=?)', [cursor, nextCursor, `profile_${accountId}`]).map((row) => row.AggregateId);
            }
            // Receipts and their canonical replicas are from this same read transaction.
            // Include complete outcomes for uncertain sends even if their commit is beyond this page.
            const outcomes = operationIds.slice(0, 500).map((id) => tx.get<{ Outcome: string }>('SELECT Outcome FROM SyncReceipts WHERE AccountId=? AND OperationId=?', [accountId, id])).filter(Boolean).map((row) => JSON.parse(row!.Outcome) as CommandOutcome);
            const replicas = ids.map((id) => this.replica(tx, id, bootstrap ? watermark : nextCursor));
            return { replicas, outcomes, cursor: nextCursor, hasMore, after: ids[ids.length - 1] || bootstrap?.after || '', watermark };
        });
    }

    private maintain(tx: SqliteTransaction): void {
        const now = new Date().toISOString();
        for (const row of tx.all<{ Id: string }>('SELECT Id FROM SyncWorkClaims WHERE ExpiresAt<=? LIMIT 32', [Date.now()])) {
            const head = tx.get<HeadRow>('SELECT * FROM SyncHeads WHERE Id=?', [row.Id]);
            if (head && JSON.parse(head.State).status === 'running' && !JSON.parse(head.State).deleted) {
                const operationId = `lease-expired:${randomBytes(16).toString('hex')}`;
                const position = tx.run('INSERT INTO SyncCommits(OperationId) VALUES (?)', [operationId]).lastID;
                this.append(tx, row.Id, [{ type: 'ScanReleased' }], operationId, 0, now, position);
            }
            tx.run('DELETE FROM SyncWorkClaims WHERE Id=?', [row.Id]);
        }
        // Dirty aggregates also balance at the next successful sync after 24 hours,
        // even if no new domain command arrives during that visit.
        for (const head of tx.all<HeadRow>('SELECT h.* FROM SyncHeads h WHERE h.Sequence>(SELECT MAX(c.Sequence) FROM SyncCheckpoints c WHERE c.AggregateId=h.Id) LIMIT 64')) {
            const balance = tx.get<{ Balance: string }>('SELECT Balance FROM SyncCheckpoints WHERE AggregateId=? ORDER BY Sequence DESC LIMIT 1', [head.Id]);
            const previous: Checkpoint = JSON.parse(balance!.Balance);
            if (Date.now() - Date.parse(previous.createdAt) < CHECKPOINT_AGE_MS) continue;
            const replayed = this.reconstruct(tx, head.Id, head.Position);
            if (digest(replayed.state) !== digest(JSON.parse(head.State))) throw new Error('Dirty aggregate does not balance.');
            const last = replayed.events[replayed.events.length - 1];
            const checkpoint: Checkpoint = { aggregateId: head.Id, throughSequence: head.Sequence, throughEventId: last.eventId, schemaVersion: 1, reducerVersion: 1, stateHash: digest(replayed.state), ledgerHash: head.Hash, createdAt: now, state: replayed.state };
            tx.run('INSERT INTO SyncCheckpoints VALUES (?, ?, ?, ?)', [head.Id, head.Sequence, head.Position, JSON.stringify(checkpoint)]);
        }
    }

    legacyHistory(id: string): unknown[] {
        return this.database.transaction((tx) => {
            const deck = tx.get<{ DeckId: number }>('SELECT DeckId FROM Decks WHERE PublicId=?', [id]);
            if (!deck) return [];
            return tx.all<{ DeckEditId: number; CreatedAt: string }>('SELECT DeckEditId, CreatedAt FROM DeckEdits WHERE DeckId=? ORDER BY DeckEditId DESC', [deck.DeckId]).map((edit) => {
                const cards = tx.all<{ Uuid: string; Count: number; Direction: string }>('SELECT * FROM DeckEditCards WHERE DeckEditId=?', [edit.DeckEditId]);
                const details = tx.all<{ Field: string; BeforeValue: string | null; AfterValue: string | null }>('SELECT * FROM DeckEditDetails WHERE DeckEditId=?', [edit.DeckEditId]);
                return { id: -edit.DeckEditId, createdAt: edit.CreatedAt, legacy: true, cardsIn: cards.filter((card) => card.Direction === 'in').map((card) => ({ uuid: card.Uuid, count: card.Count, name: null })), cardsOut: cards.filter((card) => card.Direction === 'out').map((card) => ({ uuid: card.Uuid, count: card.Count, name: null })), details: details.map((detail) => ({ field: detail.Field, before: detail.BeforeValue, after: detail.AfterValue })) };
            });
        });
    }

    readState(id: string): AggregateState | null {
        return this.database.transaction((tx) => {
            const row = tx.get<HeadRow>('SELECT * FROM SyncHeads WHERE Id=?', [id]);
            return row ? JSON.parse(row.State) : null;
        });
    }

    history(id: string): EventEnvelope[] {
        return this.database.transaction((tx) => tx.all<EventRow>('SELECT Envelope FROM SyncEvents WHERE AggregateId=? ORDER BY Sequence', [id]).map((row) => JSON.parse(row.Envelope)));
    }

    async putChunk(id: string, offset: number, total: number, contentType: string, bytes: Buffer): Promise<number> {
        if (!/^blob_[a-f0-9]{64}$/.test(id) || !Number.isSafeInteger(offset) || !Number.isSafeInteger(total) || offset < 0 || total <= 0 || total > 25 * 1024 * 1024 || offset + bytes.length > total || bytes.length > 1024 * 1024 || !/^image\/(png|jpeg|webp|gif|heic|heif)$/.test(contentType)) throw new DomainError('Invalid upload chunk.');
        return this.database.transaction((tx) => {
            if (tx.get('SELECT 1 FROM SyncBlobs WHERE Id=?', [id])) return total;
            const chunks = tx.all<{ Offset: number; Total: number; ContentType: string; Data: Buffer }>('SELECT * FROM SyncBlobChunks WHERE Id=? ORDER BY Offset', [id]);
            let received = chunks.reduce((sum, chunk) => sum + chunk.Data.length, 0);
            const previous = chunks.find((chunk) => chunk.Offset === offset);
            if (previous) {
                if (!Buffer.from(previous.Data).equals(bytes) || previous.Total !== total || previous.ContentType !== contentType) throw new DomainError('Upload chunk changed.');
                return received;
            }
            if (offset !== received || chunks.some((chunk) => chunk.Total !== total || chunk.ContentType !== contentType)) throw new DomainError('Upload offset does not match.');
            tx.run('INSERT INTO SyncBlobChunks VALUES (?, ?, ?, ?, ?)', [id, offset, total, contentType, bytes]);
            received += bytes.length;
            if (received === total) {
                const data = Buffer.concat(chunks.map((chunk) => Buffer.from(chunk.Data)).concat([bytes]));
                if (`blob_${createHash('sha256').update(data).digest('hex')}` !== id) throw new DomainError('Upload hash does not match.');
                tx.run('INSERT INTO SyncBlobs VALUES (?, ?, ?)', [id, contentType, data]);
                tx.run('DELETE FROM SyncBlobChunks WHERE Id=?', [id]);
            }
            return received;
        });
    }

    async blob(id: string): Promise<{ ContentType: string; Data: Uint8Array } | undefined> {
        return this.database.get('SELECT ContentType, Data FROM SyncBlobs WHERE Id=?', [id]);
    }
}

function parseJson(value: string | null): any {
    try { return value ? JSON.parse(value) : null; } catch { return null; }
}
