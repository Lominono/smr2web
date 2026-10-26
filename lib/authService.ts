import { UserProfile } from '@/lib/types';
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

export interface SignUpParams {
  username: string;
  email: string;
  password: string;
  confirmPassword?: string;
  rememberMe?: boolean;
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
        .maybeSingle();

      if (!error && data) {
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

  if (!params.password || params.password.length < 6) {
    throw new Error('La contraseña debe tener al menos 6 caracteres.');
  }

  if (params.confirmPassword !== undefined && params.password !== params.confirmPassword) {
    throw new Error('Las contraseñas no coinciden. Por favor, asegúrate de escribir la misma en ambos campos.');
  }

  const hasSupabase = isSupabaseConfigured();
  const supabase = createClient();

  // 2. Try Supabase if configured
  if (hasSupabase && supabase) {
    try {
      // Check username uniqueness in profiles before calling auth.signUp
      try {
        const { data: existingUser } = await supabase
          .from('profiles')
          .select('id')
          .ilike('username', cleanUsername)
          .maybeSingle();

        if (existingUser) {
          throw new Error(`El nombre de usuario "${cleanUsername}" ya está en uso. Por favor, elige otro.`);
        }
      } catch (checkErr: any) {
        if (checkErr.message?.includes('ya está en uso')) {
          throw checkErr;
        }
      }

      // Perform auth sign up
      const { data, error: signUpError } = await supabase.auth.signUp({
        email: cleanEmail,
        password: params.password,
        options: {
          data: {
            username: cleanUsername,
          },
        },
      });

      if (signUpError) {
        throw signUpError;
      }

      // Check Supabase silent duplicate check (identities array empty)
      if (data.user && Array.isArray(data.user.identities) && data.user.identities.length === 0) {
        throw new Error('Ya existe una cuenta con este correo electrónico. Por favor, inicia sesión.');
      }

      if (data.user) {
        const role: 'admin' | 'delegado' | 'student' = cleanUsername === 'admin' ? 'admin' : 'student';

        // Upsert profile in Supabase
        try {
          await supabase.from('profiles').upsert(
            [
              {
                id: data.user.id,
                username: cleanUsername,
                email: cleanEmail,
                coins: 1000,
                biggest_win: 0,
                streak_count: 1,
                role,
              },
            ],
            { onConflict: 'id' }
          );
        } catch (upErr) {
          console.warn('Profile upsert note:', upErr);
        }

        const profile: UserProfile = {
          id: data.user.id,
          username: cleanUsername,
          email: data.user.email || cleanEmail,
          coins: 1000,
          biggest_win: 0,
          streak_count: 1,
          role,
          created_at: new Date().toISOString(),
          auth_provider: 'supabase',
        };

        // Iniciar sesión automáticamente sin esperar confirmación de correo
        if (!data.session) {
          try {
            await supabase.auth.signInWithPassword({
              email: cleanEmail,
              password: params.password,
            });
          } catch {}
        }

        // Full session active inmediatamente
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
      console.warn('Supabase sign-up error, falling back to local storage:', supErr);
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

  const hasSupabase = isSupabaseConfigured();
  const supabase = createClient();

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

        if (signInError) {
          if (
            signInError.message.includes('Invalid login credentials') ||
            signInError.message.includes('invalid_grant')
          ) {
            throw new Error('Correo o contraseña incorrectos. Por favor, compruébalos e inténtalo de nuevo.');
          }
          if (signInError.message.includes('Email not confirmed')) {
            throw new Error(
              'Tu correo electrónico aún no ha sido confirmado. Revisa tu bandeja de entrada o spam para activar tu cuenta.'
            );
          }
          throw signInError;
        }

        if (data.user) {
          // Fetch existing profile data
          const { data: profileData } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', data.user.id)
            .maybeSingle();

          const username =
            profileData?.username ||
            data.user.user_metadata?.username ||
            data.user.email?.split('@')[0] ||
            cleanIdentifier;

          const role =
            profileData?.role ||
            (username === 'admin' ? 'admin' : 'student');

          const profile: UserProfile = {
            id: data.user.id,
            username,
            email: data.user.email || targetEmail,
            coins: Number(profileData?.coins ?? 1000),
            biggest_win: Number(profileData?.biggest_win ?? 0),
            streak_count: profileData?.streak_count ? Number(profileData.streak_count) : 1,
            last_claim_date: profileData?.last_claim_date || undefined,
            role,
            created_at: profileData?.created_at,
            auth_provider: 'supabase',
          };

          saveUserSession(profile, rememberMe);
          return { success: true, user: profile };
        }
      } catch (supErr: any) {
        if (
          supErr?.message?.includes('Correo o contraseña incorrectos') ||
          supErr?.message?.includes('no ha sido confirmado')
        ) {
          throw supErr;
        }
        console.warn('Supabase sign-in warning:', supErr);
      }
    }
  }

  // Fallback to local accounts
  try {
    const localProfile = await loginLocalUser(cleanIdentifier, password, rememberMe);
    return { success: true, user: localProfile };
  } catch (localErr: any) {
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

      if (excludeUserId) {
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

  // 2. Direct Supabase update as well if configured
  const hasSupabase = isSupabaseConfigured();
  const supabase = createClient();
  if (hasSupabase && supabase) {
    try {
      await supabase
        .from('profiles')
        .update({
          full_name: cleanName,
          student_number: cleanNumber,
        })
        .eq('id', userId);
    } catch {}
  }

  // 3. Guaranteed session update
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
  };
  saveUserSession(guaranteedUser, true);

  return { success: true, user: guaranteedUser };
}
