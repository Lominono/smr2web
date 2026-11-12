/**
 * SMR2 · Limitador de frecuencia (rate limiting) en memoria.
 *
 * Diseño:
 * - Ventana deslizante simple por clave (usuario, IP, acción...).
 * - Pensado para endpoints de API donde interesa frenar abusos sin castigar
 *   a toda el aula (los alumnos comparten la misma IP pública: NUNCA se debe
 *   aplicar un límite global por IP a rutas de juego o polling).
 * - En despliegues serverless cada instancia tiene su propio mapa, por lo que
 *   este limitador es una primera barrera. Las operaciones económicas críticas
 *   se protegen además con límites persistidos en PostgreSQL (ver wallet).
 */

export interface RateLimitResult {
  /** ¿Se permite la operación? */
  allowed: boolean;
  /** Peticiones restantes en la ventana actual */
  remaining: number;
  /** Segundos recomendados de espera antes de reintentar */
  retryAfterSeconds: number;
  /** Límite configurado para la ventana */
  limit: number;
}

interface Bucket {
  count: number;
  resetAt: number;
}

const buckets = new Map<string, Bucket>();
const MAX_BUCKETS = 20_000;

/** Limpia periódicamente las ventanas caducadas para no crecer sin control. */
function evictExpired(now: number): void {
  for (const [key, bucket] of buckets) {
    if (bucket.resetAt <= now) buckets.delete(key);
  }
}

if (typeof globalThis !== 'undefined') {
  const globalStore = globalThis as typeof globalThis & {
    __smr2RateLimitTimer?: ReturnType<typeof setInterval>;
  };
  if (!globalStore.__smr2RateLimitTimer) {
    globalStore.__smr2RateLimitTimer = setInterval(() => {
      try {
        evictExpired(Date.now());
      } catch {
        /* noop */
      }
    }, 5 * 60 * 1000);
    // No mantener vivo el proceso por el temporizador (Node.js)
    const timer = globalStore.__smr2RateLimitTimer as unknown as { unref?: () => void };
    if (typeof timer?.unref === 'function') timer.unref();
  }
}

/**
 * Consume una unidad del cupo `key`. Devuelve si la operación está permitida.
 *
 * @param key      Clave única (ej: `wallet:${userId}`)
 * @param limit    Número máximo de operaciones por ventana
 * @param windowMs Duración de la ventana en milisegundos
 */
export function consumeRateLimit(key: string, limit: number, windowMs: number): RateLimitResult {
  const now = Date.now();

  if (buckets.size > MAX_BUCKETS) evictExpired(now);

  const existing = buckets.get(key);
  if (!existing || existing.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, remaining: Math.max(0, limit - 1), retryAfterSeconds: 0, limit };
  }

  if (existing.count >= limit) {
    return {
      allowed: false,
      remaining: 0,
      retryAfterSeconds: Math.max(1, Math.ceil((existing.resetAt - now) / 1000)),
      limit,
    };
  }

  existing.count += 1;
  return { allowed: true, remaining: Math.max(0, limit - existing.count), retryAfterSeconds: 0, limit };
}

/** Libera el cupo de una clave (por ejemplo tras un login correcto). */
export function resetRateLimit(key: string): void {
  buckets.delete(key);
}

/**
 * Registra un fallo y bloquea la clave durante `lockMs` cuando se alcanza
 * el número máximo de intentos. Devuelve el estado actualizado.
 */
export function recordFailure(
  key: string,
  maxAttempts: number,
  windowMs: number,
  lockMs: number
): { locked: boolean; remainingSeconds: number; attempts: number; attemptsLeft: number } {
  const now = Date.now();
  const bucket = buckets.get(key);

  if (!bucket || bucket.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return {
      locked: false,
      remainingSeconds: 0,
      attempts: 1,
      attemptsLeft: Math.max(0, maxAttempts - 1),
    };
  }

  bucket.count += 1;

  if (bucket.count >= maxAttempts) {
    bucket.resetAt = now + lockMs;
    return { locked: true, remainingSeconds: Math.ceil(lockMs / 1000), attempts: bucket.count, attemptsLeft: 0 };
  }

  return {
    locked: false,
    remainingSeconds: 0,
    attempts: bucket.count,
    attemptsLeft: Math.max(0, maxAttempts - bucket.count),
  };
}

/** ¿Está la clave bloqueada ahora mismo? */
export function isLocked(key: string): { locked: boolean; remainingSeconds: number } {
  const bucket = buckets.get(key);
  if (!bucket) return { locked: false, remainingSeconds: 0 };
  const remaining = bucket.resetAt - Date.now();
  if (remaining <= 0) {
    buckets.delete(key);
    return { locked: false, remainingSeconds: 0 };
  }
  return { locked: true, remainingSeconds: Math.ceil(remaining / 1000) };
}

export const RATE_LIMITS = {
  /** Sincronización de cartera (por usuario) */
  wallet: { limit: 90, windowMs: 60_000 },
  /** Operaciones de mercado del botellón (por usuario) */
  marketTrade: { limit: 12, windowMs: 60_000 },
  /** Notificaciones push emitidas por un admin */
  pushBroadcast: { limit: 6, windowMs: 60_000 },
  /** Registro de cuentas (por IP) */
  register: { limit: 8, windowMs: 15 * 60_000 },
  /** Login (por IP) */
  login: { limit: 15, windowMs: 15 * 60_000 },
  /** Endpoint de IA (por IP) */
  ai: { limit: 20, windowMs: 60_000 },
  /** Acciones de ruleta rusa (por usuario) */
  rouletteAction: { limit: 30, windowMs: 60_000 },
  /** Creación de salas (por usuario) */
  rouletteRoom: { limit: 10, windowMs: 60_000 },
  /** Identificación / perfil (por usuario) */
  profileWrite: { limit: 15, windowMs: 60_000 },
} as const;
