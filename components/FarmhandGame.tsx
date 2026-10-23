'use client';

import React, { useState, useRef, useEffect } from 'react';
import {
  RotateCcw,
  Maximize2,
  Minimize2,
  ExternalLink,
  Sprout,
  GitBranch,
  Info,
  ShieldCheck,
  CheckCircle2,
} from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { sound } from '@/lib/audio';

export interface FarmhandGameProps {
  userCoins?: number;
  userId?: string;
  onUpdateCoins?: (delta: number) => void;
  onNavigateGame?: (game: string) => void;
}

export const FarmhandGame: React.FC<FarmhandGameProps> = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Gestión de pantalla completa nativa
  const handleToggleFullscreen = () => {
    sound.tap();
    if (!containerRef.current) return;

    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(() => {});
      setIsFullscreen(false);
    }
  };

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  // Recargar el juego dentro del marco
  const handleReload = () => {
    sound.tap();
    if (iframeRef.current) {
      setIsLoading(true);
      iframeRef.current.src = '/farmhand/index.html';
    }
  };

  return (
    <div ref={containerRef} className="w-full space-y-3">
      {/* 1. Cabecera Apple Oficial de Farmhand */}
      <Card className="p-3.5 sm:p-4 rounded-2xl bg-surface border border-border/80 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-surface-raised border border-border/70 flex items-center justify-center text-foreground shrink-0">
              <Sprout className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-sm sm:text-base font-semibold tracking-tight text-foreground">
                  Farmhand
                </h1>
                <Badge variant="outline" className="text-[10px] font-mono text-foreground-muted border-border/60">
                  v1.24.3 Oficial
                </Badge>
              </div>
              <p className="text-[11px] text-foreground-muted">
                Juego original de simulación agrícola y fluctuación de mercado por Jeremy Kahn.
              </p>
            </div>
          </div>

          {/* Acciones de control */}
          <div className="flex items-center gap-1.5 self-end sm:self-center">
            <Button
              variant="secondary"
              size="sm"
              onClick={handleReload}
              className="rounded-xl text-xs h-8 px-2.5 gap-1.5"
              title="Reiniciar o recargar el juego"
            >
              <RotateCcw className="w-3.5 h-3.5 text-foreground-muted" />
              <span className="hidden sm:inline">Recargar</span>
            </Button>

            <Button
              variant="secondary"
              size="sm"
              onClick={handleToggleFullscreen}
              className="rounded-xl text-xs h-8 px-2.5 gap-1.5"
              title="Alternar pantalla completa"
            >
              {isFullscreen ? (
                <>
                  <Minimize2 className="w-3.5 h-3.5 text-foreground-muted" />
                  <span className="hidden sm:inline">Salir de pantalla completa</span>
                </>
              ) : (
                <>
                  <Maximize2 className="w-3.5 h-3.5 text-foreground-muted" />
                  <span className="hidden sm:inline">Pantalla completa</span>
                </>
              )}
            </Button>

            <a
              href="/farmhand/index.html"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-medium bg-surface-raised border border-border/60 text-foreground-muted hover:text-foreground transition-colors h-8"
              title="Abrir en pestaña independiente"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Pestaña completa</span>
            </a>

            <a
              href="https://github.com/jeremyckahn/farmhand"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center w-8 h-8 rounded-xl bg-surface-raised border border-border/60 text-foreground-muted hover:text-foreground transition-colors"
              title="Repositorio oficial en GitHub"
            >
              <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
                <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
              </svg>
            </a>
          </div>
        </div>
      </Card>

      {/* 2. Marco del Juego (Iframe del repositorio real) */}
      <div
        className={`relative w-full rounded-2xl border border-border/80 bg-[#444] overflow-hidden shadow-xs transition-all ${
          isFullscreen ? 'h-screen rounded-none border-none' : 'min-h-[640px] h-[calc(100vh-16rem)]'
        }`}
      >
        {isLoading && (
          <div className="absolute inset-0 bg-surface flex flex-col items-center justify-center gap-2 z-10 animate-in fade-in duration-200">
            <Sprout className="w-7 h-7 text-emerald-400 animate-pulse" />
            <span className="text-xs font-mono text-foreground-muted uppercase tracking-wider">
              Cargando Farmhand...
            </span>
          </div>
        )}

        <iframe
          ref={iframeRef}
          src="/farmhand/index.html"
          title="Farmhand by Jeremy Kahn"
          className="w-full h-full border-0 block"
          allow="fullscreen"
          onLoad={() => setIsLoading(false)}
        />
      </div>

      {/* 3. Información del Proyecto y Guardado */}
      <Card className="p-3 sm:p-3.5 rounded-2xl bg-surface border border-border/70 text-xs text-foreground-muted flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
        <div className="flex items-center gap-2">
          <Info className="w-4 h-4 text-foreground-subtle shrink-0" />
          <span>
            Compilado e importado directamente del repositorio oficial de GitHub de Jeremy Kahn (código abierto GPL-2.0).
          </span>
        </div>
        <div className="flex items-center gap-2 text-foreground-subtle shrink-0 font-mono text-[11px]">
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
          <span>Guardado local persistente</span>
        </div>
      </Card>
    </div>
  );
};
