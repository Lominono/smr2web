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
  Wine,
  Sprout,
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
  Users,
  ListTodo,
  BellRing,
  AlertCircle,
  Sparkles,
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
  onOpenNotifications?: () => void;
  onOpenFeedback?: () => void;
  soundEnabled: boolean;
  onToggleSound: () => void;
  onSignOut: () => void;
  onlineCount?: number;
  onOpenOnlineUsers?: () => void;
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
  onOpenNotifications,
  onOpenFeedback,
  soundEnabled,
  onToggleSound,
  onSignOut,
  onlineCount,
  onOpenOnlineUsers,
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
        className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity animate-in fade-in duration-200"
      />

      {/* Drawer Surface */}
      <div className="relative w-full max-w-xs sm:max-w-sm bg-surface border-r border-border h-[100dvh] flex flex-col shadow-2xl z-10 overflow-y-auto scrollbar-none animate-in slide-in-from-left duration-250 pt-[env(safe-area-inset-top,0px)] pb-[env(safe-area-inset-bottom,0px)]">
        {/* Header */}
        <div className="sticky top-0 z-20 px-4 py-3 bg-surface/90 backdrop-blur-xl border-b border-border/70 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 flex items-center justify-center shrink-0">
              <Image
                src="/logo.png"
                alt="2º SMR"
                width={32}
                height={32}
                className="w-full h-full object-contain drop-shadow-xs"
              />
            </div>
            <div className="flex flex-col">
              <span className="text-xs font-semibold text-foreground tracking-tight leading-tight">
                2º SMR · Menú
              </span>
              <span className="text-[10px] text-foreground-subtle leading-tight truncate max-w-[170px]">
                {liveStatus.message}
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar menú"
            className="w-9 h-9 rounded-lg text-foreground-muted hover:text-foreground hover:bg-surface-raised flex items-center justify-center transition-all cursor-pointer active:scale-95 touch-manipulation"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* User Card */}
        {currentUser && (
          <div className="p-3.5 mx-3 mt-3 rounded-[var(--radius)] bg-surface-raised border border-border space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-[var(--radius-sm)] bg-surface border border-border flex items-center justify-center font-mono font-bold text-sm uppercase shrink-0 text-foreground">
                  {currentUser.username.charAt(0)}
                </div>
                <div className="flex flex-col min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-sm font-semibold text-foreground font-mono truncate">
                      @{currentUser.username}
                    </span>
                    {(currentUser.role === 'admin' || currentUser.role === 'delegado') && (
                      <Badge variant="accent" size="sm">
                        Delegado
                      </Badge>
                    )}
                  </div>
                  {rank && (
                    <span className="text-xs text-foreground-subtle font-mono">
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
                aria-label="Ajustes de perfil"
                className="w-10 h-10 rounded-[var(--radius-sm)] text-foreground-muted hover:text-foreground hover:bg-surface flex items-center justify-center cursor-pointer active:scale-95 touch-manipulation"
              >
                <Settings className="w-4 h-4" />
              </button>
            </div>

            <div className="flex items-center justify-between pt-2.5 border-t border-border-subtle text-xs font-mono">
              <div className="flex items-center gap-1.5 text-amber-500">
                <Coins className="w-4 h-4" />
                <span className="font-semibold">{currentUser.coins.toLocaleString('es-ES')} fichas</span>
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
              className={`w-full min-h-[44px] flex items-center justify-between px-3 py-2.5 rounded-[var(--radius)] text-xs font-medium transition-all cursor-pointer border active:scale-[0.98] touch-manipulation ${
                activeView === 'feed'
                  ? 'bg-surface-raised text-foreground font-semibold border-border shadow-xs'
                  : 'bg-transparent text-foreground-muted border-transparent hover:text-foreground hover:bg-surface-raised'
              }`}
            >
              <div className="flex items-center gap-3">
                <MessageSquare className="w-4 h-4 text-accent" />
                <span className="text-sm font-sans">Feed de clase</span>
              </div>
              <ChevronRight className="w-4 h-4 text-foreground-subtle" />
            </button>
          </div>

          {/* Horario y Tareas */}
          <div className="space-y-1">
            <span className="px-2 text-xs font-medium text-foreground-subtle">
              Académico
            </span>
            <button
              type="button"
              onClick={() => handleNavigate('calendar')}
              className={`w-full min-h-[44px] flex items-center justify-between px-3 py-2.5 rounded-[var(--radius)] text-xs font-medium transition-all cursor-pointer border active:scale-[0.98] touch-manipulation ${
                activeView === 'calendar'
                  ? 'bg-surface-raised text-foreground font-semibold border-border shadow-xs'
                  : 'bg-transparent text-foreground-muted border-transparent hover:text-foreground hover:bg-surface-raised'
              }`}
            >
              <div className="flex items-center gap-3">
                <Calendar className="w-4 h-4 text-accent" />
                <span className="text-sm font-sans">Horario y tareas</span>
              </div>
              <ChevronRight className="w-4 h-4 text-foreground-subtle" />
            </button>
          </div>

          {/* Recreo & Juegos */}
          <div className="space-y-1">
            <span className="px-2 text-xs font-medium text-foreground-subtle">
              Recreo
            </span>
            {[
              { id: 'farmhand', label: 'El Huerto', icon: Sprout },
              { id: 'party_idle', label: 'El Botellón', icon: Wine },
              { id: 'russian_roulette', label: 'Ruleta Rusa', icon: Zap },
              { id: 'crash', label: 'Crash', icon: TrendingUp },
              { id: 'mines', label: 'Minas', icon: Server },
              { id: 'roulette', label: 'Ruleta', icon: CircleDot },
            ].map((g) => {
              const Icon = g.icon;
              const isActive = activeView === g.id;
              return (
                <button
                  key={g.id}
                  type="button"
                  onClick={() => handleNavigate(g.id)}
                  className={`w-full min-h-[44px] flex items-center justify-between px-3 py-2.5 rounded-[var(--radius)] text-xs font-medium transition-all cursor-pointer border active:scale-[0.98] touch-manipulation ${
                    isActive
                      ? 'bg-surface-raised text-foreground font-semibold border-border shadow-xs'
                      : 'bg-transparent text-foreground-muted border-transparent hover:text-foreground hover:bg-surface-raised'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Icon className="w-4 h-4 text-foreground-subtle" />
                    <span className="text-sm font-sans">{g.label}</span>
                  </div>
                  <ChevronRight className="w-4 h-4 text-foreground-subtle" />
                </button>
              );
            })}
          </div>

          {/* Comunidad y Recompensas */}
          <div className="space-y-1">
            <span className="px-2 text-[10px] font-mono uppercase tracking-wider text-foreground-subtle">
              Comunidad
            </span>
            {onOpenOnlineUsers && (
              <button
                type="button"
                onClick={() => {
                  onOpenOnlineUsers();
                  onClose();
                }}
                className="w-full min-h-[44px] flex items-center justify-between px-3 py-2.5 rounded-[var(--radius)] text-xs font-medium text-emerald-400 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20 transition-all cursor-pointer active:scale-[0.98] touch-manipulation"
              >
                <div className="flex items-center gap-3">
                  <Users className="w-4 h-4 text-emerald-400" />
                  <span className="text-sm font-sans font-semibold">Alumnos en directo</span>
                </div>
                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300">
                  {onlineCount ?? 0}
                </span>
              </button>
            )}

            {onOpenFeedback && (
              <button
                type="button"
                onClick={() => {
                  onOpenFeedback();
                  onClose();
                }}
                className="w-full min-h-[44px] flex items-center justify-between px-3 py-2.5 rounded-[var(--radius)] text-xs font-medium text-foreground-muted hover:text-foreground hover:bg-surface-raised transition-all cursor-pointer active:scale-[0.98] touch-manipulation"
              >
                <div className="flex items-center gap-3">
                  <AlertCircle className="w-4 h-4 text-foreground-subtle" />
                  <span className="text-sm font-sans">Incidencias</span>
                </div>
                <ChevronRight className="w-4 h-4 text-foreground-subtle" />
              </button>
            )}

            <button
              type="button"
              onClick={() => {
                onOpenLeaderboard();
                onClose();
              }}
              className="w-full min-h-[44px] flex items-center justify-between px-3 py-2.5 rounded-[var(--radius)] text-xs font-medium text-foreground-muted hover:text-foreground hover:bg-surface-raised transition-all cursor-pointer active:scale-[0.98] touch-manipulation"
            >
              <div className="flex items-center gap-3">
                <Trophy className="w-4 h-4 text-amber-500" />
                <span className="text-sm font-sans">Clasificación</span>
              </div>
              <ChevronRight className="w-4 h-4 text-foreground-subtle" />
            </button>

            <button
              type="button"
              onClick={() => {
                onOpenFaucet();
                onClose();
              }}
              className="w-full min-h-[44px] flex items-center justify-between px-3 py-2.5 rounded-[var(--radius)] text-xs font-medium text-foreground-muted hover:text-foreground hover:bg-surface-raised transition-all cursor-pointer active:scale-[0.98] touch-manipulation"
            >
              <div className="flex items-center gap-3">
                <Coins className="w-4 h-4 text-amber-500" />
                <span className="text-sm font-sans">Fondo diario</span>
              </div>
              <ChevronRight className="w-4 h-4 text-foreground-subtle" />
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
              className="w-full min-h-[44px] flex items-center justify-between px-3 py-2.5 rounded-[var(--radius)] text-xs font-medium text-foreground-muted hover:text-foreground hover:bg-surface-raised transition-all cursor-pointer active:scale-[0.98] touch-manipulation"
            >
              <div className="flex items-center gap-3">
                {soundEnabled ? (
                  <Volume2 className="w-4 h-4 text-foreground" />
                ) : (
                  <VolumeX className="w-4 h-4 text-foreground-subtle" />
                )}
                <span className="text-sm font-sans">Efectos de sonido</span>
              </div>
              <Badge variant={soundEnabled ? 'success' : 'default'} size="sm">
                {soundEnabled ? 'On' : 'Off'}
              </Badge>
            </button>

            {onOpenNotifications && (
              <button
                type="button"
                onClick={() => {
                  onOpenNotifications();
                  onClose();
                }}
                className="w-full min-h-[44px] flex items-center justify-between px-3 py-2.5 rounded-[var(--radius)] text-xs font-medium text-foreground-muted hover:text-foreground hover:bg-surface-raised transition-all cursor-pointer active:scale-[0.98] touch-manipulation"
              >
                <div className="flex items-center gap-3">
                  <BellRing className="w-4 h-4 text-accent" />
                  <span className="text-sm font-sans">Avisos fuera de la web</span>
                </div>
                <ChevronRight className="w-4 h-4 text-foreground-subtle" />
              </button>
            )}

            {currentUser && (
              <button
                type="button"
                onClick={() => {
                  onOpenSettings();
                  onClose();
                }}
                className="w-full min-h-[44px] flex items-center justify-between px-3 py-2.5 rounded-[var(--radius)] text-xs font-medium text-foreground-muted hover:text-foreground hover:bg-surface-raised transition-all cursor-pointer active:scale-[0.98] touch-manipulation"
              >
                <div className="flex items-center gap-3">
                  <ListTodo className="w-4 h-4 text-accent" />
                  <span className="text-sm font-sans">Mi Agenda Personal</span>
                </div>
                <ChevronRight className="w-4 h-4 text-foreground-subtle" />
              </button>
            )}

            <button
              type="button"
              onClick={() => {
                onOpenSettings();
                onClose();
              }}
              className="w-full min-h-[44px] flex items-center justify-between px-3 py-2.5 rounded-[var(--radius)] text-xs font-medium text-foreground-muted hover:text-foreground hover:bg-surface-raised transition-all cursor-pointer active:scale-[0.98] touch-manipulation"
            >
              <div className="flex items-center gap-3">
                <Settings className="w-4 h-4 text-foreground-subtle" />
                <span className="text-sm font-sans">Ajustes de perfil</span>
              </div>
              <ChevronRight className="w-4 h-4 text-foreground-subtle" />
            </button>

            <Link
              href="/admin"
              onClick={onClose}
              className="w-full min-h-[44px] flex items-center justify-between px-3 py-2.5 rounded-[var(--radius)] text-xs font-medium text-foreground-muted hover:text-foreground hover:bg-surface-raised transition-all active:scale-[0.98] touch-manipulation"
            >
              <div className="flex items-center gap-3">
                <ShieldCheck className="w-4 h-4 text-accent" />
                <span className="text-sm font-sans">Panel de administración</span>
              </div>
              <ChevronRight className="w-4 h-4 text-foreground-subtle" />
            </Link>

            <button
              type="button"
              onClick={() => {
                onClose();
                window.dispatchEvent(new CustomEvent('smr2_open_changelog'));
              }}
              className="w-full min-h-[44px] flex items-center justify-between px-3 py-2.5 rounded-[var(--radius)] text-xs font-medium text-foreground-muted hover:text-foreground hover:bg-surface-raised transition-all cursor-pointer active:scale-[0.98] touch-manipulation"
            >
              <div className="flex items-center gap-3">
                <Sparkles className="w-4 h-4 text-emerald-500" />
                <span className="text-sm font-sans">Novedades y versiones</span>
              </div>
              <span className="text-[11px] font-mono text-foreground-subtle">v2.6.0</span>
            </button>

            <button
              type="button"
              onClick={() => {
                onOpenTerms();
                onClose();
              }}
              className="w-full min-h-[44px] flex items-center justify-between px-3 py-2.5 rounded-[var(--radius)] text-xs font-medium text-foreground-muted hover:text-foreground hover:bg-surface-raised transition-all cursor-pointer active:scale-[0.98] touch-manipulation"
            >
              <div className="flex items-center gap-3">
                <FileText className="w-4 h-4 text-foreground-subtle" />
                <span className="text-sm font-sans">Normas y privacidad</span>
              </div>
              <ChevronRight className="w-4 h-4 text-foreground-subtle" />
            </button>
          </div>
        </div>

        {/* Footer */}
        {currentUser && (
          <div className="p-3.5 border-t border-border mt-auto">
            <Button
              variant="danger"
              size="lg"
              className="w-full justify-center"
              onClick={() => {
                onSignOut();
                onClose();
              }}
            >
              <LogOut className="w-4 h-4" />
              <span>Cerrar sesión</span>
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};
