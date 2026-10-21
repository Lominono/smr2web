'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import {
  X,
  Calendar,
  Zap,
  TrendingUp,
  Server,
  Target,
  CircleDot,
  Trophy,
  Coins,
  Settings,
  ShieldCheck,
  Volume2,
  VolumeX,
  LogOut,
  MessageSquare,
  FileText,
  ChevronRight,
} from 'lucide-react';
import { UserProfile } from '@/lib/types';
import { getUserRank } from '@/lib/economy';
import { getCurrentScheduleStatus } from '@/lib/scheduleData';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';

interface NavigationDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: UserProfile | null;
  activeView: string;
  onSelectView: (view: string) => void;
  onOpenLeaderboard: () => void;
  onOpenFaucet: () => void;
  onOpenSettings: () => void;
  onOpenTerms: () => void;
  onOpenTasks?: () => void;
  soundEnabled: boolean;
  onToggleSound: () => void;
  onSignOut: () => void;
}

export const NavigationDrawer: React.FC<NavigationDrawerProps> = ({
  isOpen,
  onClose,
  currentUser,
  activeView,
  onSelectView,
  onOpenLeaderboard,
  onOpenFaucet,
  onOpenSettings,
  onOpenTerms,
  soundEnabled,
  onToggleSound,
  onSignOut,
}) => {
  const [liveStatus, setLiveStatus] = useState(() => getCurrentScheduleStatus());

  useEffect(() => {
    if (!isOpen) return;
    const update = () => setLiveStatus(getCurrentScheduleStatus());
    update();
    const interval = setInterval(update, 20000);
    return () => clearInterval(interval);
  }, [isOpen]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const rank = currentUser ? getUserRank(currentUser.coins) : null;

  const handleNavigate = (view: string) => {
    onSelectView(view);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex">
      {/* Backdrop */}
      <div
        onClick={onClose}
        className="fixed inset-0 bg-black/70 transition-opacity animate-in fade-in duration-150"
      />

      {/* Drawer Surface */}
      <div className="relative w-full max-w-xs sm:max-w-sm bg-surface border-r border-border h-[100dvh] flex flex-col shadow-xl z-10 overflow-y-auto scrollbar-none animate-in slide-in-from-left duration-150">
        {/* Header */}
        <div className="sticky top-0 z-20 px-4 py-3 bg-surface border-b border-border flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Image
              src="/logo.png"
              alt="SMR2 Logo"
              width={24}
              height={24}
              className="w-6 h-6 object-contain"
            />
            <span className="text-xs font-semibold text-foreground font-mono">
              2º SMR · Menú
            </span>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar menú"
            className="p-1 rounded-[var(--radius-sm)] text-foreground-muted hover:text-foreground hover:bg-surface-raised cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* User Card */}
        {currentUser && (
          <div className="p-3 mx-3 mt-3 rounded-[var(--radius)] bg-surface-raised border border-border space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-8 h-8 rounded-[var(--radius-sm)] bg-surface border border-border flex items-center justify-center font-mono font-bold text-xs uppercase shrink-0 text-foreground">
                  {currentUser.username.charAt(0)}
                </div>
                <div className="flex flex-col min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-semibold text-foreground font-mono truncate">
                      @{currentUser.username}
                    </span>
                    {(currentUser.role === 'admin' || currentUser.role === 'delegado') && (
                      <Badge variant="accent" size="sm">
                        Delegado
                      </Badge>
                    )}
                  </div>
                  {rank && (
                    <span className="text-[10px] text-foreground-subtle font-mono">
                      Rango {rank.name}
                    </span>
                  )}
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  onOpenSettings();
                  onClose();
                }}
                title="Ajustes de perfil"
                className="p-1 rounded-[var(--radius-sm)] text-foreground-muted hover:text-foreground hover:bg-surface cursor-pointer"
              >
                <Settings className="w-4 h-4" />
              </button>
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-border-subtle text-xs font-mono">
              <div className="flex items-center gap-1.5 text-accent">
                <Coins className="w-3.5 h-3.5" />
                <span className="font-medium">{currentUser.coins.toLocaleString('es-ES')}</span>
              </div>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => {
                  onOpenFaucet();
                  onClose();
                }}
              >
                + Reclamar
              </Button>
            </div>
          </div>
        )}

        {/* Navigation Sections */}
        <div className="flex-1 px-3 py-3 space-y-4">
          {/* Main Feed */}
          <div>
            <button
              type="button"
              onClick={() => handleNavigate('feed')}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-[var(--radius)] text-xs font-medium transition-colors cursor-pointer border ${
                activeView === 'feed'
                  ? 'bg-surface-raised text-foreground font-semibold border-border'
                  : 'bg-transparent text-foreground-muted border-transparent hover:text-foreground hover:bg-surface-raised'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <MessageSquare className="w-4 h-4 text-accent" />
                <span>Feed de clase</span>
              </div>
              <ChevronRight className="w-3.5 h-3.5 text-foreground-subtle" />
            </button>
          </div>

          {/* Horario y Tareas */}
          <div className="space-y-1">
            <span className="px-2 text-[10px] font-mono uppercase tracking-wider text-foreground-subtle">
              Académico
            </span>
            <button
              type="button"
              onClick={() => handleNavigate('calendar')}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-[var(--radius)] text-xs font-medium transition-colors cursor-pointer border ${
                activeView === 'calendar'
                  ? 'bg-surface-raised text-foreground font-semibold border-border'
                  : 'bg-transparent text-foreground-muted border-transparent hover:text-foreground hover:bg-surface-raised'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Calendar className="w-4 h-4" />
                <span>Horario y tareas</span>
              </div>
              <ChevronRight className="w-3.5 h-3.5 text-foreground-subtle" />
            </button>
          </div>

          {/* Recreo & Juegos */}
          <div className="space-y-1">
            <span className="px-2 text-[10px] font-mono uppercase tracking-wider text-foreground-subtle">
              Minijuegos
            </span>
            {[
              { id: 'russian_roulette', label: 'Ruleta Rusa (Multijugador)', icon: Zap },
              { id: 'crash', label: 'Crash multiplicador', icon: TrendingUp },
              { id: 'mines', label: 'Minas', icon: Server },
              { id: 'angry', label: 'Slingshot Cable', icon: Target },
              { id: 'roulette', label: 'Ruleta clásica', icon: CircleDot },
            ].map((g) => {
              const Icon = g.icon;
              const isActive = activeView === g.id;
              return (
                <button
                  key={g.id}
                  type="button"
                  onClick={() => handleNavigate(g.id)}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-[var(--radius)] text-xs font-medium transition-colors cursor-pointer border ${
                    isActive
                      ? 'bg-surface-raised text-foreground font-semibold border-border'
                      : 'bg-transparent text-foreground-muted border-transparent hover:text-foreground hover:bg-surface-raised'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <Icon className="w-4 h-4 text-foreground-subtle" />
                    <span>{g.label}</span>
                  </div>
                  <ChevronRight className="w-3.5 h-3.5 text-foreground-subtle" />
                </button>
              );
            })}
          </div>

          {/* Comunidad y Recompensas */}
          <div className="space-y-1">
            <span className="px-2 text-[10px] font-mono uppercase tracking-wider text-foreground-subtle">
              Comunidad
            </span>
            <button
              type="button"
              onClick={() => {
                onOpenLeaderboard();
                onClose();
              }}
              className="w-full flex items-center justify-between px-3 py-2 rounded-[var(--radius)] text-xs font-medium text-foreground-muted hover:text-foreground hover:bg-surface-raised transition-colors cursor-pointer"
            >
              <div className="flex items-center gap-2.5">
                <Trophy className="w-4 h-4 text-foreground-subtle" />
                <span>Clasificación</span>
              </div>
              <ChevronRight className="w-3.5 h-3.5 text-foreground-subtle" />
            </button>

            <button
              type="button"
              onClick={() => {
                onOpenFaucet();
                onClose();
              }}
              className="w-full flex items-center justify-between px-3 py-2 rounded-[var(--radius)] text-xs font-medium text-foreground-muted hover:text-foreground hover:bg-surface-raised transition-colors cursor-pointer"
            >
              <div className="flex items-center gap-2.5">
                <Coins className="w-4 h-4 text-foreground-subtle" />
                <span>Fondo diario</span>
              </div>
              <ChevronRight className="w-3.5 h-3.5 text-foreground-subtle" />
            </button>
          </div>

          {/* Configuración */}
          <div className="space-y-1">
            <span className="px-2 text-[10px] font-mono uppercase tracking-wider text-foreground-subtle">
              Ajustes
            </span>
            <button
              type="button"
              onClick={onToggleSound}
              className="w-full flex items-center justify-between px-3 py-2 rounded-[var(--radius)] text-xs font-medium text-foreground-muted hover:text-foreground hover:bg-surface-raised transition-colors cursor-pointer"
            >
              <div className="flex items-center gap-2.5">
                {soundEnabled ? (
                  <Volume2 className="w-4 h-4 text-foreground" />
                ) : (
                  <VolumeX className="w-4 h-4 text-foreground-subtle" />
                )}
                <span>Efectos de sonido</span>
              </div>
              <Badge variant={soundEnabled ? 'success' : 'default'} size="sm">
                {soundEnabled ? 'On' : 'Off'}
              </Badge>
            </button>

            <button
              type="button"
              onClick={() => {
                onOpenSettings();
                onClose();
              }}
              className="w-full flex items-center justify-between px-3 py-2 rounded-[var(--radius)] text-xs font-medium text-foreground-muted hover:text-foreground hover:bg-surface-raised transition-colors cursor-pointer"
            >
              <div className="flex items-center gap-2.5">
                <Settings className="w-4 h-4 text-foreground-subtle" />
                <span>Ajustes de perfil</span>
              </div>
              <ChevronRight className="w-3.5 h-3.5 text-foreground-subtle" />
            </button>

            {currentUser && (currentUser.role === 'admin' || currentUser.role === 'delegado') && (
              <Link
                href="/admin"
                onClick={onClose}
                className="w-full flex items-center justify-between px-3 py-2 rounded-[var(--radius)] text-xs font-medium text-accent hover:bg-accent-subtle transition-colors"
              >
                <div className="flex items-center gap-2.5">
                  <ShieldCheck className="w-4 h-4" />
                  <span>Panel de administración</span>
                </div>
                <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            )}

            <button
              type="button"
              onClick={() => {
                onOpenTerms();
                onClose();
              }}
              className="w-full flex items-center justify-between px-3 py-2 rounded-[var(--radius)] text-xs font-medium text-foreground-muted hover:text-foreground hover:bg-surface-raised transition-colors cursor-pointer"
            >
              <div className="flex items-center gap-2.5">
                <FileText className="w-4 h-4 text-foreground-subtle" />
                <span>Normas y privacidad</span>
              </div>
              <ChevronRight className="w-3.5 h-3.5 text-foreground-subtle" />
            </button>
          </div>
        </div>

        {/* Footer */}
        {currentUser && (
          <div className="p-3 border-t border-border mt-auto">
            <Button
              variant="danger"
              size="md"
              className="w-full justify-center"
              onClick={() => {
                onSignOut();
                onClose();
              }}
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Cerrar sesión</span>
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};
