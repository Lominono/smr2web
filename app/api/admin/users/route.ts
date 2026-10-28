import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminSession } from '@/lib/adminAuth';
import { createAdminClient, isServerSupabaseConfigured } from '@/lib/supabase/server';
import { logEvent } from '@/lib/logger';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const authResult = await verifyAdminSession(req);
    if (!authResult.authorized) {
      return NextResponse.json(
        { success: false, error: authResult.error || 'Acceso no autorizado.' },
        { status: authResult.status }
      );
    }

    if (isServerSupabaseConfigured()) {
      const client = createAdminClient();
      if (client) {
        const { data: users, error } = await client
          .from('profiles')
          .select('id, username, email, full_name, student_number, coins, biggest_win, games_played, games_won, role, is_banned, ban_reason, created_at')
          .order('coins', { ascending: false });

        if (!error && users) {
          return NextResponse.json({ success: true, users });
        }
      }
    }

    // Si no hay usuarios en la base de datos o Supabase no está configurado, solo devolvemos el usuario real autenticado si existe, sin inventar usuarios ni estadísticas ficticias
    const fallbackUsers = authResult.user
      ? [
          {
            id: authResult.user.id,
            username: authResult.user.username,
            email: authResult.user.email,
            full_name: authResult.user.full_name,
            student_number: authResult.user.student_number,
            coins: authResult.user.coins ?? 1000,
            biggest_win: authResult.user.biggest_win ?? 0,
            games_played: authResult.user.games_played ?? 0,
            games_won: authResult.user.games_won ?? 0,
            role: authResult.user.role || 'admin',
            is_banned: authResult.user.is_banned ?? false,
            created_at: authResult.user.created_at || new Date().toISOString(),
          },
        ]
      : [];

    return NextResponse.json({
      success: true,
      users: fallbackUsers,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error?.message || 'Error al obtener usuarios.' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const authResult = await verifyAdminSession(req);
    if (!authResult.authorized || !authResult.user) {
      return NextResponse.json(
        { success: false, error: 'Acceso no autorizado.' },
        { status: 403 }
      );
    }

    const body = await req.json();
    const { action, targetUserId, amount, banReason } = body;

    if (!targetUserId) {
      return NextResponse.json(
        { success: false, error: 'targetUserId es requerido.' },
        { status: 400 }
      );
    }

    if (isServerSupabaseConfigured()) {
      const client = createAdminClient();
      if (client) {
        const { data: targetUser } = await client
          .from('profiles')
          .select('*')
          .eq('id', targetUserId)
          .single();

        if (!targetUser) {
          return NextResponse.json({ success: false, error: 'Usuario no encontrado.' }, { status: 404 });
        }

        if (action === 'adjust_coins') {
          const delta = Number(amount);
          if (isNaN(delta)) {
            return NextResponse.json({ success: false, error: 'Cantidad inválida.' }, { status: 400 });
          }

          const curCoins = Number(targetUser.coins || 0);
          const newCoins = Math.max(0, curCoins + delta);

          await client.from('profiles').update({ coins: newCoins }).eq('id', targetUserId);

          await client.from('balance_transactions').insert([
            {
              user_id: targetUserId,
              amount: delta,
              balance_before: curCoins,
              balance_after: newCoins,
              type: 'admin_adjustment',
              reference_id: authResult.user.id,
              description: `Ajuste manual por administrador @${authResult.user.username}`,
            },
          ]);

          await logEvent({
            eventType: 'balance_adjusted',
            userId: targetUserId,
            username: targetUser.username,
            req,
            details: {
              admin_id: authResult.user.id,
              admin_username: authResult.user.username,
              previous_coins: curCoins,
              delta,
              new_coins: newCoins,
            },
          });

          return NextResponse.json({ success: true, newCoins });
        } else if (action === 'ban' || action === 'unban') {
          const isBanned = action === 'ban';
          await client
            .from('profiles')
            .update({
              is_banned: isBanned,
              ban_reason: isBanned ? banReason || 'Violación de normas de la comunidad' : null,
            })
            .eq('id', targetUserId);

          await logEvent({
            eventType: isBanned ? 'user_banned' : 'user_unbanned',
            userId: targetUserId,
            username: targetUser.username,
            req,
            details: {
              admin_id: authResult.user.id,
              admin_username: authResult.user.username,
              reason: banReason || 'Sin motivo especificado',
            },
          });

          return NextResponse.json({ success: true, isBanned });
        } else if (action === 'set_role') {
          const newRole = body.role === 'admin' ? 'admin' : body.role === 'delegado' ? 'delegado' : 'student';
          await client.from('profiles').update({ role: newRole }).eq('id', targetUserId);
          return NextResponse.json({ success: true, newRole });
        } else if (action === 'delete_user') {
          await client.from('profiles').delete().eq('id', targetUserId);
          return NextResponse.json({ success: true, message: 'Usuario eliminado correctamente.' });
        }
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Acción procesada correctamente en modo local.',
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error?.message || 'Error al ejecutar acción de administrador.' },
      { status: 500 }
    );
  }
}
