import { NextRequest } from 'next/server';
import { createAdminClient, isServerSupabaseConfigured } from '@/lib/supabase/server';
import { verifyUserSession } from '@/lib/adminAuth';
import { enforceRateLimit, fail, guardOrigin, json, readJsonBody, unauthorized } from '@/lib/security/http';
import { isUUID } from '@/lib/uuid';
import { getPetById } from '@/lib/pets';

export const dynamic = 'force-dynamic';

/**
 * POST /api/pets/equip
 *
 * Equipa o desequipa una mascota. SEGURIDAD: solo se puede equipar una mascota
 * que el usuario posea REALMENTE en la base de datos (compra verificada), y
 * `{ petId: null }` para desequipar.
 */
export async function POST(req: NextRequest) {
  const originError = guardOrigin(req);
  if (originError) return originError;

  const session = await verifyUserSession();
  if (!session.authenticated || !session.user || !isUUID(session.user.id)) {
    return unauthorized('Debes iniciar sesión para gestionar tus mascotas.');
  }

  const rate = enforceRateLimit(`pet-equip:${session.user.id}`, { limit: 20, windowMs: 60_000 });
  if (!rate.ok) return rate.response;

  if (!isServerSupabaseConfigured()) {
    return fail('La tienda solo está disponible con la base de datos conectada.', 503);
  }

  const client = createAdminClient();
  if (!client) return fail('Base de datos no disponible.', 503);

  const body = await readJsonBody(req);
  if (!body) return fail('Petición no válida.', 400);

  const rawPetId = body.petId === null || body.petId === '' ? null : String(body.petId || '').trim();

  if (rawPetId && !getPetById(rawPetId)) {
    return fail('Esa mascota no existe en el catálogo.', 400);
  }

  if (rawPetId) {
    // Verificación de propiedad autoritativa
    const { data: profile, error: profileError } = await client
      .from('profiles')
      .select('id, is_banned, mascotas_desbloqueadas')
      .eq('id', session.user.id)
      .maybeSingle();

    if (profileError || !profile) return fail('Perfil de usuario no encontrado.', 404);
    if (profile.is_banned) return fail('Cuenta suspendida por la administración.', 403);

    const owned: string[] = Array.isArray(profile.mascotas_desbloqueadas)
      ? profile.mascotas_desbloqueadas
      : [];

    if (!owned.includes(rawPetId)) {
      return fail('Primero debes adoptar a esa mascota en la tienda.', 403);
    }
  }

  const { error } = await client
    .from('profiles')
    .update({ mascota_equipada: rawPetId })
    .eq('id', session.user.id);

  if (error) {
    return fail('No se pudo actualizar tu mascota equipada.', 500);
  }

  return json({ success: true, mascotaEquipada: rawPetId });
}
