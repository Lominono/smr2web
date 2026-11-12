import { logEvent } from '@/lib/logger';

/**
 * SMR2 · Auditoría de seguridad.
 *
 * Registra intentos de abuso (premios fuera de rango, recibos reutilizados,
 * operaciones de mercado inválidas, accesos no autorizados...) en `event_logs`
 * para que el equipo administrador pueda revisarlos desde /admin.
 */
export async function securityEvent(params: {
  action: string;
  userId?: string | null;
  username?: string | null;
  req?: Request;
  details?: Record<string, unknown>;
}): Promise<void> {
  try {
    await logEvent({
      eventType: 'balance_adjusted',
      userId: params.userId ?? null,
      username: params.username ?? null,
      req: params.req,
      details: {
        security_action: params.action,
        ...(params.details || {}),
      },
    });
  } catch {
    /* la auditoría nunca debe bloquear la respuesta */
  }
}
