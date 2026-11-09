// The collection of cats (collection.ts), each cat one record with its care, kept as JSON under one
// key of a key-value storage. In VS Code that is its localStorage: shared by all its windows and
// kept between sessions.
import type { CatRecord, CatStore } from '../world/collection';

const KEY = 'pixelCat.cats'; // [{id, name, coat, energy, step, care: {fedAt, trust, playedAt, packed}}]

/** The part of the Web Storage API the store needs. */
export interface KeyValueStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

/** A CatStore on top of `storage()`, which is looked up on every use. */
export function storageCatStore(storage: () => KeyValueStorage): CatStore {
  return {
    load() {
      try {
        const text = storage().getItem(KEY);
        return text ? (JSON.parse(text) as CatRecord[]) : null;
      } catch (e) {
        return null;
      }
    },
    save(cats: CatRecord[]) {
      try {
        storage().setItem(KEY, JSON.stringify(cats));
      } catch (e) {
        // No storage: it just starts afresh next time.
      }
    },
  };
}

export const localCatStore: CatStore = storageCatStore(() => localStorage);
