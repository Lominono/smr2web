'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  X,
  ChevronUp,
  Plus,
  Trash2,
  AlertCircle,
  CheckCircle2,
  Clock,
  ShieldCheck,
  Check,
  CornerDownRight,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { sound } from '@/lib/audio';
import { createClient } from '@/lib/supabase/client';
import { UserProfile, CommunityFeedback, FeedbackCategory, FeedbackStatus } from '@/lib/types';
import {
  fetchFeedbackList,
  submitFeedbackItem,
  toggleVoteFeedback,
  updateFeedbackAdminStatus,
  deleteFeedbackItem,
} from '@/lib/feedbackService';

interface FeedbackModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: UserProfile | null;
  onOpenAuth?: () => void;
}

const CATEGORY_LABELS: Record<string, string> = {
  general: 'Aula y Redes',
  horario: 'Horario y Entregas',
  portal: 'Portal Web',
  juegos: 'Recreo',
  inversiones: 'Bolsa',
  otros: 'Otro',
};

function formatRelativeOrDate(dateStr: string): string {
  if (!dateStr) return '';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffMin = Math.floor(diffMs / 60000);
    const diffHr = Math.floor(diffMin / 60);

    if (diffMin < 2) return 'ahora';
    if (diffMin < 60) return `${diffMin}m`;
    if (diffHr < 24) return `${diffHr}h`;
    return d.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
  } catch {
    return dateStr;
  }
}

export const FeedbackModal: React.FC<FeedbackModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  onOpenAuth,
}) => {
  const [items, setItems] = useState<CommunityFeedback[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [statusFilter, setStatusFilter] = useState<'all' | 'open' | 'under_review' | 'completed'>('all');
  const [showCreateForm, setShowCreateForm] = useState<boolean>(false);

  // Formulario de nueva incidencia
  const [newTitle, setNewTitle] = useState<string>('');
  const [newCategory, setNewCategory] = useState<FeedbackCategory>('portal');
  const [newDesc, setNewDesc] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [feedbackNotice, setFeedbackNotice] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Moderación admin/delegado
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [adminStatusInput, setAdminStatusInput] = useState<FeedbackStatus>('under_review');
  const [adminResponseInput, setAdminResponseInput] = useState<string>('');
  const [isSavingAdmin, setIsSavingAdmin] = useState<boolean>(false);

  const isAdminOrDelegado =
    currentUser?.role === 'admin' ||
    currentUser?.role === 'delegado' ||
    currentUser?.username === 'admin';

  const loadData = useCallback(async () => {
    try {
      const data = await fetchFeedbackList(currentUser?.id);
      setItems(data);
    } catch (err) {
      console.warn('Error cargando incidencias:', err);
    } finally {
      setIsLoading(false);
    }
  }, [currentUser?.id]);

  useEffect(() => {
    if (isOpen) {
      loadData();
    }
  }, [isOpen, loadData]);

  // Suscripción Realtime si Supabase está activo
  useEffect(() => {
    if (!isOpen) return;
    const supabase = createClient();
    if (!supabase) return;

    try {
      const channel = supabase
        .channel('realtime_incidents')
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'community_feedback' },
          () => {
            loadData();
          }
        )
        .subscribe();

      return () => {
        try {
          supabase.removeChannel(channel);
        } catch (_) {}
      };
    } catch (_) {}
  }, [isOpen, loadData]);

  // Cerrar con Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const handleVote = async (itemId: string) => {
    if (!currentUser) {
      sound.tap();
      onOpenAuth?.();
      return;
    }

    sound.tap();

    setItems((prev) =>
      prev.map((item) => {
        if (item.id === itemId) {
          const nextVoted = !item.has_voted;
          const nextCount = item.upvotes_count + (nextVoted ? 1 : -1);
          return {
            ...item,
            has_voted: nextVoted,
            upvotes_count: Math.max(0, nextCount),
          };
        }
        return item;
      })
    );

    await toggleVoteFeedback(itemId, currentUser.id);
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !newDesc.trim() || isSubmitting) return;

    if (!currentUser) {
      sound.tap();
      onOpenAuth?.();
      return;
    }

    setIsSubmitting(true);
    setFeedbackNotice(null);

    const res = await submitFeedbackItem({
      userId: currentUser.id,
      authorName: currentUser.username,
      type: 'report',
      title: newTitle,
      description: newDesc,
      category: newCategory,
    });

    setIsSubmitting(false);

    if (res.success && res.item) {
      sound.coinWin();
      setItems((prev) => [res.item!, ...prev]);
      setNewTitle('');
      setNewDesc('');
      setShowCreateForm(false);
      setFeedbackNotice({ type: 'success', message: 'Incidencia registrada con éxito.' });
      setTimeout(() => setFeedbackNotice(null), 3500);
    } else {
      sound.broke();
      setFeedbackNotice({ type: 'error', message: res.error || 'Error al registrar incidencia.' });
    }
  };

  const handleSaveAdminResponse = async (itemId: string) => {
    setIsSavingAdmin(true);
    const res = await updateFeedbackAdminStatus({
      feedbackId: itemId,
      status: adminStatusInput,
      adminResponse: adminResponseInput,
      adminName: currentUser?.username || 'Delegado',
    });
    setIsSavingAdmin(false);

    if (res.success) {
      sound.tap();
      setItems((prev) =>
        prev.map((it) =>
          it.id === itemId
            ? {
                ...it,
                status: adminStatusInput,
                admin_response: adminResponseInput,
                admin_responder_name: currentUser?.username || 'Delegado',
              }
            : it
        )
      );
      setEditingItemId(null);
    }
  };

  const handleDelete = async (itemId: string) => {
    if (!window.confirm('¿Eliminar esta incidencia?')) return;
    sound.tap();

    const res = await deleteFeedbackItem(itemId);
    if (res.success) {
      setItems((prev) => prev.filter((it) => it.id !== itemId));
    }
  };

  const openIncidentsCount = useMemo(() => {
    return items.filter((it) => it.status === 'pending' || it.status === 'under_review').length;
  }, [items]);

  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      if (statusFilter === 'all') return true;
      if (statusFilter === 'open') return item.status === 'pending';
      if (statusFilter === 'under_review') return item.status === 'under_review';
      if (statusFilter === 'completed') return item.status === 'completed';
      return true;
    });
  }, [items, statusFilter]);

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="incidents-modal-title"
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150"
    >
      <div className="fixed inset-0" onClick={onClose} aria-hidden="true" />

      <div className="relative z-10 w-full max-w-2xl max-h-[92dvh] sm:max-h-[88dvh] flex flex-col rounded-t-2xl sm:rounded-xl bg-surface border-t sm:border border-border shadow-2xl overflow-hidden animate-in slide-in-from-bottom-2 sm:zoom-in-95 duration-150">
        {/* Cabecera minimalista y funcional */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-surface shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-surface-raised border border-border flex items-center justify-center text-foreground shrink-0">
              <AlertCircle className="w-4 h-4" />
            </div>

            <div>
              <div className="flex items-center gap-2">
                <h2 id="incidents-modal-title" className="text-sm font-semibold text-foreground tracking-tight">
                  Incidencias
                </h2>
                <span className="text-[10px] font-mono font-medium px-1.5 py-0.5 rounded bg-surface-raised border border-border text-foreground-subtle">
                  {openIncidentsCount} {openIncidentsCount === 1 ? 'abierta' : 'abiertas'}
                </span>
              </div>
              <p className="text-[11px] text-foreground-subtle">
                Averías técnicas, redes del aula y fallos del portal
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => {
                sound.tap();
                setShowCreateForm((prev) => !prev);
              }}
              className="px-2.5 py-1 rounded-md bg-foreground text-background text-xs font-medium hover:opacity-90 active:scale-95 transition-all cursor-pointer touch-manipulation flex items-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>{showCreateForm ? 'Cancelar' : 'Nueva'}</span>
            </button>

            <button
              type="button"
              onClick={() => {
                sound.tap();
                onClose();
              }}
              aria-label="Cerrar modal"
              className="w-8 h-8 rounded-md text-foreground-subtle hover:text-foreground hover:bg-surface-raised flex items-center justify-center transition-colors cursor-pointer touch-manipulation active:scale-95"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Filtros de estado simples */}
        <div className="px-4 py-2 border-b border-border bg-surface-raised/30 flex items-center justify-between gap-2 overflow-x-auto scrollbar-none shrink-0">
          <div className="flex items-center gap-1 text-xs">
            {[
              { id: 'all', label: 'Todas' },
              { id: 'open', label: 'Abiertas' },
              { id: 'under_review', label: 'En revisión' },
              { id: 'completed', label: 'Resueltas' },
            ].map((tab) => {
              const isActive = statusFilter === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => {
                    sound.tap();
                    setStatusFilter(tab.id as any);
                  }}
                  className={`px-2.5 py-1 rounded text-xs font-medium transition-colors cursor-pointer whitespace-nowrap touch-manipulation ${
                    isActive
                      ? 'bg-foreground text-background font-semibold'
                      : 'text-foreground-muted hover:text-foreground hover:bg-surface-raised'
                  }`}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>

          <span className="text-[11px] font-mono text-foreground-subtle hidden sm:inline">
            {filteredItems.length} {filteredItems.length === 1 ? 'registro' : 'registros'}
          </span>
        </div>

        {/* Aviso de confirmación si existe */}
        {feedbackNotice && (
          <div
            className={`px-4 py-2 text-xs flex items-center gap-2 border-b font-mono ${
              feedbackNotice.type === 'success'
                ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-500'
                : 'bg-rose-500/10 border-rose-500/20 text-rose-500'
            }`}
          >
            {feedbackNotice.type === 'success' ? (
              <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
            ) : (
              <AlertCircle className="w-3.5 h-3.5 shrink-0" />
            )}
            <span>{feedbackNotice.message}</span>
          </div>
        )}

        {/* Cuerpo con scroll */}
        <div className="flex-1 overflow-y-auto p-3.5 sm:p-4 space-y-3">
          {/* Formulario minimalista de nueva incidencia */}
          {showCreateForm && (
            <form
              onSubmit={handleCreateSubmit}
              className="p-3.5 rounded-lg bg-surface-raised border border-border space-y-2.5 animate-in fade-in duration-100"
            >
              <div className="flex items-center justify-between pb-1 border-b border-border/70 text-xs">
                <span className="font-semibold text-foreground">
                  Registrar incidencia técnica
                </span>
                <span className="text-[11px] font-mono text-foreground-subtle">
                  @{currentUser?.username || 'Alumno'}
                </span>
              </div>

              {/* Título */}
              <div className="space-y-1">
                <label className="text-[11px] font-medium text-foreground-muted">
                  Título del problema:
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ej: Sin acceso a internet en equipo 12, error en enlace de temario..."
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="w-full px-2.5 py-1.5 rounded-md bg-surface border border-border text-xs sm:text-xs text-foreground placeholder:text-foreground-subtle outline-none focus:border-foreground/50 transition-colors"
                />
              </div>

              {/* Categoría o área */}
              <div className="space-y-1">
                <label className="text-[11px] font-medium text-foreground-muted">
                  Área afectada:
                </label>
                <select
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value as FeedbackCategory)}
                  className="w-full px-2.5 py-1.5 rounded-md bg-surface border border-border text-xs text-foreground outline-none focus:border-foreground/50 cursor-pointer"
                >
                  <option value="portal">Portal web / Aplicación</option>
                  <option value="general">Aula y redes (SMR)</option>
                  <option value="horario">Horario lectivo y entregas</option>
                  <option value="juegos">Recreo</option>
                  <option value="otros">Otro asunto técnico</option>
                </select>
              </div>

              {/* Descripción */}
              <div className="space-y-1">
                <label className="text-[11px] font-medium text-foreground-muted">
                  Detalles o pasos para reproducirlo:
                </label>
                <textarea
                  required
                  rows={3}
                  placeholder="Describe qué ocurre, el número de equipo del aula si aplica, navegador o fallo observado..."
                  value={newDesc}
                  onChange={(e) => setNewDesc(e.target.value)}
                  className="w-full px-2.5 py-1.5 rounded-md bg-surface border border-border text-xs sm:text-xs text-foreground placeholder:text-foreground-subtle outline-none focus:border-foreground/50 transition-colors resize-none leading-relaxed"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-1">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowCreateForm(false)}
                  className="text-xs h-7 px-3 rounded-md"
                >
                  Cancelar
                </Button>

                <Button
                  type="submit"
                  variant="primary"
                  size="sm"
                  disabled={isSubmitting || !newTitle.trim() || !newDesc.trim()}
                  isLoading={isSubmitting}
                  className="text-xs h-7 px-3 rounded-md"
                >
                  Guardar incidencia
                </Button>
              </div>
            </form>
          )}

          {/* Listado real de incidencias */}
          {isLoading ? (
            <div className="py-12 text-center text-xs text-foreground-subtle font-mono">
              Cargando incidencias...
            </div>
          ) : filteredItems.length === 0 ? (
            <div className="py-12 px-4 text-center space-y-2 rounded-lg border border-border bg-surface-raised/20">
              <div className="w-9 h-9 rounded-full bg-surface-raised border border-border flex items-center justify-center mx-auto text-foreground-subtle">
                <AlertCircle className="w-4 h-4" />
              </div>
              <p className="text-xs font-semibold text-foreground">
                No hay incidencias registradas
              </p>
              <p className="text-[11px] text-foreground-subtle max-w-sm mx-auto leading-relaxed">
                Si experimentas un fallo en el portal, los horarios o las redes del aula, puedes registrarlo pulsando en «Nueva».
              </p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {filteredItems.map((item) => {
                const isAuthor = currentUser?.id && currentUser.id === item.user_id;
                const isEditing = editingItemId === item.id;

                const statusBadge = (() => {
                  switch (item.status) {
                    case 'completed':
                      return (
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-mono border border-emerald-500/30 text-emerald-500 bg-emerald-500/5 font-medium">
                          Resuelta
                        </span>
                      );
                    case 'under_review':
                      return (
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-mono border border-blue-500/30 text-blue-500 bg-blue-500/5 font-medium">
                          En revisión
                        </span>
                      );
                    case 'dismissed':
                      return (
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-mono border border-border text-foreground-subtle line-through">
                          Descartada
                        </span>
                      );
                    default:
                      return (
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-mono border border-amber-500/30 text-amber-500 bg-amber-500/5 font-medium">
                          Abierta
                        </span>
                      );
                  }
                })();

                return (
                  <article
                    key={item.id}
                    className="p-3 sm:p-3.5 rounded-lg bg-surface border border-border hover:border-foreground/30 transition-colors space-y-2"
                  >
                    <div className="flex items-start gap-2.5">
                      {/* Botón +1 / Voto conciso */}
                      <button
                        type="button"
                        onClick={() => handleVote(item.id)}
                        title={item.has_voted ? 'Quitar apoyo' : 'Confirmar incidencia (+1)'}
                        className={`flex flex-col items-center justify-center w-8 py-1 rounded border transition-colors cursor-pointer shrink-0 touch-manipulation active:scale-95 ${
                          item.has_voted
                            ? 'bg-foreground text-background border-foreground font-semibold'
                            : 'bg-surface-raised border-border text-foreground-muted hover:text-foreground'
                        }`}
                      >
                        <ChevronUp className="w-3.5 h-3.5" />
                        <span className="font-mono text-[11px]">{item.upvotes_count}</span>
                      </button>

                      {/* Contenido de la incidencia */}
                      <div className="flex-1 min-w-0 space-y-1">
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-1.5 flex-wrap min-w-0">
                            {statusBadge}

                            <span className="px-1.5 py-0.5 rounded text-[10px] font-mono text-foreground-subtle bg-surface-raised border border-border/60">
                              {CATEGORY_LABELS[item.category] || item.category}
                            </span>

                            <span className="text-foreground-subtle text-[11px]">·</span>

                            <span className="text-[11px] text-foreground-subtle font-mono">
                              {formatRelativeOrDate(item.created_at)}
                            </span>
                          </div>

                          <div className="flex items-center gap-1 shrink-0">
                            {isAdminOrDelegado && (
                              <button
                                type="button"
                                onClick={() => {
                                  sound.tap();
                                  setEditingItemId(isEditing ? null : item.id);
                                  setAdminStatusInput(item.status);
                                  setAdminResponseInput(item.admin_response || '');
                                }}
                                className="text-[11px] font-mono text-foreground-muted hover:text-foreground underline cursor-pointer p-1"
                              >
                                {isEditing ? 'Cerrar' : 'Moderar'}
                              </button>
                            )}

                            {(isAuthor || isAdminOrDelegado) && (
                              <button
                                type="button"
                                onClick={() => handleDelete(item.id)}
                                title="Eliminar incidencia"
                                aria-label="Eliminar incidencia"
                                className="p-1 rounded text-foreground-subtle hover:text-danger hover:bg-surface-raised cursor-pointer transition-colors touch-manipulation active:scale-95"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </div>

                        <h3 className="text-xs sm:text-[13px] font-semibold text-foreground leading-snug break-words">
                          {item.title}
                        </h3>

                        <p className="text-xs text-foreground-muted leading-relaxed whitespace-pre-wrap break-words">
                          {item.description}
                        </p>

                        <div className="pt-1 text-[11px] font-mono text-foreground-subtle">
                          Reportado por <span className="font-semibold text-foreground">@{item.author_name}</span>
                        </div>

                        {/* Nota de resolución técnica si existe */}
                        {item.admin_response && !isEditing && (
                          <div className="mt-2 p-2 rounded bg-surface-raised border border-border text-xs space-y-0.5">
                            <div className="flex items-center gap-1.5 text-[10px] font-mono font-semibold text-foreground">
                              <ShieldCheck className="w-3 h-3 text-emerald-500" />
                              <span>Resolución técnica (@{item.admin_responder_name || 'Delegado'}):</span>
                            </div>
                            <p className="text-foreground-muted text-[11px] leading-relaxed whitespace-pre-wrap">
                              {item.admin_response}
                            </p>
                          </div>
                        )}

                        {/* Panel de moderación para admin/delegado */}
                        {isEditing && (
                          <div className="mt-2 p-2.5 rounded-lg bg-surface-raised border border-border space-y-2 animate-in fade-in duration-100">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-[11px] font-mono text-foreground-subtle">
                                Estado técnico:
                              </span>
                              <select
                                value={adminStatusInput}
                                onChange={(e) => setAdminStatusInput(e.target.value as FeedbackStatus)}
                                className="px-2 py-1 rounded bg-surface border border-border text-xs text-foreground outline-none cursor-pointer"
                              >
                                <option value="pending">Abierta</option>
                                <option value="under_review">En revisión</option>
                                <option value="completed">Resuelta</option>
                                <option value="dismissed">Descartada</option>
                              </select>
                            </div>

                            <textarea
                              rows={2}
                              value={adminResponseInput}
                              onChange={(e) => setAdminResponseInput(e.target.value)}
                              placeholder="Escribe la solución técnica, causa o estado de la reparación..."
                              className="w-full px-2 py-1.5 rounded bg-surface border border-border text-xs text-foreground resize-none leading-relaxed outline-none focus:border-foreground/50 transition-colors"
                            />

                            <div className="flex justify-end gap-1.5">
                              <Button
                                size="sm"
                                variant="primary"
                                onClick={() => handleSaveAdminResponse(item.id)}
                                disabled={isSavingAdmin}
                                isLoading={isSavingAdmin}
                                className="text-xs h-6 px-2.5 rounded-md"
                              >
                                Guardar resolución
                              </Button>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
