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
  Sprout,
  ArrowDownToLine,
  Check,
  Crown,
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
  onOpenFarmhand?: () => void;
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
  onOpenFarmhand,
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
      const rawFichas = Math.floor(parsed.pendingVault || 0);
      const coinsToClaim = Math.floor(rawFichas / 5);
      if (coinsToClaim <= 0) return;

      sound.coinWin();
      confetti({ particleCount: 50, spread: 50, origin: { y: 0.7 } });

      if (onUpdateCoins) {
        onUpdateCoins(coinsToClaim);
      }

      const fichasDeducted = coinsToClaim * 5;
      const remainingVault = Math.max(0, rawFichas - fichasDeducted);
      parsed.pendingVault = remainingVault;
      parsed.lastTickMs = Date.now();
      localStorage.setItem(key, JSON.stringify(parsed));

      setBotellonState((prev) => ({ ...prev, vault: remainingVault }));
      setJustClaimedWidget(true);
      setTimeout(() => setJustClaimedWidget(false), 2000);
    } catch {}
  };

  const upcomingEvents = events.slice(0, 3);
  const topStudents = leaderboard.slice(0, 3);

  // User rank in leaderboard
  const userRankPosition = currentUser
    ? leaderboard.findIndex(
        (item) => item.id === currentUser.id || item.username.toLowerCase() === currentUser.username.toLowerCase()
      )
    : -1;

  return (
    <div className="w-full space-y-3 overscroll-contain">
      {/* Widget 1: Aula en Vivo */}
      <Card className="rounded-xl border-border/70 p-3.5 space-y-2.5 bg-surface">
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
            <h3 className="text-xs font-semibold text-foreground tracking-tight">
              Horario en directo
            </h3>
          </div>
          <span className="text-[11px] font-mono text-foreground-subtle">Aula 204</span>
        </div>

        <div className="p-2.5 rounded-lg bg-surface-raised border border-border/60 space-y-1">
          <div className="text-xs font-medium text-foreground">
            {liveStatus.currentSubject?.name ||
              (liveStatus.status === 'recreo' ? 'Recreo' : 'Fuera de horario')}
          </div>
          <div className="text-[11px] text-foreground-muted flex items-center gap-1.5 font-mono">
            <Clock className="w-3 h-3 text-accent shrink-0" />
            <span className="truncate">{liveStatus.message}</span>
          </div>
        </div>

        <Button
          variant="secondary"
          size="sm"
          className="w-full justify-between rounded-lg h-8 text-xs font-medium"
          onClick={() => {
            sound.tap();
            onOpenSchedule();
          }}
        >
          <span className="flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5" />
            <span>Ver horario de clase</span>
          </span>
          <ChevronRight className="w-3.5 h-3.5 text-foreground-subtle" />
        </Button>
      </Card>

      {/* Widget 2: Clasificación General y Podio */}
      <Card className="rounded-xl border-border/70 p-3.5 space-y-2.5 bg-surface">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <Trophy className="w-3.5 h-3.5 text-amber-500" />
            <h3 className="text-xs font-semibold text-foreground tracking-tight">
              Clasificación SMR
            </h3>
          </div>
          <button
            type="button"
            onClick={() => {
              sound.tap();
              onOpenFaucet();
            }}
            className="text-[11px] text-foreground-muted hover:text-foreground flex items-center gap-1 cursor-pointer transition-colors"
          >
            <Coins className="w-3 h-3 text-amber-500" />
            <span>Fondo diario</span>
          </button>
        </div>

        {topStudents.length > 0 ? (
          <div className="space-y-1.5">
            {topStudents.map((st, i) => {
              const isFirst = i === 0;
              const isSecond = i === 1;
              const isUser = currentUser && st.id === currentUser.id;

              return (
                <div
                  key={st.id}
                  className={`flex items-center justify-between p-2 rounded-lg border text-xs transition-colors ${
                    isUser
                      ? 'bg-surface-raised border-accent/50'
                      : 'bg-surface-raised border-border/50'
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <div
                      className={`w-5 h-5 rounded-md flex items-center justify-center font-mono font-bold text-[10px] shrink-0 ${
                        isFirst
                          ? 'bg-amber-500/15 text-amber-500 border border-amber-500/30'
                          : isSecond
                          ? 'bg-slate-300/15 text-slate-300 border border-slate-300/30'
                          : 'bg-amber-700/15 text-amber-600 border border-amber-700/30'
                      }`}
                    >
                      {i + 1}
                    </div>
                    <div className="min-w-0">
                      <span className="font-mono text-foreground font-medium truncate block">
                        @{st.username}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 font-mono font-semibold text-xs text-foreground shrink-0 pl-2">
                    <Coins className="w-3 h-3 text-amber-500/80" />
                    <span>{st.coins.toLocaleString('es-ES')}</span>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-xs text-foreground-subtle text-center py-2">
            Sin datos de clasificación
          </p>
        )}

        {/* Current user rank indicator */}
        {currentUser && userRankPosition !== -1 && (
          <div className="flex items-center justify-between p-2 rounded-lg bg-surface-raised/70 border border-border/50 text-[11px]">
            <span className="text-foreground-muted">Tu posición:</span>
            <span className="font-mono font-semibold text-accent">
              #{userRankPosition + 1} de {leaderboard.length}
            </span>
          </div>
        )}

        <Button
          variant="secondary"
          size="sm"
          className="w-full justify-between rounded-lg h-8 text-xs font-medium"
          onClick={() => {
            sound.tap();
            onOpenLeaderboard();
          }}
        >
          <span>Abrir ranking completo</span>
          <ChevronRight className="w-3.5 h-3.5 text-foreground-subtle" />
        </Button>
      </Card>

      {/* Widget 3: El Botellón (Farmeo) */}
      <Card className="rounded-xl border-border/70 p-3.5 space-y-2.5 bg-surface">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span
              className={`w-2 h-2 rounded-full ${
                botellonState.rate > 0 ? 'bg-emerald-400 animate-pulse' : 'bg-foreground-subtle'
              }`}
            />
            <h3 className="text-xs font-semibold text-foreground tracking-tight flex items-center gap-1.5">
              <Wine className="w-3.5 h-3.5 text-accent" />
              <span>El Botellón</span>
            </h3>
          </div>
          <span className="text-[11px] font-mono text-emerald-400 font-semibold">
            +{botellonState.rate.toFixed(1)}/s
          </span>
        </div>

        <div className="p-2.5 rounded-lg bg-surface-raised border border-border/60 flex items-center justify-between gap-2">
          <div>
            <div className="text-[10px] text-foreground-subtle font-mono">
              En la saca ({Math.floor(botellonState.vault / 5).toLocaleString()} 🪙)
            </div>
            <div className="text-sm font-semibold font-mono text-foreground">
              +{botellonState.vault.toLocaleString()}{' '}
              <span className="text-[10px] font-sans font-normal text-foreground-muted">fichas</span>
            </div>
          </div>

          <button
            type="button"
            disabled={botellonState.vault < 5}
            onClick={handleClaimFromWidget}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer active:scale-95 ${
              botellonState.vault >= 5
                ? 'bg-foreground text-background shadow-xs hover:opacity-90'
                : 'bg-surface text-foreground-subtle border border-border/50 cursor-not-allowed opacity-40'
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
                <span>Cobrar (+{Math.floor(botellonState.vault / 5).toLocaleString()} 🪙)</span>
              </>
            )}
          </button>
        </div>

        <div className="space-y-1.5">
          {onOpenPartyIdle && (
            <Button
              variant="secondary"
              size="sm"
              className="w-full justify-between rounded-lg h-8 text-xs font-medium"
              onClick={() => {
                sound.tap();
                onOpenPartyIdle();
              }}
            >
              <span className="flex items-center gap-1.5">
                <Wine className="w-3.5 h-3.5 text-accent" />
                <span>Ir al Botellón</span>
              </span>
              <ChevronRight className="w-3.5 h-3.5 text-foreground-subtle" />
            </Button>
          )}

          {onOpenFarmhand && (
            <Button
              variant="secondary"
              size="sm"
              className="w-full justify-between rounded-lg h-8 text-xs font-medium"
              onClick={() => {
                sound.tap();
                onOpenFarmhand();
              }}
            >
              <span className="flex items-center gap-1.5">
                <Sprout className="w-3.5 h-3.5 text-emerald-400" />
                <span>El Huerto SMR</span>
              </span>
              <ChevronRight className="w-3.5 h-3.5 text-foreground-subtle" />
            </Button>
          )}
        </div>
      </Card>

      {/* Widget 4: Próximas Entregas */}
      <Card className="rounded-xl border-border/70 p-3.5 space-y-2.5 bg-surface">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <AlertCircle className="w-3.5 h-3.5 text-accent" />
            <h3 className="text-xs font-semibold text-foreground tracking-tight">
              Próximas entregas
            </h3>
          </div>
          <Badge variant="default" size="sm">
            {events.length}
          </Badge>
        </div>

        {upcomingEvents.length > 0 ? (
          <div className="space-y-1.5">
            {upcomingEvents.map((ev) => (
              <div
                key={ev.id}
                onClick={() => {
                  sound.tap();
                  onOpenSchedule();
                }}
                className="p-2 rounded-lg bg-surface-raised border border-border/50 hover:border-border transition-colors cursor-pointer space-y-0.5"
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
          className="w-full justify-between rounded-lg h-8 text-xs font-medium"
          onClick={() => {
            sound.tap();
            onOpenSchedule();
          }}
        >
          <span>Abrir agenda</span>
          <ChevronRight className="w-3.5 h-3.5 text-foreground-subtle" />
        </Button>
      </Card>
    </div>
  );
};
