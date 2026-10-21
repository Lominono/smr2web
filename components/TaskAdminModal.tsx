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
  Eye,
  Key,
  ExternalLink,
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
  initialSubject?: string;
}

const DEFAULT_ADMIN_PASS = 'smr2root';

const QUICK_PRESETS = [
  { title: 'Práctica BIND9 DNS y Zonas Inversas', subject: 'SR', type: 'homework' as const },
  { title: 'Examen Servicios de Red y DHCP', subject: 'SR', type: 'exam' as const },
  { title: 'Práctica GPO y Active Directory', subject: 'SOR', type: 'homework' as const },
  { title: 'Examen Seguridad y Cortafuegos', subject: 'SI', type: 'exam' as const },
  { title: 'Entrega Moodle Aplicaciones Web', subject: 'AW', type: 'homework' as const },
];

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
  const [attempts, setAttempts] = useState(0);
  const [lockedUntil, setLockedUntil] = useState<number | null>(null);

  const [activeTab, setActiveTab] = useState<'create' | 'list'>('create');

  // Form states for creating a task
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

  // Load persistent lockout state
  useEffect(() => {
    try {
      const storedLock = localStorage.getItem('smr2_admin_lockout_until');
      if (storedLock) {
        const lockTime = Number(storedLock);
        if (Date.now() < lockTime) {
          setLockedUntil(lockTime);
        } else {
          localStorage.removeItem('smr2_admin_lockout_until');
        }
      }
    } catch {}
  }, [isOpen]);

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
      const minutes = Math.floor(remainingSec / 60);
      const seconds = remainingSec % 60;
      setPinError(
        `Terminal bloqueado por seguridad anti-fuerza bruta. Espera ${
          minutes > 0 ? `${minutes}m ` : ''
        }${seconds}s.`
      );
      sound.broke();
      return;
    }

    const expectedPass = process.env.NEXT_PUBLIC_ADMIN_PIN || DEFAULT_ADMIN_PASS;
    if (pinInput.trim() === expectedPass) {
      setIsUnlocked(true);
      setPinError(null);
      setPinInput('');
      setAttempts(0);
      sound.coinWin();
      try {
        sessionStorage.setItem('smr2_delegado_unlocked', 'true');
        localStorage.removeItem('smr2_admin_lockout_until');
      } catch {}
    } else {
      const nextAttempts = attempts + 1;
      setAttempts(nextAttempts);
      sound.broke();

      if (nextAttempts >= 6) {
        // 15-minute persistent lockout
        const lockoutTime = Date.now() + 15 * 60 * 1000;
        setLockedUntil(lockoutTime);
        try {
          localStorage.setItem('smr2_admin_lockout_until', String(lockoutTime));
        } catch {}
        setPinError('Acceso denegado: Demasiados intentos fallidos. Terminal bloqueado 15 minutos.');
      } else if (nextAttempts >= 3) {
        // 60-second lockout
        const lockoutTime = Date.now() + 60 * 1000;
        setLockedUntil(lockoutTime);
        try {
          localStorage.setItem('smr2_admin_lockout_until', String(lockoutTime));
        } catch {}
        setPinError('Clave incorrecta. Bloqueado temporalmente durante 60 segundos.');
      } else {
        setPinError(`Clave de seguridad incorrecta. Intentos restantes antes del bloqueo: ${3 - nextAttempts}`);
      }
    }
  };

  const handleLockSession = () => {
    setIsUnlocked(false);
    try {
      sessionStorage.removeItem('smr2_delegado_unlocked');
    } catch {}
    sound.tap();
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
        <div className="px-4 sm:px-6 py-3.5 sm:py-4 border-b border-white/[0.08] flex items-center justify-between bg-white/[0.02]">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm sm:text-base font-bold text-white tracking-tight font-mono">
                  Panel de Delegado · Tareas y Exámenes
                </h3>
              </div>
              <p className="text-[11px] text-zinc-400 font-sans mt-0.5">
                Organización comunitaria de entregas y exámenes de 2º SMR
              </p>
            </div>
          </div>

          <button
            onClick={() => {
              onClose();
              sound.tap();
            }}
            aria-label="Cerrar modal"
            className="p-1.5 rounded-xl text-zinc-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* SECURITY PIN GATE (If not verified yet) */}
        {!isUnlocked ? (
          <div className="p-8 flex flex-col items-center text-center">
            <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center mb-4 text-amber-400 shadow-inner">
              <Lock className="w-7 h-7" />
            </div>
            <h4 className="text-base font-bold text-white font-mono mb-1">
              Acceso al Panel de Control
            </h4>
            <p className="text-xs text-zinc-400 font-sans max-w-sm mb-5 leading-relaxed">
              Introduce la clave de delegado de clase para publicar tareas, exámenes o avisos en el horario.
            </p>

            {pinError && (
              <div className="w-full max-w-xs mb-4 p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/25 text-xs font-mono text-rose-300 flex items-center justify-center gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
                <span>{pinError}</span>
              </div>
            )}

            <form onSubmit={handleUnlockPin} className="w-full max-w-xs space-y-3">
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  autoFocus
                  placeholder="Clave Maestra de Delegado"
                  value={pinInput}
                  onChange={(e) => setPinInput(e.target.value)}
                  className="w-full text-center px-4 py-2.5 pr-10 bg-black/50 border border-white/15 rounded-xl text-sm font-mono text-white placeholder:text-zinc-600 focus:outline-none focus:border-amber-400/50 tracking-wider"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300 p-1 cursor-pointer"
                  title={showPassword ? 'Ocultar' : 'Mostrar'}
                >
                  <Eye className="w-4 h-4" />
                </button>
              </div>

              <button
                type="submit"
                className="w-full py-2.5 rounded-xl font-mono text-xs font-bold bg-white hover:bg-zinc-200 text-black shadow-md active:scale-95 transition-all cursor-pointer flex items-center justify-center gap-2"
              >
                <span>Verificar y Desbloquear</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>

            <div className="mt-6 p-3 rounded-2xl bg-white/[0.02] border border-white/[0.06] max-w-xs w-full text-center space-y-1">
              <span className="text-[10px] font-mono text-zinc-500 uppercase block font-bold">
                Seguridad de Delegación
              </span>
              <p className="text-[11px] font-sans text-zinc-400 leading-normal">
                Si eres delegado oficial, pide al administrador de Supabase que asigne tu rol para tener acceso automático por cuenta.
              </p>
            </div>
          </div>
        ) : (
          /* UNLOCKED ADMIN PANEL */
          <div className="flex-1 overflow-y-auto">
            {/* Tab switchers & Session Security Header */}
            <div className="px-4 sm:px-6 pt-3 sm:pt-4 pb-2 border-b border-white/[0.06] flex items-center justify-between gap-2 flex-wrap">
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
                  <span>Añadir tarea</span>
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

              <div className="flex items-center gap-2">
                <span className="text-[11px] font-mono text-emerald-400 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  <span>
                    {isDirectAuthorized ? 'Rol Oficial Verificado' : 'Sesión Desbloqueada'}
                  </span>
                </span>

                {!isDirectAuthorized && (
                  <button
                    type="button"
                    onClick={handleLockSession}
                    title="Bloquear terminal al salir"
                    className="px-2.5 py-1 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] text-[10px] font-mono text-zinc-400 hover:text-rose-400 border border-white/10 transition-all cursor-pointer"
                  >
                    Bloquear
                  </button>
                )}
              </div>
            </div>

            {/* TAB 1: CREATE TASK FORM */}
            {activeTab === 'create' ? (
              <form onSubmit={handleCreateTask} className="p-4 sm:p-6 space-y-4">
                {/* Fast Preset Chips */}
                <div>
                  <span className="text-[11px] font-mono text-zinc-500 block mb-1.5">Plantillas rápidas:</span>
                  <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
                    {QUICK_PRESETS.map((p, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => {
                          setTitle(p.title);
                          setSubject(p.subject);
                          setEventType(p.type);
                          sound.tap();
                        }}
                        className="px-2.5 py-1 rounded-lg bg-white/[0.03] hover:bg-white/[0.08] border border-white/[0.06] text-[11px] font-mono text-zinc-300 hover:text-white shrink-0 transition-all cursor-pointer"
                      >
                        + {p.title.split(' ')[0]} {p.subject}
                      </button>
                    ))}
                  </div>
                </div>

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
                            onClick={() => {
                              setPriority(p);
                              sound.tap();
                            }}
                            className={`flex-1 py-2 rounded-xl text-xs font-mono font-medium border transition-all cursor-pointer ${
                              isSelected
                                ? `${colors[p]} font-bold shadow-sm`
                                : 'bg-white/[0.02] border-white/[0.06] text-zinc-400 hover:text-white'
                            }`}
                          >
                            {labels[p]}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-mono text-zinc-400 mb-1">
                      Fecha límite / Día del examen
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
                      Hora límite / Hora de inicio
                    </label>
                    <input
                      type="time"
                      value={startTime}
                      onChange={(e) => setStartTime(e.target.value)}
                      className="w-full px-3 py-2 bg-black/40 border border-white/[0.08] rounded-xl text-xs font-mono text-white focus:outline-none focus:border-white/30"
                    />
                  </div>
                </div>

                {/* Delivery URL */}
                <div>
                  <label className="block text-xs font-mono text-zinc-400 mb-1">
                    Enlace de entrega (Moodle, Classroom, GitHub) · Opcional
                  </label>
                  <input
                    type="url"
                    placeholder="https://aulavirtual.educa.madrid.org/..."
                    value={deliveryUrl}
                    onChange={(e) => setDeliveryUrl(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-black/40 border border-white/[0.08] rounded-xl text-xs text-white placeholder:text-zinc-600 focus:outline-none focus:border-white/30 font-mono"
                  />
                </div>

                {/* Description */}
                <div>
                  <label className="block text-xs font-mono text-zinc-400 mb-1">
                    Instrucciones o contenido · Opcional
                  </label>
                  <textarea
                    rows={2}
                    placeholder="Detalles sobre lo que entra en el examen, formato PDF, enunciados..."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-black/40 border border-white/[0.08] rounded-xl text-xs text-white placeholder:text-zinc-600 focus:outline-none focus:border-white/30 font-sans"
                  />
                </div>

                {/* Live Preview Card */}
                {title.trim() && (
                  <div className="p-3.5 rounded-2xl bg-white/[0.02] border border-white/[0.08] space-y-1.5">
                    <span className="text-[10px] font-mono text-zinc-500 uppercase flex items-center gap-1.5">
                      <Eye className="w-3 h-3 text-emerald-400" />
                      Vista previa de cómo lo verán tus compañeros:
                    </span>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                        {subject}
                      </span>
                      <span className="text-xs font-mono font-bold text-white">
                        {title}
                      </span>
                      <span className="text-[11px] font-mono text-zinc-400">
                        📅 {eventDate} {startTime && `a las ${startTime}`}
                      </span>
                    </div>
                  </div>
                )}

                {/* Broadcast Checkbox */}
                <div className="flex items-center gap-2 pt-1">
                  <input
                    type="checkbox"
                    id="broadcastNotice"
                    checked={broadcastNotice}
                    onChange={(e) => setBroadcastNotice(e.target.checked)}
                    className="rounded bg-black/40 border-white/20 text-emerald-500 focus:ring-0 cursor-pointer"
                  />
                  <label htmlFor="broadcastNotice" className="text-xs font-mono text-zinc-300 cursor-pointer">
                    Publicar aviso automático en el chat de la clase
                  </label>
                </div>

                {/* Submit button */}
                <button
                  type="submit"
                  disabled={isSubmitting || !title.trim()}
                  className="w-full py-3 rounded-xl font-mono text-xs font-bold bg-white hover:bg-zinc-200 text-black shadow-md active:scale-95 transition-all cursor-pointer disabled:opacity-40 flex items-center justify-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  <span>Publicar en el horario</span>
                </button>
              </form>
            ) : (
              /* TAB 2: ACTIVE TASKS LIST */
              <div className="p-4 sm:p-6 space-y-3">
                {events.length === 0 ? (
                  <div className="text-center py-12 text-zinc-500 font-mono text-xs">
                    No hay tareas activas en este momento.
                  </div>
                ) : (
                  events.map((ev) => (
                    <div
                      key={ev.id}
                      className="p-3.5 rounded-2xl bg-white/[0.02] border border-white/[0.08] flex items-center justify-between gap-3"
                    >
                      <div className="space-y-1 overflow-hidden">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="px-2 py-0.5 rounded font-mono text-[10px] font-bold bg-zinc-800 text-zinc-300">
                            {ev.subject}
                          </span>
                          <span
                            className={`text-xs font-mono font-bold text-white truncate ${
                              ev.is_completed ? 'line-through text-zinc-500' : ''
                            }`}
                          >
                            {ev.title}
                          </span>
                        </div>
                        <p className="text-[11px] font-mono text-zinc-400">
                          Fecha: {ev.event_date} {ev.start_time && `· ${ev.start_time}`}
                        </p>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          type="button"
                          onClick={() => handleToggleComplete(ev)}
                          title={ev.is_completed ? 'Marcar como pendiente' : 'Marcar como completada'}
                          className={`p-2 rounded-xl border text-xs font-mono transition-all cursor-pointer ${
                            ev.is_completed
                              ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                              : 'bg-white/[0.04] text-zinc-400 border-white/10 hover:text-white'
                          }`}
                        >
                          <CheckCircle2 className="w-4 h-4" />
                        </button>

                        <button
                          type="button"
                          onClick={() => handleDeleteTask(ev.id)}
                          title="Eliminar tarea"
                          className="p-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 transition-all cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
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
