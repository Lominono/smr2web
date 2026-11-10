import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient, isServerSupabaseConfigured } from '@/lib/supabase/server';
import { isUUID } from '@/lib/uuid';

export const dynamic = 'force-dynamic';

function calculatePrestigeMultiplier(count: number): number {
  if (count <= 0) return 1.0;
  let mult = 1.0;
  for (let i = 1; i <= count; i++) {
    if (i === 1) mult += 0.35;
    else if (i <= 3) mult += 0.20;
    else if (i <= 6) mult += 0.12;
    else if (i <= 10) mult += 0.06;
    else mult += 0.02;
  }
  return Math.min(6.0, Number(mult.toFixed(2)));
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const userId = body.userId;

    if (!userId || !isUUID(userId)) {
      return NextResponse.json(
        { success: false, error: 'Identificador de usuario inválido.' },
        { status: 400 }
      );
    }

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

    const currentPrestige = Number(currentFarm.afterPrestigeCount || currentFarm.rebirths || 0);
    const newPrestigeCount = currentPrestige + 1;
    const now = Date.now();
    // Capital de siembra en fichas para arrancar produciendo inmediatamente tras renacer
    const startingSeedFichas = Math.max(800, newPrestigeCount * 1500);

    // Bonus de fichas acumuladas convertido a monedas reales (20% del bote acumulado)
    const pendingVault = Number(currentFarm.pendingVault || body.pendingVault || 0);
    const bonusCoins = Math.max(0, Math.floor(pendingVault / 5));
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
