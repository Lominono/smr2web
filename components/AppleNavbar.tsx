'use client';

import React from 'react';
import { Volume2, VolumeX, Coins, Plus, Trophy, MessageSquare, LogIn, LogOut, User } from 'lucide-react';
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
    <header className="sticky top-0 z-40 border-b border-white/[0.08] bg-black/80 backdrop-blur-xl">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
        {/* Brand */}
        <div className="flex items-center gap-2.5">
          <div className="w-5 h-5 rounded-md bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
            <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
          </div>
          <span className="text-sm font-semibold tracking-tight text-white font-mono">
            RECREO
          </span>
          <span className="text-[11px] text-zinc-500 font-mono hidden sm:inline">
            / sala de juegos
          </span>
        </div>

        {/* Right actions */}
        <div className="flex items-center gap-2">
          {/* Sound toggle */}
          <button
            onClick={() => {
              onToggleSound();
              sound.tap();
            }}
            title={soundEnabled ? 'Silenciar audio' : 'Activar audio'}
            className="p-2 rounded-lg text-zinc-400 hover:text-white hover:bg-white/[0.06] transition-colors"
          >
            {soundEnabled ? <Volume2 className="w-4 h-4 text-emerald-400" /> : <VolumeX className="w-4 h-4 text-zinc-600" />}
          </button>

          {/* Ranking */}
          <button
            onClick={() => {
              onOpenLeaderboard();
              sound.tap();
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono text-zinc-300 hover:text-white hover:bg-white/[0.06] transition-colors cursor-pointer"
          >
            <Trophy className="w-3.5 h-3.5 text-amber-400" />
            <span className="hidden sm:inline">Top</span>
          </button>

          {/* Chat mobile toggle */}
          <button
            onClick={() => {
              onToggleChat();
              sound.tap();
            }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono transition-colors cursor-pointer ${
              isChatOpen
                ? 'bg-white text-black font-semibold'
                : 'text-zinc-300 hover:text-white hover:bg-white/[0.06]'
            }`}
          >
            <MessageSquare className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Chat</span>
          </button>

          {/* User state */}
          {user ? (
            <div className="flex items-center gap-2 pl-1 border-l border-white/[0.08]">
              {/* Coin Pill */}
              <div className="flex items-center bg-white/[0.05] border border-white/[0.08] rounded-xl px-2.5 py-1">
                <Coins className="w-3.5 h-3.5 text-amber-400 mr-1.5" />
                <span className="text-xs font-mono font-medium text-white">
                  {user.coins.toLocaleString('es-ES')}
                </span>
                <button
                  onClick={() => {
                    onOpenFaucet();
                    sound.tap();
                  }}
                  title="Recargar saldo"
                  className="ml-2 px-1.5 py-0.5 rounded-md bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 text-[10px] font-mono font-semibold transition-colors"
                >
                  +
                </button>
              </div>

              {/* Username & Sign Out */}
              <span className="hidden md:inline text-xs font-mono text-zinc-400">
                @{user.username}
              </span>
              <button
                onClick={() => {
                  onSignOut();
                  sound.tap();
                }}
                title="Cerrar sesión"
                className="p-1.5 rounded-lg text-zinc-500 hover:text-rose-400 transition-colors"
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
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white text-black text-xs font-mono font-semibold hover:bg-zinc-200 transition-colors cursor-pointer"
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
