'use client';

import React from 'react';
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
} from 'lucide-react';
import { UserProfile } from '@/lib/types';
import { getUserRank } from '@/lib/economy';
import { Button } from '@/components/ui/Button';

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
  onFocusComposer?: () => void;
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
  onFocusComposer,
}) => {
  const rank = currentUser ? getUserRank(currentUser.coins) : null;

  const navItems = [
    { id: 'feed', label: 'Feed de clase', icon: MessageSquare },
    { id: 'calendar', label: 'Horario y tareas', icon: Calendar },
    { id: 'russian_roulette', label: 'Ruleta Rusa', icon: Zap },
    { id: 'crash', label: 'Minijuegos', icon: Gamepad2 },
  ];

  return (
    <aside className="sticky top-18 h-[calc(100dvh-5rem)] flex flex-col justify-between py-2 space-y-4">
      {/* Navigation Links */}
      <div className="space-y-4">
        <nav aria-label="Navegación lateral" className="space-y-1">
          {navItems.map((item) => {
            const isActive = activeView === item.id;
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onSelectView(item.id)}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-medium transition-all cursor-pointer ${
                  isActive
                    ? 'bg-foreground text-background font-semibold shadow-xs'
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
            onClick={onOpenLeaderboard}
            className="w-full flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl text-xs font-medium text-foreground-muted hover:text-foreground hover:bg-surface-raised transition-all cursor-pointer"
          >
            <Trophy className="w-4 h-4 text-amber-500" />
            <span>Clasificación</span>
          </button>

          <button
            type="button"
            onClick={onOpenFaucet}
            className="w-full flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl text-xs font-medium text-foreground-muted hover:text-foreground hover:bg-surface-raised transition-all cursor-pointer"
          >
            <Coins className="w-4 h-4 text-amber-500" />
            <span>Fondo diario</span>
          </button>

          <button
            type="button"
            onClick={onOpenDrawer}
            className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-medium text-foreground-muted hover:text-foreground hover:bg-surface-raised transition-all cursor-pointer"
          >
            <div className="flex items-center gap-2.5">
              <Menu className="w-4 h-4 text-foreground-subtle" />
              <span>Menú completo</span>
            </div>
          </button>
        </nav>

        <Button
          variant="primary"
          size="md"
          className="w-full rounded-xl shadow-xs"
          onClick={() => {
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
        <div className="p-3.5 rounded-2xl bg-surface border border-border/70 shadow-xs space-y-2.5">
          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={onOpenSettings}
              className="flex items-center gap-2.5 min-w-0 text-left cursor-pointer group"
            >
              <div className="w-8 h-8 rounded-lg bg-surface-raised border border-border/70 flex items-center justify-center font-mono font-medium text-xs uppercase shrink-0 text-foreground group-hover:scale-105 transition-transform">
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
              onClick={onSignOut}
              title="Cerrar sesión"
              className="p-1.5 rounded-lg text-foreground-subtle hover:text-danger hover:bg-danger-subtle transition-colors cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="flex items-center justify-between pt-2 border-t border-border/60 text-[11px] font-mono">
            <span className="text-foreground-subtle">Saldo disponible:</span>
            <span className="text-foreground font-semibold">
              {currentUser.coins.toLocaleString('es-ES')} fichas
            </span>
          </div>
        </div>
      ) : (
        <Button variant="primary" size="md" className="w-full rounded-xl" onClick={onOpenAuth}>
          Iniciar sesión
        </Button>
      )}
    </aside>
  );
};
