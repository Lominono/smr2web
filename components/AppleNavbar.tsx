'use client';

import React from 'react';
import { Volume2, VolumeX, Coins, Plus, Trophy, MessageSquare, LogIn, LogOut, User, Zap } from 'lucide-react';
import { UserProfile } from '@/lib/types';
import { sound } from '@/lib/audio';

interface AppleNavbarProps {
  user: UserProfile | null;
  onOpenAuth: () => void;
  onSignOut: () => void;
  onOpenFaucet: () => void;
  onOpenLeaderboard: () => void;
  onToggleChat: () => void;
  isChatOpen: boolean;
  soundEnabled: boolean;
  onToggleSound: () => void;
}

export const AppleNavbar: React.FC<AppleNavbarProps> = ({
  user,
  onOpenAuth,
  onSignOut,
  onOpenFaucet,
  onOpenLeaderboard,
  onToggleChat,
  isChatOpen,
  soundEnabled,
  onToggleSound,
}) => {
  return (
    <header className="sticky top-0 z-40 border-b border-white/[0.08] bg-black/80 backdrop-blur-2xl transition-all">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
        {/* Brand */}
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-white/[0.06] border border-white/10 flex items-center justify-center text-white">
            <Zap className="w-4 h-4 text-emerald-400" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold tracking-tight text-white font-mono">
                RECREO
              </span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-white/[0.08] text-zinc-300 border border-white/[0.08]">
                CASINO & CHAT
              </span>
            </div>
            <p className="text-[11px] text-zinc-500 hidden sm:block tracking-tight font-mono">
              Red de clase · Apuestas de fichas en tiempo real
            </p>
          </div>
        </div>

        {/* Right Actions */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Sound Toggle */}
          <button
            onClick={() => {
              onToggleSound();
              sound.tap();
            }}
            title={soundEnabled ? 'Silenciar sonidos' : 'Activar sonidos'}
            className="p-2 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] text-zinc-400 hover:text-white border border-white/[0.08] transition-all cursor-pointer"
          >
            {soundEnabled ? <Volume2 className="w-4 h-4 text-emerald-400" /> : <VolumeX className="w-4 h-4 text-zinc-500" />}
          </button>

          {/* Ranking Button */}
          <button
            onClick={() => {
              onOpenLeaderboard();
              sound.tap();
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] text-xs font-medium text-zinc-300 hover:text-white transition-all cursor-pointer"
          >
            <Trophy className="w-3.5 h-3.5 text-amber-400" />
            <span className="hidden sm:inline">Top Clase</span>
          </button>

          {/* Chat Toggle */}
          <button
            onClick={() => {
              onToggleChat();
              sound.tap();
            }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-medium transition-all cursor-pointer ${
              isChatOpen
                ? 'bg-white text-black font-semibold border-white'
                : 'bg-white/[0.04] hover:bg-white/[0.08] border-white/[0.08] text-zinc-300'
            }`}
          >
            <MessageSquare className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">El Chat</span>
          </button>

          {/* User Section: If Logged In */}
          {user ? (
            <div className="flex items-center gap-2">
              {/* Coin Balance */}
              <div className="flex items-center bg-white/[0.05] border border-white/[0.08] rounded-2xl p-1 pl-3 shadow-inner">
                <div className="flex items-center gap-1.5 mr-2">
                  <Coins className="w-3.5 h-3.5 text-amber-400" />
                  <span className="text-xs sm:text-sm font-bold font-mono text-white tracking-tight">
                    {user.coins.toLocaleString('es-ES')}
                  </span>
                </div>

                <button
                  onClick={() => {
                    onOpenFaucet();
                    sound.tap();
                  }}
                  title="Recargar fichas"
                  className="px-2.5 py-1 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black text-xs font-bold font-mono transition-transform active:scale-95 flex items-center gap-1 shadow-md cursor-pointer"
                >
                  <Plus className="w-3 h-3 stroke-[3]" />
                  <span className="text-[11px]">Beca</span>
                </button>
              </div>

              {/* Username Pill & Logout */}
              <div className="flex items-center gap-2 pl-1">
                <span className="hidden md:inline text-xs font-mono text-zinc-300">
                  @{user.username}
                </span>
                <button
                  onClick={() => {
                    onSignOut();
                    sound.tap();
                  }}
                  title="Cerrar sesión"
                  className="p-1.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] text-zinc-400 hover:text-rose-400 transition-colors"
                >
                  <LogOut className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ) : (
            /* If Not Logged In */
            <button
              onClick={() => {
                onOpenAuth();
                sound.tap();
              }}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-white hover:bg-zinc-200 text-black text-xs font-bold font-mono transition-all active:scale-95 cursor-pointer shadow-md"
            >
              <LogIn className="w-3.5 h-3.5" />
              <span>Entrar / Registro</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
