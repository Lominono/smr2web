'use client';

import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  Lock,
  X,
  Plus,
  Trash2,
  Calendar,
  Clock,
  Link as LinkIcon,
  CheckCircle2,
  AlertTriangle,
  Send,
  Sparkles,
  BookOpen,
  ArrowRight,
  Filter,
} from 'lucide-react';
import { SMR2_SUBJECTS } from '@/lib/scheduleData';
import { CalendarEvent, UserProfile } from '@/lib/types';
import { sound } from '@/lib/audio';
import { createClient } from '@/lib/supabase/client';
import confetti from 'canvas-confetti';

interface TaskAdminModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: UserProfile | null;
  events: CalendarEvent[];
  onRefreshEvents: () => void;
  onBroadcastToChat?: (text: string) => void;
}

const DEFAULT_ADMIN_PASS = 'smr2root';

export const TaskAdminModal: React.FC<TaskAdminModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  events,
  onRefreshEvents,
  onBroadcastToChat,
}) => {
  const isDirectAuthorized = currentUser?.role === 'admin' || currentUser?.role === 'delegado';
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [pinInput, setPinInput] = useState('');
  const [pinError, setPinError] = useState<string | null>(null);
  const [attempts, setAttempts] = useState(0);
  const [lockedUntil, setLockedUntil] = useState<number | null>(null);

  const [activeTab, setActiveTab] = useState<'create' | 'list'>('create');

  // Form states for creating a task
  const [title, setTitle] = useState('');
  const [subject, setSubject] = useState('SOR');
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

  // Check if session previously unlocked admin in localStorage
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
    if (lockedUntil && Date.now() < lockedUntil) {
      const remainingSec = Math.ceil((lockedUntil - Date.now()) / 1000);
      setPinError(`Bloqueado por seguridad. Espera ${remainingSec} segundos.`);
      sound.broke();
      return;
    }

    const expectedPass = process.env.NEXT_PUBLIC_ADMIN_PIN || DEFAULT_ADMIN_PASS;
    if (pinInput.trim() === expectedPass) {
      setIsUnlocked(true);
      setPinError(null);
      setPinInput('');
      sound.coinWin();
      try {
        sessionStorage.setItem('smr2_delegado_unlocked', 'true');
      } catch {}
    } else {
      const nextAttempts = attempts + 1;
      setAttempts(nextAttempts);
      sound.broke();
      if (nextAttempts >= 4) {
        const lockoutTime = Date.now() + 30000;
        setLockedUntil(lockoutTime);
        setPinError('Demasiados intentos fallidos. Bloqueado durante 30 segundos.');
      } else {
        setPinError(`Clave incorrecta. Intentos restantes: ${4 - nextAttempts}`);
      }
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
      created_by_name: currentUser ? currentUser.username : 'Delegado SMR2',
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

    // Dual-save in local storage fallback
    try {
      const stored = localStorage.getItem('smr2_calendar_events');
      const currentList: CalendarEvent[] = stored ? JSON.parse(stored) : [];
      const updated = [...currentList, newEvent].sort((a, b) => a.event_date.localeCompare(b.event_date));
      localStorage.setItem('smr2_calendar_events', JSON.stringify(updated));
    } catch {}

    // Broadcast notice to the live chat if checked
    if (broadcastNotice && onBroadcastToChat) {
      const typeLabel = eventType === 'exam' ? 'Examen' : 'Entrega';
      onBroadcastToChat(
        `📌 Nueva tarea de ${subject}: "${newEvent.title}" para el ${newEvent.event_date}`
      );
    }

    sound.coinWin();
    confetti({
      particleCount: 60,
      spread: 60,
      origin: { y: 0.6 },
    });

    onRefreshEvents();
    setTitle('');
    setDescription('');
    setDeliveryUrl('');
    setIsSubmitting(false);
    setActiveTab('list');
  };

  const handleDeleteTask = async (id: string) => {
    sound.tap();
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

  const handleToggleComplete = async (event: CalendarEvent) => {
    sound.tap();
    const nextCompleted = !event.is_completed;

    const supabase = createClient();
    if (supabase) {
      try {
        await supabase
          .from('calendar_events')
          .update({ is_completed: nextCompleted })
          .eq('id', event.id);
      } catch (err) {
        console.warn('Error toggling completion:', err);
      }
    }

    try {
      const stored = localStorage.getItem('smr2_calendar_events');
      if (stored) {
        const list: CalendarEvent[] = JSON.parse(stored);
        const updated = list.map((item) =>
          item.id === event.id ? { ...item, is_completed: nextCompleted } : item
        );
        localStorage.setItem('smr2_calendar_events', JSON.stringify(updated));
      }
    } catch {}

    onRefreshEvents();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-xl animate-in fade-in duration-200">
      <div className="glass-panel border border-white/10 rounded-3xl w-full max-w-2xl max-h-[90vh] shadow-[0_25px_70px_rgba(0,0,0,0.85)] overflow-hidden flex flex-col">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-white/[0.08] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-semibold text-white tracking-tight font-sans">
                  Gestión de tareas y exámenes
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-white/[0.06] border border-white/10 text-zinc-300">
                  Panel de Delegado
                </span>
              </div>
              <p className="text-[11px] text-zinc-400 font-mono mt-0.5">
                Organización de entregas compartidas para 2º SMR
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            aria-label="Cerrar modal"
            className="p-1.5 rounded-xl text-zinc-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* SECURITY PIN GATE (If not verified yet) */}
        {!isUnlocked ? (
          <div className="p-8 flex flex-col items-center text-center">
            <div className="w-12 h-12 rounded-2xl bg-white/[0.04] border border-white/10 flex items-center justify-center mb-4 text-amber-400">
              <Lock className="w-6 h-6" />
            </div>
            <h4 className="text-base font-semibold text-white font-sans mb-1">
              Acceso restringido
            </h4>
            <p className="text-xs text-zinc-400 font-mono max-w-sm mb-5 leading-relaxed">
              Introduce la clave de acceso de delegado para añadir o modificar fechas de entrega oficiales de la clase.
            </p>

            {pinError && (
              <div className="w-full max-w-xs mb-4 p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/25 text-xs font-mono text-rose-300 flex items-center justify-center gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
                <span>{pinError}</span>
              </div>
            )}

            <form onSubmit={handleUnlockPin} className="w-full max-w-xs space-y-3">
              <input
                type="password"
                required
                autoFocus
                placeholder="Clave de delegado"
                value={pinInput}
                onChange={(e) => setPinInput(e.target.value)}
                className="w-full text-center px-4 py-2.5 bg-black/50 border border-white/15 rounded-xl text-sm font-mono text-white placeholder:text-zinc-600 focus:outline-none focus:border-white/40 tracking-widest"
              />

              <button
                type="submit"
                className="w-full py-2.5 rounded-xl font-mono text-xs font-bold bg-white hover:bg-zinc-200 text-black shadow-md active:scale-95 transition-all cursor-pointer flex items-center justify-center gap-2"
              >
                <span>Desbloquear panel</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>

            <p className="text-[10px] text-zinc-600 font-mono mt-6">
              ¿No tienes la clave? Pídesela a los delegados del grupo de 2º SMR.
            </p>
          </div>
        ) : (
          /* UNLOCKED ADMIN PANEL */
          <div className="flex-1 overflow-y-auto">
            {/* Tab switchers */}
            <div className="px-6 pt-4 pb-2 border-b border-white/[0.06] flex items-center justify-between gap-2">
              <div className="inline-flex p-1 rounded-2xl bg-black/40 border border-white/[0.08]">
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab('create');
                    sound.tap();
                  }}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-mono font-medium transition-all cursor-pointer ${
                    activeTab === 'create'
                      ? 'bg-white text-black font-semibold shadow-sm'
                      : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  <Plus className="w-3.5 h-3.5 inline-block mr-1.5 -mt-0.5" />
                  <span>Nueva tarea</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab('list');
                    sound.tap();
                  }}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-mono font-medium transition-all cursor-pointer ${
                    activeTab === 'list'
                      ? 'bg-white text-black font-semibold shadow-sm'
                      : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  <span>Tareas activas ({events.length})</span>
                </button>
              </div>

              <span className="text-[11px] font-mono text-emerald-400 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span>Modo delegado activo</span>
              </span>
            </div>

            {/* TAB 1: CREATE TASK FORM */}
            {activeTab === 'create' ? (
              <form onSubmit={handleCreateTask} className="p-6 space-y-4">
                {/* Module Selector */}
                <div>
                  <label className="block text-xs font-mono text-zinc-400 mb-1.5">
                    Módulo de 2º SMR
                  </label>
                  <div className="grid grid-cols-4 sm:grid-cols-8 gap-1.5">
                    {Object.keys(SMR2_SUBJECTS).map((code) => {
                      if (code === 'RECREO') return null;
                      const sub = SMR2_SUBJECTS[code];
                      const isSelected = subject === code;
                      return (
                        <button
                          key={code}
                          type="button"
                          onClick={() => {
                            setSubject(code);
                            sound.tap();
                          }}
                          className={`py-2 px-1 text-center rounded-xl border text-xs font-mono font-bold transition-all cursor-pointer active:scale-95 ${
                            isSelected
                              ? 'bg-white text-black border-white shadow-sm'
                              : 'bg-white/[0.03] border-white/[0.06] text-zinc-400 hover:text-white'
                          }`}
                        >
                          {code}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Title */}
                <div>
                  <label className="block text-xs font-mono text-zinc-400 mb-1">
                    Título de la tarea o examen
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="ej: Examen DNS/DHCP Tema 2 o Práctica GPO"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-black/40 border border-white/[0.08] rounded-xl text-xs sm:text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-white/30 font-sans"
                  />
                </div>

                {/* Type, Priority, Date, Time */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-mono text-zinc-400 mb-1">
                      Tipo de evento
                    </label>
                    <select
                      value={eventType}
                      onChange={(e) => setEventType(e.target.value as any)}
                      className="w-full px-3 py-2 bg-black/40 border border-white/[0.08] rounded-xl text-xs font-mono text-white focus:outline-none focus:border-white/30"
                    >
                      <option value="homework" className="bg-[#18181b]">Entrega / Práctica</option>
                      <option value="exam" className="bg-[#18181b]">Examen parcial o final</option>
                      <option value="reminder" className="bg-[#18181b]">Aviso / Recordatorio</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-mono text-zinc-400 mb-1">
                      Nivel de prioridad
                    </label>
                    <div className="flex gap-1.5">
                      {(['high', 'normal', 'low'] as const).map((p) => {
                        const labels = { high: 'Urgente', normal: 'Normal', low: 'Informativa' };
                        const colors = {
                          high: 'bg-rose-500/20 text-rose-300 border-rose-500/40',
                          normal: 'bg-blue-500/20 text-blue-300 border-blue-500/40',
                          low: 'bg-zinc-800 text-zinc-400 border-zinc-700',
                        };
                        const isSelected = priority === p;
                        return (
                          <button
                            key={p}
                            type="button"
                            onClick={() => setPriority(p)}
                            className={`flex-1 py-2 text-xs font-mono rounded-xl border transition-all cursor-pointer ${
                              isSelected
                                ? `${colors[p]} font-bold shadow-sm`
                                : 'bg-white/[0.02] border-white/[0.06] text-zinc-500'
                            }`}
                          >
                            {labels[p]}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-mono text-zinc-400 mb-1">
                      Fecha límite
                    </label>
                    <input
                      type="date"
                      required
                      value={eventDate}
                      onChange={(e) => setEventDate(e.target.value)}
                      className="w-full px-3 py-2 bg-black/40 border border-white/[0.08] rounded-xl text-xs font-mono text-white focus:outline-none focus:border-white/30"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-mono text-zinc-400 mb-1">
                      Hora límite
                    </label>
                    <input
                      type="time"
                      value={startTime}
                      onChange={(e) => setStartTime(e.target.value)}
                      className="w-full px-3 py-2 bg-black/40 border border-white/[0.08] rounded-xl text-xs font-mono text-white focus:outline-none focus:border-white/30"
                    />
                  </div>
                </div>

                {/* URL to Moodle / Classroom / GitHub */}
                <div>
                  <label className="block text-xs font-mono text-zinc-400 mb-1">
                    Enlace de entrega o recursos (opcional)
                  </label>
                  <div className="relative">
                    <LinkIcon className="w-4 h-4 text-zinc-500 absolute left-3.5 top-3" />
                    <input
                      type="url"
                      placeholder="https://moodle.ies... o enlace a GitHub / Classroom"
                      value={deliveryUrl}
                      onChange={(e) => setDeliveryUrl(e.target.value)}
                      className="w-full pl-10 pr-3.5 py-2 bg-black/40 border border-white/[0.08] rounded-xl text-xs font-mono text-white placeholder:text-zinc-600 focus:outline-none focus:border-white/30"
                    />
                  </div>
                </div>

                {/* Description */}
                <div>
                  <label className="block text-xs font-mono text-zinc-400 mb-1">
                    Instrucciones y requisitos de la entrega
                  </label>
                  <textarea
                    rows={2}
                    placeholder="ej: Subir informe en PDF y capturas de los comandos ejecutados..."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="w-full px-3.5 py-2 bg-black/40 border border-white/[0.08] rounded-xl text-xs sm:text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-white/30 font-sans"
                  />
                </div>

                {/* Broadcast to chat checkbox */}
                <div className="pt-1">
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={broadcastNotice}
                      onChange={(e) => setBroadcastNotice(e.target.checked)}
                      className="w-4 h-4 rounded border-white/20 bg-white/[0.05] text-white focus:ring-0 cursor-pointer accent-white"
                    />
                    <span className="text-xs font-mono text-zinc-300 flex items-center gap-1.5">
                      <Send className="w-3.5 h-3.5 text-blue-400" />
                      <span>Difundir aviso automático en el chat de la clase</span>
                    </span>
                  </label>
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-3 rounded-2xl font-mono text-xs sm:text-sm font-bold bg-white hover:bg-zinc-200 text-black shadow-lg active:scale-95 transition-all cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  <Plus className="w-4 h-4" />
                  <span>{isSubmitting ? 'Guardando en la base de datos...' : 'Publicar tarea para la clase'}</span>
                </button>
              </form>
            ) : (
              /* TAB 2: ACTIVE TASKS LIST */
              <div className="p-6 space-y-3">
                {events.length === 0 ? (
                  <div className="p-12 text-center text-zinc-500 font-mono text-xs">
                    No hay tareas anotadas actualmente.
                  </div>
                ) : (
                  events.map((event) => {
                    const isOverdue = new Date(event.event_date) < new Date(new Date().toDateString());
                    return (
                      <div
                        key={event.id}
                        className={`p-3.5 rounded-2xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                          event.is_completed
                            ? 'bg-white/[0.01] border-white/[0.04] opacity-50'
                            : 'bg-white/[0.03] border-white/[0.08]'
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          <button
                            type="button"
                            onClick={() => handleToggleComplete(event)}
                            title={event.is_completed ? 'Marcar como pendiente' : 'Marcar como completada'}
                            className={`p-1.5 rounded-xl border mt-0.5 cursor-pointer transition-colors ${
                              event.is_completed
                                ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-400'
                                : 'bg-white/[0.03] border-white/10 text-zinc-500 hover:text-white'
                            }`}
                          >
                            <CheckCircle2 className="w-4 h-4" />
                          </button>

                          <div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-white/10 text-white">
                                {event.subject}
                              </span>
                              <h4
                                className={`text-xs sm:text-sm font-semibold font-sans ${
                                  event.is_completed ? 'line-through text-zinc-500' : 'text-white'
                                }`}
                              >
                                {event.title}
                              </h4>
                              {event.priority === 'high' && (
                                <span className="px-1.5 py-0.2 rounded text-[9px] font-mono bg-rose-500/20 text-rose-300 border border-rose-500/30">
                                  Urgente
                                </span>
                              )}
                            </div>

                            <p className="text-[11px] text-zinc-400 font-mono mt-1 flex items-center gap-2">
                              <span>Fecha: {event.event_date}</span>
                              {event.start_time && <span>· {event.start_time}</span>}
                              {event.created_by_name && <span>· Por @{event.created_by_name}</span>}
                            </p>

                            {event.delivery_url && (
                              <a
                                href={event.delivery_url}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center gap-1 text-[11px] font-mono text-blue-400 hover:underline mt-1"
                              >
                                <LinkIcon className="w-3 h-3" />
                                <span>Ver enlace de entrega</span>
                              </a>
                            )}
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleDeleteTask(event.id)}
                          title="Eliminar tarea"
                          className="self-end sm:self-center p-2 rounded-xl text-zinc-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    );
                  })
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
