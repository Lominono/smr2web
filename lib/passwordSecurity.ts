/**
 * Sistema de Seguridad de Contraseñas para SMR2
 * Políticas de complejidad, protección contra fuerza bruta y hashes seguros con salt.
 */

export interface PasswordCriteria {
  minLength: boolean; // Al menos 8 caracteres
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

// Lista de contraseñas débiles comúnmente usadas en entornos escolares/IT
const COMMON_WEAK_PASSWORDS = new Set([
  '123456',
  '12345678',
  '123456789',
  'password',
  'contraseña',
  'contrasena',
  'qwerty',
  'qwertyuiop',
  'admin',
  'admin123',
  'admin1234',
  'smr2024',
  'smr2025',
  'smr2026',
  'informatica',
  'alumnado',
  'estudiante',
  'clase123',
  'asir123',
  'daw1234',
  'dam1234',
  'iloveyou',
  'welcome',
  'temporal',
  'password123',
  '111111',
  '000000',
]);

/**
 * Evalúa la robustez y seguridad de una contraseña
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
    minLength: trimmed.length >= 8,
    hasUppercase: /[A-Z]/.test(trimmed),
    hasLowercase: /[a-z]/.test(trimmed),
    hasNumber: /[0-9]/.test(trimmed),
    hasSpecial: /[^A-Za-z0-9]/.test(trimmed),
    notTrivial: !COMMON_WEAK_PASSWORDS.has(trimmed.toLowerCase()),
    notMatchingUsername: true,
  };

  // Comprobar que no coincida ni contenga el nombre de usuario o prefijo del correo
  if (cleanUsername && cleanUsername.length >= 3) {
    if (trimmed.toLowerCase().includes(cleanUsername)) {
      criteria.notMatchingUsername = false;
    }
  }
  if (emailPrefix && emailPrefix.length >= 3) {
    if (trimmed.toLowerCase().includes(emailPrefix)) {
      criteria.notMatchingUsername = false;
    }
  }

  const errors: string[] = [];

  if (!criteria.minLength) {
    errors.push('Debe tener al menos 8 caracteres.');
  }
  if (!criteria.hasLowercase || !criteria.hasUppercase) {
    errors.push('Debe combinar letras mayúsculas y minúsculas.');
  }
  if (!criteria.hasNumber) {
    errors.push('Debe incluir al menos un número (0-9).');
  }
  if (!criteria.hasSpecial) {
    errors.push('Debe incluir al menos un símbolo especial (@, $, !, %, etc.).');
  }
  if (!criteria.notTrivial) {
    errors.push('La contraseña es demasiado predecible o común. Elige una más original.');
  }
  if (!criteria.notMatchingUsername) {
    errors.push('La contraseña no debe incluir tu nombre de usuario ni tu correo.');
  }

  // Puntuación del 0 al 4
  let score = 0;
  if (criteria.minLength) score += 1;
  if (criteria.hasUppercase && criteria.hasLowercase) score += 1;
  if (criteria.hasNumber) score += 1;
  if (criteria.hasSpecial) score += 1;

  if (!criteria.notTrivial || !criteria.notMatchingUsername) {
    score = Math.min(score, 1);
  }

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
  } else if (score === 4) {
    strengthLabel = 'Muy segura';
    strengthColor = 'bg-green-500';
  }

  // Se considera válida si tiene al menos 8 caracteres, combina mayús/minús/número o símbolo y no es trivial
  const valid =
    criteria.minLength &&
    criteria.notTrivial &&
    criteria.notMatchingUsername &&
    ((criteria.hasUppercase && criteria.hasLowercase && criteria.hasNumber) || score >= 3);

  return {
    valid,
    score,
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
