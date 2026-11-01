import { NextRequest, NextResponse } from 'next/server';
import { joinRoomServer } from '@/lib/russianRouletteServer';
import { verifyUserSession } from '@/lib/adminAuth';
import { UserProfile } from '@/lib/types';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { roomId, user: clientUser } = body;

    if (!roomId) {
      return NextResponse.json(
        { success: false, error: 'Identificador de sala o código requerido.' },
        { status: 400 }
      );
    }

    const serverSession = await verifyUserSession();
    const user: UserProfile | null = serverSession.user || clientUser;

    if (!user || !user.id || !user.username) {
      return NextResponse.json(
        { success: false, error: 'Debes iniciar sesión para unirte a la sala.' },
        { status: 401 }
      );
    }

    const room = await joinRoomServer(user, roomId, req);

    return NextResponse.json({ success: true, room });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error?.message || 'Error al unirse a la sala.' },
      { status: 400 }
    );
  }
}
