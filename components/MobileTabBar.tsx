'use client';

import React from 'react';
import { MessageSquare, Calendar, Zap, Trophy, Menu } from 'lucide-react';
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
      aria-label="Navegación móvil principal"
      className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-black/85 backdrop-blur-2xl border-t border-neutral-800/80 px-2 pt-1.5 pb-[calc(0.5rem+env(safe-area-inset-bottom,0px))] select-none transition-colors"
    >
      <div className="max-w-md mx-auto grid grid-cols-5 gap-1 items-center font-sans">
        {/* 1. Feed */}
        <button
          type="button"
          onClick={() => {
            sound.tap();
            onSelectTab('feed');
          }}
          aria-label="Ir al Feed"
          className={`min-h-[48px] flex flex-col items-center justify-center py-1 rounded-xl transition-all cursor-pointer active:scale-90 touch-manipulation ${
            activeTab === 'feed'
              ? 'text-white font-semibold'
              : 'text-neutral-400 hover:text-neutral-200'
          }`}
        >
          <MessageSquare className="w-5 h-5 transition-transform" strokeWidth={activeTab === 'feed' ? 2.2 : 1.7} />
          <span className="text-[10px] mt-1 tracking-tight">Feed</span>
        </button>

        {/* 2. Horario */}
        <button
          type="button"
          onClick={() => {
            sound.tap();
            onSelectTab('calendar');
          }}
          aria-label="Ver horario y tareas"
          className={`min-h-[48px] flex flex-col items-center justify-center py-1 rounded-xl transition-all cursor-pointer active:scale-90 touch-manipulation ${
            activeTab === 'calendar'
              ? 'text-white font-semibold'
              : 'text-neutral-400 hover:text-neutral-200'
          }`}
        >
          <Calendar className="w-5 h-5 transition-transform" strokeWidth={activeTab === 'calendar' ? 2.2 : 1.7} />
          <span className="text-[10px] mt-1 tracking-tight">Horario</span>
        </button>

        {/* 3. Ruleta Rusa */}
        <button
          type="button"
          onClick={() => {
            sound.tap();
            onSelectTab('russian_roulette');
          }}
          aria-label="Jugar Ruleta Rusa"
          className={`min-h-[48px] flex flex-col items-center justify-center py-1 rounded-xl transition-all cursor-pointer active:scale-90 touch-manipulation ${
            activeTab === 'russian_roulette'
              ? 'text-white font-semibold'
              : 'text-neutral-400 hover:text-neutral-200'
          }`}
        >
          <Zap className="w-5 h-5 transition-transform" strokeWidth={activeTab === 'russian_roulette' ? 2.2 : 1.7} />
          <span className="text-[10px] mt-1 tracking-tight">R. Rusa</span>
        </button>

        {/* 4. Ranking */}
        <button
          type="button"
          onClick={() => {
            sound.tap();
            onOpenLeaderboard();
          }}
          aria-label="Ver clasificación"
          className="min-h-[48px] flex flex-col items-center justify-center py-1 rounded-xl text-neutral-400 hover:text-neutral-200 transition-all cursor-pointer active:scale-90 touch-manipulation"
        >
          <Trophy className="w-5 h-5 text-amber-400" strokeWidth={1.8} />
          <span className="text-[10px] mt-1 tracking-tight">Ranking</span>
        </button>

        {/* 5. Menú */}
        <button
          type="button"
          onClick={() => {
            sound.tap();
            onOpenDrawer();
          }}
          aria-label="Abrir menú"
          className="min-h-[48px] flex flex-col items-center justify-center py-1 rounded-xl text-neutral-400 hover:text-neutral-200 transition-all cursor-pointer active:scale-90 touch-manipulation"
        >
          <Menu className="w-5 h-5" strokeWidth={1.7} />
          <span className="text-[10px] mt-1 tracking-tight">Más</span>
        </button>
      </div>
    </nav>
  );
};
