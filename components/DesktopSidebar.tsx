'use client';

import React from 'react';
import Link from 'next/link';
import {
  Sparkles,
  Calendar,
  Zap,
  Gamepad2,
  Trophy,
  Coins,
  Menu,
  Settings,
  ShieldCheck,
  LogOut,
  PenSquare,
  Plus,
} from 'lucide-react';
import { UserProfile } from '@/lib/types';
import { getUserRank } from '@/lib/economy';
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

  const avatarColorMap: Record<string, string> = {
    emerald: 'bg-emerald-500 text-white',
    blue: 'bg-blue-600 text-white',
    purple: 'bg-purple-600 text-white',
    amber: 'bg-amber-500 text-black',
    rose: 'bg-rose-600 text-white',
    cyan: 'bg-cyan-500 text-white',
  };
  const avatarClass = currentUser?.avatar_color
    ? avatarColorMap[currentUser.avatar_color] || 'bg-amber-500 text-black'
    : 'bg-amber-500 text-black';

  const navItems = [
    { id: 'feed', label: 'Inicio', icon: Sparkles },
    { id: 'calendar', label: 'Horario', icon: Calendar },
    { id: 'russian_roulette', label: 'Ruleta Rusa', icon: Zap, badge: 'Multi' },
    { id: 'crash', label: 'Arcade', icon: Gamepad2 },
  ];

  return (
    <aside className="sticky top-14 h-[calc(100vh-3.5rem)] flex flex-col justify-between py-4 pr-3">
      {/* Top Section: Navigation Links */}
      <div className="space-y-4">
        {/* Navigation list */}
        <nav aria-label="Navegación principal" className="space-y-1">
          {navItems.map((item) => {
            const isActive = activeView === item.id;
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  onSelectView(item.id);
                  sound.tap();
                }}
                className={`w-full flex items-center justify-between px-3.5 py-3 rounded-2xl text-sm font-mono font-medium transition-all cursor-pointer ${
                  isActive
                    ? 'bg-white text-black font-bold shadow-md'
                    : 'text-zinc-400 hover:text-white hover:bg-white/[0.05]'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon
                    className={`w-5 h-5 ${
                      isActive ? 'text-amber-500' : 'text-zinc-400'
                    }`}
                  />
                  <span>{item.label}</span>
                </div>
                {item.badge && (
                  <span
                    className={`text-[9px] font-mono px-1.5 py-0.2 rounded font-bold ${
                      isActive ? 'bg-black/20 text-black' : 'bg-amber-400/20 text-amber-300'
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}

          {/* Ranking shortcut */}
          <button
            type="button"
            onClick={() => {
              onOpenLeaderboard();
              sound.tap();
            }}
            className="w-full flex items-center gap-3 px-3.5 py-3 rounded-2xl text-sm font-mono font-medium text-zinc-400 hover:text-white hover:bg-white/[0.05] transition-all cursor-pointer"
          >
            <Trophy className="w-5 h-5 text-amber-400" />
            <span>Top Ranking</span>
          </button>

          {/* Faucet shortcut */}
          <button
            type="button"
            onClick={() => {
              onOpenFaucet();
              sound.tap();
            }}
            className="w-full flex items-center gap-3 px-3.5 py-3 rounded-2xl text-sm font-mono font-medium text-zinc-400 hover:text-white hover:bg-white/[0.05] transition-all cursor-pointer"
          >
            <Coins className="w-5 h-5 text-amber-400" />
            <span>Fondo Diario</span>
          </button>

          {/* The requested 3-Line Button ("Todas las Cosas") */}
          <button
            type="button"
            onClick={() => {
              onOpenDrawer();
              sound.tap();
            }}
            className="w-full flex items-center justify-between px-3.5 py-3 rounded-2xl text-sm font-mono font-semibold text-amber-300 bg-amber-400/10 hover:bg-amber-400/20 border border-amber-400/20 transition-all cursor-pointer mt-2"
          >
            <div className="flex items-center gap-3">
              <Menu className="w-5 h-5 text-amber-400" />
              <span>Menú Completo</span>
            </div>
            <span className="text-[10px] bg-amber-400/20 text-amber-300 px-1.5 py-0.5 rounded font-mono">
              3 líneas
            </span>
          </button>
        </nav>

        {/* Publicar CTA Button (Twitter style) */}
        <button
          type="button"
          onClick={() => {
            if (activeView !== 'feed') {
              onSelectView('feed');
            }
            if (onFocusComposer) {
              setTimeout(onFocusComposer, 100);
            }
            sound.tap();
          }}
          className="w-full py-3 rounded-2xl bg-amber-400 hover:bg-amber-300 text-black font-mono font-bold text-sm flex items-center justify-center gap-2 shadow-lg shadow-amber-500/10 hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer"
        >
          <PenSquare className="w-4 h-4" />
          <span>Publicar Post</span>
        </button>
      </div>

      {/* Bottom User Card */}
      {currentUser ? (
        <div className="p-3 rounded-2xl bg-[#0c0e12] border border-white/[0.08] space-y-2.5">
          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={() => {
                onOpenSettings();
                sound.tap();
              }}
              className="flex items-center gap-2.5 min-w-0 text-left cursor-pointer group"
            >
              <div
                className={`w-9 h-9 rounded-xl ${avatarClass} flex items-center justify-center font-mono font-bold text-xs uppercase shrink-0 shadow-sm group-hover:ring-2 group-hover:ring-white/20 transition-all`}
              >
                {currentUser.username.charAt(0)}
              </div>
              <div className="flex flex-col min-w-0">
                <span className="text-xs font-bold text-white font-mono truncate group-hover:underline">
                  @{currentUser.username}
                </span>
                <span className="text-[10px] text-zinc-400 font-mono">
                  {currentUser.role === 'admin' || currentUser.role === 'delegado'
                    ? 'Delegado'
                    : rank?.name || 'Estudiante'}
                </span>
              </div>
            </button>

            <button
              type="button"
              onClick={() => {
                onSignOut();
                sound.tap();
              }}
              title="Cerrar sesión"
              className="p-1.5 rounded-lg text-zinc-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="flex items-center justify-between pt-2 border-t border-white/[0.06] text-xs font-mono">
            <span className="text-zinc-500">Saldo:</span>
            <span className="text-amber-300 font-semibold">
              {currentUser.coins.toLocaleString('es-ES')} fichas
            </span>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => {
            onOpenAuth();
            sound.tap();
          }}
          className="w-full py-2.5 rounded-xl bg-white text-black font-mono font-bold text-xs transition-colors hover:bg-zinc-200 cursor-pointer shadow-sm"
        >
          Iniciar Sesión
        </button>
      )}
    </aside>
  );
};
