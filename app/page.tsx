'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import Link from 'next/link';
import { Calendar, Download, Sun, Moon, Clock, MapPin, AlertTriangle, Shield } from 'lucide-react';

interface TimeSlot {
  index: number;
  label: string;
  startMinutes: number;
  endMinutes: number;
  isRecreo?: boolean;
}

const TIME_SLOTS: TimeSlot[] = [
  { index: 1, label: '08:15 — 09:05', startMinutes: 8 * 60 + 15, endMinutes: 9 * 60 + 5 },
  { index: 2, label: '09:05 — 10:00', startMinutes: 9 * 60 + 5, endMinutes: 10 * 60 },
  { index: 3, label: '10:00 — 10:55', startMinutes: 10 * 60, endMinutes: 10 * 60 + 55 },
  { index: 4, label: '10:55 — 11:25', startMinutes: 10 * 60 + 55, endMinutes: 11 * 60 + 25, isRecreo: true },
  { index: 5, label: '11:25 — 12:20', startMinutes: 11 * 60 + 25, endMinutes: 12 * 60 + 20 },
  { index: 6, label: '12:20 — 13:15', startMinutes: 12 * 60 + 20, endMinutes: 13 * 60 + 15 },
  { index: 7, label: '13:15 — 14:05', startMinutes: 13 * 60 + 15, endMinutes: 14 * 60 + 5 },
];

type DayKey = 'lunes' | 'martes' | 'miercoles' | 'jueves' | 'viernes';

interface DayInfo {
  key: DayKey;
  label: string;
  shortLabel: string;
  dayIndex: number;
}

const DAYS: DayInfo[] = [
  { key: 'lunes', label: 'Lunes', shortLabel: 'Lun', dayIndex: 1 },
  { key: 'martes', label: 'Martes', shortLabel: 'Mar', dayIndex: 2 },
  { key: 'miercoles', label: 'Miércoles', shortLabel: 'Mié', dayIndex: 3 },
  { key: 'jueves', label: 'Jueves', shortLabel: 'Jue', dayIndex: 4 },
  { key: 'viernes', label: 'Viernes', shortLabel: 'Vie', dayIndex: 5 },
];

const SCHEDULE_GRID: Record<DayKey, string[]> = {
  lunes: ['SR', 'SR', 'SOR', 'RECREO', 'SOR', 'MEP', 'MEP'],
  martes: ['SI', 'SI', 'SI', 'RECREO', 'AW', 'AW', 'AW'],
  miercoles: ['IPE2', 'SOR', 'SOR', 'RECREO', 'SOR', 'SR', 'SR'],
  jueves: ['SI', 'SI', 'SR', 'RECREO', 'SR', 'SOR', 'SOR'],
  viernes: ['PI', 'DIG', 'IPE2', 'RECREO', 'IPE2', 'AW', 'AW'],
};

interface SubjectMeta {
  code: string;
  name: string;
  description: string;
}

const SUBJECTS: Record<string, SubjectMeta> = {
  SR: {
    code: 'SR',
    name: 'Servicios en Red',
    description: 'Servidores DNS, DHCP, Web, FTP, correo electrónico y monitorización de red.',
  },
  SOR: {
    code: 'SOR',
    name: 'Sistemas Operativos en Red',
    description: 'Administración de servidores Windows Server (Active Directory, GPO) y entornos Linux.',
  },
  SI: {
    code: 'SI',
    name: 'Seguridad Informática',
    description: 'Criptografía, cortafuegos, políticas de copias de seguridad y análisis de vulnerabilidades.',
  },
  AW: {
    code: 'AW',
    name: 'Aplicaciones Web',
    description: 'Despliegue y administración de gestores de contenido (CMS, LMS), bases de datos y servidores web.',
  },
  MEP: {
    code: 'MEP',
    name: 'Módulo de Empresa / Profesional',
    description: 'Iniciativa emprendedora, orientación laboral, proyectos y gestión empresarial.',
  },
  IPE2: {
    code: 'IPE2',
    name: 'Itinerario Personal para la Empleabilidad II',
    description: 'Derechos laborales, convenios colectivos, búsqueda de empleo en IT y prevención de riesgos.',
  },
  PI: {
    code: 'PI',
    name: 'Proyecto Intermodular',
    description: 'Diseño, implantación y defensa del proyecto integrador de fin de ciclo.',
  },
  DIG: {
    code: 'DIG',
    name: 'Digitalización Aplicada',
    description: 'Transformación digital, automatización de procesos e implantación tecnológica.',
  },
  RECREO: {
    code: 'RECREO',
    name: 'Recreo',
    description: 'Pausa de media mañana (10:55 — 11:25).',
  },
};

export default function HomePage() {
  const [selectedDay, setSelectedDay] = useState<DayKey | 'all'>('all');
  const [currentTime, setCurrentTime] = useState<Date | null>(null);
  const [isDarkMode, setIsDarkMode] = useState(false);

  useEffect(() => {
    setCurrentTime(new Date());
    const interval = setInterval(() => setCurrentTime(new Date()), 30000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const isDark = document.documentElement.classList.contains('dark');
      setIsDarkMode(isDark);
    }
  }, []);

  const toggleTheme = () => {
    const nextDark = !isDarkMode;
    setIsDarkMode(nextDark);
    if (typeof document !== 'undefined') {
      if (nextDark) {
        document.documentElement.classList.add('dark');
        document.documentElement.classList.remove('light');
        localStorage.setItem('smr2_theme', 'dark');
      } else {
        document.documentElement.classList.remove('dark');
        document.documentElement.classList.add('light');
        localStorage.setItem('smr2_theme', 'light');
      }
    }
  };

  const status = useMemo(() => {
    if (!currentTime) return null;
    const day = currentTime.getDay();
    const minutes = currentTime.getHours() * 60 + currentTime.getMinutes();

    if (day === 0 || day === 6) {
      return {
        type: 'weekend',
        label: 'Fin de semana',
        detail: 'Próxima clase: Lunes a las 08:15 (SR)',
        subjectCode: null,
        slotIndex: null,
      };
    }

    const dayKeyMap: Record<number, DayKey> = {
      1: 'lunes',
      2: 'martes',
      3: 'miercoles',
      4: 'jueves',
      5: 'viernes',
    };
    const todayKey = dayKeyMap[day];
    const todaySlots = SCHEDULE_GRID[todayKey];

    const first = TIME_SLOTS[0];
    const last = TIME_SLOTS[TIME_SLOTS.length - 1];

    if (minutes < first.startMinutes) {
      const firstSubject = todaySlots[0];
      const diff = first.startMinutes - minutes;
      return {
        type: 'before',
        label: `Empieza en ${diff} min`,
        detail: `08:15 — ${firstSubject} (${SUBJECTS[firstSubject]?.name || firstSubject})`,
        subjectCode: firstSubject,
        slotIndex: 0,
      };
    }

    if (minutes >= last.endMinutes) {
      const nextDayText = day === 5 ? 'Lunes' : 'Mañana';
      const nextDayKey = day === 5 ? 'lunes' : dayKeyMap[day + 1];
      const nextSubj = SCHEDULE_GRID[nextDayKey][0];
      return {
        type: 'after',
        label: 'Clases finalizadas por hoy',
        detail: `Siguiente: ${nextDayText} 08:15 (${nextSubj})`,
        subjectCode: null,
        slotIndex: null,
      };
    }

    for (let i = 0; i < TIME_SLOTS.length; i++) {
      const slot = TIME_SLOTS[i];
      if (minutes >= slot.startMinutes && minutes < slot.endMinutes) {
        const code = todaySlots[i];
        const remaining = slot.endMinutes - minutes;
        if (slot.isRecreo) {
          return {
            type: 'recreo',
            label: 'Recreo',
            detail: `Quedan ${remaining} min · Próxima: ${todaySlots[i + 1] || 'Fin de jornada'}`,
            subjectCode: 'RECREO',
            slotIndex: i,
          };
        }
        return {
          type: 'class',
          label: `En clase: ${code}`,
          detail: `${SUBJECTS[code]?.name || code} · Quedan ${remaining} min (hasta las ${slot.label.split(' — ')[1]})`,
          subjectCode: code,
          slotIndex: i,
        };
      }
    }

    return null;
  }, [currentTime]);

  const handleDownloadIcs = useCallback(() => {
    const lines = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//2 SMR Aula 35//Horario Oficial//ES',
      'CALSCALE:GREGORIAN',
      'METHOD:PUBLISH',
      'X-WR-CALNAME:Horario 2º SMR (Aula 35)',
      'X-WR-TIMEZONE:Europe/Madrid',
    ];

    const byDayMap: Record<DayKey, string> = {
      lunes: 'MO',
      martes: 'TU',
      miercoles: 'WE',
      jueves: 'TH',
      viernes: 'FR',
    };

    DAYS.forEach((d) => {
      const dayCodes = SCHEDULE_GRID[d.key];
      dayCodes.forEach((code, idx) => {
        if (code === 'RECREO') return;
        const slot = TIME_SLOTS[idx];
        const subj = SUBJECTS[code];
        const [startH, startM] = slot.label.split(' — ')[0].split(':').map(Number);
        const [endH, endM] = slot.label.split(' — ')[1].split(':').map(Number);
        const pad = (n: number) => String(n).padStart(2, '0');

        lines.push(
          'BEGIN:VEVENT',
          `SUMMARY:${subj?.name || code} (${code})`,
          `DESCRIPTION:${subj?.description || 'Clase de 2º SMR'}. Aula 35.`,
          'LOCATION:Aula 35',
          `RRULE:FREQ=WEEKLY;BYDAY=${byDayMap[d.key]}`,
          `DTSTART:20261109T${pad(startH)}${pad(startM)}00`,
          `DTEND:20261109T${pad(endH)}${pad(endM)}00`,
          'END:VEVENT'
        );
      });
    });

    lines.push('END:VCALENDAR');
    const blob = new Blob([lines.join('\r\n')], { type: 'text/calendar;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'Horario_2_SMR_Aula35.ics');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, []);

  const todayIndex = currentTime ? currentTime.getDay() : null;

  return (
    <main className="min-h-screen bg-background text-foreground font-sans selection:bg-neutral-300 dark:selection:bg-neutral-800">
      <div className="max-w-4xl mx-auto px-4 py-8 sm:py-14 space-y-10">
        
        {/* Encabezado y aviso de cierre */}
        <header className="border-b border-border pb-8 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <span className="font-mono text-xs tracking-wider uppercase px-2 py-0.5 border border-border bg-surface text-foreground-muted rounded">
              AVISO DEL CURSO · 2º SMR
            </span>
            <div className="flex items-center gap-3">
              <span className="inline-flex items-center gap-1.5 font-mono text-xs text-foreground-subtle">
                <MapPin className="w-3.5 h-3.5" />
                Aula 35
              </span>
              <button
                onClick={toggleTheme}
                type="button"
                className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-mono border border-border bg-surface hover:bg-surface-hover rounded text-foreground-muted transition-colors cursor-pointer"
                title="Cambiar tema visual"
              >
                {isDarkMode ? <Sun className="w-3.5 h-3.5" /> : <Moon className="w-3.5 h-3.5" />}
                <span>{isDarkMode ? 'Claro' : 'Oscuro'}</span>
              </button>
            </div>
          </div>

          <div className="space-y-2">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
              Web cerrada. Poneos a estudiar.
            </h1>
            <p className="text-sm sm:text-base text-foreground-muted leading-relaxed max-w-2xl">
              Se han clausurado los minijuegos, las apuestas de fichas, el feed y el chat.
              Hay exámenes, prácticas y entregas pendientes: menos distracciones y más apuntes.
              Solo queda accesible el horario lectivo oficial del curso y el laboratorio didáctico de Seguridad Informática.
            </p>
            <div className="pt-2">
              <Link
                href="/lab"
                className="inline-flex items-center gap-2 px-3 py-1.5 rounded border border-emerald-500/40 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-500 dark:text-emerald-400 font-mono text-xs font-semibold transition-colors cursor-pointer"
              >
                <Shield className="w-3.5 h-3.5" />
                <span>Laboratorio Interactivo de Ciberseguridad (Retos CTF) →</span>
              </Link>
            </div>
          </div>
        </header>

        {/* Estado en directo de la clase */}
        {status && (
          <section className="p-4 rounded-lg border border-border bg-surface space-y-1.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span
                  className={`w-2 h-2 rounded-full ${
                    status.type === 'class'
                      ? 'bg-emerald-500'
                      : status.type === 'recreo'
                      ? 'bg-amber-500'
                      : 'bg-neutral-400'
                  }`}
                />
                <span className="font-mono text-xs font-semibold uppercase tracking-wider text-foreground">
                  {status.label}
                </span>
              </div>
              <span className="font-mono text-xs text-foreground-subtle">
                {currentTime?.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
            <p className="text-xs sm:text-sm text-foreground-muted">
              {status.detail}
            </p>
          </section>
        )}

        {/* Controles de vista del horario */}
        <section className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
                <Calendar className="w-4 h-4 text-foreground-muted" />
                Horario lectivo semanal
              </h2>
              <p className="text-xs text-foreground-subtle font-mono">
                Lunes a viernes · 08:15 a 14:05 · Aula 35
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleDownloadIcs}
                type="button"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-mono font-medium border border-border bg-surface hover:bg-surface-hover rounded text-foreground transition-colors cursor-pointer"
              >
                <Download className="w-3.5 h-3.5 text-foreground-muted" />
                <span>Descargar .ics</span>
              </button>
            </div>
          </div>

          {/* Filtro por día */}
          <div className="flex flex-wrap items-center gap-1.5 border-b border-border pb-3">
            <button
              onClick={() => setSelectedDay('all')}
              type="button"
              className={`px-3 py-1 text-xs font-mono rounded transition-colors cursor-pointer ${
                selectedDay === 'all'
                  ? 'bg-foreground text-background font-semibold'
                  : 'bg-surface border border-border text-foreground-muted hover:text-foreground'
              }`}
            >
              Semana completa
            </button>
            {DAYS.map((d) => {
              const isToday = todayIndex === d.dayIndex;
              return (
                <button
                  key={d.key}
                  onClick={() => setSelectedDay(d.key)}
                  type="button"
                  className={`px-3 py-1 text-xs font-mono rounded transition-colors cursor-pointer inline-flex items-center gap-1 ${
                    selectedDay === d.key
                      ? 'bg-foreground text-background font-semibold'
                      : 'bg-surface border border-border text-foreground-muted hover:text-foreground'
                  }`}
                >
                  <span>{d.label}</span>
                  {isToday && (
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" title="Hoy" />
                  )}
                </button>
              );
            })}
          </div>

          {/* Vista 1: Tabla completa (Semana) */}
          {selectedDay === 'all' ? (
            <div className="overflow-x-auto border border-border rounded-lg bg-surface">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-border bg-surface-raised font-mono text-foreground-muted">
                    <th className="p-3 w-28 whitespace-nowrap font-medium border-r border-border">
                      Hora
                    </th>
                    {DAYS.map((d) => {
                      const isToday = todayIndex === d.dayIndex;
                      return (
                        <th
                          key={d.key}
                          className={`p-3 font-medium border-r border-border last:border-r-0 ${
                            isToday ? 'text-foreground font-bold bg-surface-hover' : ''
                          }`}
                        >
                          <div className="flex items-center gap-1.5">
                            <span>{d.label}</span>
                            {isToday && (
                              <span className="text-[10px] uppercase font-mono px-1 py-0.2 bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 rounded">
                                Hoy
                              </span>
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
                        <tr key={slot.index} className="bg-surface-raised/70">
                          <td className="p-2.5 font-mono text-foreground-subtle border-r border-border whitespace-nowrap">
                            {slot.label}
                          </td>
                          <td
                            colSpan={5}
                            className="p-2.5 text-center font-mono uppercase tracking-wider text-foreground-subtle font-medium text-[11px]"
                          >
                            — Recreo (30 min) —
                          </td>
                        </tr>
                      );
                    }

                    return (
                      <tr key={slot.index} className="hover:bg-surface-hover/50">
                        <td className="p-3 font-mono text-foreground-subtle border-r border-border whitespace-nowrap">
                          {slot.label}
                        </td>
                        {DAYS.map((d) => {
                          const code = SCHEDULE_GRID[d.key][slotIdx];
                          const subj = SUBJECTS[code];
                          const isToday = todayIndex === d.dayIndex;
                          const isCurrentSlot =
                            isToday && status?.slotIndex === slotIdx;

                          return (
                            <td
                              key={d.key}
                              className={`p-3 border-r border-border last:border-r-0 align-top transition-colors ${
                                isCurrentSlot
                                  ? 'bg-emerald-500/10 dark:bg-emerald-500/15 ring-1 ring-inset ring-emerald-500/40'
                                  : isToday
                                  ? 'bg-surface-hover/30'
                                  : ''
                              }`}
                            >
                              <div className="space-y-0.5">
                                <div className="flex items-center justify-between gap-1">
                                  <span className="font-mono font-bold text-foreground">
                                    {code}
                                  </span>
                                  {isCurrentSlot && (
                                    <span className="text-[9px] font-mono px-1 bg-emerald-500 text-white dark:text-black font-semibold rounded">
                                      AHORA
                                    </span>
                                  )}
                                </div>
                                <div className="text-[11px] text-foreground-muted line-clamp-1">
                                  {subj?.name || code}
                                </div>
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
          ) : (
            /* Vista 2: Detalle por día seleccionado (ideal móvil o repaso) */
            <div className="space-y-2">
              <div className="p-3 bg-surface-raised border border-border rounded-lg flex items-center justify-between">
                <span className="font-semibold text-sm text-foreground">
                  {DAYS.find((d) => d.key === selectedDay)?.label}
                </span>
                <span className="font-mono text-xs text-foreground-subtle">
                  7 periodos lectivos · Aula 35
                </span>
              </div>

              <div className="divide-y divide-border border border-border rounded-lg bg-surface overflow-hidden">
                {TIME_SLOTS.map((slot, slotIdx) => {
                  const code = SCHEDULE_GRID[selectedDay][slotIdx];
                  const subj = SUBJECTS[code];
                  const isToday =
                    DAYS.find((d) => d.key === selectedDay)?.dayIndex === todayIndex;
                  const isCurrentSlot = isToday && status?.slotIndex === slotIdx;

                  if (slot.isRecreo) {
                    return (
                      <div
                        key={slot.index}
                        className="p-3.5 bg-surface-raised/60 flex items-center justify-between text-xs font-mono text-foreground-subtle"
                      >
                        <span className="flex items-center gap-2">
                          <Clock className="w-3.5 h-3.5" />
                          {slot.label}
                        </span>
                        <span className="font-medium uppercase tracking-wider text-[11px]">
                          Recreo (30 minutos)
                        </span>
                      </div>
                    );
                  }

                  return (
                    <div
                      key={slot.index}
                      className={`p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2 transition-colors ${
                        isCurrentSlot
                          ? 'bg-emerald-500/10 dark:bg-emerald-500/15 ring-1 ring-inset ring-emerald-500/40'
                          : 'hover:bg-surface-hover/40'
                      }`}
                    >
                      <div className="flex items-start sm:items-center gap-3">
                        <span className="font-mono text-xs text-foreground-subtle w-28 shrink-0">
                          {slot.label}
                        </span>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-bold text-sm text-foreground">
                              {code}
                            </span>
                            <span className="text-xs font-medium text-foreground">
                              · {subj?.name}
                            </span>
                            {isCurrentSlot && (
                              <span className="text-[9px] font-mono px-1 bg-emerald-500 text-white dark:text-black font-semibold rounded">
                                EN CURSO
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-foreground-muted mt-0.5">
                            {subj?.description}
                          </p>
                        </div>
                      </div>
                      <span className="font-mono text-[11px] text-foreground-subtle self-start sm:self-center">
                        Aula 35
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </section>

        {/* Glosario de asignaturas y módulos */}
        <section className="space-y-3 pt-4 border-t border-border">
          <div className="space-y-1">
            <h3 className="text-sm font-semibold uppercase tracking-wider font-mono text-foreground-muted">
              Módulos y Asignaturas (2º SMR)
            </h3>
            <p className="text-xs text-foreground-subtle">
              Resumen de materias que componen el curso lectivo:
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {Object.entries(SUBJECTS)
              .filter(([code]) => code !== 'RECREO')
              .map(([code, meta]) => (
                <div
                  key={code}
                  className="p-3 border border-border rounded-lg bg-surface space-y-1"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono font-bold text-xs px-1.5 py-0.5 bg-surface-raised border border-border rounded text-foreground">
                      {code}
                    </span>
                    <span className="text-[11px] font-mono text-foreground-subtle">
                      Aula 35
                    </span>
                  </div>
                  <div className="text-xs font-semibold text-foreground">
                    {meta.name}
                  </div>
                  <p className="text-xs text-foreground-muted leading-relaxed">
                    {meta.description}
                  </p>
                </div>
              ))}
          </div>
        </section>

        {/* Pie de página simple */}
        <footer className="pt-8 border-t border-border flex flex-col sm:flex-row items-center justify-between gap-3 font-mono text-xs text-foreground-subtle">
          <div>
            2º SMR · Aula 35 · Curso 2026/2027
          </div>
          <div className="text-center sm:text-right">
            Sin juegos ni distracciones. A estudiar y aprobar.
          </div>
        </footer>

      </div>
    </main>
  );
}
