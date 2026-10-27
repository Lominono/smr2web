'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  X,
  Lightbulb,
  Bug,
  Sparkles,
  ChevronUp,
  MessageSquare,
  CheckCircle2,
  Clock,
  ShieldCheck,
  Plus,
  Trash2,
  Filter,
  AlertCircle,
  Tag,
  ArrowRight,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { sound } from '@/lib/audio';
import { createClient } from '@/lib/supabase/client';
import { UserProfile, CommunityFeedback, FeedbackType, FeedbackCategory, FeedbackStatus } from '@/lib/types';
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

export const FeedbackModal: React.FC<FeedbackModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  onOpenAuth,
}) => {
  const [items, setItems] = useState<CommunityFeedback[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [filterType, setFilterType] = useState<'all' | FeedbackType>('all');
  const [filterStatus, setFilterStatus] = useState<'all' | FeedbackStatus>('all');
  const [showCreateForm, setShowCreateForm] = useState<boolean>(false);

  // Campos de formulario
  const [newType, setNewType] = useState<FeedbackType>('idea');
  const [newCategory, setNewCategory] = useState<FeedbackCategory>('general');
  const [newTitle, setNewTitle] = useState<string>('');
  const [newDesc, setNewDesc] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [formFeedback, setFormFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Modo edición de delegado / admin
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [adminStatusInput, setAdminStatusInput] = useState<FeedbackStatus>('planned');
  const [adminResponseInput, setAdminResponseInput] = useState<string>('');
  const [isSavingAdmin, setIsSavingAdmin] = useState<boolean>(false);

  const isAdminOrDelegado = currentUser?.role === 'admin' || currentUser?.role === 'delegado';

  // Carga de datos
  const loadData = useCallback(async () => {
    try {
      const data = await fetchFeedbackList(currentUser?.id);
      setItems(data);
    } catch (err) {
      console.warn('Error cargando feedback:', err);
    } finally {
      setIsLoading(false);
    }
  }, [currentUser?.id]);

  useEffect(() => {
    if (isOpen) {
      loadData();
    }
  }, [isOpen, loadData]);

  // Suscripción Realtime mientras el modal esté abierto
  useEffect(() => {
    if (!isOpen) return;
    const supabase = createClient();
    if (!supabase) return;

    try {
      const channel = supabase
        .channel('realtime_community_feedback')
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

  // Cerrar con tecla Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Votar por una idea
  const handleVote = async (feedbackId: string) => {
    if (!currentUser) {
      if (onOpenAuth) onOpenAuth();
      return;
    }

    sound.tap();

    // Actualización optimista inmediata
    setItems((prev) =>
      prev.map((item) => {
        if (item.id === feedbackId) {
          const nextVoted = !item.has_voted;
          const nextCount = nextVoted ? item.upvotes_count + 1 : Math.max(0, item.upvotes_count - 1);
          return { ...item, has_voted: nextVoted, upvotes_count: nextCount };
        }
        return item;
      })
    );

    const res = await toggleVoteFeedback(feedbackId, currentUser.id);
    if (!res.success) {
      // Revertir si hubo error
      loadData();
    }
  };

  // Crear nueva propuesta
  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) {
      if (onOpenAuth) onOpenAuth();
      return;
    }

    setIsSubmitting(true);
    setFormFeedback(null);
    sound.tap();

    try {
      const res = await submitFeedbackItem({
        userId: currentUser.id,
        authorName: currentUser.username,
        type: newType,
        title: newTitle,
        description: newDesc,
        category: newCategory,
      });

      if (!res.success) {
        setFormFeedback({ type: 'error', message: res.error || 'No se pudo enviar la propuesta.' });
        return;
      }

      setFormFeedback({ type: 'success', message: '¡Gracias! Tu propuesta se ha publicado correctamente.' });
      setNewTitle('');
      setNewDesc('');
      setShowCreateForm(false);
      loadData();
    } catch (err: any) {
      setFormFeedback({ type: 'error', message: err?.message || 'Error de conexión.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Guardar respuesta o estado de admin
  const handleSaveAdminStatus = async (feedbackId: string) => {
    setIsSavingAdmin(true);
    sound.tap();

    try {
      const res = await updateFeedbackAdminStatus({
        feedbackId,
        status: adminStatusInput,
        adminResponse: adminResponseInput.trim() || undefined,
        adminName: currentUser?.username || 'Delegado',
      });

      if (res.success) {
        setEditingItemId(null);
        setAdminResponseInput('');
        loadData();
      }
    } finally {
      setIsSavingAdmin(false);
    }
  };

  // Eliminar elemento
  const handleDelete = async (feedbackId: string) => {
    if (!confirm('¿Seguro que quieres eliminar este elemento?')) return;
    sound.tap();

    setItems((prev) => prev.filter((i) => i.id !== feedbackId));
    await deleteFeedbackItem(feedbackId);
    loadData();
  };

  // Elementos filtrados
  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      if (filterType !== 'all' && item.type !== filterType) return false;
      if (filterStatus !== 'all' && item.status !== filterStatus) return false;
      return true;
    });
  }, [items, filterType, filterStatus]);

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150"
    >
      <div className="fixed inset-0" onClick={onClose} />

      <div className="relative z-10 w-full max-w-2xl max-h-[90dvh] flex flex-col rounded-2xl bg-surface border border-border shadow-2xl overflow-hidden animate-in zoom-in-95 duration-150">
        {/* Cabecera del modal */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border bg-surface shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center">
              <Lightbulb className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-foreground">
                Ideas y sugerencias
              </h2>
              <p className="text-xs text-foreground-muted">
                Propón nuevas funciones o reporta fallos para la clase
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-xl text-foreground-muted hover:text-foreground hover:bg-surface-raised flex items-center justify-center transition-colors cursor-pointer"
            aria-label="Cerrar modal"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Barra de acciones y filtros */}
        <div className="px-5 py-3 border-b border-border/60 bg-surface-raised/40 space-y-2.5 shrink-0">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            {/* Filtros por tipo */}
            <div className="flex items-center gap-1 overflow-x-auto scrollbar-none py-0.5">
              {[
                { id: 'all', label: 'Todas' },
                { id: 'idea', label: '💡 Ideas' },
                { id: 'improvement', label: '⚡ Mejoras' },
                { id: 'report', label: '🐛 Reportes' },
              ].map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => {
                    setFilterType(tab.id as any);
                    sound.tap();
                  }}
                  className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors cursor-pointer whitespace-nowrap ${
                    filterType === tab.id
                      ? 'bg-foreground text-background font-semibold shadow-xs'
                      : 'text-foreground-muted hover:text-foreground hover:bg-surface-raised'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Botón para redactar propuesta */}
            <Button
              variant={showCreateForm ? 'secondary' : 'primary'}
              size="sm"
              onClick={() => {
                setShowCreateForm((prev) => !prev);
                sound.tap();
              }}
              className="text-xs h-8 gap-1.5"
            >
              {showCreateForm ? (
                <>
                  <X className="w-3.5 h-3.5" />
                  <span>Cerrar formulario</span>
                </>
              ) : (
                <>
                  <Plus className="w-3.5 h-3.5" />
                  <span>Enviar idea o reporte</span>
                </>
              )}
            </Button>
          </div>

          {/* Filtro secundario por estado */}
          <div className="flex items-center gap-1.5 text-xs text-foreground-subtle overflow-x-auto scrollbar-none">
            <span className="text-[11px] font-medium shrink-0">Estado:</span>
            {[
              { id: 'all', label: 'Todos' },
              { id: 'pending', label: 'Pendientes' },
              { id: 'planned', label: 'Planificados' },
              { id: 'completed', label: 'Implementados' },
            ].map((st) => (
              <button
                key={st.id}
                type="button"
                onClick={() => {
                  setFilterStatus(st.id as any);
                  sound.tap();
                }}
                className={`px-2 py-0.5 rounded-md text-[11px] transition-colors cursor-pointer ${
                  filterStatus === st.id
                    ? 'bg-surface-raised text-foreground font-semibold border border-border'
                    : 'text-foreground-muted hover:text-foreground'
                }`}
              >
                {st.label}
              </button>
            ))}
          </div>
        </div>

        {/* Contenido scrolleable */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {/* Formulario de creación desplegable */}
          {showCreateForm && (
            <form
              onSubmit={handleCreateSubmit}
              className="p-4 rounded-xl bg-surface-raised border border-border space-y-3 animate-in fade-in duration-150"
            >
              <div className="flex items-center justify-between pb-1 border-b border-border/50">
                <span className="text-xs font-semibold text-foreground">
                  Nueva propuesta para el portal
                </span>
                <span className="text-[11px] text-foreground-subtle">
                  Publicando como @{currentUser ? currentUser.username : 'Invitado'}
                </span>
              </div>

              {/* Selector de Tipo */}
              <div className="space-y-1">
                <label className="text-[11px] font-medium text-foreground-muted">Tipo de aportación:</label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: 'idea', label: '💡 Idea nueva', desc: 'Propuesta de función' },
                    { id: 'improvement', label: '⚡ Mejora', desc: 'Optimizar algo existente' },
                    { id: 'report', label: '🐛 Reporte de fallo', desc: 'Notificar un error' },
                  ].map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => setNewType(t.id as FeedbackType)}
                      className={`p-2 rounded-lg border text-left transition-colors cursor-pointer ${
                        newType === t.id
                          ? 'bg-surface border-foreground/40 text-foreground shadow-2xs font-semibold'
                          : 'bg-surface/50 border-border/70 text-foreground-muted hover:text-foreground'
                      }`}
                    >
                      <div className="text-xs">{t.label}</div>
                      <div className="text-[10px] text-foreground-subtle font-normal truncate mt-0.5">{t.desc}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Selector de Categoría */}
              <div className="space-y-1">
                <label className="text-[11px] font-medium text-foreground-muted">Categoría:</label>
                <select
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value as FeedbackCategory)}
                  className="w-full px-3 py-1.5 rounded-lg bg-surface border border-border text-xs text-foreground focus:outline-hidden"
                >
                  <option value="general">General / Portal web</option>
                  <option value="horario">Horario y tareas</option>
                  <option value="juegos">Recreo y juegos</option>
                  <option value="inversiones">Bolsa e inversiones</option>
                  <option value="otros">Otros</option>
                </select>
              </div>

              {/* Título */}
              <div className="space-y-1">
                <label className="text-[11px] font-medium text-foreground-muted">Título breve:</label>
                <input
                  type="text"
                  required
                  placeholder="Ej. Añadir modo oscuro programado según la hora"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-surface border border-border text-xs text-foreground placeholder:text-foreground-subtle focus:outline-hidden focus:border-foreground/50 transition-colors"
                />
              </div>

              {/* Descripción */}
              <div className="space-y-1">
                <label className="text-[11px] font-medium text-foreground-muted">Descripción y detalles:</label>
                <textarea
                  required
                  rows={3}
                  placeholder="Explica qué te gustaría que tuviera o cómo reproducir el error si es un reporte..."
                  value={newDesc}
                  onChange={(e) => setNewDesc(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-surface border border-border text-xs text-foreground placeholder:text-foreground-subtle focus:outline-hidden focus:border-foreground/50 transition-colors resize-none"
                />
              </div>

              {formFeedback && (
                <div
                  className={`p-2.5 rounded-lg text-xs flex items-center gap-1.5 border ${
                    formFeedback.type === 'success'
                      ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400'
                      : 'bg-rose-500/10 border-rose-500/20 text-rose-600 dark:text-rose-400'
                  }`}
                >
                  {formFeedback.type === 'success' ? (
                    <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                  ) : (
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  )}
                  <span>{formFeedback.message}</span>
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-1">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowCreateForm(false)}
                  className="text-xs h-8"
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  size="sm"
                  disabled={isSubmitting || !newTitle.trim() || !newDesc.trim()}
                  className="text-xs h-8"
                >
                  {isSubmitting ? 'Publicando...' : 'Publicar propuesta'}
                </Button>
              </div>
            </form>
          )}

          {/* Listado de ideas */}
          {isLoading ? (
            <div className="py-12 text-center text-xs text-foreground-subtle">
              Cargando sugerencias de la clase...
            </div>
          ) : filteredItems.length === 0 ? (
            <div className="py-12 text-center space-y-2 border border-dashed border-border rounded-xl">
              <Lightbulb className="w-6 h-6 text-foreground-subtle mx-auto" />
              <p className="text-xs font-medium text-foreground">No hay aportaciones en este filtro</p>
              <p className="text-[11px] text-foreground-subtle">
                Sé el primero en proponer una idea o reportar un detalle con el botón de arriba.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredItems.map((item) => {
                const isAuthor = currentUser?.id && currentUser.id === item.user_id;
                const isEditing = editingItemId === item.id;

                return (
                  <div
                    key={item.id}
                    className="p-3.5 sm:p-4 rounded-xl bg-surface border border-border/80 hover:border-border transition-colors space-y-2.5"
                  >
                    <div className="flex items-start gap-3">
                      {/* Botón de voto (Upvote) */}
                      <button
                        type="button"
                        onClick={() => handleVote(item.id)}
                        className={`flex flex-col items-center justify-center w-11 py-1.5 rounded-lg border transition-all cursor-pointer shrink-0 active:scale-95 ${
                          item.has_voted
                            ? 'bg-foreground text-background border-foreground font-bold shadow-2xs'
                            : 'bg-surface-raised border-border text-foreground-muted hover:text-foreground hover:bg-surface'
                        }`}
                        title={item.has_voted ? 'Votado (haz clic para quitar voto)' : 'Votar por esta propuesta'}
                      >
                        <ChevronUp className="w-4 h-4" />
                        <span className="font-mono text-xs">{item.upvotes_count}</span>
                      </button>

                      {/* Contenido principal */}
                      <div className="flex-1 min-w-0 space-y-1">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          {/* Tipo */}
                          <span
                            className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${
                              item.type === 'idea'
                                ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
                                : item.type === 'improvement'
                                ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400'
                                : 'bg-rose-500/10 text-rose-600 dark:text-rose-400'
                            }`}
                          >
                            {item.type === 'idea' ? '💡 Idea' : item.type === 'improvement' ? '⚡ Mejora' : '🐛 Reporte'}
                          </span>

                          {/* Categoría */}
                          <span className="px-1.5 py-0.5 rounded text-[10px] bg-surface-raised text-foreground-subtle capitalize">
                            {item.category}
                          </span>

                          {/* Estado */}
                          <span
                            className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${
                              item.status === 'completed'
                                ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                                : item.status === 'planned'
                                ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400'
                                : item.status === 'under_review'
                                ? 'bg-blue-500/15 text-blue-600 dark:text-blue-400'
                                : item.status === 'dismissed'
                                ? 'bg-surface-raised text-foreground-subtle line-through'
                                : 'bg-surface-raised text-foreground-muted'
                            }`}
                          >
                            {item.status === 'completed'
                              ? 'Implementado'
                              : item.status === 'planned'
                              ? 'Planificado'
                              : item.status === 'under_review'
                              ? 'En revisión'
                              : item.status === 'dismissed'
                              ? 'Descartado'
                              : 'Pendiente'}
                          </span>
                        </div>

                        <h3 className="text-sm font-semibold text-foreground tracking-tight">
                          {item.title}
                        </h3>

                        <p className="text-xs text-foreground-muted leading-relaxed whitespace-pre-wrap">
                          {item.description}
                        </p>

                        {/* Respuesta oficial de administración si existe */}
                        {item.admin_response && (
                          <div className="mt-2 p-2.5 rounded-lg bg-surface-raised border border-border/80 text-xs space-y-1">
                            <div className="flex items-center gap-1.5 text-[11px] font-semibold text-accent">
                              <ShieldCheck className="w-3.5 h-3.5" />
                              <span>Respuesta de @{item.admin_responder_name || 'Delegado'}:</span>
                            </div>
                            <p className="text-foreground text-xs leading-normal">
                              {item.admin_response}
                            </p>
                          </div>
                        )}

                        <div className="flex items-center justify-between pt-1 text-[11px] text-foreground-subtle">
                          <span>
                            Por <span className="text-foreground-muted font-medium">@{item.author_name}</span>
                          </span>

                          <div className="flex items-center gap-2">
                            {/* Opciones de autor o delegado */}
                            {(isAuthor || isAdminOrDelegado) && (
                              <button
                                type="button"
                                onClick={() => handleDelete(item.id)}
                                className="text-foreground-subtle hover:text-rose-500 p-0.5 rounded cursor-pointer transition-colors"
                                title="Eliminar"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}

                            {isAdminOrDelegado && !isEditing && (
                              <button
                                type="button"
                                onClick={() => {
                                  setEditingItemId(item.id);
                                  setAdminStatusInput(item.status);
                                  setAdminResponseInput(item.admin_response || '');
                                }}
                                className="text-accent hover:underline font-medium cursor-pointer"
                              >
                                Gestionar
                              </button>
                            )}
                          </div>
                        </div>

                        {/* Panel de gestión rápida para admin / delegado */}
                        {isEditing && (
                          <div className="mt-2 p-3 rounded-xl bg-surface-raised border border-border space-y-2">
                            <span className="text-xs font-semibold text-foreground block">
                              Panel de delegado / moderador
                            </span>

                            <div className="grid grid-cols-2 gap-2 text-xs">
                              <div>
                                <label className="text-[10px] text-foreground-subtle block mb-1">Estado:</label>
                                <select
                                  value={adminStatusInput}
                                  onChange={(e) => setAdminStatusInput(e.target.value as FeedbackStatus)}
                                  className="w-full px-2 py-1 rounded bg-surface border border-border text-xs"
                                >
                                  <option value="pending">Pendiente</option>
                                  <option value="under_review">En revisión</option>
                                  <option value="planned">Planificado</option>
                                  <option value="completed">Implementado</option>
                                  <option value="dismissed">Descartado</option>
                                </select>
                              </div>

                              <div>
                                <label className="text-[10px] text-foreground-subtle block mb-1">Respuesta oficial:</label>
                                <input
                                  type="text"
                                  placeholder="Escribe una breve respuesta..."
                                  value={adminResponseInput}
                                  onChange={(e) => setAdminResponseInput(e.target.value)}
                                  className="w-full px-2 py-1 rounded bg-surface border border-border text-xs"
                                />
                              </div>
                            </div>

                            <div className="flex items-center justify-end gap-1.5 pt-1">
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => setEditingItemId(null)}
                                className="text-xs h-7"
                              >
                                Cancelar
                              </Button>
                              <Button
                                type="button"
                                variant="primary"
                                size="sm"
                                disabled={isSavingAdmin}
                                onClick={() => handleSaveAdminStatus(item.id)}
                                className="text-xs h-7"
                              >
                                {isSavingAdmin ? 'Guardando...' : 'Actualizar estado'}
                              </Button>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
