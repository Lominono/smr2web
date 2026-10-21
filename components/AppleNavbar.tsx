'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Menu,
  Volume2,
  VolumeX,
  Coins,
  Plus,
  Trophy,
  LogIn,
  LogOut,
  Calendar,
  Zap,
  Gamepad2,
  ShieldCheck,
  Settings,
  Sparkles,
} from 'lucide-react';
import { UserProfile } from '@/lib/types';
import { getUserRank } from '@/lib/economy';
import { sound } from '@/lib/audio';
import { getCurrentScheduleStatus } from '@/lib/scheduleData';

interface AppleNavbarProps {
  user: UserProfile | null;
  onOpenAuth: () => void;
  onSignOut: () => void;
  onOpenFaucet: () => void;
  onOpenLeaderboard: () => void;
  onOpenSchedule: () => void;
  isScheduleActive: boolean;
  onToggleChat?: () => void;
  isChatOpen?: boolean;
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
  onOpenSchedule,
  isScheduleActive,
  soundEnabled,
  onToggleSound,
  onOpenSettings,
  onOpenDrawer,
  activeTab = 'feed',
  onSelectTab,
}) => {
  const rank = user ? getUserRank(user.coins) : null;
  const [liveStatus, setLiveStatus] = useState(() => getCurrentScheduleStatus());

  useEffect(() => {
    const update = () => setLiveStatus(getCurrentScheduleStatus());
    update();
    const interval = setInterval(update, 20000);
    return () => clearInterval(interval);
  }, []);

  const avatarColorMap: Record<string, string> = {
    emerald: 'bg-emerald-500 text-white',
    blue: 'bg-blue-600 text-white',
    purple: 'bg-purple-600 text-white',
    amber: 'bg-amber-500 text-black',
    rose: 'bg-rose-600 text-white',
    cyan: 'bg-cyan-500 text-white',
  };
  const avatarClass = user?.avatar_color
    ? avatarColorMap[user.avatar_color] || 'bg-amber-500 text-black'
    : 'bg-amber-500 text-black';

  return (
    <header className="sticky top-0 z-40 border-b border-white/[0.08] bg-[#090b0e]/95 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 h-14 flex items-center justify-between gap-2 sm:gap-3">
        {/* Left: 3-Line Button (Hamburger) & Brand */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Prominent Hamburger 3-Line Button */}
          <button
            type="button"
            onClick={() => {
              onOpenDrawer();
              sound.tap();
            }}
            title="Menú completo (3 líneas)"
            aria-label="Abrir menú de tres líneas"
            className="w-9 h-9 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] text-zinc-300 hover:text-white flex items-center justify-center transition-all cursor-pointer active:scale-95 group"
          >
            <Menu className="w-5 h-5 group-hover:scale-105 transition-transform" />
          </button>

          {/* Logo & Classroom Brand */}
          <button
            type="button"
            onClick={() => {
              if (onSelectTab) onSelectTab('feed');
              sound.tap();
            }}
            className="flex items-center gap-2 cursor-pointer text-left select-none group"
          >
            <img
              src="/logo.png"
              alt="2º SMR"
              className="w-7 h-7 object-contain drop-shadow-sm group-hover:scale-105 transition-transform"
            />
            <div className="flex flex-col">
              <div className="flex items-center gap-1.5 leading-none">
                <span className="text-sm font-bold text-white font-mono">2º SMR</span>
                {rank && (
                  <span
                    className={`hidden sm:inline text-[9px] font-mono px-1 py-0.5 rounded border font-semibold ${rank.bg} ${rank.color} ${rank.border}`}
                  >
                    {rank.name}
                  </span>
                )}
              </div>
              <span className="text-[10px] text-zinc-400 font-mono mt-0.5 hidden xs:inline">
                Portal de Clase
              </span>
            </div>
          </button>

          {/* Real-time schedule pill (desktop) */}
          <div className="hidden xl:flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/[0.03] border border-white/[0.06] text-[11px] text-zinc-300 font-mono">
            <span
              className={`w-1.5 h-1.5 rounded-full ${
                liveStatus.status === 'in_class'
                  ? 'bg-emerald-400 animate-pulse'
                  : liveStatus.status === 'recreo'
                  ? 'bg-amber-400 animate-pulse'
                  : 'bg-zinc-500'
              }`}
            />
            <span>{liveStatus.message}</span>
          </div>
        </div>

        {/* Center: Quick navigation tabs (tablet & mid-desktop) */}
        {onSelectTab && (
          <nav aria-label="Navegación de barra" className="hidden md:flex items-center p-1 rounded-xl bg-black/60 border border-white/[0.08]">
            <button
              type="button"
              onClick={() => {
                onSelectTab('feed');
                sound.tap();
              }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono font-medium transition-colors cursor-pointer ${
                activeTab === 'feed'
                  ? 'bg-white text-black font-semibold shadow-sm'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span>Feed</span>
            </button>

            <button
              type="button"
              onClick={() => {
                onSelectTab('calendar');
                sound.tap();
              }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono font-medium transition-colors cursor-pointer ${
                activeTab === 'calendar'
                  ? 'bg-white text-black font-semibold shadow-sm'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              <Calendar className="w-3.5 h-3.5 text-blue-400" />
              <span>Horario</span>
            </button>

            <button
              type="button"
              onClick={() => {
                onSelectTab('russian_roulette');
                sound.tap();
              }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono font-medium transition-colors cursor-pointer ${
                activeTab === 'russian_roulette'
                  ? 'bg-amber-400 text-black font-bold shadow-sm'
                  : 'text-amber-300 hover:text-amber-200'
              }`}
            >
              <Zap className="w-3.5 h-3.5 text-amber-400" />
              <span>R. Rusa</span>
            </button>
          </nav>
        )}

        {/* Right: Sound, Leaderboard, Coins & Profile */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          {/* Sound Toggle */}
          <button
            onClick={() => {
              onToggleSound();
              sound.tap();
            }}
            title={soundEnabled ? 'Silenciar efectos' : 'Activar efectos'}
            className="w-8 h-8 rounded-lg bg-white/[0.03] border border-white/[0.06] hover:bg-white/[0.08] hover:text-white text-zinc-400 flex items-center justify-center transition-colors cursor-pointer"
          >
            {soundEnabled ? (
              <Volume2 className="w-3.5 h-3.5 text-emerald-400" />
            ) : (
              <VolumeX className="w-3.5 h-3.5 text-zinc-500" />
            )}
          </button>

          {/* Ranking Button */}
          <button
            onClick={() => {
              onOpenLeaderboard();
              sound.tap();
            }}
            title="Ver clasificación de fichas"
            className="hidden sm:flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-white/[0.03] border border-white/[0.06] hover:bg-white/[0.08] text-xs font-mono text-zinc-300 hover:text-white transition-colors cursor-pointer"
          >
            <Trophy className="w-3.5 h-3.5 text-amber-400" />
            <span>Top</span>
          </button>

          {/* User Status / Coins */}
          {user ? (
            <div className="flex items-center gap-1.5 pl-1.5 border-l border-white/[0.08]">
              {/* Coin Pill */}
              <div className="flex items-center gap-1 sm:gap-1.5 bg-amber-500/10 border border-amber-500/20 rounded-lg px-2 py-1 shrink-0">
                <Coins className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                <span className="text-xs font-mono font-medium text-amber-300 tabular-nums">
                  {user.coins.toLocaleString('es-ES')}
                </span>
                <button
                  onClick={() => {
                    onOpenFaucet();
                    sound.tap();
                  }}
                  title="Reclamar fichas diarias"
                  className="w-4 h-4 rounded bg-amber-400/20 hover:bg-amber-400/30 text-amber-300 flex items-center justify-center text-[10px] font-bold transition-colors cursor-pointer"
                >
                  <Plus className="w-2.5 h-2.5" />
                </button>
              </div>

              {/* User Settings Gear */}
              {onOpenSettings && (
                <button
                  type="button"
                  onClick={() => {
                    onOpenSettings();
                    sound.tap();
                  }}
                  title="Ajustes de usuario y perfil"
                  className="hidden sm:flex p-1.5 rounded-lg bg-white/[0.04] hover:bg-white/10 text-zinc-300 hover:text-white border border-white/10 items-center justify-center transition-colors cursor-pointer active:scale-95"
                >
                  <Settings className="w-3.5 h-3.5 text-zinc-300" />
                </button>
              )}

              {/* Admin Panel Link */}
              {(user.role === 'admin' || user.role === 'delegado') && (
                <Link
                  href="/admin"
                  title="Panel de Delegado / Administración"
                  className="hidden sm:flex p-1.5 rounded-lg bg-amber-400/10 hover:bg-amber-400/20 text-amber-400 border border-amber-400/20 items-center justify-center transition-colors cursor-pointer"
                >
                  <ShieldCheck className="w-3.5 h-3.5" />
                </Link>
              )}

              {/* Avatar Initial (Clickable to open Drawer or Settings) */}
              <button
                type="button"
                onClick={() => {
                  if (onOpenSettings) onOpenSettings();
                  sound.tap();
                }}
                title={`@${user.username} - Abrir perfil`}
                className={`relative w-7 h-7 rounded-lg ${avatarClass} border border-white/10 flex items-center justify-center font-mono font-bold text-xs select-none uppercase cursor-pointer hover:ring-2 hover:ring-white/20 transition-all shrink-0`}
              >
                {user.username.charAt(0)}
                {(user.role === 'admin' || user.role === 'delegado') && (
                  <span
                    title="Delegado de clase"
                    className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-amber-400 ring-2 ring-black"
                  />
                )}
              </button>

              {/* Sign out */}
              <button
                onClick={() => {
                  onSignOut();
                  sound.tap();
                }}
                title="Cerrar sesión"
                className="hidden sm:flex w-7 h-7 rounded-lg text-zinc-500 hover:text-rose-400 hover:bg-rose-500/10 items-center justify-center transition-colors cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <button
              onClick={() => {
                onOpenAuth();
                sound.tap();
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white hover:bg-zinc-200 text-black text-xs font-mono font-semibold transition-colors shadow-sm cursor-pointer"
            >
              <LogIn className="w-3.5 h-3.5" />
              <span>Entrar</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
