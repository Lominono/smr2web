import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createAdminClient, createClient, isServerSupabaseConfigured } from '@/lib/supabase/server';
import { COOKIE_SESSION } from '@/lib/authSession';
import { UserProfile } from '@/lib/types';
import { logEvent } from '@/lib/logger';

export const dynamic = 'force-dynamic';

// Códigos maestros autorizados para acceder a la administración
const VALID_CODES = [
  '2026PAPU',
  '2026papu',
  'SMR2ADMIN',
  'DELEGADO2026',
  'ADMIN2026',
  (process.env.ADMIN_ACCESS_CODE || '').trim(),
].filter(Boolean);

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const rawCode = String(body?.code || '').trim();
    const normalized = rawCode.toLowerCase();
    const isAuthorized =
      normalized === '2026papu' ||
      VALID_CODES.some((c) => c.toLowerCase() === normalized);

    if (!rawCode || !isAuthorized) {
      return NextResponse.json(
        {
          success: false,
          error: 'Clave incorrecta. Solo los administradores autorizados con la clave oficial pueden acceder.',
        },
        { status: 401 }
      );
    }

    const cookieStore = await cookies();
    let currentUser: UserProfile | null = null;

    // 1. Obtener usuario de la sesión de cookie si existe
    const sessionCookie = cookieStore.get(COOKIE_SESSION);
    if (sessionCookie?.value) {
      try {
        let raw = sessionCookie.value;
        if (raw.includes('%')) {
          try {
            raw = decodeURIComponent(raw);
          } catch {}
        }
        currentUser = JSON.parse(raw) as UserProfile;
      } catch {}
    }

    // 2. Verificar si hay usuario autenticado en Supabase
    let supabaseUserId: string | null = null;
    if (isServerSupabaseConfigured()) {
      try {
        const supabase = await createClient();
        if (supabase) {
          const {
            data: { user: authUser },
          } = await supabase.auth.getUser();

          if (authUser) {
            supabaseUserId = authUser.id;
            if (!currentUser) {
              const defaultName = (authUser.email?.split('@')[0] || 'admin').toLowerCase();
              currentUser = {
                id: authUser.id,
                username: authUser.user_metadata?.username || defaultName,
                email: authUser.email,
                role: 'admin',
                coins: 1000,
                biggest_win: 0,
                avatar_color: 'amber',
                created_at: new Date().toISOString(),
              };
            }
          }
        }
      } catch (err) {
        console.warn('[ADMIN_CLAIM] Supabase auth check warning:', err);
      }
    }

    // 3. Si no existe usuario en sesión, creamos uno con rol admin
    if (!currentUser) {
      currentUser = {
        id: 'admin_' + Math.random().toString(36).substring(2, 9),
        username: 'admin',
        email: 'admin@smr2.edu',
        role: 'admin',
        coins: 10000,
        biggest_win: 0,
        avatar_color: 'amber',
        created_at: new Date().toISOString(),
        auth_provider: 'local',
      };
    } else {
      currentUser.role = 'admin';
    }

    // 4. Si Supabase está configurado, actualizar el rol en la tabla `profiles`
    if (isServerSupabaseConfigured()) {
      try {
        const adminClient = createAdminClient();
        if (adminClient) {
          const targetId = supabaseUserId || currentUser.id;
          if (targetId && !targetId.startsWith('local_') && !targetId.startsWith('admin_')) {
            await adminClient
              .from('profiles')
              .update({ role: 'admin' })
              .eq('id', targetId);
          } else if (currentUser.username) {
            await adminClient
              .from('profiles')
              .update({ role: 'admin' })
              .eq('username', currentUser.username);
          }
        }
      } catch (err) {
        console.warn('[ADMIN_CLAIM] Could not update role in Supabase profiles:', err);
      }
    }

    // 5. Registrar log de auditoría
    try {
      await logEvent({
        eventType: 'admin_action',
        userId: currentUser.id,
        username: currentUser.username,
        req,
        details: {
          action: 'admin_unlocked_via_code',
          code_used: rawCode,
          timestamp: new Date().toISOString(),
        },
      });
    } catch {}

    // 6. Configurar respuesta y actualizar cookie de sesión de 365 días
    const response = NextResponse.json({
      success: true,
      user: currentUser,
      message: '¡Acceso de administrador y delegado desbloqueado correctamente!',
    });

    response.cookies.set(COOKIE_SESSION, JSON.stringify(currentUser), {
      path: '/',
      maxAge: 365 * 24 * 60 * 60,
      httpOnly: false,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
    });

    return response;
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error?.message || 'Error al procesar el código de acceso.' },
      { status: 500 }
    );
  }
}
