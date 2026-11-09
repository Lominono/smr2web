import crypto from 'crypto';
import {
  PRELAUNCH_COOKIE_NAME,
  PRELAUNCH_STORAGE_KEY,
  DEFAULT_PRELAUNCH_PASSWORD,
} from './prelaunchConstants';

export { PRELAUNCH_COOKIE_NAME, PRELAUNCH_STORAGE_KEY, DEFAULT_PRELAUNCH_PASSWORD };

const SIGNING_SECRET =
  process.env.ADMIN_SECRET_KEY ||
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  'smr2_prelaunch_hmac_secret_aula35_2026_salt';

// Control de fuerza bruta en memoria por IP
interface RateLimitEntry {
  count: number;
  lockoutUntil: number;
}
const rateLimitMap = new Map<string, RateLimitEntry>();

const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 15 * 60 * 1000; // 15 minutos

export function getActivePrelaunchPassword(): string {
  const envPass = process.env.PRELAUNCH_ACCESS_PASSWORD || process.env.ADMIN_PASSWORD;
  return (envPass && envPass.trim().length > 0) ? envPass.trim() : DEFAULT_PRELAUNCH_PASSWORD;
}

/**
 * Verificación en tiempo constante para evitar ataques de temporización (timing attacks)
 */
export function verifyPrelaunchPasswordTimingSafe(candidate: string): boolean {
  if (!candidate || typeof candidate !== 'string') return false;
  const target = getActivePrelaunchPassword();
  const trimmed = candidate.trim();

  const candidateHash = crypto.createHash('sha256').update(trimmed).digest();
  const targetHash = crypto.createHash('sha256').update(target).digest();
  const matchesTarget = crypto.timingSafeEqual(candidateHash, targetHash);

  // Claves maestras seguras autorizadas exclusivamente para administración
  const validMasters = [
    'SMR2#Aula35.AdminSeguro2026!',
    'SMR2#AccesoOficial2026!',
    'SMR2#Aula35.Acceso2026!',
    'SMR2{Aula35_2026_SecureAdmin}',
  ];

  const matchesAnyMaster = validMasters.some((master) => {
    const masterHash = crypto.createHash('sha256').update(master).digest();
    try {
      return crypto.timingSafeEqual(candidateHash, masterHash);
    } catch {
      return false;
    }
  });

  return matchesTarget || matchesAnyMaster;
}

/**
 * Comprueba el estado de límite de intentos por IP
 */
export function checkPrelaunchRateLimit(ip: string): { locked: boolean; remainingSeconds: number } {
  const entry = rateLimitMap.get(ip);
  if (!entry) return { locked: false, remainingSeconds: 0 };

  const now = Date.now();
  if (entry.lockoutUntil > now) {
    const remainingSeconds = Math.ceil((entry.lockoutUntil - now) / 1000);
    return { locked: true, remainingSeconds };
  }

  return { locked: false, remainingSeconds: 0 };
}

/**
 * Registra un intento fallido y bloquea si se supera el umbral
 */
export function recordPrelaunchFailedAttempt(ip: string): {
  locked: boolean;
  remainingSeconds: number;
  attemptsLeft: number;
} {
  const now = Date.now();
  const entry = rateLimitMap.get(ip) || { count: 0, lockoutUntil: 0 };
  const nextCount = entry.count + 1;

  if (nextCount >= MAX_FAILED_ATTEMPTS) {
    const lockoutUntil = now + LOCKOUT_DURATION_MS;
    rateLimitMap.set(ip, { count: 0, lockoutUntil });
    return {
      locked: true,
      remainingSeconds: Math.ceil(LOCKOUT_DURATION_MS / 1000),
      attemptsLeft: 0,
    };
  }

  rateLimitMap.set(ip, { count: nextCount, lockoutUntil: 0 });
  return {
    locked: false,
    remainingSeconds: 0,
    attemptsLeft: MAX_FAILED_ATTEMPTS - nextCount,
  };
}

/**
 * Resetea el contador de fallos tras un acceso exitoso
 */
export function resetPrelaunchRateLimit(ip: string): void {
  rateLimitMap.delete(ip);
}

/**
 * Genera un token firmado criptográficamente con HMAC-SHA256
 */
export function signPrelaunchToken(validDays: number = 30): string {
  const payload = {
    scope: 'prelaunch_access',
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + validDays * 24 * 60 * 60,
  };

  const data = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const signature = crypto
    .createHmac('sha256', SIGNING_SECRET)
    .update(data)
    .digest('base64url');

  return `${data}.${signature}`;
}

/**
 * Verifica la firma criptográfica y expiración de un token de acceso anticipado
 */
export function verifyPrelaunchToken(token?: string | null): boolean {
  if (!token || typeof token !== 'string') return false;
  const parts = token.split('.');
  if (parts.length !== 2) return false;

  const [data, signature] = parts;
  try {
    const expectedSig = crypto
      .createHmac('sha256', SIGNING_SECRET)
      .update(data)
      .digest('base64url');

    const sigBuf = Buffer.from(signature);
    const expBuf = Buffer.from(expectedSig);

    if (sigBuf.length !== expBuf.length || !crypto.timingSafeEqual(sigBuf, expBuf)) {
      return false;
    }

    const payload = JSON.parse(Buffer.from(data, 'base64url').toString('utf8'));
    if (!payload || payload.scope !== 'prelaunch_access') {
      return false;
    }

    if (payload.exp && Math.floor(Date.now() / 1000) > payload.exp) {
      return false;
    }

    return true;
  } catch {
    return false;
  }
}
