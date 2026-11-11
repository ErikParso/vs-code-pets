// The collection of cats (collection.ts), each cat one record with its care, and the coats ever
// seen (seen.ts), each kept as JSON under its own key of a key-value storage. In VS Code that is its
// localStorage: shared by all its windows and kept between sessions.
import type { CatRecord, CatStore } from '../world/collection';
import type { SeenStore } from '../world/seen';

const CATS_KEY = 'pixelCat.cats'; // [{id, name, coat, energy, step, care: {fedAt, trust, playedAt, packed}}]
const SEEN_KEY = 'pixelCat.seen'; // [coat id, ...]

/** The part of the Web Storage API the stores need. */
export interface KeyValueStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

// JSON under `key` of `storage()` (looked up on every use); `empty` if there is none, or no storage.
function jsonKey<T>(storage: () => KeyValueStorage, key: string, empty: T): { load(): T; save(value: T): void } {
  return {
    load() {
      try {
        const text = storage().getItem(key);
        return text ? (JSON.parse(text) as T) : empty;
      } catch (e) {
        return empty;
      }
    },
    save(value: T) {
      try {
        storage().setItem(key, JSON.stringify(value));
      } catch (e) {
        // No storage: it just starts afresh next time.
      }
    },
  };
}

/** A CatStore on top of `storage()`. */
export function storageCatStore(storage: () => KeyValueStorage): CatStore {
  return jsonKey<CatRecord[] | null>(storage, CATS_KEY, null);
}

/** A SeenStore on top of `storage()`. */
export function storageSeenStore(storage: () => KeyValueStorage): SeenStore {
  const store = jsonKey<string[]>(storage, SEEN_KEY, []);
  return {
    load: () => {
      const seen = store.load();
      return Array.isArray(seen) ? seen : []; // anything else there is no list of coats
    },
    save: store.save,
  };
}

export const localCatStore: CatStore = storageCatStore(() => localStorage);
export const localSeenStore: SeenStore = storageSeenStore(() => localStorage);
