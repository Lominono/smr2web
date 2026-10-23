'use client';

import React, { useState, useEffect } from 'react';
import {
  Clock,
  Calendar,
  Trophy,
  ChevronRight,
  AlertCircle,
  Coins,
  Wine,
  ArrowDownToLine,
  Check,
} from 'lucide-react';
import { UserProfile, CalendarEvent, LeaderboardEntry } from '@/lib/types';
import { getCurrentScheduleStatus } from '@/lib/scheduleData';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import {
  TIERS,
  ZONES,
  PARTY_RANKS,
  STORAGE_KEY_PREFIX,
  BotellonState,
  getTierMilestoneMultiplier,
} from '@/components/PartyIdleGame';
import { sound } from '@/lib/audio';
import confetti from 'canvas-confetti';

interface DesktopWidgetsProps {
  currentUser: UserProfile | null;
  events?: CalendarEvent[];
  leaderboard?: LeaderboardEntry[];
  onOpenSchedule: () => void;
  onOpenLeaderboard: () => void;
  onOpenFaucet: () => void;
  onOpenRussianRoulette?: () => void;
  onOpenPartyIdle?: () => void;
  onUpdateCoins?: (delta: number) => void;
}

export const DesktopWidgets: React.FC<DesktopWidgetsProps> = ({
  currentUser,
  events = [],
  leaderboard = [],
  onOpenSchedule,
  onOpenLeaderboard,
  onOpenFaucet,
  onOpenPartyIdle,
  onUpdateCoins,
}) => {
  const [liveStatus, setLiveStatus] = useState(() => getCurrentScheduleStatus());
  const [botellonState, setBotellonState] = useState<{ vault: number; rate: number }>({
    vault: 0,
    rate: 0,
  });
  const [justClaimedWidget, setJustClaimedWidget] = useState(false);

  useEffect(() => {
    const update = () => setLiveStatus(getCurrentScheduleStatus());
    update();
    const interval = setInterval(update, 20000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const key = `${STORAGE_KEY_PREFIX}${currentUser?.id || 'local'}`;
    const read = () => {
      try {
        const raw = localStorage.getItem(key);
        if (raw) {
          const parsed: BotellonState = JSON.parse(raw);
          const lvl = parsed.levels || {};
          const baseRate = TIERS.reduce((acc, t) => {
            const l = lvl[t.id] || 0;
            return acc + l * t.baseRate * getTierMilestoneMultiplier(l);
          }, 0);
          const zone = ZONES.find((z) => z.id === parsed.currentZoneId) || ZONES[0];
          const rank =
            [...PARTY_RANKS]
              .reverse()
              .find((r) => (parsed.totalLifetimeProduced || 0) >= r.minProd) || PARTY_RANKS[0];
          const rankMult = 1 + rank.bonusPercent / 100;
          const prestigeMult = 1 + (parsed.afterPrestigeCount || 0) * 0.5;
          setBotellonState({
            vault: Math.floor(parsed.pendingVault || 0),
            rate: Math.floor(baseRate * (zone?.multiplier || 1) * rankMult * prestigeMult * 10) / 10,
          });
        }
      } catch {}
    };

    read();
    const interval = setInterval(read, 2000);
    return () => clearInterval(interval);
  }, [currentUser?.id]);

  const handleClaimFromWidget = () => {
    const key = `${STORAGE_KEY_PREFIX}${currentUser?.id || 'local'}`;
    try {
      const raw = localStorage.getItem(key);
      if (!raw) return;
      const parsed: BotellonState = JSON.parse(raw);
      const toClaim = Math.floor(parsed.pendingVault || 0);
      if (toClaim <= 0) return;

      sound.coinWin();
      confetti({ particleCount: 50, spread: 50, origin: { y: 0.7 } });

      if (onUpdateCoins) {
        onUpdateCoins(toClaim);
      }

      parsed.pendingVault = 0;
      parsed.lastTickMs = Date.now();
      localStorage.setItem(key, JSON.stringify(parsed));

      setBotellonState((prev) => ({ ...prev, vault: 0 }));
      setJustClaimedWidget(true);
      setTimeout(() => setJustClaimedWidget(false), 2000);
    } catch {}
  };

  const upcomingEvents = events.slice(0, 3);
  const topStudents = leaderboard.slice(0, 3);

  return (
    <div className="w-full space-y-3.5">
      {/* Widget 1: Aula en Vivo */}
      <Card className="rounded-2xl border-border/70 p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span
              className={`w-2 h-2 rounded-full ${
                liveStatus.status === 'in_class'
                  ? 'bg-success animate-pulse'
                  : liveStatus.status === 'recreo'
                  ? 'bg-accent animate-pulse'
                  : 'bg-foreground-subtle'
              }`}
            />
            <h3 className="text-[11px] font-semibold uppercase tracking-wider text-foreground-muted">
              Horario en directo
            </h3>
          </div>
          <span className="text-[11px] font-mono text-foreground-subtle">Aula 204</span>
        </div>

        <div className="p-3 rounded-xl bg-surface-raised border border-border/60 space-y-1">
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
          className="w-full justify-between rounded-xl"
          onClick={onOpenSchedule}
        >
          <span className="flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5" />
            <span>Ver horario semanal</span>
          </span>
          <ChevronRight className="w-3.5 h-3.5 text-foreground-subtle" />
        </Button>
      </Card>

      {/* Widget Botellón: Farmeo en Directo */}
      <Card className="rounded-2xl border-border/70 p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span
              className={`w-2 h-2 rounded-full ${
                botellonState.rate > 0 ? 'bg-emerald-400 animate-pulse' : 'bg-foreground-subtle'
              }`}
            />
            <h3 className="text-[11px] font-semibold uppercase tracking-wider text-foreground-muted flex items-center gap-1.5">
              <Wine className="w-3.5 h-3.5 text-accent" />
              <span>El Botellón</span>
            </h3>
          </div>
          <span className="text-[11px] font-mono text-emerald-400 font-semibold">
            +{botellonState.rate.toFixed(1)}/s
          </span>
        </div>

        <div className="p-3 rounded-xl bg-surface-raised border border-border/60 flex items-center justify-between gap-2">
          <div>
            <div className="text-[10px] text-foreground-subtle uppercase tracking-wider font-mono">
              En la saca
            </div>
            <div className="text-base font-semibold font-mono text-foreground">
              +{botellonState.vault.toLocaleString()}{' '}
              <span className="text-[10px] font-sans font-normal text-foreground-muted">fichas</span>
            </div>
          </div>

          <button
            type="button"
            disabled={botellonState.vault <= 0}
            onClick={handleClaimFromWidget}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer active:scale-95 ${
              botellonState.vault > 0
                ? 'bg-foreground text-background shadow-xs hover:opacity-95'
                : 'bg-surface text-foreground-subtle border border-border/50 cursor-not-allowed opacity-50'
            }`}
          >
            {justClaimedWidget ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-400" />
                <span>¡Cobrado!</span>
              </>
            ) : (
              <>
                <ArrowDownToLine className="w-3.5 h-3.5" />
                <span>Meter a la saca</span>
              </>
            )}
          </button>
        </div>

        {onOpenPartyIdle && (
          <Button
            variant="secondary"
            size="sm"
            className="w-full justify-between rounded-xl"
            onClick={onOpenPartyIdle}
          >
            <span className="flex items-center gap-1.5">
              <Wine className="w-3.5 h-3.5 text-accent" />
              <span>Ir a la fiesta completa</span>
            </span>
            <ChevronRight className="w-3.5 h-3.5 text-foreground-subtle" />
          </Button>
        )}
      </Card>

      {/* Widget 2: Próximas Entregas */}
      <Card className="rounded-2xl border-border/70 p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-[11px] font-semibold uppercase tracking-wider text-foreground-muted flex items-center gap-1.5">
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
                className="p-2.5 rounded-xl bg-surface-raised border border-border/50 hover:border-border transition-colors cursor-pointer space-y-0.5"
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
          <p className="text-xs text-foreground-subtle text-center py-2">
            Sin entregas pendientes
          </p>
        )}

        <Button
          variant="secondary"
          size="sm"
          className="w-full justify-between rounded-xl"
          onClick={onOpenSchedule}
        >
          <span>Abrir agenda</span>
          <ChevronRight className="w-3.5 h-3.5 text-foreground-subtle" />
        </Button>
      </Card>

      {/* Widget 3: Clasificación */}
      <Card className="rounded-2xl border-border/70 p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-[11px] font-semibold uppercase tracking-wider text-foreground-muted flex items-center gap-1.5">
            <Trophy className="w-3.5 h-3.5 text-amber-500" />
            <span>Clasificación</span>
          </h3>
          <button
            type="button"
            onClick={onOpenFaucet}
            className="text-[11px] text-accent hover:underline flex items-center gap-1 cursor-pointer"
          >
            <Coins className="w-3 h-3 text-amber-500" />
            <span>Fondo diario</span>
          </button>
        </div>

        {topStudents.length > 0 ? (
          <div className="space-y-1.5">
            {topStudents.map((st, i) => (
              <div
                key={st.id}
                className="flex items-center justify-between p-2 rounded-xl bg-surface-raised border border-border/50 text-xs"
              >
                <div className="flex items-center gap-2">
                  <span className="w-4 text-center font-mono text-foreground-subtle text-[11px]">
                    {i + 1}.
                  </span>
                  <span className="font-mono text-foreground">@{st.username}</span>
                </div>
                <span className="font-mono text-foreground font-semibold">
                  {st.coins.toLocaleString('es-ES')}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-foreground-subtle text-center py-2">
            Sin datos en el ranking
          </p>
        )}

        <Button
          variant="secondary"
          size="sm"
          className="w-full justify-between rounded-xl"
          onClick={onOpenLeaderboard}
        >
          <span>Ver ranking completo</span>
          <ChevronRight className="w-3.5 h-3.5 text-foreground-subtle" />
        </Button>
      </Card>
    </div>
  );
};
