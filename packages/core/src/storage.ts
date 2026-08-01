// Storage boundary. Async even though localStorage is not, so a native adapter can drop in later.
// The web app provides a localStorage-backed implementation in apps/web/lib/storage.web.ts.

export interface StorageAdapter {
  get(key: string): Promise<string | null>;
  set(key: string, value: string): Promise<void>;
  remove(key: string): Promise<void>;
}
