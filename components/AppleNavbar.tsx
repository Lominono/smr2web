'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import {
  Menu,
  Volume2,
  VolumeX,
  Coins,
  Plus,
  Trophy,
  LogIn,
  LogOut,
  ShieldCheck,
  Settings,
  Wine,
} from 'lucide-react';
import { UserProfile } from '@/lib/types';
import { getCurrentScheduleStatus } from '@/lib/scheduleData';
import { Button } from '@/components/ui/Button';

interface AppleNavbarProps {
  user: UserProfile | null;
  onOpenAuth: () => void;
  onSignOut: () => void;
  onOpenFaucet: () => void;
  onOpenLeaderboard: () => void;
  onOpenSchedule: () => void;
  isScheduleActive: boolean;
  soundEnabled: boolean;
  onToggleSound: () => void;
  onOpenSettings?: () => void;
  onOpenDrawer: () => void;
  activeTab?: string;
  onSelectTab?: (tab: string) => void;
  onlineCount?: number;
  onOpenOnlineUsers?: () => void;
}

export const AppleNavbar: React.FC<AppleNavbarProps> = ({
  user,
  onOpenAuth,
  onSignOut,
  onOpenFaucet,
  onOpenLeaderboard,
  soundEnabled,
  onToggleSound,
  onOpenSettings,
  onOpenDrawer,
  activeTab = 'feed',
  onSelectTab,
  onlineCount,
  onOpenOnlineUsers,
}) => {
  const [liveStatus, setLiveStatus] = useState(() => getCurrentScheduleStatus());

  useEffect(() => {
    const update = () => setLiveStatus(getCurrentScheduleStatus());
    update();
    const interval = setInterval(update, 20000);
    return () => clearInterval(interval);
  }, []);

  return (
    <header className="sticky top-0 z-40 border-b border-border/70 bg-surface/85 backdrop-blur-xl pt-[env(safe-area-inset-top,0px)] transition-colors">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 h-14 flex items-center justify-between gap-2 sm:gap-4">
        {/* Left: Menu Hamburger & Brand */}
        <div className="flex items-center gap-2.5 sm:gap-3">
          <button
            type="button"
            onClick={onOpenDrawer}
            title="Menú de navegación"
            aria-label="Abrir menú"
            className="w-9 h-9 sm:w-8 sm:h-8 rounded-lg bg-surface-raised hover:bg-surface-hover border border-border/70 text-foreground-muted hover:text-foreground flex items-center justify-center transition-all cursor-pointer active:scale-95 touch-manipulation"
          >
            <Menu className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={() => onSelectTab && onSelectTab('feed')}
            className="flex items-center gap-2.5 cursor-pointer text-left select-none touch-manipulation active:opacity-80 group"
          >
            <div className="w-8 h-8 flex items-center justify-center shrink-0 transition-transform group-hover:scale-105">
              <Image
                src="/logo.png"
                alt="2º SMR"
                width={32}
                height={32}
                className="w-full h-full object-contain drop-shadow-xs"
                priority
              />
            </div>
            <div className="flex flex-col">
              <span className="text-xs font-semibold text-foreground tracking-tight leading-none">
                2º SMR
              </span>
              <span className="text-[10px] text-foreground-subtle leading-tight hidden xs:inline">
                Portal de clase
              </span>
            </div>
          </button>

          {/* Schedule status pill */}
          <div className="hidden lg:flex items-center gap-1.5 px-3 py-1 rounded-full bg-surface-raised border border-border/70 text-[11px] text-foreground-muted">
            <span
              className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                liveStatus.status === 'in_class'
                  ? 'bg-success'
                  : liveStatus.status === 'recreo'
                  ? 'bg-accent'
                  : 'bg-foreground-subtle'
              }`}
            />
            <span className="font-medium truncate max-w-[220px]">{liveStatus.message}</span>
          </div>

          {/* Real-time online classmates pill */}
          {onlineCount !== undefined && onlineCount > 0 && onOpenOnlineUsers && (
            <button
              type="button"
              onClick={onOpenOnlineUsers}
              title="Ver alumnos conectados"
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-surface-raised hover:bg-surface-hover border border-border/70 text-[11px] text-foreground-muted font-mono transition-all cursor-pointer active:scale-95 touch-manipulation"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              <span className="font-semibold text-foreground">{onlineCount}</span>
              <span className="hidden xs:inline">online</span>
            </button>
          )}
        </div>

        {/* Center: Navigation tabs (Desktop only) - Apple Segmented Control */}
        {onSelectTab && (
          <nav aria-label="Navegación principal" className="hidden md:flex items-center p-1 rounded-full bg-surface-raised border border-border/70 shadow-2xs">
            <button
              type="button"
              onClick={() => onSelectTab('feed')}
              className={`px-3.5 py-1 text-xs font-medium rounded-full transition-all cursor-pointer ${
                activeTab === 'feed'
                  ? 'bg-foreground text-background font-semibold shadow-xs'
                  : 'text-foreground-muted hover:text-foreground'
              }`}
            >
              Feed
            </button>

            <button
              type="button"
              onClick={() => onSelectTab('calendar')}
              className={`px-3.5 py-1 text-xs font-medium rounded-full transition-all cursor-pointer ${
                activeTab === 'calendar'
                  ? 'bg-foreground text-background font-semibold shadow-xs'
                  : 'text-foreground-muted hover:text-foreground'
              }`}
            >
              Horario
            </button>

            <button
              type="button"
              onClick={() => onSelectTab('party_idle')}
              className={`flex items-center gap-1.5 px-3.5 py-1 text-xs font-medium rounded-full transition-all cursor-pointer ${
                activeTab === 'party_idle'
                  ? 'bg-foreground text-background font-semibold shadow-xs'
                  : 'text-foreground-muted hover:text-foreground'
              }`}
            >
              <Wine className="w-3.5 h-3.5 text-accent" />
              <span>El Botellón</span>
            </button>

            <button
              type="button"
              onClick={() => onSelectTab('russian_roulette')}
              className={`px-3.5 py-1 text-xs font-medium rounded-full transition-all cursor-pointer ${
                activeTab === 'russian_roulette'
                  ? 'bg-foreground text-background font-semibold shadow-xs'
                  : 'text-foreground-muted hover:text-foreground'
              }`}
            >
              Ruleta Rusa
            </button>
          </nav>
        )}

        {/* Right: Sound, Leaderboard, Coins & User Profile */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          {/* Sound Toggle */}
          <button
            type="button"
            onClick={onToggleSound}
            title={soundEnabled ? 'Silenciar sonidos' : 'Activar sonidos'}
            aria-label={soundEnabled ? 'Silenciar sonidos' : 'Activar sonidos'}
            className="w-9 h-9 sm:w-8 sm:h-8 rounded-lg bg-surface-raised border border-border/70 text-foreground-muted hover:text-foreground flex items-center justify-center transition-all cursor-pointer active:scale-95 touch-manipulation"
          >
            {soundEnabled ? (
              <Volume2 className="w-4 h-4 sm:w-3.5 sm:h-3.5 text-foreground" />
            ) : (
              <VolumeX className="w-4 h-4 sm:w-3.5 sm:h-3.5 text-foreground-subtle" />
            )}
          </button>

          {/* Ranking Button (Tablet / Desktop) */}
          <button
            type="button"
            onClick={onOpenLeaderboard}
            title="Clasificación"
            className="hidden sm:flex items-center gap-1.5 px-3 h-8 rounded-lg bg-surface-raised border border-border/70 text-xs text-foreground-muted hover:text-foreground transition-all cursor-pointer active:scale-95"
          >
            <Trophy className="w-3.5 h-3.5 text-amber-500" />
            <span className="font-medium">Top</span>
          </button>

          {/* User Status / Coins */}
          {user ? (
            <div className="flex items-center gap-1.5 sm:gap-2 pl-1.5 sm:pl-2 border-l border-border/70">
              {/* Coin Pill */}
              <button
                type="button"
                onClick={onOpenFaucet}
                title="Reclamar fichas diarias"
                className="flex items-center gap-1.5 bg-surface-raised hover:bg-surface-hover border border-border/70 rounded-full px-2.5 h-9 sm:h-8 transition-all cursor-pointer active:scale-95 touch-manipulation select-none"
              >
                <Coins className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                <span className="text-xs font-mono font-medium text-foreground tabular-nums">
                  {user.coins.toLocaleString('es-ES')}
                </span>
                <span className="w-4 h-4 rounded-full bg-accent/15 text-accent flex items-center justify-center text-[10px] ml-0.5">
                  <Plus className="w-3 h-3" />
                </span>
              </button>

              {/* User Settings (Desktop) */}
              {onOpenSettings && (
                <button
                  type="button"
                  onClick={onOpenSettings}
                  title="Ajustes de cuenta"
                  className="hidden sm:flex w-8 h-8 rounded-lg bg-surface-raised hover:bg-surface-hover text-foreground-muted hover:text-foreground border border-border/70 items-center justify-center transition-colors cursor-pointer"
                >
                  <Settings className="w-3.5 h-3.5" />
                </button>
              )}

              {/* Admin Panel Link */}
              {(user.role === 'admin' || user.role === 'delegado') && (
                <Link
                  href="/admin"
                  title="Panel de administración"
                  className="hidden sm:flex w-8 h-8 rounded-lg bg-accent/10 hover:bg-accent/20 text-accent border border-accent/25 items-center justify-center transition-colors cursor-pointer"
                >
                  <ShieldCheck className="w-3.5 h-3.5" />
                </Link>
              )}

              {/* Avatar Initial */}
              <button
                type="button"
                onClick={onOpenSettings}
                title={`@${user.username} - Perfil`}
                aria-label={`Perfil de @${user.username}`}
                className="w-9 h-9 sm:w-8 sm:h-8 rounded-lg bg-surface-raised border border-border/70 flex items-center justify-center font-mono font-medium text-xs text-foreground uppercase cursor-pointer hover:border-foreground/30 active:scale-95 transition-all touch-manipulation"
              >
                {user.username.charAt(0)}
              </button>

              {/* Sign out (Desktop) */}
              <button
                type="button"
                onClick={onSignOut}
                title="Cerrar sesión"
                className="hidden sm:flex w-8 h-8 rounded-lg text-foreground-subtle hover:text-danger hover:bg-danger-subtle items-center justify-center transition-colors cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <Button variant="primary" size="sm" onClick={onOpenAuth}>
              <LogIn className="w-3.5 h-3.5" />
              <span>Entrar</span>
            </Button>
          )}
        </div>
      </div>
    </header>
  );
};
