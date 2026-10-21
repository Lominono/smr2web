'use client';

import React from 'react';
import { Sparkles, Calendar, Zap, Trophy, Menu } from 'lucide-react';
import { sound } from '@/lib/audio';

interface MobileTabBarProps {
  activeTab: string;
  onSelectTab: (tab: string) => void;
  onOpenDrawer: () => void;
  onOpenLeaderboard: () => void;
}

export const MobileTabBar: React.FC<MobileTabBarProps> = ({
  activeTab,
  onSelectTab,
  onOpenDrawer,
  onOpenLeaderboard,
}) => {
  return (
    <nav
      aria-label="Navegación móvil inferior"
      className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-[#090b0e]/95 backdrop-blur-xl border-t border-white/[0.08] px-2 pt-1.5 pb-[max(0.6rem,env(safe-area-inset-bottom))] shadow-2xl"
    >
      <div className="max-w-md mx-auto grid grid-cols-5 gap-1 items-center">
        {/* 1. Feed / Inicio */}
        <button
          type="button"
          onClick={() => {
            onSelectTab('feed');
            sound.tap();
          }}
          className={`flex flex-col items-center justify-center py-1 rounded-xl transition-all cursor-pointer active:scale-90 ${
            activeTab === 'feed' ? 'text-white' : 'text-zinc-500 hover:text-zinc-300'
          }`}
        >
          <div
            className={`p-1.5 rounded-xl transition-colors ${
              activeTab === 'feed' ? 'bg-amber-400 text-black shadow-sm' : ''
            }`}
          >
            <Sparkles className="w-4 h-4" />
          </div>
          <span className="text-[10px] font-mono font-medium mt-0.5">Inicio</span>
        </button>

        {/* 2. Horario */}
        <button
          type="button"
          onClick={() => {
            onSelectTab('calendar');
            sound.tap();
          }}
          className={`flex flex-col items-center justify-center py-1 rounded-xl transition-all cursor-pointer active:scale-90 ${
            activeTab === 'calendar' ? 'text-white' : 'text-zinc-500 hover:text-zinc-300'
          }`}
        >
          <div
            className={`p-1.5 rounded-xl transition-colors ${
              activeTab === 'calendar' ? 'bg-blue-500/20 text-blue-400' : ''
            }`}
          >
            <Calendar className="w-4 h-4" />
          </div>
          <span className="text-[10px] font-mono font-medium mt-0.5">Horario</span>
        </button>

        {/* 3. Ruleta Rusa */}
        <button
          type="button"
          onClick={() => {
            onSelectTab('russian_roulette');
            sound.tap();
          }}
          className={`flex flex-col items-center justify-center py-1 rounded-xl transition-all cursor-pointer active:scale-90 ${
            activeTab === 'russian_roulette' ? 'text-amber-400' : 'text-zinc-500 hover:text-zinc-300'
          }`}
        >
          <div
            className={`p-1.5 rounded-xl transition-colors ${
              activeTab === 'russian_roulette' ? 'bg-amber-400/20 text-amber-400' : ''
            }`}
          >
            <Zap className="w-4 h-4" />
          </div>
          <span className="text-[10px] font-mono font-medium mt-0.5">R. Rusa</span>
        </button>

        {/* 4. Ranking Top */}
        <button
          type="button"
          onClick={() => {
            onOpenLeaderboard();
            sound.tap();
          }}
          className="flex flex-col items-center justify-center py-1 rounded-xl text-zinc-500 hover:text-zinc-300 transition-all cursor-pointer active:scale-90"
        >
          <div className="p-1.5 rounded-xl">
            <Trophy className="w-4 h-4 text-amber-400" />
          </div>
          <span className="text-[10px] font-mono font-medium mt-0.5">Top</span>
        </button>

        {/* 5. The 3-Line Button (Menú Desplegable) */}
        <button
          type="button"
          onClick={() => {
            onOpenDrawer();
            sound.tap();
          }}
          className="flex flex-col items-center justify-center py-1 rounded-xl text-zinc-400 hover:text-white transition-all cursor-pointer group active:scale-90"
        >
          <div className="p-1.5 rounded-xl bg-white/[0.04] group-hover:bg-white/[0.08] transition-colors border border-white/[0.08]">
            <Menu className="w-4 h-4 text-amber-300" />
          </div>
          <span className="text-[10px] font-mono font-medium mt-0.5 text-zinc-300">Menú</span>
        </button>
      </div>
    </nav>
  );
};
