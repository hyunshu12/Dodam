/**
 * Storage Adapter interface
 * Implementations: LocalStorageAdapter, S3StorageAdapter, etc.
 */
export interface IStorageAdapter {
  /** Save a file and return a storage key */
  save(key: string, data: Buffer, mimeType: string): Promise<void>;
  /** Get a file by storage key */
  get(key: string): Promise<Buffer | null>;
  /** Delete a file by storage key */
  delete(key: string): Promise<void>;
}
