import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient, isServerSupabaseConfigured } from '@/lib/supabase/server';
import { logEvent } from '@/lib/logger';
import { isUUID } from '@/lib/uuid';
import { verifyUserSession } from '@/lib/adminAuth';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export interface DonorEntry {
  userId: string;
  username: string;
  totalDonated: number;
  lastDonationDate: string;
  badge: 'gran_mecenas' | 'padrino' | 'protector' | 'colaborador';
}

function getDonationBadge(total: number): 'gran_mecenas' | 'padrino' | 'protector' | 'colaborador' {
  if (total >= 1_000_000_000) return 'gran_mecenas'; // ≥ 1 Mil Millón (1B)
  if (total >= 100_000_000) return 'padrino';       // ≥ 100 Millones (100M)
  if (total >= 10_000_000) return 'protector';      // ≥ 10 Millones (10M)
  return 'colaborador';
}

// Memoria volátil exclusivamente para entornos sin base de datos configurada (desarrollo puro offline)
let inMemoryPoolTotal = 0;
const inMemoryDonors: Record<string, DonorEntry> = {};

export async function GET() {
  try {
    if (!isServerSupabaseConfigured()) {
      const sorted = Object.values(inMemoryDonors).sort((a, b) => b.totalDonated - a.totalDonated);
      return NextResponse.json({
        success: true,
        poolTotal: inMemoryPoolTotal,
        donors: sorted.slice(0, 20),
      });
    }

    const adminClient = createAdminClient();
    if (!adminClient) {
      const sorted = Object.values(inMemoryDonors).sort((a, b) => b.totalDonated - a.totalDonated);
      return NextResponse.json({
        success: true,
        poolTotal: inMemoryPoolTotal,
        donors: sorted.slice(0, 20),
      });
    }

    // Consultar exclusivamente perfiles reales con donaciones registradas
    const { data: profiles, error } = await adminClient
      .from('profiles')
      .select('id, username, party_farm_data')
      .not('party_farm_data', 'is', null);

    if (error || !profiles) {
      const sorted = Object.values(inMemoryDonors).sort((a, b) => b.totalDonated - a.totalDonated);
      return NextResponse.json({
        success: true,
        poolTotal: inMemoryPoolTotal,
        donors: sorted.slice(0, 20),
      });
    }

    let totalPool = 0;
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
          badge: getDonationBadge(donated),
        });
      }
    }

    donorsList.sort((a, b) => b.totalDonated - a.totalDonated);

    return NextResponse.json({
      success: true,
      poolTotal: totalPool,
      donors: donorsList.slice(0, 30),
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
        { success: false, error: 'Debes iniciar sesión para realizar una donación.' },
        { status: 401 }
      );
    }

    const userId = session.user.id;
    const username = session.user.username;

    const body = await req.json().catch(() => ({}));
    const { amount } = body;

    const parsedAmount = Math.floor(Number(amount));
    if (!parsedAmount || isNaN(parsedAmount) || parsedAmount < 1000) {
      return NextResponse.json(
        { success: false, error: 'La donación mínima es de 1.000 monedas.' },
        { status: 400 }
      );
    }

    // 1. Manejo con Supabase
    if (isServerSupabaseConfigured() && isUUID(userId)) {
      const adminClient = createAdminClient();
      if (adminClient) {
        // Verificar saldo real del usuario en la base de datos
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
            { success: false, error: 'Error al procesar la donación en base de datos: ' + updateErr.message },
            { status: 500 }
          );
        }

        // Registrar en transacciones
        try {
          await adminClient.from('balance_transactions').insert([
            {
              user_id: userId,
              amount: -parsedAmount,
              balance_before: currentCoins,
              balance_after: nextCoins,
              type: 'donation',
              description: `Donación al Fondo de Mecenazgo de Clase (${parsedAmount.toLocaleString()} 🪙)`,
            },
          ]);
        } catch {}

        // Registrar en auditoría
        try {
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
        } catch {}

        // Recalcular total real del bote consultando a todos los donantes
        let totalPool = nextDonated;
        try {
          const { data: allProfiles } = await adminClient
            .from('profiles')
            .select('id, party_farm_data')
            .not('party_farm_data', 'is', null);

          if (allProfiles) {
            totalPool = allProfiles.reduce((acc, p: any) => {
              const d = Number(p.party_farm_data?.totalDonated || p.party_farm_data?.total_donated || 0);
              return acc + (d > 0 ? d : 0);
            }, 0);
          }
        } catch {}

        return NextResponse.json({
          success: true,
          poolTotal: totalPool,
          newCoins: nextCoins,
          totalDonated: nextDonated,
          badge: getDonationBadge(nextDonated),
        });
      }
    }

    // Modo fallback en memoria para entornos locales sin backend
    inMemoryPoolTotal += parsedAmount;
    const prev = inMemoryDonors[userId]?.totalDonated || 0;
    const nextTotal = prev + parsedAmount;
    inMemoryDonors[userId] = {
      userId,
      username,
      totalDonated: nextTotal,
      lastDonationDate: new Date().toISOString(),
      badge: getDonationBadge(nextTotal),
    };

    return NextResponse.json({
      success: true,
      poolTotal: inMemoryPoolTotal,
      newCoins: Math.max(0, 1000 - parsedAmount),
      totalDonated: nextTotal,
      badge: getDonationBadge(nextTotal),
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message || 'Error al procesar la donación' },
      { status: 500 }
    );
  }
}
