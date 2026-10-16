'use client';

import React, { useState } from 'react';
import { Volume2, VolumeX, Coins, Plus, Trophy, Sparkles, User, MessageCircle } from 'lucide-react';
import { UserProfile } from '@/lib/types';
import { sound } from '@/lib/audio';

interface AppleNavbarProps {
  user: UserProfile;
  onOpenFaucet: () => void;
  onOpenLeaderboard: () => void;
  onToggleChat: () => void;
  isChatOpen: boolean;
  soundEnabled: boolean;
  onToggleSound: () => void;
}

export const AppleNavbar: React.FC<AppleNavbarProps> = ({
  user,
  onOpenFaucet,
  onOpenLeaderboard,
  onToggleChat,
  isChatOpen,
  soundEnabled,
  onToggleSound,
}) => {
  return (
    <header className="sticky top-0 z-40 border-b border-white/[0.08] bg-black/75 backdrop-blur-2xl transition-all">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
        {/* Brand */}
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-2xl bg-gradient-to-tr from-zinc-800 to-zinc-900 border border-white/10 flex items-center justify-center shadow-inner">
            <span className="text-base select-none">🎮</span>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold tracking-tight text-white font-sans">
                RECREO
              </span>
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded-full bg-white/10 text-zinc-300 border border-white/10">
                CASINO & CHAT
              </span>
            </div>
            <p className="text-[11px] text-zinc-400 hidden sm:block tracking-tight">
              Sin profes, sin deberes. Solo apuestas y pique sano.
            </p>
          </div>
        </div>

        {/* Right Actions: Coins, Leaderboard, Chat & Sound */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Sound Toggle */}
          <button
            onClick={() => {
              onToggleSound();
              sound.tap();
            }}
            title={soundEnabled ? 'Silenciar sonidos' : 'Activar sonidos'}
            className="p-2 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] text-zinc-400 hover:text-white border border-white/[0.08] transition-all cursor-pointer"
          >
            {soundEnabled ? <Volume2 className="w-4 h-4 text-emerald-400" /> : <VolumeX className="w-4 h-4 text-zinc-500" />}
          </button>

          {/* Ranking Button */}
          <button
            onClick={() => {
              onOpenLeaderboard();
              sound.tap();
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] border border-white/[0.08] text-xs font-medium text-zinc-300 hover:text-white transition-all cursor-pointer"
          >
            <Trophy className="w-3.5 h-3.5 text-amber-400" />
            <span className="hidden sm:inline">Top Clase</span>
          </button>

          {/* Chat Drawer Toggle (Mobile / Floating) */}
          <button
            onClick={() => {
              onToggleChat();
              sound.tap();
            }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-medium transition-all cursor-pointer ${
              isChatOpen
                ? 'bg-blue-500/20 text-blue-300 border-blue-500/40'
                : 'bg-white/[0.05] hover:bg-white/[0.1] border-white/[0.08] text-zinc-300'
            }`}
          >
            <MessageCircle className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">El Chat</span>
          </button>

          {/* Coins Balance & Faucet Button */}
          <div className="flex items-center bg-white/[0.06] border border-white/[0.1] rounded-2xl p-1 pl-3 shadow-inner">
            <div className="flex items-center gap-1.5 mr-2">
              <Coins className="w-4 h-4 text-amber-400 drop-shadow-[0_0_8px_rgba(251,191,36,0.5)]" />
              <span className="text-xs sm:text-sm font-bold font-mono text-white tracking-tight">
                {user.coins.toLocaleString('es-ES')}
              </span>
              <span className="text-[10px] text-zinc-400 font-mono hidden sm:inline">🪙</span>
            </div>

            <button
              onClick={() => {
                onOpenFaucet();
                sound.tap();
              }}
              title="Pedir la Beca / Recargar fichas gratis"
              className="px-2.5 py-1 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black text-xs font-bold font-mono transition-transform active:scale-95 flex items-center gap-1 shadow-md cursor-pointer"
            >
              <Plus className="w-3 h-3 stroke-[3]" />
              <span className="text-[11px]">Beca</span>
            </button>
          </div>

          {/* User Avatar & Nickname */}
          <div className="flex items-center gap-2 pl-1">
            <img
              src={user.avatar_url}
              alt={user.username}
              className="w-8 h-8 rounded-full bg-zinc-800 border border-white/10"
            />
          </div>
        </div>
      </div>
    </header>
  );
};
