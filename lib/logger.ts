import { createAdminClient, isServerSupabaseConfigured } from '@/lib/supabase/server';
import { EventType, EventLogEntry } from '@/lib/russianRoulette';
import { csvCell } from '@/lib/security/http';

// In-memory fallback log store for offline/local dev or tests
const inMemoryLogs: EventLogEntry[] = [];

/**
 * Extracts client IP and User-Agent from Request or Headers
 */
export function extractClientMeta(req?: Request | Headers): { ip: string; userAgent: string } {
  if (!req) {
    return { ip: '127.0.0.1', userAgent: 'internal/server' };
  }

  const headers = req instanceof Request ? req.headers : req;
  const forwardedFor = headers.get('x-forwarded-for');
  const realIp = headers.get('x-real-ip');
  const cfConnectingIp = headers.get('cf-connecting-ip');
  const ip = (cfConnectingIp || forwardedFor?.split(',')[0]?.trim() || realIp || '127.0.0.1');
  const userAgent = headers.get('user-agent') || 'desconocido';

  return { ip, userAgent };
}

export interface LogEventParams {
  eventType: EventType;
  userId?: string | null;
  username?: string | null;
  roomId?: string | null;
  gameId?: string | null;
  ipAddress?: string | null;
  userAgent?: string | null;
  details?: Record<string, any>;
  req?: Request | Headers;
}

/**
 * Logs an event strictly append-only into `event_logs` table (and in-memory buffer)
 */
export async function logEvent({
  eventType,
  userId = null,
  username = null,
  roomId = null,
  gameId = null,
  ipAddress = null,
  userAgent = null,
  details = {},
  req,
}: LogEventParams): Promise<EventLogEntry> {
  const meta = req ? extractClientMeta(req) : null;
  const finalIp = ipAddress || meta?.ip || '127.0.0.1';
  const finalUa = userAgent || meta?.userAgent || 'server-action';

  const entry: EventLogEntry = {
    id: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : 'log_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7),
    event_type: eventType,
    user_id: userId,
    username: username,
    room_id: roomId,
    game_id: gameId,
    ip_address: finalIp,
    user_agent: finalUa,
    details: details || {},
    created_at: new Date().toISOString(),
  };

  // Always keep in local memory buffer
  inMemoryLogs.unshift(entry);
  if (inMemoryLogs.length > 2000) {
    inMemoryLogs.pop();
  }

  // Persist to Supabase if available
  if (isServerSupabaseConfigured()) {
    try {
      const adminClient = createAdminClient();
      if (adminClient) {
        await adminClient.from('event_logs').insert([
          {
            id: entry.id,
            event_type: entry.event_type,
            user_id: entry.user_id,
            username: entry.username,
            room_id: entry.room_id,
            game_id: entry.game_id,
            ip_address: entry.ip_address,
            user_agent: entry.user_agent,
            details: entry.details,
            created_at: entry.created_at,
          },
        ]);
      }
    } catch (err) {
      console.error('[EVENT_LOG_ERROR] Could not write to Supabase:', err);
    }
  }

  return entry;
}

export interface GetLogsOptions {
  eventType?: string;
  userId?: string;
  roomId?: string;
  search?: string;
  startDate?: string;
  endDate?: string;
  page?: number;
  limit?: number;
}

/**
 * Queries audit logs with pagination and filters
 */
export async function queryEventLogs(options: GetLogsOptions = {}): Promise<{
  logs: EventLogEntry[];
  total: number;
  page: number;
  totalPages: number;
}> {
  const page = Math.max(1, options.page || 1);
  const limit = Math.min(100, Math.max(10, options.limit || 25));
  const offset = (page - 1) * limit;

  if (isServerSupabaseConfigured()) {
    try {
      const adminClient = createAdminClient();
      if (adminClient) {
        let query = adminClient
          .from('event_logs')
          .select('*', { count: 'exact' })
          .order('created_at', { ascending: false });

        if (options.eventType) {
          query = query.eq('event_type', options.eventType);
        }
        if (options.userId) {
          query = query.eq('user_id', options.userId);
        }
        if (options.roomId) {
          query = query.eq('room_id', options.roomId);
        }
        if (options.startDate) {
          query = query.gte('created_at', options.startDate);
        }
        if (options.endDate) {
          query = query.lte('created_at', options.endDate);
        }
        if (options.search) {
          // SEGURIDAD: el término de búsqueda se neutraliza para que no pueda
          // alterar la estructura del filtro PostgREST (.or inyectable).
          const safeSearch = String(options.search)
            .replace(/[,\(\)]/g, ' ')
            .replace(/[%"]/g, '')
            .trim()
            .slice(0, 60);

          if (safeSearch) {
            query = query.or(
              `username.ilike.%${safeSearch}%,details->>message.ilike.%${safeSearch}%,ip_address.ilike.%${safeSearch}%`
            );
          }
        }

        const { data, count, error } = await query.range(offset, offset + limit - 1);
        if (!error && data) {
          const total = count || 0;
          return {
            logs: data as EventLogEntry[],
            total,
            page,
            totalPages: Math.ceil(total / limit) || 1,
          };
        }
      }
    } catch (err) {
      console.warn('[QUERY_LOGS_WARN] Falling back to memory logs:', err);
    }
  }

  // Filter in memory fallback
  let filtered = [...inMemoryLogs];
  if (options.eventType) {
    filtered = filtered.filter((l) => l.event_type === options.eventType);
  }
  if (options.userId) {
    filtered = filtered.filter((l) => l.user_id === options.userId);
  }
  if (options.roomId) {
    filtered = filtered.filter((l) => l.room_id === options.roomId);
  }
  if (options.startDate) {
    filtered = filtered.filter((l) => l.created_at >= options.startDate!);
  }
  if (options.endDate) {
    filtered = filtered.filter((l) => l.created_at <= options.endDate!);
  }
  if (options.search) {
    const s = options.search.toLowerCase();
    filtered = filtered.filter(
      (l) =>
        (l.username && l.username.toLowerCase().includes(s)) ||
        (l.ip_address && l.ip_address.includes(s)) ||
        JSON.stringify(l.details).toLowerCase().includes(s)
    );
  }

  const total = filtered.length;
  const paginated = filtered.slice(offset, offset + limit);

  return {
    logs: paginated,
    total,
    page,
    totalPages: Math.ceil(total / limit) || 1,
  };
}

/**
 * Converts logs to CSV formatted string
 */
export function logsToCSV(logs: EventLogEntry[]): string {
  // SEGURIDAD: todas las celdas pasan por el escapado anti-inyección de
  // fórmulas (csvCell), incluida la IP que el atacante puede controlar
  // mediante cabeceras falsificadas (antes permitía ejecutar fórmulas en
  // Excel al abrir el CSV exportado desde /api/admin/logs).
  const header = ['ID', 'Fecha (UTC)', 'Tipo Evento', 'Usuario ID', 'Nombre Usuario', 'Sala ID', 'Partida ID', 'IP', 'Navegador', 'Detalles'];
  const rows = logs.map((l) => [
    csvCell(l.id),
    csvCell(l.created_at),
    csvCell(l.event_type),
    csvCell(l.user_id),
    csvCell(l.username),
    csvCell(l.room_id),
    csvCell(l.game_id),
    csvCell(l.ip_address),
    csvCell(l.user_agent),
    csvCell(JSON.stringify(l.details || {})),
  ]);

  return [header.join(','), ...rows.map((r) => r.join(','))].join('\n');
}
