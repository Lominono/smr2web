'use client';

import React from 'react';
import { Target, Clock, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/Button';

interface AngryCableGameProps {
  userCoins?: number;
  onUpdateCoins?: (delta: number) => void;
  onBroadcastWin?: (game: 'angry', multiplier: number, winAmount: number) => void;
  onNavigateGame?: (game: string) => void;
}

export const AngryCableGame: React.FC<AngryCableGameProps> = ({
  onNavigateGame,
}) => {
  return (
    <div className="w-full max-w-xl mx-auto py-12 px-4 animate-in fade-in duration-150">
      <div className="rounded-2xl border border-border/80 bg-surface p-6 sm:p-8 text-center space-y-4 shadow-xs">
        <div className="mx-auto w-12 h-12 rounded-xl bg-surface-raised border border-border flex items-center justify-center text-foreground-muted">
          <Target className="w-6 h-6 text-foreground-subtle" />
        </div>

        <div className="space-y-1.5">
          <h2 className="text-base font-semibold tracking-tight text-foreground">
            En mantenimiento
          </h2>
          <p className="text-xs text-foreground-muted max-w-sm mx-auto leading-relaxed">
            Esta sección está siendo actualizada para mejorar su rendimiento y compatibilidad.
          </p>
        </div>

        <div className="pt-2">
          {onNavigateGame && (
            <Button
              variant="secondary"
              size="sm"
              onClick={() => onNavigateGame('crash')}
              className="text-xs rounded-lg"
            >
              <span>Ver otros juegos de recreo</span>
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};
