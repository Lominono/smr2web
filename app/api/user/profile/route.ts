import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient, isServerSupabaseConfigured } from '@/lib/supabase/server';
import { isUUID, generateUUID } from '@/lib/uuid';
import { verifyUserSession, verifyAdminSession } from '@/lib/adminAuth';
import { logEvent } from '@/lib/logger';
import { securityEvent } from '@/lib/security/audit';
import { validatePasswordSecurity } from '@/lib/passwordSecurity';
import { enforceRateLimit, guardOrigin } from '@/lib/security/http';
import { RATE_LIMITS } from '@/lib/security/rateLimit';

export const dynamic = 'force-dynamic';

/**
 * GET /api/user/profile?username=xyz&id=123
 * Obtains public student profile / card info for viewing other classmates.
 * Strictly strips sensitive personal data (passwords, emails, session tokens).
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const rawUsername = searchParams.get('username')?.trim().toLowerCase().replace(/^@/, '');
    const rawId = searchParams.get('id')?.trim();

    if (!rawUsername && !rawId) {
      return NextResponse.json(
        { success: false, error: 'Identificador o nombre de usuario no proporcionado.' },
        { status: 400 }
      );
    }

    // PRIVACIDAD: los datos sensibles (NIA, puesto) solo se devuelven a
    // usuarios con sesión verificada; a anónimos se les oculta.
    const viewer = await verifyUserSession();
    const viewerIsLoggedIn = viewer.authenticated && Boolean(viewer.user);

    if (isServerSupabaseConfigured()) {
      const client = createAdminClient();
      if (client) {
        try {
          let query = client
            .from('profiles')
            .select('id, username, full_name, student_number, pc_seat, coins, biggest_win, streak_count, avatar_color, role, created_at, games_played, games_won, items_comprados, banner_estilo, titulo_personalizado, frase, onboarding_completado, mascota_equipada, mascotas_desbloqueadas, party_farm_data');

          if (rawId && isUUID(rawId)) {
            query = query.eq('id', rawId);
          } else if (rawUsername) {
            query = query.ilike('username', rawUsername);
          }

          const { data, error } = await query.maybeSingle();

          if (!error && data) {
            return NextResponse.json({
              success: true,
              user: {
                id: data.id,
                username: data.username,
                // PRIVACIDAD: NIA y puesto solo con sesión verificada
                full_name: viewerIsLoggedIn ? (data.full_name || undefined) : undefined,
                student_number: viewerIsLoggedIn ? (data.student_number || undefined) : undefined,
                pc_seat: viewerIsLoggedIn ? (data.pc_seat || undefined) : undefined,
                coins: Math.max(0, Number(data.coins ?? 1000)),
                biggest_win: Math.max(0, Number(data.biggest_win ?? 0)),
                streak_count: Math.max(1, Number(data.streak_count ?? 1)),
                avatar_color: data.avatar_color || 'emerald',
                role: data.role || 'student',
                created_at: data.created_at,
                games_played: Number(data.games_played ?? 0),
                games_won: Number(data.games_won ?? 0),
                items_comprados: Array.isArray(data.items_comprados) ? data.items_comprados : [],
                banner_estilo: data.banner_estilo || undefined,
                titulo_personalizado: data.titulo_personalizado || undefined,
                frase: data.frase || undefined,
                onboarding_completado: Boolean(data.onboarding_completado || (data.full_name && data.student_number)),
                mascota_equipada: data.mascota_equipada || data.party_farm_data?.mascota_equipada || undefined,
                mascotas_desbloqueadas: Array.isArray(data.mascotas_desbloqueadas)
                  ? data.mascotas_desbloqueadas
                  : (Array.isArray(data.party_farm_data?.mascotas_desbloqueadas)
                  ? data.party_farm_data.mascotas_desbloqueadas
                  : []),
              },
            });
          }
        } catch (dbErr) {
          console.warn('Note retrieving public profile from Supabase:', dbErr);
        }
      }
    }

    // Respuesta segura de perfil público de respaldo
    return NextResponse.json({
      success: true,
      user: {
        id: rawId || generateUUID(),
        username: rawUsername || 'estudiante',
        role: 'student',
        coins: 1000,
        streak_count: 1,
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error?.message || 'Error al consultar perfil de estudiante.' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  const originError = guardOrigin(req);
  if (originError) return originError;

  try {
    const session = await verifyUserSession();
    if (!session.authenticated || !session.user || !isUUID(session.user.id)) {
      return NextResponse.json(
        { success: false, error: 'Acceso no autorizado. Inicia sesión para modificar tu perfil.' },
        { status: 401 }
      );
    }

    const rate = enforceRateLimit(`profile:${session.user.id}`, RATE_LIMITS.profileWrite);
    if (!rate.ok) return rate.response;

    const body = await req.json();
    const {
      newUsername,
      avatarColor,
      soundEnabled,
      fullName,
      studentNumber,
      notificationsEnabled,
      mascotaEquipada,
    } = body;

    // Solo se permite actualizar el perfil del usuario autenticado en la sesión (previene manipulación IDOR)
    const targetUserId = session.user.id;

    const cleanUsername = newUsername?.trim().toLowerCase().replace(/\s+/g, '_');
    if (cleanUsername && cleanUsername.length < 3) {
      return NextResponse.json(
        { success: false, error: 'El nombre de usuario debe tener al menos 3 caracteres.' },
        { status: 400 }
      );
    }

    if (cleanUsername && (cleanUsername.length > 20 || !/^[a-z0-9_]+$/.test(cleanUsername))) {
      return NextResponse.json(
        { success: false, error: 'El usuario solo puede contener letras (a-z), números (0-9) y guiones bajos (_), con un máximo de 20 caracteres.' },
        { status: 400 }
      );
    }

    if (fullName !== undefined && String(fullName).trim().length > 80) {
      return NextResponse.json({ success: false, error: 'El nombre es demasiado largo.' }, { status: 400 });
    }

    if (studentNumber !== undefined && String(studentNumber).trim().length > 20) {
      return NextResponse.json({ success: false, error: 'El número de estudiante es demasiado largo.' }, { status: 400 });
    }

    // Lista blanca de colores y mascotas: evita inyectar valores arbitrarios
    const ALLOWED_AVATAR_COLORS = new Set([
      'emerald', 'blue', 'purple', 'amber', 'rose', 'cyan', 'orange', 'lime', 'slate',
    ]);
    const ALLOWED_PETS = new Set([
      'spongegar', 'thinking_butt', 'baldi', 'kirby', 'link', 'toy_chica',
      'peter_kirby', 'austin', 'goku_bird', 'tung_tung', 'androide_18',
    ]);

    if (isServerSupabaseConfigured()) {
      const client = createAdminClient();
      if (client) {
        // If username changed, check uniqueness
        if (cleanUsername) {
          let uQuery = client
            .from('profiles')
            .select('id')
            .eq('username', cleanUsername);

          if (isUUID(targetUserId)) {
            uQuery = uQuery.neq('id', targetUserId);
          }

          const { data: existing } = await uQuery.maybeSingle();

          if (existing) {
            return NextResponse.json(
              { success: false, error: 'Ese nombre de usuario ya está en uso por otro alumno.' },
              { status: 409 }
            );
          }
        }

        // SEGURIDAD: mascotas NO se aceptan desde el cliente. Antes, cualquier
        // usuario podía autoregalarse cualquier mascota (50M - 1T de monedas)
        // escribiendo `mascotas_desbloqueadas` o equiparse una no comprada.
        // Ahora la adquisición y el equipado solo ocurren en el servidor:
        //   - Compra:  POST /api/pets/purchase (cobra y concede en una operación)
        //   - Equipar: POST /api/pets/equip    (verifica propiedad real en BD)
        const desiredEquip = mascotaEquipada !== undefined
          ? (mascotaEquipada ? String(mascotaEquipada) : null)
          : undefined;

        const { data: ownerProfile } = await client
          .from('profiles')
          .select('id, mascotas_desbloqueadas')
          .eq('id', isUUID(targetUserId) ? targetUserId : '00000000-0000-0000-0000-000000000000')
          .maybeSingle();

        const ownedPets: string[] = Array.isArray(ownerProfile?.mascotas_desbloqueadas)
          ? ownerProfile!.mascotas_desbloqueadas
          : [];
        void ALLOWED_PETS;

        const updates: Record<string, any> = {};
        if (cleanUsername) updates.username = cleanUsername;
        if (avatarColor && ALLOWED_AVATAR_COLORS.has(String(avatarColor))) {
          updates.avatar_color = String(avatarColor);
        }
        if (fullName !== undefined) updates.full_name = fullName.trim();

        if (studentNumber !== undefined && studentNumber.trim().length >= 2) {
          const cleanNumber = studentNumber.trim().toUpperCase();
          let nQuery = client
            .from('profiles')
            .select('id')
            .eq('student_number', cleanNumber);

          if (isUUID(targetUserId)) {
            nQuery = nQuery.neq('id', targetUserId);
          }

          const { data: existingNumber } = await nQuery.maybeSingle();

          if (existingNumber) {
            return NextResponse.json(
              { success: false, error: `El número de estudiante "${cleanNumber}" ya está en uso por otro alumno.` },
              { status: 409 }
            );
          }
          updates.student_number = cleanNumber;
        }

        if (desiredEquip !== undefined) {
          // Solo se permite equipar una mascota que el usuario posea REALMENTE
          // (adquirida previamente y registrada en la base de datos).
          updates.mascota_equipada =
            desiredEquip && ALLOWED_PETS.has(desiredEquip) && ownedPets.includes(desiredEquip)
              ? desiredEquip
              : null;
        }

        // `mascotasDesbloqueadas` del body se IGNORA por completo (solo el
        // servidor concede mascotas al cobrar la compra en /api/pets/purchase).

        if (Object.keys(updates).length > 0 && isUUID(targetUserId)) {
          // Intentar actualizar directamente
          const { error: updateError } = await client.from('profiles').update(updates).eq('id', targetUserId);
          if (updateError) {
            console.warn('Note updating profiles in Supabase directly:', updateError.message);
            return NextResponse.json(
              { success: false, error: 'No se pudo actualizar el perfil. Inténtalo de nuevo.' },
              { status: 500 }
            );
          }
        }
      }
    }

    await logEvent({
      eventType: 'balance_adjusted',
      userId: targetUserId,
      username: cleanUsername || session.user?.username,
      req,
      details: {
        action: 'profile_updated',
        new_username: cleanUsername,
        avatar_color: avatarColor,
        full_name: fullName,
        student_number: studentNumber,
      },
    });

    return NextResponse.json({
      success: true,
      username: cleanUsername,
      avatarColor,
      fullName,
      studentNumber,
      soundEnabled,
      notificationsEnabled,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error?.message || 'Error al actualizar perfil.' },
      { status: 500 }
    );
  }
}

export async function PUT(req: NextRequest) {
  const originError = guardOrigin(req);
  if (originError) return originError;

  try {
    const session = await verifyUserSession();
    if (!session.authenticated || !session.user || !isUUID(session.user.id)) {
      return NextResponse.json(
        { success: false, error: 'Acceso no autorizado. Inicia sesión para actualizar tu contraseña.' },
        { status: 401 }
      );
    }

    const rate = enforceRateLimit(`password:${session.user.id}`, { limit: 5, windowMs: 15 * 60_000 });
    if (!rate.ok) return rate.response;

    const body = await req.json();
    const { userId, newPassword, currentPassword } = body;

    // SEGURIDAD: cambiar la contraseña de OTRO usuario exige verificación
    // estricta de administrador (token firmadoHttpOnly + rol real en la BD).
    // Para la propia cuenta se exige demostrar la contraseña actual, de modo
    // que el robo raspado de la cookie de sesión no permita secuestrarla.
    let targetUserId = session.user.id;
    const isSelfChange = !userId || userId === session.user.id;

    if (!isSelfChange) {
      const adminAuth = await verifyAdminSession(req);
      if (!adminAuth.authorized || !adminAuth.user) {
        return NextResponse.json(
          { success: false, error: 'Acceso denegado: solo la administración puede restablecer contraseñas de otros alumnos.' },
          { status: adminAuth.status || 403 }
        );
      }
      targetUserId = userId;
    } else {
      if (!currentPassword || typeof currentPassword !== 'string') {
        return NextResponse.json(
          { success: false, error: 'Debes introducir tu contraseña actual para confirmar el cambio.' },
          { status: 400 }
        );
      }
    }

    const passCheck = validatePasswordSecurity(newPassword, session.user?.username, session.user?.email);
    if (!passCheck.valid) {
      return NextResponse.json(
        { success: false, error: passCheck.errors[0] || 'La contraseña no cumple con los requisitos de seguridad.' },
        { status: 400 }
      );
    }

    let updatedInSupabase = false;
    if (isServerSupabaseConfigured()) {
      const client = createAdminClient();
      if (client && isUUID(targetUserId)) {
        // Prueba de propiedad: la contraseña actual debe ser correcta.
        // Se usa signInWithPassword sin cookies (no contamina la sesión).
        if (isSelfChange) {
          const { data: profileRow } = await client
            .from('profiles')
            .select('email')
            .eq('id', session.user.id)
            .maybeSingle();

          const email = profileRow?.email || session.user?.email;
          if (!email) {
            return NextResponse.json(
              { success: false, error: 'No se pudo verificar tu cuenta.' },
              { status: 500 }
            );
          }

          const { error: signInErr } = await client.auth
            .signInWithPassword({
              email: String(email),
              password: String(currentPassword),
            })
            .catch((err: any) => ({ data: null, error: err }) as any);

          if (signInErr) {
            try {
              securityEvent({
                action: 'password_change_wrong_current',
                userId: session.user.id,
                username: session.user?.username,
                req,
              });
            } catch {}
            return NextResponse.json(
              { success: false, error: 'La contraseña actual no es correcta.' },
              { status: 401 }
            );
          }
        }

        try {
          await client.auth.admin.updateUserById(targetUserId, {
            password: newPassword,
          });
          updatedInSupabase = true;
        } catch (authErr: any) {
          console.warn('Supabase password change note:', authErr?.message);
        }
      }
    }

    await logEvent({
      eventType: 'admin_action',
      userId: targetUserId,
      username: session.user?.username,
      req,
      details: {
        action: 'user_password_changed',
        supabase_auth_updated: updatedInSupabase,
      },
    });

    return NextResponse.json({
      success: true,
      updatedInSupabase,
      message: 'Contraseña actualizada correctamente.',
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error?.message || 'Error al actualizar contraseña.' },
      { status: 500 }
    );
  }
}
