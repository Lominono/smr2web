import { createClient, isSupabaseConfigured } from '@/lib/supabase/client';
import { CommunityFeedback, FeedbackType, FeedbackCategory, FeedbackStatus } from '@/lib/types';

// Datos de ejemplo para desarrollo local o fallback sin Supabase
const INITIAL_MOCK_FEEDBACK: CommunityFeedback[] = [
  {
    id: 'mock-1',
    author_name: 'Marcos',
    type: 'idea',
    title: 'Añadir más empresas a la bolsa del recreo',
    description: 'Estaría bien meter parodias de empresas de comida rápida como Burger King o Telepizza para tener más variedad de acciones.',
    category: 'inversiones',
    status: 'planned',
    upvotes_count: 7,
    admin_response: 'Buena idea, estamos diseñando un par de empresas de hostelería para la próxima versión.',
    admin_responder_name: 'Delegado',
    created_at: new Date(Date.now() - 3600000 * 24 * 2).toISOString(),
    updated_at: new Date(Date.now() - 3600000 * 24).toISOString(),
    has_voted: false,
  },
  {
    id: 'mock-2',
    author_name: 'Lucía',
    type: 'improvement',
    title: 'Filtro por asignaturas en el horario',
    description: 'Poder hacer clic en una asignatura para ver solo las tareas y exámenes pendientes de esa materia.',
    category: 'horario',
    status: 'under_review',
    upvotes_count: 5,
    created_at: new Date(Date.now() - 3600000 * 12).toISOString(),
    updated_at: new Date(Date.now() - 3600000 * 12).toISOString(),
    has_voted: false,
  },
  {
    id: 'mock-3',
    author_name: 'Dani_SMR',
    type: 'report',
    title: 'El audio en móviles a veces tarda en sonar',
    description: 'En Safari iOS los clics de sonido no suenan hasta que tocas varias veces la pantalla por la política de audio del navegador.',
    category: 'portal',
    status: 'completed',
    upvotes_count: 4,
    admin_response: 'Corregido con desbloqueo táctil anticipado en el primer toque.',
    admin_responder_name: 'Admin',
    created_at: new Date(Date.now() - 3600000 * 48).toISOString(),
    updated_at: new Date(Date.now() - 3600000 * 6).toISOString(),
    has_voted: true,
  },
];

let localFeedbackStore: CommunityFeedback[] = [...INITIAL_MOCK_FEEDBACK];
let localUserVotes: Set<string> = new Set();

/**
 * Carga el listado de ideas y reportes
 */
export async function fetchFeedbackList(currentUserId?: string): Promise<CommunityFeedback[]> {
  const supabase = createClient();

  if (supabase && isSupabaseConfigured()) {
    try {
      const { data, error } = await supabase
        .from('community_feedback')
        .select('*')
        .order('upvotes_count', { ascending: false })
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

        return data.map((item) => ({
          id: item.id,
          user_id: item.user_id,
          author_name: item.author_name,
          type: item.type as FeedbackType,
          title: item.title,
          description: item.description,
          category: item.category as FeedbackCategory,
          status: item.status as FeedbackStatus,
          upvotes_count: Number(item.upvotes_count || 0),
          admin_response: item.admin_response,
          admin_responder_name: item.admin_responder_name,
          created_at: item.created_at,
          updated_at: item.updated_at,
          has_voted: userVotedIds.has(item.id),
        }));
      }
    } catch (err) {
      console.warn('Error consultando feedback en Supabase, usando local:', err);
    }
  }

  // Fallback local
  return localFeedbackStore.map((item) => ({
    ...item,
    has_voted: localUserVotes.has(item.id),
  }));
}

/**
 * Publica una nueva idea o reporte
 */
export async function submitFeedbackItem(params: {
  userId?: string;
  authorName: string;
  type: FeedbackType;
  title: string;
  description: string;
  category: FeedbackCategory;
}): Promise<{ success: boolean; item?: CommunityFeedback; error?: string }> {
  const cleanTitle = params.title.trim();
  const cleanDesc = params.description.trim();

  if (!cleanTitle || cleanTitle.length < 4) {
    return { success: false, error: 'El título debe tener al menos 4 caracteres.' };
  }
  if (!cleanDesc || cleanDesc.length < 10) {
    return { success: false, error: 'Por favor describe tu idea o reporte con más detalle (mínimo 10 caracteres).' };
  }

  const supabase = createClient();
  if (supabase && isSupabaseConfigured()) {
    try {
      const { data, error } = await supabase
        .from('community_feedback')
        .insert({
          user_id: params.userId || null,
          author_name: params.authorName || 'Anónimo',
          type: params.type,
          title: cleanTitle,
          description: cleanDesc,
          category: params.category,
          status: 'pending',
          upvotes_count: 0,
        })
        .select()
        .single();

      if (!error && data) {
        return {
          success: true,
          item: {
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
          },
        };
      }

      // Si falla por tabla inexistente en Supabase, continuar con fallback local
      console.warn('Fallo inserción en Supabase, recurriendo a local:', error?.message);
    } catch (err: any) {
      console.warn('Error creando feedback en Supabase:', err);
    }
  }

  // Fallback local
  const newItem: CommunityFeedback = {
    id: `local-fb-${Date.now()}`,
    user_id: params.userId,
    author_name: params.authorName || 'Anónimo',
    type: params.type,
    title: cleanTitle,
    description: cleanDesc,
    category: params.category,
    status: 'pending',
    upvotes_count: 0,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    has_voted: false,
  };

  localFeedbackStore.unshift(newItem);
  return { success: true, item: newItem };
}

/**
 * Alterna el voto (upvote) de un usuario sobre una idea
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
      console.warn('Error toggle_feedback_vote RPC, recurriendo a local:', err);
    }
  }

  // Fallback local
  const item = localFeedbackStore.find((f) => f.id === feedbackId);
  if (!item) {
    return { success: false, hasVoted: false, upvotesCount: 0, error: 'Elemento no encontrado.' };
  }

  const alreadyVoted = localUserVotes.has(feedbackId);
  if (alreadyVoted) {
    localUserVotes.delete(feedbackId);
    item.upvotes_count = Math.max(0, item.upvotes_count - 1);
  } else {
    localUserVotes.add(feedbackId);
    item.upvotes_count += 1;
  }

  return {
    success: true,
    hasVoted: !alreadyVoted,
    upvotesCount: item.upvotes_count,
  };
}

/**
 * Actualiza el estado y respuesta de administración (solo admin/delegado)
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
        return { success: true };
      }
    } catch (err: any) {
      console.warn('Error actualizando feedback en Supabase:', err);
    }
  }

  // Fallback local
  const item = localFeedbackStore.find((f) => f.id === params.feedbackId);
  if (item) {
    item.status = params.status;
    if (params.adminResponse !== undefined) item.admin_response = params.adminResponse;
    if (params.adminName) item.admin_responder_name = params.adminName;
    item.updated_at = new Date().toISOString();
  }

  return { success: true };
}

/**
 * Elimina una idea o reporte (autor o admin)
 */
export async function deleteFeedbackItem(feedbackId: string): Promise<{ success: boolean; error?: string }> {
  const supabase = createClient();

  if (supabase && isSupabaseConfigured()) {
    try {
      const { error } = await supabase
        .from('community_feedback')
        .delete()
        .eq('id', feedbackId);

      if (!error) return { success: true };
    } catch (err: any) {
      console.warn('Error eliminando feedback en Supabase:', err);
    }
  }

  localFeedbackStore = localFeedbackStore.filter((f) => f.id !== feedbackId);
  return { success: true };
}
