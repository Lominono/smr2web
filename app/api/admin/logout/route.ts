import { NextRequest, NextResponse } from 'next/server';
import { COOKIE_ADMIN_TOKEN } from '@/lib/adminAuth';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const response = NextResponse.json({
    success: true,
    message: 'Sesión de administrador cerrada correctamente.',
  });

  // Eliminar la cookie HttpOnly del token de administración
  response.cookies.set(COOKIE_ADMIN_TOKEN, '', {
    path: '/',
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 0,
  });

  return response;
}
