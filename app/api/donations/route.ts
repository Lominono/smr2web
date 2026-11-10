import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient, isServerSupabaseConfigured } from '@/lib/supabase/server';
import { logEvent } from '@/lib/logger';
import { isUUID } from '@/lib/uuid';
import { verifyUserSession } from '@/lib/adminAuth';

export const dynamic = 'force-dynamic';

export interface DonorEntry {
  userId: string;
  username: string;
  totalDonated: number;
  lastDonationDate: string;
  badge: 'magnate' | 'padrino' | 'mecenas' | 'colaborador';
}

function getBadge(total: number): 'magnate' | 'padrino' | 'mecenas' | 'colaborador' {
  if (total >= 10000000) return 'magnate';
  if (total >= 1000000) return 'padrino';
  if (total >= 100000) return 'mecenas';
  return 'colaborador';
}

// Respaldo en memoria por si Supabase está offline o para desarrollo local
let inMemoryPoolTotal = 150000; // Fondo inicial
const inMemoryDonors: Record<string, DonorEntry> = {
  'demo-magnate': {
    userId: 'demo-magnate',
    username: 'El_Patrón_SMR',
    totalDonated: 50000000,
    lastDonationDate: new Date().toISOString(),
    badge: 'magnate',
  },
  'demo-padrino': {
    userId: 'demo-padrino',
    username: 'Anonimo_Generoso',
    totalDonated: 5000000,
    lastDonationDate: new Date().toISOString(),
    badge: 'padrino',
  },
};

export async function GET() {
  try {
    if (!isServerSupabaseConfigured()) {
      const sorted = Object.values(inMemoryDonors).sort((a, b) => b.totalDonated - a.totalDonated);
      return NextResponse.json({
        success: true,
        poolTotal: inMemoryPoolTotal,
        donors: sorted.slice(0, 15),
      });
    }

    const adminClient = createAdminClient();
    if (!adminClient) {
      const sorted = Object.values(inMemoryDonors).sort((a, b) => b.totalDonated - a.totalDonated);
      return NextResponse.json({
        success: true,
        poolTotal: inMemoryPoolTotal,
        donors: sorted.slice(0, 15),
      });
    }

    // Consultar perfiles que hayan donado
    const { data: profiles, error } = await adminClient
      .from('profiles')
      .select('id, username, party_farm_data')
      .not('party_farm_data', 'is', null);

    if (error || !profiles) {
      const sorted = Object.values(inMemoryDonors).sort((a, b) => b.totalDonated - a.totalDonated);
      return NextResponse.json({
        success: true,
        poolTotal: inMemoryPoolTotal,
        donors: sorted.slice(0, 15),
      });
    }

    let totalPool = 150000;
    const donorsList: DonorEntry[] = [];

    for (const p of profiles) {
      const farmData = p.party_farm_data as any;
      const donated = Number(farmData?.totalDonated || farmData?.total_donated || 0);
      if (donated > 0) {
        totalPool += donated;
        donorsList.push({
          userId: p.id,
          username: p.username || 'Estudiante SMR',
          totalDonated: donated,
          lastDonationDate: farmData?.lastDonationDate || farmData?.last_donation_date || new Date().toISOString(),
          badge: getBadge(donated),
        });
      }
    }

    // Mezclar con memoria si aplica
    for (const d of Object.values(inMemoryDonors)) {
      if (!donorsList.some((item) => item.username === d.username)) {
        donorsList.push(d);
        totalPool += d.totalDonated;
      }
    }

    donorsList.sort((a, b) => b.totalDonated - a.totalDonated);

    return NextResponse.json({
      success: true,
      poolTotal: totalPool,
      donors: donorsList.slice(0, 20),
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message || 'Error al obtener donaciones' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await verifyUserSession();
    if (!session.authenticated || !session.user || !isUUID(session.user.id)) {
      return NextResponse.json(
        { success: false, error: 'Debes iniciar sesión para realizar donaciones.' },
        { status: 401 }
      );
    }

    const userId = session.user.id;
    const username = session.user.username;

    const body = await req.json().catch(() => ({}));
    const { amount } = body;

    const parsedAmount = Math.floor(Number(amount));
    if (!parsedAmount || parsedAmount < 1000) {
      return NextResponse.json(
        { success: false, error: 'La donación mínima es de 1.000 monedas.' },
        { status: 400 }
      );
    }

    // 1. Manejo con Supabase
    if (isServerSupabaseConfigured() && isUUID(userId)) {
      const adminClient = createAdminClient();
      if (adminClient) {
        // Verificar saldo real del usuario
        const { data: userProfile, error: fetchErr } = await adminClient
          .from('profiles')
          .select('id, coins, party_farm_data')
          .eq('id', userId)
          .maybeSingle();

        if (fetchErr || !userProfile) {
          return NextResponse.json(
            { success: false, error: 'No se encontró el perfil del usuario.' },
            { status: 404 }
          );
        }

        const currentCoins = Number(userProfile.coins || 0);
        if (currentCoins < parsedAmount) {
          return NextResponse.json(
            { success: false, error: `Saldo insuficiente. Tienes ${currentCoins.toLocaleString()} monedas.` },
            { status: 400 }
          );
        }

        const nextCoins = Math.max(0, currentCoins - parsedAmount);
        const prevFarm = (userProfile.party_farm_data as any) || {};
        const prevDonated = Number(prevFarm.totalDonated || prevFarm.total_donated || 0);
        const nextDonated = prevDonated + parsedAmount;

        const updatedFarm = {
          ...prevFarm,
          totalDonated: nextDonated,
          lastDonationDate: new Date().toISOString(),
        };

        const { error: updateErr } = await adminClient
          .from('profiles')
          .update({
            coins: nextCoins,
            party_farm_data: updatedFarm,
          })
          .eq('id', userId);

        if (updateErr) {
          return NextResponse.json(
            { success: false, error: 'Error al procesar la donación en base de datos.' },
            { status: 500 }
          );
        }

        // Registrar en logs
        await logEvent({
          eventType: 'donation' as any,
          userId,
          username,
          details: {
            amount: parsedAmount,
            previousCoins: currentCoins,
            newCoins: nextCoins,
            totalDonatedSoFar: nextDonated,
          },
          req,
        });

        // Actualizar memoria
        inMemoryPoolTotal += parsedAmount;
        inMemoryDonors[userId] = {
          userId,
          username,
          totalDonated: nextDonated,
          lastDonationDate: new Date().toISOString(),
          badge: getBadge(nextDonated),
        };

        return NextResponse.json({
          success: true,
          poolTotal: inMemoryPoolTotal,
          newCoins: nextCoins,
          totalDonated: nextDonated,
          badge: getBadge(nextDonated),
        });
      }
    }

    // Modo fallback en memoria
    inMemoryPoolTotal += parsedAmount;
    const prev = inMemoryDonors[userId]?.totalDonated || 0;
    const nextTotal = prev + parsedAmount;
    inMemoryDonors[userId] = {
      userId,
      username,
      totalDonated: nextTotal,
      lastDonationDate: new Date().toISOString(),
      badge: getBadge(nextTotal),
    };

    return NextResponse.json({
      success: true,
      poolTotal: inMemoryPoolTotal,
      newCoins: 1000,
      totalDonated: nextTotal,
      badge: getBadge(nextTotal),
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message || 'Error al procesar donación' },
      { status: 500 }
    );
  }
}
