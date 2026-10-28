import { createClient, isSupabaseConfigured } from '@/lib/supabase/client';
import { CommunityFeedback, FeedbackType, FeedbackCategory, FeedbackStatus } from '@/lib/types';

const STORAGE_KEY = 'smr2_incidents_store_v1';
const VOTES_KEY = 'smr2_incidents_votes_v1';

function getStoredIncidents(): CommunityFeedback[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveStoredIncidents(items: CommunityFeedback[]) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  } catch {}
}

function getStoredVotes(): Set<string> {
  if (typeof window === 'undefined') return new Set();
  try {
    const raw = localStorage.getItem(VOTES_KEY);
    return raw ? new Set(JSON.parse(raw)) : new Set();
  } catch {
    return new Set();
  }
}

function saveStoredVotes(votes: Set<string>) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(VOTES_KEY, JSON.stringify(Array.from(votes)));
  } catch {}
}

/**
 * Carga el listado de incidencias técnicas reales (sin datos ficticios ni usuarios falsos)
 */
export async function fetchFeedbackList(currentUserId?: string): Promise<CommunityFeedback[]> {
  const supabase = createClient();

  if (supabase && isSupabaseConfigured()) {
    try {
      const { data, error } = await supabase
        .from('community_feedback')
        .select('*')
        .order('created_at', { ascending: false });

      if (!error && Array.isArray(data)) {
        let userVotedIds = new Set<string>();

        if (currentUserId) {
          const { data: votes } = await supabase
            .from('feedback_votes')
            .select('feedback_id')
            .eq('user_id', currentUserId);

          if (votes) {
            votes.forEach((v) => userVotedIds.add(v.feedback_id));
          }
        }

        const mapped: CommunityFeedback[] = data.map((item) => ({
          id: item.id,
          user_id: item.user_id,
          author_name: item.author_name || 'Alumno',
          type: (item.type as FeedbackType) || 'report',
          title: item.title,
          description: item.description,
          category: (item.category as FeedbackCategory) || 'portal',
          status: (item.status as FeedbackStatus) || 'pending',
          upvotes_count: Number(item.upvotes_count || 0),
          admin_response: item.admin_response,
          admin_responder_name: item.admin_responder_name,
          created_at: item.created_at,
          updated_at: item.updated_at,
          has_voted: userVotedIds.has(item.id),
        }));

        saveStoredIncidents(mapped);
        return mapped;
      }
    } catch (err) {
      console.warn('Error consultando incidencias en Supabase, usando almacenamiento local:', err);
    }
  }

  // Fallback local real
  const localItems = getStoredIncidents();
  const localVotes = getStoredVotes();

  return localItems.map((item) => ({
    ...item,
    has_voted: localVotes.has(item.id),
  }));
}

/**
 * Registra una nueva incidencia técnica real
 */
export async function submitFeedbackItem(params: {
  userId?: string;
  authorName: string;
  type?: FeedbackType;
  title: string;
  description: string;
  category?: FeedbackCategory;
}): Promise<{ success: boolean; item?: CommunityFeedback; error?: string }> {
  const cleanTitle = params.title.trim();
  const cleanDesc = params.description.trim();

  if (!cleanTitle || cleanTitle.length < 4) {
    return { success: false, error: 'El título debe tener al menos 4 caracteres.' };
  }
  if (!cleanDesc || cleanDesc.length < 8) {
    return { success: false, error: 'Por favor aporta un poco más de detalle (mínimo 8 caracteres).' };
  }

  const category = params.category || 'portal';
  const type = params.type || 'report';
  const author = params.authorName ? params.authorName.trim() : 'Alumno';

  const supabase = createClient();
  if (supabase && isSupabaseConfigured()) {
    try {
      const { data, error } = await supabase
        .from('community_feedback')
        .insert({
          user_id: params.userId || null,
          author_name: author,
          type,
          title: cleanTitle,
          description: cleanDesc,
          category,
          status: 'pending',
          upvotes_count: 0,
        })
        .select()
        .single();

      if (!error && data) {
        const created: CommunityFeedback = {
          id: data.id,
          user_id: data.user_id,
          author_name: data.author_name,
          type: data.type as FeedbackType,
          title: data.title,
          description: data.description,
          category: data.category as FeedbackCategory,
          status: data.status as FeedbackStatus,
          upvotes_count: 0,
          created_at: data.created_at,
          updated_at: data.updated_at,
          has_voted: false,
        };

        const existing = getStoredIncidents();
        saveStoredIncidents([created, ...existing.filter((x) => x.id !== created.id)]);
        return { success: true, item: created };
      }
    } catch (err: any) {
      console.warn('Error registrando incidencia en Supabase:', err);
    }
  }

  // Fallback local real
  const newItem: CommunityFeedback = {
    id: `inc-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    user_id: params.userId,
    author_name: author,
    type,
    title: cleanTitle,
    description: cleanDesc,
    category,
    status: 'pending',
    upvotes_count: 0,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    has_voted: false,
  };

  const currentItems = getStoredIncidents();
  const nextItems = [newItem, ...currentItems];
  saveStoredIncidents(nextItems);

  return { success: true, item: newItem };
}

/**
 * Alterna el voto (+1) de un usuario sobre una incidencia
 */
export async function toggleVoteFeedback(
  feedbackId: string,
  userId?: string
): Promise<{ success: boolean; hasVoted: boolean; upvotesCount: number; error?: string }> {
  const supabase = createClient();

  if (supabase && isSupabaseConfigured() && userId) {
    try {
      const { data, error } = await supabase.rpc('toggle_feedback_vote', {
        p_feedback_id: feedbackId,
      });

      if (!error && data) {
        return {
          success: true,
          hasVoted: Boolean(data.voted),
          upvotesCount: Number(data.upvotes_count),
        };
      }
    } catch (err: any) {
      console.warn('Error toggle_feedback_vote RPC:', err);
    }
  }

  // Fallback local real
  const current = getStoredIncidents();
  const votes = getStoredVotes();
  const item = current.find((f) => f.id === feedbackId);

  if (!item) {
    return { success: false, hasVoted: false, upvotesCount: 0, error: 'Incidencia no encontrada.' };
  }

  const alreadyVoted = votes.has(feedbackId);
  if (alreadyVoted) {
    votes.delete(feedbackId);
    item.upvotes_count = Math.max(0, item.upvotes_count - 1);
  } else {
    votes.add(feedbackId);
    item.upvotes_count += 1;
  }

  saveStoredIncidents(current);
  saveStoredVotes(votes);

  return {
    success: true,
    hasVoted: !alreadyVoted,
    upvotesCount: item.upvotes_count,
  };
}

/**
 * Actualiza el estado y resolución técnica (solo admin o delegado)
 */
export async function updateFeedbackAdminStatus(params: {
  feedbackId: string;
  status: FeedbackStatus;
  adminResponse?: string;
  adminName?: string;
}): Promise<{ success: boolean; error?: string }> {
  const supabase = createClient();

  if (supabase && isSupabaseConfigured()) {
    try {
      const updatePayload: Record<string, any> = {
        status: params.status,
        updated_at: new Date().toISOString(),
      };
      if (params.adminResponse !== undefined) {
        updatePayload.admin_response = params.adminResponse;
      }
      if (params.adminName) {
        updatePayload.admin_responder_name = params.adminName;
      }

      const { error } = await supabase
        .from('community_feedback')
        .update(updatePayload)
        .eq('id', params.feedbackId);

      if (!error) {
        const stored = getStoredIncidents();
        const found = stored.find((f) => f.id === params.feedbackId);
        if (found) {
          found.status = params.status;
          if (params.adminResponse !== undefined) found.admin_response = params.adminResponse;
          if (params.adminName) found.admin_responder_name = params.adminName;
          found.updated_at = new Date().toISOString();
          saveStoredIncidents(stored);
        }
        return { success: true };
      }
    } catch (err: any) {
      console.warn('Error actualizando estado en Supabase:', err);
    }
  }

  // Fallback local real
  const stored = getStoredIncidents();
  const item = stored.find((f) => f.id === params.feedbackId);
  if (item) {
    item.status = params.status;
    if (params.adminResponse !== undefined) item.admin_response = params.adminResponse;
    if (params.adminName) item.admin_responder_name = params.adminName;
    item.updated_at = new Date().toISOString();
    saveStoredIncidents(stored);
  }

  return { success: true };
}

/**
 * Elimina una incidencia técnica (autor o admin/delegado)
 */
export async function deleteFeedbackItem(feedbackId: string): Promise<{ success: boolean; error?: string }> {
  const supabase = createClient();

  if (supabase && isSupabaseConfigured()) {
    try {
      const { error } = await supabase
        .from('community_feedback')
        .delete()
        .eq('id', feedbackId);

      if (!error) {
        const stored = getStoredIncidents().filter((f) => f.id !== feedbackId);
        saveStoredIncidents(stored);
        return { success: true };
      }
    } catch (err: any) {
      console.warn('Error eliminando incidencia en Supabase:', err);
    }
  }

  const stored = getStoredIncidents().filter((f) => f.id !== feedbackId);
  saveStoredIncidents(stored);
  return { success: true };
}
