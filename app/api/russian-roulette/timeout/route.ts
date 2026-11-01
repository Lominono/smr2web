import { NextRequest, NextResponse } from 'next/server';
import { triggerActionServer } from '@/lib/russianRouletteServer';
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

    // Timeout can be triggered by server ping or any room participant
    const dummyUser: UserProfile = user || {
      id: 'system_timeout',
      username: 'Sistema',
      coins: 0,
      biggest_win: 0,
    };

    const result = await triggerActionServer(dummyUser, roomId, true, req);

    return NextResponse.json({ success: true, timeoutTriggered: true, ...result });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error?.message || 'Error al procesar el timeout.' },
      { status: 400 }
    );
  }
}
