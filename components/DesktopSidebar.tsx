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
    <aside className="sticky top-14 h-[calc(100vh-3.5rem)] flex flex-col justify-between py-4 pr-3 border-r border-border">
      {/* Navigation Links */}
      <div className="space-y-3">
        <nav aria-label="Navegación lateral" className="space-y-1">
          {navItems.map((item) => {
            const isActive = activeView === item.id;
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onSelectView(item.id)}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-[var(--radius)] text-xs font-medium transition-colors cursor-pointer ${
                  isActive
                    ? 'bg-surface-raised text-foreground font-semibold border border-border'
                    : 'text-foreground-muted hover:text-foreground hover:bg-surface'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Icon
                    className={`w-4 h-4 ${
                      isActive ? 'text-accent' : 'text-foreground-subtle'
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
            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-[var(--radius)] text-xs font-medium text-foreground-muted hover:text-foreground hover:bg-surface transition-colors cursor-pointer"
          >
            <Trophy className="w-4 h-4 text-foreground-subtle" />
            <span>Clasificación</span>
          </button>

          <button
            type="button"
            onClick={onOpenFaucet}
            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-[var(--radius)] text-xs font-medium text-foreground-muted hover:text-foreground hover:bg-surface transition-colors cursor-pointer"
          >
            <Coins className="w-4 h-4 text-foreground-subtle" />
            <span>Fondo diario</span>
          </button>

          <button
            type="button"
            onClick={onOpenDrawer}
            className="w-full flex items-center justify-between px-3 py-2 rounded-[var(--radius)] text-xs font-medium text-foreground-muted hover:text-foreground hover:bg-surface transition-colors cursor-pointer"
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
          className="w-full"
          onClick={() => {
            if (activeView !== 'feed') onSelectView('feed');
            if (onFocusComposer) setTimeout(onFocusComposer, 100);
          }}
        >
          <PenSquare className="w-3.5 h-3.5" />
          <span>Publicar</span>
        </Button>
      </div>

      {/* User Card */}
      {currentUser ? (
        <div className="p-3 rounded-[var(--radius)] bg-surface border border-border space-y-2">
          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={onOpenSettings}
              className="flex items-center gap-2 min-w-0 text-left cursor-pointer group"
            >
              <div className="w-7 h-7 rounded-[var(--radius-sm)] bg-surface-raised border border-border flex items-center justify-center font-mono font-bold text-xs uppercase shrink-0 text-foreground">
                {currentUser.username.charAt(0)}
              </div>
              <div className="flex flex-col min-w-0">
                <span className="text-xs font-semibold text-foreground font-mono truncate group-hover:underline">
                  @{currentUser.username}
                </span>
                <span className="text-[10px] text-foreground-subtle font-mono">
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
              className="p-1 rounded-[var(--radius-sm)] text-foreground-subtle hover:text-danger hover:bg-danger-subtle transition-colors cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="flex items-center justify-between pt-2 border-t border-border-subtle text-[11px] font-mono">
            <span className="text-foreground-subtle">Saldo:</span>
            <span className="text-accent font-medium">
              {currentUser.coins.toLocaleString('es-ES')} fichas
            </span>
          </div>
        </div>
      ) : (
        <Button variant="primary" size="md" className="w-full" onClick={onOpenAuth}>
          Iniciar sesión
        </Button>
      )}
    </aside>
  );
};
