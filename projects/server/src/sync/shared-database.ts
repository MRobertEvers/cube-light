import { randomBytes } from 'crypto';
import { createReadStream, createWriteStream, promises as fs, constants as fsConstants } from 'fs';
import os from 'os';
import path from 'path';
import { pipeline } from 'stream';
import { SqliteDatabase } from '../database/sqlite';
import type { SqliteTransaction } from '../database/sqlite';
import { mergeInto } from './shared-merge';
import type { MergeConflict, MergeResult } from './shared-merge';

/**
 * The application database's second level: a copy on the NAS that every cube-light server on the
 * network shares. Each server keeps its own database on its own disk and serves from it; at boot,
 * after its own changes and every few minutes, it takes the shared copy's changes into its own
 * and gives the shared copy its own (sync/shared-merge.ts).
 *
 * The shared file is never opened where it lies: SQLite's locks do not hold over SMB, and over
 * gvfs every page read crosses the network. A server takes `<file>.lock` (created exclusively),
 * copies the file to its own disk, merges both ways, and puts the result back beside the file and
 * renames it into place. `<file without .sqlite>.json` names the copy's revision, so a server
 * whose own data has not changed reads only that to learn there is nothing to do.
 */

export interface SharedDatabaseOptions {
    /** This server's own database. */
    local: string;
    /** The shared copy on the NAS. */
    shared: string;
    /** How often to look for the other servers' changes. */
    intervalMs?: number;
    /** How long after a change here to give it to the shared copy, so a burst goes in one copy. */
    changeDelayMs?: number;
}

type Marker = { format: 1; revision: string; publishedAt: string; publishedBy: string };

const LOCK_STALE_MS = 10 * 60 * 1000;
const LOCK_RETRY_MS = 60 * 1000;
/** A NAS that does not answer within this is treated as away. */
const REACH_TIMEOUT_MS = 10 * 1000;

/** Tables and keys one server keeps for itself: never put into the shared copy or taken from it. */
const SERVER_ONLY = [
    "DELETE FROM SyncMeta WHERE Key='instance' OR Key LIKE 'shared-%'",
    'DELETE FROM AuthAccessTokens',
    'DELETE FROM AuthRefreshTokens',
    'DELETE FROM AuthTokenFamilies',
    'DELETE FROM AuthSigningKeys',
    'DELETE FROM SyncReceipts',
    'DELETE FROM SyncWorkClaims',
    'DELETE FROM SyncBlobChunks',
    'DELETE FROM SharedMergeConflicts'
];

const README = `This folder holds cube-light's application database (decks, collections, storage locations,
profiles, scans and accounts), shared by the cube-light servers on this network.

  cube-light-application-database.sqlite  the shared copy (the second level behind each server's own)
  cube-light-application-database.json    its revision: which server last put changes in, and when
  cube-light-application-database.lock    present only while a server is merging

Each server keeps its own copy on its own disk and merges with this one at boot, after its own
changes and every few minutes (projects/server/src/sync/shared-database.ts in the cube-light
repository). Do not open the .sqlite here with a program that writes to it; copy it first.
The application-database-<time>.sqlite files are one-off backups (scripts/backup-repo.mjs).
`;

export class SharedDatabase {
    readonly local: string;
    readonly shared: string;
    private readonly intervalMs: number;
    private readonly changeDelayMs: number;
    private readonly marker: string;
    private readonly lock: string;
    private readonly database: SqliteDatabase;
    private running: Promise<void> | null = null;
    private again = false;
    private interval: NodeJS.Timeout | null = null;
    private changeTimer: NodeJS.Timeout | null = null;
    private retryTimer: NodeJS.Timeout | null = null;
    private away = false;
    private stopped = false;

    private constructor(options: SharedDatabaseOptions) {
        const { local, shared, intervalMs = 5 * 60 * 1000, changeDelayMs = 30 * 1000 } = options;
        this.local = path.resolve(local);
        this.shared = path.resolve(shared);
        this.intervalMs = intervalMs;
        this.changeDelayMs = changeDelayMs;
        this.marker = this.shared.replace(/\.sqlite$/i, '') + '.json';
        this.lock = `${this.shared}.lock`;
        this.database = new SqliteDatabase(this.local);
    }

    /**
     * Gives a server with no database of its own the shared copy to start from, less what belongs
     * to the server that made it. Call before opening the local database.
     */
    static async seed(local: string, shared: string): Promise<boolean> {
        if (await exists(local) || !(await reachable(path.dirname(shared))) || !(await exists(shared))) return false;
        const temporary = `${local}.seed-${randomBytes(6).toString('hex')}`;
        try {
            await copy(shared, temporary);
            const seeded = new SqliteDatabase(temporary);
            try { scrub(seeded); } finally { await seeded.close(); }
            await fs.rename(temporary, local);
        } finally {
            await fs.rm(temporary, { force: true });
        }
        console.log(`Shared database: started this server's database from ${shared}`);
        return true;
    }

    /** Opens the merging connection to the local database (already made by Database.Sqlite). */
    static async open(options: SharedDatabaseOptions): Promise<SharedDatabase> {
        const shared = new SharedDatabase(options);
        await shared.database.exec(`CREATE TABLE IF NOT EXISTS SharedMergeConflicts (Id INTEGER PRIMARY KEY AUTOINCREMENT,
            At TEXT NOT NULL, AggregateId TEXT NOT NULL, Kind TEXT NOT NULL, Detail TEXT NOT NULL)`);
        return shared;
    }

    /** Merges now, then on the interval and after changes here (`changed`). */
    async start(): Promise<void> {
        await this.sync('boot');
        this.interval = setInterval(() => { void this.sync('interval'); }, this.intervalMs);
    }

    /** Something changed here: give it to the shared copy shortly. */
    changed(): void {
        if (this.stopped || this.changeTimer) return;
        this.changeTimer = setTimeout(() => {
            this.changeTimer = null;
            void this.sync('changes');
        }, this.changeDelayMs);
    }

    /** Stops the timers and gives the shared copy what is left. */
    async stop(): Promise<void> {
        this.stopped = true;
        for (const timer of [this.interval, this.changeTimer, this.retryTimer]) if (timer) clearTimeout(timer);
        this.interval = this.changeTimer = this.retryTimer = null;
        if (this.running) await this.running;
        await this.run('shutdown');
        await this.database.close();
    }

    /** One merge at a time; asked for while one runs, it runs once more after. */
    sync(reason: string): Promise<void> {
        if (this.running) {
            this.again = true;
            return this.running;
        }
        const instance = this;
        this.running = (async function () {
            try {
                do {
                    instance.again = false;
                    await instance.run(reason);
                } while (instance.again && !instance.stopped);
            } finally {
                instance.running = null;
            }
        })();
        return this.running;
    }

    private async run(reason: string): Promise<void> {
        try {
            if (!(await reachable(path.dirname(this.shared)))) {
                if (!this.away) console.warn(`Shared database: ${path.dirname(this.shared)} is not reachable (is the NAS mounted?); serving this server's copy`);
                this.away = true;
                return;
            }
            if (this.away) console.log('Shared database: the NAS is back');
            this.away = false;
            await this.writeReadme();
            const marker = await readMarker(this.marker);
            const seen = this.meta();
            if (marker && marker.revision === seen.revision && this.fingerprint() === seen.fingerprint && await exists(this.shared)) return;
            if (!(await this.takeLock())) {
                if (!this.stopped && !this.retryTimer) this.retryTimer = setTimeout(() => { this.retryTimer = null; void this.sync('retry'); }, LOCK_RETRY_MS);
                return;
            }
            try {
                await this.merge(reason);
            } finally {
                await fs.rm(this.lock, { force: true });
            }
        } catch (error) {
            console.error(`Shared database: the ${reason} merge failed; this server's copy is unchanged by it`, error);
        }
    }

    private async merge(reason: string): Promise<void> {
        const directory = path.dirname(this.local);
        const copied = path.join(directory, `.${path.basename(this.local)}.shared-${randomBytes(6).toString('hex')}`);
        try {
            const marker = await readMarker(this.marker);
            let pulled: MergeResult | null = null;
            let pushed: MergeResult;
            let fresh = false;
            if (await exists(this.shared)) {
                await copy(this.shared, copied);
            } else {
                // The first server here: the shared copy starts as this one, less what is its own.
                await this.database.exec(`VACUUM INTO '${copied.replace(/'/g, "''")}'`);
                fresh = true;
            }
            const remote = new SqliteDatabase(copied);
            let fingerprint: string;
            try {
                if (fresh) scrub(remote);
                else pulled = this.database.transaction((local) => remote.transaction((theirs) => mergeInto(local, theirs)));
                pushed = remote.transaction((theirs) => this.database.transaction((local) => mergeInto(theirs, local)));
                fingerprint = this.fingerprint();
            } finally {
                await remote.close();
            }
            const conflicts = (pulled ? pulled.conflicts : []).concat(pushed.conflicts);
            this.recordConflicts(conflicts);
            let revision = marker ? marker.revision : '';
            if (fresh || !marker || changes(pushed)) {
                revision = randomBytes(12).toString('hex');
                const part = `${this.shared}.${randomBytes(6).toString('hex')}.part`;
                try {
                    await copy(copied, part);
                    await fs.rename(part, this.shared);
                } finally {
                    await fs.rm(part, { force: true });
                }
                const next: Marker = { format: 1, revision, publishedAt: new Date().toISOString(), publishedBy: os.hostname() };
                const markerPart = `${this.marker}.${randomBytes(6).toString('hex')}.part`;
                await fs.writeFile(markerPart, JSON.stringify(next, null, 2) + '\n');
                await fs.rename(markerPart, this.marker);
            }
            this.setMeta(revision, fingerprint);
            if (fresh) console.log(`Shared database: made ${this.shared} from this server's database`);
            if (pulled && changes(pulled)) console.log(`Shared database (${reason}): took ${describe(pulled)}`);
            if (changes(pushed)) console.log(`Shared database (${reason}): gave ${describe(pushed)}`);
        } finally {
            await fs.rm(copied, { force: true });
        }
    }

    /** What has changed here since the last merge: commits and accounts. */
    private fingerprint(): string {
        return this.database.transaction((tx) => {
            const commits = tx.get<{ Position: number }>('SELECT COALESCE(MAX(Position), 0) AS Position FROM SyncCommits')!.Position;
            const users = tx.get<{ Count: number; Updated: string; Generations: number }>(`SELECT COUNT(*) AS Count, COALESCE(MAX(UpdatedAt), '') AS Updated,
                COALESCE(SUM(token_generation), 0) AS Generations FROM Users WHERE PasswordHash IS NOT NULL`)!;
            const blobs = tx.get<{ Count: number }>('SELECT COUNT(*) AS Count FROM SyncBlobs')!.Count;
            return `${commits}|${users.Count}|${users.Updated}|${users.Generations}|${blobs}`;
        });
    }

    private meta(): { revision: string; fingerprint: string } {
        return this.database.transaction((tx) => {
            const revision = tx.get<{ Value: string }>("SELECT Value FROM SyncMeta WHERE Key='shared-revision'");
            const fingerprint = tx.get<{ Value: string }>("SELECT Value FROM SyncMeta WHERE Key='shared-fingerprint'");
            return { revision: revision ? revision.Value : '', fingerprint: fingerprint ? fingerprint.Value : '' };
        });
    }

    private setMeta(revision: string, fingerprint: string): void {
        this.database.transaction((tx) => {
            tx.run("INSERT INTO SyncMeta VALUES ('shared-revision', ?) ON CONFLICT(Key) DO UPDATE SET Value=excluded.Value", [revision]);
            tx.run("INSERT INTO SyncMeta VALUES ('shared-fingerprint', ?) ON CONFLICT(Key) DO UPDATE SET Value=excluded.Value", [fingerprint]);
        });
    }

    private recordConflicts(conflicts: MergeConflict[]): void {
        if (!conflicts.length) return;
        const at = new Date().toISOString();
        this.database.transaction((tx) => {
            for (const conflict of conflicts) tx.run('INSERT INTO SharedMergeConflicts (At, AggregateId, Kind, Detail) VALUES (?, ?, ?, ?)', [at, conflict.aggregateId, conflict.kind, conflict.detail]);
        });
        for (const conflict of conflicts) console.warn(`Shared database: ${conflict.kind} in ${conflict.aggregateId}: ${conflict.detail.slice(0, 300)}`);
    }

    /** The lock is a file made exclusively; one left by a server that died is taken after ten minutes. */
    private async takeLock(): Promise<boolean> {
        const owner = JSON.stringify({ host: os.hostname(), pid: process.pid, at: new Date().toISOString() });
        for (let attempt = 0; attempt < 2; attempt++) {
            try {
                await fs.writeFile(this.lock, owner, { flag: 'wx' });
                return true;
            } catch (error) {
                if ((error as NodeJS.ErrnoException).code !== 'EEXIST') throw error;
            }
            const info = await fs.stat(this.lock).catch(() => null);
            if (info && Date.now() - info.mtimeMs < LOCK_STALE_MS) {
                const holder = await fs.readFile(this.lock, 'utf8').catch(() => '?');
                console.log(`Shared database: another server is merging (${holder}); trying again in a minute`);
                return false;
            }
            await fs.rm(this.lock, { force: true });
        }
        return false;
    }

    private async writeReadme(): Promise<void> {
        const file = path.join(path.dirname(this.shared), 'README.txt');
        if (!(await exists(file))) await fs.writeFile(file, README).catch(() => undefined);
    }
}

function changes(result: MergeResult): boolean {
    return result.aggregates + result.users + result.blobs > 0;
}

function describe(result: MergeResult): string {
    const parts = [`${result.aggregates} aggregate(s), ${result.events} event(s)`];
    if (result.rebased) parts.push(`${result.rebased} rebased`);
    if (result.users) parts.push(`${result.users} account(s)`);
    if (result.blobs) parts.push(`${result.blobs} upload(s)`);
    if (result.conflicts.length) parts.push(`${result.conflicts.length} conflict(s), see SharedMergeConflicts`);
    return parts.join(', ');
}

/** Removes what one server keeps for itself (SERVER_ONLY); missing tables are skipped. */
function scrub(database: SqliteDatabase): void {
    database.transaction((tx: SqliteTransaction) => {
        for (const statement of SERVER_ONLY) {
            const table = /FROM (\w+)/.exec(statement)![1];
            if (tx.get("SELECT 1 FROM sqlite_master WHERE type='table' AND name=?", [table])) tx.run(statement);
        }
    });
}

/**
 * Copies a file by reading and writing it: gvfs's FUSE mounts refuse the kernel's copy calls
 * (copy_file_range, sendfile) that fs.copyFile uses.
 */
function copy(from: string, to: string): Promise<void> {
    return new Promise((resolve, reject) => {
        pipeline(createReadStream(from), createWriteStream(to), (error) => (error ? reject(error) : resolve()));
    });
}

async function readMarker(file: string): Promise<Marker | null> {
    try {
        const marker = JSON.parse(await fs.readFile(file, 'utf8'));
        return marker && marker.format === 1 && typeof marker.revision === 'string' ? marker : null;
    } catch {
        return null;
    }
}

async function exists(file: string): Promise<boolean> {
    try {
        await fs.access(file, fsConstants.F_OK);
        return true;
    } catch {
        return false;
    }
}

/** Whether the folder answers in time: a NAS gone away can hold a file operation for minutes. */
async function reachable(directory: string): Promise<boolean> {
    let timer: NodeJS.Timeout | undefined;
    const timeout = new Promise<boolean>((resolve) => { timer = setTimeout(() => resolve(false), REACH_TIMEOUT_MS); });
    try {
        return await Promise.race([fs.stat(directory).then((info) => info.isDirectory(), () => false), timeout]);
    } finally {
        if (timer) clearTimeout(timer);
    }
}
