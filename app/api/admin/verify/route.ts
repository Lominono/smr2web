import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminSession, verifyUserSession } from '@/lib/adminAuth';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const authResult = await verifyAdminSession(req);
    if (authResult.authorized && authResult.user) {
      return NextResponse.json({
        authorized: true,
        user: authResult.user,
        account: {
          isAuthenticated: true,
          id: authResult.user.id,
          username: authResult.user.username,
          role: 'admin',
          isAdmin: true,
        },
      });
    }

    // Si aún no está elevado con clave de administrador, comprobar qué usuario está logueado en la sesión activa
    const sessionInfo = await verifyUserSession();

    return NextResponse.json(
      {
        authorized: false,
        error: authResult.error || 'Acceso restringido a administradores.',
        account: sessionInfo.authenticated && sessionInfo.user
          ? {
              isAuthenticated: true,
              id: sessionInfo.user.id,
              username: sessionInfo.user.username,
              email: sessionInfo.user.email,
              role: sessionInfo.user.role || 'student',
              isAdmin: sessionInfo.user.role === 'admin',
            }
          : {
              isAuthenticated: false,
              isAdmin: false,
            },
      },
      { status: authResult.status || 401 }
    );
  } catch (error: any) {
    return NextResponse.json(
      { authorized: false, error: error?.message || 'Error de verificación de credenciales.' },
      { status: 500 }
    );
  }
}
