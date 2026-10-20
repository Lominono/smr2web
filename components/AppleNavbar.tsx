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
  Gamepad2,
  Server,
  CircleDot,
} from 'lucide-react';
import { UserProfile } from '@/lib/types';
import { getUserRank } from '@/lib/economy';
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
  activeTab?: 'angry' | 'crash' | 'mines' | 'roulette' | 'calendar';
  onSelectTab?: (tab: 'angry' | 'crash' | 'mines' | 'roulette' | 'calendar') => void;
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
  const rank = user ? getUserRank(user.coins) : null;

  return (
    <header className="sticky top-0 z-40 border-b border-white/[0.08] bg-[#070709]/85 backdrop-blur-2xl transition-all">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 h-14 flex items-center justify-between gap-3">
        {/* Brand Lockup with PNG Logo */}
        <div className="flex items-center gap-3">
          <div
            onClick={() => onSelectTab && onSelectTab('calendar')}
            className="flex items-center gap-2.5 cursor-pointer select-none"
          >
            <img
              src="/logo.png"
              alt="SMR2"
              className="w-8 h-8 object-contain drop-shadow-sm"
            />
            <div className="flex flex-col">
              <div className="flex items-center gap-1.5">
                <span className="text-sm font-bold tracking-tight text-white font-mono leading-none">
                  SMR2
                </span>
                {rank && (
                  <span
                    className={`text-[9px] font-mono px-1 py-0.2 rounded border font-semibold ${rank.bg} ${rank.color} ${rank.border}`}
                  >
                    {rank.name}
                  </span>
                )}
              </div>
              <span className="text-[10px] text-zinc-500 font-mono leading-tight mt-0.5">
                2º Sistemas y Redes
              </span>
            </div>
          </div>
        </div>

        {/* Center: Clean Segmented Navigation (Desktop & Tablet) */}
        {onSelectTab && (
          <nav className="hidden md:flex items-center p-1 rounded-2xl bg-black/50 border border-white/[0.08]">
            <button
              type="button"
              onClick={() => {
                onSelectTab('calendar');
                sound.tap();
              }}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-mono font-medium transition-all cursor-pointer ${
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
                onSelectTab('angry');
                sound.tap();
              }}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-mono font-medium transition-all cursor-pointer ${
                activeTab === 'angry'
                  ? 'bg-white text-black font-semibold shadow-sm'
                  : 'text-zinc-400 hover:text-white'
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
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-mono font-medium transition-all cursor-pointer ${
                activeTab === 'crash'
                  ? 'bg-white text-black font-semibold shadow-sm'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              <TrendingUp className="w-3.5 h-3.5 text-rose-400" />
              <span>Crash</span>
            </button>

            <button
              type="button"
              onClick={() => {
                onSelectTab('mines');
                sound.tap();
              }}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-mono font-medium transition-all cursor-pointer ${
                activeTab === 'mines'
                  ? 'bg-white text-black font-semibold shadow-sm'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              <Server className="w-3.5 h-3.5 text-amber-400" />
              <span>Minas</span>
            </button>

            <button
              type="button"
              onClick={() => {
                onSelectTab('roulette');
                sound.tap();
              }}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-mono font-medium transition-all cursor-pointer ${
                activeTab === 'roulette'
                  ? 'bg-white text-black font-semibold shadow-sm'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              <CircleDot className="w-3.5 h-3.5 text-yellow-400" />
              <span>Ruleta</span>
            </button>
          </nav>
        )}

        {/* Right Actions */}
        <div className="flex items-center gap-2">
          {/* Minecraft Client Community Link */}
          <a
            href="https://nightverixclient.netlify.app/download-alpha"
            target="_blank"
            rel="noopener noreferrer"
            title="Descargar Cliente Minecraft (Marco Antonio)"
            className="hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 hover:bg-emerald-500/20 text-xs font-mono text-emerald-300 hover:text-emerald-200 transition-all cursor-pointer active:scale-95"
          >
            <Gamepad2 className="w-3.5 h-3.5 text-emerald-400" />
            <span className="hidden lg:inline">Minecraft Alpha</span>
          </a>

          {/* Sound Toggle */}
          <button
            onClick={() => {
              onToggleSound();
              sound.tap();
            }}
            title={soundEnabled ? 'Silenciar' : 'Activar sonido'}
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
            title="Clasificación"
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
            title="Chat"
            className={`hidden lg:flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-mono transition-all cursor-pointer active:scale-95 border ${
              isChatOpen
                ? 'bg-white text-black font-semibold border-white shadow-sm'
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
              <div className="flex items-center gap-1.5 bg-amber-500/10 border border-amber-500/20 rounded-xl px-2.5 py-1">
                <Coins className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                <span className="text-xs font-mono font-medium text-amber-300 tabular-nums">
                  {user.coins.toLocaleString('es-ES')}
                </span>
                <button
                  onClick={() => {
                    onOpenFaucet();
                    sound.tap();
                  }}
                  title="Fondo de rescate y recargas"
                  className="ml-1 w-4 h-4 rounded-md bg-amber-400/20 hover:bg-amber-400/30 text-amber-300 flex items-center justify-center text-[10px] font-bold transition-all cursor-pointer active:scale-90"
                >
                  <Plus className="w-2.5 h-2.5" />
                </button>
              </div>

              {/* User Avatar & Logout */}
              <div className="flex items-center gap-1.5">
                <div
                  title={`@${user.username} (${user.role === 'admin' || user.role === 'delegado' ? 'Delegado / Admin' : rank?.name || 'Alumno'})`}
                  className="relative w-7 h-7 rounded-xl bg-white/[0.08] border border-white/10 flex items-center justify-center font-mono font-bold text-xs text-zinc-200 select-none uppercase"
                >
                  {user.username.charAt(0)}
                  {(user.role === 'admin' || user.role === 'delegado') && (
                    <span
                      title="Delegado de clase"
                      className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-amber-400 ring-2 ring-black"
                    />
                  )}
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
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white hover:bg-zinc-200 text-black text-xs font-mono font-semibold transition-all shadow-sm active:scale-95 cursor-pointer"
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
