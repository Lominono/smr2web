import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient, isServerSupabaseConfigured } from '@/lib/supabase/server';
import { UserProfile } from '@/lib/types';
import { signAdminToken } from '@/lib/adminAuth';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const rawIdentifier = String(body.identifier || '').trim();
    const password = String(body.password || '');

    if (!rawIdentifier || !password) {
      return NextResponse.json(
        { success: false, error: 'Por favor, introduce tu correo o nombre de usuario y tu contraseña.' },
        { status: 400 }
      );
    }

    if (!isServerSupabaseConfigured()) {
      return NextResponse.json(
        { success: false, error: 'Supabase no está configurado en el servidor.', isOffline: true },
        { status: 503 }
      );
    }

    const adminClient = createAdminClient();
    if (!adminClient) {
      return NextResponse.json(
        { success: false, error: 'No se pudo inicializar la conexión con Supabase.' },
        { status: 500 }
      );
    }

    let targetEmail: string | null = rawIdentifier.includes('@') ? rawIdentifier.toLowerCase() : null;

    // Si el usuario introdujo un nombre de usuario o NIA, buscar su correo en la tabla public.profiles de Supabase
    if (!targetEmail) {
      const cleanUsername = rawIdentifier.toLowerCase().replace(/^@/, '');
      try {
        const { data: pList, error: pError } = await adminClient
          .from('profiles')
          .select('id, email, username, nombre, student_number, created_at')
          .or(`username.ilike.${cleanUsername},nombre.ilike.${cleanUsername},student_number.eq.${cleanUsername}`)
          .order('created_at', { ascending: false });

        if (!pError && pList && pList.length > 0) {
          // Tomar el perfil que tenga email válido registrado
          const matched = pList.find((p) => p.email && p.email.includes('@'));
          if (matched?.email) {
            targetEmail = matched.email.toLowerCase();
          }
        }
      } catch (lookupErr) {
        console.warn('Error al buscar usuario en profiles:', lookupErr);
      }
    }

    if (!targetEmail) {
      return NextResponse.json(
        {
          success: false,
          error: `No se ha encontrado ninguna cuenta con el usuario o correo "${rawIdentifier}". Por favor, comprueba que esté bien escrito o regístrate.`,
        },
        { status: 404 }
      );
    }

    // Iniciar sesión con Supabase Auth
    let { data: signInData, error: signInError } = await adminClient.auth.signInWithPassword({
      email: targetEmail,
      password,
    });

    // Auto-confirmar el correo si el proyecto tiene confirmación de email pendiente
    if (signInError && signInError.message.includes('Email not confirmed')) {
      try {
        const { data: usersData } = await adminClient.auth.admin.listUsers();
        const userToConfirm = usersData?.users?.find(
          (u) => u.email?.toLowerCase() === targetEmail?.toLowerCase()
        );

        if (userToConfirm) {
          await adminClient.auth.admin.updateUserById(userToConfirm.id, {
            email_confirm: true,
          });

          // Reintentar inicio de sesión tras auto-confirmar
          const retry = await adminClient.auth.signInWithPassword({
            email: targetEmail,
            password,
          });

          signInData = retry.data;
          signInError = retry.error;
        }
      } catch (confirmErr) {
        console.warn('Auto-confirm error:', confirmErr);
      }
    }

    if (signInError || !signInData?.user) {
      if (
        signInError?.message.includes('Invalid login credentials') ||
        signInError?.message.includes('invalid_grant')
      ) {
        return NextResponse.json(
          { success: false, error: 'Correo o contraseña incorrectos. Por favor, compruébalos e inténtalo de nuevo.' },
          { status: 401 }
        );
      }
      return NextResponse.json(
        { success: false, error: signInError?.message || 'Error al iniciar sesión con Supabase.' },
        { status: 401 }
      );
    }

    const userId = signInData.user.id;

    // Obtener los datos reales del usuario desde la tabla profiles en la base de datos
    let profileRow: any = null;
    try {
      const { data: dbProfile, error: dbErr } = await adminClient
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      if (!dbErr && dbProfile) {
        profileRow = dbProfile;
      }
    } catch (dbErr) {
      console.warn('Error al leer tabla profiles:', dbErr);
    }

    // Si por alguna razón no existía la fila en profiles, crearla automáticamente en Supabase
    if (!profileRow) {
      const defaultUsername =
        signInData.user.user_metadata?.username ||
        targetEmail.split('@')[0].toLowerCase().replace(/[^a-z0-9_]/g, '_');

      try {
        const { data: newRow } = await adminClient
          .from('profiles')
          .upsert(
            {
              id: userId,
              username: defaultUsername,
              nombre: defaultUsername,
              full_name: defaultUsername,
              email: targetEmail,
              coins: 1000,
              biggest_win: 0,
              streak_count: 1,
              role: 'student',
              rol: 'alumno',
              created_at: new Date().toISOString(),
            },
            { onConflict: 'id' }
          )
          .select('*')
          .maybeSingle();

        if (newRow) {
          profileRow = newRow;
        }
      } catch (upsertErr) {
        console.warn('Error al auto-crear perfil en profiles:', upsertErr);
      }
    }

    const username =
      profileRow?.username ||
      signInData.user.user_metadata?.username ||
      targetEmail.split('@')[0];

    const role: 'admin' | 'delegado' | 'student' =
      profileRow?.role === 'admin' || profileRow?.rol === 'admin'
        ? 'admin'
        : profileRow?.role === 'delegado' || profileRow?.rol === 'delegado'
        ? 'delegado'
        : 'student';

    const userProfile: UserProfile = {
      id: userId,
      username,
      full_name: profileRow?.full_name || profileRow?.nombre || undefined,
      student_number: profileRow?.student_number || undefined,
      pc_seat: profileRow?.pc_seat || undefined,
      email: targetEmail,
      coins: Math.max(0, Number(profileRow?.coins ?? 1000)),
      biggest_win: Math.max(0, Number(profileRow?.biggest_win ?? 0)),
      streak_count: Math.max(1, Number(profileRow?.streak_count ?? 1)),
      avatar_color: profileRow?.avatar_color || 'emerald',
      role,
      games_played: Number(profileRow?.games_played ?? 0),
      games_won: Number(profileRow?.games_won ?? 0),
      sound_enabled: profileRow?.sound_enabled ?? true,
      notifications_enabled: profileRow?.notifications_enabled ?? true,
      last_claim_date: profileRow?.last_claim_date || undefined,
      created_at: profileRow?.created_at,
      auth_provider: 'supabase',
      onboarding_completado: Boolean(profileRow?.onboarding_completado || (profileRow?.full_name && profileRow?.student_number)),
    };

    const response = NextResponse.json({
      success: true,
      user: userProfile,
      session: signInData.session,
      targetEmail,
    });

    // Configurar cookies con persistencia de 2 años (63072000 segundos)
    const cookieOptions = {
      path: '/',
      sameSite: 'lax' as const,
      maxAge: 60 * 60 * 24 * 730,
      secure: process.env.NODE_ENV === 'production',
    };

    response.cookies.set('smr2_user_session', JSON.stringify(userProfile), cookieOptions);
    response.cookies.set('smr2_remember_me', 'true', cookieOptions);
    response.cookies.set('smr2_last_user', targetEmail, cookieOptions);

    // Si es administrador, firmar y asignar el token HttpOnly de administración
    if (role === 'admin') {
      try {
        const adminToken = signAdminToken({
          userId: userProfile.id,
          username: userProfile.username,
          role: 'admin',
        });
        response.cookies.set('smr2_admin_token', adminToken, {
          ...cookieOptions,
          httpOnly: true,
          maxAge: 60 * 60 * 24 * 7,
        });
      } catch (err) {
        console.warn('No se pudo firmar el token de admin:', err);
      }
    }

    return response;
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error?.message || 'Error interno del servidor durante el inicio de sesión.' },
      { status: 500 }
    );
  }
}
