'use client';

import React from 'react';
import {
  Sprout,
  Clock,
  ArrowRight,
  MessageSquare,
  Zap,
  Wine,
  AlertTriangle,
  HeartHandshake,
} from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { sound } from '@/lib/audio';

export interface FarmhandGameProps {
  userCoins?: number;
  userId?: string;
  onUpdateCoins?: (delta: number) => void;
  onNavigateGame?: (game: string) => void;
}

export const FarmhandGame: React.FC<FarmhandGameProps> = ({
  onNavigateGame,
}) => {
  return (
    <div className="w-full max-w-3xl mx-auto space-y-4 animate-in fade-in duration-200 py-4 px-2 sm:px-0">
      {/* Tarjeta Principal de Mantenimiento / Cierre */}
      <Card className="relative overflow-hidden p-6 sm:p-10 rounded-3xl bg-surface border border-border/80 shadow-lg text-center space-y-6">
        {/* Luz ambiental sutil */}
        <div className="absolute -top-16 -right-16 w-48 h-48 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-16 -left-16 w-48 h-48 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* Icono con aro de construcción */}
        <div className="relative mx-auto w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-surface-raised border border-border flex items-center justify-center shadow-xs">
          <Sprout className="w-8 h-8 sm:w-10 sm:h-10 text-emerald-400 opacity-70" />
          <div className="absolute -bottom-1.5 -right-1.5 w-6 h-6 rounded-full bg-amber-500/20 border border-amber-500/60 flex items-center justify-center text-amber-400 shadow-sm">
            <Clock className="w-3.5 h-3.5" />
          </div>
        </div>

        {/* Encabezado y Disculpas Sinceras */}
        <div className="space-y-2 max-w-lg mx-auto">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs font-mono font-medium">
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>Módulo Cerrado Temporalmente</span>
          </div>

          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground pt-1">
            El Huerto SMR aún no está listo
          </h1>

          <p className="text-xs sm:text-sm text-foreground-muted leading-relaxed">
            Lamentamos mucho las molestias. Hemos cerrado temporalmente este juego porque todavía
            se encuentra en desarrollo y no está completamente preparado para su lanzamiento.
          </p>
        </div>

        {/* Caja de explicación honesta y sin adornos */}
        <div className="p-4 sm:p-5 rounded-2xl bg-surface-raised/60 border border-border/60 text-left space-y-3 max-w-xl mx-auto text-xs text-foreground-muted">
          <div className="flex items-center gap-2 text-foreground font-semibold">
            <HeartHandshake className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>Mensaje del equipo de 2º SMR</span>
          </div>

          <p className="leading-relaxed">
            Queremos que la experiencia de juego sea fluida, segura y que tu progreso no se pierda.
            Actualmente estamos ajustando el sistema de guardado en la nube y el equilibrio de fichas
            para evitar errores durante las clases.
          </p>

          <p className="leading-relaxed text-foreground-subtle italic">
            Pedimos sinceras disculpas a todos los compañeros por la espera. En cuanto esté 100% probado
            y optimizado, volveremos a abrir el huerto para toda la clase.
          </p>
        </div>

        {/* Alternativas disponibles mientras tanto */}
        <div className="space-y-3 max-w-lg mx-auto pt-2">
          <span className="text-[11px] font-mono uppercase tracking-wider text-foreground-subtle block">
            Juegos y secciones activas mientras tanto:
          </span>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <button
              type="button"
              onClick={() => {
                sound.tap();
                onNavigateGame?.('feed');
              }}
              className="p-3 rounded-xl bg-surface-raised hover:bg-surface-hover border border-border text-left transition-all cursor-pointer active:scale-95 space-y-1"
            >
              <div className="flex items-center justify-between text-foreground font-semibold text-xs">
                <span className="flex items-center gap-1.5">
                  <MessageSquare className="w-3.5 h-3.5 text-sky-400" />
                  <span>Feed de clase</span>
                </span>
                <ArrowRight className="w-3 h-3 text-foreground-subtle" />
              </div>
              <p className="text-[10px] text-foreground-subtle">Muro y publicaciones</p>
            </button>

            <button
              type="button"
              onClick={() => {
                sound.tap();
                onNavigateGame?.('russian_roulette');
              }}
              className="p-3 rounded-xl bg-surface-raised hover:bg-surface-hover border border-border text-left transition-all cursor-pointer active:scale-95 space-y-1"
            >
              <div className="flex items-center justify-between text-foreground font-semibold text-xs">
                <span className="flex items-center gap-1.5">
                  <Zap className="w-3.5 h-3.5 text-amber-400" />
                  <span>Ruleta Rusa</span>
                </span>
                <ArrowRight className="w-3 h-3 text-foreground-subtle" />
              </div>
              <p className="text-[10px] text-foreground-subtle">Duelos tácticos online</p>
            </button>

            <button
              type="button"
              onClick={() => {
                sound.tap();
                onNavigateGame?.('party_idle');
              }}
              className="p-3 rounded-xl bg-surface-raised hover:bg-surface-hover border border-border text-left transition-all cursor-pointer active:scale-95 space-y-1"
            >
              <div className="flex items-center justify-between text-foreground font-semibold text-xs">
                <span className="flex items-center gap-1.5">
                  <Wine className="w-3.5 h-3.5 text-rose-400" />
                  <span>El Botellón</span>
                </span>
                <ArrowRight className="w-3 h-3 text-foreground-subtle" />
              </div>
              <p className="text-[10px] text-foreground-subtle">Farmeo de aula idle</p>
            </button>
          </div>
        </div>

        {/* Botón de retorno destacado */}
        <div className="pt-2">
          <Button
            variant="secondary"
            size="md"
            onClick={() => {
              sound.tap();
              onNavigateGame?.('feed');
            }}
            className="rounded-xl px-5 text-xs font-semibold cursor-pointer"
          >
            <span>Volver al muro de clase</span>
          </Button>
        </div>
      </Card>
    </div>
  );
};

export default FarmhandGame;
