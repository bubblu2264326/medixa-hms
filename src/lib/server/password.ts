import { randomBytes, scryptSync, timingSafeEqual } from "crypto";

const SCRYPT_KEYLEN = 64;

export function isPasswordHash(value: string) {
  return value.startsWith("scrypt$");
}

export function hashPassword(plainText: string) {
  const salt = randomBytes(16).toString("hex");
  const digest = scryptSync(plainText, salt, SCRYPT_KEYLEN).toString("hex");
  return `scrypt$${salt}$${digest}`;
}

export function verifyPassword(plainText: string, hashOrLegacy: string) {
  if (!hashOrLegacy) return false;
  if (!isPasswordHash(hashOrLegacy)) {
    return plainText === hashOrLegacy;
  }

  const parts = hashOrLegacy.split("$");
  if (parts.length !== 3) return false;
  const salt = parts[1];
  const digestHex = parts[2];

  try {
    const derived = scryptSync(plainText, salt, SCRYPT_KEYLEN);
    const stored = Buffer.from(digestHex, "hex");
    if (stored.length !== derived.length) return false;
    return timingSafeEqual(stored, derived);
  } catch {
    return false;
  }
}

