/**
 * Encryption & Hashing utilities
 * - AES-256-GCM for field-level encryption (phone numbers, message content)
 * - bcrypt for one-way hashing (phrases, passwords, 2FA answers)
 */
import crypto from "crypto";
import bcrypt from "bcryptjs";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12; // GCM standard
const TAG_LENGTH = 16;
const SALT_ROUNDS = 10;

function getEncryptionKey(): Buffer {
  const keyHex = process.env.ENCRYPTION_KEY;
  if (!keyHex || keyHex.length !== 64) {
    throw new Error(
      "ENCRYPTION_KEY must be a 64-char hex string (32 bytes). Generate with: node -e \"console.log(require('crypto').randomBytes(32).toString('hex'))\""
    );
  }
  return Buffer.from(keyHex, "hex");
}

/**
 * Encrypt plaintext with AES-256-GCM
 * Returns base64 string: iv:encrypted:tag
 */
export function encrypt(plaintext: string): string {
  const key = getEncryptionKey();
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

  let encrypted = cipher.update(plaintext, "utf8", "base64");
  encrypted += cipher.final("base64");
  const tag = cipher.getAuthTag();

  // Format: iv:encrypted:tag (all base64)
  return `${iv.toString("base64")}:${encrypted}:${tag.toString("base64")}`;
}

/**
 * Decrypt AES-256-GCM encrypted string
 */
export function decrypt(ciphertext: string): string {
  const key = getEncryptionKey();
  const parts = ciphertext.split(":");
  if (parts.length !== 3) {
    throw new Error("Invalid ciphertext format");
  }

  const iv = Buffer.from(parts[0], "base64");
  const encrypted = parts[1];
  const tag = Buffer.from(parts[2], "base64");

  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(tag);

  let decrypted = decipher.update(encrypted, "base64", "utf8");
  decrypted += decipher.final("utf8");
  return decrypted;
}

/**
 * Hash a phrase/password with bcrypt (one-way)
 */
export async function hashValue(value: string): Promise<string> {
  return bcrypt.hash(value, SALT_ROUNDS);
}

/**
 * Compare a plaintext value against a bcrypt hash
 */
export async function compareHash(
  value: string,
  hash: string
): Promise<boolean> {
  return bcrypt.compare(value, hash);
}
