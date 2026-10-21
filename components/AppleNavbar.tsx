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
} from 'lucide-react';
import { UserProfile } from '@/lib/types';
import { getCurrentScheduleStatus } from '@/lib/scheduleData';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';

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
}) => {
  const [liveStatus, setLiveStatus] = useState(() => getCurrentScheduleStatus());

  useEffect(() => {
    const update = () => setLiveStatus(getCurrentScheduleStatus());
    update();
    const interval = setInterval(update, 20000);
    return () => clearInterval(interval);
  }, []);

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-surface/95 backdrop-blur-xs">
      <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between gap-3">
        {/* Left: Menu Hamburger & Brand */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onOpenDrawer}
            title="Menú de navegación"
            aria-label="Abrir menú"
            className="w-8 h-8 rounded-[var(--radius)] bg-surface-raised hover:bg-surface-hover border border-border text-foreground-muted hover:text-foreground flex items-center justify-center transition-colors cursor-pointer"
          >
            <Menu className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={() => onSelectTab && onSelectTab('feed')}
            className="flex items-center gap-2 cursor-pointer text-left select-none"
          >
            <Image
              src="/logo.png"
              alt="2º SMR"
              width={24}
              height={24}
              className="w-6 h-6 object-contain"
              priority
            />
            <div className="flex flex-col">
              <span className="text-xs font-semibold text-foreground font-mono leading-none">
                2º SMR
              </span>
              <span className="text-[10px] text-foreground-subtle leading-tight">
                Portal de clase
              </span>
            </div>
          </button>

          {/* Schedule status pill */}
          <div className="hidden xl:flex items-center gap-1.5 px-2 py-0.5 rounded-[var(--radius-sm)] bg-surface-raised border border-border text-[11px] text-foreground-muted font-mono">
            <span
              className={`w-1.5 h-1.5 rounded-full ${
                liveStatus.status === 'in_class'
                  ? 'bg-success'
                  : liveStatus.status === 'recreo'
                  ? 'bg-accent'
                  : 'bg-foreground-subtle'
              }`}
            />
            <span>{liveStatus.message}</span>
          </div>
        </div>

        {/* Center: Navigation tabs */}
        {onSelectTab && (
          <nav aria-label="Navegación principal" className="hidden md:flex items-center p-1 rounded-[var(--radius)] bg-surface-raised border border-border">
            <button
              type="button"
              onClick={() => onSelectTab('feed')}
              className={`px-3 py-1 text-xs font-medium rounded-[var(--radius-sm)] transition-colors cursor-pointer ${
                activeTab === 'feed'
                  ? 'bg-foreground text-background font-semibold'
                  : 'text-foreground-muted hover:text-foreground'
              }`}
            >
              Feed
            </button>

            <button
              type="button"
              onClick={() => onSelectTab('calendar')}
              className={`px-3 py-1 text-xs font-medium rounded-[var(--radius-sm)] transition-colors cursor-pointer ${
                activeTab === 'calendar'
                  ? 'bg-foreground text-background font-semibold'
                  : 'text-foreground-muted hover:text-foreground'
              }`}
            >
              Horario
            </button>

            <button
              type="button"
              onClick={() => onSelectTab('russian_roulette')}
              className={`px-3 py-1 text-xs font-medium rounded-[var(--radius-sm)] transition-colors cursor-pointer ${
                activeTab === 'russian_roulette'
                  ? 'bg-foreground text-background font-semibold'
                  : 'text-foreground-muted hover:text-foreground'
              }`}
            >
              Ruleta Rusa
            </button>
          </nav>
        )}

        {/* Right: Sound, Leaderboard, Coins & User Profile */}
        <div className="flex items-center gap-2">
          {/* Sound Toggle */}
          <button
            type="button"
            onClick={onToggleSound}
            title={soundEnabled ? 'Silenciar sonidos' : 'Activar sonidos'}
            className="w-8 h-8 rounded-[var(--radius)] bg-surface-raised border border-border text-foreground-muted hover:text-foreground flex items-center justify-center transition-colors cursor-pointer"
          >
            {soundEnabled ? (
              <Volume2 className="w-3.5 h-3.5 text-foreground" />
            ) : (
              <VolumeX className="w-3.5 h-3.5 text-foreground-subtle" />
            )}
          </button>

          {/* Ranking Button */}
          <button
            type="button"
            onClick={onOpenLeaderboard}
            title="Clasificación"
            className="hidden sm:flex items-center gap-1.5 px-2.5 h-8 rounded-[var(--radius)] bg-surface-raised border border-border text-xs text-foreground-muted hover:text-foreground transition-colors cursor-pointer"
          >
            <Trophy className="w-3.5 h-3.5 text-accent" />
            <span className="font-mono">Top</span>
          </button>

          {/* User Status / Coins */}
          {user ? (
            <div className="flex items-center gap-2 pl-2 border-l border-border">
              {/* Coin Pill */}
              <div className="flex items-center gap-1.5 bg-surface-raised border border-border rounded-[var(--radius)] px-2.5 h-8">
                <Coins className="w-3.5 h-3.5 text-accent shrink-0" />
                <span className="text-xs font-mono font-medium text-foreground tabular-nums">
                  {user.coins.toLocaleString('es-ES')}
                </span>
                <button
                  type="button"
                  onClick={onOpenFaucet}
                  title="Reclamar fondo diario"
                  className="w-4 h-4 rounded-[var(--radius-sm)] bg-accent/20 hover:bg-accent/30 text-accent flex items-center justify-center text-[10px] cursor-pointer"
                >
                  <Plus className="w-2.5 h-2.5" />
                </button>
              </div>

              {/* User Settings */}
              {onOpenSettings && (
                <button
                  type="button"
                  onClick={onOpenSettings}
                  title="Ajustes de cuenta"
                  className="hidden sm:flex w-8 h-8 rounded-[var(--radius)] bg-surface-raised hover:bg-surface-hover text-foreground-muted hover:text-foreground border border-border items-center justify-center transition-colors cursor-pointer"
                >
                  <Settings className="w-3.5 h-3.5" />
                </button>
              )}

              {/* Admin Panel Link */}
              {(user.role === 'admin' || user.role === 'delegado') && (
                <Link
                  href="/admin"
                  title="Panel de administración"
                  className="hidden sm:flex w-8 h-8 rounded-[var(--radius)] bg-accent-subtle hover:bg-accent/20 text-accent border border-accent/20 items-center justify-center transition-colors cursor-pointer"
                >
                  <ShieldCheck className="w-3.5 h-3.5" />
                </Link>
              )}

              {/* Avatar Initial */}
              <button
                type="button"
                onClick={onOpenSettings}
                title={`@${user.username} - Perfil`}
                className="w-8 h-8 rounded-[var(--radius)] bg-surface-raised border border-border flex items-center justify-center font-mono font-semibold text-xs text-foreground uppercase cursor-pointer hover:border-zinc-700 transition-colors"
              >
                {user.username.charAt(0)}
              </button>

              {/* Sign out */}
              <button
                type="button"
                onClick={onSignOut}
                title="Cerrar sesión"
                className="hidden sm:flex w-8 h-8 rounded-[var(--radius)] text-foreground-subtle hover:text-danger hover:bg-danger-subtle items-center justify-center transition-colors cursor-pointer"
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
