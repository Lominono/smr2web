import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient, isServerSupabaseConfigured } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const username = String(body.username || '').trim().toLowerCase().replace(/\s+/g, '_');
    const email = String(body.email || '').trim().toLowerCase();
    const password = String(body.password || '');

    if (!username || !email || !password) {
      return NextResponse.json(
        { success: false, error: 'Faltan campos obligatorios para el registro.' },
        { status: 400 }
      );
    }

    if (isServerSupabaseConfigured()) {
      const adminClient = createAdminClient();
      if (adminClient) {
        // 1. Comprobar si el nombre de usuario o email ya existe en perfiles
        try {
          const { data: existingProfiles } = await adminClient
            .from('profiles')
            .select('id, username, email')
            .or(`username.ilike.${username},email.ilike.${email}`);

          if (existingProfiles && existingProfiles.length > 0) {
            for (const p of existingProfiles) {
              if (p.username?.toLowerCase() === username) {
                return NextResponse.json(
                  { success: false, error: `El nombre de usuario "${username}" ya está ocupado.` },
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
        } catch {}

        // 2. Crear usuario directamente mediante Admin API con email_confirm = true
        // Si el cliente no tiene Service Role, recurrir a signUp estándar de Supabase
        let userId: string | null = null;
        let authErrorMsg: string | null = null;

        try {
          const { data: authData, error: adminAuthError } = await adminClient.auth.admin.createUser({
            email,
            password,
            email_confirm: true, // Activado al instante sin enviar ningún email de verificación
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

        // Fallback si auth.admin no está disponible (ej: credencial anon)
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

        // 3. Crear el perfil del alumno en la tabla public.profiles de Supabase
        try {
          await adminClient.from('profiles').upsert(
            {
              id: userId,
              username,
              email,
              coins: 1000,
              biggest_win: 0,
              streak_count: 1,
              role: 'student',
              created_at: new Date().toISOString(),
            },
            { onConflict: 'id' }
          );
        } catch (profileErr) {
          console.warn('Error al insertar perfil en Supabase:', profileErr);
        }

        return NextResponse.json({
          success: true,
          user: {
            id: userId,
            username,
            email,
            coins: 1000,
            biggest_win: 0,
            streak_count: 1,
            role: 'student',
            created_at: new Date().toISOString(),
            auth_provider: 'supabase',
          },
        });
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Servidor en modo local.',
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error?.message || 'Error interno durante el registro.' },
      { status: 500 }
    );
  }
}
