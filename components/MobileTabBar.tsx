'use client';

import React from 'react';
import { Target, TrendingUp, Calendar, MessageSquare, Trophy, Server, CircleDot, Zap } from 'lucide-react';
import { sound } from '@/lib/audio';

interface MobileTabBarProps {
  activeTab: 'angry' | 'crash' | 'mines' | 'roulette' | 'russian_roulette' | 'calendar';
  onSelectTab: (tab: 'angry' | 'crash' | 'mines' | 'roulette' | 'russian_roulette' | 'calendar') => void;
  isChatOpen: boolean;
  onToggleChat: () => void;
  onOpenLeaderboard: () => void;
  isLiveActive?: boolean;
}

export const MobileTabBar: React.FC<MobileTabBarProps> = ({
  activeTab,
  onSelectTab,
  isChatOpen,
  onToggleChat,
  onOpenLeaderboard,
  isLiveActive = false,
}) => {
  return (
    <nav
      aria-label="Navegación móvil"
      className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-[#09090b]/90 backdrop-blur-2xl border-t border-white/[0.08] px-2 pt-1.5 pb-[max(0.5rem,env(safe-area-inset-bottom))] shadow-[0_-8px_25px_rgba(0,0,0,0.6)]"
    >
      <div className="max-w-md mx-auto grid grid-cols-7 gap-0.5 items-center">
        {/* Horario */}
        <button
          onClick={() => {
            onSelectTab('calendar');
            sound.tap();
          }}
          className={`relative flex flex-col items-center justify-center py-1 px-0.5 rounded-xl transition-all cursor-pointer ${
            activeTab === 'calendar'
              ? 'text-white'
              : 'text-zinc-500 hover:text-zinc-300'
          }`}
        >
          <div
            className={`relative p-1 rounded-lg transition-all ${
              activeTab === 'calendar' ? 'bg-blue-500/15 text-blue-400' : ''
            }`}
          >
            <Calendar className="w-4 h-4" />
            {isLiveActive && (
              <span className="absolute top-0.5 right-0.5 w-1.5 h-1.5 rounded-full bg-emerald-400 ring-1 ring-black animate-pulse" />
            )}
          </div>
          <span className="text-[9px] font-mono tracking-tight font-medium mt-0.5">
            Horario
          </span>
        </button>

        {/* Slingshot */}
        <button
          onClick={() => {
            onSelectTab('angry');
            sound.tap();
          }}
          className={`flex flex-col items-center justify-center py-1 px-0.5 rounded-xl transition-all cursor-pointer ${
            activeTab === 'angry'
              ? 'text-white'
              : 'text-zinc-500 hover:text-zinc-300'
          }`}
        >
          <div
            className={`p-1 rounded-lg transition-all ${
              activeTab === 'angry' ? 'bg-emerald-500/15 text-emerald-400' : ''
            }`}
          >
            <Target className="w-4 h-4" />
          </div>
          <span className="text-[9px] font-mono tracking-tight font-medium mt-0.5">
            Slingshot
          </span>
        </button>

        {/* Crash */}
        <button
          onClick={() => {
            onSelectTab('crash');
            sound.tap();
          }}
          className={`flex flex-col items-center justify-center py-1 px-0.5 rounded-xl transition-all cursor-pointer ${
            activeTab === 'crash'
              ? 'text-white'
              : 'text-zinc-500 hover:text-zinc-300'
          }`}
        >
          <div
            className={`p-1 rounded-lg transition-all ${
              activeTab === 'crash' ? 'bg-rose-500/15 text-rose-400' : ''
            }`}
          >
            <TrendingUp className="w-4 h-4" />
          </div>
          <span className="text-[9px] font-mono tracking-tight font-medium mt-0.5">
            Crash
          </span>
        </button>

        {/* Minas */}
        <button
          onClick={() => {
            onSelectTab('mines');
            sound.tap();
          }}
          className={`flex flex-col items-center justify-center py-1 px-0.5 rounded-xl transition-all cursor-pointer ${
            activeTab === 'mines'
              ? 'text-white'
              : 'text-zinc-500 hover:text-zinc-300'
          }`}
        >
          <div
            className={`p-1 rounded-lg transition-all ${
              activeTab === 'mines' ? 'bg-amber-500/15 text-amber-400' : ''
            }`}
          >
            <Server className="w-4 h-4" />
          </div>
          <span className="text-[9px] font-mono tracking-tight font-medium mt-0.5">
            Minas
          </span>
        </button>

        {/* Ruleta */}
        <button
          onClick={() => {
            onSelectTab('roulette');
            sound.tap();
          }}
          className={`flex flex-col items-center justify-center py-1 px-0.5 rounded-xl transition-all cursor-pointer ${
            activeTab === 'roulette'
              ? 'text-white'
              : 'text-zinc-500 hover:text-zinc-300'
          }`}
        >
          <div
            className={`p-1 rounded-lg transition-all ${
              activeTab === 'roulette' ? 'bg-yellow-500/15 text-yellow-400' : ''
            }`}
          >
            <CircleDot className="w-4 h-4" />
          </div>
          <span className="text-[9px] font-mono tracking-tight font-medium mt-0.5">
            Ruleta
          </span>
        </button>

        {/* Ruleta Rusa */}
        <button
          onClick={() => {
            onSelectTab('russian_roulette');
            sound.tap();
          }}
          className={`flex flex-col items-center justify-center py-1 px-0.5 rounded-xl transition-all cursor-pointer ${
            activeTab === 'russian_roulette'
              ? 'text-white'
              : 'text-zinc-500 hover:text-zinc-300'
          }`}
        >
          <div
            className={`p-1 rounded-lg transition-all ${
              activeTab === 'russian_roulette' ? 'bg-amber-400/20 text-amber-400' : ''
            }`}
          >
            <Zap className="w-4 h-4" />
          </div>
          <span className="text-[9px] font-mono tracking-tight font-medium mt-0.5">
            R. Rusa
          </span>
        </button>

        {/* Chat */}
        <button
          onClick={() => {
            onToggleChat();
            sound.tap();
          }}
          className={`flex flex-col items-center justify-center py-1 px-0.5 rounded-xl transition-all cursor-pointer ${
            isChatOpen
              ? 'text-white'
              : 'text-zinc-500 hover:text-zinc-300'
          }`}
        >
          <div
            className={`p-1 rounded-lg transition-all ${
              isChatOpen ? 'bg-white/15 text-white' : ''
            }`}
          >
            <MessageSquare className="w-4 h-4" />
          </div>
          <span className="text-[9px] font-mono tracking-tight font-medium mt-0.5">
            Chat
          </span>
        </button>
      </div>
    </nav>
  );
};
