'use client';

import React, { useState, useEffect, useRef } from 'react';
import { sound } from '@/lib/audio';
import { CrashHistoryItem } from '@/lib/types';
import { TrendingUp, AlertTriangle, Coins, RotateCcw } from 'lucide-react';
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

  const [history, setHistory] = useState<CrashHistoryItem[]>([]);
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
  const LOGICAL_HEIGHT = 320;

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
      alert('Saldo insuficiente. Solicita una recarga arriba a la derecha.');
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
          ...prev.slice(0, 6),
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

    if (mult >= 3.0) {
      confetti({
        particleCount: 70,
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

      ctx.fillStyle = '#0a0a0d';
      ctx.fillRect(0, 0, LOGICAL_WIDTH, LOGICAL_HEIGHT);

      // Fine grid
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.03)';
      ctx.lineWidth = 1;
      for (let x = 0; x < LOGICAL_WIDTH; x += 40) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, LOGICAL_HEIGHT);
        ctx.stroke();
      }
      for (let y = 0; y < LOGICAL_HEIGHT; y += 40) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(LOGICAL_WIDTH, y);
        ctx.stroke();
      }

      const padding = 35;
      const startX = padding;
      const startY = LOGICAL_HEIGHT - padding;

      if (gameState === 'running' || gameState === 'crashed') {
        const progress = Math.min((currentMultiplier - 1.0) / 10.0, 1.0);
        const endX = startX + progress * (LOGICAL_WIDTH - padding * 2.5);
        const endY = startY - Math.sqrt(progress) * (LOGICAL_HEIGHT - padding * 2.5);

        // Area fill
        const areaGrad = ctx.createLinearGradient(0, endY, 0, startY);
        if (gameState === 'crashed') {
          areaGrad.addColorStop(0, 'rgba(239, 68, 68, 0.2)');
          areaGrad.addColorStop(1, 'rgba(239, 68, 68, 0.0)');
        } else {
          areaGrad.addColorStop(0, 'rgba(16, 185, 129, 0.22)');
          areaGrad.addColorStop(1, 'rgba(16, 185, 129, 0.0)');
        }

        ctx.fillStyle = areaGrad;
        ctx.beginPath();
        ctx.moveTo(startX, startY);
        ctx.quadraticCurveTo((startX + endX) / 2, startY, endX, endY);
        ctx.lineTo(endX, startY);
        ctx.closePath();
        ctx.fill();

        // Stroke line
        ctx.strokeStyle = gameState === 'crashed' ? '#ef4444' : '#10b981';
        ctx.lineWidth = 3.5;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(startX, startY);
        ctx.quadraticCurveTo((startX + endX) / 2, startY, endX, endY);
        ctx.stroke();

        // Glow ring around tip
        if (gameState === 'running') {
          ctx.strokeStyle = 'rgba(16, 185, 129, 0.4)';
          ctx.lineWidth = 6;
          ctx.beginPath();
          ctx.arc(endX, endY, 7, 0, Math.PI * 2);
          ctx.stroke();
        }

        // Tip circle
        ctx.fillStyle = gameState === 'crashed' ? '#ef4444' : '#ffffff';
        ctx.beginPath();
        ctx.arc(endX, endY, 5, 0, Math.PI * 2);
        ctx.fill();
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
    <div className="bg-[#121215] border border-white/[0.08] rounded-3xl p-5 shadow-[0_8px_30px_rgb(0,0,0,0.4)] flex flex-col items-center">
      {/* Header */}
      <div className="w-full flex items-center justify-between pb-3.5 mb-2 border-b border-white/[0.06]">
        <div className="flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-emerald-400" />
          <h2 className="text-sm font-semibold tracking-tight text-white font-mono">
            CRASH
          </h2>
        </div>

        {/* History Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto max-w-full">
          {history.length === 0 ? (
            <span className="text-[11px] font-mono text-zinc-500">Sin registros</span>
          ) : (
            history.map((item) => (
              <span
                key={item.id}
                className={`text-[11px] font-mono font-medium px-2 py-0.5 rounded-md border shrink-0 ${
                  item.crashPoint >= 2.0
                    ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                    : 'bg-zinc-900 text-zinc-400 border-zinc-800'
                }`}
              >
                {item.crashPoint.toFixed(2)}x
              </span>
            ))
          )}
        </div>
      </div>

      {/* Canvas */}
      <div className="relative w-full overflow-hidden rounded-2xl border border-white/[0.08] bg-[#0a0a0d] flex items-center justify-center">
        <canvas ref={canvasRef} className="w-full h-auto block aspect-[2/1] sm:aspect-[2.6/1]" />

        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none select-none">
          {gameState === 'crashed' ? (
            <div className="text-center animate-in fade-in duration-150">
              <span className="text-[11px] font-mono font-semibold text-rose-500 uppercase tracking-widest flex items-center justify-center gap-1">
                <AlertTriangle className="w-3.5 h-3.5" /> Colapso
              </span>
              <h3 className="text-4xl sm:text-5xl font-bold text-rose-500 font-mono tracking-tight mt-1">
                {currentMultiplier.toFixed(2)}x
              </h3>
            </div>
          ) : gameState === 'running' ? (
            <div className="text-center">
              <h3 className="text-5xl sm:text-6xl font-bold text-white font-mono tracking-tight">
                {currentMultiplier.toFixed(2)}x
              </h3>
              {hasCashedOut && cashedAmount && (
                <div className="mt-1 px-3 py-1 rounded-md bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs font-mono font-medium">
                  Cobrado en {cashedMultiplier?.toFixed(2)}x (+{cashedAmount})
                </div>
              )}
            </div>
          ) : (
            <div className="text-center text-zinc-500">
              <p className="text-xs font-mono text-zinc-400">Selecciona apuesta e inicia la curva</p>
            </div>
          )}
        </div>
      </div>

      {/* Controls */}
      <div className="w-full flex flex-col sm:grid sm:grid-cols-3 gap-2.5 mt-3 pt-1">
        <div className="sm:col-span-2 flex items-center justify-between gap-1.5 bg-black/40 p-1.5 sm:p-2 rounded-2xl border border-white/[0.06] overflow-x-auto scrollbar-none">
          <span className="text-xs font-mono text-zinc-500 pl-1.5 flex items-center gap-1 shrink-0">
            <Coins className="w-3.5 h-3.5 text-amber-400" />
            <span className="hidden xs:inline">Apuesta</span>
          </span>
          <div className="flex items-center gap-1">
            <button
              type="button"
              disabled={gameState === 'running'}
              onClick={() => {
                setBet((prev) => Math.max(10, Math.floor(prev / 2)));
                sound.tap();
              }}
              title="Dividir apuesta"
              className="min-h-[38px] px-2 py-1 rounded-xl text-xs font-mono font-medium text-zinc-400 hover:text-white bg-white/[0.04] border border-white/[0.06] active:scale-95 cursor-pointer"
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
              title="Doblar apuesta"
              className="min-h-[38px] px-2 py-1 rounded-xl text-xs font-mono font-medium text-zinc-400 hover:text-white bg-white/[0.04] border border-white/[0.06] active:scale-95 cursor-pointer"
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
                className={`min-h-[38px] px-2.5 sm:px-3 py-1.5 rounded-xl text-xs font-mono font-medium transition-all cursor-pointer shrink-0 active:scale-95 ${
                  bet === amt
                    ? 'bg-zinc-200 text-black font-semibold shadow-sm'
                    : 'text-zinc-400 hover:text-white bg-white/[0.02] border border-white/[0.04]'
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
              className={`min-h-[38px] px-2.5 py-1.5 rounded-xl text-xs font-mono font-bold transition-all cursor-pointer shrink-0 active:scale-95 ${
                bet >= 2500 || bet === userCoins
                  ? 'bg-amber-400 text-black shadow-sm'
                  : 'text-amber-400 hover:text-amber-300 bg-amber-500/10 border border-amber-500/20'
              }`}
            >
              MÁX
            </button>
          </div>
        </div>

        {gameState === 'running' ? (
          <button
            onClick={cashOut}
            disabled={hasCashedOut}
            className={`w-full min-h-[48px] py-3.5 px-4 rounded-2xl font-mono text-sm font-bold tracking-wider transition-all cursor-pointer flex items-center justify-center gap-2 shadow-lg active:scale-[0.98] ${
              hasCashedOut
                ? 'bg-zinc-800 text-zinc-500 cursor-not-allowed'
                : 'bg-emerald-500 hover:bg-emerald-400 text-black shadow-emerald-500/20'
            }`}
          >
            <span>
              {hasCashedOut ? 'Cobrado' : `Cobrar ${(bet * currentMultiplier).toFixed(0)} fichas`}
            </span>
          </button>
        ) : (
          <button
            onClick={startGame}
            className="w-full min-h-[48px] py-3.5 px-4 rounded-2xl font-mono text-sm font-bold tracking-wider bg-white hover:bg-zinc-200 text-black shadow-lg active:scale-[0.98] transition-all cursor-pointer flex items-center justify-center gap-2"
          >
            <span>Iniciar (-{bet} fichas)</span>
          </button>
        )}
      </div>
    </div>
  );
};
