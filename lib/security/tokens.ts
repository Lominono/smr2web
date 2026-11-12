import crypto from 'crypto';
import { getServerSigningSecret } from '@/lib/adminAuth';

/**
 * SMR2 · Tokens firmados (HMAC-SHA256) para operaciones sensibles.
 *
 * Se usan como "justificantes" de una sola vez: por ejemplo, cuando un jugador
 * apuesta en un minijuego el servidor emite un recibo firmado que después es
 * obligatorio para poder cobrar la ganancia. Así el cliente no puede inventarse
 * un premio sin haber apostado antes, y cada recibo solo sirve una vez.
 */

const TOKEN_VERSION = 'v1';

interface BasePayload {
  /** Identificador único del token (para evitar reutilización) */
  jti: string;
  /** Usuario propietario */
  uid: string;
  /** Emisión en milisegundos */
  iat: number;
  /** Marca de expiración en milisegundos */
  exp: number;
}

export interface RoundReceiptPayload extends BasePayload {
  kind: 'round';
  /** Apuesta asociada al recibo */
  stake: number;
}

function sign(data: string, purpose: string): string {
  return crypto
    .createHmac('sha256', getServerSigningSecret())
    .update(`${purpose}.${data}`)
    .digest('base64url');
}

/** Firma un payload y devuelve el token serializado. */
export function signToken(
  purpose: string,
  payload: Record<string, unknown>,
  ttlSeconds: number
): string {
  const fullPayload = {
    ...payload,
    iat: Date.now(),
    exp: Date.now() + Math.max(1, ttlSeconds) * 1000,
  };
  const body = Buffer.from(JSON.stringify(fullPayload)).toString('base64url');
  return `${TOKEN_VERSION}.${purpose}.${body}.${sign(body, purpose)}`;
}

export type VerifyResult<T> =
  | { ok: true; payload: T }
  | { ok: false; reason: 'malformed' | 'signature' | 'expired' | 'purpose' };

/** Verifica firma, propósito y caducidad de un token. */
export function verifyToken<T extends BasePayload>(purpose: string, token: unknown): VerifyResult<T> {
  if (typeof token !== 'string' || token.length < 20 || token.length > 4096) {
    return { ok: false, reason: 'malformed' };
  }

  const parts = token.split('.');
  if (parts.length !== 4) return { ok: false, reason: 'malformed' };

  const [version, tokenPurpose, body, signature] = parts;
  if (version !== TOKEN_VERSION) return { ok: false, reason: 'malformed' };
  if (tokenPurpose !== purpose) return { ok: false, reason: 'purpose' };

  const expected = sign(body, purpose);
  const signatureBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expected);
  if (
    signatureBuffer.length !== expectedBuffer.length ||
    !crypto.timingSafeEqual(signatureBuffer, expectedBuffer)
  ) {
    return { ok: false, reason: 'signature' };
  }

  try {
    const payload = JSON.parse(Buffer.from(body, 'base64url').toString('utf8')) as T;
    if (!payload || typeof payload !== 'object') return { ok: false, reason: 'malformed' };
    if (typeof payload.exp !== 'number' || payload.exp < Date.now()) {
      return { ok: false, reason: 'expired' };
    }
    if (typeof payload.jti !== 'string' || typeof payload.uid !== 'string') {
      return { ok: false, reason: 'malformed' };
    }
    return { ok: true, payload };
  } catch {
    return { ok: false, reason: 'malformed' };
  }
}

/** Genera un identificador aleatorio para un recibo. */
export function newTokenId(): string {
  return crypto.randomUUID();
}

/**
 * Consumo de un recibo de un solo uso.
 * - Si hay base de datos disponible intenta insertarlo en `wallet_receipts`
 *   (clave primaria = jti). Un conflicto significa que ya se usó (replay).
 * - Si la tabla no existe todavía (migración pendiente) se usa memoria local.
 */
const memoryConsumed = new Map<string, number>();

function pruneMemory(): void {
  const now = Date.now();
  for (const [jti, exp] of memoryConsumed) {
    if (exp <= now) memoryConsumed.delete(jti);
  }
}

export function consumeInMemory(jti: string, exp: number): boolean {
  if (memoryConsumed.size > 50_000) pruneMemory();
  const existing = memoryConsumed.get(jti);
  if (existing && existing > Date.now()) return false;
  memoryConsumed.set(jti, exp);
  return true;
}

type MinimalDbClient = {
  from: (table: string) => {
    insert: (row: Record<string, unknown>) => Promise<{ error: { code?: string; message?: string } | null }>;
  };
};

/**
 * Marca un recibo como consumido de forma persistente cuando es posible.
 * Devuelve `false` si ya había sido utilizado (replay detectado).
 */
export async function consumeReceipt(
  client: MinimalDbClient | null,
  jti: string,
  userId: string,
  payload: Record<string, unknown>,
  exp: number
): Promise<boolean> {
  if (client) {
    try {
      const { error } = await client.from('wallet_receipts').insert({
        id: jti,
        user_id: userId,
        payload,
        expires_at: new Date(exp).toISOString(),
      });
      if (!error) return true;
      // 23505 = unique_violation: el recibo ya fue canjeado
      if (error.code === '23505') return false;
      // Cualquier otro error (tabla ausente, RLS...) => respaldo en memoria
    } catch {
      /* respaldo en memoria */
    }
  }
  return consumeInMemory(jti, exp);
}

/** Recibo de ronda para minijuegos con apuesta. */
export function issueRoundReceipt(userId: string, stake: number, ttlSeconds = 180): string {
  return signToken(
    'round',
    { kind: 'round', uid: userId, stake, jti: newTokenId() },
    ttlSeconds
  );
}

export function verifyRoundReceipt(token: unknown): VerifyResult<RoundReceiptPayload> {
  return verifyToken<RoundReceiptPayload>('round', token);
}
