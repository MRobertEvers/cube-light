/** The only module that uses the raw IndexedDB API. No browser objects escape it. */
export interface Tables {
    get<T>(store: string, key: IDBValidKey): Promise<T | undefined>;
    all<T>(store: string, partition?: string): Promise<T[]>;
    put(store: string, value: unknown): Promise<void>;
    remove(store: string, key: IDBValidKey): Promise<void>;
}

const keys: Record<string, string | string[]> = {
    control: 'key', meta: 'partition', base: ['partition', 'id'], views: ['partition', 'id'],
    checkpoints: ['partition', 'id', 'sequence'], events: ['partition', 'id', 'sequence'],
    journal: ['partition', 'sequence'], outbox: ['partition', 'operationId'],
    catalog: ['partition', 'id'], resources: ['partition', 'key'], jobs: ['partition', 'key'],
    blobs: ['partition', 'id']
};
export const TABLES = Object.keys(keys);

function request<T>(operation: IDBRequest<T>): Promise<T> {
    return new Promise((resolve, reject) => {
        operation.onsuccess = function () { resolve(operation.result); };
        operation.onerror = function () { reject(operation.error || new Error('Local database request failed.')); };
    });
}

export class IndexedDbDriver {
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
                    const store = db.createObjectStore(name, { keyPath: keys[name] });
                    if (name !== 'control') store.createIndex('partition', 'partition');
                }
            };
            operation.onerror = function () { reject(operation.error); };
            operation.onblocked = function () { reject(new Error('Close other ToriMTG tabs to finish the database upgrade.')); };
            operation.onsuccess = () => {
                this.database = operation.result;
                this.database.onversionchange = () => this.close();
                resolve();
            };
        }).finally(() => { this.opening = null; });
        return this.opening;
    }

    close(): void { this.database?.close(); this.database = null; }

    async transaction<T>(stores: string[], mode: IDBTransactionMode, callback: (tables: Tables) => Promise<T>): Promise<T> {
        await this.open();
        const transaction = this.database!.transaction(stores, mode);
        const completed = new Promise<void>((resolve, reject) => {
            transaction.oncomplete = function () { resolve(); };
            transaction.onabort = function () { reject(transaction.error || new Error('Local save aborted.')); };
            transaction.onerror = function () { /* abort event reports the transaction failure */ };
        });
        // Attach rejection handler before executing requests, including abort-on-validation.
        completed.catch(() => undefined);
        const tables: Tables = {
            get: async function <R>(store: string, key: IDBValidKey) { return request(transaction.objectStore(store).get(key)) as Promise<R | undefined>; },
            all: async function <R>(store: string, partition?: string) {
                return request(partition === undefined ? transaction.objectStore(store).getAll() : transaction.objectStore(store).index('partition').getAll(partition)) as Promise<R[]>;
            },
            put: async function (store: string, value: unknown) { await request(transaction.objectStore(store).put(value)); },
            remove: async function (store: string, key: IDBValidKey) { await request(transaction.objectStore(store).delete(key)); }
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
