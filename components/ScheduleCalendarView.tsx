'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  Calendar as CalendarIcon,
  Clock,
  BookOpen,
  Sparkles,
  Plus,
  Trash2,
  AlertCircle,
  CheckCircle2,
  Coffee,
  X,
  Filter,
  CalendarDays,
  ListTodo,
} from 'lucide-react';
import {
  SMR2_SUBJECTS,
  TIME_SLOTS,
  DAYS,
  SCHEDULE_GRID,
  getCurrentScheduleStatus,
  DayKey,
  SubjectInfo,
} from '@/lib/scheduleData';
import { CalendarEvent, UserProfile } from '@/lib/types';
import { createClient } from '@/lib/supabase/client';
import { sound } from '@/lib/audio';

interface ScheduleCalendarViewProps {
  currentUser: UserProfile | null;
  onOpenAuth: () => void;
}

export const ScheduleCalendarView: React.FC<ScheduleCalendarViewProps> = ({
  currentUser,
  onOpenAuth,
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'grid' | 'agenda'>('grid');
  const [selectedSubject, setSelectedSubject] = useState<string | null>(null);
  const [mobileDay, setMobileDay] = useState<DayKey | 'all'>('all');
  const [liveStatus, setLiveStatus] = useState(() => getCurrentScheduleStatus());
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [isAddEventOpen, setIsAddEventOpen] = useState(false);
  const [loadingEvents, setLoadingEvents] = useState(false);

  // Form states for new event
  const [newEventTitle, setNewEventTitle] = useState('');
  const [newEventSubject, setNewEventSubject] = useState('SOR');
  const [newEventType, setNewEventType] = useState<'exam' | 'homework' | 'reminder'>('exam');
  const [newEventDate, setNewEventDate] = useState(() => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow.toISOString().split('T')[0];
  });
  const [newEventTime, setNewEventTime] = useState('09:00');
  const [newEventDescription, setNewEventDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Update live status every 15 seconds
  useEffect(() => {
    const update = () => setLiveStatus(getCurrentScheduleStatus());
    update();
    const interval = setInterval(update, 15000);
    return () => clearInterval(interval);
  }, []);

  // Determine current day key for mobile default
  useEffect(() => {
    const day = new Date().getDay();
    const dayMap: Record<number, DayKey> = {
      1: 'lunes',
      2: 'martes',
      3: 'miercoles',
      4: 'jueves',
      5: 'viernes',
    };
    if (dayMap[day]) {
      setMobileDay(dayMap[day]);
    }
  }, []);

  // Fetch calendar events from Supabase or localStorage
  const fetchEvents = async () => {
    setLoadingEvents(true);
    const supabase = createClient();

    if (supabase) {
      try {
        const { data, error } = await supabase
          .from('calendar_events')
          .select('*')
          .order('event_date', { ascending: true });

        if (!error && data) {
          setEvents(data);
          setLoadingEvents(false);
          return;
        }
      } catch (err) {
        console.warn('Error al cargar eventos de Supabase:', err);
      }
    }

    // Fallback: localStorage
    try {
      const stored = localStorage.getItem('smr2_calendar_events');
      if (stored) {
        setEvents(JSON.parse(stored));
      } else {
        // Sample seed events
        const demoEvents: CalendarEvent[] = [
          {
            id: 'demo-1',
            title: 'Examen Tema 1 y 2: Servicios DNS y DHCP',
            subject: 'SR',
            event_type: 'exam',
            event_date: new Date(Date.now() + 86400000 * 4).toISOString().split('T')[0],
            start_time: '08:15',
            description: 'Instalación y configuración de BIND9 e isc-dhcp-server en Linux.',
            created_by_name: 'Profesor/Clase',
          },
          {
            id: 'demo-2',
            title: 'Entrega Práctica GPO y Active Directory',
            subject: 'SOR',
            event_type: 'homework',
            event_date: new Date(Date.now() + 86400000 * 7).toISOString().split('T')[0],
            start_time: '12:20',
            description: 'Creación de OU, usuarios masivos con PowerShell y directivas de grupo.',
            created_by_name: 'Delegado',
          },
        ];
        setEvents(demoEvents);
        localStorage.setItem('smr2_calendar_events', JSON.stringify(demoEvents));
      }
    } catch {
      // ignore
    }
    setLoadingEvents(false);
  };

  useEffect(() => {
    fetchEvents();

    // Subscribe to realtime changes on calendar_events if Supabase is connected
    const supabase = createClient();
    if (!supabase) return;

    const channel = supabase
      .channel('calendar_realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'calendar_events' },
        () => {
          fetchEvents();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const handleCreateEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEventTitle.trim()) return;

    setIsSubmitting(true);
    const newEvent: CalendarEvent = {
      id: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `event_${Date.now()}`,
      title: newEventTitle.trim(),
      subject: newEventSubject,
      event_type: newEventType,
      event_date: newEventDate,
      start_time: newEventTime,
      description: newEventDescription.trim() || undefined,
      created_by: currentUser?.id,
      created_by_name: currentUser ? currentUser.username : 'Compañero SMR2',
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
            created_by: currentUser?.id || null,
            created_by_name: newEvent.created_by_name,
          },
        ]);
        if (!error) {
          sound.coinWin();
          setIsAddEventOpen(false);
          setNewEventTitle('');
          setNewEventDescription('');
          fetchEvents();
          setIsSubmitting(false);
          return;
        }
      } catch (err) {
        console.warn('Error al guardar en Supabase:', err);
      }
    }

    // Local storage fallback
    const updated = [...events, newEvent].sort((a, b) => a.event_date.localeCompare(b.event_date));
    setEvents(updated);
    try {
      localStorage.setItem('smr2_calendar_events', JSON.stringify(updated));
    } catch {}

    sound.coinWin();
    setIsAddEventOpen(false);
    setNewEventTitle('');
    setNewEventDescription('');
    setIsSubmitting(false);
  };

  const handleDeleteEvent = async (id: string) => {
    sound.tap();
    const supabase = createClient();
    if (supabase) {
      try {
        await supabase.from('calendar_events').delete().eq('id', id);
      } catch (err) {
        console.warn('Error deleting event:', err);
      }
    }

    const updated = events.filter((e) => e.id !== id);
    setEvents(updated);
    try {
      localStorage.setItem('smr2_calendar_events', JSON.stringify(updated));
    } catch {}
  };

  // Current day index (1 = Monday, 5 = Friday)
  const currentDayIndex = new Date().getDay();

  // Weekly hours summary by subject
  const subjectWeeklyHours = useMemo(() => {
    const counts: Record<string, number> = {};
    Object.values(SCHEDULE_GRID).forEach((daySlots) => {
      daySlots.forEach((sub) => {
        if (sub !== 'RECREO') {
          counts[sub] = (counts[sub] || 0) + 1;
        }
      });
    });
    return counts;
  }, []);

  return (
    <div className="space-y-4 animate-in fade-in duration-200">
      {/* Top Banner Card: Horario SMR2 Title + Live Status */}
      <div className="relative overflow-hidden rounded-3xl glass-panel border border-white/[0.08] p-5 sm:p-6 shadow-[0_16px_50px_rgba(0,0,0,0.6)]">
        {/* Glow backdrop */}
        <div className="absolute -top-24 -right-24 w-80 h-80 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 w-80 h-80 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-2xl bg-white/[0.06] border border-white/10 text-white">
                <CalendarIcon className="w-5 h-5 text-emerald-400" />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-lg sm:text-xl font-bold tracking-tight text-white font-mono">
                    Horario SMR2
                  </h2>
                  <span className="px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider bg-rose-600/90 text-white rounded shadow-sm">
                    PROVISIONAL
                  </span>
                </div>
                <p className="text-xs text-zinc-500 font-mono mt-0.5">
                  Curso 2024–2025
                </p>
              </div>
            </div>
          </div>

          {/* Sub-tab view switcher */}
          <div className="inline-flex p-1 rounded-2xl bg-black/50 border border-white/[0.08] self-start md:self-auto">
            <button
              onClick={() => {
                setActiveSubTab('grid');
                sound.tap();
              }}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-mono font-medium transition-all cursor-pointer ${
                activeSubTab === 'grid'
                  ? 'bg-zinc-200 text-black font-semibold shadow-sm'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              <CalendarDays className="w-3.5 h-3.5" />
              <span>Semana</span>
            </button>
            <button
              onClick={() => {
                setActiveSubTab('agenda');
                sound.tap();
              }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-mono font-medium transition-all cursor-pointer ${
                activeSubTab === 'agenda'
                  ? 'bg-white text-black font-semibold shadow-sm'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              <ListTodo className="w-3.5 h-3.5" />
              <span>Exámenes</span>
              {events.length > 0 && (
                <span className="px-1.5 py-0.2 rounded-full text-[10px] font-mono bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  {events.length}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Live Status Widget */}
        <div className="mt-4 pt-4 border-t border-white/[0.06] flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-2.5 text-xs font-mono">
            <span className="relative flex h-2.5 w-2.5">
              <span
                className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                  liveStatus.status === 'recreo'
                    ? 'bg-emerald-400'
                    : liveStatus.status === 'in_class'
                    ? 'bg-blue-400'
                    : 'bg-zinc-500'
                }`}
              ></span>
              <span
                className={`relative inline-flex rounded-full h-2.5 w-2.5 ${
                  liveStatus.status === 'recreo'
                    ? 'bg-emerald-500'
                    : liveStatus.status === 'in_class'
                    ? 'bg-blue-500'
                    : 'bg-zinc-600'
                }`}
              ></span>
            </span>

            <span className="text-zinc-300 leading-relaxed">
              {liveStatus.message}
            </span>
          </div>

          <div className="flex items-center gap-2 text-[11px] font-mono text-zinc-500">
            <Clock className="w-3.5 h-3.5 text-zinc-400" />
            <span>8:15 — 14:05 (Lunes a Viernes)</span>
          </div>
        </div>
      </div>

      {/* VIEW 1: HORARIO SEMANAL GRID */}
      {activeSubTab === 'grid' && (
        <div className="space-y-4">
          {/* Subject Filter Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
            <button
              onClick={() => {
                setSelectedSubject(null);
                sound.tap();
              }}
              className={`px-3 py-1.5 rounded-xl text-xs font-mono font-medium transition-all shrink-0 cursor-pointer ${
                selectedSubject === null
                  ? 'bg-white text-black font-semibold'
                  : 'bg-white/[0.04] text-zinc-400 hover:text-white border border-white/[0.06]'
              }`}
            >
              Todos los módulos
            </button>

            {Object.keys(SMR2_SUBJECTS).map((code) => {
              if (code === 'RECREO') return null;
              const sub = SMR2_SUBJECTS[code];
              const isSelected = selectedSubject === code;
              const hours = subjectWeeklyHours[code] || 0;

              return (
                <button
                  key={code}
                  onClick={() => {
                    setSelectedSubject(isSelected ? null : code);
                    sound.tap();
                  }}
                  className={`px-3 py-1.5 rounded-xl text-xs font-mono font-medium transition-all shrink-0 cursor-pointer border ${
                    isSelected
                      ? `${sub.badgeColor} border-current font-bold ring-1 ring-white/20`
                      : 'bg-white/[0.03] text-zinc-400 hover:text-white border-white/[0.06]'
                  }`}
                >
                  <span>{code}</span>
                  <span className="text-[10px] opacity-60 ml-1.5">({hours}h)</span>
                </button>
              );
            })}
          </div>

          {/* Selected Subject Info Header (if filtered) */}
          {selectedSubject && SMR2_SUBJECTS[selectedSubject] && (
            <div className="p-3.5 rounded-2xl bg-white/[0.03] border border-white/[0.08] flex items-center justify-between gap-3 text-xs font-mono animate-in fade-in duration-150">
              <div className="flex items-center gap-2.5">
                <span
                  className={`px-2 py-0.5 rounded-md font-bold text-xs ${SMR2_SUBJECTS[selectedSubject].badgeColor}`}
                >
                  {selectedSubject}
                </span>
                <div>
                  <span className="text-white font-semibold">
                    {SMR2_SUBJECTS[selectedSubject].name}
                  </span>
                  <p className="text-[11px] text-zinc-400 mt-0.5">
                    {SMR2_SUBJECTS[selectedSubject].description} · {subjectWeeklyHours[selectedSubject]} horas semanales
                  </p>
                </div>
              </div>

              <button
                onClick={() => setSelectedSubject(null)}
                className="text-zinc-500 hover:text-white text-[11px] underline shrink-0 cursor-pointer"
              >
                Limpiar filtro
              </button>
            </div>
          )}

          {/* Mobile Day Selector (Visible on small screens) */}
          <div className="md:hidden flex items-center gap-1.5 p-1.5 rounded-2xl bg-black/50 border border-white/[0.08] overflow-x-auto scrollbar-none">
            <button
              onClick={() => {
                setMobileDay('all');
                sound.tap();
              }}
              className={`min-h-[38px] flex-1 py-1.5 px-3 rounded-xl text-xs font-mono font-medium transition-all text-center shrink-0 active:scale-95 ${
                mobileDay === 'all'
                  ? 'bg-zinc-200 text-black font-semibold shadow-sm'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              Semana
            </button>
            {DAYS.map((d) => (
              <button
                key={d.key}
                onClick={() => {
                  setMobileDay(d.key);
                  sound.tap();
                }}
                className={`min-h-[38px] flex-1 py-1.5 px-3 rounded-xl text-xs font-mono font-medium transition-all text-center shrink-0 active:scale-95 ${
                  mobileDay === d.key
                    ? 'bg-zinc-200 text-black font-semibold shadow-sm'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                <span>{d.shortLabel}</span>
                {currentDayIndex === d.dayIndex && (
                  <span className="ml-1 inline-block w-1.5 h-1.5 rounded-full bg-emerald-400 align-middle"></span>
                )}
              </button>
            ))}
          </div>

          {/* Desktop Full Weekly Grid */}
          <div className="hidden md:block overflow-hidden rounded-3xl glass-panel border border-white/[0.08] shadow-[0_16px_50px_rgba(0,0,0,0.6)]">
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left font-mono text-xs">
                <thead>
                  <tr className="border-b border-white/[0.08] bg-black/40">
                    <th className="py-3 px-4 text-zinc-400 font-semibold w-28 uppercase text-[11px]">
                      Horas
                    </th>
                    {DAYS.map((day) => {
                      const isToday = currentDayIndex === day.dayIndex;
                      return (
                        <th
                          key={day.key}
                          className={`py-3 px-4 font-semibold text-[11px] uppercase tracking-wider ${
                            isToday ? 'text-emerald-400 bg-emerald-500/[0.04]' : 'text-zinc-300'
                          }`}
                        >
                          <div className="flex items-center gap-1.5">
                            <span>{day.label}</span>
                            {isToday && (
                              <span className="px-1.5 py-0.2 rounded text-[9px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                                HOY
                              </span>
                            )}
                          </div>
                        </th>
                      );
                    })}
                  </tr>
                </thead>

                <tbody className="divide-y divide-white/[0.06]">
                  {TIME_SLOTS.map((slot, slotIdx) => {
                    const isRecreoRow = slot.isRecreo;

                    if (isRecreoRow) {
                      return (
                        <tr
                          key={slot.index}
                          className="bg-emerald-950/25 border-y-2 border-emerald-500/30 transition-colors"
                        >
                          <td className="py-3 px-4 font-medium text-emerald-400 whitespace-nowrap bg-black/30">
                            <div className="flex items-center gap-1.5">
                              <Coffee className="w-3.5 h-3.5 text-emerald-400" />
                              <span>{slot.label}</span>
                            </div>
                          </td>
                          <td
                            colSpan={5}
                            className="py-3 px-6 text-center font-bold tracking-widest text-emerald-300 uppercase text-xs"
                          >
                            <div className="flex items-center justify-center gap-3">
                              <span className="h-px flex-1 bg-emerald-500/20"></span>
                              <span>🥪 RECREO (10:55 - 11:25) 🥪</span>
                              <span className="h-px flex-1 bg-emerald-500/20"></span>
                            </div>
                          </td>
                        </tr>
                      );
                    }

                    return (
                      <tr key={slot.index} className="hover:bg-white/[0.01] transition-colors">
                        <td className="py-3.5 px-4 font-medium text-zinc-400 whitespace-nowrap bg-black/20 border-r border-white/[0.06]">
                          {slot.label}
                        </td>

                        {DAYS.map((day) => {
                          const subjectCode = SCHEDULE_GRID[day.key][slotIdx];
                          const subject = SMR2_SUBJECTS[subjectCode];
                          const isToday = currentDayIndex === day.dayIndex;
                          const isHighlighted =
                            selectedSubject === null || selectedSubject === subjectCode;
                          const isDimmed = selectedSubject !== null && selectedSubject !== subjectCode;

                          // Check if this slot is active right now
                          const isNowActive =
                            isToday &&
                            liveStatus.status === 'in_class' &&
                            liveStatus.currentSlot?.index === slot.index;

                          return (
                            <td
                              key={day.key}
                              className={`p-2 border-r border-white/[0.06] last:border-r-0 align-middle transition-opacity ${
                                isToday ? 'bg-emerald-500/[0.015]' : ''
                              } ${isDimmed ? 'opacity-20' : 'opacity-100'}`}
                            >
                              <div
                                onClick={() => {
                                  setSelectedSubject(
                                    selectedSubject === subjectCode ? null : subjectCode
                                  );
                                  sound.tap();
                                }}
                                className={`p-2.5 rounded-2xl border transition-all cursor-pointer group ${
                                  subject ? subject.cardBg : 'bg-white/[0.02]'
                                } ${subject ? subject.border : 'border-white/[0.06]'} ${
                                  isNowActive
                                    ? 'ring-2 ring-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.2)]'
                                    : 'hover:border-white/20'
                                }`}
                              >
                                <div className="flex items-center justify-between gap-1">
                                  <span
                                    className={`font-black text-sm tracking-tight ${
                                      subject ? subject.text : 'text-white'
                                    }`}
                                  >
                                    {subjectCode}
                                  </span>

                                  {isNowActive && (
                                    <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-emerald-500 text-black animate-pulse">
                                      EN CURSO
                                    </span>
                                  )}
                                </div>

                                <p className="text-[10px] text-zinc-400 truncate mt-0.5 group-hover:text-zinc-200 transition-colors">
                                  {subject?.name || subjectCode}
                                </p>
                              </div>
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Bottom SMR2 Footer Quote from Image */}
            <div className="py-3 px-4 border-t border-white/[0.06] bg-black/40 text-center text-xs font-mono font-bold tracking-wider text-zinc-400">
              BUEN CURSO PARA TODOS
            </div>
          </div>

          {/* Mobile Cards View */}
          <div className="md:hidden space-y-3">
            {(mobileDay === 'all' ? DAYS : DAYS.filter((d) => d.key === mobileDay)).map((day) => {
              const isToday = currentDayIndex === day.dayIndex;

              return (
                <div
                  key={day.key}
                  className="rounded-3xl glass-panel-subtle border border-white/[0.08] overflow-hidden shadow-lg"
                >
                  <div className="px-4 py-3 bg-black/40 border-b border-white/[0.06] flex items-center justify-between">
                    <span className="text-xs font-bold font-mono text-white tracking-wider">
                      {day.label}
                    </span>
                    {isToday && (
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                        HOY
                      </span>
                    )}
                  </div>

                  <div className="p-3 divide-y divide-white/[0.04] space-y-2">
                    {TIME_SLOTS.map((slot, slotIdx) => {
                      const subjectCode = SCHEDULE_GRID[day.key][slotIdx];
                      const subject = SMR2_SUBJECTS[subjectCode];
                      const isRecreo = slot.isRecreo;
                      const isNowActive =
                        isToday &&
                        liveStatus.status === 'in_class' &&
                        liveStatus.currentSlot?.index === slot.index;

                      if (isRecreo) {
                        return (
                          <div
                            key={slot.index}
                            className={`pt-2 p-3 rounded-2xl border flex items-center justify-between font-mono text-xs ${
                              isToday && liveStatus.status === 'recreo'
                                ? 'bg-emerald-950/40 border-emerald-500/50 ring-1 ring-emerald-400'
                                : 'bg-emerald-950/20 border-emerald-500/30 text-emerald-300'
                            }`}
                          >
                            <div className="flex items-center gap-2">
                              <Coffee className="w-4 h-4 text-emerald-400" />
                              <span className="font-bold">RECREO</span>
                              {isToday && liveStatus.status === 'recreo' && (
                                <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-emerald-400 text-black animate-pulse">
                                  ¡AHORA!
                                </span>
                              )}
                            </div>
                            <span className="text-[11px] text-emerald-400/90 font-semibold">{slot.label}</span>
                          </div>
                        );
                      }

                      return (
                        <div
                          key={slot.index}
                          className="pt-2 flex items-center justify-between gap-2.5 font-mono text-xs"
                        >
                          <span className="text-zinc-500 text-[11px] w-20 shrink-0">
                            {slot.label}
                          </span>

                          <div
                            onClick={() => {
                              setSelectedSubject(
                                selectedSubject === subjectCode ? null : subjectCode
                              );
                              sound.tap();
                            }}
                            className={`flex-1 min-h-[44px] p-2.5 rounded-2xl border flex items-center justify-between cursor-pointer active:scale-[0.98] transition-all ${
                              subject ? subject.cardBg : 'bg-white/[0.02]'
                            } ${
                              isNowActive
                                ? 'border-emerald-500/60 ring-1 ring-emerald-400 shadow-[0_0_12px_rgba(16,185,129,0.2)]'
                                : subject
                                ? subject.border
                                : 'border-white/[0.06]'
                            }`}
                          >
                            <div className="flex items-center gap-2 truncate">
                              <span className={`font-black text-sm ${subject ? subject.text : 'text-white'}`}>
                                {subjectCode}
                              </span>
                              <span className="text-[11px] text-zinc-400 truncate max-w-[150px]">
                                {subject?.name}
                              </span>
                            </div>

                            {isNowActive && (
                              <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-emerald-500 text-black animate-pulse shrink-0">
                                EN CURSO
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* VIEW 2: AGENDA & EXÁMENES (SUPABASE REALTIME) */}
      {activeSubTab === 'agenda' && (
        <div className="space-y-4">
          {/* Top Actions */}
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono text-zinc-400">
                Exámenes, entregas y tareas compartidas con la clase
              </span>
            </div>

            <button
              onClick={() => {
                setIsAddEventOpen(true);
                sound.tap();
              }}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white hover:bg-zinc-200 text-black text-xs font-mono font-bold transition-all cursor-pointer shadow-md active:scale-95"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Añadir Examen / Tarea</span>
            </button>
          </div>

          {/* Events List */}
          {loadingEvents ? (
            <div className="p-12 text-center text-zinc-500 font-mono text-xs">
              <Clock className="w-6 h-6 mx-auto mb-2 animate-spin text-zinc-400" />
              <span>Sincronizando eventos...</span>
            </div>
          ) : events.length === 0 ? (
            <div className="rounded-3xl bg-[#121215] border border-white/[0.08] p-12 text-center font-mono">
              <CalendarIcon className="w-8 h-8 text-zinc-600 mx-auto mb-3" />
              <h4 className="text-sm font-bold text-white mb-1">No hay exámenes ni tareas anotadas</h4>
              <p className="text-xs text-zinc-500 max-w-sm mx-auto mb-4">
                Sé el primero en apuntar una entrega o examen de SMR2 para que todo el grupo esté al tanto.
              </p>
              <button
                onClick={() => {
                  setIsAddEventOpen(true);
                  sound.tap();
                }}
                className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-mono font-medium transition-colors cursor-pointer"
              >
                Crear primer evento
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {events.map((ev) => {
                const sub = SMR2_SUBJECTS[ev.subject] || {
                  code: ev.subject,
                  name: ev.subject,
                  badgeColor: 'bg-zinc-800 text-zinc-300 border-zinc-700',
                  cardBg: 'bg-zinc-900/40',
                  border: 'border-white/10',
                  text: 'text-white',
                };

                const typeLabels: Record<string, { label: string; color: string }> = {
                  exam: { label: 'EXAMEN', color: 'bg-rose-500/20 text-rose-300 border-rose-500/30' },
                  homework: { label: 'ENTREGA', color: 'bg-amber-500/20 text-amber-300 border-amber-500/30' },
                  reminder: { label: 'AVISO', color: 'bg-blue-500/20 text-blue-300 border-blue-500/30' },
                  class: { label: 'CLASE', color: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' },
                };
                const badge = typeLabels[ev.event_type] || typeLabels.exam;

                return (
                  <div
                    key={ev.id}
                    className="p-4 rounded-3xl bg-[#121215] border border-white/[0.08] hover:border-white/20 transition-all flex flex-col justify-between group shadow-sm"
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span
                            className={`px-2 py-0.5 rounded-md font-mono text-[10px] font-bold border ${badge.color}`}
                          >
                            {badge.label}
                          </span>
                          <span
                            className={`px-2 py-0.5 rounded-md font-mono text-[10px] font-bold border ${sub.badgeColor}`}
                          >
                            {ev.subject} · {sub.name}
                          </span>
                        </div>

                        <button
                          onClick={() => handleDeleteEvent(ev.id)}
                          title="Eliminar evento"
                          className="p-1 rounded-lg text-zinc-600 hover:text-rose-400 transition-colors opacity-0 group-hover:opacity-100"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      <h4 className="text-sm font-bold text-white font-mono leading-snug mb-1">
                        {ev.title}
                      </h4>

                      {ev.description && (
                        <p className="text-xs text-zinc-400 font-sans leading-relaxed mb-3">
                          {ev.description}
                        </p>
                      )}
                    </div>

                    <div className="pt-3 border-t border-white/[0.04] flex items-center justify-between text-[11px] font-mono text-zinc-500">
                      <div className="flex items-center gap-1.5 text-zinc-300">
                        <CalendarIcon className="w-3.5 h-3.5 text-emerald-400" />
                        <span>
                          {ev.event_date} {ev.start_time ? `(${ev.start_time})` : ''}
                        </span>
                      </div>

                      {ev.created_by_name && (
                        <span>por @{ev.created_by_name}</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Modal: Añadir Examen o Tarea */}
      {isAddEventOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
          <div className="bg-[#0e0f15] border border-white/10 rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col">
            <div className="px-6 py-5 border-b border-white/[0.08] flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-2xl bg-white/[0.06] text-white border border-white/10">
                  <CalendarIcon className="w-5 h-5 text-emerald-400" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white tracking-tight font-mono">
                    AÑADIR A LA AGENDA DE SMR2
                  </h3>
                  <p className="text-xs text-zinc-400">
                    Sincronizado con Supabase para toda la clase
                  </p>
                </div>
              </div>

              <button
                onClick={() => setIsAddEventOpen(false)}
                className="p-1.5 rounded-xl text-zinc-400 hover:text-white hover:bg-white/10 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateEvent} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-mono text-zinc-400 mb-1">
                  Título de la prueba o tarea *
                </label>
                <input
                  type="text"
                  required
                  placeholder="ej: Examen UD3 - Enrutamiento y VLANs"
                  value={newEventTitle}
                  onChange={(e) => setNewEventTitle(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-white/[0.04] border border-white/[0.08] rounded-xl text-xs sm:text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-white/30 font-mono"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-mono text-zinc-400 mb-1">
                    Módulo / Asignatura
                  </label>
                  <select
                    value={newEventSubject}
                    onChange={(e) => setNewEventSubject(e.target.value)}
                    className="w-full px-3 py-2.5 bg-[#16171d] border border-white/[0.08] rounded-xl text-xs sm:text-sm text-white focus:outline-none focus:border-white/30 font-mono"
                  >
                    {Object.keys(SMR2_SUBJECTS).map((code) => {
                      if (code === 'RECREO') return null;
                      return (
                        <option key={code} value={code}>
                          {code} - {SMR2_SUBJECTS[code].name}
                        </option>
                      );
                    })}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-mono text-zinc-400 mb-1">
                    Tipo de evento
                  </label>
                  <select
                    value={newEventType}
                    onChange={(e) => setNewEventType(e.target.value as any)}
                    className="w-full px-3 py-2.5 bg-[#16171d] border border-white/[0.08] rounded-xl text-xs sm:text-sm text-white focus:outline-none focus:border-white/30 font-mono"
                  >
                    <option value="exam">Examen / Control</option>
                    <option value="homework">Entrega de Práctica</option>
                    <option value="reminder">Aviso / Recordatorio</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-mono text-zinc-400 mb-1">
                    Fecha *
                  </label>
                  <input
                    type="date"
                    required
                    value={newEventDate}
                    onChange={(e) => setNewEventDate(e.target.value)}
                    className="w-full px-3 py-2.5 bg-[#16171d] border border-white/[0.08] rounded-xl text-xs sm:text-sm text-white focus:outline-none focus:border-white/30 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-mono text-zinc-400 mb-1">
                    Hora prevista
                  </label>
                  <input
                    type="time"
                    value={newEventTime}
                    onChange={(e) => setNewEventTime(e.target.value)}
                    className="w-full px-3 py-2.5 bg-[#16171d] border border-white/[0.08] rounded-xl text-xs sm:text-sm text-white focus:outline-none focus:border-white/30 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-mono text-zinc-400 mb-1">
                  Detalles / Contenido (opcional)
                </label>
                <textarea
                  rows={3}
                  placeholder="Temas que entran, formato de entrega en el aula virtual, etc."
                  value={newEventDescription}
                  onChange={(e) => setNewEventDescription(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-white/[0.04] border border-white/[0.08] rounded-xl text-xs sm:text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-white/30 resize-none font-sans"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddEventOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-mono font-medium text-zinc-400 hover:text-white transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2.5 rounded-xl bg-white hover:bg-zinc-200 text-black text-xs font-mono font-bold transition-all cursor-pointer shadow-md disabled:opacity-50"
                >
                  {isSubmitting ? 'Guardando...' : 'Publicar Evento'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
