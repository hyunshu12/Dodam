/**
 * Storage Adapter factory
 */
import { IStorageAdapter } from "./interface";
import { LocalStorageAdapter } from "./local";

export function getStorageAdapter(): IStorageAdapter {
  const provider = process.env.STORAGE_PROVIDER || "local";

  switch (provider) {
    case "local":
    default:
      return new LocalStorageAdapter();
    // Future: case "s3": return new S3StorageAdapter();
  }
}

export type { IStorageAdapter } from "./interface";
