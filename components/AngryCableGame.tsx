'use client';

import React from 'react';
import {
  ShieldAlert,
  Lock,
  Wine,
  TrendingUp,
  Zap,
  Target,
  AlertTriangle,
} from 'lucide-react';
import { Card } from '@/components/ui/Card';
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
    <div className="w-full max-w-2xl mx-auto py-8 px-4 animate-in fade-in duration-200">
      <Card className="rounded-3xl border-border/80 bg-surface shadow-lg p-6 sm:p-8 text-center space-y-6">
        {/* Icono de Seguridad / Clausura */}
        <div className="relative mx-auto w-16 h-16 rounded-2xl bg-danger-subtle border border-danger/30 text-danger flex items-center justify-center shadow-xs">
          <Target className="w-8 h-8 opacity-40 absolute" />
          <Lock className="w-6 h-6 relative z-10" />
        </div>

        {/* Mensaje de Clausura */}
        <div className="space-y-3">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono font-semibold bg-danger-subtle text-danger border border-danger/25">
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>MANTENIMIENTO DE SEGURIDAD</span>
          </div>

          <h1 className="text-2xl font-bold tracking-tight text-foreground font-sans">
            Próximamente
          </h1>

          <div className="p-4 rounded-2xl bg-surface-raised border border-border/70 max-w-lg mx-auto">
            <p className="text-sm font-medium text-foreground leading-relaxed">
              &ldquo;Por culpa de David y sus abusos al sistema tuvimos que cerrar el juego de Angry Birds. Disculpen las molestias.&rdquo;
            </p>
          </div>

          <p className="text-xs text-foreground-muted max-w-md mx-auto leading-relaxed">
            La delegación de alumnos está revisando la física de los cables y los servidores que David intentó reventar para farmear fichas infinitas. Hasta nuevo aviso, el tirachinas queda bajo precinto.
          </p>
        </div>

        {/* Alternativas para jugar */}
        <div className="pt-2 border-t border-border/60 space-y-3">
          <p className="text-xs text-foreground-subtle font-medium">
            Mientras tanto, puedes seguir jugando en el resto del portal:
          </p>

          <div className="flex flex-wrap items-center justify-center gap-2">
            {onNavigateGame ? (
              <>
                <Button
                  variant="primary"
                  size="sm"
                  className="rounded-xl flex items-center gap-1.5"
                  onClick={() => onNavigateGame('party_idle')}
                >
                  <Wine className="w-3.5 h-3.5 text-accent" />
                  <span>Ir a El Botellón</span>
                </Button>

                <Button
                  variant="secondary"
                  size="sm"
                  className="rounded-xl flex items-center gap-1.5"
                  onClick={() => onNavigateGame('crash')}
                >
                  <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Jugar a Crash</span>
                </Button>

                <Button
                  variant="secondary"
                  size="sm"
                  className="rounded-xl flex items-center gap-1.5"
                  onClick={() => onNavigateGame('russian_roulette')}
                >
                  <Zap className="w-3.5 h-3.5 text-amber-400" />
                  <span>Ruleta Rusa</span>
                </Button>
              </>
            ) : (
              <span className="text-xs text-foreground-muted">
                Usa el menú superior para navegar a El Botellón o Crash.
              </span>
            )}
          </div>
        </div>
      </Card>
    </div>
  );
};
