import crypto from "node:crypto";

function getEncryptionKey(): Buffer {
  const rawKey =
    process.env.SESSION_ENCRYPTION_KEY_BASE64 ||
    process.env.APP_ENCRYPTION_KEY ||
    "instara-crew-meta-default-secret-key-32b";

  return crypto.createHash("sha256").update(rawKey).digest();
}

/**
 * Encrypts sensitive tokens at rest using AES-256-GCM
 */
export function encryptToken(plainText: string): string {
  if (!plainText) return "";
  const key = getEncryptionKey();
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);

  let encrypted = cipher.update(plainText, "utf8", "hex");
  encrypted += cipher.final("hex");
  const authTag = cipher.getAuthTag().toString("hex");

  return `${iv.toString("hex")}:${authTag}:${encrypted}`;
}

/**
 * Decrypts tokens at rest using AES-256-GCM
 */
export function decryptToken(cipherPayload: string): string {
  if (!cipherPayload) return "";
  const parts = cipherPayload.split(":");
  if (parts.length !== 3) {
    throw new Error("Payload di crittografia token non valido.");
  }

  const [ivHex, authTagHex, encryptedHex] = parts;
  const key = getEncryptionKey();
  const iv = Buffer.from(ivHex, "hex");
  const authTag = Buffer.from(authTagHex, "hex");

  const decipher = crypto.createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(authTag);

  let decrypted = decipher.update(encryptedHex, "hex", "utf8");
  decrypted += decipher.final("utf8");
  return decrypted;
}
