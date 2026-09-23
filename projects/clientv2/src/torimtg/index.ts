import { createToriMTG } from './core';
import { IndexedDbLocalStore } from './adapters/local-store';
import { ResilientSyncApi } from './adapters/resilient-sync-api';
export type { ToriMTG, LocalNotice } from './types';
export type { SyncHostKind } from './adapters/resilient-sync-api';

const store = new IndexedDbLocalStore();
const sync = new ResilientSyncApi(store);

/** 'worker' once the service worker is hosting sync, 'window' when it could not. */
export function syncHostKind() { return sync.hostKind; }

export const tori = createToriMTG(store, sync);
