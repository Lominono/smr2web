import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient, isServerSupabaseConfigured } from '@/lib/supabase/server';
import { UserProfile } from '@/lib/types';
import { signUserSessionToken, COOKIE_SESSION_TOKEN } from '@/lib/adminAuth';
import { validatePasswordSecurity } from '@/lib/passwordSecurity';
import { enforceRateLimit, fail, guardOrigin, getClientIp, json, readJsonBody } from '@/lib/security/http';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const originError = guardOrigin(req);
  if (originError) return originError;

  try {
    const ip = getClientIp(req);
    const rate = enforceRateLimit(`register:${ip}`, { limit: 8, windowMs: 15 * 60_000 });
    if (!rate.ok) return rate.response;

    const body = (await readJsonBody(req)) || {};
    const username = String(body.username || '').trim().toLowerCase().replace(/[-\s]+/g, '_');
    const email = String(body.email || '').trim().toLowerCase();
    const password = String(body.password || '');
    const rawFullName = String(body.fullName || '').trim().replace(/\s+/g, ' ');
    const rawStudentNumber = String(body.studentNumber || '').trim().toUpperCase();

    const fullName = rawFullName.length >= 3 ? rawFullName.slice(0, 80) : null;
    const studentNumber = rawStudentNumber.length >= 2 ? rawStudentNumber.slice(0, 20) : null;
    const hasStudentId = Boolean(fullName && studentNumber);

    if (!username || !email || !password) {
      return NextResponse.json(
        { success: false, error: 'Por favor, rellena todos los campos obligatorios.' },
        { status: 400 }
      );
    }

    if (password.length > 200 || username.length > 40 || email.length > 254) {
      return NextResponse.json(
        { success: false, error: 'Los datos introducidos superan la longitud permitida.' },
        { status: 400 }
      );
    }

    // Validación de usuario
    if (username.length < 3 || username.length > 20) {
      return NextResponse.json(
        { success: false, error: 'El nombre de usuario debe tener entre 3 y 20 caracteres.' },
        { status: 400 }
      );
    }

    if (!/^[a-z0-9_]+$/.test(username)) {
      return NextResponse.json(
        { success: false, error: 'El nombre de usuario solo puede contener letras, números y guiones bajos (_).' },
        { status: 400 }
      );
    }

    // Validación de email
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json(
        { success: false, error: 'Por favor, introduce una dirección de correo electrónico válida.' },
        { status: 400 }
      );
    }

    // Validación de contraseña: política de complejidad del servidor
    const passCheck = validatePasswordSecurity(password, username, email);
    if (!passCheck.valid) {
      return NextResponse.json(
        { success: false, error: passCheck.errors[0] || 'La contraseña no cumple los requisitos de seguridad.' },
        { status: 400 }
      );
    }

    if (!isServerSupabaseConfigured()) {
      return NextResponse.json(
        { success: false, error: 'Supabase no está configurado en el servidor.' },
        { status: 503 }
      );
    }

    const adminClient = createAdminClient();
    if (!adminClient) {
      return NextResponse.json(
        { success: false, error: 'No se pudo conectar con la base de datos.' },
        { status: 500 }
      );
    }

    // 1. Comprobar si el nombre de usuario o email ya existe en perfiles
    try {
      // SEGURIDAD: se neutralizan comas/paréntesis para que ninguno de los dos
      // campos pueda alterar la estructura del filtro PostgREST (.or inyectable).
      const safeUsername = String(username).replace(/[,\(\)%]/g, '').slice(0, 60);
      const safeEmail = String(email).replace(/[,\(\)%]/g, '').slice(0, 254);
      const { data: existingProfiles } = await adminClient
        .from('profiles')
        .select('id, username, email')
        .or(`username.ilike.${safeUsername},email.ilike.${safeEmail}`);

      if (existingProfiles && existingProfiles.length > 0) {
        for (const p of existingProfiles) {
          if (p.username?.toLowerCase() === username) {
            return NextResponse.json(
              { success: false, error: `El nombre de usuario "${username}" ya está ocupado. Elige otro.` },
              { status: 409 }
            );
          }
          if (p.email?.toLowerCase() === email) {
            return NextResponse.json(
              { success: false, error: 'Ya existe una cuenta con este correo electrónico. Inicia sesión directamente.' },
              { status: 409 }
            );
          }
        }
      }
    } catch (checkErr) {
      console.warn('Error comprobando perfiles existentes:', checkErr);
    }

    // 1.1 El número de estudiante es único por alumno (no puede repetirse)
    if (studentNumber) {
      try {
        const { data: existingNumber } = await adminClient
          .from('profiles')
          .select('id')
          .eq('student_number', studentNumber)
          .maybeSingle();

        if (existingNumber) {
          return NextResponse.json(
            {
              success: false,
              error: `El número de estudiante "${studentNumber}" ya pertenece a otro alumno. Cada estudiante debe tener el suyo.`,
            },
            { status: 409 }
          );
        }
      } catch (numberErr) {
        console.warn('Error comprobando número de estudiante:', numberErr);
      }
    }

    // 2. Crear usuario en Supabase Auth
    let userId: string | null = null;
    let authErrorMsg: string | null = null;

    // Intentar primero con auth.admin.createUser (si hay service role)
    try {
      const { data: authData, error: adminAuthError } = await adminClient.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: {
          username,
          accepted_terms: true,
          accepted_terms_at: new Date().toISOString(),
        },
      });

      if (!adminAuthError && authData?.user) {
        userId = authData.user.id;
      } else if (adminAuthError) {
        authErrorMsg = adminAuthError.message;
      }
    } catch (e: any) {
      authErrorMsg = e?.message;
    }

    // Fallback con signUp estándar de Supabase
    if (!userId) {
      try {
        const { data: signUpData, error: signUpError } = await adminClient.auth.signUp({
          email,
          password,
          options: {
            data: {
              username,
              accepted_terms: true,
              accepted_terms_at: new Date().toISOString(),
            },
          },
        });

        if (signUpError) {
          if (
            signUpError.message.includes('already registered') ||
            signUpError.message.includes('already exists')
          ) {
            return NextResponse.json(
              { success: false, error: 'Ya existe una cuenta con este correo electrónico. Inicia sesión directamente.' },
              { status: 409 }
            );
          }
          return NextResponse.json(
            { success: false, error: signUpError.message },
            { status: 400 }
          );
        }

        if (signUpData?.user) {
          // Si el correo ya existía, Supabase devuelve identities vacío
          if (signUpData.user.identities && signUpData.user.identities.length === 0) {
            return NextResponse.json(
              { success: false, error: 'Ya existe una cuenta con este correo electrónico. Inicia sesión directamente.' },
              { status: 409 }
            );
          }
          userId = signUpData.user.id;
        }
      } catch (e: any) {
        return NextResponse.json(
          { success: false, error: e?.message || authErrorMsg || 'Error al crear la cuenta en Supabase.' },
          { status: 400 }
        );
      }
    }

    if (!userId) {
      if (
        authErrorMsg?.includes('already registered') ||
        authErrorMsg?.includes('already exists')
      ) {
        return NextResponse.json(
          { success: false, error: 'Ya existe una cuenta con este correo electrónico. Inicia sesión directamente.' },
          { status: 409 }
        );
      }
      return NextResponse.json(
        { success: false, error: authErrorMsg || 'No se pudo crear el usuario en Supabase.' },
        { status: 400 }
      );
    }

    // 3. Asegurar el perfil del alumno en la tabla public.profiles de Supabase
    try {
      await adminClient.from('profiles').upsert(
        {
          id: userId,
          username,
          nombre: fullName || username,
          full_name: fullName || null,
          student_number: studentNumber || null,
          email,
          coins: 1000,
          biggest_win: 0,
          streak_count: 1,
          role: 'student',
          rol: 'alumno',
          avatar_color: 'emerald',
          onboarding_completado: hasStudentId,
          created_at: new Date().toISOString(),
        },
        { onConflict: 'id' }
      );
    } catch (profileErr) {
      console.warn('Error al insertar perfil en Supabase:', profileErr);
    }

    // 4. Iniciar sesión automáticamente en el servidor para generar tokens y sesión
    let sessionData: any = null;
    try {
      const { data: signData } = await adminClient.auth.signInWithPassword({
        email,
        password,
      });
      if (signData?.session) {
        sessionData = signData.session;
      }
    } catch (loginErr) {
      console.warn('Auto-login post registro error:', loginErr);
    }

    const userProfile: UserProfile = {
      id: userId,
      username,
      full_name: fullName || undefined,
      student_number: studentNumber || undefined,
      email,
      coins: 1000,
      biggest_win: 0,
      streak_count: 1,
      role: 'student',
      avatar_color: 'emerald',
      games_played: 0,
      games_won: 0,
      sound_enabled: true,
      notifications_enabled: true,
      created_at: new Date().toISOString(),
      auth_provider: 'supabase',
      onboarding_completado: hasStudentId,
    };

    const response = NextResponse.json({
      success: true,
      user: userProfile,
      session: sessionData,
    });

    // Guardar cookies de sesión permanente de 2 años
    const cookieOptions = {
      path: '/',
      sameSite: 'lax' as const,
      maxAge: 60 * 60 * 24 * 730,
      secure: process.env.NODE_ENV === 'production',
    };

    response.cookies.set('smr2_user_session', JSON.stringify(userProfile), cookieOptions);
    response.cookies.set('smr2_remember_me', 'true', cookieOptions);
    response.cookies.set('smr2_last_user', email, cookieOptions);

    // Token criptográfico HttpOnly inviolable firmado por el servidor
    try {
      const userSessionToken = signUserSessionToken({
        userId: userProfile.id,
        username: userProfile.username,
        role: userProfile.role as 'student' | 'delegado' | 'admin',
      });
      response.cookies.set(COOKIE_SESSION_TOKEN, userSessionToken, {
        ...cookieOptions,
        httpOnly: true,
      });
    } catch (err) {
      console.warn('No se pudo firmar el token de sesión:', err);
    }

    return response;
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error?.message || 'Error interno durante el registro.' },
      { status: 500 }
    );
  }
}
