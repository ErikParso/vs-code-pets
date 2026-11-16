// The collection of cats (collection.ts), each cat one record with its care, and the coats ever
// seen, each with the rarest shine seen in it (seen.ts), each kept as JSON under its own key of a
// key-value storage. In VS Code that is its
// localStorage: shared by all its windows and kept between sessions.
import type { CatRecord, CatStore } from '../world/collection';
import type { SeenCoat, SeenStore } from '../world/seen';
import { isShine } from '../world/shine';

const CATS_KEY = 'pixelCat.cats'; // [{id, name, coat, energy, step, shine?, care: {fedAt, trust, playedAt, packed}}]
const SEEN_KEY = 'pixelCat.seen'; // [{coatId, shine?: 'silver' | 'rainbow'}, ...]

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

/** A SeenStore on top of `storage()`. Anything there that is not a coat seen is dropped (the plain coat ids saved before shines came in too). */
export function storageSeenStore(storage: () => KeyValueStorage): SeenStore {
  const store = jsonKey<unknown>(storage, SEEN_KEY, []);
  return {
    load: () => {
      const seen = store.load();
      if (!Array.isArray(seen)) return [];
      return seen.flatMap((s): SeenCoat[] =>
        s && typeof s === 'object' && typeof s.coatId === 'string' ? [{ coatId: s.coatId, ...(isShine(s.shine) ? { shine: s.shine } : {}) }] : []
      );
    },
    save: store.save,
  };
}

export const localCatStore: CatStore = storageCatStore(() => localStorage);
export const localSeenStore: SeenStore = storageSeenStore(() => localStorage);
