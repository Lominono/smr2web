'use client';

import React, { useState, useEffect } from 'react';
import {
  Clock,
  Calendar,
  Trophy,
  ChevronRight,
  AlertCircle,
  Coins,
} from 'lucide-react';
import { UserProfile, CalendarEvent, LeaderboardEntry } from '@/lib/types';
import { getCurrentScheduleStatus } from '@/lib/scheduleData';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';

interface DesktopWidgetsProps {
  currentUser: UserProfile | null;
  events?: CalendarEvent[];
  leaderboard?: LeaderboardEntry[];
  onOpenSchedule: () => void;
  onOpenLeaderboard: () => void;
  onOpenFaucet: () => void;
  onOpenRussianRoulette?: () => void;
}

export const DesktopWidgets: React.FC<DesktopWidgetsProps> = ({
  events = [],
  leaderboard = [],
  onOpenSchedule,
  onOpenLeaderboard,
  onOpenFaucet,
}) => {
  const [liveStatus, setLiveStatus] = useState(() => getCurrentScheduleStatus());

  useEffect(() => {
    const update = () => setLiveStatus(getCurrentScheduleStatus());
    update();
    const interval = setInterval(update, 20000);
    return () => clearInterval(interval);
  }, []);

  const upcomingEvents = events.slice(0, 3);
  const topStudents = leaderboard.slice(0, 3);

  return (
    <div className="w-full space-y-3">
      {/* Widget 1: Aula en Vivo */}
      <Card className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span
              className={`w-2 h-2 rounded-full ${
                liveStatus.status === 'in_class'
                  ? 'bg-success'
                  : liveStatus.status === 'recreo'
                  ? 'bg-accent'
                  : 'bg-foreground-subtle'
              }`}
            />
            <h3 className="text-xs font-semibold uppercase tracking-wider text-foreground-muted font-mono">
              Horario actual
            </h3>
          </div>
          <span className="text-[11px] font-mono text-foreground-subtle">Aula 204</span>
        </div>

        <div className="p-2.5 rounded-[var(--radius)] bg-surface-raised border border-border space-y-1">
          <div className="text-xs font-semibold text-foreground">
            {liveStatus.currentSubject?.name ||
              (liveStatus.status === 'recreo' ? 'Recreo' : 'Fuera de horario lectivo')}
          </div>
          <div className="text-[11px] text-foreground-muted flex items-center gap-1.5 font-mono">
            <Clock className="w-3 h-3 text-accent" />
            <span>{liveStatus.message}</span>
          </div>
        </div>

        <Button
          variant="secondary"
          size="sm"
          className="w-full justify-between"
          onClick={onOpenSchedule}
        >
          <span className="flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5" />
            <span>Ver horario semanal</span>
          </span>
          <ChevronRight className="w-3.5 h-3.5 text-foreground-subtle" />
        </Button>
      </Card>

      {/* Widget 2: Próximas Entregas (Solo datos reales de Supabase) */}
      <Card className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-foreground-muted font-mono flex items-center gap-1.5">
            <AlertCircle className="w-3.5 h-3.5 text-accent" />
            <span>Próximas entregas</span>
          </h3>
          <Badge variant="default" size="sm">
            {events.length}
          </Badge>
        </div>

        {upcomingEvents.length > 0 ? (
          <div className="space-y-1.5">
            {upcomingEvents.map((ev) => (
              <div
                key={ev.id}
                onClick={onOpenSchedule}
                className="p-2 rounded-[var(--radius)] bg-surface-raised border border-border-subtle hover:border-border transition-colors cursor-pointer space-y-0.5"
              >
                <div className="flex items-center justify-between text-[11px] font-mono">
                  <span className="font-semibold text-accent">{ev.subject}</span>
                  <span className="text-foreground-subtle">{ev.event_date}</span>
                </div>
                <p className="text-xs text-foreground font-medium truncate">{ev.title}</p>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-foreground-subtle font-mono text-center py-2">
            Sin entregas registradas
          </p>
        )}

        <Button
          variant="secondary"
          size="sm"
          className="w-full justify-between"
          onClick={onOpenSchedule}
        >
          <span>Abrir agenda</span>
          <ChevronRight className="w-3.5 h-3.5 text-foreground-subtle" />
        </Button>
      </Card>

      {/* Widget 3: Clasificación (Solo perfiles reales de Supabase) */}
      <Card className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-foreground-muted font-mono flex items-center gap-1.5">
            <Trophy className="w-3.5 h-3.5 text-accent" />
            <span>Clasificación</span>
          </h3>
          <button
            type="button"
            onClick={onOpenFaucet}
            className="text-[11px] font-mono text-accent hover:underline flex items-center gap-1 cursor-pointer"
          >
            <Coins className="w-3 h-3" />
            <span>Fondo diario</span>
          </button>
        </div>

        {topStudents.length > 0 ? (
          <div className="space-y-1">
            {topStudents.map((st, i) => (
              <div
                key={st.id}
                className="flex items-center justify-between p-2 rounded-[var(--radius)] bg-surface-raised border border-border-subtle text-xs"
              >
                <div className="flex items-center gap-2">
                  <span className="w-4 text-center font-mono text-foreground-subtle text-[11px]">
                    {i + 1}.
                  </span>
                  <span className="font-mono text-foreground">@{st.username}</span>
                </div>
                <span className="font-mono text-accent font-medium">
                  {st.coins.toLocaleString('es-ES')}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-foreground-subtle font-mono text-center py-2">
            Sin datos de clasificación
          </p>
        )}

        <Button
          variant="secondary"
          size="sm"
          className="w-full justify-between"
          onClick={onOpenLeaderboard}
        >
          <span>Ver ranking completo</span>
          <ChevronRight className="w-3.5 h-3.5 text-foreground-subtle" />
        </Button>
      </Card>
    </div>
  );
};
