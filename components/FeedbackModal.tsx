'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  X,
  ChevronUp,
  ShieldCheck,
  Plus,
  Trash2,
  AlertCircle,
  CheckCircle2,
  MessageSquare,
  Clock,
  Filter,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
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

  // Formulario
  const [newType, setNewType] = useState<FeedbackType>('report');
  const [newCategory, setNewCategory] = useState<FeedbackCategory>('portal');
  const [newTitle, setNewTitle] = useState<string>('');
  const [newDesc, setNewDesc] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [formFeedback, setFormFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Edición para admin / delegado
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [adminStatusInput, setAdminStatusInput] = useState<FeedbackStatus>('under_review');
  const [adminResponseInput, setAdminResponseInput] = useState<string>('');
  const [isSavingAdmin, setIsSavingAdmin] = useState<boolean>(false);

  const isAdminOrDelegado = currentUser?.role === 'admin' || currentUser?.role === 'delegado';

  const loadData = useCallback(async () => {
    try {
      const data = await fetchFeedbackList(currentUser?.id);
      setItems(data);
    } catch (err) {
      console.warn('Error cargando reportes:', err);
    } finally {
      setIsLoading(false);
    }
  }, [currentUser?.id]);

  useEffect(() => {
    if (isOpen) {
      loadData();
    }
  }, [isOpen, loadData]);

  // Suscripción Realtime en Supabase
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
    if (!newTitle.trim() || !newDesc.trim()) return;

    if (!currentUser) {
      sound.tap();
      onOpenAuth?.();
      return;
    }

    setIsSubmitting(true);
    setFormFeedback(null);

    const res = await submitFeedbackItem({
      userId: currentUser.id,
      authorName: currentUser.username,
      type: newType,
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
      setFormFeedback({ type: 'success', message: 'Reporte registrado correctamente.' });
      setTimeout(() => setFormFeedback(null), 4000);
    } else {
      sound.broke();
      setFormFeedback({ type: 'error', message: res.error || 'Error al enviar reporte.' });
    }
  };

  const handleSaveAdminResponse = async (itemId: string) => {
    setIsSavingAdmin(true);
    const res = await updateFeedbackAdminStatus({
      feedbackId: itemId,
      status: adminStatusInput,
      adminResponse: adminResponseInput,
      adminName: currentUser?.username || 'Admin',
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
                admin_responder_name: currentUser?.username || 'Admin',
              }
            : it
        )
      );
      setEditingItemId(null);
    }
  };

  const handleDelete = async (itemId: string) => {
    if (!window.confirm('¿Eliminar este reporte permanentemente?')) return;
    sound.tap();

    const res = await deleteFeedbackItem(itemId);
    if (res.success) {
      setItems((prev) => prev.filter((it) => it.id !== itemId));
    }
  };

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

      <div className="relative z-10 w-full max-w-2xl max-h-[90dvh] flex flex-col rounded-xl bg-surface border border-border shadow-xl overflow-hidden animate-in zoom-in-95 duration-150">
        {/* Cabecera */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-surface shrink-0">
          <div>
            <h2 className="text-sm font-semibold text-foreground tracking-tight">
              Reportes e incidencias
            </h2>
            <p className="text-[11px] text-foreground-subtle">
              Seguimiento técnico de fallos y propuestas de mejora
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-7 h-7 rounded-md text-foreground-subtle hover:text-foreground hover:bg-surface-raised flex items-center justify-center transition-colors cursor-pointer"
            aria-label="Cerrar modal"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Barra de control y filtros */}
        <div className="px-4 py-2.5 border-b border-border bg-surface-raised/30 space-y-2 shrink-0">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            {/* Filtros por tipo de entrada */}
            <div className="flex items-center gap-1 overflow-x-auto scrollbar-none">
              {[
                { id: 'all', label: 'Todos' },
                { id: 'report', label: 'Incidencias' },
                { id: 'improvement', label: 'Mejoras' },
                { id: 'idea', label: 'Propuestas' },
              ].map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => {
                    setFilterType(tab.id as any);
                    sound.tap();
                  }}
                  className={`px-2.5 py-1 rounded text-xs font-medium transition-colors cursor-pointer whitespace-nowrap ${
                    filterType === tab.id
                      ? 'bg-foreground text-background font-semibold'
                      : 'text-foreground-muted hover:text-foreground hover:bg-surface-raised'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <Button
              variant={showCreateForm ? 'secondary' : 'primary'}
              size="sm"
              onClick={() => {
                setShowCreateForm((prev) => !prev);
                sound.tap();
              }}
              className="text-xs h-7 px-2.5 rounded-md"
            >
              {showCreateForm ? 'Cancelar' : 'Nuevo reporte'}
            </Button>
          </div>

          {/* Filtro por estado técnico */}
          <div className="flex items-center gap-1.5 text-xs text-foreground-subtle overflow-x-auto scrollbar-none pt-0.5">
            <span className="text-[11px] font-mono shrink-0">Estado:</span>
            {[
              { id: 'all', label: 'Todos' },
              { id: 'pending', label: 'Abiertos' },
              { id: 'under_review', label: 'En revisión' },
              { id: 'planned', label: 'Planificados' },
              { id: 'completed', label: 'Resueltos' },
              { id: 'dismissed', label: 'Descartados' },
            ].map((st) => (
              <button
                key={st.id}
                type="button"
                onClick={() => {
                  setFilterStatus(st.id as any);
                  sound.tap();
                }}
                className={`px-2 py-0.5 rounded text-[11px] transition-colors cursor-pointer ${
                  filterStatus === st.id
                    ? 'bg-surface text-foreground font-semibold border border-border'
                    : 'text-foreground-subtle hover:text-foreground'
                }`}
              >
                {st.label}
              </button>
            ))}
          </div>
        </div>

        {/* Área de contenido */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {/* Formulario de reporte */}
          {showCreateForm && (
            <form
              onSubmit={handleCreateSubmit}
              className="p-3.5 rounded-lg bg-surface-raised border border-border space-y-3 animate-in fade-in duration-100"
            >
              <div className="flex items-center justify-between pb-1 border-b border-border/60 text-xs">
                <span className="font-semibold text-foreground">
                  Registrar nueva entrada
                </span>
                <span className="text-foreground-subtle font-mono text-[11px]">
                  @{currentUser ? currentUser.username : 'Invitado'}
                </span>
              </div>

              {/* Selector de tipo */}
              <div className="space-y-1">
                <label className="text-[11px] font-medium text-foreground-muted">Tipo:</label>
                <div className="grid grid-cols-3 gap-1.5">
                  {[
                    { id: 'report', label: 'Incidencia', desc: 'Error o fallo' },
                    { id: 'improvement', label: 'Mejora técnica', desc: 'Ajuste de función' },
                    { id: 'idea', label: 'Propuesta', desc: 'Nueva característica' },
                  ].map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => setNewType(t.id as FeedbackType)}
                      className={`p-2 rounded border text-left transition-colors cursor-pointer ${
                        newType === t.id
                          ? 'bg-surface border-foreground text-foreground font-semibold'
                          : 'bg-surface/50 border-border text-foreground-muted hover:text-foreground'
                      }`}
                    >
                      <div className="text-xs">{t.label}</div>
                      <div className="text-[10px] text-foreground-subtle truncate">{t.desc}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Selector de módulo */}
              <div className="space-y-1">
                <label className="text-[11px] font-medium text-foreground-muted">Módulo afectado:</label>
                <select
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value as FeedbackCategory)}
                  className="w-full px-2.5 py-1.5 rounded bg-surface border border-border text-xs text-foreground focus:outline-hidden"
                >
                  <option value="portal">Portal y Feed</option>
                  <option value="horario">Horario y Tareas</option>
                  <option value="juegos">Recreo y Fichas</option>
                  <option value="inversiones">Bolsa</option>
                  <option value="general">Cuenta / Sistema</option>
                  <option value="otros">Otro</option>
                </select>
              </div>

              {/* Título */}
              <div className="space-y-1">
                <label className="text-[11px] font-medium text-foreground-muted">Título:</label>
                <input
                  type="text"
                  required
                  placeholder="Descripción resumida del problema o propuesta"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="w-full px-2.5 py-1.5 rounded bg-surface border border-border text-xs text-foreground placeholder:text-foreground-subtle focus:outline-hidden focus:border-foreground/50 transition-colors"
                />
              </div>

              {/* Descripción */}
              <div className="space-y-1">
                <label className="text-[11px] font-medium text-foreground-muted">Detalles / Pasos para reproducir:</label>
                <textarea
                  required
                  rows={3}
                  placeholder="Explica qué ocurre, en qué navegador/dispositivo o qué cambio propones..."
                  value={newDesc}
                  onChange={(e) => setNewDesc(e.target.value)}
                  className="w-full px-2.5 py-1.5 rounded bg-surface border border-border text-xs text-foreground placeholder:text-foreground-subtle focus:outline-hidden focus:border-foreground/50 transition-colors resize-none leading-relaxed"
                />
              </div>

              {formFeedback && (
                <div
                  className={`p-2 rounded text-xs flex items-center gap-1.5 border ${
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
                  className="text-xs h-7"
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  size="sm"
                  disabled={isSubmitting || !newTitle.trim() || !newDesc.trim()}
                  className="text-xs h-7 px-3 rounded-md"
                >
                  {isSubmitting ? 'Guardando...' : 'Registrar'}
                </Button>
              </div>
            </form>
          )}

          {/* Listado de reportes */}
          {isLoading ? (
            <div className="py-12 text-center text-xs text-foreground-subtle font-mono">
              Cargando registros...
            </div>
          ) : filteredItems.length === 0 ? (
            <div className="py-12 text-center space-y-1 border border-border rounded-lg bg-surface-raised/20">
              <p className="text-xs font-medium text-foreground">Sin registros</p>
              <p className="text-[11px] text-foreground-subtle">
                No hay incidencias ni propuestas en este filtro.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {filteredItems.map((item) => {
                const isAuthor = currentUser?.id && currentUser.id === item.user_id;
                const isEditing = editingItemId === item.id;

                return (
                  <div
                    key={item.id}
                    className="p-3.5 rounded-lg bg-surface border border-border hover:border-foreground/30 transition-colors space-y-2"
                  >
                    <div className="flex items-start gap-2.5">
                      {/* Voto conciso */}
                      <button
                        type="button"
                        onClick={() => handleVote(item.id)}
                        className={`flex flex-col items-center justify-center w-8 py-1 rounded border transition-colors cursor-pointer shrink-0 ${
                          item.has_voted
                            ? 'bg-foreground text-background border-foreground font-semibold'
                            : 'bg-surface-raised border-border text-foreground-muted hover:text-foreground'
                        }`}
                        title={item.has_voted ? 'Quitar voto' : 'Votar'}
                      >
                        <ChevronUp className="w-3.5 h-3.5" />
                        <span className="font-mono text-[11px]">{item.upvotes_count}</span>
                      </button>

                      {/* Cuerpo */}
                      <div className="flex-1 min-w-0 space-y-1">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          {/* Tipo */}
                          <span
                            className={`px-1.5 py-0.2 rounded text-[10px] font-mono uppercase font-semibold border ${
                              item.type === 'report'
                                ? 'border-danger/30 text-danger bg-danger/5'
                                : item.type === 'improvement'
                                ? 'border-blue-500/30 text-blue-500 bg-blue-500/5'
                                : 'border-border text-foreground-muted bg-surface-raised'
                            }`}
                          >
                            {item.type === 'report' ? 'Incidencia' : item.type === 'improvement' ? 'Mejora' : 'Propuesta'}
                          </span>

                          {/* Módulo */}
                          <span className="px-1.5 py-0.2 rounded text-[10px] font-mono text-foreground-subtle bg-surface-raised border border-border/60">
                            {item.category}
                          </span>

                          {/* Estado */}
                          <span
                            className={`px-1.5 py-0.2 rounded text-[10px] font-mono border ${
                              item.status === 'completed'
                                ? 'border-emerald-500/30 text-emerald-600 dark:text-emerald-400 bg-emerald-500/5'
                                : item.status === 'planned'
                                ? 'border-amber-500/30 text-amber-600 dark:text-amber-400 bg-amber-500/5'
                                : item.status === 'under_review'
                                ? 'border-blue-500/30 text-blue-600 dark:text-blue-400 bg-blue-500/5'
                                : item.status === 'dismissed'
                                ? 'border-border text-foreground-subtle line-through'
                                : 'border-border text-foreground-muted'
                            }`}
                          >
                            {item.status === 'completed'
                              ? 'Resuelto'
                              : item.status === 'planned'
                              ? 'Planificado'
                              : item.status === 'under_review'
                              ? 'En revisión'
                              : item.status === 'dismissed'
                              ? 'Descartado'
                              : 'Abierto'}
                          </span>
                        </div>

                        <h3 className="text-xs sm:text-[13px] font-semibold text-foreground leading-snug">
                          {item.title}
                        </h3>

                        <p className="text-xs text-foreground-muted leading-relaxed whitespace-pre-wrap">
                          {item.description}
                        </p>

                        <div className="flex items-center justify-between gap-2 pt-1 text-[11px] font-mono text-foreground-subtle">
                          <span>
                            @{item.author_name} · {new Date(item.created_at).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}
                          </span>

                          <div className="flex items-center gap-2">
                            {isAdminOrDelegado && (
                              <button
                                type="button"
                                onClick={() => {
                                  setEditingItemId(isEditing ? null : item.id);
                                  setAdminStatusInput(item.status);
                                  setAdminResponseInput(item.admin_response || '');
                                }}
                                className="hover:text-foreground cursor-pointer underline"
                              >
                                {isEditing ? 'Cancelar edición' : 'Moderar'}
                              </button>
                            )}

                            {(isAuthor || isAdminOrDelegado) && (
                              <button
                                type="button"
                                onClick={() => handleDelete(item.id)}
                                title="Eliminar registro"
                                className="hover:text-danger cursor-pointer p-0.5"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            )}
                          </div>
                        </div>

                        {/* Respuesta de administración / delegado */}
                        {item.admin_response && !isEditing && (
                          <div className="mt-2 p-2 rounded bg-surface-raised border border-border text-xs space-y-0.5">
                            <span className="text-[10px] font-mono font-semibold text-foreground">
                              Resolución (@{item.admin_responder_name || 'Admin'}):
                            </span>
                            <p className="text-foreground-muted text-[11px] leading-relaxed">
                              {item.admin_response}
                            </p>
                          </div>
                        )}

                        {/* Editor de moderación */}
                        {isEditing && (
                          <div className="mt-2 p-2.5 rounded bg-surface-raised border border-border space-y-2">
                            <div className="flex items-center gap-2">
                              <span className="text-[11px] font-mono text-foreground-subtle">Actualizar estado:</span>
                              <select
                                value={adminStatusInput}
                                onChange={(e) => setAdminStatusInput(e.target.value as FeedbackStatus)}
                                className="px-2 py-1 rounded bg-surface border border-border text-xs text-foreground"
                              >
                                <option value="pending">Abierto</option>
                                <option value="under_review">En revisión</option>
                                <option value="planned">Planificado</option>
                                <option value="completed">Resuelto</option>
                                <option value="dismissed">Descartado</option>
                              </select>
                            </div>

                            <textarea
                              rows={2}
                              value={adminResponseInput}
                              onChange={(e) => setAdminResponseInput(e.target.value)}
                              placeholder="Nota técnica o explicación de resolución..."
                              className="w-full px-2 py-1.5 rounded bg-surface border border-border text-xs text-foreground resize-none leading-relaxed"
                            />

                            <div className="flex justify-end gap-1.5">
                              <Button
                                size="sm"
                                variant="primary"
                                onClick={() => handleSaveAdminResponse(item.id)}
                                disabled={isSavingAdmin}
                                className="text-xs h-6 px-2.5 rounded"
                              >
                                {isSavingAdmin ? 'Guardando...' : 'Guardar estado'}
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
