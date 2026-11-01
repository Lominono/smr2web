'use client';

import React from 'react';
import { Clock, ArrowRight } from 'lucide-react';
import { LiveScheduleStatus } from '@/lib/scheduleData';

interface LiveClassStatusProps {
  status: LiveScheduleStatus;
  variant?: 'widget' | 'banner';
}

export const LiveClassStatus: React.FC<LiveClassStatusProps> = ({
  status,
  variant = 'widget',
}) => {
  const isInClass = status.status === 'in_class';
  const isRecreo = status.status === 'recreo';
  const isBefore = status.status === 'before_school';
  const isAfter = status.status === 'after_school';
  const isWeekend = status.status === 'weekend';

  if (variant === 'banner') {
    return (
      <div className="rounded-xl border border-border/70 bg-surface-raised/60 p-4 transition-all">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          {/* Left info */}
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="relative flex h-2 w-2">
                <span
                  className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                    isInClass
                      ? 'bg-emerald-400'
                      : isRecreo
                      ? 'bg-amber-400'
                      : 'bg-zinc-500'
                  }`}
                />
                <span
                  className={`relative inline-flex rounded-full h-2 w-2 ${
                    isInClass
                      ? 'bg-emerald-500'
                      : isRecreo
                      ? 'bg-amber-500'
                      : 'bg-zinc-500'
                  }`}
                />
              </span>
              <span className="text-[11px] font-mono uppercase tracking-wider text-foreground-subtle">
                {isInClass
                  ? 'Clase en directo · Aula 204'
                  : isRecreo
                  ? 'Descanso de recreo'
                  : isBefore
                  ? 'Antes de clase'
                  : isWeekend
                  ? 'Fin de semana'
                  : 'Jornada concluida'}
              </span>
              {status.currentSlot && (
                <span className="text-[11px] font-mono text-foreground-muted border-l border-border/60 pl-2">
                  {status.currentSlot.label}
                </span>
              )}
            </div>

            <div className="flex items-baseline gap-2">
              <h3 className="text-base sm:text-lg font-semibold text-foreground tracking-tight">
                {isInClass
                  ? status.currentSubject?.name || status.currentSubjectCode
                  : isRecreo
                  ? 'Pausa de media mañana'
                  : isBefore
                  ? `Próxima clase: ${status.nextSubject?.name || status.nextSubjectCode}`
                  : isWeekend
                  ? 'Sin clases hoy'
                  : 'Clases finalizadas por hoy'}
              </h3>
              {isInClass && status.currentSubjectCode && (
                <span className="text-xs font-mono px-1.5 py-0.5 rounded bg-surface border border-border/70 text-foreground-muted font-medium">
                  {status.currentSubjectCode}
                </span>
              )}
            </div>
          </div>

          {/* Right: Big time remaining indicator */}
          <div className="flex items-center sm:items-end flex-col justify-center sm:text-right shrink-0">
            {isInClass || isRecreo ? (
              <>
                <div className="flex items-baseline gap-1.5">
                  <span className="text-2xl sm:text-3xl font-mono font-bold tracking-tight text-foreground">
                    {status.minutesRemaining}
                  </span>
                  <span className="text-xs font-mono text-foreground-muted">min restantes</span>
                </div>
                {status.nextSubjectCode && (
                  <span className="text-[11px] text-foreground-subtle flex items-center gap-1 font-mono mt-0.5">
                    <span>Siguiente: {status.nextSubjectCode}</span>
                    {status.nextSubject && (
                      <span className="hidden sm:inline text-foreground-subtle truncate max-w-[120px]">
                        ({status.nextSubject.name})
                      </span>
                    )}
                  </span>
                )}
              </>
            ) : isBefore ? (
              <div className="flex items-baseline gap-1.5">
                <span className="text-2xl font-mono font-bold text-foreground">
                  {status.minutesRemaining}
                </span>
                <span className="text-xs font-mono text-foreground-muted">min para empezar</span>
              </div>
            ) : (
              <div className="text-xs font-mono text-foreground-muted">
                Próxima: {status.nextSubjectCode || 'SR'} a las 08:15
              </div>
            )}
          </div>
        </div>

        {/* Minimal Hairline Progress Bar */}
        {(isInClass || isRecreo) && (
          <div className="mt-3.5 space-y-1.5">
            <div className="h-1 w-full bg-border/40 rounded-full overflow-hidden">
              <div
                className={`h-full transition-all duration-1000 rounded-full ${
                  isInClass ? 'bg-foreground' : 'bg-amber-400'
                }`}
                style={{ width: `${Math.max(4, Math.min(100, status.progressPercent))}%` }}
              />
            </div>
            <div className="flex justify-between items-center text-[10px] font-mono text-foreground-subtle">
              <span>{status.elapsedMinutes} min transcurridos</span>
              <span>{status.progressPercent}% completado</span>
            </div>
          </div>
        )}
      </div>
    );
  }

  // Compact Widget variant for DesktopWidgets
  return (
    <div className="p-3 rounded-xl bg-surface-raised border border-border/70 space-y-2.5 transition-all">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="relative flex h-2 w-2">
            <span
              className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                isInClass
                  ? 'bg-emerald-400'
                  : isRecreo
                  ? 'bg-amber-400'
                  : 'bg-zinc-500'
              }`}
            />
            <span
              className={`relative inline-flex rounded-full h-2 w-2 ${
                isInClass
                  ? 'bg-emerald-500'
                  : isRecreo
                  ? 'bg-amber-500'
                  : 'bg-zinc-500'
              }`}
            />
          </span>
          <span className="text-[11px] font-medium text-foreground truncate max-w-[170px]">
            {isInClass
              ? status.currentSubject?.name || status.currentSubjectCode
              : isRecreo
              ? 'Recreo'
              : isBefore
              ? 'Antes de clase'
              : 'Fuera de horario'}
          </span>
        </div>

        {isInClass && status.currentSubjectCode && (
          <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-surface border border-border/60 text-foreground-muted">
            {status.currentSubjectCode}
          </span>
        )}
      </div>

      {/* Countdown and slot */}
      <div className="flex items-end justify-between pt-0.5">
        <div>
          {isInClass || isRecreo ? (
            <div className="flex items-baseline gap-1">
              <span className="text-xl font-mono font-bold text-foreground tracking-tight">
                {status.minutesRemaining}
              </span>
              <span className="text-[11px] font-mono text-foreground-muted">min restantes</span>
            </div>
          ) : isBefore ? (
            <div className="flex items-baseline gap-1">
              <span className="text-base font-mono font-bold text-foreground">
                {status.minutesRemaining}
              </span>
              <span className="text-[11px] font-mono text-foreground-muted">min para iniciar</span>
            </div>
          ) : (
            <span className="text-xs text-foreground-subtle font-mono">Clases terminadas</span>
          )}

          {status.currentSlot && (
            <div className="text-[10px] font-mono text-foreground-subtle flex items-center gap-1 mt-0.5">
              <Clock className="w-2.5 h-2.5 text-foreground-subtle" />
              <span>{status.currentSlot.label}</span>
            </div>
          )}
        </div>

        {status.nextSubjectCode && (
          <div className="text-right text-[10px] font-mono text-foreground-subtle flex items-center gap-1">
            <span>Sig:</span>
            <span className="text-foreground-muted font-medium">{status.nextSubjectCode}</span>
          </div>
        )}
      </div>

      {/* Hairline progress */}
      {(isInClass || isRecreo) && (
        <div className="space-y-1">
          <div className="h-1 w-full bg-border/40 rounded-full overflow-hidden">
            <div
              className={`h-full transition-all duration-1000 rounded-full ${
                isInClass ? 'bg-foreground' : 'bg-amber-400'
              }`}
              style={{ width: `${Math.max(4, Math.min(100, status.progressPercent))}%` }}
            />
          </div>
        </div>
      )}
    </div>
  );
};
