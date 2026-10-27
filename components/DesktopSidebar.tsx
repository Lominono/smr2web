'use client';

import React from 'react';
import Link from 'next/link';
import {
  Calendar,
  Zap,
  Gamepad2,
  Trophy,
  Coins,
  Menu,
  LogOut,
  PenSquare,
  MessageSquare,
  Wine,
  Sprout,
  Settings,
  Users,
  ShieldCheck,
  Lightbulb,
} from 'lucide-react';
import { UserProfile } from '@/lib/types';
import { getUserRank } from '@/lib/economy';
import { Button } from '@/components/ui/Button';
import { sound } from '@/lib/audio';

interface DesktopSidebarProps {
  currentUser: UserProfile | null;
  activeView: string;
  onSelectView: (view: string) => void;
  onOpenDrawer: () => void;
  onOpenLeaderboard: () => void;
  onOpenFaucet: () => void;
  onOpenSettings: () => void;
  onSignOut: () => void;
  onOpenAuth: () => void;
  onOpenFeedback?: () => void;
  onFocusComposer?: () => void;
  onlineCount?: number;
  onOpenOnlineUsers?: () => void;
}

export const DesktopSidebar: React.FC<DesktopSidebarProps> = ({
  currentUser,
  activeView,
  onSelectView,
  onOpenDrawer,
  onOpenLeaderboard,
  onOpenFaucet,
  onOpenSettings,
  onSignOut,
  onOpenAuth,
  onOpenFeedback,
  onFocusComposer,
  onlineCount,
  onOpenOnlineUsers,
}) => {
  const rank = currentUser ? getUserRank(currentUser.coins) : null;

  const navItems: { id: string; label: string; icon: any }[] = [
    { id: 'feed', label: 'Feed de clase', icon: MessageSquare },
    { id: 'calendar', label: 'Horario y tareas', icon: Calendar },
    { id: 'farmhand', label: 'El Huerto', icon: Sprout },
    { id: 'party_idle', label: 'El Botellón', icon: Wine },
    { id: 'russian_roulette', label: 'Ruleta Rusa', icon: Zap },
    { id: 'crash', label: 'Recreo Arcade', icon: Gamepad2 },
  ];

  return (
    <aside className="sticky top-16 max-h-[calc(100dvh-4.5rem)] overflow-y-auto overscroll-contain scrollbar-none flex flex-col justify-between py-2 space-y-4">
      {/* Navigation Links */}
      <div className="space-y-3">
        <nav aria-label="Navegación lateral" className="space-y-1">
          {navItems.map((item) => {
            const isActive =
              item.id === 'crash'
                ? ['crash', 'mines', 'angry', 'roulette'].includes(activeView)
                : activeView === item.id;
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  sound.tap();
                  onSelectView(item.id);
                }}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition-all cursor-pointer ${
                  isActive
                    ? 'bg-foreground text-background font-semibold shadow-2xs'
                    : 'text-foreground-muted hover:text-foreground hover:bg-surface-raised'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Icon
                    className={`w-4 h-4 ${
                      isActive ? 'text-inherit' : 'text-foreground-subtle'
                    }`}
                  />
                  <span>{item.label}</span>
                </div>
              </button>
            );
          })}

          <button
            type="button"
            onClick={() => {
              sound.tap();
              onOpenLeaderboard();
            }}
            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium text-foreground-muted hover:text-foreground hover:bg-surface-raised transition-all cursor-pointer"
          >
            <Trophy className="w-4 h-4 text-amber-500" />
            <span>Clasificación</span>
          </button>

          <button
            type="button"
            onClick={() => {
              sound.tap();
              onOpenFaucet();
            }}
            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium text-foreground-muted hover:text-foreground hover:bg-surface-raised transition-all cursor-pointer"
          >
            <Coins className="w-4 h-4 text-amber-500" />
            <span>Fondo diario</span>
          </button>

          {onOpenOnlineUsers && (
            <button
              type="button"
              onClick={() => {
                sound.tap();
                onOpenOnlineUsers();
              }}
              className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium text-emerald-400 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20 transition-all cursor-pointer"
            >
              <div className="flex items-center gap-2.5">
                <Users className="w-4 h-4 text-emerald-400" />
                <span className="font-semibold">En directo</span>
              </div>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 font-mono font-bold">
                {onlineCount ?? 0}
              </span>
            </button>
          )}

          {currentUser && (currentUser.role === 'admin' || currentUser.role === 'delegado') && (
            <Link
              href="/admin"
              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium text-amber-500 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/20 transition-all cursor-pointer"
            >
              <ShieldCheck className="w-4 h-4 text-amber-500" />
              <span className="font-semibold">Panel Admin</span>
            </Link>
          )}

          {onOpenFeedback && (
            <button
              type="button"
              onClick={() => {
                sound.tap();
                onOpenFeedback();
              }}
              className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium text-foreground-muted hover:text-foreground hover:bg-surface-raised transition-all cursor-pointer"
            >
              <div className="flex items-center gap-2.5">
                <Lightbulb className="w-4 h-4 text-amber-500" />
                <span>Ideas y reportes</span>
              </div>
            </button>
          )}

          <button
            type="button"
            onClick={() => {
              sound.tap();
              onOpenDrawer();
            }}
            className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium text-foreground-muted hover:text-foreground hover:bg-surface-raised transition-all cursor-pointer"
          >
            <div className="flex items-center gap-2.5">
              <Menu className="w-4 h-4 text-foreground-subtle" />
              <span>Más opciones</span>
            </div>
          </button>
        </nav>

        <Button
          variant="primary"
          size="md"
          className="w-full rounded-xl shadow-2xs font-medium h-9 text-xs"
          onClick={() => {
            sound.tap();
            if (activeView !== 'feed') onSelectView('feed');
            if (onFocusComposer) setTimeout(onFocusComposer, 100);
          }}
        >
          <PenSquare className="w-3.5 h-3.5" />
          <span>Publicar aviso</span>
        </Button>
      </div>

      {/* User Card */}
      {currentUser ? (
        <div className="p-3 rounded-xl bg-surface border border-border/70 space-y-2">
          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={() => {
                sound.tap();
                onOpenSettings();
              }}
              className="flex items-center gap-2 min-w-0 text-left cursor-pointer group"
            >
              <div className="w-7 h-7 rounded-lg bg-surface-raised border border-border/70 flex items-center justify-center font-mono font-medium text-xs uppercase shrink-0 text-foreground group-hover:scale-105 transition-transform">
                {currentUser.username.charAt(0)}
              </div>
              <div className="flex flex-col min-w-0">
                <span className="text-xs font-semibold text-foreground font-mono truncate group-hover:underline">
                  @{currentUser.username}
                </span>
                <span className="text-[10px] text-foreground-subtle">
                  {currentUser.role === 'admin' || currentUser.role === 'delegado'
                    ? 'Delegado'
                    : rank?.name || 'Estudiante'}
                </span>
              </div>
            </button>

            <button
              type="button"
              onClick={() => {
                sound.tap();
                onSignOut();
              }}
              title="Cerrar sesión"
              className="p-1 rounded-md text-foreground-subtle hover:text-danger hover:bg-danger-subtle transition-colors cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="flex items-center justify-between pt-1.5 border-t border-border/50 text-[11px] font-mono">
            <button
              type="button"
              onClick={() => {
                sound.tap();
                onOpenSettings();
              }}
              className="text-accent hover:underline flex items-center gap-1 font-sans cursor-pointer text-[11px]"
            >
              <span>Mi Agenda</span>
            </button>
            <span className="text-foreground font-semibold">
              {currentUser.coins.toLocaleString('es-ES')} fichas
            </span>
          </div>
        </div>
      ) : (
        <Button
          variant="primary"
          size="md"
          className="w-full rounded-xl text-xs h-9"
          onClick={() => {
            sound.tap();
            onOpenAuth();
          }}
        >
          Iniciar sesión
        </Button>
      )}
    </aside>
  );
};
