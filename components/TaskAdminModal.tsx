'use client';

import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  Lock,
  X,
  Plus,
  Trash2,
  AlertTriangle,
  ArrowRight,
  Eye,
  EyeOff,
  CheckCircle2,
} from 'lucide-react';
import { SMR2_SUBJECTS } from '@/lib/scheduleData';
import { CalendarEvent, UserProfile } from '@/lib/types';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';

interface TaskAdminModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: UserProfile | null;
  events: CalendarEvent[];
  onRefreshEvents: () => void;
  onBroadcastToChat?: (text: string) => void;
  initialSubject?: string;
}

const DEFAULT_ADMIN_PASS = 'smr2root';

export const TaskAdminModal: React.FC<TaskAdminModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  events,
  onRefreshEvents,
  onBroadcastToChat,
  initialSubject,
}) => {
  const isDirectAuthorized = currentUser?.role === 'admin' || currentUser?.role === 'delegado';
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [pinInput, setPinInput] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [pinError, setPinError] = useState<string | null>(null);

  const [activeTab, setActiveTab] = useState<'create' | 'list'>('create');

  // Form states
  const [title, setTitle] = useState('');
  const [subject, setSubject] = useState(initialSubject || 'SOR');
  const [eventType, setEventType] = useState<'exam' | 'homework' | 'reminder'>('homework');
  const [eventDate, setEventDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 3);
    return d.toISOString().split('T')[0];
  });
  const [startTime, setStartTime] = useState('09:05');
  const [priority, setPriority] = useState<'high' | 'normal' | 'low'>('normal');
  const [deliveryUrl, setDeliveryUrl] = useState('');
  const [description, setDescription] = useState('');
  const [broadcastNotice, setBroadcastNotice] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (initialSubject && SMR2_SUBJECTS[initialSubject]) {
      setSubject(initialSubject);
    }
  }, [initialSubject]);

  useEffect(() => {
    if (isDirectAuthorized) {
      setIsUnlocked(true);
      return;
    }
    try {
      const storedAuth = sessionStorage.getItem('smr2_delegado_unlocked');
      if (storedAuth === 'true') {
        setIsUnlocked(true);
      }
    } catch {}
  }, [isDirectAuthorized, isOpen]);

  if (!isOpen) return null;

  const handleUnlockPin = (e: React.FormEvent) => {
    e.preventDefault();
    const expectedPass = process.env.NEXT_PUBLIC_ADMIN_PIN || DEFAULT_ADMIN_PASS;
    if (pinInput.trim() === expectedPass) {
      setIsUnlocked(true);
      setPinError(null);
      setPinInput('');
      try {
        sessionStorage.setItem('smr2_delegado_unlocked', 'true');
      } catch {}
    } else {
      setPinError('Clave incorrecta. Solicita acceso al delegado de clase.');
    }
  };

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    setIsSubmitting(true);
    const newEvent: CalendarEvent = {
      id: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `task_${Date.now()}`,
      title: title.trim(),
      subject,
      event_type: eventType,
      event_date: eventDate,
      start_time: startTime || undefined,
      description: description.trim() || undefined,
      priority,
      delivery_url: deliveryUrl.trim() || undefined,
      is_completed: false,
      created_by: currentUser?.id,
      created_by_name: currentUser ? currentUser.username : 'Delegado',
      created_at: new Date().toISOString(),
    };

    const supabase = createClient();
    if (supabase) {
      try {
        const { error } = await supabase.from('calendar_events').insert([
          {
            title: newEvent.title,
            subject: newEvent.subject,
            event_type: newEvent.event_type,
            event_date: newEvent.event_date,
            start_time: newEvent.start_time,
            description: newEvent.description,
            priority: newEvent.priority,
            delivery_url: newEvent.delivery_url,
            is_completed: false,
            created_by: currentUser?.id || null,
            created_by_name: newEvent.created_by_name,
          },
        ]);

        if (error) throw error;
      } catch (err) {
        console.warn('Error al guardar en Supabase:', err);
      }
    }

    try {
      const stored = localStorage.getItem('smr2_calendar_events');
      const currentList: CalendarEvent[] = stored ? JSON.parse(stored) : [];
      const updated = [...currentList, newEvent].sort((a, b) => a.event_date.localeCompare(b.event_date));
      localStorage.setItem('smr2_calendar_events', JSON.stringify(updated));
    } catch {}

    if (broadcastNotice && onBroadcastToChat) {
      const typeLabel = eventType === 'exam' ? 'Examen' : 'Entrega';
      onBroadcastToChat(
        `[#AvisoAula] ${typeLabel} de ${subject}: "${newEvent.title}" (${newEvent.event_date})`
      );
    }

    onRefreshEvents();
    setTitle('');
    setDescription('');
    setDeliveryUrl('');
    setIsSubmitting(false);
    setActiveTab('list');
  };

  const handleDeleteTask = async (id: string) => {
    const supabase = createClient();
    if (supabase) {
      try {
        await supabase.from('calendar_events').delete().eq('id', id);
      } catch (err) {
        console.warn('Error deleting from Supabase:', err);
      }
    }

    try {
      const stored = localStorage.getItem('smr2_calendar_events');
      if (stored) {
        const list: CalendarEvent[] = JSON.parse(stored);
        const filtered = list.filter((item) => item.id !== id);
        localStorage.setItem('smr2_calendar_events', JSON.stringify(filtered));
      }
    } catch {}

    onRefreshEvents();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-xs pt-[env(safe-area-inset-top,0px)] pb-[env(safe-area-inset-bottom,0px)] animate-in fade-in duration-200">
      <div className="border border-border rounded-t-[20px] sm:rounded-[var(--radius-lg)] w-full max-w-xl max-h-[92dvh] bg-surface shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-4 py-3 border-b border-border flex items-center justify-between bg-surface-raised">
          <div className="flex items-center gap-2.5">
            <ShieldCheck className="w-4 h-4 text-accent" />
            <h3 className="text-sm font-semibold text-foreground">
              Gestión de tareas de clase
            </h3>
          </div>

          <button
            onClick={onClose}
            aria-label="Cerrar modal"
            className="w-11 h-11 rounded-lg text-foreground-muted hover:text-foreground hover:bg-surface flex items-center justify-center cursor-pointer active:scale-95 touch-manipulation"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {!isUnlocked ? (
          <div className="p-6 flex flex-col items-center text-center space-y-4">
            <div className="w-10 h-10 rounded-[var(--radius)] bg-surface-raised border border-border flex items-center justify-center text-foreground-muted">
              <Lock className="w-5 h-5 text-accent" />
            </div>
            <div className="space-y-1">
              <h4 className="text-sm font-semibold text-foreground">
                Acceso restringido
              </h4>
              <p className="text-xs text-foreground-muted max-w-xs">
                Introduce la clave de delegado para registrar o editar tareas del grupo.
              </p>
            </div>

            {pinError && (
              <div className="p-2.5 rounded-[var(--radius)] bg-danger-subtle border border-danger/20 text-xs text-danger flex items-center gap-2">
                <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                <span>{pinError}</span>
              </div>
            )}

            <form onSubmit={handleUnlockPin} className="w-full max-w-xs space-y-3">
              <Input
                type={showPassword ? 'text' : 'password'}
                required
                placeholder="Clave de delegado"
                value={pinInput}
                onChange={(e) => setPinInput(e.target.value)}
                rightElement={
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="text-foreground-subtle hover:text-foreground p-1 cursor-pointer"
                  >
                    {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                }
              />

              <Button type="submit" variant="primary" size="md" className="w-full">
                <span>Verificar acceso</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Button>
            </form>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto">
            {/* Tab switchers */}
            <div className="px-4 pt-3 pb-2 border-b border-border flex items-center justify-between gap-2">
              <div className="inline-flex p-1 rounded-[var(--radius)] bg-surface-raised border border-border">
                <button
                  type="button"
                  onClick={() => setActiveTab('create')}
                  className={`min-h-[44px] px-3.5 py-1.5 rounded-[var(--radius-sm)] text-xs font-medium transition-all cursor-pointer active:scale-95 touch-manipulation flex items-center gap-1.5 ${
                    activeTab === 'create'
                      ? 'bg-foreground text-background font-semibold shadow-xs'
                      : 'text-foreground-muted hover:text-foreground'
                  }`}
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Nueva tarea</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('list')}
                  className={`min-h-[44px] px-3.5 py-1.5 rounded-[var(--radius-sm)] text-xs font-medium transition-all cursor-pointer active:scale-95 touch-manipulation flex items-center ${
                    activeTab === 'list'
                      ? 'bg-foreground text-background font-semibold shadow-xs'
                      : 'text-foreground-muted hover:text-foreground'
                  }`}
                >
                  <span>Tareas activas ({events.length})</span>
                </button>
              </div>

              <Badge variant="success" size="sm">
                Autorizado
              </Badge>
            </div>

            {activeTab === 'create' ? (
              <form onSubmit={handleCreateTask} className="p-4 space-y-3.5">
                {/* Module selection */}
                <div>
                  <label className="block text-xs font-medium text-foreground-muted mb-1.5">
                    Módulo
                  </label>
                  <div className="grid grid-cols-4 sm:grid-cols-8 gap-1.5">
                    {Object.keys(SMR2_SUBJECTS).map((code) => {
                      if (code === 'RECREO') return null;
                      const isSelected = subject === code;
                      return (
                        <button
                          key={code}
                          type="button"
                          onClick={() => setSubject(code)}
                          className={`min-h-[42px] py-1.5 text-center rounded-[var(--radius-sm)] border text-xs font-mono transition-all cursor-pointer active:scale-95 touch-manipulation ${
                            isSelected
                              ? 'bg-foreground text-background font-bold border-foreground shadow-xs'
                              : 'bg-surface-raised border-border text-foreground-muted hover:text-foreground'
                          }`}
                        >
                          {code}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <Input
                  label="Título"
                  required
                  placeholder="ej: Práctica GPO y Active Directory"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                />

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-foreground-muted mb-1">
                      Tipo
                    </label>
                    <select
                      value={eventType}
                      onChange={(e) => setEventType(e.target.value as any)}
                      className="w-full min-h-[44px] px-3.5 bg-surface border border-border rounded-[var(--radius)] text-base sm:text-xs font-mono text-foreground focus:outline-none focus:border-border-focus"
                    >
                      <option value="homework">Entrega / Práctica</option>
                      <option value="exam">Examen</option>
                      <option value="reminder">Aviso</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-foreground-muted mb-1">
                      Fecha
                    </label>
                    <input
                      type="date"
                      required
                      value={eventDate}
                      onChange={(e) => setEventDate(e.target.value)}
                      className="w-full h-10 px-3 bg-surface border border-border rounded-[var(--radius)] text-xs font-mono text-foreground focus:outline-none focus:border-border-focus"
                    />
                  </div>
                </div>

                <Input
                  label="Enlace de entrega (opcional)"
                  type="url"
                  placeholder="https://..."
                  value={deliveryUrl}
                  onChange={(e) => setDeliveryUrl(e.target.value)}
                />

                <div>
                  <label className="block text-xs font-medium text-foreground-muted mb-1">
                    Descripción (opcional)
                  </label>
                  <textarea
                    rows={2}
                    placeholder="Instrucciones o contenido..."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="w-full p-2.5 bg-surface border border-border rounded-[var(--radius)] text-xs text-foreground placeholder:text-foreground-subtle focus:outline-none focus:border-border-focus font-sans"
                  />
                </div>

                <div className="flex items-center gap-2 pt-1">
                  <input
                    type="checkbox"
                    id="broadcastNotice"
                    checked={broadcastNotice}
                    onChange={(e) => setBroadcastNotice(e.target.checked)}
                    className="rounded-[var(--radius-sm)] border-border bg-surface text-foreground accent-accent cursor-pointer"
                  />
                  <label htmlFor="broadcastNotice" className="text-xs text-foreground-muted cursor-pointer">
                    Publicar aviso automático en el feed
                  </label>
                </div>

                <div className="pt-2">
                  <Button
                    type="submit"
                    variant="primary"
                    size="md"
                    className="w-full"
                    disabled={isSubmitting || !title.trim()}
                    isLoading={isSubmitting}
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Guardar y publicar</span>
                  </Button>
                </div>
              </form>
            ) : (
              <div className="p-4 space-y-2">
                {events.length === 0 ? (
                  <p className="text-center py-6 text-xs text-foreground-subtle font-mono">
                    No hay tareas activas registradas.
                  </p>
                ) : (
                  events.map((ev) => (
                    <div
                      key={ev.id}
                      className="p-3 rounded-[var(--radius)] bg-surface-raised border border-border flex items-center justify-between gap-3 text-xs"
                    >
                      <div className="space-y-0.5 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <Badge variant="default" size="sm">
                            {ev.subject}
                          </Badge>
                          <span className="font-semibold text-foreground truncate">
                            {ev.title}
                          </span>
                        </div>
                        <p className="text-[11px] font-mono text-foreground-subtle">
                          {ev.event_date}
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleDeleteTask(ev.id)}
                        className="text-foreground-subtle hover:text-danger p-1 cursor-pointer"
                        title="Eliminar tarea"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
