import { NextRequest, NextResponse } from 'next/server';
import { logEvent } from '@/lib/logger';
import { EventType } from '@/lib/russianRoulette';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { eventType, userId, username, details } = body;

    const allowedTypes: EventType[] = [
      'user_register',
      'user_login_success',
      'user_login_failed',
      'user_logout',
    ];

    if (!allowedTypes.includes(eventType)) {
      return NextResponse.json(
        { success: false, error: 'Tipo de evento de autenticación no admitido.' },
        { status: 400 }
      );
    }

    await logEvent({
      eventType,
      userId: userId || null,
      username: username || null,
      req,
      details: details || {},
    });

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err?.message || 'Error al registrar log de autenticación.' },
      { status: 500 }
    );
  }
}
