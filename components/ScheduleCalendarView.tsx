'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Calendar as CalendarIcon,
  Plus,
  Trash2,
  CalendarDays,
  ListTodo,
  ShieldCheck,
  Link as LinkIcon,
  X,
  Check,
  User,
  Users,
  Lock,
  Calendar,
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
import {
  PersonalTask,
  getPersonalTasks,
  savePersonalTask,
  togglePersonalTask,
  deletePersonalTask,
} from '@/lib/agendaService';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { Input } from '@/components/ui/Input';

interface ScheduleCalendarViewProps {
  currentUser: UserProfile | null;
  onOpenAuth: () => void;
  onBroadcastToChat?: (text: string) => void;
  onPlayRussianRoulette?: () => void;
}

export const ScheduleCalendarView: React.FC<ScheduleCalendarViewProps> = ({
  currentUser,
  onBroadcastToChat,
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'grid' | 'agenda'>('grid');
  const [agendaMode, setAgendaMode] = useState<'community' | 'personal'>('community');
  const [selectedSubject, setSelectedSubject] = useState<string | null>(null);
  const [inspectedSubject, setInspectedSubject] = useState<SubjectInfo | null>(null);
  const [mobileDay, setMobileDay] = useState<DayKey | 'all'>('lunes');
  const [liveStatus, setLiveStatus] = useState(() => getCurrentScheduleStatus());
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [isTaskAdminOpen, setIsTaskAdminOpen] = useState(false);
  const [taskFilter, setTaskFilter] = useState<'all' | 'exam' | 'homework' | 'reminder'>('all');
  const [loadingEvents, setLoadingEvents] = useState(false);

  // Personal agenda state
  const [personalTasks, setPersonalTasks] = useState<PersonalTask[]>([]);
  const [personalFilter, setPersonalFilter] = useState<'all' | 'pending' | 'completed'>('all');
  const [isAddingPersonal, setIsAddingPersonal] = useState(false);
  const [pTitle, setPTitle] = useState('');
  const [pSubject, setPSubject] = useState('SOR');
  const [pDueDate, setPDueDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [pPriority, setPPriority] = useState<'high' | 'normal' | 'low'>('normal');
  const [pDesc, setPDesc] = useState('');

  const isAdmin = currentUser?.role === 'admin' || currentUser?.role === 'delegado';

  // Compute this week's ISO dates (Monday to Friday)
  const weekDates = useMemo(() => {
    const now = new Date();
    const currentDay = now.getDay();
    const distanceToMonday = currentDay === 0 ? -6 : 1 - currentDay;
    const monday = new Date(now);
    monday.setDate(now.getDate() + distanceToMonday);

    const map: Record<DayKey, string> = {
      lunes: '',
      martes: '',
      miercoles: '',
      jueves: '',
      viernes: '',
    };
    const dayKeys: DayKey[] = ['lunes', 'martes', 'miercoles', 'jueves', 'viernes'];
    dayKeys.forEach((k, idx) => {
      const d = new Date(monday);
      d.setDate(monday.getDate() + idx);
      map[k] = d.toISOString().split('T')[0];
    });
    return map;
  }, []);

  // Reload personal tasks
  const reloadPersonalTasks = useCallback(() => {
    const uid = currentUser?.id || 'guest';
    setPersonalTasks(getPersonalTasks(uid));
  }, [currentUser?.id]);

  useEffect(() => {
    reloadPersonalTasks();
    const handleUpdate = () => reloadPersonalTasks();
    window.addEventListener('smr2_personal_tasks_updated', handleUpdate);
    return () => window.removeEventListener('smr2_personal_tasks_updated', handleUpdate);
  }, [reloadPersonalTasks]);

  const handleCreatePersonalTask = (e: React.FormEvent) => {
    e.preventDefault();
    const uid = currentUser?.id || 'guest';
    if (!pTitle.trim()) return;
    savePersonalTask(uid, {
      title: pTitle.trim(),
      subject: pSubject,
      due_date: pDueDate,
      priority: pPriority,
      description: pDesc.trim(),
    });
    setPTitle('');
    setPDesc('');
    setIsAddingPersonal(false);
    reloadPersonalTasks();
    sound.coinWin();
  };

  const handleTogglePersonalTask = (id: string) => {
    const uid = currentUser?.id || 'guest';
    const updated = togglePersonalTask(uid, id);
    setPersonalTasks(updated);
    sound.tap();
  };

  const handleDeletePersonalTask = (id: string) => {
    const uid = currentUser?.id || 'guest';
    const updated = deletePersonalTask(uid, id);
    setPersonalTasks(updated);
    sound.tap();
  };

  useEffect(() => {
    const update = () => setLiveStatus(getCurrentScheduleStatus());
    update();
    const interval = setInterval(update, 20000);
    return () => clearInterval(interval);
  }, []);

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

  // Fetch real calendar events from Supabase ONLY (no fake demo data)
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

    // Read cached real events if available from previous sync
    try {
      const stored = localStorage.getItem('smr2_calendar_events');
      if (stored) {
        setEvents(JSON.parse(stored));
      } else {
        setEvents([]);
      }
    } catch {
      setEvents([]);
    }
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

  const currentDayIndex = new Date().getDay();

  const filteredEvents = useMemo(() => {
    return events.filter((ev) => {
      if (taskFilter === 'all') return true;
      return ev.event_type === taskFilter;
    });
  }, [events, taskFilter]);

  return (
    <div className="space-y-4">
      {/* 1. Header & Tab Switcher */}
      <Card className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 sm:p-5 rounded-2xl border-border/70">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-semibold text-foreground tracking-tight">
              Horario lectivo y entregas
            </h2>
            <Badge variant="default" size="sm">
              Aula 204
            </Badge>
          </div>
          <p className="text-xs text-foreground-muted mt-0.5">
            {liveStatus.message}
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <div className="inline-flex p-1 rounded-full bg-surface-raised border border-border/60">
            <button
              type="button"
              onClick={() => setActiveSubTab('grid')}
              className={`flex items-center gap-1.5 px-3.5 py-1 rounded-full text-xs font-medium transition-all cursor-pointer ${
                activeSubTab === 'grid'
                  ? 'bg-foreground text-background font-semibold shadow-xs'
                  : 'text-foreground-muted hover:text-foreground'
              }`}
            >
              <CalendarDays className="w-3.5 h-3.5" />
              <span>Horario</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveSubTab('agenda')}
              className={`flex items-center gap-1.5 px-3.5 py-1 rounded-full text-xs font-medium transition-all cursor-pointer ${
                activeSubTab === 'agenda'
                  ? 'bg-foreground text-background font-semibold shadow-xs'
                  : 'text-foreground-muted hover:text-foreground'
              }`}
            >
              <ListTodo className="w-3.5 h-3.5" />
              <span>Tareas ({events.length})</span>
            </button>
          </div>

          {isAdmin && (
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setIsTaskAdminOpen(true)}
              className="rounded-xl"
            >
              <ShieldCheck className="w-3.5 h-3.5 text-accent" />
              <span>Gestionar Agenda</span>
            </Button>
          )}
        </div>
      </Card>

      {/* 2. Grid View */}
      {activeSubTab === 'grid' && (
        <div className="space-y-3">
          {/* Subject Filter Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
            <button
              type="button"
              onClick={() => setSelectedSubject(null)}
              className={`px-3 py-1 rounded-full text-xs font-mono transition-all shrink-0 cursor-pointer border ${
                selectedSubject === null
                  ? 'bg-foreground text-background font-semibold border-foreground'
                  : 'bg-surface text-foreground-muted border-border hover:text-foreground'
              }`}
            >
              Todos
            </button>

            {Object.keys(SMR2_SUBJECTS).map((code) => {
              if (code === 'RECREO') return null;
              const isSelected = selectedSubject === code;
              return (
                <button
                  key={code}
                  type="button"
                  onClick={() => setSelectedSubject(isSelected ? null : code)}
                  className={`px-2.5 py-1 rounded-[var(--radius-sm)] text-xs font-mono transition-colors shrink-0 cursor-pointer border ${
                    isSelected
                      ? 'bg-foreground text-background font-semibold border-foreground'
                      : 'bg-surface text-foreground-muted border-border hover:text-foreground'
                  }`}
                >
                  {code}
                </button>
              );
            })}
          </div>

          {/* Desktop Timetable */}
          <div className="hidden md:block overflow-hidden rounded-[var(--radius-lg)] border border-border bg-surface shadow-2xs">
            <table className="w-full border-collapse text-left font-mono text-xs">
              <thead>
                <tr className="border-b border-border bg-surface-raised text-foreground-muted">
                  <th className="py-2.5 px-3 font-medium w-28 text-[11px]">Horario</th>
                  {DAYS.map((day) => {
                    const isToday = currentDayIndex === day.dayIndex;
                    const dayDate = weekDates[day.key];
                    const dayTasks = events.filter((ev) => ev.event_date === dayDate);
                    const dayExams = dayTasks.filter((ev) => ev.event_type === 'exam');

                    return (
                      <th
                        key={day.key}
                        className={`py-2.5 px-3 font-semibold text-xs ${
                          isToday ? 'text-accent' : 'text-foreground'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-1 flex-wrap">
                          <div className="flex items-center gap-1.5">
                            <span>{day.label}</span>
                            {isToday && (
                              <Badge variant="accent" size="sm">
                                Hoy
                              </Badge>
                            )}
                          </div>
                          {dayExams.length > 0 ? (
                            <span className="px-1.5 py-0.2 rounded-full text-[9px] font-sans font-bold bg-rose-500/15 text-rose-500 border border-rose-500/30">
                              Examen
                            </span>
                          ) : dayTasks.length > 0 ? (
                            <span className="px-1.5 py-0.2 rounded-full text-[9px] font-sans font-semibold bg-amber-500/15 text-amber-500 border border-amber-500/30">
                              {dayTasks.length} {dayTasks.length === 1 ? 'tarea' : 'tareas'}
                            </span>
                          ) : null}
                        </div>
                      </th>
                    );
                  })}
                </tr>
              </thead>

              <tbody className="divide-y divide-border">
                {TIME_SLOTS.map((slot, slotIdx) => {
                  if (slot.isRecreo) {
                    return (
                      <tr key={slot.index} className="bg-surface-raised/40">
                        <td className="py-2 px-3 text-[11px] text-foreground-subtle border-r border-border">
                          {slot.label}
                        </td>
                        <td
                          colSpan={5}
                          className="py-2 px-3 text-center text-xs text-foreground-muted font-mono"
                        >
                          Recreo (30 min)
                        </td>
                      </tr>
                    );
                  }

                  return (
                    <tr key={slot.index} className="hover:bg-surface-raised/30 transition-colors">
                      <td className="py-2.5 px-3 text-[11px] text-foreground-subtle border-r border-border whitespace-nowrap">
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

                        const dayDate = weekDates[day.key];
                        const subjectEvents = events.filter((ev) => ev.subject === subjectCode);
                        const specificDayEvent = subjectEvents.find((ev) => ev.event_date === dayDate);
                        const hasUpcomingExam = subjectEvents.some((ev) => ev.event_type === 'exam');
                        const hasTasks = subjectEvents.length > 0;

                        return (
                          <td
                            key={day.key}
                            className={`p-1.5 border-r border-border last:border-r-0 ${
                              isDimmed ? 'opacity-20' : 'opacity-100'
                            }`}
                          >
                            <div
                              onClick={() => subject && setInspectedSubject(subject)}
                              className={`p-2 rounded-[var(--radius-sm)] border transition-all cursor-pointer ${
                                isNowActive
                                  ? 'bg-accent-subtle border-accent/40 text-accent font-semibold'
                                  : 'bg-surface-raised border-border hover:border-foreground/30 hover:shadow-2xs'
                              }`}
                            >
                              <div className="flex items-center justify-between gap-1">
                                <span className="font-bold text-xs">{subjectCode}</span>
                                <div className="flex items-center gap-1">
                                  {isNowActive && (
                                    <span className="text-[9px] text-accent font-semibold">
                                      Ahora
                                    </span>
                                  )}
                                  {specificDayEvent ? (
                                    <span
                                      className={`px-1.5 py-0.2 rounded text-[9px] font-sans font-bold leading-none ${
                                        specificDayEvent.event_type === 'exam'
                                          ? 'bg-rose-500 text-white'
                                          : 'bg-amber-500 text-black'
                                      }`}
                                      title={specificDayEvent.title}
                                    >
                                      {specificDayEvent.event_type === 'exam' ? 'Examen' : 'Entrega'}
                                    </span>
                                  ) : hasUpcomingExam ? (
                                    <span
                                      className="w-2 h-2 rounded-full bg-rose-500 shrink-0"
                                      title="Examen programado en esta asignatura"
                                    />
                                  ) : hasTasks ? (
                                    <span
                                      className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0"
                                      title={`${subjectEvents.length} tarea(s) en esta asignatura`}
                                    />
                                  ) : null}
                                </div>
                              </div>
                              <p className="text-[10px] text-foreground-muted truncate mt-0.5">
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

          {/* Mobile Fast View */}
          <div className="md:hidden space-y-3">
            <div className="flex items-center gap-1.5 p-1.5 rounded-[var(--radius)] bg-surface border border-border">
              {DAYS.map((d) => {
                const isSelected = mobileDay === d.key;
                return (
                  <button
                    key={d.key}
                    type="button"
                    onClick={() => setMobileDay(d.key)}
                    className={`flex-1 min-h-[44px] text-xs font-mono font-medium text-center rounded-[var(--radius-sm)] transition-all flex items-center justify-center active:scale-95 touch-manipulation cursor-pointer ${
                      isSelected
                        ? 'bg-foreground text-background font-semibold shadow-xs'
                        : 'text-foreground-muted hover:text-foreground'
                    }`}
                  >
                    {d.shortLabel}
                  </button>
                );
              })}
            </div>

            {(mobileDay === 'all' ? DAYS : DAYS.filter((d) => d.key === mobileDay)).map((day) => {
              const dayDate = weekDates[day.key];
              const dayEvents = events.filter((ev) => ev.event_date === dayDate);

              return (
                <div
                  key={day.key}
                  className="rounded-[var(--radius-lg)] border border-border bg-surface overflow-hidden shadow-xs"
                >
                  <div className="px-4 py-2.5 bg-surface-raised border-b border-border flex items-center justify-between text-xs font-mono">
                    <span className="font-semibold text-foreground">{day.label}</span>
                    <span className="text-[11px] text-foreground-subtle">{dayDate}</span>
                  </div>

                  {/* Day Tasks Alert Banner */}
                  {dayEvents.length > 0 && (
                    <div className="mx-2.5 mt-2.5 p-2 rounded-lg bg-amber-500/10 border border-amber-500/25 flex items-center justify-between text-[11px]">
                      <div className="flex items-center gap-1.5 text-amber-600 dark:text-amber-400 font-medium">
                        <ListTodo className="w-3.5 h-3.5" />
                        <span>
                          {dayEvents.length} {dayEvents.length === 1 ? 'tarea / examen hoy' : 'tareas / exámenes hoy'}
                        </span>
                      </div>
                    </div>
                  )}

                  <div className="p-2.5 space-y-1.5">
                    {TIME_SLOTS.map((slot, slotIdx) => {
                      const subjectCode = SCHEDULE_GRID[day.key][slotIdx];
                      const subject = SMR2_SUBJECTS[subjectCode];
                      const slotEvents = events.filter((ev) => ev.subject === subjectCode);
                      const isExam = slotEvents.some((ev) => ev.event_type === 'exam');

                      if (slot.isRecreo) {
                        return (
                          <div
                            key={slot.index}
                            className="min-h-[40px] p-2.5 rounded-[var(--radius-sm)] bg-surface-raised/40 border border-border text-center text-xs font-mono text-foreground-subtle flex items-center justify-center"
                          >
                            Recreo (10:55 — 11:25)
                          </div>
                        );
                      }

                      return (
                        <div
                          key={slot.index}
                          onClick={() => subject && setInspectedSubject(subject)}
                          className="min-h-[44px] p-2.5 rounded-[var(--radius-sm)] bg-surface-raised hover:bg-surface-hover border border-border flex items-center justify-between text-xs cursor-pointer active:scale-[0.99] transition-all touch-manipulation gap-2"
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <span className="text-[11px] font-mono text-foreground-subtle w-14 shrink-0">
                              {slot.label.split('—')[0].trim()}
                            </span>
                            <span className="font-semibold text-foreground truncate">
                              {subjectCode} · {subject?.name}
                            </span>
                          </div>

                          {slotEvents.length > 0 && (
                            <span
                              className={`px-1.5 py-0.5 rounded text-[10px] font-sans font-medium shrink-0 ${
                                isExam
                                  ? 'bg-rose-500/15 text-rose-500 border border-rose-500/25'
                                  : 'bg-amber-500/15 text-amber-500 border border-amber-500/25'
                              }`}
                            >
                              {isExam ? 'Examen' : `${slotEvents.length} tarea${slotEvents.length > 1 ? 's' : ''}`}
                            </span>
                          )}
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

      {/* 3. Agenda / Tasks View (Community vs Personal) */}
      {activeSubTab === 'agenda' && (
        <div className="space-y-4">
          {/* Mode Selector: Agenda de Clase vs Mi Agenda Personal */}
          <div className="flex items-center justify-between flex-wrap gap-2.5 p-3 rounded-2xl bg-surface border border-border/70">
            <div className="inline-flex p-1 rounded-xl bg-surface-raised border border-border/60">
              <button
                type="button"
                onClick={() => {
                  setAgendaMode('community');
                  sound.tap();
                }}
                className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                  agendaMode === 'community'
                    ? 'bg-foreground text-background font-semibold shadow-xs'
                    : 'text-foreground-muted hover:text-foreground'
                }`}
              >
                <Users className="w-3.5 h-3.5" />
                <span>Agenda de Clase ({events.length})</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setAgendaMode('personal');
                  sound.tap();
                }}
                className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                  agendaMode === 'personal'
                    ? 'bg-foreground text-background font-semibold shadow-xs'
                    : 'text-foreground-muted hover:text-foreground'
                }`}
              >
                <User className="w-3.5 h-3.5" />
                <span>
                  Mi Agenda Personal ({personalTasks.filter((t) => !t.is_completed).length})
                </span>
              </button>
            </div>

            {agendaMode === 'community' ? (
              isAdmin ? (
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => setIsTaskAdminOpen(true)}
                  className="rounded-xl"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Añadir tarea de clase</span>
                </Button>
              ) : (
                <div className="flex items-center gap-1.5 text-[11px] text-foreground-subtle font-mono">
                  <Lock className="w-3.5 h-3.5 text-amber-500" />
                  <span>Gestión solo por administradores</span>
                </div>
              )
            ) : (
              <Button
                variant="primary"
                size="sm"
                onClick={() => {
                  setIsAddingPersonal(!isAddingPersonal);
                  sound.tap();
                }}
                className="rounded-xl"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>{isAddingPersonal ? 'Cerrar' : 'Añadir tarea personal'}</span>
              </Button>
            )}
          </div>

          {/* COMMUNITY AGENDA */}
          {agendaMode === 'community' && (
            <div className="space-y-3">
              {/* Banner */}
              <div className="p-3 rounded-xl bg-surface-raised border border-border/70 flex items-center justify-between text-xs text-foreground-muted">
                <div className="flex items-center gap-2">
                  <CalendarIcon className="w-4 h-4 text-accent shrink-0" />
                  <span>
                    Tareas y exámenes colectivos fijados por la administración de 2º SMR y reflejados en el horario semanal.
                  </span>
                </div>
                <Badge variant="accent" size="sm">
                  Comunitaria
                </Badge>
              </div>

              {/* Task Filter */}
              <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none py-0.5 text-xs">
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
                    type="button"
                    onClick={() => {
                      setTaskFilter(f.id);
                      sound.tap();
                    }}
                    className={`min-h-[44px] sm:min-h-0 px-3 py-1.5 sm:py-1 rounded-[var(--radius-sm)] text-xs font-mono transition-all cursor-pointer border active:scale-95 touch-manipulation shrink-0 ${
                      taskFilter === f.id
                        ? 'bg-foreground text-background font-semibold border-foreground shadow-xs'
                        : 'bg-surface text-foreground-muted border-border hover:text-foreground'
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>

              {loadingEvents ? (
                <div className="p-8 text-center text-xs font-mono text-foreground-subtle">
                  Cargando eventos de clase...
                </div>
              ) : filteredEvents.length === 0 ? (
                <EmptyState
                  icon={<CalendarIcon className="w-8 h-8 opacity-40" />}
                  title="Aún no hay entregas ni exámenes programados"
                  description="Las tareas y exámenes añadidos por los administradores aparecerán aquí y en el horario."
                />
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {filteredEvents.map((ev) => {
                    const isExam = ev.event_type === 'exam';
                    return (
                      <Card key={ev.id} className="space-y-2 p-3.5">
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-1.5">
                            <Badge variant={isExam ? 'danger' : 'accent'} size="sm">
                              {isExam ? 'Examen' : 'Entrega'}
                            </Badge>
                            <Badge variant="default" size="sm">
                              {ev.subject}
                            </Badge>
                          </div>

                          {isAdmin && (
                            <button
                              type="button"
                              onClick={() => handleDeleteEvent(ev.id)}
                              className="text-foreground-subtle hover:text-danger p-1 cursor-pointer transition-colors"
                              title="Eliminar tarea comunitaria"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>

                        <div>
                          <h4 className="text-xs font-semibold text-foreground">
                            {ev.title}
                          </h4>
                          {ev.description && (
                            <p className="text-[11px] text-foreground-muted mt-1 leading-relaxed line-clamp-2">
                              {ev.description}
                            </p>
                          )}
                          {ev.delivery_url && (
                            <a
                              href={ev.delivery_url}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1 text-[11px] text-accent hover:underline mt-1 font-mono"
                            >
                              <LinkIcon className="w-3 h-3" />
                              <span>Enlace de entrega</span>
                            </a>
                          )}
                        </div>

                        <div className="pt-2 border-t border-border-subtle flex items-center justify-between text-[11px] font-mono text-foreground-subtle">
                          <span>{ev.event_date}</span>
                          {ev.created_by_name && <span>@{ev.created_by_name}</span>}
                        </div>
                      </Card>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* PERSONAL AGENDA */}
          {agendaMode === 'personal' && (
            <div className="space-y-3">
              {/* Form to add personal task */}
              {isAddingPersonal && (
                <form
                  onSubmit={handleCreatePersonalTask}
                  className="p-4 rounded-xl bg-surface border border-accent/40 space-y-3 animate-in fade-in duration-150 shadow-xs"
                >
                  <div className="flex items-center justify-between border-b border-border/60 pb-2">
                    <span className="text-xs font-semibold text-foreground">
                      Nueva tarea personal (privada)
                    </span>
                    <button
                      type="button"
                      onClick={() => setIsAddingPersonal(false)}
                      className="text-foreground-subtle hover:text-foreground text-xs cursor-pointer"
                    >
                      Cancelar
                    </button>
                  </div>

                  <Input
                    label="Título de la tarea"
                    value={pTitle}
                    onChange={(e) => setPTitle(e.target.value)}
                    placeholder="ej. Repasar apuntes de Servicios en Red para el examen"
                    required
                  />

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                    <div className="space-y-1">
                      <label className="text-xs font-medium text-foreground-muted">
                        Materia / Asignatura
                      </label>
                      <select
                        value={pSubject}
                        onChange={(e) => setPSubject(e.target.value)}
                        className="w-full px-3 py-2 text-xs rounded-xl bg-surface-raised border border-border text-foreground focus:outline-hidden focus:border-accent"
                      >
                        {Object.keys(SMR2_SUBJECTS).map((code) => {
                          if (code === 'RECREO') return null;
                          return (
                            <option key={code} value={code}>
                              {code} — {SMR2_SUBJECTS[code].name}
                            </option>
                          );
                        })}
                        <option value="General">General / Personal</option>
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-medium text-foreground-muted">
                        Fecha límite
                      </label>
                      <input
                        type="date"
                        value={pDueDate}
                        onChange={(e) => setPDueDate(e.target.value)}
                        required
                        className="w-full px-3 py-2 text-xs rounded-xl bg-surface-raised border border-border text-foreground focus:outline-hidden focus:border-accent"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-medium text-foreground-muted">
                        Prioridad
                      </label>
                      <select
                        value={pPriority}
                        onChange={(e) => setPPriority(e.target.value as any)}
                        className="w-full px-3 py-2 text-xs rounded-xl bg-surface-raised border border-border text-foreground focus:outline-hidden focus:border-accent"
                      >
                        <option value="normal">Normal</option>
                        <option value="high">Alta (Urgente)</option>
                        <option value="low">Baja</option>
                      </select>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-medium text-foreground-muted">
                      Descripción o apuntes personales (opcional)
                    </label>
                    <textarea
                      value={pDesc}
                      onChange={(e) => setPDesc(e.target.value)}
                      rows={2}
                      placeholder="Notas que quieras recordar para esta entrega..."
                      className="w-full px-3 py-2 text-xs rounded-xl bg-surface-raised border border-border text-foreground focus:outline-hidden focus:border-accent resize-none"
                    />
                  </div>

                  <div className="flex justify-end pt-1">
                    <Button type="submit" variant="primary" size="sm" className="rounded-xl">
                      <Plus className="w-3.5 h-3.5" />
                      <span>Guardar en mi agenda</span>
                    </Button>
                  </div>
                </form>
              )}

              {/* Filters */}
              <div className="flex items-center gap-1.5 text-xs">
                {(
                  [
                    { id: 'all', label: 'Todas' },
                    { id: 'pending', label: 'Pendientes' },
                    { id: 'completed', label: 'Completadas' },
                  ] as const
                ).map((f) => (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => {
                      setPersonalFilter(f.id);
                      sound.tap();
                    }}
                    className={`px-3 py-1 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                      personalFilter === f.id
                        ? 'bg-foreground text-background font-semibold shadow-xs'
                        : 'bg-surface-raised text-foreground-muted hover:text-foreground'
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>

              {/* Tasks List */}
              {personalTasks.length === 0 ? (
                <div className="p-8 text-center border border-dashed border-border/80 rounded-2xl space-y-2 bg-surface-raised/20">
                  <ListTodo className="w-8 h-8 text-foreground-subtle mx-auto opacity-40" />
                  <h4 className="text-xs font-semibold text-foreground">
                    No tienes tareas personales registradas
                  </h4>
                  <p className="text-[11px] text-foreground-muted max-w-xs mx-auto">
                    Esta lista es personal y privada para ti. Puedes consultarla aquí y en tu Perfil en Ajustes.
                  </p>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => setIsAddingPersonal(true)}
                    className="rounded-xl mt-2"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Añadir mi primera tarea</span>
                  </Button>
                </div>
              ) : (
                <div className="space-y-2">
                  {personalTasks
                    .filter((t) => {
                      if (personalFilter === 'pending') return !t.is_completed;
                      if (personalFilter === 'completed') return t.is_completed;
                      return true;
                    })
                    .map((task) => (
                      <div
                        key={task.id}
                        className={`p-3 rounded-xl border transition-all flex items-start justify-between gap-3 ${
                          task.is_completed
                            ? 'bg-surface-raised/40 border-border/50 opacity-70'
                            : 'bg-surface border-border hover:border-foreground/20'
                        }`}
                      >
                        <div className="flex items-start gap-3 min-w-0">
                          <button
                            type="button"
                            onClick={() => handleTogglePersonalTask(task.id)}
                            className={`w-5 h-5 mt-0.5 rounded-md border flex items-center justify-center transition-all cursor-pointer shrink-0 ${
                              task.is_completed
                                ? 'bg-emerald-500 border-emerald-500 text-white'
                                : 'border-border-focus hover:border-accent bg-surface-raised'
                            }`}
                            title={task.is_completed ? 'Marcar pendiente' : 'Marcar completada'}
                          >
                            {task.is_completed && <Check className="w-3.5 h-3.5 text-white" />}
                          </button>

                          <div className="min-w-0 space-y-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span
                                className={`text-xs font-semibold ${
                                  task.is_completed
                                    ? 'line-through text-foreground-muted'
                                    : 'text-foreground'
                                }`}
                              >
                                {task.title}
                              </span>
                              {task.subject && (
                                <Badge variant="default" size="sm">
                                  {task.subject}
                                </Badge>
                              )}
                              {task.priority === 'high' && (
                                <Badge variant="danger" size="sm">
                                  Urgente
                                </Badge>
                              )}
                            </div>

                            {task.description && (
                              <p className="text-[11px] text-foreground-muted leading-relaxed line-clamp-2">
                                {task.description}
                              </p>
                            )}

                            <div className="flex items-center gap-2 text-[10px] font-mono text-foreground-subtle">
                              <span className="flex items-center gap-1">
                                <Calendar className="w-3 h-3" />
                                <span>{task.due_date}</span>
                              </span>
                              {task.due_time && <span>• {task.due_time}</span>}
                            </div>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleDeletePersonalTask(task.id)}
                          title="Eliminar tarea"
                          className="text-foreground-subtle hover:text-danger p-1 cursor-pointer transition-colors shrink-0"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* 4. Subject Detail Modal with community tasks list */}
      {inspectedSubject && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 animate-in fade-in duration-150">
          <div className="border border-border rounded-[var(--radius-lg)] w-full max-w-md bg-surface p-4 space-y-3 shadow-lg">
            <div className="flex items-center justify-between border-b border-border pb-2">
              <div className="flex items-center gap-2">
                <Badge variant="accent" size="sm">
                  {inspectedSubject.code}
                </Badge>
                <h3 className="text-xs font-semibold text-foreground">
                  {inspectedSubject.name}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setInspectedSubject(null)}
                aria-label="Cerrar modal"
                className="w-10 h-10 rounded-[var(--radius-sm)] text-foreground-subtle hover:text-foreground flex items-center justify-center cursor-pointer active:scale-95 touch-manipulation"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-foreground-muted leading-relaxed font-sans">
              {inspectedSubject.description}
            </p>

            {/* List upcoming community tasks for this subject */}
            {events.filter((e) => e.subject === inspectedSubject.code).length > 0 && (
              <div className="space-y-2 pt-2 border-t border-border">
                <span className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                  <CalendarDays className="w-3.5 h-3.5 text-accent" />
                  <span>Tareas y exámenes programados:</span>
                </span>
                <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                  {events
                    .filter((e) => e.subject === inspectedSubject.code)
                    .map((ev) => (
                      <div
                        key={ev.id}
                        className="p-2.5 rounded-lg bg-surface-raised border border-border/70 text-xs space-y-1"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-foreground">{ev.title}</span>
                          <Badge variant={ev.event_type === 'exam' ? 'danger' : 'accent'} size="sm">
                            {ev.event_type === 'exam' ? 'Examen' : 'Entrega'}
                          </Badge>
                        </div>
                        {ev.description && (
                          <p className="text-[11px] text-foreground-muted leading-relaxed">
                            {ev.description}
                          </p>
                        )}
                        <div className="flex items-center justify-between text-[10px] font-mono text-foreground-subtle pt-0.5">
                          <span>Fecha: {ev.event_date}</span>
                          {ev.delivery_url && (
                            <a
                              href={ev.delivery_url}
                              target="_blank"
                              rel="noreferrer"
                              className="text-accent underline font-sans"
                            >
                              Enlace de entrega
                            </a>
                          )}
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            )}

            <div className="pt-2 flex justify-end">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setInspectedSubject(null)}
              >
                Cerrar
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* 5. Delegate Task Admin Modal */}
      <TaskAdminModal
        isOpen={isTaskAdminOpen}
        onClose={() => setIsTaskAdminOpen(false)}
        currentUser={currentUser}
        events={events}
        onRefreshEvents={fetchEvents}
        onBroadcastToChat={onBroadcastToChat}
      />
    </div>
  );
};
