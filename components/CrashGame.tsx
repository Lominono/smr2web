'use client';

import React, { useState, useEffect, useRef } from 'react';
import { sound } from '@/lib/audio';
import { CrashHistoryItem } from '@/lib/types';
import { TrendingUp, AlertTriangle, Coins, RefreshCw } from 'lucide-react';
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
      alert('Saldo insuficiente. Solicita la Beca arriba a la derecha.');
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

    if (mult >= 3.0) {
      confetti({
        particleCount: 80,
        spread: 60,
        origin: { y: 0.6 },
      });
      onBroadcastWin('crash', mult, win);
    }
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.04)';
    ctx.lineWidth = 1;
    for (let x = 0; x < canvas.width; x += 40) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, canvas.height);
      ctx.stroke();
    }
    for (let y = 0; y < canvas.height; y += 40) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(canvas.width, y);
      ctx.stroke();
    }

    const padding = 35;
    const startX = padding;
    const startY = canvas.height - padding;

    if (gameState === 'running' || gameState === 'crashed') {
      const progress = Math.min((currentMultiplier - 1.0) / 10.0, 1.0);
      const endX = startX + progress * (canvas.width - padding * 2.5);
      const endY = startY - Math.sqrt(progress) * (canvas.height - padding * 2.5);

      const gradient = ctx.createLinearGradient(startX, startY, endX, endY);
      if (gameState === 'crashed') {
        gradient.addColorStop(0, '#f43f5e');
        gradient.addColorStop(1, '#ef4444');
      } else {
        gradient.addColorStop(0, '#10b981');
        gradient.addColorStop(1, '#34d399');
      }

      ctx.strokeStyle = gradient;
      ctx.lineWidth = 4;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(startX, startY);
      ctx.quadraticCurveTo((startX + endX) / 2, startY, endX, endY);
      ctx.stroke();

      ctx.fillStyle = gameState === 'crashed' ? '#ef4444' : '#34d399';
      ctx.shadowColor = gameState === 'crashed' ? '#ef4444' : '#10b981';
      ctx.shadowBlur = 12;
      ctx.beginPath();
      ctx.arc(endX, endY, 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
    }
  }, [currentMultiplier, gameState]);

  useEffect(() => {
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, []);

  return (
    <div className="bg-[#0b0c10] border border-white/[0.08] rounded-3xl p-5 sm:p-6 shadow-2xl relative overflow-hidden flex flex-col items-center">
      {/* Header */}
      <div className="w-full flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-4 mb-2 border-b border-white/[0.08]">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-xl bg-rose-500/10 text-rose-400 border border-rose-500/20">
              <TrendingUp className="w-4 h-4" />
            </span>
            <h2 className="text-base sm:text-lg font-bold tracking-tight text-white font-mono">
              KERNEL CRASH // MULTIPLICADOR
            </h2>
          </div>
          <p className="text-xs text-zinc-400 mt-1">
            Supervisa el crecimiento exponencial y cobra antes del fallo del servidor.
          </p>
        </div>

        {/* History */}
        <div className="flex items-center gap-1.5 overflow-x-auto max-w-full pb-1 sm:pb-0">
          {history.length === 0 ? (
            <span className="text-xs font-mono text-zinc-500">Sin rondas previas</span>
          ) : (
            history.map((item) => {
              const isHigh = item.crashPoint >= 5.0;
              const isMedium = item.crashPoint >= 2.0;
              return (
                <span
                  key={item.id}
                  className={`text-[11px] font-mono font-bold px-2 py-0.5 rounded-lg border shrink-0 ${
                    isHigh
                      ? 'bg-purple-500/15 text-purple-300 border-purple-500/30'
                      : isMedium
                      ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                      : 'bg-zinc-800 text-zinc-400 border-zinc-700'
                  }`}
                >
                  {item.crashPoint.toFixed(2)}x
                </span>
              );
            })
          )}
        </div>
      </div>

      {/* Canvas */}
      <div className="relative w-full overflow-hidden rounded-2xl border border-white/[0.08] bg-[#08090e] flex items-center justify-center min-h-[300px]">
        <canvas ref={canvasRef} width={820} height={300} className="w-full h-[300px] block" />

        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none select-none">
          {gameState === 'crashed' ? (
            <div className="text-center animate-in zoom-in-95 duration-150">
              <span className="text-xs font-mono font-bold text-rose-400 uppercase tracking-widest flex items-center justify-center gap-1.5">
                <AlertTriangle className="w-4 h-4 text-rose-500" /> KERNEL PANIC
              </span>
              <h3 className="text-4xl sm:text-6xl font-black text-rose-500 font-mono tracking-tight mt-1">
                {currentMultiplier.toFixed(2)}x
              </h3>
              <p className="text-xs text-zinc-400 mt-1 font-mono">
                Servidor desconectado
              </p>
            </div>
          ) : gameState === 'running' ? (
            <div className="text-center">
              <h3 className="text-5xl sm:text-7xl font-black text-white font-mono tracking-tight">
                {currentMultiplier.toFixed(2)}x
              </h3>
              {hasCashedOut && cashedAmount && (
                <div className="mt-2 px-3.5 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-xs font-mono font-bold">
                  Cobrado en {cashedMultiplier?.toFixed(2)}x (+{cashedAmount} fichas)
                </div>
              )}
            </div>
          ) : (
            <div className="text-center text-zinc-500">
              <TrendingUp className="w-10 h-10 mx-auto mb-2 opacity-30" />
              <p className="text-xs font-mono text-zinc-400">Selecciona apuesta e inicia la ronda</p>
            </div>
          )}
        </div>
      </div>

      {/* Controls */}
      <div className="w-full grid grid-cols-1 sm:grid-cols-3 gap-3 mt-4 pt-2">
        <div className="sm:col-span-2 flex items-center justify-between gap-2 bg-white/[0.04] p-2 rounded-2xl border border-white/[0.08]">
          <span className="text-xs font-mono text-zinc-400 pl-2 flex items-center gap-1 shrink-0">
            <Coins className="w-3.5 h-3.5 text-amber-400" /> Apuesta:
          </span>
          <div className="flex items-center gap-1.5 overflow-x-auto">
            {[50, 100, 250, 500, 1000].map((amt) => (
              <button
                key={amt}
                disabled={gameState === 'running'}
                onClick={() => {
                  setBet(amt);
                  sound.tap();
                }}
                className={`px-3 py-1.5 rounded-xl text-xs font-mono font-bold transition-all cursor-pointer ${
                  bet === amt
                    ? 'bg-white text-black shadow-md'
                    : 'text-zinc-400 hover:text-white hover:bg-white/[0.05]'
                }`}
              >
                {amt}
              </button>
            ))}
          </div>
        </div>

        {gameState === 'running' ? (
          <button
            onClick={cashOut}
            disabled={hasCashedOut}
            className={`w-full py-3.5 rounded-2xl font-mono text-xs sm:text-sm font-black tracking-wider transition-all shadow-xl cursor-pointer flex items-center justify-center gap-2 ${
              hasCashedOut
                ? 'bg-zinc-800 text-zinc-500 cursor-not-allowed'
                : 'bg-emerald-500 hover:bg-emerald-400 text-black active:scale-95'
            }`}
          >
            <span>
              {hasCashedOut ? 'COBRADO' : `COBRAR ${(bet * currentMultiplier).toFixed(0)} FICHAS`}
            </span>
          </button>
        ) : (
          <button
            onClick={startGame}
            className="w-full py-3.5 rounded-2xl font-mono text-xs sm:text-sm font-black tracking-wider bg-white hover:bg-zinc-200 text-black shadow-lg active:scale-95 transition-all cursor-pointer flex items-center justify-center gap-2"
          >
            <span>INICIAR (-{bet} FICHAS)</span>
          </button>
        )}
      </div>
    </div>
  );
};
