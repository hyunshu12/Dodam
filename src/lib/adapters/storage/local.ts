/**
 * Local filesystem storage adapter (development)
 */
import fs from "fs/promises";
import path from "path";
import { IStorageAdapter } from "./interface";

const UPLOAD_DIR = path.resolve(process.cwd(), "uploads");

export class LocalStorageAdapter implements IStorageAdapter {
  private async ensureDir() {
    await fs.mkdir(UPLOAD_DIR, { recursive: true });
  }

  async save(key: string, data: Buffer): Promise<void> {
    await this.ensureDir();
    const filePath = path.join(UPLOAD_DIR, key);
    await fs.writeFile(filePath, data);
  }

  async get(key: string): Promise<Buffer | null> {
    try {
      const filePath = path.join(UPLOAD_DIR, key);
      return await fs.readFile(filePath);
    } catch {
      return null;
    }
  }

  async delete(key: string): Promise<void> {
    try {
      const filePath = path.join(UPLOAD_DIR, key);
      await fs.unlink(filePath);
    } catch {
      // File may not exist, ignore
    }
  }
}
