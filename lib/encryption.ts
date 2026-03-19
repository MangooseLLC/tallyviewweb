import { createCipheriv, createDecipheriv, randomBytes } from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12;
const AUTH_TAG_LENGTH = 16;
const ENC_PREFIX = 'enc:';

function getKey(): Buffer {
  const raw = process.env.TOKEN_ENCRYPTION_KEY;
  if (!raw) throw new Error('TOKEN_ENCRYPTION_KEY env var is required for token encryption');
  const buf = Buffer.from(raw, 'hex');
  if (buf.length !== 32) throw new Error('TOKEN_ENCRYPTION_KEY must be a 64-char hex string (32 bytes)');
  return buf;
}

/**
 * Encrypts a plaintext string. Returns `enc:<hex>` where hex = iv + authTag + ciphertext.
 */
export function encrypt(plaintext: string): string {
  const key = getKey();
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, key, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return ENC_PREFIX + Buffer.concat([iv, authTag, encrypted]).toString('hex');
}

/**
 * Decrypts a string produced by encrypt(). Returns the original plaintext.
 */
export function decrypt(prefixed: string): string {
  const hex = prefixed.startsWith(ENC_PREFIX) ? prefixed.slice(ENC_PREFIX.length) : prefixed;
  const key = getKey();
  const data = Buffer.from(hex, 'hex');
  const iv = data.subarray(0, IV_LENGTH);
  const authTag = data.subarray(IV_LENGTH, IV_LENGTH + AUTH_TAG_LENGTH);
  const ciphertext = data.subarray(IV_LENGTH + AUTH_TAG_LENGTH);
  const decipher = createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);
  return decipher.update(ciphertext) + decipher.final('utf8');
}

/**
 * Deterministic check — encrypted values always carry the `enc:` prefix.
 */
export function isEncrypted(value: string): boolean {
  return value.startsWith(ENC_PREFIX);
}
