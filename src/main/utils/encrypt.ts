import { safeStorage } from 'electron'

const LEGACY_ENCRYPTED_PREFIX = 'enc:'

// Legacy safeStorage compatibility only. New writes must stay plaintext.
// TODO(next version): remove this file after one release of read-time plaintext migration.

export function isLegacyEncryptedString(value: unknown): value is string {
  return typeof value === 'string' && value.startsWith(LEGACY_ENCRYPTED_PREFIX)
}

export function decryptLegacyString(encryptedText: string): string {
  if (!isLegacyEncryptedString(encryptedText)) {
    return encryptedText
  }

  if (!safeStorage.isEncryptionAvailable()) {
    throw new Error('Legacy safeStorage data is not decryptable on this system')
  }

  const base64Data = encryptedText.substring(LEGACY_ENCRYPTED_PREFIX.length)
  const buffer = Buffer.from(base64Data, 'base64')
  return safeStorage.decryptString(buffer)
}
