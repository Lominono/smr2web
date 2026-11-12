import { NextRequest } from 'next/server';
import { createAdminClient, isServerSupabaseConfigured } from '@/lib/supabase/server';
import { verifyUserSession } from '@/lib/adminAuth';
import { isUUID } from '@/lib/uuid';
import { enforceRateLimit, fail, guardOrigin, json, readJsonBody, unauthorized } from '@/lib/security/http';
import { recordBalanceTransaction } from '@/lib/security/wallet';

export const dynamic = 'force-dynamic';

const MIN_TIP = 1;
const MAX_TIP = 500;

/**
 * POST /api/user/tip
 *
 * Propina entre alumnos. Antes el navegador sumaba las monedas al receptor
 * escribiendo directamente en `profiles` (cualquiera podía regalarse dinero
 * o inyectar saldo a terceros). Ahora la transferencia es atómica y validada
 * en el servidor: se descuenta al emisor y se abona al receptor.
 */
export async function POST(req: NextRequest) {
  const originError = guardOrigin(req);
  if (originError) return originError;

  try {
    const session = await verifyUserSession();
    if (!session.authenticated || !session.user || !isUUID(session.user.id)) {
      return unauthorized('Debes iniciar sesión para enviar una propina.');
    }

    const senderId = session.user.id;

    const rate = enforceRateLimit(`tip:${senderId}`, { limit: 20, windowMs: 60_000 });
    if (!rate.ok) return rate.response;

    const body = await readJsonBody(req);
    if (!body) return fail('Petición no válida.', 400);

    const targetUsername = String(body.targetUsername || '').trim().toLowerCase().replace(/^@/, '');
    const amount = Math.trunc(Number(body.amount));

    if (!targetUsername || !/^[a-z0-9_]{3,20}$/.test(targetUsername)) {
      return fail('El usuario de destino no es válido.', 400);
    }

    if (!Number.isFinite(amount) || amount < MIN_TIP || amount > MAX_TIP) {
      return fail(`La propina debe estar entre ${MIN_TIP} y ${MAX_TIP} monedas.`, 400);
    }

    if (!isServerSupabaseConfigured()) {
      return fail('La base de datos no está disponible.', 503);
    }

    const client = createAdminClient();
    if (!client) return fail('La base de datos no está disponible.', 503);

    const { data: sender } = await client
      .from('profiles')
      .select('id, username, coins, is_banned')
      .eq('id', senderId)
      .maybeSingle();

    if (!sender || sender.is_banned) {
      return fail('No puedes enviar propinas ahora mismo.', 403);
    }

    const { data: receiver } = await client
      .from('profiles')
      .select('id, username, coins, is_banned')
      .ilike('username', targetUsername)
      .maybeSingle();

    if (!receiver) return fail('No se ha encontrado a ese alumno.', 404);
    if (receiver.is_banned) return fail('Ese alumno está suspendido.', 400);
    if (receiver.id === senderId) return fail('No puedes enviarte una propina a ti mismo.', 400);

    const senderCoins = Number(sender.coins ?? 0);
    if (senderCoins < amount) {
      return fail(`Saldo insuficiente. Tienes ${senderCoins.toLocaleString()} monedas.`, 400);
    }

    const receiverCoins = Number(receiver.coins ?? 0);
    const senderNext = senderCoins - amount;
    const receiverNext = receiverCoins + amount;

    // 1. Descontar al emisor (condicional para evitar dobles gastos)
    const { data: debited, error: debitError } = await client
      .from('profiles')
      .update({ coins: senderNext })
      .eq('id', senderId)
      .eq('coins', sender.coins)
      .select('coins');

    if (debitError || !debited || debited.length === 0) {
      return fail('Tu saldo cambió mientras se enviaba la propina. Inténtalo de nuevo.', 409);
    }

    // 2. Abonar al receptor
    const { data: credited, error: creditError } = await client
      .from('profiles')
      .update({ coins: receiverNext })
      .eq('id', receiver.id)
      .eq('coins', receiver.coins)
      .select('coins');

    if (creditError || !credited || credited.length === 0) {
      // Reembolso si el receptor cambió de saldo en paralelo
      await client
        .from('profiles')
        .update({ coins: senderCoins })
        .eq('id', senderId)
        .eq('coins', senderNext);
      return fail('No se pudo completar la propina. Inténtalo de nuevo.', 409);
    }

    await recordBalanceTransaction(client, {
      userId: senderId,
      amount: -amount,
      balanceBefore: senderCoins,
      balanceAfter: senderNext,
      type: 'tip_sent',
      description: `Propina enviada a @${receiver.username}`,
    });

    await recordBalanceTransaction(client, {
      userId: receiver.id,
      amount,
      balanceBefore: receiverCoins,
      balanceAfter: receiverNext,
      type: 'tip_received',
      description: `Propina recibida de @${sender.username}`,
    });

    return json({ success: true, coins: senderNext, target: receiver.username });
  } catch (err) {
    return fail((err as Error)?.message || 'Error al enviar la propina.', 500);
  }
}
