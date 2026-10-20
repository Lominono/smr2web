import { UserProfile } from '@/lib/types';
import { setCookie, getCookie, deleteCookie, setJsonCookie, getJsonCookie } from '@/lib/cookies';

export const COOKIE_SESSION = 'smr2_user_session';
export const COOKIE_REMEMBER = 'smr2_remember_me';
export const COOKIE_LAST_USER = 'smr2_last_user';

const STORAGE_LOCAL_USERS = 'smr2_local_db_users';
const STORAGE_USER_BACKUP = 'smr2_user_profile';

interface StoredLocalAccount {
  id: string;
  username: string;
  email: string;
  passwordHash: string;
  coins: number;
  biggest_win: number;
  created_at: string;
}

/**
 * Hash password securely in the browser using SHA-256
 */
async function hashPassword(password: string): Promise<string> {
  if (typeof window === 'undefined' || !window.crypto?.subtle) {
    // Fallback simple checksum if Web Crypto is unavailable (rare)
    return btoa(password);
  }
  const msgBuffer = new TextEncoder().encode(password);
  const hashBuffer = await window.crypto.subtle.digest('SHA-256', msgBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Saves the active user profile to cookies (with 365-day persistence by default)
 * and dual-saves to localStorage for maximum resilience.
 */
export function saveUserSession(user: UserProfile, remember: boolean = true): void {
  const days = remember ? 365 : 30;

  // 1. Save in cookie (accessible to client and sent in headers)
  setJsonCookie<UserProfile>(COOKIE_SESSION, user, { days });
  setCookie(COOKIE_REMEMBER, remember ? 'true' : 'false', { days });

  // 2. Remember last username/email identifier for convenience
  if (user.username || user.email) {
    setCookie(COOKIE_LAST_USER, user.email || user.username, { days: 365 });
  }

  // 3. LocalStorage backup
  try {
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_USER_BACKUP, JSON.stringify(user));
      localStorage.setItem(COOKIE_REMEMBER, remember ? 'true' : 'false');
    }
  } catch (err) {
    console.warn('Could not save user session to localStorage:', err);
  }
}

/**
 * Retrieves the active user session.
 * Checks cookie first; if missing, falls back to localStorage and re-syncs to cookie.
 */
export function getUserSession(): UserProfile | null {
  // 1. Try reading from cookie
  const cookieUser = getJsonCookie<UserProfile>(COOKIE_SESSION);
  if (cookieUser && cookieUser.id && cookieUser.username) {
    return cookieUser;
  }

  // 2. Fallback to localStorage backup
  try {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem(STORAGE_USER_BACKUP);
      if (stored) {
        const parsed = JSON.parse(stored) as UserProfile;
        if (parsed && parsed.id && parsed.username) {
          // Re-sync back to cookie so both are in harmony
          const remember = localStorage.getItem(COOKIE_REMEMBER) !== 'false';
          setJsonCookie<UserProfile>(COOKIE_SESSION, parsed, { days: remember ? 365 : 30 });
          return parsed;
        }
      }
    }
  } catch (err) {
    console.warn('Error reading session backup:', err);
  }

  return null;
}

/**
 * Updates user coin balance, biggest win, and streak in both cookie and localStorage
 */
export function updateSessionCoins(
  coins: number,
  biggestWin?: number,
  streakCount?: number,
  lastClaimDate?: string
): UserProfile | null {
  const current = getUserSession();
  if (!current) return null;

  const nextWin = biggestWin !== undefined ? Math.max(current.biggest_win || 0, biggestWin) : current.biggest_win;
  const updated: UserProfile = {
    ...current,
    coins,
    biggest_win: nextWin,
    streak_count: streakCount !== undefined ? streakCount : current.streak_count,
    last_claim_date: lastClaimDate !== undefined ? lastClaimDate : current.last_claim_date,
  };

  saveUserSession(updated, getCookie(COOKIE_REMEMBER) !== 'false');

  // If it's a local account, update in local accounts DB too
  updateLocalAccountBalance(current.id, coins, nextWin);

  return updated;
}

/**
 * Completely clears user session cookies and local storage
 */
export function clearUserSession(): void {
  deleteCookie(COOKIE_SESSION);
  deleteCookie(COOKIE_REMEMBER);

  try {
    if (typeof window !== 'undefined') {
      localStorage.removeItem(STORAGE_USER_BACKUP);
    }
  } catch {}
}

/**
 * Retrieves the last remembered email or username for login pre-fill
 */
export function getLastUserIdentifier(): string {
  return getCookie(COOKIE_LAST_USER) || '';
}

/**
 * Checks whether "remember me" was previously enabled
 */
export function getRememberMePreference(): boolean {
  const val = getCookie(COOKIE_REMEMBER);
  return val === null ? true : val === 'true';
}

// =========================================================================
// LOCAL USER ACCOUNTS DATABASE (Resilience for local / offline / dev environments)
// =========================================================================

function getLocalAccounts(): StoredLocalAccount[] {
  if (typeof window === 'undefined') return [];
  try {
    const data = localStorage.getItem(STORAGE_LOCAL_USERS);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

function saveLocalAccounts(accounts: StoredLocalAccount[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_LOCAL_USERS, JSON.stringify(accounts));
  } catch {}
}

function updateLocalAccountBalance(userId: string, coins: number, biggestWin: number): void {
  const accounts = getLocalAccounts();
  const index = accounts.findIndex((a) => a.id === userId);
  if (index !== -1) {
    accounts[index].coins = coins;
    accounts[index].biggest_win = biggestWin;
    saveLocalAccounts(accounts);
  }
}

/**
 * Registers a user locally when Supabase is unconfigured or offline
 */
export async function registerLocalUser(
  username: string,
  email: string,
  password: string,
  remember: boolean = true
): Promise<UserProfile> {
  const accounts = getLocalAccounts();
  const cleanUsername = username.trim().toLowerCase().replace(/\s+/g, '_');
  const cleanEmail = email.trim().toLowerCase();

  const existingEmail = accounts.find((a) => a.email === cleanEmail);
  if (existingEmail) {
    throw new Error('Ya existe una cuenta local registrada con este correo electrónico.');
  }

  const existingName = accounts.find((a) => a.username === cleanUsername);
  if (existingName) {
    throw new Error('El nombre de usuario ya está en uso. Elige otro apodo.');
  }

  const passwordHash = await hashPassword(password);
  const now = new Date().toISOString();
  const newAccount: StoredLocalAccount = {
    id: 'local_' + Math.random().toString(36).substring(2, 9),
    username: cleanUsername,
    email: cleanEmail,
    passwordHash,
    coins: 1000,
    biggest_win: 0,
    created_at: now,
  };

  accounts.push(newAccount);
  saveLocalAccounts(accounts);

  const profile: UserProfile = {
    id: newAccount.id,
    username: newAccount.username,
    email: newAccount.email,
    coins: newAccount.coins,
    biggest_win: newAccount.biggest_win,
    created_at: newAccount.created_at,
    auth_provider: 'local',
  };

  saveUserSession(profile, remember);
  return profile;
}

/**
 * Authenticates a local user
 */
export async function loginLocalUser(
  identifier: string,
  password: string,
  remember: boolean = true
): Promise<UserProfile> {
  const accounts = getLocalAccounts();
  const cleanId = identifier.trim().toLowerCase();
  const passwordHash = await hashPassword(password);

  const account = accounts.find(
    (a) => a.email === cleanId || a.username === cleanId
  );

  if (!account) {
    throw new Error('No se encontró ninguna cuenta local con ese correo o usuario.');
  }

  if (account.passwordHash !== passwordHash) {
    throw new Error('Contraseña incorrecta. Por favor, compruébala.');
  }

  const profile: UserProfile = {
    id: account.id,
    username: account.username,
    email: account.email,
    coins: account.coins,
    biggest_win: account.biggest_win,
    created_at: account.created_at,
    auth_provider: 'local',
  };

  saveUserSession(profile, remember);
  return profile;
}

/**
 * User-friendly translation of authentication errors to clear Spanish
 */
export function translateAuthError(error: any): string {
  if (!error) return 'Ocurrió un error inesperado al procesar la solicitud.';

  const message = typeof error === 'string' ? error : error?.message || '';

  if (message.includes('Invalid login credentials') || message.includes('invalid_grant')) {
    return 'Correo o contraseña incorrectos. Revisa tus credenciales.';
  }
  if (message.includes('User already registered') || message.includes('already exists')) {
    return 'Ya existe una cuenta con este correo electrónico. Inicia sesión.';
  }
  if (message.includes('Password should be at least') || message.includes('weak_password')) {
    return 'La contraseña debe tener un mínimo de 6 caracteres.';
  }
  if (message.includes('rate limit') || message.includes('Too many requests')) {
    return 'Demasiados intentos. Espera unos segundos antes de volver a intentar.';
  }
  if (message.includes('Failed to fetch') || message.includes('NetworkError')) {
    return 'No se pudo conectar con el servidor. Se utilizará el modo local.';
  }
  if (message.includes('Email not confirmed')) {
    return 'Correo no confirmado en Supabase. Puedes entrar en modo local.';
  }

  return message || 'Error al autenticar. Inténtalo de nuevo.';
}
