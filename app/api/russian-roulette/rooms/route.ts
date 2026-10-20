import { NextRequest, NextResponse } from 'next/server';
import { getRooms, createRoomServer } from '@/lib/russianRouletteServer';
import { verifyUserSession } from '@/lib/adminAuth';
import { UserProfile } from '@/lib/types';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const rooms = await getRooms();
    return NextResponse.json({ success: true, rooms });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error?.message || 'Error al obtener salas.' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, betAmount, maxPlayers, user: clientUser } = body;

    // Verify session
    const serverSession = await verifyUserSession();
    const user: UserProfile | null = serverSession.user || clientUser;

    if (!user || !user.id || !user.username) {
      return NextResponse.json(
        { success: false, error: 'Debes iniciar sesión para crear una sala.' },
        { status: 401 }
      );
    }

    const room = await createRoomServer(
      user,
      name,
      Number(betAmount),
      Number(maxPlayers),
      req
    );

    return NextResponse.json({ success: true, room });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error?.message || 'Error al crear la sala.' },
      { status: 400 }
    );
  }
}
