'use client';

import React, { useState, useEffect, useRef } from 'react';
import { sound } from '@/lib/audio';
import { CrashHistoryItem } from '@/lib/types';
import { TrendingUp, AlertTriangle, Coins, Zap, Trophy, ShieldAlert } from 'lucide-react';
import confetti from 'canvas-confetti';

interface CrashGameProps {
  userCoins: number;
  onUpdateCoins: (delta: number) => void;
  onBroadcastWin: (game: 'crash', multiplier: number, winAmount: number) => void;
}

export const CrashGame: React.FC<CrashGameProps> = ({
  userCoins,
  onUpdateCoins,
  onBroadcastWin,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [history, setHistory] = useState<CrashHistoryItem[]>([
    { id: 'init-1', crashPoint: 2.14, timestamp: '1m' },
    { id: 'init-2', crashPoint: 1.38, timestamp: '2m' },
    { id: 'init-3', crashPoint: 5.72, timestamp: '4m' },
    { id: 'init-4', crashPoint: 1.12, timestamp: '5m' },
  ]);
  const [bet, setBet] = useState<number>(100);
  const [gameState, setGameState] = useState<'idle' | 'running' | 'crashed'>('idle');
  const [currentMultiplier, setCurrentMultiplier] = useState<number>(1.0);
  const [hasCashedOut, setHasCashedOut] = useState<boolean>(false);
  const [cashedAmount, setCashedAmount] = useState<number | null>(null);
  const [cashedMultiplier, setCashedMultiplier] = useState<number | null>(null);

  const crashPointRef = useRef<number>(2.0);
  const animFrameRef = useRef<number | null>(null);
  const startTimeRef = useRef<number>(0);

  const LOGICAL_WIDTH = 840;
  const LOGICAL_HEIGHT = 340;

  const generateCrashPoint = () => {
    if (Math.random() < 0.08) {
      return 1.0 + Math.random() * 0.15;
    }
    const e = 2 ** 32;
    const h = crypto.getRandomValues(new Uint32Array(1))[0];
    if (h % 33 === 0) return 1.0;
    const crash = Math.floor((100 * e - h) / (e - h)) / 100;
    return Math.min(Math.max(crash, 1.1), 50.0);
  };

  const startGame = () => {
    if (userCoins < bet) {
      sound.broke();
      alert('Saldo insuficiente. Pulsa el botón + arriba a la derecha para recargar.');
      return;
    }

    onUpdateCoins(-bet);
    sound.whoosh();

    const targetCrash = generateCrashPoint();
    crashPointRef.current = targetCrash;
    setGameState('running');
    setHasCashedOut(false);
    setCashedAmount(null);
    setCashedMultiplier(null);
    setCurrentMultiplier(1.0);
    startTimeRef.current = performance.now();

    const loop = (now: number) => {
      const elapsed = (now - startTimeRef.current) / 1000;
      const mult = Math.max(1.0, Math.exp(0.08 * (elapsed ** 1.35)));

      if (mult >= crashPointRef.current) {
        const finalCrash = crashPointRef.current;
        setCurrentMultiplier(finalCrash);
        setGameState('crashed');
        sound.crashExplode();

        setHistory((prev) => [
          { id: `h-${Date.now()}`, crashPoint: Number(finalCrash.toFixed(2)), timestamp: 'Ahora' },
          ...prev.slice(0, 7),
        ]);
        return;
      }

      setCurrentMultiplier(mult);

      if (Math.floor(elapsed * 10) % 3 === 0) {
        sound.crashTick(mult);
      }

      animFrameRef.current = requestAnimationFrame(loop);
    };

    animFrameRef.current = requestAnimationFrame(loop);
  };

  const cashOut = () => {
    if (gameState !== 'running' || hasCashedOut) return;

    const mult = currentMultiplier;
    const win = Math.round(bet * mult);

    setHasCashedOut(true);
    setCashedAmount(win);
    setCashedMultiplier(mult);
    onUpdateCoins(win);
    sound.coinWin();

    if (mult >= 2.5) {
      confetti({
        particleCount: 80,
        spread: 60,
        origin: { y: 0.6 },
      });
      onBroadcastWin('crash', mult, win);
    }
  };

  // High-DPI canvas loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;

    const render = () => {
      const dpr = typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1;
      const rect = canvas.getBoundingClientRect();
      const targetWidth = Math.floor(rect.width * dpr);
      const targetHeight = Math.floor((rect.width * (LOGICAL_HEIGHT / LOGICAL_WIDTH)) * dpr);

      if (canvas.width !== targetWidth || canvas.height !== targetHeight) {
        canvas.width = targetWidth;
        canvas.height = targetHeight;
      }

      ctx.save();
      const scaleX = canvas.width / LOGICAL_WIDTH;
      const scaleY = canvas.height / LOGICAL_HEIGHT;
      ctx.scale(scaleX, scaleY);

      // Deep matte obsidian canvas background
      ctx.fillStyle = '#08080c';
      ctx.fillRect(0, 0, LOGICAL_WIDTH, LOGICAL_HEIGHT);

      // Technical oscilloscope grid
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.035)';
      ctx.lineWidth = 1;
      for (let x = 0; x < LOGICAL_WIDTH; x += 45) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, LOGICAL_HEIGHT);
        ctx.stroke();
      }
      for (let y = 0; y < LOGICAL_HEIGHT; y += 45) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(LOGICAL_WIDTH, y);
        ctx.stroke();
      }

      const paddingLeft = 45;
      const paddingBottom = 40;
      const startX = paddingLeft;
      const startY = LOGICAL_HEIGHT - paddingBottom;

      // Axis lines
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(startX, 15);
      ctx.lineTo(startX, startY);
      ctx.lineTo(LOGICAL_WIDTH - 20, startY);
      ctx.stroke();

      // Axis labels
      ctx.fillStyle = 'rgba(255, 255, 255, 0.25)';
      ctx.font = '10px monospace';
      ctx.fillText('1.0x', 12, startY + 3);
      ctx.fillText('2.0x', 12, startY - 60);
      ctx.fillText('5.0x', 12, startY - 140);
      ctx.fillText('10x+', 12, startY - 220);

      if (gameState === 'running' || gameState === 'crashed') {
        const progress = Math.min((currentMultiplier - 1.0) / 10.0, 1.0);
        const endX = startX + progress * (LOGICAL_WIDTH - startX - 40);
        const endY = startY - Math.sqrt(progress) * (startY - 35);

        // Gradient under the curve
        const areaGrad = ctx.createLinearGradient(0, endY, 0, startY);
        if (gameState === 'crashed') {
          areaGrad.addColorStop(0, 'rgba(239, 68, 68, 0.25)');
          areaGrad.addColorStop(1, 'rgba(239, 68, 68, 0.0)');
        } else {
          areaGrad.addColorStop(0, 'rgba(16, 185, 129, 0.28)');
          areaGrad.addColorStop(0.7, 'rgba(16, 185, 129, 0.08)');
          areaGrad.addColorStop(1, 'rgba(16, 185, 129, 0.0)');
        }

        ctx.fillStyle = areaGrad;
        ctx.beginPath();
        ctx.moveTo(startX, startY);
        ctx.quadraticCurveTo((startX + endX) / 2, startY, endX, endY);
        ctx.lineTo(endX, startY);
        ctx.closePath();
        ctx.fill();

        // High intensity neon line
        ctx.strokeStyle = gameState === 'crashed' ? '#ef4444' : '#10b981';
        ctx.lineWidth = 3.5;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(startX, startY);
        ctx.quadraticCurveTo((startX + endX) / 2, startY, endX, endY);
        ctx.stroke();

        // Tip effects
        if (gameState === 'running') {
          // Glow halo
          ctx.strokeStyle = 'rgba(16, 185, 129, 0.45)';
          ctx.lineWidth = 8;
          ctx.beginPath();
          ctx.arc(endX, endY, 8, 0, Math.PI * 2);
          ctx.stroke();

          // Core circle
          ctx.fillStyle = '#ffffff';
          ctx.beginPath();
          ctx.arc(endX, endY, 4.5, 0, Math.PI * 2);
          ctx.fill();
        } else {
          // Crash explosion ring
          ctx.strokeStyle = 'rgba(239, 68, 68, 0.5)';
          ctx.lineWidth = 6;
          ctx.beginPath();
          ctx.arc(endX, endY, 10, 0, Math.PI * 2);
          ctx.stroke();

          ctx.fillStyle = '#ef4444';
          ctx.beginPath();
          ctx.arc(endX, endY, 5, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      ctx.restore();
      animId = requestAnimationFrame(render);
    };

    animId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animId);
  }, [currentMultiplier, gameState]);

  useEffect(() => {
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, []);

  return (
    <div className="glass-panel rounded-3xl p-4 sm:p-6 shadow-[0_16px_50px_rgba(0,0,0,0.6)] flex flex-col items-center border border-white/[0.08]">
      {/* Header telemetry & history */}
      <div className="w-full flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3.5 mb-3 border-b border-white/[0.06]">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400">
            <TrendingUp className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold tracking-tight text-white font-mono uppercase">
                CRASH // TELEMETRÍA
              </h2>
              <span className="px-1.5 py-0.2 text-[9px] font-mono font-bold bg-white/[0.06] text-zinc-400 rounded border border-white/[0.08]">
                RT
              </span>
            </div>
            <p className="text-[11px] text-zinc-500 font-mono">
              Curva exponencial con colapso aleatorio
            </p>
          </div>
        </div>

        {/* History Chips */}
        <div className="flex items-center gap-1.5 overflow-x-auto max-w-full pb-1 sm:pb-0 scrollbar-none">
          <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-wider shrink-0 mr-1">
            Historial:
          </span>
          {history.map((item) => (
            <span
              key={item.id}
              className={`text-[11px] font-mono font-bold px-2 py-0.5 rounded-lg border shrink-0 tabular-nums transition-all ${
                item.crashPoint >= 2.0
                  ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                  : item.crashPoint >= 1.5
                  ? 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                  : 'bg-zinc-900/80 text-zinc-500 border-white/[0.06]'
              }`}
            >
              {item.crashPoint.toFixed(2)}x
            </span>
          ))}
        </div>
      </div>

      {/* Screen Canvas Area */}
      <div className="relative w-full overflow-hidden rounded-2xl border border-white/[0.08] bg-[#08080c] flex items-center justify-center shadow-inner">
        <canvas ref={canvasRef} className="w-full h-auto block aspect-[2/1] sm:aspect-[2.5/1]" />

        {/* Dynamic HUD Center Overlay */}
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none select-none">
          {gameState === 'crashed' ? (
            <div className="text-center animate-in zoom-in-95 duration-150">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-500/15 border border-rose-500/30 text-rose-400 text-xs font-mono font-bold mb-1 shadow-lg shadow-rose-950/50">
                <ShieldAlert className="w-3.5 h-3.5" />
                <span>COLAPSO DETECTADO</span>
              </div>
              <h3 className="text-5xl sm:text-7xl font-black text-rose-500 font-mono tracking-tight tabular-nums drop-shadow-[0_0_25px_rgba(239,68,68,0.4)]">
                {currentMultiplier.toFixed(2)}x
              </h3>
            </div>
          ) : gameState === 'running' ? (
            <div className="text-center">
              <h3 className="text-6xl sm:text-8xl font-black text-white font-mono tracking-tight tabular-nums drop-shadow-[0_0_30px_rgba(16,185,129,0.35)]">
                {currentMultiplier.toFixed(2)}x
              </h3>
              {hasCashedOut && cashedAmount && (
                <div className="mt-2 inline-flex items-center gap-1.5 px-3.5 py-1 rounded-xl bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-xs font-mono font-bold shadow-lg shadow-emerald-950/60 animate-in fade-in">
                  <Trophy className="w-3.5 h-3.5 text-amber-400" />
                  <span>Cobrado en {cashedMultiplier?.toFixed(2)}x (+{cashedAmount.toLocaleString()} fichas)</span>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center text-zinc-500">
              <Zap className="w-8 h-8 mx-auto mb-2 opacity-30 text-emerald-400 animate-pulse" />
              <p className="text-xs font-mono text-zinc-400 font-medium">Ajusta tu apuesta e inicia la curva</p>
            </div>
          )}
        </div>
      </div>

      {/* Cockpit Bet Console */}
      <div className="w-full flex flex-col sm:grid sm:grid-cols-12 gap-3 mt-4">
        {/* Quick Bet Buttons */}
        <div className="sm:col-span-7 flex items-center justify-between gap-1.5 bg-black/50 p-2 rounded-2xl border border-white/[0.08] overflow-x-auto scrollbar-none shadow-inner">
          <span className="text-xs font-mono text-zinc-400 pl-1.5 flex items-center gap-1.5 shrink-0 font-medium">
            <Coins className="w-3.5 h-3.5 text-amber-400" />
            <span className="hidden xs:inline">Apuesta:</span>
          </span>

          <div className="flex items-center gap-1">
            <button
              type="button"
              disabled={gameState === 'running'}
              onClick={() => {
                setBet((prev) => Math.max(10, Math.floor(prev / 2)));
                sound.tap();
              }}
              title="Dividir apuesta entre 2"
              className="min-h-[40px] px-2.5 py-1 rounded-xl text-xs font-mono font-bold text-zinc-400 hover:text-white bg-white/[0.04] border border-white/[0.08] hover:border-white/20 active:scale-95 cursor-pointer disabled:opacity-40"
            >
              ½
            </button>
            <button
              type="button"
              disabled={gameState === 'running'}
              onClick={() => {
                setBet((prev) => Math.min(Math.min(userCoins, 10000), prev * 2));
                sound.tap();
              }}
              title="Duplicar apuesta"
              className="min-h-[40px] px-2.5 py-1 rounded-xl text-xs font-mono font-bold text-zinc-400 hover:text-white bg-white/[0.04] border border-white/[0.08] hover:border-white/20 active:scale-95 cursor-pointer disabled:opacity-40"
            >
              2×
            </button>
            {[50, 100, 250, 500].map((amt) => (
              <button
                key={amt}
                disabled={gameState === 'running'}
                onClick={() => {
                  setBet(amt);
                  sound.tap();
                }}
                className={`min-h-[40px] px-3 py-1.5 rounded-xl text-xs font-mono font-bold transition-all cursor-pointer shrink-0 active:scale-95 disabled:opacity-40 ${
                  bet === amt
                    ? 'bg-white text-black shadow-md shadow-white/20 font-black'
                    : 'text-zinc-400 hover:text-white bg-white/[0.03] border border-white/[0.06]'
                }`}
              >
                {amt}
              </button>
            ))}
            <button
              type="button"
              disabled={gameState === 'running'}
              onClick={() => {
                setBet(Math.min(userCoins > 0 ? userCoins : 1000, 2500));
                sound.tap();
              }}
              className={`min-h-[40px] px-3 py-1.5 rounded-xl text-xs font-mono font-black transition-all cursor-pointer shrink-0 active:scale-95 disabled:opacity-40 ${
                bet >= 2500 || bet === userCoins
                  ? 'bg-amber-400 text-black shadow-md shadow-amber-400/30'
                  : 'text-amber-400 hover:text-amber-300 bg-amber-500/10 border border-amber-500/25'
              }`}
            >
              MÁX
            </button>
          </div>
        </div>

        {/* Primary Action Button */}
        <div className="sm:col-span-5">
          {gameState === 'running' ? (
            <button
              onClick={cashOut}
              disabled={hasCashedOut}
              className={`w-full min-h-[52px] py-3.5 px-4 rounded-2xl font-mono text-sm font-black tracking-wider transition-all cursor-pointer flex items-center justify-center gap-2 shadow-xl active:scale-[0.98] ${
                hasCashedOut
                  ? 'bg-zinc-800 text-zinc-500 border border-white/[0.06] cursor-not-allowed'
                  : 'bg-emerald-500 hover:bg-emerald-400 text-black shadow-emerald-500/30 ring-2 ring-emerald-400/50'
              }`}
            >
              <span>
                {hasCashedOut
                  ? 'COBRADO'
                  : `COBRAR ${(bet * currentMultiplier).toFixed(0)} FICHAS`}
              </span>
            </button>
          ) : (
            <button
              onClick={startGame}
              className="w-full min-h-[52px] py-3.5 px-4 rounded-2xl font-mono text-sm font-black tracking-wider bg-white hover:bg-zinc-100 text-black shadow-xl shadow-white/10 active:scale-[0.98] transition-all cursor-pointer flex items-center justify-center gap-2"
            >
              <Zap className="w-4 h-4 fill-black" />
              <span>INICIAR (-{bet} FICHAS)</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
