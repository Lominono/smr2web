import { NextRequest, NextResponse } from 'next/server';
import { verifyUserSession } from '@/lib/adminAuth';
import { createAdminClient, isServerSupabaseConfigured } from '@/lib/supabase/server';
import { isUUID } from '@/lib/uuid';
import { logEvent } from '@/lib/logger';

export const dynamic = 'force-dynamic';

// Límites de sincronización calibrados para la economía libre y desatada del aula:
// Permite que la progresión exponencial del botellón y compras de mascotas fluyan de forma natural sin topes artificiales
const MAX_DELTA_DAILY = 10_000;     // Máximo 10.000 monedas por reclamo diario
const MAX_DELTA_SPIN = 50_000;      // Máximo 50.000 monedas por ruleta diaria
const MAX_DELTA_RESCUE = 5_000;     // Máximo 5.000 monedas por fondo de rescate
// Para juego general, alijo del botellón, minijuegos y compras: sin topes arbitrarios (hasta 500 billones / 500T)
const MAX_DELTA_GAME_WIN = 500_000_000_000_000; 
const MIN_NEGATIVE_DELTA = -500_000_000_000_000; // Gasto máximo en compras o donaciones masivas

// Rate-limiting en memoria por usuario para sincronizaciones continuas
interface SyncRateLimit {
  count: number;
  lastReset: number;
}
const syncRateMap = new Map<string, SyncRateLimit>();
const MAX_SYNCS_PER_MINUTE = 300;

export async function POST(req: NextRequest) {
  try {
    const session = await verifyUserSession();
    if (!session.authenticated || !session.user || !isUUID(session.user.id)) {
      return NextResponse.json(
        { success: false, error: 'Sesión no iniciada o token inválido.' },
        { status: 401 }
      );
    }

    const userId = session.user.id;
    const now = Date.now();

    // Rate limiting por usuario (máximo 60 sincronizaciones por minuto)
    const rate = syncRateMap.get(userId) || { count: 0, lastReset: now };
    if (now - rate.lastReset > 60000) {
      rate.count = 0;
      rate.lastReset = now;
    }
    rate.count++;
    syncRateMap.set(userId, rate);

    if (rate.count > MAX_SYNCS_PER_MINUTE) {
      return NextResponse.json(
        { success: false, error: 'Frecuencia de sincronización excesiva. Espera unos momentos.' },
        { status: 429 }
      );
    }

    const body = await req.json().catch(() => ({}));
    const rawDelta = Number(body.delta ?? 0);
    const claimType = body.claimType as 'daily' | 'spin' | 'rescue' | 'game' | 'idle' | undefined;
    const newStreak = body.newStreak !== undefined ? Number(body.newStreak) : undefined;

    if (isNaN(rawDelta)) {
      return NextResponse.json(
        { success: false, error: 'Cantidad de delta inválida.' },
        { status: 400 }
      );
    }

    const delta = Math.round(rawDelta);

    // Detección anti-trampas: validar límites según el tipo de reclamo
    let maxAllowed = MAX_DELTA_GAME_WIN;
    if (claimType === 'daily') maxAllowed = MAX_DELTA_DAILY;
    else if (claimType === 'spin') maxAllowed = MAX_DELTA_SPIN;
    else if (claimType === 'rescue') maxAllowed = MAX_DELTA_RESCUE;

    if (delta > maxAllowed) {
      try {
        await logEvent({
          eventType: 'balance_adjusted',
          userId,
          username: session.user.username,
          req,
          details: {
            alert: 'EXCESSIVE_DELTA_BLOCKED',
            attemptedDelta: delta,
            maxAllowed,
            claimType,
          },
        });
      } catch {}

      return NextResponse.json(
        {
          success: false,
          error: `Transacción no autorizada: El incremento (+${delta.toLocaleString()}) supera el límite de seguridad permitido para esta acción.`,
        },
        { status: 400 }
      );
    }

    if (delta < MIN_NEGATIVE_DELTA) {
      return NextResponse.json(
        { success: false, error: 'Delta negativo fuera de rango seguro.' },
        { status: 400 }
      );
    }

    if (!isServerSupabaseConfigured()) {
      return NextResponse.json({
        success: true,
        coins: Math.max(0, (session.user.coins || 1000) + delta),
        isLocal: true,
      });
    }

    const client = createAdminClient();
    if (!client) {
      return NextResponse.json({ success: false, error: 'Base de datos no disponible.' }, { status: 500 });
    }

    // Consultar el perfil real actual desde la base de datos
    const { data: currentProfile, error: fetchErr } = await client
      .from('profiles')
      .select('id, username, coins, biggest_win, streak_count, last_claim_date, last_spin_date, last_rescue_date, is_banned')
      .eq('id', userId)
      .maybeSingle();

    if (fetchErr || !currentProfile) {
      return NextResponse.json(
        { success: false, error: 'Perfil de usuario no encontrado.' },
        { status: 404 }
      );
    }

    if (currentProfile.is_banned) {
      return NextResponse.json(
        { success: false, error: 'Cuenta suspendida por la administración.' },
        { status: 403 }
      );
    }

    const currentCoins = Number(currentProfile.coins ?? 1000);
    const newCoins = Math.max(0, currentCoins + delta);
    const isWin = delta > 0;
    const currentBiggestWin = Number(currentProfile.biggest_win ?? 0);
    const nextBiggestWin = isWin && delta > currentBiggestWin ? delta : currentBiggestWin;

    const updates: Record<string, any> = {
      coins: newCoins,
      biggest_win: nextBiggestWin,
    };

    const nowIso = new Date().toISOString();

    // Verificación de Cooldowns de servidor para recompensas
    if (claimType === 'daily') {
      const todayDate = nowIso.split('T')[0];
      const lastClaimStr = currentProfile.last_claim_date ? String(currentProfile.last_claim_date).split('T')[0] : '';
      if (lastClaimStr === todayDate) {
        return NextResponse.json(
          { success: false, error: 'Ya has reclamado tu recompensa diaria de hoy.' },
          { status: 400 }
        );
      }
      updates.last_claim_date = nowIso;
      if (newStreak !== undefined) {
        updates.streak_count = Math.max(1, newStreak);
      }
    } else if (claimType === 'spin') {
      updates.last_spin_date = nowIso;
    } else if (claimType === 'rescue') {
      if (currentCoins >= 50) {
        return NextResponse.json(
          { success: false, error: 'El fondo de rescate solo está disponible si tienes menos de 50 monedas.' },
          { status: 400 }
        );
      }
      updates.last_rescue_date = nowIso;
    }

    const { error: updateErr } = await client
      .from('profiles')
      .update(updates)
      .eq('id', userId);

    if (updateErr) {
      return NextResponse.json(
        { success: false, error: updateErr.message },
        { status: 500 }
      );
    }

    // Registrar en transacciones
    if (Math.abs(delta) >= 10) {
      try {
        await client.from('balance_transactions').insert([
          {
            user_id: userId,
            amount: delta,
            balance_before: currentCoins,
            balance_after: newCoins,
            type: claimType || 'game_sync',
            description: `Sincronización segura (${claimType || 'game'})`,
          },
        ]);
      } catch {}
    }

    return NextResponse.json({
      success: true,
      coins: newCoins,
      biggestWin: nextBiggestWin,
      streakCount: updates.streak_count ?? currentProfile.streak_count,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error?.message || 'Error al sincronizar saldo.' },
      { status: 500 }
    );
  }
}
