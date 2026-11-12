import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient, isServerSupabaseConfigured } from '@/lib/supabase/server';
import { verifyUserSession } from '@/lib/adminAuth';
import { isUUID } from '@/lib/uuid';
import { enforceRateLimit, fail, guardOrigin, readJsonBody, unauthorized } from '@/lib/security/http';
import { RATE_LIMITS } from '@/lib/security/rateLimit';
import { recordBalanceTransaction } from '@/lib/security/wallet';
import { logEvent } from '@/lib/logger';

export const dynamic = 'force-dynamic';

const BANNER_PRICE = 13_000_000;
const BANNER_ITEM_ID = 'banner_vip_13m';
const VALID_PRESETS = new Set([
  'gold_luxury',
  'cyberpunk_neon',
  'matrix_terminal',
  'sunset_synth',
  'amethyst_galaxy',
  'cuadricula',
]);

function sanitizeBannerStyle(rawStyle: unknown): { ok: true; value: string } | { ok: false; error: string } {
  const style = String(rawStyle || '').trim();
  if (!style) {
    return { ok: true, value: 'gold_luxury' };
  }
  if (VALID_PRESETS.has(style)) {
    return { ok: true, value: style };
  }
  if (style.length > 400 || !/^https:\/\/[^\s"'()\\<>`]+$/i.test(style)) {
    return {
      ok: false,
      error: 'URL de imagen no válida. Debe empezar por https:// y no contener caracteres inseguros.',
    };
  }
  try {
    const parsed = new URL(style);
    if (parsed.protocol !== 'https:') {
      return { ok: false, error: 'Solo se permiten imágenes por HTTPS.' };
    }
    return { ok: true, value: parsed.toString() };
  } catch {
    return { ok: false, error: 'Formato de URL inválido.' };
  }
}

export async function POST(req: NextRequest) {
  const originError = guardOrigin(req);
  if (originError) return originError;

  try {
    const session = await verifyUserSession();
    if (!session.authenticated || !session.user || !isUUID(session.user.id)) {
      return unauthorized('Debes iniciar sesión para acceder a la tienda VIP.');
    }

    const rate = enforceRateLimit(`shop-banner:${session.user.id}`, RATE_LIMITS.profileWrite);
    if (!rate.ok) return rate.response;

    const body = await readJsonBody(req);
    if (!body) {
      return fail('Cuerpo de petición inválido o demasiado grande.', 400);
    }

    const action = body.action === 'customize' ? 'customize' : 'buy';
    const cleanTitle =
      String(body.customTitle ?? 'Magnate del Botellón')
        .trim()
        .replace(/\s+/g, ' ')
        .slice(0, 60) || 'Magnate del Botellón';
    const cleanQuote = String(body.customQuote ?? '')
      .trim()
      .replace(/\s+/g, ' ')
      .slice(0, 140);

    if (!isServerSupabaseConfigured()) {
      return fail('Base de datos no configurada en el servidor.', 503);
    }

    const client = createAdminClient();
    if (!client) {
      return fail('Servicio de base de datos no disponible en el servidor.', 503);
    }

    const userId = session.user.id;

    if (action === 'buy') {
      const styleCheck = sanitizeBannerStyle(body.bannerStyle || 'gold_luxury');
      if (!styleCheck.ok) {
        return fail(styleCheck.error, 400);
      }

      // Bucle optimista para garantizar verificación de saldo + cobro sin doble gasto
      for (let attempt = 0; attempt < 4; attempt += 1) {
        const { data: profile, error: readErr } = await client
          .from('profiles')
          .select('id, username, coins, items_comprados, role, is_banned')
          .eq('id', userId)
          .maybeSingle();

        if (readErr || !profile) {
          return fail('Perfil de usuario no encontrado.', 404);
        }
        if (profile.is_banned) {
          return fail('Tu cuenta está suspendida.', 403);
        }

        const existingItems = Array.isArray(profile.items_comprados)
          ? profile.items_comprados.map(String)
          : [];
        if (existingItems.includes(BANNER_ITEM_ID)) {
          return fail('Ya eres propietario del Banner VIP.', 409);
        }

        const currentCoins = Math.max(0, Number(profile.coins ?? 0));
        if (currentCoins < BANNER_PRICE) {
          return fail(
            `Saldo insuficiente. Faltan ${(BANNER_PRICE - currentCoins).toLocaleString('es-ES')} fichas.`,
            400
          );
        }

        const nextCoins = currentCoins - BANNER_PRICE;
        const nextItems = Array.from(new Set([...existingItems, BANNER_ITEM_ID]));
        const finalTitle = cleanTitle;
        const finalQuote = cleanQuote || 'Construyendo el aula más rápida del instituto.';

        const { data: updated, error: updateErr } = await client
          .from('profiles')
          .update({
            coins: nextCoins,
            items_comprados: nextItems,
            banner_estilo: styleCheck.value,
            titulo_personalizado: finalTitle,
            frase: finalQuote,
          })
          .eq('id', userId)
          .eq('coins', profile.coins)
          .select('coins, items_comprados, banner_estilo, titulo_personalizado, frase');

        if (!updateErr && Array.isArray(updated) && updated.length > 0) {
          await recordBalanceTransaction(client, {
            userId,
            amount: -BANNER_PRICE,
            balanceBefore: currentCoins,
            balanceAfter: nextCoins,
            type: 'shop_purchase',
            referenceId: BANNER_ITEM_ID,
            description: 'Compra de Banner VIP Personalizado',
          });

          try {
            await client.from('chat_messages').insert([
              {
                user_id: userId,
                username: 'SMR2',
                text: `Aviso oficial: @${profile.username} ha adquirido el Banner de Perfil en la Tienda Oficial por 13.000.000 fichas.`,
                tag: 'aviso',
                pinned: false,
              },
            ]);
          } catch {}

          await logEvent({
            eventType: 'balance_adjusted',
            userId,
            username: profile.username,
            req,
            details: {
              action: 'vip_banner_purchased',
              price: BANNER_PRICE,
              balance_after: nextCoins,
            },
          });

          return NextResponse.json({
            success: true,
            coins: nextCoins,
            items_comprados: nextItems,
            banner_estilo: styleCheck.value,
            titulo_personalizado: finalTitle,
            frase: finalQuote,
          });
        }

        await new Promise((resolve) => setTimeout(resolve, 20 + Math.floor(Math.random() * 30)));
      }

      return fail('Conflicto de concurrencia al procesar la compra. Inténtalo de nuevo.', 409);
    }

    // action === 'customize'
    const styleCheck = sanitizeBannerStyle(body.bannerStyle);
    if (!styleCheck.ok) {
      return fail(styleCheck.error, 400);
    }

    const { data: profile, error: readErr } = await client
      .from('profiles')
      .select('id, username, role, items_comprados, banner_estilo, is_banned')
      .eq('id', userId)
      .maybeSingle();

    if (readErr || !profile) {
      return fail('Perfil no encontrado.', 404);
    }
    if (profile.is_banned) {
      return fail('Tu cuenta está suspendida.', 403);
    }

    const existingItems = Array.isArray(profile.items_comprados)
      ? profile.items_comprados.map(String)
      : [];
    const ownsBanner =
      existingItems.includes(BANNER_ITEM_ID) ||
      Boolean(profile.banner_estilo && profile.banner_estilo !== 'cuadricula') ||
      profile.role === 'admin';

    if (!ownsBanner) {
      return fail('Debes adquirir el Banner VIP antes de personalizarlo.', 403);
    }

    const { error: saveErr } = await client
      .from('profiles')
      .update({
        banner_estilo: styleCheck.value,
        titulo_personalizado: cleanTitle,
        frase: cleanQuote,
      })
      .eq('id', userId);

    if (saveErr) {
      return fail('No se pudo guardar la personalización del banner.', 500);
    }

    return NextResponse.json({
      success: true,
      banner_estilo: styleCheck.value,
      titulo_personalizado: cleanTitle,
      frase: cleanQuote,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Error en la tienda VIP.';
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}
