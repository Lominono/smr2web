import { NextRequest, NextResponse } from 'next/server';
import { TARGET_LAUNCH_TIMESTAMP } from '@/lib/launchConfig';
import { verifyEarlyAccessSession } from '@/lib/adminAuth';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const isLaunched = Date.now() >= TARGET_LAUNCH_TIMESTAMP;

  if (isLaunched) {
    return NextResponse.json({
      unlocked: true,
      isLaunched: true,
      earlyAccess: false,
      role: 'public',
    });
  }

  // Verificación en el servidor del token firmado o sesión autorizada
  const authSession = await verifyEarlyAccessSession(req);

  if (authSession.authorized) {
    return NextResponse.json({
      unlocked: true,
      isLaunched: false,
      earlyAccess: true,
      role: authSession.role || 'developer',
      keyName: authSession.keyName || 'authenticated',
    });
  }

  return NextResponse.json({
    unlocked: false,
    isLaunched: false,
    earlyAccess: false,
    role: null,
  });
}
