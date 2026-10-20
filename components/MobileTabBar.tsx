'use client';

import React from 'react';
import { Target, TrendingUp, Calendar, MessageSquare, Trophy, Server, CircleDot, Zap, Gamepad2, Coins } from 'lucide-react';
import { sound } from '@/lib/audio';

interface MobileTabBarProps {
  activeTab: 'angry' | 'crash' | 'mines' | 'roulette' | 'russian_roulette' | 'calendar';
  onSelectTab: (tab: 'angry' | 'crash' | 'mines' | 'roulette' | 'russian_roulette' | 'calendar') => void;
  isChatOpen: boolean;
  onToggleChat: () => void;
  onOpenLeaderboard: () => void;
  onOpenFaucet?: () => void;
}

export const MobileTabBar: React.FC<MobileTabBarProps> = ({
  activeTab,
  onSelectTab,
  isChatOpen,
  onToggleChat,
  onOpenLeaderboard,
  onOpenFaucet,
}) => {
  const isArcade = activeTab !== 'calendar';

  return (
    <nav
      aria-label="Navegación móvil"
      className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-[#090b0e]/95 backdrop-blur-xl border-t border-white/[0.08] px-3 pt-2 pb-[max(0.6rem,env(safe-area-inset-bottom))] shadow-lg"
    >
      <div className="max-w-md mx-auto grid grid-cols-4 gap-1 items-center">
        {/* Horario y Tareas */}
        <button
          onClick={() => {
            onSelectTab('calendar');
            sound.tap();
          }}
          className={`flex flex-col items-center justify-center py-1.5 rounded-xl transition-colors cursor-pointer ${
            !isArcade
              ? 'text-white'
              : 'text-zinc-500 hover:text-zinc-300'
          }`}
        >
          <div
            className={`p-1.5 rounded-lg transition-colors ${
              !isArcade ? 'bg-blue-500/20 text-blue-400' : ''
            }`}
          >
            <Calendar className="w-5 h-5" />
          </div>
          <span className="text-[10px] font-mono font-medium mt-1">
            Horario
          </span>
        </button>

        {/* Recreo (Juegos) */}
        <button
          onClick={() => {
            if (!isArcade) onSelectTab('russian_roulette');
            sound.tap();
          }}
          className={`flex flex-col items-center justify-center py-1.5 rounded-xl transition-colors cursor-pointer ${
            isArcade
              ? 'text-amber-400'
              : 'text-zinc-500 hover:text-zinc-300'
          }`}
        >
          <div
            className={`p-1.5 rounded-lg transition-colors ${
              isArcade ? 'bg-amber-400/20 text-amber-400' : ''
            }`}
          >
            <Gamepad2 className="w-5 h-5" />
          </div>
          <span className="text-[10px] font-mono font-medium mt-1">
            Recreo
          </span>
        </button>

        {/* Chat en directo */}
        <button
          onClick={() => {
            onToggleChat();
            sound.tap();
          }}
          className={`relative flex flex-col items-center justify-center py-1.5 rounded-xl transition-colors cursor-pointer ${
            isChatOpen
              ? 'text-white'
              : 'text-zinc-500 hover:text-zinc-300'
          }`}
        >
          <div
            className={`p-1.5 rounded-lg transition-colors ${
              isChatOpen ? 'bg-white/20 text-white' : ''
            }`}
          >
            <MessageSquare className="w-5 h-5" />
          </div>
          <span className="text-[10px] font-mono font-medium mt-1">
            Chat
          </span>
        </button>

        {/* Ranking & Fichas */}
        <button
          onClick={() => {
            onOpenLeaderboard();
            sound.tap();
          }}
          className="flex flex-col items-center justify-center py-1.5 rounded-xl text-zinc-500 hover:text-zinc-300 transition-colors cursor-pointer"
        >
          <div className="p-1.5 rounded-lg">
            <Trophy className="w-5 h-5 text-amber-400/80" />
          </div>
          <span className="text-[10px] font-mono font-medium mt-1">
            Ranking
          </span>
        </button>
      </div>
    </nav>
  );
};
