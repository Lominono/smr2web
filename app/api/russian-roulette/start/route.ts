import { NextRequest, NextResponse } from 'next/server';
import { startGameServer } from '@/lib/russianRouletteServer';
import { verifyUserSession } from '@/lib/adminAuth';
import { UserProfile } from '@/lib/types';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { roomId, user: clientUser } = body;

    if (!roomId) {
      return NextResponse.json(
        { success: false, error: 'Identificador de sala requerido.' },
        { status: 400 }
      );
    }

    const serverSession = await verifyUserSession();
    const user: UserProfile | null = serverSession.user || clientUser;

    if (!user || !user.id || !user.username) {
      return NextResponse.json(
        { success: false, error: 'Debes iniciar sesión.' },
        { status: 401 }
      );
    }

    const game = await startGameServer(user, roomId, req);

    return NextResponse.json({ success: true, game });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error?.message || 'Error al iniciar la partida.' },
      { status: 400 }
    );
  }
}
