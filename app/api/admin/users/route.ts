import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminSession } from '@/lib/adminAuth';
import { createAdminClient, isServerSupabaseConfigured } from '@/lib/supabase/server';
import { logEvent } from '@/lib/logger';
import { isUUID } from '@/lib/uuid';
import { csvCell, enforceRateLimit, guardOrigin } from '@/lib/security/http';
import { applyCoinDelta } from '@/lib/security/wallet';

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
        csvCell(u.id),
        csvCell(u.username),
        csvCell(u.full_name),
        csvCell(u.student_number),
        csvCell(u.email),
        csvCell(u.role || 'student'),
        Number(u.coins || 0),
        Number(u.games_won || 0),
        Number(u.games_played || 0),
        u.is_banned ? 'SI' : 'NO',
        csvCell(u.created_at),
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
  const originError = guardOrigin(req);
  if (originError) return originError;

  try {
    const authResult = await verifyAdminSession(req);
    if (!authResult.authorized || !authResult.user) {
      return NextResponse.json(
        { success: false, error: 'Acceso no autorizado.' },
        { status: 403 }
      );
    }

    const rate = enforceRateLimit(`admin-users:${authResult.user.id}`, {
      limit: 60,
      windowMs: 60_000,
    });
    if (!rate.ok) return rate.response;

    const body = await req.json();
    const { action, targetUserId, amount, banReason } = body;

    // Acción global: Aplicar ciclo de Goteo Comunista a todas las ballenas (>100.000 monedas)
    if (action === 'communist_drip_all') {
      if (!isServerSupabaseConfigured()) {
        return NextResponse.json({ success: false, error: 'Base de datos no configurada.' }, { status: 500 });
      }
      const client = createAdminClient();
      if (!client) {
        return NextResponse.json({ success: false, error: 'Cliente de base de datos no disponible.' }, { status: 500 });
      }

      const { data: whales, error: wErr } = await client
        .from('profiles')
        .select('id, username, coins')
        .gte('coins', 100000);

      if (wErr) {
        return NextResponse.json({ success: false, error: wErr.message }, { status: 500 });
      }

      let totalCollected = 0;
      let taxedCount = 0;

      for (const whale of whales || []) {
        const curCoins = Number(whale.coins || 0);
        // Tasa progresiva para ballenas: 2% (100k), 3.5% (1M), 5.5% (10M), 8% (>50M)
        let rate = 0.02;
        if (curCoins >= 50000000) rate = 0.08;
        else if (curCoins >= 10000000) rate = 0.055;
        else if (curCoins >= 1000000) rate = 0.035;

        const taxAmount = Math.max(1500, Math.floor(curCoins * rate));
        const newBalance = Math.max(0, curCoins - taxAmount);

        await client.from('profiles').update({ coins: newBalance }).eq('id', whale.id);
        totalCollected += taxAmount;
        taxedCount++;
      }

      // 2. Redistribuir equitativamente la recaudación entre alumnos con menos de 25.000 monedas
      let distributedCount = 0;
      let totalDistributed = 0;
      if (totalCollected > 0) {
        const { data: underdogs } = await client
          .from('profiles')
          .select('id, username, coins')
          .lt('coins', 25000);

        if (underdogs && underdogs.length > 0) {
          const payoutPerStudent = Math.min(15000, Math.max(1000, Math.floor(totalCollected / underdogs.length)));
          for (const underdog of underdogs) {
            const currentBalance = Number(underdog.coins || 0);
            await client
              .from('profiles')
              .update({ coins: currentBalance + payoutPerStudent })
              .eq('id', underdog.id);
            distributedCount++;
            totalDistributed += payoutPerStudent;
          }
        }
      }

      try {
        await logEvent({
          eventType: 'admin_action',
          userId: authResult.user.id,
          username: authResult.user.username,
          req,
          details: {
            action: 'communist_drip_cycle',
            taxed_whales_count: taxedCount,
            total_collected: totalCollected,
            underdogs_helped: distributedCount,
            total_distributed: totalDistributed,
          },
        });
      } catch {}

      return NextResponse.json({
        success: true,
        message: `Ciclo de Goteo Comunista ejecutado: Se recaudaron ${totalCollected.toLocaleString()} monedas de ${taxedCount} grandes fortunas y se repartieron ${totalDistributed.toLocaleString()} monedas entre ${distributedCount} alumnos novatos.`,
        taxedCount,
        totalCollected,
        distributedCount,
        totalDistributed,
      });
    }

    if (!targetUserId || !isUUID(String(targetUserId))) {
      return NextResponse.json(
        { success: false, error: 'targetUserId válido es requerido.' },
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
          if (!Number.isFinite(delta) || !Number.isInteger(delta)) {
            return NextResponse.json({ success: false, error: 'Cantidad inválida.' }, { status: 400 });
          }

          // Bloqueo optimista: si el alumno está jugando y su saldo cambia
          // entre la lectura y la escritura, se reintenta en vez de perder el
          // ajuste (antes se escribía un valor calculado con datos viejos).
          const applied = await applyCoinDelta(client, targetUserId, delta);
          if (!applied.ok) {
            return NextResponse.json(
              {
                success: false,
                error: 'El saldo del alumno cambió mientras se aplicaba el ajuste. Vuelve a intentarlo.',
              },
              { status: 409 }
            );
          }

          const newCoins = applied.coins;
          const curCoins = Number(targetUser.coins || 0);

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
          if (targetUserId === authResult.user.id && body.role !== 'admin') {
            return NextResponse.json(
              { success: false, error: 'No puedes rebajarte tu propio rol de administrador.' },
              { status: 400 }
            );
          }
          const newRole = body.role === 'admin' ? 'admin' : body.role === 'delegado' ? 'delegado' : 'student';
          await client.from('profiles').update({ role: newRole }).eq('id', targetUserId);
          try {
            await logEvent({
              eventType: 'admin_action',
              userId: targetUserId,
              username: targetUser.username,
              req,
              details: {
                action: 'set_role',
                new_role: newRole,
                admin_id: authResult.user.id,
                admin_username: authResult.user.username,
              },
            });
          } catch {}
          return NextResponse.json({ success: true, newRole });
        }

        // 4. Edición completa de datos de alumno (Nombre, NIA, Email, Fichas, Rol)
        else if (action === 'edit_profile') {
          const updates: Record<string, any> = {};
          if (body.full_name !== undefined) updates.full_name = String(body.full_name).trim();
          if (body.student_number !== undefined) updates.student_number = String(body.student_number).trim().toUpperCase();
          if (body.email !== undefined) {
            const cleanNewEmail = String(body.email).trim().toLowerCase();
            if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanNewEmail)) {
              return NextResponse.json({ success: false, error: 'Correo electrónico no válido.' }, { status: 400 });
            }
            updates.email = cleanNewEmail;
          }
          // SEGURIDAD: whitelist estricta — antes se aceptaba cualquier string
          // como rol y corrumpía la jerarquía de permisos.
          if (body.role !== undefined) {
            updates.role =
              body.role === 'admin' ? 'admin' : body.role === 'delegado' ? 'delegado' : 'student';
          }
          if (body.coins !== undefined) updates.coins = Math.max(0, parseInt(body.coins, 10) || 0);

          if (Object.keys(updates).length > 0) {
            const { error: updateErr } = await client.from('profiles').update(updates).eq('id', targetUserId);
            if (updateErr) {
              return NextResponse.json({ success: false, error: updateErr.message }, { status: 400 });
            }
            try {
              await logEvent({
                eventType: 'admin_action',
                userId: targetUserId,
                username: targetUser.username,
                req,
                details: {
                  action: 'edit_profile',
                  fields: Object.keys(updates),
                  admin_id: authResult.user.id,
                  admin_username: authResult.user.username,
                },
              });
            } catch {}
          }

          return NextResponse.json({ success: true, message: 'Perfil de alumno actualizado correctamente.' });
        }

        // 5. Restablecer Botellón (limpia progreso y resetea monedas a 1000)
        else if (action === 'reset_botellon') {
          await client
            .from('profiles')
            .update({
              party_farm_data: {},
              coins: 1000,
            })
            .eq('id', targetUserId);

          try {
            await logEvent({
              eventType: 'admin_action',
              userId: targetUserId,
              username: targetUser.username,
              req,
              details: {
                action: 'reset_botellon',
                admin_id: authResult.user.id,
                admin_username: authResult.user.username,
              },
            });
          } catch {}

          return NextResponse.json({ success: true, message: 'Botellón del alumno restablecido a valores iniciales.' });
        }

        // 6. Eliminar usuario permanentemente
        else if (action === 'delete_user') {
          if (targetUserId === authResult.user.id) {
            return NextResponse.json(
              { success: false, error: 'No puedes eliminar tu propia cuenta de administrador activa.' },
              { status: 400 }
            );
          }
          await client.from('profiles').delete().eq('id', targetUserId);

          // Si el admin API de Supabase Auth está disponible, borrar también auth.users
          try {
            if (client.auth && client.auth.admin) {
              await client.auth.admin.deleteUser(targetUserId);
            }
          } catch {}

          try {
            await logEvent({
              eventType: 'admin_action',
              userId: targetUserId,
              username: targetUser.username,
              req,
              details: {
                action: 'delete_user',
                deleted_username: targetUser.username,
                admin_id: authResult.user.id,
                admin_username: authResult.user.username,
              },
            });
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
