'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { sound } from '@/lib/audio';
import {
  RotateCcw,
  Coins,
  Trophy,
  Share2,
  Trash2,
  Sparkles,
  HelpCircle,
  Play,
  Check,
} from 'lucide-react';
import confetti from 'canvas-confetti';

interface RouletteGameProps {
  userCoins: number;
  onUpdateCoins: (delta: number) => void;
  onBroadcastWin: (game: 'roulette', multiplier: number, winAmount: number) => void;
}

// European Roulette Wheel Sequence (37 numbers)
const WHEEL_NUMBERS = [
  0, 32, 15, 19, 4, 21, 2, 25, 17, 34, 6, 27, 13, 36, 11, 30, 8, 23, 10,
  5, 24, 16, 33, 1, 20, 14, 31, 9, 22, 18, 29, 7, 28, 12, 35, 3, 26,
];

const RED_NUMBERS = new Set([
  1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36,
]);

export type BetType =
  | 'red'
  | 'black'
  | 'even'
  | 'odd'
  | 'low' // 1-18
  | 'high' // 19-36
  | 'doz1' // 1-12
  | 'doz2' // 13-24
  | 'doz3' // 25-36
  | string; // number '0' to '36'

interface Bet {
  type: BetType;
  amount: number;
}

export const RouletteGame: React.FC<RouletteGameProps> = ({
  userCoins,
  onUpdateCoins,
  onBroadcastWin,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [selectedChip, setSelectedChip] = useState<number>(50);
  const [bets, setBets] = useState<Record<string, number>>({});
  const [previousBets, setPreviousBets] = useState<Record<string, number>>({});
  const [isSpinning, setIsSpinning] = useState<boolean>(false);
  const [winningNumber, setWinningNumber] = useState<number | null>(null);
  const [history, setHistory] = useState<number[]>([17, 0, 28, 3, 15]);
  const [lastRoundResult, setLastRoundResult] = useState<{
    won: boolean;
    winAmount: number;
    multiplier: number;
    number: number;
  } | null>(null);
  const [bragged, setBragged] = useState<boolean>(false);

  // Animation physics state
  const wheelAngleRef = useRef<number>(0);
  const ballAngleRef = useRef<number>(0);
  const ballRadiusRef = useRef<number>(120);
  const animFrameRef = useRef<number | null>(null);

  const totalBet = Object.values(bets).reduce((sum, amt) => sum + amt, 0);

  const getNumberColor = (num: number): 'green' | 'red' | 'black' => {
    if (num === 0) return 'green';
    return RED_NUMBERS.has(num) ? 'red' : 'black';
  };

  const handlePlaceBet = (betKey: BetType) => {
    if (isSpinning) return;
    if (userCoins < totalBet + selectedChip) {
      sound.broke();
      alert('Saldo insuficiente para añadir esta ficha.');
      return;
    }

    sound.tap();
    setBets((prev) => ({
      ...prev,
      [betKey]: (prev[betKey] || 0) + selectedChip,
    }));
  };

  const handleClearBets = () => {
    if (isSpinning) return;
    sound.tap();
    setBets({});
  };

  const handleRepeatBets = () => {
    if (isSpinning) return;
    const prevTotal = Object.values(previousBets).reduce((s, a) => s + a, 0);
    if (prevTotal === 0) return;
    if (userCoins < prevTotal) {
      sound.broke();
      alert('Saldo insuficiente para repetir la apuesta anterior.');
      return;
    }
    sound.tap();
    setBets(previousBets);
  };

  const handleDoubleBets = () => {
    if (isSpinning || totalBet === 0) return;
    if (userCoins < totalBet * 2) {
      sound.broke();
      alert('Saldo insuficiente para duplicar la apuesta.');
      return;
    }
    sound.tap();
    setBets((prev) => {
      const doubled: Record<string, number> = {};
      Object.entries(prev).forEach(([k, v]) => {
        doubled[k] = v * 2;
      });
      return doubled;
    });
  };

  // Evaluate winnings according to European Roulette rules
  const evaluateWinnings = (resultNum: number, currentBets: Record<string, number>) => {
    let wonAmount = 0;
    const isRed = RED_NUMBERS.has(resultNum);
    const isEven = resultNum !== 0 && resultNum % 2 === 0;

    Object.entries(currentBets).forEach(([betKey, amt]) => {
      // 1. Straight-up single number (35:1)
      if (betKey === String(resultNum)) {
        wonAmount += amt * 36;
      }
      // 2. Red / Black (1:1)
      else if (betKey === 'red' && isRed) {
        wonAmount += amt * 2;
      } else if (betKey === 'black' && resultNum !== 0 && !isRed) {
        wonAmount += amt * 2;
      }
      // 3. Even / Odd (1:1)
      else if (betKey === 'even' && isEven) {
        wonAmount += amt * 2;
      } else if (betKey === 'odd' && resultNum !== 0 && !isEven) {
        wonAmount += amt * 2;
      }
      // 4. Low (1-18) / High (19-36) (1:1)
      else if (betKey === 'low' && resultNum >= 1 && resultNum <= 18) {
        wonAmount += amt * 2;
      } else if (betKey === 'high' && resultNum >= 19 && resultNum <= 36) {
        wonAmount += amt * 2;
      }
      // 5. Dozens (2:1)
      else if (betKey === 'doz1' && resultNum >= 1 && resultNum <= 12) {
        wonAmount += amt * 3;
      } else if (betKey === 'doz2' && resultNum >= 13 && resultNum <= 24) {
        wonAmount += amt * 3;
      } else if (betKey === 'doz3' && resultNum >= 25 && resultNum <= 36) {
        wonAmount += amt * 3;
      }
    });

    return wonAmount;
  };

  const spinWheel = () => {
    if (isSpinning || totalBet === 0) return;
    if (userCoins < totalBet) {
      sound.broke();
      return;
    }

    onUpdateCoins(-totalBet);
    setPreviousBets(bets);
    setIsSpinning(true);
    setWinningNumber(null);
    setLastRoundResult(null);
    setBragged(false);
    sound.whoosh();

    // Pick random target number using crypto
    const randArr = new Uint32Array(1);
    crypto.getRandomValues(randArr);
    const targetNumber = WHEEL_NUMBERS[randArr[0] % WHEEL_NUMBERS.length];

    // Find target angle on wheel
    const targetIndex = WHEEL_NUMBERS.indexOf(targetNumber);
    const sliceAngle = (Math.PI * 2) / WHEEL_NUMBERS.length;
    // Align slot to top (angle -Math.PI / 2)
    const targetWheelOffset = (Math.PI * 2) - (targetIndex * sliceAngle) - sliceAngle / 2;

    const startWheelAngle = wheelAngleRef.current % (Math.PI * 2);
    const totalWheelSpins = (4 + Math.random() * 2) * Math.PI * 2;
    const finalWheelAngle = startWheelAngle + totalWheelSpins + targetWheelOffset;

    const startTime = performance.now();
    const duration = 4800; // 4.8 seconds realistic spin

    const animate = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);

      // Smooth cubic deceleration
      const easeOut = 1 - Math.pow(1 - progress, 3);
      wheelAngleRef.current = startWheelAngle + easeOut * (finalWheelAngle - startWheelAngle);

      // Ball rotates counter-clockwise and gradually drops towards the center
      const ballSpins = (8 * (1 - easeOut)) * Math.PI * 2;
      ballAngleRef.current = -ballSpins + wheelAngleRef.current;
      ballRadiusRef.current = 130 - easeOut * 32;

      // Sound ticks
      if (Math.floor(elapsed / 120) % 2 === 0 && progress < 0.85) {
        sound.rouletteTick(1 - progress * 0.7);
      }

      if (progress < 1) {
        animFrameRef.current = requestAnimationFrame(animate);
      } else {
        // Spin finished!
        sound.rouletteBallDrop();
        setWinningNumber(targetNumber);
        setHistory((prev) => [targetNumber, ...prev.slice(0, 9)]);

        const winAmount = evaluateWinnings(targetNumber, bets);
        const effectiveMult = totalBet > 0 ? winAmount / totalBet : 0;

        if (winAmount > 0) {
          onUpdateCoins(winAmount);
          sound.coinWin();
          if (effectiveMult >= 2.5) {
            confetti({ particleCount: 90, spread: 70, origin: { y: 0.6 } });
          }
        } else {
          sound.broke();
        }

        setLastRoundResult({
          won: winAmount > 0,
          winAmount,
          multiplier: effectiveMult,
          number: targetNumber,
        });

        setIsSpinning(false);
      }
    };

    animFrameRef.current = requestAnimationFrame(animate);
  };

  // High-DPI canvas loop for rendering European Wheel
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;
    const size = 320;

    const render = () => {
      const dpr = typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1;
      if (canvas.width !== size * dpr || canvas.height !== size * dpr) {
        canvas.width = size * dpr;
        canvas.height = size * dpr;
      }

      ctx.save();
      ctx.scale(dpr, dpr);
      ctx.clearRect(0, 0, size, size);

      const centerX = size / 2;
      const centerY = size / 2;
      const radius = size / 2 - 12;

      ctx.translate(centerX, centerY);

      // Outer rim with metallic brass shadow
      ctx.beginPath();
      ctx.arc(0, 0, radius + 8, 0, Math.PI * 2);
      ctx.fillStyle = '#1c1917';
      ctx.fill();
      ctx.strokeStyle = '#d97706';
      ctx.lineWidth = 3;
      ctx.stroke();

      // Wheel rotating group
      ctx.save();
      ctx.rotate(wheelAngleRef.current);

      const slice = (Math.PI * 2) / WHEEL_NUMBERS.length;

      WHEEL_NUMBERS.forEach((num, i) => {
        const start = i * slice;
        const end = start + slice;
        const color = getNumberColor(num);

        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.arc(0, 0, radius, start, end);
        ctx.closePath();

        ctx.fillStyle =
          color === 'green'
            ? '#059669'
            : color === 'red'
            ? '#b91c1c'
            : '#18181b';
        ctx.fill();

        // Dividing gold ray lines
        ctx.strokeStyle = 'rgba(245, 158, 11, 0.4)';
        ctx.lineWidth = 1;
        ctx.stroke();

        // Number labels on the rim
        ctx.save();
        ctx.rotate(start + slice / 2);
        ctx.textAlign = 'right';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 10px monospace';
        ctx.fillText(String(num), radius - 10, 0);
        ctx.restore();
      });

      // Center turret & brass cap
      ctx.beginPath();
      ctx.arc(0, 0, 48, 0, Math.PI * 2);
      ctx.fillStyle = '#292524';
      ctx.fill();
      ctx.strokeStyle = '#f59e0b';
      ctx.lineWidth = 2.5;
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(0, 0, 22, 0, Math.PI * 2);
      ctx.fillStyle = '#d97706';
      ctx.fill();

      ctx.restore(); // restore wheel rotation

      // Top indicator needle
      ctx.beginPath();
      ctx.moveTo(0, -radius - 6);
      ctx.lineTo(-7, -radius + 8);
      ctx.lineTo(7, -radius + 8);
      ctx.closePath();
      ctx.fillStyle = '#fbbf24';
      ctx.fill();
      ctx.strokeStyle = '#000000';
      ctx.lineWidth = 1;
      ctx.stroke();

      // Ivory Ball
      if (isSpinning || winningNumber !== null) {
        const bX = Math.cos(ballAngleRef.current) * ballRadiusRef.current;
        const bY = Math.sin(ballAngleRef.current) * ballRadiusRef.current;

        ctx.beginPath();
        ctx.arc(bX, bY, 5.5, 0, Math.PI * 2);
        ctx.fillStyle = '#ffffff';
        ctx.shadowColor = 'rgba(255, 255, 255, 0.8)';
        ctx.shadowBlur = 8;
        ctx.fill();
        ctx.shadowBlur = 0;
        ctx.strokeStyle = '#d4d4d8';
        ctx.lineWidth = 1;
        ctx.stroke();
      }

      ctx.restore();
      animId = requestAnimationFrame(render);
    };

    animId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animId);
  }, [isSpinning, winningNumber]);

  useEffect(() => {
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, []);

  const handleBrag = () => {
    if (!lastRoundResult || bragged) return;
    onBroadcastWin('roulette', lastRoundResult.multiplier, lastRoundResult.winAmount);
    setBragged(true);
    sound.coinWin();
  };

  return (
    <div className="glass-panel rounded-3xl p-4 sm:p-6 shadow-[0_16px_50px_rgba(0,0,0,0.6)] flex flex-col items-center border border-white/[0.08]">
      {/* Header & History */}
      <div className="w-full flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3.5 mb-3 border-b border-white/[0.06]">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400">
            <Coins className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold tracking-tight text-white font-mono">
                Ruleta Europea SMR2
              </h2>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 font-bold">
                Pleno 35:1
              </span>
            </div>
            <p className="text-[11px] text-zinc-500 font-mono">
              Apuesta a números plenos, rojo/negro, par/impar o docenas
            </p>
          </div>
        </div>

        {/* History Strip */}
        <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none">
          <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-wider shrink-0 mr-1">
            Últimos:
          </span>
          {history.map((num, i) => {
            const col = getNumberColor(num);
            return (
              <span
                key={i}
                className={`w-6 h-6 rounded-lg flex items-center justify-center font-mono text-[11px] font-bold border shrink-0 ${
                  col === 'green'
                    ? 'bg-emerald-600/30 text-emerald-300 border-emerald-500/40'
                    : col === 'red'
                    ? 'bg-rose-600/30 text-rose-300 border-rose-500/40'
                    : 'bg-zinc-800 text-zinc-200 border-white/10'
                }`}
              >
                {num}
              </span>
            );
          })}
        </div>
      </div>

      {/* Main Game Stage: Left Wheel / Right Table */}
      <div className="w-full grid grid-cols-1 lg:grid-cols-12 gap-5 items-center">
        {/* Left Column: Physical Wheel Canvas */}
        <div className="lg:col-span-5 flex flex-col items-center justify-center">
          <div className="relative">
            <canvas
              ref={canvasRef}
              className="w-[280px] h-[280px] sm:w-[320px] sm:h-[320px] block select-none drop-shadow-[0_12px_30px_rgba(0,0,0,0.8)]"
            />

            {/* Winning result callout in center if stopped */}
            {winningNumber !== null && !isSpinning && (
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-16 h-16 rounded-full bg-black/90 border-2 border-amber-400 flex flex-col items-center justify-center shadow-xl animate-in zoom-in-75 duration-200 pointer-events-none">
                <span className="text-[9px] font-mono text-zinc-400 uppercase">Número</span>
                <span className="text-xl font-black font-mono text-amber-300 leading-none">
                  {winningNumber}
                </span>
              </div>
            )}
          </div>

          {/* Outcome notification banner */}
          {lastRoundResult && (
            <div
              className={`w-full mt-3 p-3 rounded-2xl border flex items-center justify-between text-xs font-mono animate-in fade-in ${
                lastRoundResult.won
                  ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300'
                  : 'bg-zinc-900 border-white/10 text-zinc-400'
              }`}
            >
              <div className="flex items-center gap-2">
                <span
                  className={`w-5 h-5 rounded-md flex items-center justify-center font-bold text-xs ${
                    getNumberColor(lastRoundResult.number) === 'green'
                      ? 'bg-emerald-600 text-white'
                      : getNumberColor(lastRoundResult.number) === 'red'
                      ? 'bg-rose-600 text-white'
                      : 'bg-zinc-800 text-white'
                  }`}
                >
                  {lastRoundResult.number}
                </span>
                <span>
                  {lastRoundResult.won
                    ? `¡Ganaste +${lastRoundResult.winAmount.toLocaleString()} fichas!`
                    : 'Sin premio en esta tirada.'}
                </span>
              </div>

              {lastRoundResult.won && (
                <button
                  type="button"
                  onClick={handleBrag}
                  disabled={bragged}
                  className="px-2.5 py-1 rounded-xl bg-white text-black font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer active:scale-95 disabled:opacity-50"
                >
                  <Share2 className="w-3 h-3" />
                  <span>{bragged ? 'Compartido' : 'Al Chat'}</span>
                </button>
              )}
            </div>
          )}
        </div>

        {/* Right Column: Betting Table & Chips */}
        <div className="lg:col-span-7 flex flex-col space-y-3">
          {/* Chip Value Selector Bar */}
          <div className="flex items-center justify-between gap-2 p-2 rounded-2xl bg-black/50 border border-white/[0.08]">
            <span className="text-xs font-mono text-zinc-400 pl-1 shrink-0">Ficha:</span>
            <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none">
              {[10, 50, 100, 500, 1000].map((val) => (
                <button
                  key={val}
                  type="button"
                  disabled={isSpinning}
                  onClick={() => {
                    setSelectedChip(val);
                    sound.tap();
                  }}
                  className={`px-3 py-1.5 rounded-xl font-mono text-xs font-bold transition-all cursor-pointer border active:scale-95 ${
                    selectedChip === val
                      ? 'bg-amber-400 text-black border-amber-300 shadow-md shadow-amber-400/30 ring-1 ring-white/50'
                      : 'bg-white/[0.03] text-zinc-300 hover:text-white border-white/[0.08]'
                  }`}
                >
                  {val}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-1 shrink-0 border-l border-white/10 pl-2">
              <button
                type="button"
                disabled={isSpinning || totalBet === 0}
                onClick={handleClearBets}
                title="Limpiar tapete"
                className="p-1.5 rounded-xl bg-white/[0.03] hover:bg-white/[0.08] text-zinc-400 hover:text-rose-400 border border-white/[0.06] transition-all cursor-pointer disabled:opacity-40"
              >
                <Trash2 className="w-4 h-4" />
              </button>
              <button
                type="button"
                disabled={isSpinning}
                onClick={handleRepeatBets}
                title="Repetir anterior"
                className="p-1.5 rounded-xl bg-white/[0.03] hover:bg-white/[0.08] text-zinc-400 hover:text-amber-400 border border-white/[0.06] transition-all cursor-pointer disabled:opacity-40"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Betting Grid Table */}
          <div className="rounded-2xl bg-[#09090d] border border-white/[0.08] p-2.5 sm:p-3 space-y-2 select-none shadow-inner">
            {/* 0 Row */}
            <button
              type="button"
              disabled={isSpinning}
              onClick={() => handlePlaceBet('0')}
              className={`w-full py-2 rounded-xl font-mono text-xs font-bold border transition-all cursor-pointer relative flex items-center justify-center ${
                bets['0']
                  ? 'bg-emerald-600/40 border-emerald-400 text-emerald-200 ring-1 ring-emerald-400'
                  : 'bg-emerald-950/20 hover:bg-emerald-900/30 text-emerald-400 border-emerald-500/30'
              }`}
            >
              <span>0 (Verde · Pleno 35:1)</span>
              {bets['0'] && (
                <span className="absolute right-2 px-1.5 py-0.2 rounded text-[10px] bg-amber-400 text-black font-black">
                  {bets['0']}
                </span>
              )}
            </button>

            {/* Numbers 1 to 36 (3 columns of 12) */}
            <div className="grid grid-cols-6 sm:grid-cols-12 gap-1">
              {Array.from({ length: 36 }, (_, idx) => {
                const num = idx + 1;
                const isRed = RED_NUMBERS.has(num);
                const betAmount = bets[String(num)];

                return (
                  <button
                    key={num}
                    type="button"
                    disabled={isSpinning}
                    onClick={() => handlePlaceBet(String(num))}
                    className={`h-9 rounded-lg font-mono text-xs font-bold border transition-all cursor-pointer relative flex items-center justify-center ${
                      betAmount
                        ? 'ring-2 ring-amber-400 border-amber-400'
                        : 'border-white/[0.06]'
                    } ${
                      isRed
                        ? 'bg-rose-950/40 hover:bg-rose-900/50 text-rose-300'
                        : 'bg-zinc-900/90 hover:bg-zinc-800 text-zinc-300'
                    }`}
                  >
                    <span>{num}</span>
                    {betAmount && (
                      <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-amber-400 text-black text-[9px] font-black flex items-center justify-center shadow">
                        {betAmount >= 1000 ? `${betAmount / 1000}k` : betAmount}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Dozens (1st, 2nd, 3rd) */}
            <div className="grid grid-cols-3 gap-1 pt-1">
              {[
                { key: 'doz1' as const, label: '1ª Docena (1-12)' },
                { key: 'doz2' as const, label: '2ª Docena (13-24)' },
                { key: 'doz3' as const, label: '3ª Docena (25-36)' },
              ].map((d) => (
                <button
                  key={d.key}
                  type="button"
                  disabled={isSpinning}
                  onClick={() => handlePlaceBet(d.key)}
                  className={`py-2 rounded-xl font-mono text-[11px] font-bold border transition-all cursor-pointer relative flex items-center justify-center ${
                    bets[d.key]
                      ? 'bg-amber-500/20 text-amber-300 border-amber-400 ring-1 ring-amber-400'
                      : 'bg-white/[0.03] text-zinc-400 hover:text-white border-white/[0.06]'
                  }`}
                >
                  <span>{d.label}</span>
                  {bets[d.key] && (
                    <span className="absolute right-1 px-1 rounded text-[9px] bg-amber-400 text-black font-black">
                      {bets[d.key]}
                    </span>
                  )}
                </button>
              ))}
            </div>

            {/* Outside 1:1 bets (Red/Black, Even/Odd, Low/High) */}
            <div className="grid grid-cols-2 sm:grid-cols-6 gap-1 pt-1">
              {[
                { key: 'low' as const, label: '1-18 (Bajo)' },
                { key: 'even' as const, label: 'Par (Even)' },
                { key: 'red' as const, label: 'Rojo', isColor: 'red' },
                { key: 'black' as const, label: 'Negro', isColor: 'black' },
                { key: 'odd' as const, label: 'Impar (Odd)' },
                { key: 'high' as const, label: '19-36 (Alto)' },
              ].map((b) => (
                <button
                  key={b.key}
                  type="button"
                  disabled={isSpinning}
                  onClick={() => handlePlaceBet(b.key)}
                  className={`py-2 px-1 rounded-xl font-mono text-[11px] font-bold border transition-all cursor-pointer relative flex items-center justify-center ${
                    bets[b.key]
                      ? 'ring-1 ring-amber-400 border-amber-400 shadow-sm'
                      : 'border-white/[0.06]'
                  } ${
                    b.isColor === 'red'
                      ? 'bg-rose-950/40 text-rose-300 hover:bg-rose-900/50'
                      : b.isColor === 'black'
                      ? 'bg-zinc-900 text-zinc-300 hover:bg-zinc-800'
                      : 'bg-white/[0.03] text-zinc-400 hover:text-white'
                  }`}
                >
                  <span>{b.label}</span>
                  {bets[b.key] && (
                    <span className="absolute right-1 px-1 rounded text-[9px] bg-amber-400 text-black font-black">
                      {bets[b.key]}
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Bet controls footer bar */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
            <div className="flex items-center gap-3 font-mono text-xs">
              <span className="text-zinc-400">Total apostado:</span>
              <span className="text-sm font-bold text-amber-300 tabular-nums">
                {totalBet.toLocaleString()} fichas
              </span>
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <button
                type="button"
                disabled={isSpinning || totalBet === 0}
                onClick={handleDoubleBets}
                className="px-3 py-3 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] text-xs font-mono font-bold text-zinc-300 hover:text-white border border-white/10 transition-all cursor-pointer disabled:opacity-40"
              >
                2×
              </button>

              <button
                type="button"
                disabled={isSpinning || totalBet === 0}
                onClick={spinWheel}
                className="flex-1 sm:flex-none px-6 py-3 rounded-2xl bg-amber-400 hover:bg-amber-300 text-black font-mono text-xs font-black shadow-lg shadow-amber-400/25 active:scale-95 transition-all cursor-pointer flex items-center justify-center gap-2 disabled:opacity-40"
              >
                <Play className="w-4 h-4 fill-black" />
                <span>{isSpinning ? 'GIRANDO...' : 'GIRAR RULETA'}</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
