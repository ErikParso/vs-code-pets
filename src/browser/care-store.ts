// The cats' hunger and trust, kept as JSON under one key of a key-value storage. In VS Code that
// is its localStorage: shared by all its windows and kept between sessions.
import type { SavedCare, CareStore } from '../world/care';

const KEY = 'pixelCat.care'; // {name: {fedAt, trust, packed}}

/** The part of the Web Storage API a CareStore needs. */
export interface KeyValueStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

/** A CareStore on top of `storage()`, which is looked up on every use. */
export function storageCareStore(storage: () => KeyValueStorage): CareStore {
  return {
    load() {
      try {
        return JSON.parse(storage().getItem(KEY) || '{}');
      } catch (e) {
        return {};
      }
    },
    save(all: Record<string, Partial<SavedCare>>) {
      try {
        storage().setItem(KEY, JSON.stringify(all));
      } catch (e) {
        // No storage: it just starts afresh next time.
      }
    },
  };
}

export const localCareStore: CareStore = storageCareStore(() => localStorage);
