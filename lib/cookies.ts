/**
 * Cookie management utilities for SMR2
 * Provides secure, persistent local cookie storage for browser and SSR compatibility.
 */

export interface CookieOptions {
  days?: number;
  path?: string;
  sameSite?: 'Lax' | 'Strict' | 'None';
  secure?: boolean;
}

/**
 * Sets a cookie in document.cookie with default 365-day persistence
 */
export function setCookie(name: string, value: string, options: CookieOptions = {}): void {
  if (typeof document === 'undefined') return;

  const {
    days = 365,
    path = '/',
    sameSite = 'Lax',
    secure = typeof window !== 'undefined' && window.location.protocol === 'https:',
  } = options;

  let cookieString = `${encodeURIComponent(name)}=${encodeURIComponent(value)}; path=${path}; SameSite=${sameSite}`;

  if (days > 0) {
    const maxAge = days * 24 * 60 * 60;
    const expires = new Date(Date.now() + days * 864e5).toUTCString();
    cookieString += `; max-age=${maxAge}; expires=${expires}`;
  }

  if (secure) {
    cookieString += '; Secure';
  }

  document.cookie = cookieString;
}

/**
 * Retrieves a cookie value by name from document.cookie
 */
export function getCookie(name: string): string | null {
  if (typeof document === 'undefined') return null;

  const encodedName = encodeURIComponent(name);
  const cookies = document.cookie ? document.cookie.split('; ') : [];

  for (const cookie of cookies) {
    const [key, ...valParts] = cookie.split('=');
    if (key === encodedName) {
      try {
        return decodeURIComponent(valParts.join('='));
      } catch {
        return valParts.join('=');
      }
    }
  }

  return null;
}

/**
 * Deletes a cookie by name by setting max-age to 0 and expiration in the past
 */
export function deleteCookie(name: string, path: string = '/'): void {
  if (typeof document === 'undefined') return;

  document.cookie = `${encodeURIComponent(name)}=; path=${path}; max-age=0; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax`;
}

/**
 * Serializes and stores a JSON object in a cookie
 */
export function setJsonCookie<T>(name: string, value: T, options?: CookieOptions): void {
  try {
    const jsonStr = JSON.stringify(value);
    setCookie(name, jsonStr, options);
  } catch (err) {
    console.warn(`Error setting JSON cookie "${name}":`, err);
  }
}

/**
 * Retrieves and deserializes a JSON object from a cookie
 */
export function getJsonCookie<T>(name: string): T | null {
  try {
    const val = getCookie(name);
    if (!val) return null;
    return JSON.parse(val) as T;
  } catch (err) {
    console.warn(`Error parsing JSON cookie "${name}":`, err);
    return null;
  }
}
