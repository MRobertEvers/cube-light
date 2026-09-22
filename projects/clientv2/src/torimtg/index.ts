import { createToriMTG } from './core';
import { IndexedDbLocalStore } from './adapters/local-store';
import { BrowserServiceWorkerApi } from './adapters/service-worker-api';
export type { ToriMTG, LocalNotice } from './types';

export const tori = createToriMTG(new IndexedDbLocalStore(), new BrowserServiceWorkerApi());
