import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { createAdminClient, createClient, isServerSupabaseConfigured } from '@/lib/supabase/server';
import { signEarlyAccessToken, COOKIE_EARLY_ACCESS_TOKEN } from '@/lib/adminAuth';
import { logEvent, extractClientMeta } from '@/lib/logger';

export const dynamic = 'force-dynamic';

interface RateLimitState {
  count: number;
  lockoutUntil: number;
}
const failedAttemptsMap = new Map<string, RateLimitState>();

const MAX_ATTEMPTS = 5;
const LOCKOUT_MS = 15 * 60 * 1000; // 15 minutos de bloqueo

// Hashes SHA-256 autorizados exclusivamente para acceso anticipado (JuanFe y David)
const BUILTIN_VALID_HASHES: Record<string, { name: string; role: 'developer' | 'admin' }> = {
  // Smr2_Admin#2026_MasterKey!
  'd8b18586f887260d0cf27c430c157f320826ec6a0742e2e92fc374642185b522': {
    name: 'Admin Master Key',
    role: 'admin',
  },
  // Smr2_EarlyAccess#2026_JuanFeDavid!
  '7f38360ddbb362bd389ab272f79010817babdf1b89eae09fab51d16491ddb996': {
    name: 'JuanFe & David Early Access Key',
    role: 'developer',
  },
};

export async function POST(req: NextRequest) {
  try {
    const { ip } = extractClientMeta(req);
    const now = Date.now();

    // 1. Protección contra fuerza bruta por IP
    const rateLimit = failedAttemptsMap.get(ip);
    if (rateLimit && rateLimit.lockoutUntil > now) {
      const remainingMinutes = Math.ceil((rateLimit.lockoutUntil - now) / 60000);
      return NextResponse.json(
        {
          success: false,
          error: `Acceso temporalmente bloqueado por seguridad tras varios intentos fallidos. Vuelve a intentarlo en ${remainingMinutes} minuto(s).`,
        },
        { status: 429 }
      );
    }

    const body = await req.json().catch(() => ({}));
    const rawCode = String(body?.code || '').trim();

    if (!rawCode) {
      return NextResponse.json(
        { success: false, error: 'Debes introducir una clave de acceso válida.' },
        { status: 400 }
      );
    }

    // Calcular hash SHA-256 de la clave ingresada
    const inputHash = crypto.createHash('sha256').update(rawCode).digest('hex');

    let isValid = false;
    let matchedKeyName = 'Clave verificada';
    let matchedRole: 'developer' | 'admin' = 'developer';

    // 2. Comprobar en base de datos Supabase (tabla `early_access_keys` o RPC `verify_early_access_key`)
    if (isServerSupabaseConfigured()) {
      try {
        const adminClient = createAdminClient();
        const client = adminClient || (await createClient());

        if (client) {
          // Intentar primero mediante función RPC segura
          const { data: rpcResult, error: rpcErr } = await client.rpc('verify_early_access_key', {
            p_key_hash: inputHash,
          });

          if (!rpcErr && rpcResult && rpcResult.length > 0 && rpcResult[0].is_valid) {
            isValid = true;
            matchedKeyName = rpcResult[0].key_name || 'DB Key';
            matchedRole = (rpcResult[0].allowed_role as any) || 'developer';
          } else if (adminClient) {
            // Consulta directa a la tabla como fallback administrativo
            const { data: dbKey } = await adminClient
              .from('early_access_keys')
              .select('id, key_name, allowed_role, is_active')
              .eq('key_hash', inputHash)
              .eq('is_active', true)
              .maybeSingle();

            if (dbKey) {
              isValid = true;
              matchedKeyName = dbKey.key_name || 'DB Key';
              matchedRole = (dbKey.allowed_role as any) || 'developer';

              // Actualizar fecha de último uso
              await adminClient
                .from('early_access_keys')
                .update({ last_used_at: new Date().toISOString() })
                .eq('id', dbKey.id);
            }
          }
        }
      } catch (err) {
        console.warn('[EARLY_ACCESS_VERIFY] Database verification warning:', err);
      }
    }

    // 3. Comprobar variables de entorno configuradas en Vercel / .env.local
    if (!isValid) {
      const envKeys = [
        process.env.EARLY_ACCESS_KEY,
        process.env.DEVELOPER_ACCESS_KEY,
        process.env.ADMIN_ACCESS_CODE,
        process.env.ADMIN_PASSWORD,
      ]
        .filter(Boolean)
        .map((k) => String(k).trim());

      for (const envKey of envKeys) {
        if (envKey && rawCode === envKey) {
          isValid = true;
          matchedKeyName = 'Environment Master Key';
          matchedRole = 'developer';
          break;
        }
      }
    }

    // 4. Comprobar hashes criptográficos seguros predeterminados del servidor
    if (!isValid && BUILTIN_VALID_HASHES[inputHash]) {
      isValid = true;
      matchedKeyName = BUILTIN_VALID_HASHES[inputHash].name;
      matchedRole = BUILTIN_VALID_HASHES[inputHash].role;
    }

    // 5. Gestión del fallo de autenticación
    if (!isValid) {
      const currentAttempts = (rateLimit?.count || 0) + 1;
      const isLocked = currentAttempts >= MAX_ATTEMPTS;
      failedAttemptsMap.set(ip, {
        count: isLocked ? 0 : currentAttempts,
        lockoutUntil: isLocked ? now + LOCKOUT_MS : 0,
      });

      try {
        await logEvent({
          eventType: 'admin_action',
          ipAddress: ip,
          req,
          details: {
            action: 'early_access_failed',
            attempt: currentAttempts,
            is_locked: isLocked,
            timestamp: new Date().toISOString(),
          },
        });
      } catch {}

      const remainingAttempts = MAX_ATTEMPTS - currentAttempts;
      const errorMessage = isLocked
        ? 'Has superado el límite de intentos permitidos. El acceso anticipado se ha bloqueado temporalmente por 15 minutos.'
        : `Clave de acceso anticipado incorrecta. Intentos restantes antes del bloqueo: ${remainingAttempts}.`;

      return NextResponse.json(
        {
          success: false,
          error: errorMessage,
        },
        { status: 401 }
      );
    }

    // Éxito: limpiar contador de fallos
    failedAttemptsMap.delete(ip);

    // 6. Generar token de acceso anticipado firmado criptográficamente
    const token = signEarlyAccessToken(
      {
        authorized: true,
        role: matchedRole,
        keyName: matchedKeyName,
        grantedAt: Math.floor(Date.now() / 1000),
      },
      30 // Válido por 30 días
    );

    // 7. Registrar auditoría de acceso exitoso
    try {
      await logEvent({
        eventType: 'admin_action',
        ipAddress: ip,
        req,
        details: {
          action: 'early_access_granted',
          keyName: matchedKeyName,
          role: matchedRole,
          timestamp: new Date().toISOString(),
        },
      });
    } catch {}

    const response = NextResponse.json({
      success: true,
      role: matchedRole,
      message: 'Acceso anticipado concedido correctamente.',
    });

    // 8. Establecer cookie HttpOnly firmada (inmune a manipulación en el cliente)
    response.cookies.set(COOKIE_EARLY_ACCESS_TOKEN, token, {
      path: '/',
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 30 * 24 * 60 * 60, // 30 días
    });

    return response;
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error?.message || 'Error interno al procesar el acceso anticipado.' },
      { status: 500 }
    );
  }
}
