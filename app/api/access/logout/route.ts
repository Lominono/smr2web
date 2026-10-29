import { NextResponse } from 'next/server';
import { COOKIE_EARLY_ACCESS_TOKEN } from '@/lib/adminAuth';

export const dynamic = 'force-dynamic';

export async function POST() {
  const response = NextResponse.json({
    success: true,
    message: 'Sesión de acceso anticipado cerrada.',
  });

  response.cookies.set(COOKIE_EARLY_ACCESS_TOKEN, '', {
    path: '/',
    maxAge: 0,
    httpOnly: true,
  });

  return response;
}
