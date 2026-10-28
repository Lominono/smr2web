import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminSession } from '@/lib/adminAuth';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const authResult = await verifyAdminSession(req);
    if (!authResult.authorized) {
      return NextResponse.json(
        { authorized: false, error: authResult.error || 'Acceso restringido a administradores.' },
        { status: authResult.status }
      );
    }

    return NextResponse.json({
      authorized: true,
      user: authResult.user,
    });
  } catch (error: any) {
    return NextResponse.json(
      { authorized: false, error: error?.message || 'Error de verificación.' },
      { status: 500 }
    );
  }
}
