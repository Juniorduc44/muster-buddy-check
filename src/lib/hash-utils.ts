/**
 * Utility functions for generating and verifying attendance hashes
 */

/**
 * Simple hash function fallback when crypto.subtle is not available
 * @param str - String to hash
 * @returns Simple hash string
 */
function simpleHash(str: string): string {
  let hash = 0;
  if (str.length === 0) return hash.toString();
  
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  
  // Convert to positive hex string and pad to 64 characters
  const positiveHash = Math.abs(hash).toString(16);
  return positiveHash.padEnd(64, '0').substring(0, 64);
}

/**
 * Generates a SHA256 hash for attendance verification
 * @param entryData - The attendance entry data
 * @returns A SHA256 hash string
 */
export async function generateAttendanceHash(entryData: {
  id: string;
  sheetId: string;
  firstName: string;
  lastName: string;
  timestamp: string;
  createdAt: string;
  email?: string;
  phone?: string;
  rank?: string;
  badgeNumber?: string;
  unit?: string;
  age?: number;
}): Promise<string> {
  // Create a unique string from the entry data
  const dataString = JSON.stringify({
    id: entryData.id,
    sheetId: entryData.sheetId,
    firstName: entryData.firstName.toLowerCase().trim(),
    lastName: entryData.lastName.toLowerCase().trim(),
    timestamp: entryData.timestamp,
    createdAt: entryData.createdAt,
    email: entryData.email?.toLowerCase().trim() || '',
    phone: entryData.phone?.trim() || '',
    rank: entryData.rank?.trim() || '',
    badgeNumber: entryData.badgeNumber?.trim() || '',
    unit: entryData.unit?.trim() || '',
    age: entryData.age || 0,
    // Add a secret salt to prevent hash collisions
    salt: 'muster-sheets-attendance-2024'
  });

  // Try to use Web Crypto API first, fallback to simple hash
  try {
    if (typeof crypto !== 'undefined' && crypto.subtle && crypto.subtle.digest) {
      // Generate SHA256 hash using Web Crypto API
      const encoder = new TextEncoder();
      const data = encoder.encode(dataString);
      const hashBuffer = await crypto.subtle.digest('SHA-256', data);
      
      // Convert to hex string
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
      
      return hashHex;
    } else {
      // Fallback to simple hash function
      console.warn('[HashUtils] Web Crypto API not available, using fallback hash');
      return simpleHash(dataString);
    }
  } catch (error) {
    // If Web Crypto API fails, use fallback
    console.warn('[HashUtils] Web Crypto API failed, using fallback hash:', error);
    return simpleHash(dataString);
  }
}

/**
 * Verifies if a hash matches the expected attendance data
 * @param hash - The hash to verify
 * @param entryData - The attendance entry data
 * @returns True if the hash is valid
 */
export async function verifyAttendanceHash(
  hash: string,
  entryData: {
    id: string;
    sheetId: string;
    firstName: string;
    lastName: string;
    timestamp: string;
    createdAt: string;
    email?: string;
    phone?: string;
    rank?: string;
    badgeNumber?: string;
    unit?: string;
    age?: number;
  }
): Promise<boolean> {
  const expectedHash = await generateAttendanceHash(entryData);
  return hash === expectedHash;
}

/**
 * Formats a hash for display (adds spaces every 8 characters for readability)
 * @param hash - The hash string
 * @returns Formatted hash string
 */
export function formatHashForDisplay(hash: string): string {
  return hash.match(/.{1,8}/g)?.join(' ') || hash;
}

/**
 * Creates a short hash for quick reference (first 16 characters)
 * @param hash - The full hash string
 * @returns Short hash string
 */
export function getShortHash(hash: string): string {
  return hash.substring(0, 16);
}

/**
 * Validates if a string looks like a valid attendance hash
 * @param hash - The hash string to validate
 * @returns True if it looks like a valid hash
 */
export function isValidHashFormat(hash: string): boolean {
  // Remove spaces and check if it's a 64-character hex string
  const cleanHash = hash.replace(/\s/g, '');
  return /^[a-fA-F0-9]{64}$/.test(cleanHash);
} 