'use client';

import React from 'react';
import { MessageSquare, Calendar, Zap, Trophy, Menu } from 'lucide-react';

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
      aria-label="Navegación móvil"
      className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-surface/95 backdrop-blur-xs border-t border-border px-2 pt-1 pb-[max(0.5rem,env(safe-area-inset-bottom))]"
    >
      <div className="max-w-md mx-auto grid grid-cols-5 gap-1 items-center">
        {/* 1. Feed */}
        <button
          type="button"
          onClick={() => onSelectTab('feed')}
          className={`flex flex-col items-center justify-center py-1.5 rounded-[var(--radius-sm)] transition-colors cursor-pointer ${
            activeTab === 'feed'
              ? 'text-foreground font-semibold'
              : 'text-foreground-subtle hover:text-foreground'
          }`}
        >
          <MessageSquare className="w-4 h-4" />
          <span className="text-[10px] mt-1 font-mono">Feed</span>
        </button>

        {/* 2. Horario */}
        <button
          type="button"
          onClick={() => onSelectTab('calendar')}
          className={`flex flex-col items-center justify-center py-1.5 rounded-[var(--radius-sm)] transition-colors cursor-pointer ${
            activeTab === 'calendar'
              ? 'text-foreground font-semibold'
              : 'text-foreground-subtle hover:text-foreground'
          }`}
        >
          <Calendar className="w-4 h-4" />
          <span className="text-[10px] mt-1 font-mono">Horario</span>
        </button>

        {/* 3. Ruleta Rusa */}
        <button
          type="button"
          onClick={() => onSelectTab('russian_roulette')}
          className={`flex flex-col items-center justify-center py-1.5 rounded-[var(--radius-sm)] transition-colors cursor-pointer ${
            activeTab === 'russian_roulette'
              ? 'text-accent font-semibold'
              : 'text-foreground-subtle hover:text-foreground'
          }`}
        >
          <Zap className="w-4 h-4" />
          <span className="text-[10px] mt-1 font-mono">R. Rusa</span>
        </button>

        {/* 4. Ranking */}
        <button
          type="button"
          onClick={onOpenLeaderboard}
          className="flex flex-col items-center justify-center py-1.5 rounded-[var(--radius-sm)] text-foreground-subtle hover:text-foreground transition-colors cursor-pointer"
        >
          <Trophy className="w-4 h-4" />
          <span className="text-[10px] mt-1 font-mono">Top</span>
        </button>

        {/* 5. Menú */}
        <button
          type="button"
          onClick={onOpenDrawer}
          className="flex flex-col items-center justify-center py-1.5 rounded-[var(--radius-sm)] text-foreground-subtle hover:text-foreground transition-colors cursor-pointer"
        >
          <Menu className="w-4 h-4" />
          <span className="text-[10px] mt-1 font-mono">Menú</span>
        </button>
      </div>
    </nav>
  );
};
