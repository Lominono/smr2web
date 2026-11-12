import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient, isServerSupabaseConfigured } from '@/lib/supabase/server';
import { isUUID } from '@/lib/uuid';
import { verifyUserSession } from '@/lib/adminAuth';
import { enforceRateLimit, fail, guardOrigin } from '@/lib/security/http';
import { securityEvent } from '@/lib/security/audit';

export const dynamic = 'force-dynamic';

/** Tiempo mínimo entre renacimientos (evita farmear el bono en bucle). */
const REBIRTH_COOLDOWN_MS = 2 * 60 * 1000;

function calculatePrestigeMultiplier(count: number): number {
  if (count <= 0) return 1.0;
  // Escalado gratificante y progresivo para Idle Game:
  // Rebirth 1: x2.00 (+100% producción total)
  // Rebirth 2: x3.50 (+150%)
  // Rebirth 3: x5.00 (+150%)
  // Rebirth 4: x6.50 (+150%)
  // Rebirth 5: x8.50 (+200%)
  // Rebirth 10: x18.50
  let mult = 1.0 + count * 1.0;
  if (count >= 2) mult += (count - 1) * 0.5;
  if (count >= 4) mult += (count - 3) * 0.5;
  if (count >= 7) mult += (count - 6) * 0.5;
  return Number(mult.toFixed(2));
}

export async function POST(req: NextRequest) {
  const originError = guardOrigin(req);
  if (originError) return originError;

  try {
    const session = await verifyUserSession();
    if (!session.authenticated || !session.user || !isUUID(session.user.id)) {
      return NextResponse.json(
        { success: false, error: 'Debes iniciar sesión para realizar un renacimiento.' },
        { status: 401 }
      );
    }

    const userId = session.user.id;

    const rate = enforceRateLimit(`rebirth:${userId}`, { limit: 3, windowMs: 5 * 60_000 });
    if (!rate.ok) return rate.response;

    if (!isServerSupabaseConfigured()) {
      return NextResponse.json(
        { success: false, error: 'Servicio de base de datos no configurado.' },
        { status: 503 }
      );
    }

    const client = createAdminClient();
    if (!client) {
      return NextResponse.json(
        { success: false, error: 'No se pudo conectar a la base de datos.' },
        { status: 500 }
      );
    }

    // 1. Obtener datos actuales del perfil
    const { data: profile, error: fetchErr } = await client
      .from('profiles')
      .select('id, coins, party_farm_data')
      .eq('id', userId)
      .maybeSingle();

    if (fetchErr || !profile) {
      return NextResponse.json(
        { success: false, error: 'Perfil no encontrado en la base de datos.' },
        { status: 404 }
      );
    }

    const currentFarm = (profile.party_farm_data && typeof profile.party_farm_data === 'object')
      ? profile.party_farm_data
      : {};

    // Cooldown persistido en servidor: el registro del último renacimiento
    // (balance_transactions) no lo puede manipular el navegador.
    try {
      const { data: lastRebirth } = await client
        .from('balance_transactions')
        .select('created_at')
        .eq('user_id', userId)
        .eq('type', 'rebirth')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (lastRebirth?.created_at) {
        const elapsed = Date.now() - new Date(lastRebirth.created_at).getTime();
        if (elapsed < REBIRTH_COOLDOWN_MS) {
          const remaining = Math.ceil((REBIRTH_COOLDOWN_MS - elapsed) / 1000);
          return fail(`Debes esperar ${remaining} segundo(s) antes de volver a renacer.`, 429);
        }
      }
    } catch {
      /* si la tabla no está disponible se continúa */
    }

    const currentPrestige = Number(currentFarm.afterPrestigeCount || currentFarm.rebirths || 0);
    // Cada renacimiento avanza estrictamente de 1 en 1 para evitar manipulaciones
    const newPrestigeCount = currentPrestige + 1;
    const now = Date.now();
    // Capital de siembra en fichas para arrancar produciendo inmediatamente tras renacer
    const startingSeedFichas = Math.min(250000, Math.max(2500, newPrestigeCount * 5000));

    // Bonus de fichas acumuladas calculado autoritativamente en servidor (máximo 50.000 monedas por renacimiento)
    const rawPendingVault = Number(currentFarm.pendingVault || 0);
    const bonusCoins = Math.min(50000, Math.max(0, Math.floor(rawPendingVault / 5)));
    const newCoins = Math.max(0, Number(profile.coins || 0) + bonusCoins);

    // Estado reseteado para el nuevo renacimiento con multiplicador y capital inicial garantizados
    const updatedFarm = {
      ...currentFarm,
      levels: {
        litronas: 0,
        hielos: 0,
        chupitos: 0,
        botellas: 0,
        altavoz: 0,
        barra_libre: 0,
        vip: 0,
      },
      pendingVault: startingSeedFichas,
      currentRunProduced: 0,
      hangoverLevel: 0,
      afterSuspicionLevel: 0,
      afterPrestigeCount: newPrestigeCount,
      rebirths: newPrestigeCount,
      lastAfterTimestamp: now,
      lastTickMs: now,
    };

    // 2. Persistir en la base de datos Supabase
    const { error: updateErr } = await client
      .from('profiles')
      .update({
        party_farm_data: updatedFarm,
        coins: newCoins,
      })
      .eq('id', userId);

    if (updateErr) {
      return NextResponse.json(
        { success: false, error: 'Error al guardar el renacimiento en la base de datos.' },
        { status: 500 }
      );
    }

    // Registro del renacimiento (sirve de cooldown server-side y de auditoría)
    try {
      await client.from('balance_transactions').insert([
        {
          user_id: userId,
          amount: bonusCoins,
          balance_before: Number(profile.coins || 0),
          balance_after: newCoins,
          type: 'rebirth',
          description: `Renacimiento #${newPrestigeCount} (bono ${bonusCoins.toLocaleString()} 🪙)`,
        },
      ]);
    } catch {}

    if (bonusCoins >= 50000) {
      await securityEvent({
        action: 'rebirth_max_bonus',
        userId,
        username: session.user.username,
        req,
        details: { newPrestigeCount, bonusCoins },
      });
    }

    const prestigeMultiplier = calculatePrestigeMultiplier(newPrestigeCount);

    return NextResponse.json({
      success: true,
      afterPrestigeCount: newPrestigeCount,
      prestigeMultiplier,
      bonusCoins,
      newCoins,
      party_farm_data: updatedFarm,
      message: `¡Renacimiento #${newPrestigeCount} completado con éxito! Multiplicador permanente: x${prestigeMultiplier.toFixed(2)}`,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error?.message || 'Error interno del servidor.' },
      { status: 500 }
    );
  }
}
