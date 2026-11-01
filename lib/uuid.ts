/**
 * Validates whether a given string is a valid standard RFC 4122 UUID.
 * Supabase / PostgreSQL UUID columns reject any value that doesn't match this format with HTTP 400 Bad Request.
 * Local accounts, guest sessions, and temporary IDs (e.g. 'local_x9v982a') are NOT valid UUIDs.
 */
export function isUUID(val?: string | null): boolean {
  if (!val || typeof val !== 'string') return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(val.trim());
}
