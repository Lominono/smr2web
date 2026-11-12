import type { SupabaseClient } from '@supabase/supabase-js';

/**
 * SMR2 · Cartera autoritativa en el servidor.
 *
 * Funciones de apoyo para leer y modificar el saldo de un alumno de forma
 * atómica (bloqueo optimista sobre la columna `coins`) y para consultar el
 * histórico reciente de abonos usado por los presupuestos antiabuso.
 */

export interface RecentCredit {
  amount: number;
  created_at: string;
  type: string | null;
}

/** Historial de abonos de los últimos `windowMs` milisegundos. */
export async function fetchRecentCredits(
  client: SupabaseClient,
  userId: string,
  windowMs: number
): Promise<RecentCredit[]> {
  const since = new Date(Date.now() - windowMs).toISOString();
  try {
    const { data, error } = await client
      .from('balance_transactions')
      .select('amount, created_at, type')
      .eq('user_id', userId)
      .gt('amount', 0)
      .gte('created_at', since)
      .order('created_at', { ascending: false })
      .limit(400);

    if (error || !Array.isArray(data)) return [];
    return data.map((row: Record<string, unknown>) => ({
      amount: Number(row.amount || 0),
      created_at: String(row.created_at || ''),
      type: row.type ? String(row.type) : null,
    }));
  } catch {
    return [];
  }
}

/** Suma de abonos dentro de una ventana de tiempo (subconjunto del historial). */
export function sumCreditsSince(credits: RecentCredit[], windowMs: number): number {
  const since = Date.now() - windowMs;
  return credits.reduce((total, credit) => {
    const time = new Date(credit.created_at).getTime();
    if (!Number.isFinite(time) || time < since) return total;
    return total + Math.max(0, credit.amount);
  }, 0);
}

/** Último abono de un tipo concreto (para cooldowns persistidos). */
export function lastCreditOfType(credits: RecentCredit[], type: string): RecentCredit | null {
  return credits.find((credit) => credit.type === type) || null;
}

export interface ApplyResult {
  ok: boolean;
  coins: number;
  /** `true` cuando otro proceso modificó el saldo y se agotaron los reintentos */
  conflicted?: boolean;
}

/**
 * Aplica un delta de monedas con bloqueo optimista:
 * la actualización solo tiene efecto si el saldo sigue siendo el leído.
 */
export async function applyCoinDelta(
  client: SupabaseClient,
  userId: string,
  delta: number,
  extraUpdates: Record<string, unknown> = {},
  maxAttempts = 4
): Promise<ApplyResult> {
  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    const { data: current, error: readError } = await client
      .from('profiles')
      .select('coins')
      .eq('id', userId)
      .maybeSingle();

    if (readError || !current) return { ok: false, coins: 0 };

    const balance = Number(current.coins ?? 0);
    const nextBalance = Math.max(0, Math.trunc(balance + delta));

    const { data: updated, error: updateError } = await client
      .from('profiles')
      .update({ coins: nextBalance, ...extraUpdates })
      .eq('id', userId)
      .eq('coins', current.coins)
      .select('coins');

    if (!updateError && Array.isArray(updated) && updated.length > 0) {
      return { ok: true, coins: Number(updated[0].coins ?? nextBalance) };
    }

    // Conflicto de concurrencia: pequeño retroceso aleatorio y reintento
    await new Promise((resolve) => setTimeout(resolve, 15 + Math.floor(Math.random() * 35)));
  }

  return { ok: false, coins: 0, conflicted: true };
}

/** Registra el movimiento en `balance_transactions` (auditoría). */
export async function recordBalanceTransaction(
  client: SupabaseClient,
  params: {
    userId: string;
    amount: number;
    balanceBefore: number;
    balanceAfter: number;
    type: string;
    description: string;
    referenceId?: string | null;
  }
): Promise<void> {
  try {
    await client.from('balance_transactions').insert([
      {
        user_id: params.userId,
        amount: params.amount,
        balance_before: params.balanceBefore,
        balance_after: params.balanceAfter,
        type: params.type,
        reference_id: params.referenceId ?? null,
        description: params.description,
      },
    ]);
  } catch {
    /* la auditoría nunca debe tumbar la operación */
  }
}
