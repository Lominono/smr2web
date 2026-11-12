import { NextRequest } from 'next/server';
import { createAdminClient, isServerSupabaseConfigured } from '@/lib/supabase/server';
import { enforceRateLimit, fail, guardOrigin, json, readJsonBody } from '@/lib/security/http';
import { securityEvent } from '@/lib/security/audit';

export const dynamic = 'force-dynamic';

/**
 * POST /api/auth/confirm-legacy
 *
 * Confirma el correo de una cuenta creada antes de activar la auto-confirmación.
 * SEGURIDAD: antes cualquier visitante podía confirmar el correo de CUALQUIERA
 * (saltándose la verificación). Ahora es obligatorio demostrar la contraseña:
 * Supabase solo responde "Email not confirmed" cuando las credenciales son
 * correctas, así que se usa esa comprobación para autorizar la confirmación.
 */
export async function POST(req: NextRequest) {
  const originError = guardOrigin(req);
  if (originError) return originError;

  try {
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || '127.0.0.1';
    const rate = enforceRateLimit(`confirm-legacy:${ip}`, { limit: 5, windowMs: 15 * 60_000 });
    if (!rate.ok) return rate.response;

    const body = await readJsonBody(req);
    if (!body) return fail('Petición no válida.', 400);

    const email = String(body.email || '').trim().toLowerCase();
    const password = String(body.password || '');

    if (!email || !email.includes('@') || email.length > 254) {
      return fail('Correo electrónico no válido.', 400);
    }
    if (!password) {
      return fail('Debes indicar tu contraseña para confirmar la cuenta.', 400);
    }

    if (!isServerSupabaseConfigured()) return json({ success: false });

    const adminClient = createAdminClient();
    if (!adminClient) return json({ success: false });

    // 1. Verificar credenciales: si son válidas (o solo falta confirmar el correo)
    //    la petición demuestra ser el propietario de la cuenta.
    const { error: signInError } = await adminClient.auth.signInWithPassword({ email, password });
    const credentialsValid =
      !signInError ||
      (signInError.message || '').toLowerCase().includes('email not confirmed');

    if (!credentialsValid) {
      await securityEvent({
        action: 'legacy_confirm_invalid_credentials',
        req,
        details: { email },
      });
      return fail('Credenciales incorrectas.', 401);
    }

    const { data: usersData } = await adminClient.auth.admin.listUsers();
    const userToConfirm = usersData?.users?.find((u) => u.email?.toLowerCase() === email);

    if (!userToConfirm) return json({ success: false });

    await adminClient.auth.admin.updateUserById(userToConfirm.id, { email_confirm: true });

    await securityEvent({
      action: 'legacy_email_confirmed',
      userId: userToConfirm.id,
      req,
      details: { email },
    });

    return json({ success: true, confirmed: true });
  } catch {
    return json({ success: false });
  }
}
