/**
 * Validates whether a given string is a valid standard RFC 4122 UUID.
 * Supabase / PostgreSQL UUID columns reject any value that doesn't match this format with HTTP 400 Bad Request.
 */
export function isUUID(val?: string | null): boolean {
  if (!val || typeof val !== 'string') return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(val.trim());
}

/**
 * Generates an RFC 4122 version 4 compliant UUID.
 * Uses crypto.randomUUID when available, with crypto.getRandomValues and Math.random fallbacks.
 */
export function generateUUID(): string {
  if (typeof crypto !== 'undefined') {
    if (typeof crypto.randomUUID === 'function') {
      try {
        return crypto.randomUUID();
      } catch {}
    }
    if (typeof crypto.getRandomValues === 'function') {
      try {
        const bytes = new Uint8Array(16);
        crypto.getRandomValues(bytes);
        bytes[6] = (bytes[6] & 0x0f) | 0x40; // v4
        bytes[8] = (bytes[8] & 0x3f) | 0x80; // RFC 4122 variant
        const hex = Array.from(bytes)
          .map((b) => b.toString(16).padStart(2, '0'))
          .join('');
        return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
      } catch {}
    }
  }

  // Fallback RFC 4122 v4 generator
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
 * Ensures a valid UUID: returns the input if already a valid UUID, or generates a fresh one.
 * Eliminates PostgreSQL syntax errors from legacy 'local_...' IDs.
 */
export function ensureUUID(val?: string | null): string {
  if (val && isUUID(val)) {
    return val.trim();
  }
  return generateUUID();
}
