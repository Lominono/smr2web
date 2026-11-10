import { NextRequest, NextResponse } from 'next/server';
import { verifyUserSession } from '@/lib/adminAuth';
import { createAdminClient, isServerSupabaseConfigured } from '@/lib/supabase/server';
import { isUUID } from '@/lib/uuid';
import { logEvent } from '@/lib/logger';

export const dynamic = 'force-dynamic';

// Límite máximo de ganancia permitido en una sola sincronización ordinaria (anti-trampas / memory hacks)
const MAX_DELTA_SINGLE_SYNC = 500000;
const MIN_NEGATIVE_DELTA = -5000000;

// Rate-limiting en memoria por usuario para sincronizaciones continuas
interface SyncRateLimit {
  count: number;
  lastReset: number;
}
const syncRateMap = new Map<string, SyncRateLimit>();
const MAX_SYNCS_PER_MINUTE = 60;

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

    // Detección anti-trampas: rechazar inyecciones numéricas absurdas
    if (delta > MAX_DELTA_SINGLE_SYNC) {
      try {
        await logEvent({
          eventType: 'balance_adjusted',
          userId,
          username: session.user.username,
          req,
          details: {
            alert: 'EXCESSIVE_DELTA_BLOCKED',
            attemptedDelta: delta,
            maxAllowed: MAX_DELTA_SINGLE_SYNC,
          },
        });
      } catch {}

      return NextResponse.json(
        {
          success: false,
          error: `Transacción sospechosa bloqueada: El incremento (+${delta.toLocaleString()}) supera el límite de seguridad permitido por sincronización.`,
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
