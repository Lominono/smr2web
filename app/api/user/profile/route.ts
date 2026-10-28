import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient, isServerSupabaseConfigured } from '@/lib/supabase/server';
import { verifyUserSession } from '@/lib/adminAuth';
import { logEvent } from '@/lib/logger';
import { validatePasswordSecurity } from '@/lib/passwordSecurity';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const session = await verifyUserSession();
    const body = await req.json();
    const { userId, newUsername, avatarColor, soundEnabled, fullName, studentNumber, notificationsEnabled } = body;

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
        if (avatarColor) updates.avatar_color = avatarColor;
        if (fullName !== undefined) updates.full_name = fullName.trim();

        if (studentNumber !== undefined && studentNumber.trim().length >= 2) {
          const cleanNumber = studentNumber.trim().toUpperCase();
          const { data: existingNumber } = await client
            .from('profiles')
            .select('id')
            .eq('student_number', cleanNumber)
            .neq('id', targetUserId)
            .maybeSingle();

          if (existingNumber) {
            return NextResponse.json(
              { success: false, error: `El número de estudiante "${cleanNumber}" ya está en uso por otro alumno.` },
              { status: 409 }
            );
          }
          updates.student_number = cleanNumber;
        }

        if (Object.keys(updates).length > 0) {
          const { error: updateError } = await client.from('profiles').update(updates).eq('id', targetUserId);
          if (updateError) {
            console.warn('Note updating profiles in Supabase:', updateError.message);
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
    const body = await req.json();
    const { userId, newPassword } = body;

    const targetUserId = session.user?.id || userId;
    if (!targetUserId) {
      return NextResponse.json({ success: false, error: 'No autenticado.' }, { status: 401 });
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
      if (client) {
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
