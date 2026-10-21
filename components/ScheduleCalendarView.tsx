'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  Calendar as CalendarIcon,
  Clock,
  BookOpen,
  Plus,
  Trash2,
  CheckCircle2,
  X,
  CalendarDays,
  ListTodo,
  ShieldCheck,
  Link as LinkIcon,
  ChevronRight,
  Sparkles,
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
import { TaskAdminModal } from '@/components/TaskAdminModal';

interface ScheduleCalendarViewProps {
  currentUser: UserProfile | null;
  onOpenAuth: () => void;
  onBroadcastToChat?: (text: string) => void;
}

export const ScheduleCalendarView: React.FC<ScheduleCalendarViewProps> = ({
  currentUser,
  onOpenAuth,
  onBroadcastToChat,
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'grid' | 'agenda'>('grid');
  const [selectedSubject, setSelectedSubject] = useState<string | null>(null);
  const [inspectedSubject, setInspectedSubject] = useState<SubjectInfo | null>(null);
  const [mobileDay, setMobileDay] = useState<DayKey | 'all'>('lunes');
  const [liveStatus, setLiveStatus] = useState(() => getCurrentScheduleStatus());
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [isTaskAdminOpen, setIsTaskAdminOpen] = useState(false);
  const [selectedSubjectForTask, setSelectedSubjectForTask] = useState<string | undefined>(undefined);
  const [taskFilter, setTaskFilter] = useState<'all' | 'exam' | 'homework' | 'reminder'>('all');
  const [loadingEvents, setLoadingEvents] = useState(false);

  // Update live status periodically
  useEffect(() => {
    const update = () => setLiveStatus(getCurrentScheduleStatus());
    update();
    const interval = setInterval(update, 15000);
    return () => clearInterval(interval);
  }, []);

  // Set default mobile day to today (or Monday if weekend)
  useEffect(() => {
    const day = new Date().getDay();
    const dayMap: Record<number, DayKey> = {
      1: 'lunes',
      2: 'martes',
      3: 'miercoles',
      4: 'jueves',
      5: 'viernes',
    };
    setMobileDay(dayMap[day] || 'lunes');
  }, []);

  // Fetch calendar events
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
        console.warn('Error loading calendar events:', err);
      }
    }

    try {
      const stored = localStorage.getItem('smr2_calendar_events');
      if (stored) {
        setEvents(JSON.parse(stored));
      } else {
        const demoEvents: CalendarEvent[] = [
          {
            id: 'demo-1',
            title: 'Examen Tema 1 y 2: Servicios DNS y DHCP',
            subject: 'SR',
            event_type: 'exam',
            event_date: new Date(Date.now() + 86400000 * 4).toISOString().split('T')[0],
            start_time: '08:15',
            description: 'Instalación y configuración de BIND9 e isc-dhcp-server en Linux.',
            created_by_name: 'Delegado',
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
    } catch {}
    setLoadingEvents(false);
  };

  useEffect(() => {
    fetchEvents();

    const supabase = createClient();
    if (!supabase) return;

    const channel = supabase
      .channel('calendar_realtime_view')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'calendar_events' },
        () => fetchEvents()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const handleDeleteEvent = async (id: string) => {
    sound.tap();
    const supabase = createClient();
    if (supabase) {
      try {
        await supabase.from('calendar_events').delete().eq('id', id);
      } catch {}
    }

    const updated = events.filter((e) => e.id !== id);
    setEvents(updated);
    try {
      localStorage.setItem('smr2_calendar_events', JSON.stringify(updated));
    } catch {}
  };

  // Weekly hours summary
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

  const currentDayIndex = new Date().getDay();

  // Filtered events
  const filteredEvents = useMemo(() => {
    return events.filter((ev) => {
      if (taskFilter === 'all') return true;
      return ev.event_type === taskFilter;
    });
  }, [events, taskFilter]);

  return (
    <div className="space-y-4">
      {/* ============================================================== */}
      {/* 1. MINIMALIST HEADER & LIVE BAR */}
      {/* ============================================================== */}
      <div className="p-4 sm:p-5 rounded-2xl bg-[#0c0c10] border border-white/[0.07] flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <h2 className="text-base font-semibold tracking-tight text-white">
              Horario y Tareas
            </h2>
            <span className="text-[11px] font-mono text-zinc-400 px-2 py-0.5 rounded-md bg-white/[0.04] border border-white/[0.06]">
              2º SMR · Aula 204
            </span>
          </div>

          {/* Live Status Pill */}
          <div className="flex items-center gap-2 text-xs text-zinc-300">
            <span className="relative flex h-2 w-2">
              <span
                className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                  liveStatus.status === 'in_class'
                    ? 'bg-emerald-400'
                    : liveStatus.status === 'recreo'
                    ? 'bg-amber-400'
                    : 'bg-zinc-600'
                }`}
              />
              <span
                className={`relative inline-flex rounded-full h-2 w-2 ${
                  liveStatus.status === 'in_class'
                    ? 'bg-emerald-500'
                    : liveStatus.status === 'recreo'
                    ? 'bg-amber-500'
                    : 'bg-zinc-600'
                }`}
              />
            </span>
            <span className="text-zinc-300 text-xs font-mono">
              {liveStatus.message}
            </span>
          </div>
        </div>

        {/* View Switcher & Delegate Access */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="inline-flex p-1 rounded-xl bg-black/60 border border-white/[0.08]">
            <button
              onClick={() => {
                setActiveSubTab('grid');
                sound.tap();
              }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                activeSubTab === 'grid'
                  ? 'bg-white text-black font-semibold'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              <CalendarDays className="w-3.5 h-3.5" />
              <span>Horario</span>
            </button>

            <button
              onClick={() => {
                setActiveSubTab('agenda');
                sound.tap();
              }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                activeSubTab === 'agenda'
                  ? 'bg-white text-black font-semibold'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              <ListTodo className="w-3.5 h-3.5" />
              <span>Tareas ({events.length})</span>
            </button>
          </div>

          <button
            onClick={() => {
              setSelectedSubjectForTask(undefined);
              setIsTaskAdminOpen(true);
              sound.tap();
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-400/10 hover:bg-amber-400/15 text-amber-300 border border-amber-400/25 text-xs font-semibold transition-all cursor-pointer active:scale-95"
            title="Gestión de tareas de clase"
          >
            <ShieldCheck className="w-3.5 h-3.5 text-amber-400" />
            <span>Delegado</span>
          </button>
        </div>
      </div>

      {/* ============================================================== */}
      {/* 2. HORARIO GRID VIEW */}
      {/* ============================================================== */}
      {activeSubTab === 'grid' && (
        <div className="space-y-3">
          {/* Minimalist Subject Filters */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
            <button
              onClick={() => {
                setSelectedSubject(null);
                sound.tap();
              }}
              className={`px-2.5 py-1 rounded-lg text-xs font-mono transition-all shrink-0 cursor-pointer border ${
                selectedSubject === null
                  ? 'bg-white text-black font-semibold border-white'
                  : 'bg-white/[0.03] text-zinc-400 hover:text-white border-white/[0.06]'
              }`}
            >
              Todos
            </button>

            {Object.keys(SMR2_SUBJECTS).map((code) => {
              if (code === 'RECREO') return null;
              const sub = SMR2_SUBJECTS[code];
              const isSelected = selectedSubject === code;

              return (
                <button
                  key={code}
                  onClick={() => {
                    setSelectedSubject(isSelected ? null : code);
                    sound.tap();
                  }}
                  className={`px-2.5 py-1 rounded-lg text-xs font-mono transition-all shrink-0 cursor-pointer border ${
                    isSelected
                      ? `${sub.badgeColor} border-current font-bold`
                      : 'bg-white/[0.03] text-zinc-400 hover:text-white border-white/[0.06]'
                  }`}
                >
                  {code}
                </button>
              );
            })}
          </div>

          {/* DESKTOP TIMETABLE */}
          <div className="hidden md:block overflow-hidden rounded-2xl border border-white/[0.08] bg-[#0c0c10]">
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left font-mono text-xs">
                <thead>
                  <tr className="border-b border-white/[0.08] bg-black/40 text-zinc-400">
                    <th className="py-2.5 px-3 font-medium w-28 text-[11px]">Horario</th>
                    {DAYS.map((day) => {
                      const isToday = currentDayIndex === day.dayIndex;
                      return (
                        <th
                          key={day.key}
                          className={`py-2.5 px-3 font-semibold text-xs ${
                            isToday ? 'text-emerald-400 bg-emerald-500/[0.03]' : 'text-zinc-200'
                          }`}
                        >
                          <div className="flex items-center gap-1.5">
                            <span>{day.label}</span>
                            {isToday && (
                              <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                                Hoy
                              </span>
                            )}
                          </div>
                        </th>
                      );
                    })}
                  </tr>
                </thead>

                <tbody className="divide-y divide-white/[0.05]">
                  {TIME_SLOTS.map((slot, slotIdx) => {
                    if (slot.isRecreo) {
                      return (
                        <tr key={slot.index} className="bg-zinc-900/40 border-y border-white/[0.06]">
                          <td className="py-2 px-3 text-[11px] text-zinc-400 font-mono">
                            {slot.label}
                          </td>
                          <td
                            colSpan={5}
                            className="py-2 px-3 text-center text-xs text-zinc-400 font-mono"
                          >
                            Recreo · 30 min
                          </td>
                        </tr>
                      );
                    }

                    return (
                      <tr key={slot.index} className="hover:bg-white/[0.01] transition-colors">
                        <td className="py-2.5 px-3 text-[11px] text-zinc-400 whitespace-nowrap border-r border-white/[0.06]">
                          {slot.label}
                        </td>

                        {DAYS.map((day) => {
                          const subjectCode = SCHEDULE_GRID[day.key][slotIdx];
                          const subject = SMR2_SUBJECTS[subjectCode];
                          const isToday = currentDayIndex === day.dayIndex;
                          const isDimmed = selectedSubject !== null && selectedSubject !== subjectCode;
                          const isNowActive =
                            isToday &&
                            liveStatus.status === 'in_class' &&
                            liveStatus.currentSlot?.index === slot.index;

                          const pendingEvents = events.filter(
                            (e) => e.subject === subjectCode && !e.is_completed
                          );
                          const hasExam = pendingEvents.some((e) => e.event_type === 'exam');

                          return (
                            <td
                              key={day.key}
                              className={`p-1.5 border-r border-white/[0.05] last:border-r-0 align-middle ${
                                isToday ? 'bg-emerald-500/[0.015]' : ''
                              } ${isDimmed ? 'opacity-20' : 'opacity-100'}`}
                            >
                              <div
                                onClick={() => {
                                  if (subject) {
                                    setInspectedSubject(subject);
                                    sound.tap();
                                  }
                                }}
                                className={`p-2 rounded-xl border transition-all cursor-pointer group ${
                                  subject ? subject.cardBg : 'bg-white/[0.01]'
                                } ${
                                  isNowActive
                                    ? 'border-emerald-400 ring-1 ring-emerald-400/30'
                                    : subject
                                    ? subject.border
                                    : 'border-white/[0.05]'
                                }`}
                              >
                                <div className="flex items-center justify-between gap-1">
                                  <span
                                    className={`font-mono font-bold text-xs ${
                                      subject ? subject.text : 'text-white'
                                    }`}
                                  >
                                    {subjectCode}
                                  </span>

                                  {isNowActive && (
                                    <span className="px-1 py-0.2 rounded text-[8px] font-bold bg-emerald-500 text-black">
                                      Ahora
                                    </span>
                                  )}

                                  {hasExam && !isNowActive && (
                                    <span
                                      title="Examen próximo"
                                      className="w-1.5 h-1.5 rounded-full bg-rose-400"
                                    />
                                  )}
                                </div>

                                <p className="text-[10px] text-zinc-400 truncate mt-0.5 group-hover:text-zinc-200">
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
          </div>

          {/* MOBILE FAST TIMELINE */}
          <div className="md:hidden space-y-3">
            {/* Day Selector Tabs */}
            <div className="flex items-center gap-1 p-1 rounded-xl bg-black/60 border border-white/[0.08]">
              {DAYS.map((d) => {
                const isSelected = mobileDay === d.key;
                const isToday = currentDayIndex === d.dayIndex;

                return (
                  <button
                    key={d.key}
                    onClick={() => {
                      setMobileDay(d.key);
                      sound.tap();
                    }}
                    className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-mono font-medium text-center transition-all ${
                      isSelected
                        ? 'bg-white text-black font-semibold shadow-sm'
                        : 'text-zinc-400 hover:text-white'
                    }`}
                  >
                    <span>{d.shortLabel}</span>
                    {isToday && (
                      <span className="ml-1 inline-block w-1.5 h-1.5 rounded-full bg-emerald-400 align-middle" />
                    )}
                  </button>
                );
              })}

              <button
                onClick={() => {
                  setMobileDay('all');
                  sound.tap();
                }}
                className={`py-1.5 px-2 rounded-lg text-xs font-mono font-medium text-center transition-all ${
                  mobileDay === 'all'
                    ? 'bg-white text-black font-semibold shadow-sm'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                Todo
              </button>
            </div>

            {/* Selected Day Classes List */}
            {(mobileDay === 'all' ? DAYS : DAYS.filter((d) => d.key === mobileDay)).map((day) => {
              const isToday = currentDayIndex === day.dayIndex;

              return (
                <div
                  key={day.key}
                  className="rounded-2xl border border-white/[0.08] bg-[#0c0c10] overflow-hidden"
                >
                  <div className="px-3.5 py-2 bg-black/40 border-b border-white/[0.06] flex items-center justify-between text-xs font-mono">
                    <span className="font-bold text-white">{day.label}</span>
                    {isToday && (
                      <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                        Hoy
                      </span>
                    )}
                  </div>

                  <div className="p-2 space-y-1.5">
                    {TIME_SLOTS.map((slot, slotIdx) => {
                      const subjectCode = SCHEDULE_GRID[day.key][slotIdx];
                      const subject = SMR2_SUBJECTS[subjectCode];
                      const isNowActive =
                        isToday &&
                        liveStatus.status === 'in_class' &&
                        liveStatus.currentSlot?.index === slot.index;
                      const hasExam = events.some(
                        (e) => e.subject === subjectCode && e.event_type === 'exam' && !e.is_completed
                      );

                      if (slot.isRecreo) {
                        return (
                          <div
                            key={slot.index}
                            className="p-2.5 rounded-xl bg-zinc-900/40 border border-white/[0.05] flex items-center justify-between text-xs font-mono text-zinc-400"
                          >
                            <span>Recreo (10:55 — 11:25)</span>
                            <span className="text-[10px] text-zinc-500">30 min</span>
                          </div>
                        );
                      }

                      return (
                        <div
                          key={slot.index}
                          onClick={() => {
                            if (subject) {
                              setInspectedSubject(subject);
                              sound.tap();
                            }
                          }}
                          className={`p-2.5 rounded-xl border flex items-center justify-between transition-all cursor-pointer ${
                            isNowActive
                              ? 'border-emerald-400 ring-1 ring-emerald-400/30 bg-emerald-500/[0.05]'
                              : subject
                              ? subject.cardBg
                              : 'bg-white/[0.02]'
                          } ${subject ? subject.border : 'border-white/[0.06]'}`}
                        >
                          <div className="flex items-center gap-3">
                            <span className="text-[11px] font-mono text-zinc-400 w-16 shrink-0">
                              {slot.label.split('—')[0].trim()}
                            </span>
                            <div className="flex flex-col">
                              <span
                                className={`text-xs font-bold font-mono ${
                                  subject ? subject.text : 'text-white'
                                }`}
                              >
                                {subjectCode} · {subject?.name}
                              </span>
                              <span className="text-[10px] text-zinc-500 font-mono">Aula 204</span>
                            </div>
                          </div>

                          <div className="flex items-center gap-1.5">
                            {hasExam && (
                              <span className="px-1.5 py-0.2 rounded text-[9px] font-mono font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30">
                                Examen
                              </span>
                            )}
                            {isNowActive && (
                              <span className="px-1.5 py-0.2 rounded text-[9px] font-mono font-bold bg-emerald-500 text-black">
                                Ahora
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

      {/* ============================================================== */}
      {/* 3. TAREAS Y EXÁMENES (AGENDA) VIEW */}
      {/* ============================================================== */}
      {activeSubTab === 'agenda' && (
        <div className="space-y-3">
          {/* Filter Pills */}
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-1 text-xs font-mono">
              {(
                [
                  { id: 'all', label: 'Todas' },
                  { id: 'exam', label: 'Exámenes' },
                  { id: 'homework', label: 'Entregas' },
                  { id: 'reminder', label: 'Avisos' },
                ] as const
              ).map((f) => (
                <button
                  key={f.id}
                  onClick={() => setTaskFilter(f.id)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-mono transition-all cursor-pointer border ${
                    taskFilter === f.id
                      ? 'bg-white text-black font-semibold border-white'
                      : 'bg-white/[0.03] text-zinc-400 hover:text-white border-white/[0.06]'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>

            <button
              onClick={() => {
                setSelectedSubjectForTask(undefined);
                setIsTaskAdminOpen(true);
                sound.tap();
              }}
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-white text-black text-xs font-semibold hover:bg-zinc-200 transition-all cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Añadir Tarea</span>
            </button>
          </div>

          {/* Cards List */}
          {loadingEvents ? (
            <div className="p-12 text-center text-zinc-500 text-xs font-mono">
              Cargando tareas y exámenes...
            </div>
          ) : filteredEvents.length === 0 ? (
            <div className="p-8 text-center rounded-2xl bg-[#0c0c10] border border-white/[0.06] space-y-2 font-mono">
              <CalendarIcon className="w-6 h-6 text-zinc-600 mx-auto" />
              <p className="text-xs text-zinc-400">No hay tareas o exámenes anotados en esta categoría.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
              {filteredEvents.map((ev) => {
                const sub = SMR2_SUBJECTS[ev.subject] || {
                  code: ev.subject,
                  name: ev.subject,
                  badgeColor: 'bg-zinc-800 text-zinc-300 border-zinc-700',
                  text: 'text-white',
                };

                const isExam = ev.event_type === 'exam';

                return (
                  <div
                    key={ev.id}
                    className="p-3.5 rounded-2xl border border-white/[0.07] bg-[#0c0c10] hover:border-white/15 transition-all flex flex-col justify-between space-y-2"
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2 mb-1.5">
                        <div className="flex items-center gap-1.5">
                          <span
                            className={`px-1.5 py-0.2 rounded text-[10px] font-mono font-bold border ${
                              isExam
                                ? 'bg-rose-500/10 text-rose-400 border-rose-500/25'
                                : 'bg-sky-500/10 text-sky-400 border-sky-500/25'
                            }`}
                          >
                            {isExam ? 'Examen' : 'Entrega'}
                          </span>
                          <span
                            className={`px-1.5 py-0.2 rounded text-[10px] font-mono font-bold border ${sub.badgeColor}`}
                          >
                            {ev.subject}
                          </span>
                        </div>

                        {currentUser &&
                          (currentUser.role === 'admin' ||
                            currentUser.role === 'delegado' ||
                            ev.created_by === currentUser.id) && (
                            <button
                              onClick={() => handleDeleteEvent(ev.id)}
                              className="text-zinc-600 hover:text-rose-400 transition-colors p-1"
                              title="Eliminar tarea"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                      </div>

                      <h4 className="text-xs font-semibold text-white leading-snug">{ev.title}</h4>
                      {ev.description && (
                        <p className="text-[11px] text-zinc-400 mt-1 line-clamp-2 leading-relaxed">
                          {ev.description}
                        </p>
                      )}

                      {ev.delivery_url && (
                        <a
                          href={ev.delivery_url}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 text-[11px] text-blue-400 hover:underline mt-1.5"
                        >
                          <LinkIcon className="w-3 h-3" />
                          <span>Enlace de entrega</span>
                        </a>
                      )}
                    </div>

                    <div className="pt-2 border-t border-white/[0.05] flex items-center justify-between text-[11px] font-mono text-zinc-500">
                      <span>Fecha: {ev.event_date}</span>
                      {ev.created_by_name && <span>por @{ev.created_by_name}</span>}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ============================================================== */}
      {/* 4. SUBJECT DETAIL INSPECTOR MODAL */}
      {/* ============================================================== */}
      {inspectedSubject && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="max-w-md w-full p-5 rounded-2xl bg-[#0e0e12] border border-white/15 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center gap-2">
                <span
                  className={`px-2 py-0.5 rounded-md font-mono text-xs font-bold border ${inspectedSubject.badgeColor}`}
                >
                  {inspectedSubject.code}
                </span>
                <h3 className="font-semibold text-sm text-white">{inspectedSubject.name}</h3>
              </div>
              <button
                onClick={() => setInspectedSubject(null)}
                className="text-zinc-400 hover:text-white p-1 rounded-lg bg-white/5"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-zinc-300 leading-relaxed font-sans">
              {inspectedSubject.description}
            </p>

            <div className="p-3 rounded-xl bg-black/50 border border-white/[0.07] flex items-center justify-between text-xs font-mono text-zinc-400">
              <span>Carga horaria semanal:</span>
              <span className="font-bold text-white">
                {subjectWeeklyHours[inspectedSubject.code] || 0} horas / semana
              </span>
            </div>

            {/* Upcoming tasks for this subject */}
            <div className="space-y-1.5">
              <span className="text-[11px] font-mono text-zinc-500 uppercase">
                Tareas y exámenes pendientes
              </span>
              {events.filter((e) => e.subject === inspectedSubject.code && !e.is_completed).length === 0 ? (
                <p className="text-xs text-zinc-500 italic">No hay tareas pendientes para este módulo.</p>
              ) : (
                events
                  .filter((e) => e.subject === inspectedSubject.code && !e.is_completed)
                  .map((e) => (
                    <div
                      key={e.id}
                      className="p-2 rounded-lg bg-white/[0.03] border border-white/[0.05] text-xs flex items-center justify-between"
                    >
                      <span className="text-white truncate max-w-[200px]">{e.title}</span>
                      <span className="text-[10px] font-mono text-zinc-400">{e.event_date}</span>
                    </div>
                  ))
              )}
            </div>

            <div className="pt-2 flex items-center justify-end gap-2">
              <button
                onClick={() => {
                  setSelectedSubjectForTask(inspectedSubject.code);
                  setInspectedSubject(null);
                  setIsTaskAdminOpen(true);
                }}
                className="w-full py-2 rounded-xl bg-white text-black font-semibold text-xs hover:bg-zinc-200 transition-all cursor-pointer"
              >
                Añadir Tarea para {inspectedSubject.code}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Task Admin Modal */}
      <TaskAdminModal
        isOpen={isTaskAdminOpen}
        onClose={() => {
          setIsTaskAdminOpen(false);
          setSelectedSubjectForTask(undefined);
        }}
        currentUser={currentUser}
        events={events}
        onRefreshEvents={fetchEvents}
        onBroadcastToChat={onBroadcastToChat}
        initialSubject={selectedSubjectForTask}
      />
    </div>
  );
};
