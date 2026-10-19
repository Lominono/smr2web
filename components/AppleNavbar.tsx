'use client';

import React from 'react';
import {
  Volume2,
  VolumeX,
  Coins,
  Plus,
  Trophy,
  MessageSquare,
  LogIn,
  LogOut,
  Calendar,
  Target,
  TrendingUp,
} from 'lucide-react';
import { UserProfile } from '@/lib/types';
import { sound } from '@/lib/audio';

interface AppleNavbarProps {
  user: UserProfile | null;
  onOpenAuth: () => void;
  onSignOut: () => void;
  onOpenFaucet: () => void;
  onOpenLeaderboard: () => void;
  onOpenSchedule: () => void;
  isScheduleActive: boolean;
  onToggleChat: () => void;
  isChatOpen: boolean;
  soundEnabled: boolean;
  onToggleSound: () => void;
  activeTab?: 'angry' | 'crash' | 'calendar';
  onSelectTab?: (tab: 'angry' | 'crash' | 'calendar') => void;
}

export const AppleNavbar: React.FC<AppleNavbarProps> = ({
  user,
  onOpenAuth,
  onSignOut,
  onOpenFaucet,
  onOpenLeaderboard,
  onOpenSchedule,
  isScheduleActive,
  onToggleChat,
  isChatOpen,
  soundEnabled,
  onToggleSound,
  activeTab = 'calendar',
  onSelectTab,
}) => {
  return (
    <header className="sticky top-0 z-40 border-b border-white/[0.08] bg-[#070709]/80 backdrop-blur-2xl transition-all">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 h-15 flex items-center justify-between gap-3">
        {/* Brand Lockup */}
        <div className="flex items-center gap-3">
          <div
            onClick={() => onSelectTab && onSelectTab('calendar')}
            className="flex items-center gap-2.5 cursor-pointer group select-none"
          >
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-emerald-500/20 to-emerald-600/5 border border-emerald-500/30 flex items-center justify-center shadow-[0_0_15px_rgba(16,185,129,0.2)] group-hover:border-emerald-400/50 transition-all">
              <span className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]"></span>
            </div>
            <div className="flex flex-col">
              <div className="flex items-center gap-1.5">
                <span className="text-sm font-black tracking-tight text-white font-mono leading-none">
                  RECREO
                </span>
                <span className="text-[10px] font-mono px-1.5 py-0.2 rounded-md bg-white/[0.08] text-zinc-300 border border-white/10 font-bold">
                  SMR2
                </span>
              </div>
              <span className="text-[10px] text-zinc-500 font-mono tracking-wider leading-tight">
                PORTAL & ARCADE
              </span>
            </div>
          </div>
        </div>

        {/* Center: Segmented Navigation (Desktop & Tablet) */}
        {onSelectTab && (
          <nav className="hidden md:flex items-center p-1 rounded-2xl bg-black/50 border border-white/[0.08] shadow-inner">
            <button
              type="button"
              onClick={() => {
                onSelectTab('calendar');
                sound.tap();
              }}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-mono font-medium transition-all cursor-pointer ${
                activeTab === 'calendar'
                  ? 'bg-white text-black font-bold shadow-md shadow-white/10'
                  : 'text-zinc-400 hover:text-white hover:bg-white/[0.04]'
              }`}
            >
              <Calendar className="w-3.5 h-3.5 text-blue-400" />
              <span>Horario SMR2</span>
            </button>

            <button
              type="button"
              onClick={() => {
                onSelectTab('angry');
                sound.tap();
              }}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-mono font-medium transition-all cursor-pointer ${
                activeTab === 'angry'
                  ? 'bg-white text-black font-bold shadow-md shadow-white/10'
                  : 'text-zinc-400 hover:text-white hover:bg-white/[0.04]'
              }`}
            >
              <Target className="w-3.5 h-3.5 text-emerald-400" />
              <span>Slingshot</span>
            </button>

            <button
              type="button"
              onClick={() => {
                onSelectTab('crash');
                sound.tap();
              }}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-mono font-medium transition-all cursor-pointer ${
                activeTab === 'crash'
                  ? 'bg-white text-black font-bold shadow-md shadow-white/10'
                  : 'text-zinc-400 hover:text-white hover:bg-white/[0.04]'
              }`}
            >
              <TrendingUp className="w-3.5 h-3.5 text-rose-400" />
              <span>Crash</span>
            </button>
          </nav>
        )}

        {/* Right Actions */}
        <div className="flex items-center gap-2">
          {/* Sound Toggle */}
          <button
            onClick={() => {
              onToggleSound();
              sound.tap();
            }}
            title={soundEnabled ? 'Silenciar audio' : 'Activar audio'}
            className="w-8 h-8 rounded-xl bg-white/[0.03] border border-white/[0.06] hover:bg-white/[0.08] hover:border-white/10 flex items-center justify-center transition-all cursor-pointer active:scale-95"
          >
            {soundEnabled ? (
              <Volume2 className="w-3.5 h-3.5 text-emerald-400" />
            ) : (
              <VolumeX className="w-3.5 h-3.5 text-zinc-500" />
            )}
          </button>

          {/* Ranking Button (Desktop) */}
          <button
            onClick={() => {
              onOpenLeaderboard();
              sound.tap();
            }}
            title="Clasificación general"
            className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/[0.03] border border-white/[0.06] hover:bg-white/[0.08] hover:border-white/10 text-xs font-mono text-zinc-300 hover:text-white transition-all cursor-pointer active:scale-95"
          >
            <Trophy className="w-3.5 h-3.5 text-amber-400" />
            <span>Top</span>
          </button>

          {/* Chat Toggle (Desktop) */}
          <button
            onClick={() => {
              onToggleChat();
              sound.tap();
            }}
            title="Abrir chat en vivo"
            className={`hidden lg:flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-mono transition-all cursor-pointer active:scale-95 border ${
              isChatOpen
                ? 'bg-white text-black font-bold border-white shadow-sm'
                : 'bg-white/[0.03] border-white/[0.06] text-zinc-300 hover:text-white hover:bg-white/[0.08]'
            }`}
          >
            <MessageSquare className="w-3.5 h-3.5" />
            <span>Chat</span>
          </button>

          {/* User Status / Coins */}
          {user ? (
            <div className="flex items-center gap-2 pl-1 border-l border-white/[0.08]">
              {/* Coin Balance Pill */}
              <div className="flex items-center gap-1.5 bg-gradient-to-r from-amber-500/10 to-amber-500/5 border border-amber-500/25 rounded-xl px-2.5 py-1 shadow-sm">
                <Coins className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                <span className="text-xs font-mono font-bold text-amber-300 tabular-nums">
                  {user.coins.toLocaleString('es-ES')}
                </span>
                <button
                  onClick={() => {
                    onOpenFaucet();
                    sound.tap();
                  }}
                  title="Recargar saldo gratis"
                  className="ml-1 w-4 h-4 rounded-md bg-amber-400/20 hover:bg-amber-400/30 text-amber-300 flex items-center justify-center text-[10px] font-bold transition-all cursor-pointer active:scale-90"
                >
                  <Plus className="w-2.5 h-2.5" />
                </button>
              </div>

              {/* User Avatar & Logout */}
              <div className="flex items-center gap-1.5">
                <div
                  title={`Conectado como @${user.username}`}
                  className="w-7 h-7 rounded-xl bg-white/[0.08] border border-white/10 flex items-center justify-center font-mono font-bold text-xs text-zinc-200 select-none uppercase"
                >
                  {user.username.charAt(0)}
                </div>

                <button
                  onClick={() => {
                    onSignOut();
                    sound.tap();
                  }}
                  title="Cerrar sesión"
                  className="w-7 h-7 rounded-xl text-zinc-500 hover:text-rose-400 hover:bg-rose-500/10 flex items-center justify-center transition-all cursor-pointer active:scale-95"
                >
                  <LogOut className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => {
                onOpenAuth();
                sound.tap();
              }}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-white hover:bg-zinc-200 text-black text-xs font-mono font-bold transition-all shadow-md active:scale-95 cursor-pointer"
            >
              <LogIn className="w-3.5 h-3.5" />
              <span>Acceder</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
