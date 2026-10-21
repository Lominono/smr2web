'use client';

import React from 'react';
import { Calendar, MessageSquare, Gamepad2, Zap, Settings } from 'lucide-react';
import { sound } from '@/lib/audio';

interface MobileTabBarProps {
  activeTab: 'angry' | 'crash' | 'mines' | 'roulette' | 'russian_roulette' | 'calendar';
  onSelectTab: (tab: 'angry' | 'crash' | 'mines' | 'roulette' | 'russian_roulette' | 'calendar') => void;
  isChatOpen: boolean;
  onToggleChat: () => void;
  onOpenLeaderboard: () => void;
  onOpenSettings?: () => void;
  onOpenFaucet?: () => void;
}

export const MobileTabBar: React.FC<MobileTabBarProps> = ({
  activeTab,
  onSelectTab,
  isChatOpen,
  onToggleChat,
  onOpenSettings,
}) => {
  const isRussianRoulette = activeTab === 'russian_roulette';
  const isOtherGames = activeTab !== 'calendar' && activeTab !== 'russian_roulette';

  return (
    <nav
      aria-label="Navegación móvil"
      className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-[#090b0e]/95 backdrop-blur-xl border-t border-white/[0.08] px-2 pt-1.5 pb-[max(0.5rem,env(safe-area-inset-bottom))] shadow-lg"
    >
      <div className="max-w-md mx-auto grid grid-cols-5 gap-1 items-center">
        {/* Horario y Tareas */}
        <button
          onClick={() => {
            onSelectTab('calendar');
            sound.tap();
          }}
          className={`flex flex-col items-center justify-center py-1 rounded-xl transition-colors cursor-pointer ${
            activeTab === 'calendar' ? 'text-white' : 'text-zinc-500 hover:text-zinc-300'
          }`}
        >
          <div
            className={`p-1 rounded-lg transition-colors ${
              activeTab === 'calendar' ? 'bg-blue-500/20 text-blue-400' : ''
            }`}
          >
            <Calendar className="w-4 h-4" />
          </div>
          <span className="text-[9px] font-mono font-medium mt-0.5">Horario</span>
        </button>

        {/* Ruleta Rusa Direct Access */}
        <button
          onClick={() => {
            onSelectTab('russian_roulette');
            sound.tap();
          }}
          className={`flex flex-col items-center justify-center py-1 rounded-xl transition-colors cursor-pointer ${
            isRussianRoulette ? 'text-amber-400' : 'text-zinc-500 hover:text-zinc-300'
          }`}
        >
          <div
            className={`p-1 rounded-lg transition-colors ${
              isRussianRoulette ? 'bg-amber-400/20 text-amber-400' : ''
            }`}
          >
            <Zap className="w-4 h-4" />
          </div>
          <span className="text-[9px] font-mono font-medium mt-0.5">R. Rusa</span>
        </button>

        {/* Otros Juegos (Arcade) */}
        <button
          onClick={() => {
            if (!isOtherGames) onSelectTab('crash');
            sound.tap();
          }}
          className={`flex flex-col items-center justify-center py-1 rounded-xl transition-colors cursor-pointer ${
            isOtherGames ? 'text-white' : 'text-zinc-500 hover:text-zinc-300'
          }`}
        >
          <div
            className={`p-1 rounded-lg transition-colors ${
              isOtherGames ? 'bg-white/20 text-white' : ''
            }`}
          >
            <Gamepad2 className="w-4 h-4" />
          </div>
          <span className="text-[9px] font-mono font-medium mt-0.5">Arcade</span>
        </button>

        {/* Chat */}
        <button
          onClick={() => {
            onToggleChat();
            sound.tap();
          }}
          className={`relative flex flex-col items-center justify-center py-1 rounded-xl transition-colors cursor-pointer ${
            isChatOpen ? 'text-white' : 'text-zinc-500 hover:text-zinc-300'
          }`}
        >
          <div
            className={`p-1 rounded-lg transition-colors ${
              isChatOpen ? 'bg-white/20 text-white' : ''
            }`}
          >
            <MessageSquare className="w-4 h-4" />
          </div>
          <span className="text-[9px] font-mono font-medium mt-0.5">Chat</span>
        </button>

        {/* Ajustes de Usuario */}
        <button
          onClick={() => {
            if (onOpenSettings) onOpenSettings();
            sound.tap();
          }}
          className="flex flex-col items-center justify-center py-1 rounded-xl text-zinc-500 hover:text-zinc-300 transition-colors cursor-pointer"
        >
          <div className="p-1 rounded-lg">
            <Settings className="w-4 h-4 text-zinc-400" />
          </div>
          <span className="text-[9px] font-mono font-medium mt-0.5">Ajustes</span>
        </button>
      </div>
    </nav>
  );
};
