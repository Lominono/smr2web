import { UserProfile } from '@/lib/types';
import { isUUID } from '@/lib/uuid';
import { createClient, isSupabaseConfigured } from '@/lib/supabase/client';
import {
  saveUserSession,
  getUserSession,
  clearUserSession,
  registerLocalUser,
  loginLocalUser,
  translateAuthError,
  updateUserProfileSession,
} from '@/lib/authSession';
import {
  validatePasswordSecurity,
  checkLoginLockout,
  recordFailedLoginAttempt,
  resetFailedLoginAttempts,
} from '@/lib/passwordSecurity';

export interface SignUpParams {
  username: string;
  email: string;
  password: string;
  confirmPassword?: string;
  fullName?: string;
  studentNumber?: string;
  rememberMe?: boolean;
  acceptedTerms?: boolean;
}

export interface SignInParams {
  identifier: string;
  password: string;
  rememberMe?: boolean;
}

export interface AuthResult {
  success: boolean;
  user?: UserProfile;
  requiresEmailConfirmation?: boolean;
  confirmationEmail?: string;
  message?: string;
  error?: string;
}

/**
 * Validates a username string
 */
export function validateUsername(username: string): { valid: boolean; error?: string } {
  const clean = username.trim().toLowerCase().replace(/\s+/g, '_');
  if (clean.length < 3) {
    return { valid: false, error: 'El nombre de usuario debe tener al menos 3 caracteres.' };
  }
  if (clean.length > 20) {
    return { valid: false, error: 'El nombre de usuario no puede tener más de 20 caracteres.' };
  }
  if (!/^[a-z0-9_]+$/.test(clean)) {
    return {
      valid: false,
      error: 'El usuario solo puede contener letras (a-z), números (0-9) y guiones bajos (_).',
    };
  }
  return { valid: true };
}

/**
 * Validates an email address
 */
export function validateEmail(email: string): { valid: boolean; error?: string } {
  const clean = email.trim().toLowerCase();
  if (!clean || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(clean)) {
    return { valid: false, error: 'Por favor, introduce un correo electrónico válido (ej: alumno@ejemplo.com).' };
  }
  return { valid: true };
}

/**
 * Check whether a username is already taken in Supabase (or locally)
 */
export async function checkUsernameAvailability(
  username: string
): Promise<{ available: boolean; message?: string }> {
  const clean = username.trim().toLowerCase().replace(/\s+/g, '_');
  const validation = validateUsername(clean);
  if (!validation.valid) {
    return { available: false, message: validation.error };
  }

  const hasSupabase = isSupabaseConfigured();
  const supabase = createClient();

  if (hasSupabase && supabase) {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id')
        .ilike('username', clean)
        .limit(1);

      if (!error && data && data.length > 0) {
        return { available: false, message: `El apodo "${clean}" ya está ocupado.` };
      }
    } catch {
      // Ignore network errors in preview check
    }
  }

  return { available: true, message: `"${clean}" está disponible` };
}

/**
 * Registers a new account, seamlessly handling Supabase, email confirmations, and offline/local fallback.
 */
export async function registerAccount(params: SignUpParams): Promise<AuthResult> {
  const cleanUsername = params.username.trim().toLowerCase().replace(/\s+/g, '_');
  const cleanEmail = params.email.trim().toLowerCase();
  const rememberMe = params.rememberMe ?? true;

  // 1. Validation
  const userValid = validateUsername(cleanUsername);
  if (!userValid.valid) throw new Error(userValid.error);

  const emailValid = validateEmail(cleanEmail);
  if (!emailValid.valid) throw new Error(emailValid.error);

  // 1.2 Validación estricta de seguridad de contraseñas
  const passCheck = validatePasswordSecurity(params.password, cleanUsername, cleanEmail);
  if (!passCheck.valid) {
    throw new Error(passCheck.errors[0] || 'La contraseña no cumple los requisitos de seguridad.');
  }

  if (params.confirmPassword !== undefined && params.password !== params.confirmPassword) {
    throw new Error('Las contraseñas no coinciden. Por favor, asegúrate de escribir la misma en ambos campos.');
  }

  // 2. Registro a través del servidor para activar la cuenta sin enviar correo de confirmación
  let serverProfile: UserProfile | null = null;
  let serverSession: any = null;
  try {
    const regRes = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: cleanUsername,
        email: cleanEmail,
        password: params.password,
        fullName: params.fullName,
        studentNumber: params.studentNumber,
      }),
    });

    const regData = await regRes.json().catch(() => ({}));
    if (!regRes.ok || !regData.success) {
      throw new Error(regData.error || 'Error al crear la cuenta en el servidor.');
    }

    if (regData.user) {
      serverProfile = regData.user;
      serverSession = regData.session;
    }
  } catch (apiErr: any) {
    if (
      apiErr.message &&
      !apiErr.message.includes('Failed to fetch') &&
      !apiErr.message.includes('NetworkError')
    ) {
      throw apiErr;
    }
    console.warn('Registro por servidor no disponible, intentando alternativa directa:', apiErr);
  }

  const hasSupabase = isSupabaseConfigured();
  const supabase = createClient();

  if (serverProfile) {
    // Iniciar sesión inmediatamente en el cliente Supabase para obtener token de sesión
    if (hasSupabase && supabase) {
      if (serverSession?.access_token && serverSession?.refresh_token) {
        try {
          await supabase.auth.setSession({
            access_token: serverSession.access_token,
            refresh_token: serverSession.refresh_token,
          });
        } catch {}
      } else {
        try {
          await supabase.auth.signInWithPassword({
            email: cleanEmail,
            password: params.password,
          });
        } catch {}
      }
    }

    saveUserSession(serverProfile, true);
    return {
      success: true,
      requiresEmailConfirmation: false,
      user: serverProfile,
    };
  }

  // 3. Fallback directo si la API no estuviera disponible
  if (hasSupabase && supabase) {
    try {
      const { data, error: signUpError } = await supabase.auth.signUp({
        email: cleanEmail,
        password: params.password,
        options: {
          data: {
            username: cleanUsername,
            accepted_terms: true,
            accepted_terms_at: new Date().toISOString(),
          },
        },
      });

      if (signUpError) throw signUpError;

      if (data.user) {
        // Asegurar que el perfil quede guardado en la tabla profiles de Supabase
        try {
          await supabase.from('profiles').upsert(
            {
              id: data.user.id,
              username: cleanUsername,
              email: data.user.email || cleanEmail,
              coins: 1000,
              biggest_win: 0,
              streak_count: 1,
              role: 'student',
              created_at: new Date().toISOString(),
            },
            { onConflict: 'id' }
          );
        } catch (dbErr) {
          console.warn('Upsert en profiles directo falló:', dbErr);
        }

        const profile: UserProfile = {
          id: data.user.id,
          username: cleanUsername,
          email: data.user.email || cleanEmail,
          coins: 1000,
          biggest_win: 0,
          streak_count: 1,
          role: 'student',
          created_at: new Date().toISOString(),
          auth_provider: 'supabase',
        };

        saveUserSession(profile, rememberMe);
        return {
          success: true,
          requiresEmailConfirmation: false,
          user: profile,
        };
      }
    } catch (supErr: any) {
      if (
        supErr?.message?.includes('ya está en uso') ||
        supErr?.message?.includes('already registered') ||
        supErr?.message?.includes('already exists')
      ) {
        throw supErr;
      }
      console.warn('Supabase sign-up fallback error:', supErr);
    }
  }

  // 3. Local fallback registration
  const localProfile = await registerLocalUser(cleanUsername, cleanEmail, params.password, rememberMe);
  return {
    success: true,
    requiresEmailConfirmation: false,
    user: localProfile,
  };
}

/**
 * Authenticates user by email OR username, handling both Supabase and Local fallback flawlessly.
 */
export async function loginAccount(params: SignInParams): Promise<AuthResult> {
  const cleanIdentifier = params.identifier.trim();
  const password = params.password;
  const rememberMe = params.rememberMe ?? true;

  if (!cleanIdentifier) {
    throw new Error('Por favor, introduce tu correo electrónico o nombre de usuario.');
  }

  if (!password) {
    throw new Error('Por favor, introduce tu contraseña.');
  }

  // Comprobar bloqueo temporal por intentos fallidos de fuerza bruta
  const lockout = checkLoginLockout();
  if (lockout.locked) {
    throw new Error(
      `Demasiados intentos fallidos seguidos. Por seguridad, la cuenta está bloqueada temporalmente durante ${lockout.remainingSeconds} segundos.`
    );
  }

  const hasSupabase = isSupabaseConfigured();
  const supabase = createClient();

  // 1. Intentar inicio de sesión autoritativo en el servidor con conexión directa a la base de datos Supabase
  try {
    const loginRes = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ identifier: cleanIdentifier, password }),
    });

    const loginData = await loginRes.json().catch(() => ({}));

    if (loginRes.ok && loginData.success && loginData.user) {
      // Sincronizar también la sesión en el cliente Supabase del navegador para que Realtime y Auth persistan
      if (hasSupabase && supabase) {
        if (loginData.session?.access_token && loginData.session?.refresh_token) {
          try {
            await supabase.auth.setSession({
              access_token: loginData.session.access_token,
              refresh_token: loginData.session.refresh_token,
            });
          } catch {}
        } else if (loginData.targetEmail) {
          try {
            await supabase.auth.signInWithPassword({
              email: loginData.targetEmail,
              password,
            });
          } catch {}
        }
      }

      // Recordar SIEMPRE la sesión de forma permanente
      saveUserSession(loginData.user, true);
      resetFailedLoginAttempts();
      return { success: true, user: loginData.user };
    }

    if (!loginRes.ok) {
      if (loginRes.status === 401 || loginRes.status === 404) {
        const fail = recordFailedLoginAttempt();
        if (fail.locked) {
          throw new Error('Límite de 5 intentos fallidos alcanzado. Por seguridad, la cuenta está bloqueada temporalmente durante 30 segundos.');
        }
      }
      throw new Error(loginData.error || 'Correo o contraseña incorrectos. Por favor, compruébalos e inténtalo de nuevo.');
    }
  } catch (apiErr: any) {
    if (
      apiErr.message &&
      !apiErr.message.includes('Failed to fetch') &&
      !apiErr.message.includes('NetworkError')
    ) {
      throw apiErr;
    }
    console.warn('API /api/auth/login no disponible, intentando cliente directo:', apiErr);
  }

  if (hasSupabase && supabase) {
    let targetEmail: string | null = cleanIdentifier.includes('@') ? cleanIdentifier.toLowerCase() : null;

    // If identifier is a username, query Supabase profiles to get the associated email
    if (!targetEmail) {
      try {
        const { data: pData } = await supabase
          .from('profiles')
          .select('email, username')
          .ilike('username', cleanIdentifier.toLowerCase())
          .maybeSingle();

        if (pData?.email) {
          targetEmail = pData.email;
        }
      } catch (err) {
        console.warn('Username lookup in profiles warning:', err);
      }
    }

    if (targetEmail && targetEmail.includes('@')) {
      try {
        const { data, error: signInError } = await supabase.auth.signInWithPassword({
          email: targetEmail,
          password,
        });

        let activeSessionUser = data.user;

        if (signInError) {
          if (signInError.message.includes('Email not confirmed')) {
            // Auto-confirmar la cuenta en el servidor al vuelo sin pedir confirmación de correo
            try {
              const confRes = await fetch('/api/auth/confirm-legacy', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: targetEmail }),
              });
              const confData = await confRes.json();
              if (confData?.confirmed) {
                const retry = await supabase.auth.signInWithPassword({
                  email: targetEmail,
                  password,
                });
                if (!retry.error && retry.data.user) {
                  activeSessionUser = retry.data.user;
                }
              }
            } catch {}
          }

          if (!activeSessionUser) {
            if (
              signInError.message.includes('Invalid login credentials') ||
              signInError.message.includes('invalid_grant')
            ) {
              throw new Error('Correo o contraseña incorrectos. Por favor, compruébalos e inténtalo de nuevo.');
            }
            throw signInError;
          }
        }

        if (activeSessionUser) {
          // Fetch existing profile data (server endpoint + Supabase client)
          let profileData: any = null;
          try {
            const profRes = await fetch(`/api/user/profile?id=${encodeURIComponent(activeSessionUser.id)}`);
            if (profRes.ok) {
              const profJson = await profRes.json();
              if (profJson?.success && profJson?.user) {
                profileData = profJson.user;
              }
            }
          } catch {}

          if (!profileData || !profileData.student_number) {
            try {
              const { data: dbData } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', activeSessionUser.id)
                .maybeSingle();
              if (dbData) {
                profileData = { ...profileData, ...dbData };
              }
            } catch {}
          }

          const username =
            profileData?.username ||
            (profileData?.nombre ? String(profileData.nombre).toLowerCase().replace(/\s+/g, '_') : null) ||
            activeSessionUser.user_metadata?.username ||
            activeSessionUser.email?.split('@')[0] ||
            cleanIdentifier;

          const role: 'admin' | 'delegado' | 'student' =
            profileData?.rol === 'admin' || profileData?.role === 'admin'
              ? 'admin'
              : (profileData?.rol === 'delegado' || profileData?.role === 'delegado' ? 'delegado' : 'student');

          const profile: UserProfile = {
            id: activeSessionUser.id,
            username,
            full_name: profileData?.full_name || profileData?.nombre || undefined,
            student_number: profileData?.student_number || undefined,
            pc_seat: profileData?.pc_seat || undefined,
            avatar_color: profileData?.avatar_color || 'emerald',
            email: activeSessionUser.email || targetEmail,
            coins: Number(profileData?.coins ?? profileData?.puntos_total ?? 1000),
            biggest_win: Number(profileData?.biggest_win ?? 0),
            streak_count: Number(profileData?.streak_count ?? profileData?.racha_actual ?? 1),
            games_played: Number(profileData?.games_played ?? 0),
            games_won: Number(profileData?.games_won ?? 0),
            sound_enabled: profileData?.sound_enabled ?? true,
            notifications_enabled: profileData?.notifications_enabled ?? true,
            last_claim_date: profileData?.last_claim_date || undefined,
            role,
            created_at: profileData?.created_at,
            auth_provider: 'supabase',
          };

          saveUserSession(profile, rememberMe);
          resetFailedLoginAttempts();
          return { success: true, user: profile };
        }
      } catch (supErr: any) {
        if (
          supErr?.message?.includes('Correo o contraseña incorrectos') ||
          supErr?.message?.includes('no ha sido confirmado')
        ) {
          const fail = recordFailedLoginAttempt();
          if (fail.locked) {
            throw new Error(
              'Límite de 5 intentos fallidos alcanzado. Por seguridad, la cuenta está bloqueada temporalmente durante 30 segundos.'
            );
          }
          if (fail.attemptsLeft <= 2) {
            throw new Error(
              `Correo o contraseña incorrectos. Te quedan ${fail.attemptsLeft} intentos antes del bloqueo temporal.`
            );
          }
          throw supErr;
        }
        console.warn('Supabase sign-in warning:', supErr);
      }
    }
  }

  // Fallback to local accounts
  try {
    const localProfile = await loginLocalUser(cleanIdentifier, password, rememberMe);
    resetFailedLoginAttempts();
    return { success: true, user: localProfile };
  } catch (localErr: any) {
    const fail = recordFailedLoginAttempt();
    if (fail.locked) {
      throw new Error(
        'Límite de 5 intentos fallidos alcanzado. Por seguridad, la cuenta está bloqueada temporalmente durante 30 segundos.'
      );
    }
    if (fail.attemptsLeft <= 2) {
      throw new Error(
        `Contraseña incorrecta. Te quedan ${fail.attemptsLeft} intentos antes del bloqueo temporal.`
      );
    }
    if (hasSupabase && cleanIdentifier.includes('@')) {
      throw new Error('Correo o contraseña incorrectos. Por favor, compruébalos e inténtalo de nuevo.');
    }
    throw localErr;
  }
}

/**
 * Signs the user out completely from both Supabase and local session
 */
export async function logoutAccount(): Promise<void> {
  // Marcar explícitamente que el usuario cerró sesión voluntariamente
  try {
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('smr2_manual_logout', 'true');
    }
  } catch {}

  clearUserSession();
  const supabase = createClient();
  if (supabase) {
    try {
      await supabase.auth.signOut();
    } catch {}
  }
}

/**
 * Checks whether a student number is available (not already registered by another student)
 */
export async function checkStudentNumberAvailability(
  studentNumber: string,
  excludeUserId?: string
): Promise<{ available: boolean; message?: string }> {
  const clean = studentNumber.trim().toUpperCase();
  if (clean.length < 2) {
    return { available: false, message: 'El número de estudiante debe tener al menos 2 caracteres.' };
  }

  // 1. Check via API endpoint
  try {
    const url = `/api/user/identify?number=${encodeURIComponent(clean)}${
      excludeUserId ? `&userId=${encodeURIComponent(excludeUserId)}` : ''
    }`;
    const res = await fetch(url);
    const data = await res.json();
    return data;
  } catch {}

  // 2. Direct Supabase check
  const hasSupabase = isSupabaseConfigured();
  const supabase = createClient();
  if (hasSupabase && supabase) {
    try {
      let query = supabase
        .from('profiles')
        .select('id')
        .eq('student_number', clean);

      if (excludeUserId && isUUID(excludeUserId)) {
        query = query.neq('id', excludeUserId);
      }

      const { data, error } = await query.maybeSingle();

      if (!error && data) {
        return {
          available: false,
          message: `El número "${clean}" ya pertenece a otro estudiante. Cada alumno debe tener su propio número.`,
        };
      }
    } catch {}
  }

  // 3. Local fallback check
  if (typeof window !== 'undefined') {
    try {
      const stored = localStorage.getItem('smr2_local_db_users');
      if (stored) {
        const accounts: any[] = JSON.parse(stored);
        const match = accounts.find(
          (a) => a.student_number?.toUpperCase() === clean && a.id !== excludeUserId
        );
        if (match) {
          return {
            available: false,
            message: `El número "${clean}" ya pertenece a otro estudiante.`,
          };
        }
      }
    } catch {}
  }

  return { available: true, message: 'Número de estudiante disponible' };
}

/**
 * Saves real name and unique student number for user identification
 */
export async function saveStudentIdentification(
  userId: string,
  fullName: string,
  studentNumber: string
): Promise<{ success: boolean; user?: UserProfile; error?: string }> {
  const cleanName = fullName.trim().replace(/\s+/g, ' ');
  const cleanNumber = studentNumber.trim().toUpperCase();

  if (cleanName.length < 3) {
    return { success: false, error: 'Por favor, introduce tu nombre y apellidos reales (mínimo 3 caracteres).' };
  }
  if (cleanNumber.length < 2) {
    return { success: false, error: 'Por favor, introduce tu número de estudiante o NIA (mínimo 2 caracteres).' };
  }

  // 1. Try server API route
  try {
    const res = await fetch('/api/user/identify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId,
        fullName: cleanName,
        studentNumber: cleanNumber,
      }),
    });

    const data = await res.json();
    if (!res.ok || !data.success) {
      if (res.status === 409 || data.error?.includes('en uso') || data.error?.includes('pertenece')) {
        return { success: false, error: data.error };
      }
      console.warn('API returned non-fatal note, proceeding with session sync:', data.error);
    }
  } catch (err: any) {
    console.warn('Network note calling /api/user/identify:', err);
  }

  // 2. Direct Supabase update as well if configured (only for Supabase UUID accounts)
  const hasSupabase = isSupabaseConfigured();
  const supabase = createClient();
  if (hasSupabase && supabase && isUUID(userId)) {
    try {
      await supabase
        .from('profiles')
        .update({
          full_name: cleanName,
          student_number: cleanNumber,
          onboarding_completado: true,
        })
        .eq('id', userId);
    } catch {}
  }

  // 3. Guaranteed session and local storage update
  const current = getUserSession();
  const guaranteedUser: UserProfile = {
    id: userId,
    username: current?.username || 'estudiante',
    coins: current?.coins ?? 1000,
    biggest_win: current?.biggest_win ?? 0,
    role: current?.role || 'student',
    streak_count: current?.streak_count ?? 1,
    ...current,
    full_name: cleanName,
    student_number: cleanNumber,
    onboarding_completado: true,
  };
  saveUserSession(guaranteedUser, true);

  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem('smr2_student_id_completed', 'true');
      localStorage.setItem('smr2_student_id_dismissed', 'true');
      const stored = localStorage.getItem('smr2_local_db_users');
      if (stored) {
        const accounts: any[] = JSON.parse(stored);
        const idx = accounts.findIndex(
          (a) => a.id === userId || a.username?.toLowerCase() === current?.username?.toLowerCase()
        );
        if (idx >= 0) {
          accounts[idx].full_name = cleanName;
          accounts[idx].student_number = cleanNumber;
          localStorage.setItem('smr2_local_db_users', JSON.stringify(accounts));
        }
      }
    } catch {}
  }

  return { success: true, user: guaranteedUser };
}
