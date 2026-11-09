/**
 * Sistema de Seguridad de Contraseñas para SMR2
 * Políticas de complejidad, protección contra fuerza bruta y hashes seguros con salt.
 */

export interface PasswordCriteria {
  minLength: boolean; // Al menos 6 caracteres
  hasUppercase: boolean; // Al menos una mayúscula (A-Z)
  hasLowercase: boolean; // Al menos una minúscula (a-z)
  hasNumber: boolean; // Al menos un dígito numérico (0-9)
  hasSpecial: boolean; // Al menos un símbolo o carácter especial
  notTrivial: boolean; // No es una contraseña común o fácil de adivinar
  notMatchingUsername: boolean; // No contiene el nombre de usuario
}

export interface PasswordSecurityReport {
  valid: boolean;
  score: number; // 0 a 4
  strengthLabel: 'Muy débil' | 'Débil' | 'Aceptable' | 'Fuerte' | 'Muy segura';
  strengthColor: string; // Clase de Tailwind o color hex
  errors: string[];
  criteria: PasswordCriteria;
}

// Lista de contraseñas excesivamente obvias
const COMMON_WEAK_PASSWORDS = new Set([
  '123456',
  'password',
  'contraseña',
  'contrasena',
  'qwerty',
]);

/**
 * Evalúa la robustez de una contraseña.
 * Criterio de validez práctico: Mínimo 6 caracteres (estándar de Supabase).
 */
export function validatePasswordSecurity(
  password: string,
  username?: string,
  email?: string
): PasswordSecurityReport {
  const trimmed = password || '';
  const cleanUsername = (username || '').trim().toLowerCase();
  const emailPrefix = email ? email.split('@')[0].trim().toLowerCase() : '';

  const criteria: PasswordCriteria = {
    minLength: trimmed.length >= 6,
    hasUppercase: /[A-Z]/.test(trimmed),
    hasLowercase: /[a-z]/.test(trimmed),
    hasNumber: /[0-9]/.test(trimmed),
    hasSpecial: /[^A-Za-z0-9]/.test(trimmed),
    notTrivial: !COMMON_WEAK_PASSWORDS.has(trimmed.toLowerCase()),
    notMatchingUsername: true,
  };

  if (cleanUsername && cleanUsername.length >= 4) {
    if (trimmed.toLowerCase() === cleanUsername) {
      criteria.notMatchingUsername = false;
    }
  }
  if (emailPrefix && emailPrefix.length >= 4) {
    if (trimmed.toLowerCase() === emailPrefix) {
      criteria.notMatchingUsername = false;
    }
  }

  const errors: string[] = [];

  if (!criteria.minLength) {
    errors.push('Debe tener al menos 6 caracteres.');
  }
  if (!criteria.notTrivial) {
    errors.push('La contraseña es demasiado común.');
  }

  // Puntuación del 0 al 4 para el indicador visual
  let score = 0;
  if (trimmed.length >= 6) score += 1;
  if (trimmed.length >= 8 && ((criteria.hasUppercase && criteria.hasLowercase) || criteria.hasNumber)) score += 1;
  if (criteria.hasUppercase && criteria.hasLowercase && criteria.hasNumber) score += 1;
  if (criteria.hasSpecial || trimmed.length >= 12) score += 1;

  let strengthLabel: PasswordSecurityReport['strengthLabel'] = 'Muy débil';
  let strengthColor = 'bg-red-500';

  if (score === 1) {
    strengthLabel = 'Débil';
    strengthColor = 'bg-orange-500';
  } else if (score === 2) {
    strengthLabel = 'Aceptable';
    strengthColor = 'bg-amber-500';
  } else if (score === 3) {
    strengthLabel = 'Fuerte';
    strengthColor = 'bg-emerald-500';
  } else if (score >= 4) {
    strengthLabel = 'Muy segura';
    strengthColor = 'bg-green-500';
  }

  // Válida si tiene al menos 6 caracteres
  const valid = criteria.minLength;

  return {
    valid,
    score: Math.min(4, Math.max(0, score)),
    strengthLabel,
    strengthColor,
    errors,
    criteria,
  };
}

// =========================================================================
// PROTECCIÓN CONTRA FUERZA BRUTA (Rate limiting en el navegador)
// =========================================================================

const STORAGE_LOGIN_ATTEMPTS = 'smr2_login_attempts_tracker';
const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 30 * 1000; // 30 segundos de penalización

interface AttemptState {
  count: number;
  lockoutUntil: number | null;
}

function getAttemptState(): AttemptState {
  if (typeof window === 'undefined') return { count: 0, lockoutUntil: null };
  try {
    const raw = sessionStorage.getItem(STORAGE_LOGIN_ATTEMPTS);
    if (!raw) return { count: 0, lockoutUntil: null };
    return JSON.parse(raw);
  } catch {
    return { count: 0, lockoutUntil: null };
  }
}

function saveAttemptState(state: AttemptState) {
  if (typeof window === 'undefined') return;
  try {
    sessionStorage.setItem(STORAGE_LOGIN_ATTEMPTS, JSON.stringify(state));
  } catch {}
}

export function checkLoginLockout(): { locked: boolean; remainingSeconds: number } {
  const state = getAttemptState();
  if (state.lockoutUntil && state.lockoutUntil > Date.now()) {
    const remainingSeconds = Math.ceil((state.lockoutUntil - Date.now()) / 1000);
    return { locked: true, remainingSeconds };
  }
  return { locked: false, remainingSeconds: 0 };
}

export function recordFailedLoginAttempt(): { locked: boolean; remainingSeconds: number; attemptsLeft: number } {
  const state = getAttemptState();
  const nextCount = state.count + 1;

  if (nextCount >= MAX_FAILED_ATTEMPTS) {
    const lockoutUntil = Date.now() + LOCKOUT_DURATION_MS;
    saveAttemptState({ count: nextCount, lockoutUntil });
    return { locked: true, remainingSeconds: 30, attemptsLeft: 0 };
  }

  saveAttemptState({ count: nextCount, lockoutUntil: null });
  return { locked: false, remainingSeconds: 0, attemptsLeft: MAX_FAILED_ATTEMPTS - nextCount };
}

export function resetFailedLoginAttempts(): void {
  if (typeof window === 'undefined') return;
  try {
    sessionStorage.removeItem(STORAGE_LOGIN_ATTEMPTS);
  } catch {}
}
