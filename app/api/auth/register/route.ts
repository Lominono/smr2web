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
        // Esto GARANTIZA que NO se envía ningún correo de verificación y la cuenta queda activa al 100%
        const { data: authData, error: authError } = await adminClient.auth.admin.createUser({
          email,
          password,
          email_confirm: true, // <-- Activado al instante sin enviar ningún email de verificación
          user_metadata: {
            username,
            accepted_terms: true,
            accepted_terms_at: new Date().toISOString(),
          },
        });

        if (authError) {
          if (
            authError.message.includes('already registered') ||
            authError.message.includes('already exists')
          ) {
            return NextResponse.json(
              { success: false, error: 'Ya existe una cuenta con este correo electrónico. Inicia sesión directamente.' },
              { status: 409 }
            );
          }
          return NextResponse.json(
            { success: false, error: authError.message },
            { status: 400 }
          );
        }

        const userId = authData.user.id;

        // 3. Crear el perfil del alumno en la tabla profiles
        try {
          await adminClient.from('profiles').upsert(
            {
              id: userId,
              username,
              nombre: username,
              email,
              coins: 1000,
              puntos_total: 1000,
              biggest_win: 0,
              streak_count: 1,
              racha_actual: 1,
              role: 'student',
              rol: 'alumno',
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
