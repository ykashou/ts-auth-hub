import crypto from "crypto";

// Encryption key must be 32 bytes for AES-256
// In production, this should be a strong random key stored in environment variables
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || process.env.SESSION_SECRET || "default-key-change-in-production-!!!";

// Ensure key is exactly 32 bytes
const getEncryptionKey = (): Buffer => {
  // Use SHA-256 to derive a 32-byte key from whatever we have
  return crypto.createHash('sha256').update(ENCRYPTION_KEY).digest();
};

/**
 * Encrypt a plaintext string using AES-256-GCM
 * Returns: "iv:authTag:encryptedData" (all base64 encoded)
 */
export function encryptSecret(plaintext: string): string {
  const key = getEncryptionKey();
  const iv = crypto.randomBytes(16); // Initialization vector
  
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  
  let encrypted = cipher.update(plaintext, 'utf8', 'base64');
  encrypted += cipher.final('base64');
  
  const authTag = cipher.getAuthTag();
  
  // Combine IV, auth tag, and encrypted data
  return `${iv.toString('base64')}:${authTag.toString('base64')}:${encrypted}`;
}

/**
 * Decrypt an encrypted string using AES-256-GCM
 * Input format: "iv:authTag:encryptedData" (all base64 encoded)
 */
export function decryptSecret(encryptedString: string): string {
  const key = getEncryptionKey();
  
  // Split the encrypted string into components
  const parts = encryptedString.split(':');
  if (parts.length !== 3) {
    throw new Error('Invalid encrypted string format');
  }
  
  const iv = Buffer.from(parts[0], 'base64');
  const authTag = Buffer.from(parts[1], 'base64');
  const encrypted = parts[2];
  
  const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(authTag);
  
  let decrypted = decipher.update(encrypted, 'base64', 'utf8');
  decrypted += decipher.final('utf8');
  
  return decrypted;
}
