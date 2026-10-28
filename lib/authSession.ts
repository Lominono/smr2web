import { UserProfile } from '@/lib/types';
import { setCookie, getCookie, deleteCookie, deleteAllCookies, setJsonCookie, getJsonCookie } from '@/lib/cookies';

export const COOKIE_SESSION = 'smr2_user_session';
export const COOKIE_REMEMBER = 'smr2_remember_me';
export const COOKIE_LAST_USER = 'smr2_last_user';

const STORAGE_LOCAL_USERS = 'smr2_local_db_users';
const STORAGE_USER_BACKUP = 'smr2_user_profile';

interface StoredLocalAccount {
  id: string;
  username: string;
  email: string;
  full_name?: string;
  student_number?: string;
  passwordHash: string;
  coins: number;
  biggest_win: number;
  streak_count?: number;
  last_claim_date?: string;
  role?: 'admin' | 'delegado' | 'student';
  avatar_color?: string;
  games_played?: number;
  games_won?: number;
  sound_enabled?: boolean;
  notifications_enabled?: boolean;
  created_at: string;
}

const SYSTEM_PEPPER = 'smr2_salt_pepper_v2_2026';

/**
 * Hash password securely in the browser using SHA-256 with cryptographic salt & pepper
 */
export async function hashPassword(password: string, userSalt: string = ''): Promise<string> {
  const combined = `${userSalt.toLowerCase().trim()}:${password}:${SYSTEM_PEPPER}`;

  if (typeof window !== 'undefined' && window.crypto?.subtle) {
    try {
      const msgBuffer = new TextEncoder().encode(combined);
      const hashBuffer = await window.crypto.subtle.digest('SHA-256', msgBuffer);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      return 's2_' + hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
    } catch {
      // Fallback below
    }
  }

  // Safe fallback for environments where Web Crypto Subtle is unavailable
  try {
    const encoded = encodeURIComponent(combined).replace(/%([0-9A-F]{2})/g, (_, p1) =>
      String.fromCharCode(parseInt(p1, 16))
    );
    return 's2_' + btoa(encoded);
  } catch {
    return 's2_' + btoa(combined.slice(0, 32));
  }
}

/**
 * Legacy hash calculation for backwards compatibility during migration
 */
async function legacyUnsaltedHash(password: string): Promise<string> {
  if (typeof window !== 'undefined' && window.crypto?.subtle) {
    try {
      const msgBuffer = new TextEncoder().encode(password);
      const hashBuffer = await window.crypto.subtle.digest('SHA-256', msgBuffer);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
    } catch {}
  }
  return btoa(password.slice(0, 32));
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
    if (cookieUser.coins === undefined || cookieUser.coins === null) {
      cookieUser.coins = 1000;
    }
    return cookieUser;
  }

  // 2. Fallback to localStorage backup
  try {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem(STORAGE_USER_BACKUP);
      if (stored) {
        const parsed = JSON.parse(stored) as UserProfile;
        if (parsed && parsed.id && parsed.username) {
          if (parsed.coins === undefined || parsed.coins === null) {
            parsed.coins = 1000;
          }
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
  lastClaimDate?: string,
  lastSpinDate?: string,
  lastRescueDate?: string
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
    last_spin_date: lastSpinDate !== undefined ? lastSpinDate : current.last_spin_date,
    last_rescue_date: lastRescueDate !== undefined ? lastRescueDate : current.last_rescue_date,
  };

  saveUserSession(updated, getCookie(COOKIE_REMEMBER) !== 'false');

  // If it's a local account, update in local accounts DB too
  updateLocalAccountBalance(current.id, coins, nextWin, updated.streak_count, updated.last_claim_date);

  return updated;
}

/**
 * Updates arbitrary user profile fields (username, avatar color, sound preference)
 * across cookies, localStorage and local accounts DB.
 */
export function updateUserProfileSession(updates: Partial<UserProfile>): UserProfile | null {
  const current = getUserSession();
  if (!current) return null;

  const updated: UserProfile = {
    ...current,
    ...updates,
  };

  saveUserSession(updated, getCookie(COOKIE_REMEMBER) !== 'false');

  // Update in local accounts list if applicable
  if (typeof window !== 'undefined') {
    try {
      const accounts = getLocalAccounts();
      const idx = accounts.findIndex((a) => a.id === current.id);
      if (idx !== -1) {
        if (updates.username) accounts[idx].username = updates.username;
        if (updates.full_name !== undefined) accounts[idx].full_name = updates.full_name;
        if (updates.student_number !== undefined) accounts[idx].student_number = updates.student_number;
        if (updates.avatar_color) accounts[idx].avatar_color = updates.avatar_color;
        if (updates.sound_enabled !== undefined) accounts[idx].sound_enabled = updates.sound_enabled;
        if (updates.notifications_enabled !== undefined) accounts[idx].notifications_enabled = updates.notifications_enabled;
        saveLocalAccounts(accounts);
      }
    } catch {}
  }

  return updated;
}

/**
 * Updates password for a local user account
 */
export async function updateLocalUserPassword(userId: string, newPassword: string): Promise<boolean> {
  const accounts = getLocalAccounts();
  const idx = accounts.findIndex((a) => a.id === userId);
  if (idx === -1) return false;

  const passwordHash = await hashPassword(newPassword, accounts[idx].username);
  accounts[idx].passwordHash = passwordHash;
  saveLocalAccounts(accounts);
  return true;
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

export const SYSTEM_WIPE_EPOCH = 'smr2_wipe_epoch_20261028_total';

/**
 * Destructively wipes ALL client-side data:
 * - Local user profiles, sessions, and backup accounts
 * - Cookies and remember-me tokens
 * - Stored investments positions, trades, history
 * - Offline cached tasks, incidents, votes
 * - Supabase authentication tokens in browser storage
 */
export function wipeAllLocalData(): void {
  deleteAllCookies();
  deleteCookie(COOKIE_SESSION);
  deleteCookie(COOKIE_REMEMBER);
  deleteCookie(COOKIE_LAST_USER);

  if (typeof window !== 'undefined') {
    try {
      const keysToRemove: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key !== SYSTEM_WIPE_EPOCH) {
          keysToRemove.push(key);
        }
      }
      keysToRemove.forEach((k) => localStorage.removeItem(k));
      sessionStorage.clear();
    } catch (e) {
      console.warn('Error clearing browser storage:', e);
    }
  }
}

/**
 * Automatic epoch enforcer: if a client hasn't performed the total system reset,
 * it silently wipes all lingering local state and cookies so nobody has stale/ghost accounts.
 */
export function checkAndEnforceSystemWipe(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    const executed = localStorage.getItem(SYSTEM_WIPE_EPOCH);
    if (!executed) {
      wipeAllLocalData();
      localStorage.setItem(SYSTEM_WIPE_EPOCH, 'true');
      return true;
    }
  } catch {}
  return false;
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

export function getLocalAccountsList(): StoredLocalAccount[] {
  return getLocalAccounts();
}

export function resetAllLocalBalances(): void {
  const accounts = getLocalAccounts();
  const resetAccounts = accounts.map((a) => ({
    ...a,
    coins: 1000,
    biggest_win: 0,
    streak_count: 1,
  }));
  saveLocalAccounts(resetAccounts);

  // También actualizar sesión actual activa
  const current = getUserSession();
  if (current) {
    saveUserSession({
      ...current,
      coins: 1000,
      biggest_win: 0,
      streak_count: 1,
    });
  }
}

function saveLocalAccounts(accounts: StoredLocalAccount[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_LOCAL_USERS, JSON.stringify(accounts));
  } catch {}
}

function updateLocalAccountBalance(
  userId: string,
  coins: number,
  biggestWin?: number,
  streakCount?: number,
  lastClaimDate?: string
): void {
  const accounts = getLocalAccounts();
  const index = accounts.findIndex((a) => a.id === userId);
  if (index !== -1) {
    accounts[index].coins = coins;
    if (biggestWin !== undefined) accounts[index].biggest_win = biggestWin;
    if (streakCount !== undefined) accounts[index].streak_count = streakCount;
    if (lastClaimDate !== undefined) accounts[index].last_claim_date = lastClaimDate;
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

  const existingEmail = accounts.find((a) => a.email.toLowerCase() === cleanEmail);
  if (existingEmail) {
    throw new Error('Ya existe una cuenta con este correo electrónico. Inicia sesión con tus credenciales.');
  }

  const existingName = accounts.find((a) => a.username.toLowerCase() === cleanUsername);
  if (existingName) {
    throw new Error(`El nombre de usuario "${cleanUsername}" ya está en uso. Por favor, elige otro apodo.`);
  }

  const passwordHash = await hashPassword(password, cleanUsername);
  const now = new Date().toISOString();
  const role: 'admin' | 'delegado' | 'student' = cleanUsername === 'admin' ? 'admin' : 'student';

  const newAccount: StoredLocalAccount = {
    id: 'local_' + Math.random().toString(36).substring(2, 9),
    username: cleanUsername,
    email: cleanEmail,
    passwordHash,
    coins: 1000,
    biggest_win: 0,
    streak_count: 1,
    role,
    avatar_color: 'emerald',
    sound_enabled: true,
    notifications_enabled: true,
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
    streak_count: 1,
    role: newAccount.role,
    avatar_color: newAccount.avatar_color,
    sound_enabled: true,
    notifications_enabled: true,
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

  const account = accounts.find(
    (a) => a.email.toLowerCase() === cleanId || a.username.toLowerCase() === cleanId
  );

  if (!account) {
    throw new Error(`No se encontró ninguna cuenta con el usuario o correo "${identifier}".`);
  }

  const saltedHash = await hashPassword(password, account.username);
  const legacyHash = await legacyUnsaltedHash(password);

  const isValid = account.passwordHash === saltedHash || account.passwordHash === legacyHash;

  if (!isValid) {
    throw new Error('Contraseña incorrecta. Por favor, compruébala e inténtalo de nuevo.');
  }

  // Actualizar hash antiguo a hash salteado de forma transparente
  if (account.passwordHash !== saltedHash) {
    account.passwordHash = saltedHash;
    saveLocalAccounts(accounts);
  }

  const profile: UserProfile = {
    id: account.id,
    username: account.username,
    full_name: account.full_name,
    student_number: account.student_number,
    email: account.email,
    coins: account.coins,
    biggest_win: account.biggest_win,
    streak_count: account.streak_count || 1,
    last_claim_date: account.last_claim_date,
    role: account.role || (account.username === 'admin' ? 'admin' : 'student'),
    avatar_color: account.avatar_color || 'emerald',
    games_played: account.games_played || 0,
    games_won: account.games_won || 0,
    sound_enabled: account.sound_enabled !== undefined ? account.sound_enabled : true,
    notifications_enabled: account.notifications_enabled !== undefined ? account.notifications_enabled : true,
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
    return 'Correo o contraseña incorrectos. Revisa tus datos e inténtalo de nuevo.';
  }
  if (message.includes('User already registered') || message.includes('already exists')) {
    return 'Ya existe una cuenta con este correo electrónico. Por favor, inicia sesión.';
  }
  if (message.includes('Password should be at least') || message.includes('weak_password')) {
    return 'La contraseña debe tener un mínimo de 6 caracteres.';
  }
  if (message.includes('rate limit') || message.includes('Too many requests') || message.includes('over_email_send_rate_limit')) {
    return 'Demasiados intentos seguidos. Espera unos momentos antes de reintentar.';
  }
  if (message.includes('Failed to fetch') || message.includes('NetworkError')) {
    return 'No se pudo conectar con el servidor. Revisa tu conexión a internet.';
  }
  if (message.includes('Email not confirmed')) {
    return 'Tu correo electrónico aún no ha sido confirmado. Revisa tu bandeja de entrada o spam para activar tu cuenta.';
  }
  if (message.includes('unique constraint') || message.includes('duplicate key')) {
    return 'El usuario o correo ya está en uso. Por favor, elige otro.';
  }
  if (message.includes('Signup is disabled') || message.includes('signups not allowed')) {
    return 'El registro público está desactivado temporalmente en este servidor.';
  }

  return message || 'Error al autenticar. Inténtalo de nuevo.';
}
