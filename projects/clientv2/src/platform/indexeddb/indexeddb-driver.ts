import type { TableDatabase, TableKey, Tables } from '../../engine/ports';
import { TABLE_KEYS, TABLES, type TableName } from '../../engine/local-store/schema';

/** The only module that uses the raw IndexedDB API. No browser objects escape it. */
function request<T>(operation: IDBRequest<T>): Promise<T> {
    return new Promise((resolve, reject) => {
        operation.onsuccess = function () { resolve(operation.result); };
        operation.onerror = function () { reject(operation.error || new Error('Local database request failed.')); };
    });
}

export class IndexedDbDriver implements TableDatabase {
    private database: IDBDatabase | null = null;
    private opening: Promise<void> | null = null;
    private readonly name: string;
    private readonly factory: IDBFactory;

    constructor(name?: string, factory?: IDBFactory) {
        this.name = name === undefined ? 'torimtg-v1' : name;
        this.factory = factory === undefined ? globalThis.indexedDB : factory;
    }

    open(): Promise<void> {
        if (this.database) return Promise.resolve();
        if (this.opening) return this.opening;
        this.opening = new Promise<void>((resolve, reject) => {
            if (!this.factory) { reject(new Error('IndexedDB is unavailable. Changes cannot be saved on this device.')); return; }
            const operation = this.factory.open(this.name, 1);
            operation.onupgradeneeded = function () {
                const db = operation.result;
                for (const name of TABLES) {
                    if (db.objectStoreNames.contains(name)) continue;
                    const store = db.createObjectStore(name, { keyPath: TABLE_KEYS[name] as string | string[] });
                    if (name !== 'control') store.createIndex('partition', 'partition');
                }
            };
            operation.onerror = function () { reject(operation.error); };
            operation.onblocked = function () { reject(new Error('Close other ToriMTG tabs to finish the database upgrade.')); };
            operation.onsuccess = () => {
                const database = operation.result;
                this.database = database;
                database.onversionchange = () => this.close();
                // The browser closed it on its own (iOS Safari does after the app sits in the background): open a new one next time.
                database.onclose = () => { if (this.database === database) this.database = null; };
                resolve();
            };
        }).finally(() => { this.opening = null; });
        return this.opening;
    }

    close(): void { this.database?.close(); this.database = null; }

    /**
     * Starts a transaction, reopening once when the connection turned out to be closing:
     * Safari can close it without a close event, and nothing has run yet, so retrying is safe.
     */
    private async begin(stores: readonly TableName[], mode: 'readonly' | 'readwrite'): Promise<IDBTransaction> {
        await this.open();
        try {
            return this.database!.transaction(stores as TableName[], mode);
        } catch (error) {
            if (!(error instanceof DOMException) || error.name !== 'InvalidStateError') throw error;
            this.database = null;
            await this.open();
            return this.database!.transaction(stores as TableName[], mode);
        }
    }

    async transaction<T>(stores: readonly TableName[], mode: 'readonly' | 'readwrite', callback: (tables: Tables) => Promise<T>): Promise<T> {
        const transaction = await this.begin(stores, mode);
        const completed = new Promise<void>((resolve, reject) => {
            transaction.oncomplete = function () { resolve(); };
            transaction.onabort = function () { reject(transaction.error || new Error('Local save aborted.')); };
            transaction.onerror = function () { /* abort event reports the transaction failure */ };
        });
        // Attach rejection handler before executing requests, including abort-on-validation.
        completed.catch(() => undefined);
        const tables: Tables = {
            get: async function <R>(store: TableName, key: TableKey) { return request(transaction.objectStore(store).get(key)) as Promise<R | undefined>; },
            all: async function <R>(store: TableName, partition?: string) {
                return request(partition === undefined ? transaction.objectStore(store).getAll() : transaction.objectStore(store).index('partition').getAll(partition)) as Promise<R[]>;
            },
            put: async function (store: TableName, value: unknown) { await request(transaction.objectStore(store).put(value)); },
            remove: async function (store: TableName, key: TableKey) { await request(transaction.objectStore(store).delete(key)); }
        };
        try {
            const result = await callback(tables);
            await completed;
            return result;
        } catch (error) {
            try { transaction.abort(); } catch { /* Already aborted or committed. */ }
            await completed.catch(() => undefined);
            throw error;
        }
    }
}
