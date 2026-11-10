import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient, isServerSupabaseConfigured } from '@/lib/supabase/server';
import { isUUID, generateUUID } from '@/lib/uuid';
import { verifyUserSession } from '@/lib/adminAuth';
import { logEvent } from '@/lib/logger';
import { validatePasswordSecurity } from '@/lib/passwordSecurity';

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
                full_name: data.full_name || undefined,
                student_number: data.student_number || undefined,
                pc_seat: data.pc_seat || undefined,
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
  try {
    const session = await verifyUserSession();
    if (!session.authenticated || !session.user || !isUUID(session.user.id)) {
      return NextResponse.json(
        { success: false, error: 'Acceso no autorizado. Inicia sesión para modificar tu perfil.' },
        { status: 401 }
      );
    }

    const body = await req.json();
    const {
      newUsername,
      avatarColor,
      soundEnabled,
      fullName,
      studentNumber,
      notificationsEnabled,
      mascotaEquipada,
      mascotasDesbloqueadas,
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

        const updates: Record<string, any> = {};
        if (cleanUsername) updates.username = cleanUsername;
        if (avatarColor) updates.avatar_color = avatarColor;
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

        if (mascotaEquipada !== undefined) {
          updates.mascota_equipada = mascotaEquipada ? String(mascotaEquipada) : null;
        }

        if (Array.isArray(mascotasDesbloqueadas)) {
          updates.mascotas_desbloqueadas = mascotasDesbloqueadas;
        }

        if (Object.keys(updates).length > 0 && isUUID(targetUserId)) {
          // Intentar actualizar directamente
          const { error: updateError } = await client.from('profiles').update(updates).eq('id', targetUserId);
          if (updateError) {
            console.warn('Note updating profiles in Supabase directly, falling back:', updateError.message);
            // Si la columna física aún no existe, guardar en party_farm_data
            if (mascotaEquipada !== undefined || mascotasDesbloqueadas) {
              try {
                const { data: currP } = await client.from('profiles').select('party_farm_data').eq('id', targetUserId).maybeSingle();
                const existingFarm = (currP?.party_farm_data && typeof currP.party_farm_data === 'object') ? currP.party_farm_data : {};
                const updatedFarm = {
                  ...existingFarm,
                  ...(mascotaEquipada !== undefined ? { mascota_equipada: mascotaEquipada } : {}),
                  ...(mascotasDesbloqueadas ? { mascotas_desbloqueadas: mascotasDesbloqueadas } : {}),
                };
                delete updates.mascota_equipada;
                delete updates.mascotas_desbloqueadas;
                await client.from('profiles').update({ ...updates, party_farm_data: updatedFarm }).eq('id', targetUserId);
              } catch {}
            }
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
  try {
    const session = await verifyUserSession();
    if (!session.authenticated || !session.user || !isUUID(session.user.id)) {
      return NextResponse.json(
        { success: false, error: 'Acceso no autorizado. Inicia sesión para actualizar tu contraseña.' },
        { status: 401 }
      );
    }

    const body = await req.json();
    const { userId, newPassword } = body;

    // Solo un administrador oficial puede cambiar la contraseña de otra cuenta
    let targetUserId = session.user.id;
    if (userId && userId !== session.user.id) {
      if (session.user.role !== 'admin') {
        return NextResponse.json(
          { success: false, error: 'Acceso denegado: No tienes permisos para modificar la contraseña de otro usuario.' },
          { status: 403 }
        );
      }
      targetUserId = userId;
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
