import { NextRequest } from 'next/server';
import { createAdminClient, isServerSupabaseConfigured } from '@/lib/supabase/server';
import { verifyUserSession } from '@/lib/adminAuth';
import { enforceRateLimit, fail, guardOrigin, json, readJsonBody, unauthorized } from '@/lib/security/http';
import { RATE_LIMITS } from '@/lib/security/rateLimit';
import { securityEvent } from '@/lib/security/audit';
import { applyCoinDelta, recordBalanceTransaction } from '@/lib/security/wallet';
import { isUUID } from '@/lib/uuid';
import { getPetById } from '@/lib/pets';

export const dynamic = 'force-dynamic';

/**
 * POST /api/pets/purchase
 *
 * Compra de mascotas exclusiva del servidor. SEGURIDAD:
 * - El precio SIEMPRE se lee del registro (`lib/pets.ts`), nunca del cliente.
 * - El saldo se comprueba y descuenta en el servidor con bloqueo optimista
 *   (dos compras simultáneas no pueden cobrar dos veces ni sobregirar).
 * - La mascota concedida se añade a `mascotas_desbloqueadas` en la misma
 *   transacción: ni el cliente ni /api/user/profile pueden autoconcederla.
 */
export async function POST(req: NextRequest) {
  const originError = guardOrigin(req);
  if (originError) return originError;

  const session = await verifyUserSession();
  if (!session.authenticated || !session.user || !isUUID(session.user.id)) {
    return unauthorized('Debes iniciar sesión para adoptar mascotas.');
  }

  const user = session.user;
  const rate = enforceRateLimit(`pet-buy:${user.id}`, RATE_LIMITS.profileWrite);
  if (!rate.ok) return rate.response;

  if (!isServerSupabaseConfigured()) {
    return fail('La tienda solo está disponible con la base de datos conectada.', 503);
  }

  const client = createAdminClient();
  if (!client) return fail('Base de datos no disponible.', 503);

  const body = await readJsonBody(req);
  if (!body) return fail('Petición no válida.', 400);

  const petId = String(body.petId || '').trim();
  const pet = getPetById(petId);
  if (!pet) {
    return fail('Esa mascota no existe en el catálogo.', 400);
  }

  const { data: profile, error: profileError } = await client
    .from('profiles')
    .select('id, username, coins, is_banned, mascotas_desbloqueadas, items_comprados')
    .eq('id', user.id)
    .maybeSingle();

  if (profileError || !profile) return fail('Perfil de usuario no encontrado.', 404);
  if (profile.is_banned) return fail('Cuenta suspendida por la administración.', 403);

  const owned: string[] = Array.isArray(profile.mascotas_desbloqueadas)
    ? profile.mascotas_desbloqueadas
    : [];
  const existingItems: string[] = Array.isArray(profile.items_comprados)
    ? profile.items_comprados
    : [];

  if (owned.includes(pet.id)) {
    return fail(`Ya has adoptado a ${pet.name}. Puedes equiparla desde tu colección.`, 400);
  }

  const balance = Number(profile.coins ?? 0);
  if (balance < pet.price) {
    return fail(
      `Saldo insuficiente para adoptar a ${pet.name}. Necesitas ${pet.price.toLocaleString('es-ES')} monedas (tienes ${balance.toLocaleString('es-ES')}).`,
      400
    );
  }

  // Descuenta el precio y concede la mascota en la MISMA actualización atómica
  const nextOwned = Array.from(new Set([...owned, pet.id]));
  const nextItems = Array.from(new Set([...existingItems, `pet_${pet.id}`]));

  const applied = await applyCoinDelta(client, user.id, -pet.price, {
    mascotas_desbloqueadas: nextOwned,
    mascota_equipada: pet.id,
    items_comprados: nextItems,
  });

  if (!applied.ok) {
    return fail('El saldo cambió mientras se procesaba la compra. Reinténtalo.', 409);
  }

  await recordBalanceTransaction(client, {
    userId: user.id,
    amount: -pet.price,
    balanceBefore: balance,
    balanceAfter: applied.coins,
    type: 'purchase',
    description: `Adopción de mascota: ${pet.name}`,
  });

  await securityEvent({
    action: 'pet_purchase',
    userId: user.id,
    username: user.username,
    req,
    details: { petId: pet.id, price: pet.price, balanceBefore: balance, balanceAfter: applied.coins },
  });

  // Anuncio en el Feed (best effort)
  try {
    await client.from('chat_messages').insert([
      {
        username: 'SMR2',
        text: `🐾 ¡Nueva adopción en la Tienda de Mascotas! @${user.username} ha adoptado a ${pet.name} por ${pet.price.toLocaleString('es-ES')} monedas.`,
        tag: 'aviso',
        pinned: false,
      },
    ]);
  } catch {}

  return json({
    success: true,
    coins: applied.coins,
    mascotaEquipada: pet.id,
    mascotasDesbloqueadas: nextOwned,
    message: `¡Has adoptado a ${pet.name}! Ya está equipada en tu perfil.`,
  });
}
