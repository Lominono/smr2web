'use client';

import React, { useState, useRef, useEffect } from 'react';
import {
  RotateCcw,
  Maximize2,
  Minimize2,
  ExternalLink,
  Sprout,
  Coins,
  ArrowDownToLine,
  ArrowUpRight,
  CheckCircle2,
  Check,
  TrendingUp,
  Layers,
  HelpCircle,
  X,
} from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { sound } from '@/lib/audio';
import confetti from 'canvas-confetti';

export interface FarmhandGameProps {
  userCoins?: number;
  userId?: string;
  onUpdateCoins?: (delta: number) => void;
  onNavigateGame?: (game: string) => void;
}

const STORAGE_KEY_FARM_VAULT = 'smr2_farm_vault_';

export const FarmhandGame: React.FC<FarmhandGameProps> = ({
  userCoins = 200,
  userId = 'local',
  onUpdateCoins,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Economía agrícola integrada
  const [farmEarnings, setFarmEarnings] = useState<number>(0);
  const [justClaimed, setJustClaimed] = useState(false);
  const [showHelp, setShowHelp] = useState(false);

  // Cargar saldo acumulado en la granja
  useEffect(() => {
    try {
      const saved = localStorage.getItem(`${STORAGE_KEY_FARM_VAULT}${userId}`);
      if (saved) {
        setFarmEarnings(Number(saved));
      } else {
        // Inicializar con un fondo inicial de cosecha
        setFarmEarnings(50);
      }
    } catch {
      setFarmEarnings(50);
    }
  }, [userId]);

  // Simulación pasiva de cosecha basada en tiempo de juego (3 fichas cada 15 segundos)
  useEffect(() => {
    const interval = setInterval(() => {
      setFarmEarnings((prev) => {
        const next = prev + 3;
        try {
          localStorage.setItem(`${STORAGE_KEY_FARM_VAULT}${userId}`, String(next));
        } catch {}
        return next;
      });
    }, 15000);

    return () => clearInterval(interval);
  }, [userId]);

  // Pantalla completa nativa
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

  const handleReload = () => {
    sound.tap();
    if (iframeRef.current) {
      setIsLoading(true);
      iframeRef.current.src = '/farmhand/index.html';
    }
  };

  // Cobrar beneficios de la granja a la cuenta general SMR2
  const handleClaimToWallet = () => {
    if (farmEarnings <= 0 || !onUpdateCoins) return;

    sound.coinWin();
    confetti({ particleCount: 45, spread: 50, origin: { y: 0.6 } });

    onUpdateCoins(farmEarnings);
    try {
      localStorage.setItem(`${STORAGE_KEY_FARM_VAULT}${userId}`, '0');
    } catch {}

    setFarmEarnings(0);
    setJustClaimed(true);
    setTimeout(() => setJustClaimed(false), 2500);
  };

  // Inyectar capital desde SMR2 a la granja
  const handleInvestInFarm = () => {
    if (userCoins < 50 || !onUpdateCoins) {
      alert('Necesitas al menos 50 fichas en tu saldo de SMR2 para invertir en la granja.');
      return;
    }

    sound.tap();
    const investAmount = 50;
    onUpdateCoins(-investAmount);

    setFarmEarnings((prev) => {
      const next = prev + investAmount;
      try {
        localStorage.setItem(`${STORAGE_KEY_FARM_VAULT}${userId}`, String(next));
      } catch {}
      return next;
    });

    if (iframeRef.current?.contentWindow) {
      iframeRef.current.contentWindow.postMessage(
        { type: 'SMR2_INJECT_FUNDS', amount: investAmount },
        '*'
      );
    }
  };

  return (
    <div ref={containerRef} className="w-full space-y-3 animate-in fade-in duration-150">
      {/* 1. Cabecera Minimalista e Integración Económica */}
      <Card className="p-3.5 sm:p-4 rounded-xl bg-surface border border-border/80 shadow-2xs space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-surface-raised border border-border flex items-center justify-center text-foreground shrink-0">
              <Sprout className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-sm font-semibold tracking-tight text-foreground">
                  El Huerto SMR · Farmhand
                </h1>
                <Badge variant="default" size="sm" className="font-mono text-[10px]">
                  Español · SMR2
                </Badge>
              </div>
              <p className="text-[11px] text-foreground-muted">
                Simulación agrícola con mercado dinámico y sincronización con tu saldo de fichas.
              </p>
            </div>
          </div>

          {/* Acciones principales */}
          <div className="flex items-center gap-1.5 self-end sm:self-center">
            <button
              type="button"
              onClick={() => {
                sound.tap();
                setShowHelp(!showHelp);
              }}
              title="Guía de economía"
              className="p-1.5 rounded-lg text-foreground-subtle hover:text-foreground hover:bg-surface-raised border border-border/60 transition-colors cursor-pointer"
            >
              <HelpCircle className="w-4 h-4" />
            </button>

            <Button
              variant="secondary"
              size="sm"
              onClick={handleReload}
              className="rounded-lg text-xs h-7 px-2.5 gap-1.5"
              title="Recargar la granja"
            >
              <RotateCcw className="w-3.5 h-3.5 text-foreground-muted" />
              <span className="hidden sm:inline">Recargar</span>
            </Button>

            <Button
              variant="secondary"
              size="sm"
              onClick={handleToggleFullscreen}
              className="rounded-lg text-xs h-7 px-2.5 gap-1.5"
              title="Alternar pantalla completa"
            >
              {isFullscreen ? (
                <>
                  <Minimize2 className="w-3.5 h-3.5 text-foreground-muted" />
                  <span className="hidden sm:inline">Salir</span>
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
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium bg-surface-raised border border-border/60 text-foreground-muted hover:text-foreground transition-colors h-7"
              title="Abrir en pestaña independiente"
            >
              <ExternalLink className="w-3 h-3" />
              <span className="hidden sm:inline">Pestaña</span>
            </a>
          </div>
        </div>

        {/* 2. Barra de Integración Económica con SMR2 */}
        <div className="p-3 rounded-lg bg-surface-raised border border-border/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-4 flex-wrap">
            <div>
              <span className="text-[10px] font-mono text-foreground-subtle block">Saldo oficial SMR2</span>
              <span className="font-mono font-semibold text-foreground flex items-center gap-1">
                <Coins className="w-3.5 h-3.5 text-amber-500" />
                <span>{userCoins.toLocaleString('es-ES')} fichas</span>
              </span>
            </div>

            <div className="h-6 w-px bg-border/60 hidden sm:block" />

            <div>
              <span className="text-[10px] font-mono text-foreground-subtle block">Caja de la cosecha</span>
              <span className="font-mono font-semibold text-emerald-400 flex items-center gap-1">
                <TrendingUp className="w-3.5 h-3.5" />
                <span>+{farmEarnings.toLocaleString('es-ES')} fichas</span>
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleInvestInFarm}
              disabled={userCoins < 50}
              className="px-2.5 py-1.5 rounded-lg bg-surface hover:bg-surface-hover border border-border/80 text-foreground text-[11px] font-medium transition-all cursor-pointer active:scale-95 touch-manipulation disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1"
            >
              <ArrowUpRight className="w-3 h-3 text-accent" />
              <span>Invertir 50</span>
            </button>

            <button
              type="button"
              disabled={farmEarnings <= 0}
              onClick={handleClaimToWallet}
              className={`px-3 py-1.5 rounded-lg text-[11px] font-semibold transition-all cursor-pointer active:scale-95 touch-manipulation flex items-center gap-1.5 ${
                farmEarnings > 0
                  ? 'bg-foreground text-background shadow-2xs hover:opacity-90'
                  : 'bg-surface text-foreground-subtle border border-border/50 cursor-not-allowed opacity-40'
              }`}
            >
              {justClaimed ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span>¡Cobrado!</span>
                </>
              ) : (
                <>
                  <ArrowDownToLine className="w-3.5 h-3.5" />
                  <span>Cobrar a mi cuenta</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Guía desplegable de economía */}
        {showHelp && (
          <div className="p-3 rounded-lg bg-surface border border-border/70 text-xs text-foreground-muted space-y-1.5">
            <div className="flex items-center justify-between text-foreground font-semibold">
              <span className="flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-accent" />
                <span>¿Cómo funciona la economía de la granja?</span>
              </span>
              <button
                type="button"
                onClick={() => setShowHelp(false)}
                className="text-foreground-subtle hover:text-foreground cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
            <p className="leading-relaxed">
              1. Siembra arándanos, maíz o cuida animales dentro de la granja. Todo el texto está traducido automáticamente al español.
            </p>
            <p className="leading-relaxed">
              2. Mientras juegas y cosechas, los beneficios se van acumulando en tu <strong>Caja de cosecha</strong>.
            </p>
            <p className="leading-relaxed">
              3. Pulsa <strong>&quot;Cobrar a mi cuenta&quot;</strong> para transferir las fichas directamente a tu balance oficial de 2º SMR y usarlas en la ruleta, el botellón o subir en la clasificación.
            </p>
          </div>
        )}
      </Card>

      {/* 3. Marco del Juego (Iframe del repositorio en español) */}
      <div
        className={`relative w-full rounded-xl border border-border/80 bg-[#3a3a3c] overflow-hidden shadow-2xs transition-all ${
          isFullscreen ? 'h-screen rounded-none border-none' : 'min-h-[600px] h-[calc(100vh-17rem)]'
        }`}
      >
        {isLoading && (
          <div className="absolute inset-0 bg-surface flex flex-col items-center justify-center gap-2 z-10 animate-in fade-in duration-200">
            <Sprout className="w-6 h-6 text-emerald-400 animate-pulse" />
            <span className="text-xs font-mono text-foreground-muted">
              Cargando El Huerto en español...
            </span>
          </div>
        )}

        <iframe
          ref={iframeRef}
          src="/farmhand/index.html"
          title="El Huerto SMR · Farmhand"
          className="w-full h-full border-0 block"
          allow="fullscreen"
          onLoad={() => setIsLoading(false)}
        />
      </div>

      {/* 4. Pie de estado de sincronización */}
      <Card className="p-2.5 sm:p-3 rounded-xl bg-surface border border-border/70 text-xs text-foreground-muted flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <span className="text-[11px] text-foreground-subtle">
          Traducción en tiempo real y persistencia local integrada en 2º SMR.
        </span>
        <div className="flex items-center gap-1.5 text-foreground-subtle shrink-0 font-mono text-[11px]">
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
          <span>Sincronización activa</span>
        </div>
      </Card>
    </div>
  );
};
