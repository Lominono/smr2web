'use client';

import React, { useState, useEffect } from 'react';
import { Clock, Calendar, MapPin, User, Coffee, Sparkles, ChevronRight, X } from 'lucide-react';
import { WEEKLY_SCHEDULE } from '@/lib/mock-data';
import { SUBJECTS } from '@/lib/subjects';
import { ScheduleClass, SubjectCode } from '@/lib/types';

export const ScheduleWidget: React.FC = () => {
  const [currentTime, setCurrentTime] = useState<Date | null>(null);
  const [showFullSchedule, setShowFullSchedule] = useState(false);

  useEffect(() => {
    setCurrentTime(new Date());
    const timer = setInterval(() => setCurrentTime(new Date()), 30000);
    return () => clearInterval(timer);
  }, []);

  const now = currentTime || new Date('2026-10-16T10:00:00');
  const dayOfWeek = now.getDay(); // 0 = Domingo, 1 = Lunes, ..., 6 = Sabado
  const currentMinutes = now.getHours() * 60 + now.getMinutes();

  // Parse "HH:MM" to minutes from midnight
  const parseToMinutes = (timeStr: string) => {
    const [h, m] = timeStr.split(':').map(Number);
    return h * 60 + m;
  };

  // Find class right now
  let currentClass: ScheduleClass | null = null;
  let nextClass: ScheduleClass | null = null;
  let isRecess = false;

  const todayClasses = WEEKLY_SCHEDULE.filter((c) => c.dayOfWeek === dayOfWeek).sort(
    (a, b) => parseToMinutes(a.startHour) - parseToMinutes(b.startHour)
  );

  // Recess is usually 11:15 to 11:45
  const recessStart = 11 * 60 + 15;
  const recessEnd = 11 * 60 + 45;

  if (dayOfWeek >= 1 && dayOfWeek <= 5) {
    if (currentMinutes >= recessStart && currentMinutes < recessEnd) {
      isRecess = true;
    } else {
      for (let i = 0; i < todayClasses.length; i++) {
        const start = parseToMinutes(todayClasses[i].startHour);
        const end = parseToMinutes(todayClasses[i].endHour);
        if (currentMinutes >= start && currentMinutes < end) {
          currentClass = todayClasses[i];
          nextClass = todayClasses[i + 1] || null;
          break;
        } else if (currentMinutes < start && !nextClass) {
          nextClass = todayClasses[i];
          break;
        }
      }
    }
  }

  const daysNames = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
  const dayName = daysNames[dayOfWeek];

  const formatMinutesRemaining = (endHourStr: string) => {
    const endMinutes = parseToMinutes(endHourStr);
    const diff = endMinutes - currentMinutes;
    if (diff <= 0) return 'Terminando';
    if (diff === 1) return 'Queda 1 min';
    return `Quedan ${diff} mins`;
  };

  return (
    <>
      <div className="bg-gradient-to-r from-zinc-900 via-zinc-900/90 to-zinc-950 border border-zinc-800 rounded-2xl p-4 sm:p-5 shadow-lg relative overflow-hidden">
        {/* Subtle decorative glow */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20"></div>

        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 relative z-10">
          {/* Left info: What's happening now */}
          <div className="flex items-start gap-3.5">
            <div className="p-2.5 rounded-xl bg-zinc-800/80 border border-zinc-700/60 text-emerald-400 shrink-0">
              {isRecess ? <Coffee className="w-6 h-6 text-amber-400 animate-bounce" /> : <Clock className="w-6 h-6" />}
            </div>

            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs font-mono font-medium text-zinc-400 uppercase tracking-wider">
                  {dayName} · {currentTime ? currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '08:30'}
                </span>
                <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
              </div>

              {isRecess ? (
                <div>
                  <h3 className="text-base sm:text-lg font-bold text-amber-300 flex items-center gap-2">
                    🥪 ¡RECREO / BOCATA TIME!
                  </h3>
                  <p className="text-xs text-zinc-400 mt-0.5">
                    Momento de despejarse, bajar al bar o tomar un café antes de que empiece el siguiente asalto.
                  </p>
                </div>
              ) : currentClass ? (
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-mono px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-semibold">
                      EN VIVO AHORA
                    </span>
                    <h3 className="text-base sm:text-lg font-bold text-white">
                      {SUBJECTS[currentClass.subject]?.name || currentClass.subject}
                    </h3>
                    <span className="text-xs text-zinc-400 font-mono">
                      ({formatMinutesRemaining(currentClass.endHour)})
                    </span>
                  </div>

                  <div className="flex items-center gap-4 text-xs text-zinc-400 mt-1 flex-wrap">
                    <span className="flex items-center gap-1 text-zinc-300">
                      <MapPin className="w-3.5 h-3.5 text-zinc-500" />
                      {currentClass.classroom}
                    </span>
                    <span className="flex items-center gap-1 text-zinc-300">
                      <User className="w-3.5 h-3.5 text-zinc-500" />
                      {currentClass.teacher}
                    </span>
                    <span className="font-mono text-zinc-500">
                      {currentClass.startHour} - {currentClass.endHour}
                    </span>
                  </div>
                </div>
              ) : (
                <div>
                  <h3 className="text-base sm:text-lg font-semibold text-zinc-200">
                    {dayOfWeek === 0 || dayOfWeek === 6
                      ? '🎉 Fin de semana: Servidores en reposo'
                      : '💤 Sin clase ahora mismo (Fuera de horario)'}
                  </h3>
                  <p className="text-xs text-zinc-400 mt-0.5">
                    {nextClass
                      ? `Próxima clase hoy: ${SUBJECTS[nextClass.subject]?.name} a las ${nextClass.startHour}`
                      : 'Sin más clases programadas hoy. Toca viciar o descansar.'}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Button to see full schedule */}
          <button
            onClick={() => setShowFullSchedule(true)}
            className="self-stretch sm:self-auto flex items-center justify-center gap-2 px-3.5 py-2 rounded-xl text-xs font-medium bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700 transition-colors cursor-pointer shrink-0"
          >
            <Calendar className="w-4 h-4 text-emerald-400" />
            <span>Ver horario semanal</span>
            <ChevronRight className="w-3.5 h-3.5 text-zinc-400" />
          </button>
        </div>
      </div>

      {/* Modal: Horario Completo */}
      {showFullSchedule && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-zinc-900 border border-zinc-700 rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-zinc-800 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-emerald-400" />
                  Horario de Clase: 2º SMR (Curso Completo)
                </h3>
                <p className="text-xs text-zinc-400">
                  Turno de mañanas con recreo de 11:15 a 11:45
                </p>
              </div>
              <button
                onClick={() => setShowFullSchedule(false)}
                className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body / Table */}
            <div className="p-4 sm:p-6 overflow-y-auto">
              <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
                {[1, 2, 3, 4, 5].map((day) => {
                  const dayNames = ['', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes'];
                  const classesForDay = WEEKLY_SCHEDULE.filter((c) => c.dayOfWeek === day);

                  return (
                    <div
                      key={day}
                      className={`rounded-xl border p-3 flex flex-col gap-2.5 ${
                        day === dayOfWeek
                          ? 'border-emerald-500/50 bg-emerald-500/5'
                          : 'border-zinc-800 bg-zinc-950/50'
                      }`}
                    >
                      <div className="flex items-center justify-between pb-2 border-b border-zinc-800">
                        <span className="font-bold text-sm text-white">
                          {dayNames[day]}
                        </span>
                        {day === dayOfWeek && (
                          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400">
                            HOY
                          </span>
                        )}
                      </div>

                      <div className="space-y-2">
                        {classesForDay.map((item) => {
                          const sub = SUBJECTS[item.subject];
                          return (
                            <div
                              key={item.id}
                              className={`p-2 rounded-lg border text-xs ${
                                sub ? `${sub.bgColor} ${sub.borderColor}` : 'bg-zinc-900 border-zinc-800'
                              }`}
                            >
                              <div className="flex items-center justify-between font-mono text-[11px] text-zinc-400 mb-0.5">
                                <span>{item.startHour} - {item.endHour}</span>
                                <span className="font-semibold text-zinc-300">{item.subject}</span>
                              </div>
                              <div className="font-semibold text-white truncate">
                                {sub?.name || item.subject}
                              </div>
                              <div className="text-[10px] text-zinc-400 flex items-center justify-between mt-1">
                                <span>{item.classroom}</span>
                                <span>{item.teacher}</span>
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

            {/* Modal Footer */}
            <div className="px-6 py-3 bg-zinc-950 border-t border-zinc-800 flex justify-end">
              <button
                onClick={() => setShowFullSchedule(false)}
                className="px-4 py-2 rounded-lg text-xs font-semibold bg-zinc-800 hover:bg-zinc-700 text-white transition-colors"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
