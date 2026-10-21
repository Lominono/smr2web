import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient, isServerSupabaseConfigured } from '@/lib/supabase/server';
import { verifyUserSession } from '@/lib/adminAuth';
import { logEvent } from '@/lib/logger';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const session = await verifyUserSession();
    const body = await req.json();
    const { userId, newUsername, avatarColor, soundEnabled } = body;

    const targetUserId = session.user?.id || userId;
    if (!targetUserId) {
      return NextResponse.json({ success: false, error: 'No autenticado.' }, { status: 401 });
    }

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
          const { data: existing } = await client
            .from('profiles')
            .select('id')
            .eq('username', cleanUsername)
            .neq('id', targetUserId)
            .maybeSingle();

          if (existing) {
            return NextResponse.json(
              { success: false, error: 'Ese nombre de usuario ya está en uso por otro alumno.' },
              { status: 409 }
            );
          }
        }

        const updates: Record<string, any> = {};
        if (cleanUsername) updates.username = cleanUsername;

        if (Object.keys(updates).length > 0) {
          await client.from('profiles').update(updates).eq('id', targetUserId);
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
      },
    });

    return NextResponse.json({
      success: true,
      username: cleanUsername,
      avatarColor,
      soundEnabled,
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
    const body = await req.json();
    const { userId, newPassword } = body;

    const targetUserId = session.user?.id || userId;
    if (!targetUserId) {
      return NextResponse.json({ success: false, error: 'No autenticado.' }, { status: 401 });
    }

    if (!newPassword || newPassword.length < 6) {
      return NextResponse.json(
        { success: false, error: 'La nueva contraseña debe tener un mínimo de 6 caracteres.' },
        { status: 400 }
      );
    }

    if (isServerSupabaseConfigured()) {
      const client = createAdminClient();
      if (client) {
        // Update auth user password via Supabase admin
        await client.auth.admin.updateUserById(targetUserId, {
          password: newPassword,
        });
      }
    }

    await logEvent({
      eventType: 'admin_action',
      userId: targetUserId,
      username: session.user?.username,
      req,
      details: {
        action: 'user_password_changed',
      },
    });

    return NextResponse.json({ success: true, message: 'Contraseña actualizada correctamente.' });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error?.message || 'Error al actualizar contraseña.' },
      { status: 500 }
    );
  }
}
