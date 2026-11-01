/**
 * Smart database capability and table presence cache.
 * Prevents continuous HTTP 404 / PGRST205 console errors when a table
 * does not exist in the remote Supabase schema cache.
 */

const missingTables = new Set<string>();

// Hydrate from sessionStorage if in browser
if (typeof window !== 'undefined') {
  try {
    const raw = sessionStorage.getItem('smr2_missing_tables');
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        parsed.forEach((t) => missingTables.add(t));
      }
    }
  } catch {}
}

export function isTableAvailable(tableName: string): boolean {
  return !missingTables.has(tableName);
}

export function markTableMissing(tableName: string): void {
  if (!missingTables.has(tableName)) {
    missingTables.add(tableName);
    if (typeof window !== 'undefined') {
      try {
        sessionStorage.setItem(
          'smr2_missing_tables',
          JSON.stringify(Array.from(missingTables))
        );
      } catch {}
    }
  }
}

export function markTableAvailable(tableName: string): void {
  if (missingTables.has(tableName)) {
    missingTables.delete(tableName);
    if (typeof window !== 'undefined') {
      try {
        sessionStorage.setItem(
          'smr2_missing_tables',
          JSON.stringify(Array.from(missingTables))
        );
      } catch {}
    }
  }
}

/**
 * Checks if an error from Supabase indicates a missing table in schema cache (PGRST205 or HTTP 404).
 */
export function isTableMissingError(error: any): boolean {
  if (!error) return false;
  if (error.code === 'PGRST205' || error.code === '42P01') return true;
  const msg = String(error.message || '').toLowerCase();
  return (
    msg.includes('could not find the table') ||
    msg.includes('relation') && msg.includes('does not exist') ||
    msg.includes('in the schema cache')
  );
}
