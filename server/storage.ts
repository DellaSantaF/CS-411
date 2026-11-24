import { getStore } from '@netlify/blobs';
import type { GetStoreOptions } from '@netlify/blobs';

export type Namespace = 'participants' | 'sessions' | 'events';
export interface Storage {
  get<T>(namespace: Namespace, key: string): Promise<T | null>;
  put(namespace: Namespace, key: string, value: unknown): Promise<void>;
  create(namespace: Namespace, key: string, value: unknown): Promise<boolean>;
  list<T>(namespace: Namespace, prefix?: string): Promise<T[]>;
}

// Local development/test substitute only. Never selected by the hosted function.
export function memoryStorage(): Storage {
  const stores = { participants: new Map(), sessions: new Map(), events: new Map() };
  return {
    async get(n, k) { return structuredClone(stores[n].get(k) ?? null); },
    async put(n, k, value) { stores[n].set(k, structuredClone(value)); },
    async create(n, k, value) { if (stores[n].has(k)) return false; stores[n].set(k, structuredClone(value)); return true; },
    async list(n, prefix = '') { return structuredClone([...stores[n]].filter(([key]) => key.startsWith(prefix)).map(([, value]) => value)); },
  };
}

export function blobStorage(options: Pick<GetStoreOptions, 'siteID' | 'token' | 'apiURL' | 'edgeURL' | 'uncachedEdgeURL'> = {}): Storage {
  // Named stores are private and site-wide (not deploy stores). No public URLs.
  const stores = Object.fromEntries((['participants', 'sessions', 'events'] as const)
    .map(n => [n, getStore({ ...options, name: `magnus-${n}`, consistency: 'strong' })]));
  return {
    async get(n, k) { return stores[n].get(k, { type: 'json', consistency: 'strong' }); },
    async put(n, k, value) { await stores[n].setJSON(k, value); },
    async create(n, k, value) { return (await stores[n].setJSON(k, value, { onlyIfNew: true })).modified; },
    async list(n, prefix) {
      const values = [];
      for await (const page of stores[n].list({ paginate: true, prefix })) {
        // Bounded parallel reads; exports request one session at a time.
        for (let i = 0; i < page.blobs.length; i += 20) {
          const batch = await Promise.all(page.blobs.slice(i, i + 20).map(blob => stores[n].get(blob.key, { type: 'json', consistency: 'strong' })));
          values.push(...batch.filter(value => value !== null));
        }
      }
      return values;
    },
  };
}
