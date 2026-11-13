'use client';

import React, { useEffect, useState } from 'react';
import Image from 'next/image';
import {
  X,
  Calendar,
  Zap,
  TrendingUp,
  Server,
  CircleDot,
  Wine,
  Sprout,
  Trophy,
  Coins,
  Settings,
  Volume2,
  VolumeX,
  LogOut,
  MessageSquare,
  FileText,
  Users,
  BellRing,
  AlertCircle,
  IdCard,
  MonitorDown,
  ShoppingBag,
  Sparkles,
  type LucideIcon,
} from 'lucide-react';
import { UserProfile } from '@/lib/types';
import { getUserRank } from '@/lib/economy';
import { getCurrentScheduleStatus } from '@/lib/scheduleData';

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
  onOpenStudentCard?: () => void;
  onOpenInstall?: () => void;
}

interface DrawerGame {
  id: string;
  label: string;
  icon: LucideIcon;
  badge?: string;
}

const DRAWER_GAMES: DrawerGame[] = [
  { id: 'party_idle', label: 'El Botellón', icon: Wine },
  { id: 'russian_roulette', label: 'Ruleta Rusa', icon: Zap },
  { id: 'crash', label: 'Crash', icon: TrendingUp },
  { id: 'mines', label: 'Minas', icon: Server },
  { id: 'roulette', label: 'Ruleta', icon: CircleDot },
  { id: 'farmhand', label: 'El Huerto', icon: Sprout, badge: 'Cerrado' },
];

const rowBase =
  'group flex w-full min-h-[40px] items-center gap-3 rounded-[var(--radius-sm)] px-2.5 py-2 text-left text-[13px] transition-colors cursor-pointer active:scale-[0.99] touch-manipulation';

const rowIdle =
  'text-foreground-muted hover:bg-surface-raised hover:text-foreground';

const rowActive = 'bg-accent-subtle text-accent font-medium';

const metaBase = 'shrink-0 font-mono text-[10px] text-foreground-subtle';

const SectionLabel: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <p className="px-2.5 pb-1.5 text-[10px] font-mono uppercase tracking-[0.14em] text-foreground-subtle">
    {children}
  </p>
);

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
  onOpenStudentCard,
  onOpenNotifications,
  onOpenFeedback,
  soundEnabled,
  onToggleSound,
  onSignOut,
  onlineCount,
  onOpenOnlineUsers,
  onOpenInstall,
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

  const statusText =
    liveStatus.status === 'in_class'
      ? `${liveStatus.currentSubjectCode || 'Clase'} · ${liveStatus.minutesRemaining} min`
      : liveStatus.status === 'recreo'
      ? `Recreo · ${liveStatus.minutesRemaining} min`
      : liveStatus.status === 'before_school'
      ? `Empieza en ${liveStatus.minutesRemaining} min`
      : `Próxima: ${liveStatus.nextSubjectCode || 'SR'} 08:15`;

  return (
    <div className="fixed inset-0 z-50 flex">
      {/* Backdrop */}
      <div
        onClick={onClose}
        className="fixed inset-0 bg-black/45 dark:bg-black/65 animate-in fade-in duration-200"
      />

      {/* Drawer Surface */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Más opciones"
        className="relative z-10 flex h-[100dvh] w-[86vw] max-w-[21rem] flex-col overflow-hidden border-r border-border bg-surface shadow-2xl pt-[env(safe-area-inset-top,0px)] pb-[env(safe-area-inset-bottom,0px)] animate-in slide-in-from-left duration-200"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border/70 px-4 py-3">
          <div className="flex min-w-0 items-center gap-2.5">
            <Image
              src="/logo.png"
              alt="2º SMR"
              width={26}
              height={26}
              className="h-[26px] w-[26px] shrink-0 object-contain"
            />
            <div className="min-w-0">
              <p className="text-[12px] font-semibold leading-tight tracking-tight text-foreground">
                2º SMR
              </p>
              <p className="truncate text-[10px] font-mono leading-tight text-foreground-subtle">
                {statusText}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar menú"
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[var(--radius-sm)] text-foreground-muted transition-colors hover:bg-surface-raised hover:text-foreground active:scale-95 cursor-pointer touch-manipulation"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Profile summary */}
        {currentUser && (
          <div className="border-b border-border/70 px-4 py-3.5">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-border/70 bg-surface-raised font-mono text-xs font-semibold uppercase text-foreground">
                {currentUser.username.charAt(0)}
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <span className="truncate font-mono text-[12.5px] font-semibold text-foreground">
                    @{currentUser.username}
                  </span>
                  {(currentUser.role === 'admin' || currentUser.role === 'delegado') && (
                    <span className="shrink-0 rounded border border-accent/25 bg-accent-subtle px-1 py-px font-mono text-[9px] uppercase tracking-wide text-accent">
                      Delegado
                    </span>
                  )}
                </div>
                <p className="truncate text-[11px] text-foreground-subtle">
                  {rank?.name || 'Estudiante'}
                </p>
              </div>

              <button
                type="button"
                onClick={() => {
                  onOpenSettings();
                  onClose();
                }}
                title="Ajustes de perfil"
                aria-label="Ajustes de perfil"
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[var(--radius-sm)] text-foreground-subtle transition-colors hover:bg-surface-raised hover:text-foreground active:scale-95 cursor-pointer touch-manipulation"
              >
                <Settings className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-2.5 flex items-center justify-between rounded-[var(--radius-sm)] border border-border/60 bg-surface-raised/60 px-2.5 py-1.5">
              <span className="flex items-center gap-1.5 font-mono text-[11px] text-foreground-muted">
                <Coins className="h-3.5 w-3.5 text-foreground-subtle" />
                {currentUser.coins.toLocaleString('es-ES')} monedas
              </span>
              <button
                type="button"
                onClick={() => {
                  onOpenFaucet();
                  onClose();
                }}
                className="text-[11px] font-medium text-accent transition-opacity hover:opacity-75 cursor-pointer"
              >
                Reclamar fondo
              </button>
            </div>
          </div>
        )}

        {/* Navigation */}
        <nav
          aria-label="Menú lateral"
          className="flex-1 space-y-5 overflow-y-auto overscroll-contain scrollbar-none px-3 py-4"
        >
          <section className="space-y-0.5">
            <SectionLabel>Clase</SectionLabel>

            <button
              type="button"
              onClick={() => handleNavigate('feed')}
              className={`${rowBase} ${activeView === 'feed' ? rowActive : rowIdle}`}
            >
              <MessageSquare className="h-4 w-4 shrink-0" />
              <span className="flex-1 truncate">Feed de clase</span>
            </button>

            <button
              type="button"
              onClick={() => handleNavigate('calendar')}
              className={`${rowBase} ${activeView === 'calendar' ? rowActive : rowIdle}`}
            >
              <Calendar className="h-4 w-4 shrink-0" />
              <span className="flex-1 truncate">Horario y tareas</span>
            </button>

            <button
              type="button"
              onClick={() => handleNavigate('shop')}
              className={`${rowBase} ${activeView === 'shop' ? rowActive : rowIdle}`}
            >
              <ShoppingBag className="h-4 w-4 shrink-0" />
              <span className="flex-1 truncate">Tienda de perfil</span>
              <span className={metaBase}>13M</span>
            </button>

            {onOpenStudentCard && currentUser && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenStudentCard();
                }}
                className={`${rowBase} ${rowIdle}`}
              >
                <IdCard className="h-4 w-4 shrink-0" />
                <span className="flex-1 truncate">Mi ficha de estudiante</span>
                <span className={metaBase}>
                  {currentUser.student_number ? `NIA-${currentUser.student_number}` : 'SMR2'}
                </span>
              </button>
            )}
          </section>

          <section className="space-y-0.5">
            <SectionLabel>Recreo</SectionLabel>

            {DRAWER_GAMES.map((game) => {
              const Icon = game.icon;
              const isActive = activeView === game.id;
              return (
                <button
                  key={game.id}
                  type="button"
                  onClick={() => handleNavigate(game.id)}
                  className={`${rowBase} ${isActive ? rowActive : rowIdle}`}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  <span className="flex-1 truncate">{game.label}</span>
                  {game.badge && (
                    <span className="shrink-0 rounded border border-border/70 px-1 py-px font-mono text-[9px] text-foreground-subtle">
                      {game.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </section>

          <section className="space-y-0.5">
            <SectionLabel>Comunidad</SectionLabel>

            {onOpenOnlineUsers && (
              <button
                type="button"
                onClick={() => {
                  onOpenOnlineUsers();
                  onClose();
                }}
                className={`${rowBase} ${rowIdle}`}
              >
                <Users className="h-4 w-4 shrink-0" />
                <span className="flex-1 truncate">Alumnos en directo</span>
                <span className="flex shrink-0 items-center gap-1.5 font-mono text-[10px] text-foreground-subtle">
                  <span className="h-1.5 w-1.5 rounded-full bg-success" />
                  {onlineCount ?? 0}
                </span>
              </button>
            )}

            <button
              type="button"
              onClick={() => {
                onOpenLeaderboard();
                onClose();
              }}
              className={`${rowBase} ${rowIdle}`}
            >
              <Trophy className="h-4 w-4 shrink-0" />
              <span className="flex-1 truncate">Clasificación</span>
            </button>

            {onOpenFeedback && (
              <button
                type="button"
                onClick={() => {
                  onOpenFeedback();
                  onClose();
                }}
                className={`${rowBase} ${rowIdle}`}
              >
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span className="flex-1 truncate">Incidencias</span>
              </button>
            )}
          </section>

          <section className="space-y-0.5">
            <SectionLabel>Sistema</SectionLabel>

            <button
              type="button"
              onClick={onToggleSound}
              aria-pressed={soundEnabled}
              className={`${rowBase} ${rowIdle}`}
            >
              {soundEnabled ? (
                <Volume2 className="h-4 w-4 shrink-0" />
              ) : (
                <VolumeX className="h-4 w-4 shrink-0" />
              )}
              <span className="flex-1 truncate">Efectos de sonido</span>
              <span
                aria-hidden="true"
                className={`relative h-[18px] w-8 shrink-0 rounded-full border transition-colors ${
                  soundEnabled ? 'border-accent bg-accent' : 'border-border bg-surface-hover'
                }`}
              >
                <span
                  className={`absolute left-[2px] top-1/2 h-3 w-3 -translate-y-1/2 rounded-full bg-white shadow-xs transition-transform ${
                    soundEnabled ? 'translate-x-[14px]' : 'translate-x-0'
                  }`}
                />
              </span>
            </button>

            {onOpenNotifications && (
              <button
                type="button"
                onClick={() => {
                  onOpenNotifications();
                  onClose();
                }}
                className={`${rowBase} ${rowIdle}`}
              >
                <BellRing className="h-4 w-4 shrink-0" />
                <span className="flex-1 truncate">Avisos fuera de la web</span>
              </button>
            )}

            {onOpenInstall && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenInstall();
                }}
                className={`${rowBase} ${rowIdle}`}
              >
                <MonitorDown className="h-4 w-4 shrink-0" />
                <span className="flex-1 truncate">Instalar en escritorio</span>
                <span className={metaBase}>PC / Mac</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => {
                onClose();
                window.dispatchEvent(new CustomEvent('smr2_open_changelog'));
              }}
              className={`${rowBase} ${rowIdle}`}
            >
              <Sparkles className="h-4 w-4 shrink-0" />
              <span className="flex-1 truncate">Novedades y versiones</span>
              <span className="shrink-0 rounded border border-border/70 bg-surface-raised px-1 py-px font-mono text-[9px] uppercase tracking-wide text-foreground-subtle">
                Nuevo
              </span>
            </button>

            <button
              type="button"
              onClick={() => {
                onOpenTerms();
                onClose();
              }}
              className={`${rowBase} ${rowIdle}`}
            >
              <FileText className="h-4 w-4 shrink-0" />
              <span className="flex-1 truncate">Normas y privacidad</span>
            </button>
          </section>
        </nav>

        {/* Footer */}
        {currentUser && (
          <div className="border-t border-border/70 px-3 py-2.5">
            <button
              type="button"
              onClick={() => {
                onSignOut();
                onClose();
              }}
              className={`${rowBase} text-foreground-muted hover:bg-danger-subtle hover:text-danger`}
            >
              <LogOut className="h-4 w-4 shrink-0" />
              <span className="flex-1 truncate">Cerrar sesión</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
