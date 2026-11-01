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

    const { searchParams } = new URL(req.url);
    const format = searchParams.get('format');

    let userList: any[] = [];

    if (isServerSupabaseConfigured()) {
      const client = createAdminClient();
      if (client) {
        const { data: users, error } = await client
          .from('profiles')
          .select('id, username, email, full_name, student_number, coins, biggest_win, games_played, games_won, role, is_banned, ban_reason, created_at')
          .order('coins', { ascending: false });

        if (!error && users) {
          userList = users;
        }
      }
    }

    // Si Supabase está vacío o sin configurar, usar al menos el usuario autenticado
    if (userList.length === 0 && authResult.user) {
      userList = [
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
      ];
    }

    // Exportación en formato CSV para gestión del profesorado y administración
    if (format === 'csv') {
      const headers = ['ID', 'Usuario', 'Nombre Completo', 'NIA', 'Email', 'Rol', 'Fichas', 'Victorias', 'Partidas', 'Suspendido', 'Fecha Registro'];
      const rows = userList.map((u) => [
        `"${u.id || ''}"`,
        `"${u.username || ''}"`,
        `"${(u.full_name || '').replace(/"/g, '""')}"`,
        `"${u.student_number || ''}"`,
        `"${u.email || ''}"`,
        `"${u.role || 'student'}"`,
        u.coins || 0,
        u.games_won || 0,
        u.games_played || 0,
        u.is_banned ? 'SI' : 'NO',
        `"${u.created_at || ''}"`,
      ]);

      const csvContent = '\uFEFF' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\r\n');
      return new NextResponse(csvContent, {
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': `attachment; filename="alumnos_smr2_${new Date().toISOString().slice(0, 10)}.csv"`,
        },
      });
    }

    return NextResponse.json({
      success: true,
      users: userList,
      count: userList.length,
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
          .maybeSingle();

        if (!targetUser) {
          return NextResponse.json({ success: false, error: 'Usuario no encontrado en la base de datos.' }, { status: 404 });
        }

        // 1. Ajuste manual de monedas
        if (action === 'adjust_coins') {
          const delta = Number(amount);
          if (isNaN(delta)) {
            return NextResponse.json({ success: false, error: 'Cantidad inválida.' }, { status: 400 });
          }

          const curCoins = Number(targetUser.coins || 0);
          const newCoins = Math.max(0, curCoins + delta);

          await client.from('profiles').update({ coins: newCoins }).eq('id', targetUserId);

          try {
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
          } catch {}

          try {
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
          } catch {}

          return NextResponse.json({ success: true, newCoins });
        }

        // 2. Suspender / Reactivar cuenta
        else if (action === 'ban' || action === 'unban') {
          const isBanned = action === 'ban';
          await client
            .from('profiles')
            .update({
              is_banned: isBanned,
              ban_reason: isBanned ? banReason || 'Violación de normas de la comunidad' : null,
            })
            .eq('id', targetUserId);

          try {
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
          } catch {}

          return NextResponse.json({ success: true, isBanned });
        }

        // 3. Modificar rol
        else if (action === 'set_role') {
          const newRole = body.role === 'admin' ? 'admin' : body.role === 'delegado' ? 'delegado' : 'student';
          await client.from('profiles').update({ role: newRole }).eq('id', targetUserId);
          return NextResponse.json({ success: true, newRole });
        }

        // 4. Edición completa de datos de alumno (Nombre, NIA, Email, Fichas, Rol)
        else if (action === 'edit_profile') {
          const updates: Record<string, any> = {};
          if (body.full_name !== undefined) updates.full_name = String(body.full_name).trim();
          if (body.student_number !== undefined) updates.student_number = String(body.student_number).trim().toUpperCase();
          if (body.email !== undefined) updates.email = String(body.email).trim().toLowerCase();
          if (body.role !== undefined) updates.role = body.role;
          if (body.coins !== undefined) updates.coins = Math.max(0, parseInt(body.coins, 10) || 0);

          if (Object.keys(updates).length > 0) {
            const { error: updateErr } = await client.from('profiles').update(updates).eq('id', targetUserId);
            if (updateErr) {
              return NextResponse.json({ success: false, error: updateErr.message }, { status: 400 });
            }
          }

          return NextResponse.json({ success: true, message: 'Perfil de alumno actualizado correctamente.' });
        }

        // 5. Eliminar usuario permanentemente
        else if (action === 'delete_user') {
          await client.from('profiles').delete().eq('id', targetUserId);

          // Si el admin API de Supabase Auth está disponible, borrar también auth.users
          try {
            if (client.auth && client.auth.admin) {
              await client.auth.admin.deleteUser(targetUserId);
            }
          } catch {}

          return NextResponse.json({ success: true, message: 'Usuario eliminado permanentemente de la plataforma.' });
        }
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Acción procesada correctamente.',
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error?.message || 'Error al ejecutar acción de administrador.' },
      { status: 500 }
    );
  }
}
