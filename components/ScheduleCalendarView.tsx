'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  Calendar as CalendarIcon,
  Plus,
  Trash2,
  CalendarDays,
  ListTodo,
  ShieldCheck,
  Link as LinkIcon,
  X,
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
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';

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
  const [selectedSubject, setSelectedSubject] = useState<string | null>(null);
  const [inspectedSubject, setInspectedSubject] = useState<SubjectInfo | null>(null);
  const [mobileDay, setMobileDay] = useState<DayKey | 'all'>('lunes');
  const [liveStatus, setLiveStatus] = useState(() => getCurrentScheduleStatus());
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [isTaskAdminOpen, setIsTaskAdminOpen] = useState(false);
  const [taskFilter, setTaskFilter] = useState<'all' | 'exam' | 'homework' | 'reminder'>('all');
  const [loadingEvents, setLoadingEvents] = useState(false);

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

          <Button
            variant="secondary"
            size="sm"
            onClick={() => setIsTaskAdminOpen(true)}
            className="rounded-xl"
          >
            <ShieldCheck className="w-3.5 h-3.5 text-accent" />
            <span>Delegado</span>
          </Button>
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
          <div className="hidden md:block overflow-hidden rounded-[var(--radius-lg)] border border-border bg-surface">
            <table className="w-full border-collapse text-left font-mono text-xs">
              <thead>
                <tr className="border-b border-border bg-surface-raised text-foreground-muted">
                  <th className="py-2.5 px-3 font-medium w-28 text-[11px]">Horario</th>
                  {DAYS.map((day) => {
                    const isToday = currentDayIndex === day.dayIndex;
                    return (
                      <th
                        key={day.key}
                        className={`py-2.5 px-3 font-semibold text-xs ${
                          isToday ? 'text-accent' : 'text-foreground'
                        }`}
                      >
                        <div className="flex items-center gap-1.5">
                          <span>{day.label}</span>
                          {isToday && (
                            <Badge variant="accent" size="sm">
                              Hoy
                            </Badge>
                          )}
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

                        return (
                          <td
                            key={day.key}
                            className={`p-1.5 border-r border-border last:border-r-0 ${
                              isDimmed ? 'opacity-20' : 'opacity-100'
                            }`}
                          >
                            <div
                              onClick={() => subject && setInspectedSubject(subject)}
                              className={`p-2 rounded-[var(--radius-sm)] border transition-colors cursor-pointer ${
                                isNowActive
                                  ? 'bg-accent-subtle border-accent/40 text-accent font-semibold'
                                  : 'bg-surface-raised border-border hover:border-zinc-700'
                              }`}
                            >
                              <div className="flex items-center justify-between">
                                <span className="font-bold text-xs">{subjectCode}</span>
                                {isNowActive && (
                                  <span className="text-[9px] text-accent font-semibold">
                                    Ahora
                                  </span>
                                )}
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

            {(mobileDay === 'all' ? DAYS : DAYS.filter((d) => d.key === mobileDay)).map((day) => (
              <div
                key={day.key}
                className="rounded-[var(--radius-lg)] border border-border bg-surface overflow-hidden shadow-xs"
              >
                <div className="px-4 py-2.5 bg-surface-raised border-b border-border flex items-center justify-between text-xs font-mono">
                  <span className="font-semibold text-foreground">{day.label}</span>
                </div>

                <div className="p-2.5 space-y-1.5">
                  {TIME_SLOTS.map((slot, slotIdx) => {
                    const subjectCode = SCHEDULE_GRID[day.key][slotIdx];
                    const subject = SMR2_SUBJECTS[subjectCode];

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
                        className="min-h-[44px] p-2.5 rounded-[var(--radius-sm)] bg-surface-raised hover:bg-surface-hover border border-border flex items-center justify-between text-xs cursor-pointer active:scale-[0.99] transition-all touch-manipulation"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <span className="text-[11px] font-mono text-foreground-subtle w-14 shrink-0">
                            {slot.label.split('—')[0].trim()}
                          </span>
                          <span className="font-semibold text-foreground truncate">
                            {subjectCode} · {subject?.name}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 3. Agenda / Tasks View (REAL Supabase events only) */}
      {activeSubTab === 'agenda' && (
        <div className="space-y-3">
          <div className="flex items-center justify-between flex-wrap gap-2">
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
                  onClick={() => setTaskFilter(f.id)}
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

            <Button
              variant="primary"
              size="sm"
              onClick={() => setIsTaskAdminOpen(true)}
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Añadir tarea</span>
            </Button>
          </div>

          {loadingEvents ? (
            <div className="p-8 text-center text-xs font-mono text-foreground-subtle">
              Cargando eventos...
            </div>
          ) : filteredEvents.length === 0 ? (
            <EmptyState
              icon={<CalendarIcon className="w-8 h-8 opacity-40" />}
              title="Aún no hay entregas ni exámenes programados"
              description="Las tareas y exámenes añadidos por el delegado o los profesores aparecerán aquí."
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

                      {currentUser &&
                        (currentUser.role === 'admin' ||
                          currentUser.role === 'delegado' ||
                          ev.created_by === currentUser.id) && (
                          <button
                            type="button"
                            onClick={() => handleDeleteEvent(ev.id)}
                            className="text-foreground-subtle hover:text-danger p-1 cursor-pointer"
                            title="Eliminar tarea"
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

      {/* 4. Subject Detail Modal */}
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
