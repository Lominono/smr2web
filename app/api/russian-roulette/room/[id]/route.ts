import { NextRequest, NextResponse } from 'next/server';
import { getRoomById } from '@/lib/russianRouletteServer';

export const dynamic = 'force-dynamic';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const room = await getRoomById(id);

    if (!room) {
      return NextResponse.json(
        { success: false, error: 'Sala no encontrada.' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, room });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error?.message || 'Error al obtener la sala.' },
      { status: 500 }
    );
  }
}
