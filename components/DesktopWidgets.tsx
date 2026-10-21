'use client';

import React, { useState, useEffect } from 'react';
import {
  Clock,
  Calendar,
  Trophy,
  Coins,
  ChevronRight,
  ExternalLink,
  Server,
  Copy,
  Check,
  Sparkles,
  AlertCircle,
  Plus,
} from 'lucide-react';
import { UserProfile, CalendarEvent, LeaderboardEntry } from '@/lib/types';
import { getCurrentScheduleStatus } from '@/lib/scheduleData';
import { sound } from '@/lib/audio';

interface DesktopWidgetsProps {
  currentUser: UserProfile | null;
  events?: CalendarEvent[];
  leaderboard?: LeaderboardEntry[];
  onOpenSchedule: () => void;
  onOpenTasks?: () => void;
  onOpenLeaderboard: () => void;
  onOpenFaucet: () => void;
  onOpenRussianRoulette?: () => void;
}

export const DesktopWidgets: React.FC<DesktopWidgetsProps> = ({
  currentUser,
  events = [],
  leaderboard = [],
  onOpenSchedule,
  onOpenTasks,
  onOpenLeaderboard,
  onOpenFaucet,
  onOpenRussianRoulette,
}) => {
  const [liveStatus, setLiveStatus] = useState(() => getCurrentScheduleStatus());
  const [copiedIp, setCopiedIp] = useState(false);

  useEffect(() => {
    const update = () => setLiveStatus(getCurrentScheduleStatus());
    update();
    const interval = setInterval(update, 15000);
    return () => clearInterval(interval);
  }, []);

  const handleCopyIp = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText('smr2.craft.gg');
      setCopiedIp(true);
      sound.tap();
      setTimeout(() => setCopiedIp(false), 2000);
    }
  };

  // Upcoming top 3 events
  const upcomingEvents = events.slice(0, 3);
  // Top 3 leaderboard
  const topStudents = leaderboard.slice(0, 3);

  return (
    <div className="w-full space-y-4">
      {/* Widget 1: Aula en Vivo */}
      <div className="p-4 rounded-3xl bg-[#0c0e12] border border-white/[0.08] space-y-3 shadow-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span
              className={`w-2 h-2 rounded-full ${
                liveStatus.status === 'in_class'
                  ? 'bg-emerald-400 animate-pulse'
                  : liveStatus.status === 'recreo'
                  ? 'bg-amber-400 animate-pulse'
                  : 'bg-zinc-600'
              }`}
            />
            <h3 className="text-xs font-bold text-white uppercase tracking-wider font-mono">
              Aula en Directo
            </h3>
          </div>
          <span className="text-[10px] font-mono text-zinc-500">Aula 204</span>
        </div>

        <div className="p-3 rounded-2xl bg-white/[0.03] border border-white/[0.05] space-y-1.5">
          <div className="text-sm font-bold text-white font-mono leading-snug">
            {liveStatus.currentSubject?.name ||
              (liveStatus.status === 'recreo' ? 'Recreo' : 'Fuera de horario lectivo')}
          </div>
          <div className="text-xs text-zinc-400 font-mono flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-amber-400" />
            <span>{liveStatus.message}</span>
          </div>
        </div>

        <button
          type="button"
          onClick={() => {
            onOpenSchedule();
            sound.tap();
          }}
          className="w-full py-2 rounded-xl text-xs font-mono font-semibold text-zinc-300 hover:text-white bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.06] transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
        >
          <Calendar className="w-3.5 h-3.5 text-blue-400" />
          <span>Ver Horario Completo</span>
          <ChevronRight className="w-3.5 h-3.5 text-zinc-500" />
        </button>
      </div>

      {/* Widget 2: Próximas Tareas & Exámenes */}
      <div className="p-4 rounded-3xl bg-[#0c0e12] border border-white/[0.08] space-y-3 shadow-sm">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold text-white uppercase tracking-wider font-mono flex items-center gap-1.5">
            <AlertCircle className="w-3.5 h-3.5 text-amber-400" />
            <span>Próximas Entregas</span>
          </h3>
          <span className="text-[10px] font-mono text-zinc-500">
            {events.length} programadas
          </span>
        </div>

        {upcomingEvents.length > 0 ? (
          <div className="space-y-2">
            {upcomingEvents.map((ev) => (
              <div
                key={ev.id}
                className="p-2.5 rounded-xl bg-white/[0.03] border border-white/[0.05] hover:bg-white/[0.06] transition-colors cursor-pointer space-y-1"
                onClick={() => {
                  onOpenSchedule();
                  sound.tap();
                }}
              >
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono font-bold px-1.5 py-0.2 rounded bg-amber-400/20 text-amber-300 border border-amber-400/30">
                    {ev.subject}
                  </span>
                  <span className="text-[10px] font-mono text-zinc-400">
                    {ev.event_date}
                  </span>
                </div>
                <p className="text-xs text-zinc-200 font-medium truncate">{ev.title}</p>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-3 text-center text-xs text-zinc-500 font-mono">
            Sin exámenes ni entregas urgentes
          </div>
        )}

        <button
          type="button"
          onClick={() => {
            onOpenSchedule();
            sound.tap();
          }}
          className="w-full py-2 rounded-xl text-xs font-mono font-semibold text-zinc-300 hover:text-white bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.06] transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
        >
          <span>Abrir Agenda y Tareas</span>
          <ChevronRight className="w-3.5 h-3.5 text-zinc-500" />
        </button>
      </div>

      {/* Widget 3: Top Estudiantes */}
      <div className="p-4 rounded-3xl bg-[#0c0e12] border border-white/[0.08] space-y-3 shadow-sm">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold text-white uppercase tracking-wider font-mono flex items-center gap-1.5">
            <Trophy className="w-3.5 h-3.5 text-amber-400" />
            <span>Top de Clase</span>
          </h3>
          <button
            type="button"
            onClick={() => {
              onOpenFaucet();
              sound.tap();
            }}
            className="text-[10px] font-mono text-amber-400 hover:underline flex items-center gap-1 cursor-pointer"
          >
            <Coins className="w-3 h-3" />
            <span>+ Reclamar</span>
          </button>
        </div>

        {topStudents.length > 0 ? (
          <div className="space-y-1.5">
            {topStudents.map((st, i) => (
              <div
                key={st.id}
                className="flex items-center justify-between p-2 rounded-xl bg-white/[0.02] border border-white/[0.04]"
              >
                <div className="flex items-center gap-2">
                  <span
                    className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-mono font-bold ${
                      i === 0
                        ? 'bg-amber-400 text-black'
                        : i === 1
                        ? 'bg-zinc-300 text-black'
                        : 'bg-amber-700 text-white'
                    }`}
                  >
                    {i + 1}
                  </span>
                  <span className="text-xs font-mono text-zinc-200">@{st.username}</span>
                </div>
                <span className="text-xs font-mono font-semibold text-amber-300">
                  {st.coins.toLocaleString('es-ES')}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-3 text-center text-xs text-zinc-500 font-mono">
            Cargando clasificación...
          </div>
        )}

        <button
          type="button"
          onClick={() => {
            onOpenLeaderboard();
            sound.tap();
          }}
          className="w-full py-2 rounded-xl text-xs font-mono font-semibold text-amber-300 hover:text-amber-200 bg-amber-400/10 hover:bg-amber-400/20 border border-amber-400/20 transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
        >
          <span>Ver Ranking Completo</span>
          <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Widget 4: Servidor Minecraft SMR */}
      <div className="p-4 rounded-3xl bg-[#0c0e12] border border-white/[0.08] space-y-2.5 shadow-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <h3 className="text-xs font-bold text-white uppercase tracking-wider font-mono">
              Minecraft SMR2
            </h3>
          </div>
          <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-1.5 py-0.2 rounded border border-emerald-500/20">
            Online 24/7
          </span>
        </div>

        <p className="text-xs text-zinc-400 font-normal leading-relaxed">
          Servidor comunitario de clase (versión 1.21.x). Conecta y construye con compañeros.
        </p>

        <div className="flex items-center justify-between p-2 rounded-xl bg-black/60 border border-white/[0.08]">
          <span className="text-xs font-mono font-semibold text-zinc-200">smr2.craft.gg</span>
          <button
            type="button"
            onClick={handleCopyIp}
            className="px-2 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-zinc-200 text-[11px] font-mono flex items-center gap-1 transition-colors cursor-pointer"
          >
            {copiedIp ? (
              <>
                <Check className="w-3 h-3 text-emerald-400" />
                <span className="text-emerald-400">Copiada</span>
              </>
            ) : (
              <>
                <Copy className="w-3 h-3" />
                <span>Copiar IP</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
