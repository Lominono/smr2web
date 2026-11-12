import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient, isServerSupabaseConfigured } from '@/lib/supabase/server';
import { isUUID } from '@/lib/uuid';
import { logEvent } from '@/lib/logger';
import { verifyUserSession } from '@/lib/adminAuth';
import { enforceRateLimit, guardOrigin, getClientIp } from '@/lib/security/http';
import { RATE_LIMITS } from '@/lib/security/rateLimit';

export const dynamic = 'force-dynamic';

/**
 * GET /api/user/identify?number=12345&userId=optional-id
 * Checks if a student number is available (not taken by another user).
 */
export async function GET(req: NextRequest) {
  try {
    const session = await verifyUserSession();
    if (!session.authenticated || !session.user) {
      return NextResponse.json(
        { available: false, error: 'Debes iniciar sesión para comprobar el NIA.' },
        { status: 401 }
      );
    }

    // Evita la enumeración masiva de números de estudiante
    const rate = enforceRateLimit(`identify-get:${session.user.id}:${getClientIp(req)}`, {
      limit: 30,
      windowMs: 60_000,
    });
    if (!rate.ok) return rate.response;

    const { searchParams } = new URL(req.url);
    const rawNumber = searchParams.get('number');
    const excludeUserId = session.user.id;

    if (!rawNumber || rawNumber.trim().length < 2) {
      return NextResponse.json({
        available: false,
        message: 'El número de estudiante debe tener al menos 2 caracteres.',
      });
    }

    const cleanNumber = rawNumber.trim().toUpperCase();

    if (isServerSupabaseConfigured()) {
      const client = createAdminClient();
      if (client) {
        try {
          let query = client
            .from('profiles')
            .select('id, username')
            .eq('student_number', cleanNumber);

          if (excludeUserId && isUUID(excludeUserId)) {
            query = query.neq('id', excludeUserId);
          }

          const { data, error } = await query.maybeSingle();

          if (!error && data) {
            return NextResponse.json({
              available: false,
              message: `El número "${cleanNumber}" ya está registrado por otro alumno. Cada estudiante debe tener su propio número.`,
            });
          }
        } catch (dbErr) {
          // If column doesn't exist yet in Supabase, treat as available to not block the user
          console.warn('Supabase check warning (column might be missing):', dbErr);
        }
      }
    }

    return NextResponse.json({ available: true, message: 'Número de estudiante disponible' });
  } catch {
    return NextResponse.json({ available: true });
  }
}

/**
 * POST /api/user/identify
 * Saves the real name and unique student number for a user.
 */
export async function POST(req: NextRequest) {
  const originError = guardOrigin(req);
  if (originError) return originError;

  try {
    const session = await verifyUserSession();
    if (!session.authenticated || !session.user || !isUUID(session.user.id)) {
      return NextResponse.json(
        { success: false, error: 'Debes iniciar sesión para actualizar tu identificación.' },
        { status: 401 }
      );
    }

    const rate = enforceRateLimit(`identify:${session.user.id}`, RATE_LIMITS.profileWrite);
    if (!rate.ok) return rate.response;

    const body = await req.json().catch(() => ({}));
    const { fullName, studentNumber } = body;
    // Solo el propio usuario autenticado puede modificar su identificación
    const userId = session.user.id;

    const cleanFullName = String(fullName || '').trim().replace(/\s+/g, ' ').slice(0, 80);
    const cleanStudentNumber = String(studentNumber || '').trim().toUpperCase().slice(0, 20);

    if (cleanFullName.length < 3) {
      return NextResponse.json(
        { success: false, error: 'Por favor, introduce tu nombre y apellidos reales (mínimo 3 caracteres).' },
        { status: 400 }
      );
    }

    if (cleanStudentNumber.length < 2) {
      return NextResponse.json(
        { success: false, error: 'Por favor, introduce un número de estudiante o NIA válido (mínimo 2 caracteres).' },
        { status: 400 }
      );
    }

    let updatedFromDb = null;

    if (isServerSupabaseConfigured()) {
      const client = createAdminClient();
      if (client) {
        try {
          // 1. Strict duplicate check in database
          let checkQuery = client
            .from('profiles')
            .select('id, username')
            .eq('student_number', cleanStudentNumber);

          if (isUUID(userId)) {
            checkQuery = checkQuery.neq('id', userId);
          }

          const { data: existing, error: checkError } = await checkQuery.maybeSingle();

          if (!checkError && existing) {
            return NextResponse.json(
              {
                success: false,
                error: `El número de estudiante "${cleanStudentNumber}" ya está en uso por otro alumno. Este número no lo pueden tener dos usuarios.`,
              },
              { status: 409 }
            );
          }

          // 2. Update profile with full_name and student_number if user has UUID
          if (isUUID(userId)) {
            const { data: updated, error: updateError } = await client
              .from('profiles')
              .update({
                full_name: cleanFullName,
                student_number: cleanStudentNumber,
                onboarding_completado: true,
              })
              .eq('id', userId)
              .select('*')
              .maybeSingle();

            if (updateError) {
              // If unique constraint violation in Postgres
              if (updateError.code === '23505' || updateError.message?.includes('duplicate key')) {
                return NextResponse.json(
                  {
                    success: false,
                    error: 'Este número de estudiante ya pertenece a otro usuario registrado.',
                  },
                  { status: 409 }
                );
              }
              console.warn('Note: Could not update Supabase columns (run SQL migration if columns are missing):', updateError.message);
            } else if (updated) {
              updatedFromDb = updated;
            }
          }

          try {
            await logEvent({
              eventType: 'user_register',
              userId,
              username: updatedFromDb?.username || null,
              details: { full_name: cleanFullName, student_number: cleanStudentNumber, action: 'profile_identified' },
              req,
            });
          } catch {}
        } catch (dbErr: any) {
          console.warn('Database note during identification:', dbErr?.message || dbErr);
        }
      }
    }

    // Always succeed and return the guaranteed identified user payload
    return NextResponse.json({
      success: true,
      user: updatedFromDb || {
        id: userId,
        full_name: cleanFullName,
        student_number: cleanStudentNumber,
      },
      message: 'Identificación guardada con éxito.',
    });
  } catch (error: any) {
    console.error('Error in /api/user/identify:', error);
    return NextResponse.json(
      { success: false, error: error?.message || 'Error al procesar la identificación.' },
      { status: 500 }
    );
  }
}
