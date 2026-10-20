'use client';

import React, { useState, useEffect } from 'react';
import { sound } from '@/lib/audio';
import {
  Bomb,
  Server,
  Coins,
  Trophy,
  RotateCcw,
  Sparkles,
  Zap,
  Share2,
  Check,
  Flame,
  AlertTriangle,
  Shuffle,
} from 'lucide-react';
import confetti from 'canvas-confetti';

interface MinesGameProps {
  userCoins: number;
  onUpdateCoins: (delta: number) => void;
  onBroadcastWin: (game: 'mines', multiplier: number, winAmount: number) => void;
}

interface TileState {
  index: number;
  isMine: boolean;
  isRevealed: boolean;
}

const TOTAL_TILES = 25;

export const MinesGame: React.FC<MinesGameProps> = ({
  userCoins,
  onUpdateCoins,
  onBroadcastWin,
}) => {
  const [bet, setBet] = useState<number>(100);
  const [mineCount, setMineCount] = useState<number>(3);
  const [gameState, setGameState] = useState<'idle' | 'playing' | 'cashed' | 'busted'>('idle');
  const [tiles, setTiles] = useState<TileState[]>(() =>
    Array.from({ length: TOTAL_TILES }, (_, index) => ({
      index,
      isMine: false,
      isRevealed: false,
    }))
  );
  const [revealedCount, setRevealedCount] = useState<number>(0);
  const [lastWin, setLastWin] = useState<{ amount: number; multiplier: number } | null>(null);
  const [bragged, setBragged] = useState<boolean>(false);

  // Helper to calculate exact fair multiplier based on open-source Stake Mines formulas
  const calculateMultiplier = (revealed: number, mines: number): number => {
    if (revealed === 0) return 1.0;
    const totalGems = TOTAL_TILES - mines;
    if (revealed > totalGems) return 1.0;

    let mult = 0.99; // 99% RTP
    for (let i = 0; i < revealed; i++) {
      mult *= (TOTAL_TILES - i) / (totalGems - i);
    }
    return Math.floor(mult * 100) / 100;
  };

  const currentMultiplier = calculateMultiplier(revealedCount, mineCount);
  const nextMultiplier = calculateMultiplier(revealedCount + 1, mineCount);

  // Start a new Mines round
  const startGame = () => {
    if (userCoins < bet) {
      sound.broke();
      alert('Saldo insuficiente para realizar esta apuesta.');
      return;
    }

    onUpdateCoins(-bet);
    sound.whoosh();

    // 1. Generate random mine positions using crypto RNG
    const mineIndices = new Set<number>();
    while (mineIndices.size < mineCount) {
      const randArr = new Uint32Array(1);
      crypto.getRandomValues(randArr);
      const randIdx = randArr[0] % TOTAL_TILES;
      mineIndices.add(randIdx);
    }

    const newTiles: TileState[] = Array.from({ length: TOTAL_TILES }, (_, idx) => ({
      index: idx,
      isMine: mineIndices.has(idx),
      isRevealed: false,
    }));

    setTiles(newTiles);
    setRevealedCount(0);
    setGameState('playing');
    setLastWin(null);
    setBragged(false);
  };

  // Handle clicking a specific tile
  const handleTileClick = (index: number) => {
    if (gameState !== 'playing') return;
    const tile = tiles[index];
    if (tile.isRevealed) return;

    if (tile.isMine) {
      // Hit a mine! Busted!
      sound.crashExplode();
      setGameState('busted');
      setTiles((prev) =>
        prev.map((t) => (t.index === index ? { ...t, isRevealed: true } : t))
      );
      return;
    }

    // Safe tile / gem!
    const nextRevealed = revealedCount + 1;
    setRevealedCount(nextRevealed);
    sound.gemPing(nextRevealed);

    const updatedTiles = tiles.map((t) =>
      t.index === index ? { ...t, isRevealed: true } : t
    );
    setTiles(updatedTiles);

    // If all safe tiles have been found, auto cashout jackpot!
    const totalSafe = TOTAL_TILES - mineCount;
    if (nextRevealed === totalSafe) {
      const finalMult = calculateMultiplier(nextRevealed, mineCount);
      const win = Math.round(bet * finalMult);
      onUpdateCoins(win);
      setLastWin({ amount: win, multiplier: finalMult });
      setGameState('cashed');
      sound.coinWin();
      confetti({ particleCount: 120, spread: 80 });
      if (finalMult >= 2.5) {
        onBroadcastWin('mines', finalMult, win);
      }
    }
  };

  // Quick Pick: reveals a random unopened tile
  const handleQuickPick = () => {
    if (gameState !== 'playing') return;
    const unrevealed = tiles.filter((t) => !t.isRevealed);
    if (unrevealed.length === 0) return;

    const rand = Math.floor(Math.random() * unrevealed.length);
    handleTileClick(unrevealed[rand].index);
  };

  // Cash out current winnings
  const handleCashOut = () => {
    if (gameState !== 'playing' || revealedCount === 0) return;

    const winAmount = Math.round(bet * currentMultiplier);
    onUpdateCoins(winAmount);
    setLastWin({ amount: winAmount, multiplier: currentMultiplier });
    setGameState('cashed');
    sound.coinWin();

    if (currentMultiplier >= 2.5) {
      confetti({ particleCount: 80, spread: 60, origin: { y: 0.6 } });
      onBroadcastWin('mines', currentMultiplier, winAmount);
    }
  };

  const handleBrag = () => {
    if (!lastWin || bragged) return;
    onBroadcastWin('mines', lastWin.multiplier, lastWin.amount);
    setBragged(true);
    sound.coinWin();
  };

  const isGameOver = gameState === 'cashed' || gameState === 'busted';

  return (
    <div className="glass-panel rounded-3xl p-4 sm:p-6 shadow-[0_16px_50px_rgba(0,0,0,0.6)] flex flex-col items-center border border-white/[0.08]">
      {/* Header telemetry */}
      <div className="w-full flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3.5 mb-3 border-b border-white/[0.06]">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400">
            <Server className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold tracking-tight text-white font-mono">
                Minas de Red (SMR2)
              </h2>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-white/[0.04] text-zinc-400 border border-white/10 font-medium">
                {mineCount} minas · {TOTAL_TILES - mineCount} servidores
              </span>
            </div>
            <p className="text-[11px] text-zinc-500 font-mono">
              Descubre servidores funcionales y retira antes del cortocircuito
            </p>
          </div>
        </div>

        {/* Live Multiplier readout */}
        <div className="flex items-center gap-2">
          {gameState === 'playing' && (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 font-mono">
              <span className="text-[11px] text-emerald-400 font-medium">Multiplicador:</span>
              <span className="text-sm font-bold text-white tabular-nums">
                x{currentMultiplier.toFixed(2)}
              </span>
            </div>
          )}

          {gameState === 'playing' && (
            <button
              type="button"
              onClick={handleQuickPick}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 text-xs font-mono text-zinc-300 transition-all cursor-pointer"
            >
              <Shuffle className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Aleatorio</span>
            </button>
          )}
        </div>
      </div>

      {/* 2-Column Responsive Layout: Left Grid / Right Cockpit */}
      <div className="w-full grid grid-cols-1 md:grid-cols-12 gap-5 items-start">
        {/* Left Column: 5x5 Mines Board */}
        <div className="md:col-span-7 flex flex-col items-center">
          <div className="w-full max-w-sm sm:max-w-md aspect-square grid grid-cols-5 gap-2 sm:gap-2.5 p-3 rounded-2xl bg-[#09090d] border border-white/[0.08] shadow-inner select-none">
            {tiles.map((tile) => {
              const showContent = tile.isRevealed || isGameOver;
              const isMineAndRevealed = showContent && tile.isMine;
              const isSafeAndRevealed = showContent && !tile.isMine;

              return (
                <button
                  key={tile.index}
                  type="button"
                  disabled={gameState !== 'playing' || tile.isRevealed}
                  onClick={() => handleTileClick(tile.index)}
                  className={`relative rounded-xl border flex items-center justify-center transition-all cursor-pointer aspect-square ${
                    !tile.isRevealed && gameState === 'playing'
                      ? 'bg-zinc-900/90 hover:bg-zinc-800 border-white/10 hover:border-emerald-500/40 active:scale-95 shadow-sm'
                      : tile.isRevealed && !tile.isMine
                      ? 'bg-emerald-500/20 border-emerald-500/50 shadow-[0_0_15px_rgba(16,185,129,0.25)]'
                      : tile.isRevealed && tile.isMine
                      ? 'bg-rose-500/30 border-rose-500 ring-2 ring-rose-500/50 shadow-[0_0_20px_rgba(239,68,68,0.4)]'
                      : isGameOver && tile.isMine
                      ? 'bg-rose-950/40 border-rose-500/30 opacity-60'
                      : isGameOver && !tile.isMine
                      ? 'bg-emerald-950/30 border-emerald-500/20 opacity-50'
                      : 'bg-zinc-900 border-white/[0.06]'
                  }`}
                >
                  {isSafeAndRevealed ? (
                    <div className="flex flex-col items-center justify-center animate-in zoom-in-75 duration-150">
                      <Server className="w-5 h-5 sm:w-6 sm:h-6 text-emerald-400" />
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 mt-1 animate-pulse" />
                    </div>
                  ) : isMineAndRevealed ? (
                    <div className="flex flex-col items-center justify-center animate-in zoom-in-90 duration-150">
                      <Bomb className="w-5 h-5 sm:w-6 sm:h-6 text-rose-500 animate-bounce" />
                      <Flame className="w-3 h-3 text-amber-400 -mt-1" />
                    </div>
                  ) : (
                    <div className="w-2.5 h-2.5 rounded-full bg-white/[0.08]" />
                  )}
                </button>
              );
            })}
          </div>

          {/* Game Over Banner */}
          {gameState === 'busted' && (
            <div className="w-full max-w-sm sm:max-w-md mt-3 p-3 rounded-2xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-between text-xs font-mono text-rose-300 animate-in fade-in">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
                <span>Cortocircuito: Servidor quemado</span>
              </div>
              <span className="font-bold">0 fichas</span>
            </div>
          )}

          {gameState === 'cashed' && lastWin && (
            <div className="w-full max-w-sm sm:max-w-md mt-3 p-3.5 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-between text-xs font-mono text-emerald-300 animate-in fade-in">
              <div className="flex items-center gap-2">
                <Trophy className="w-4 h-4 text-amber-400 shrink-0" />
                <div>
                  <span className="font-bold block text-white">
                    +{lastWin.amount.toLocaleString()} fichas
                  </span>
                  <span className="text-[10px] text-emerald-400/80">
                    Cobrado en x{lastWin.multiplier.toFixed(2)}
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={handleBrag}
                disabled={bragged}
                className="px-2.5 py-1.5 rounded-xl bg-white text-black font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer active:scale-95 disabled:opacity-50"
              >
                <Share2 className="w-3 h-3" />
                <span>{bragged ? 'Compartido' : 'Al Chat'}</span>
              </button>
            </div>
          )}
        </div>

        {/* Right Column: Controls, Mines & Bet Config */}
        <div className="md:col-span-5 space-y-4">
          {/* Mine count selection */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs font-mono">
              <span className="text-zinc-400 flex items-center gap-1.5">
                <Bomb className="w-3.5 h-3.5 text-rose-400" />
                <span>Número de minas:</span>
              </span>
              <span className="text-white font-bold">{mineCount}</span>
            </div>

            <div className="grid grid-cols-4 gap-1 bg-black/40 p-1.5 rounded-2xl border border-white/[0.06]">
              {[1, 3, 5, 10].map((count) => (
                <button
                  key={count}
                  type="button"
                  disabled={gameState === 'playing'}
                  onClick={() => {
                    setMineCount(count);
                    sound.tap();
                  }}
                  className={`py-1.5 rounded-xl text-xs font-mono font-medium transition-all cursor-pointer disabled:opacity-40 ${
                    mineCount === count
                      ? 'bg-white text-black font-bold shadow-sm'
                      : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  {count} {count === 1 ? 'Mina' : 'Minas'}
                </button>
              ))}
            </div>
          </div>

          {/* Quick Bet Buttons */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs font-mono">
              <span className="text-zinc-400 flex items-center gap-1.5">
                <Coins className="w-3.5 h-3.5 text-amber-400" />
                <span>Apuesta:</span>
              </span>
              <span className="text-amber-300 font-bold">{bet.toLocaleString()} fichas</span>
            </div>

            <div className="flex items-center gap-1 bg-black/40 p-1.5 rounded-2xl border border-white/[0.06]">
              <button
                type="button"
                disabled={gameState === 'playing'}
                onClick={() => {
                  setBet((prev) => Math.max(10, Math.floor(prev / 2)));
                  sound.tap();
                }}
                className="flex-1 py-1.5 rounded-xl text-xs font-mono font-medium text-zinc-400 hover:text-white bg-white/[0.02] border border-white/[0.04] disabled:opacity-40 cursor-pointer"
              >
                ½
              </button>
              <button
                type="button"
                disabled={gameState === 'playing'}
                onClick={() => {
                  setBet((prev) => Math.min(Math.min(userCoins, 10000), prev * 2));
                  sound.tap();
                }}
                className="flex-1 py-1.5 rounded-xl text-xs font-mono font-medium text-zinc-400 hover:text-white bg-white/[0.02] border border-white/[0.04] disabled:opacity-40 cursor-pointer"
              >
                2×
              </button>
              {[50, 100, 250, 500].map((amt) => (
                <button
                  key={amt}
                  type="button"
                  disabled={gameState === 'playing'}
                  onClick={() => {
                    setBet(amt);
                    sound.tap();
                  }}
                  className={`flex-1 py-1.5 rounded-xl text-xs font-mono transition-all disabled:opacity-40 cursor-pointer ${
                    bet === amt
                      ? 'bg-zinc-200 text-black font-bold shadow-sm'
                      : 'text-zinc-400 hover:text-white bg-white/[0.02] border border-white/[0.04]'
                  }`}
                >
                  {amt}
                </button>
              ))}
              <button
                type="button"
                disabled={gameState === 'playing'}
                onClick={() => {
                  setBet(Math.min(userCoins > 0 ? userCoins : 1000, 2500));
                  sound.tap();
                }}
                className={`flex-1 py-1.5 rounded-xl text-xs font-mono font-bold transition-all disabled:opacity-40 cursor-pointer ${
                  bet >= 2500 || bet === userCoins
                    ? 'bg-amber-400 text-black'
                    : 'text-amber-400 hover:text-amber-300 bg-amber-500/10'
                }`}
              >
                MÁX
              </button>
            </div>
          </div>

          {/* Current telemetry when playing */}
          {gameState === 'playing' && (
            <div className="p-3.5 rounded-2xl bg-white/[0.02] border border-white/[0.08] space-y-2 text-xs font-mono">
              <div className="flex items-center justify-between">
                <span className="text-zinc-400">Gemas descubiertas:</span>
                <span className="text-white font-bold">
                  {revealedCount} / {TOTAL_TILES - mineCount}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-zinc-400">Siguiente multiplicador:</span>
                <span className="text-emerald-400 font-bold">
                  x{nextMultiplier.toFixed(2)}
                </span>
              </div>
            </div>
          )}

          {/* Action Button: Start or Cashout */}
          {gameState === 'playing' ? (
            <button
              type="button"
              disabled={revealedCount === 0}
              onClick={handleCashOut}
              className={`w-full py-4 rounded-2xl font-mono text-sm font-bold tracking-wider transition-all cursor-pointer flex items-center justify-center gap-2 shadow-lg active:scale-95 ${
                revealedCount === 0
                  ? 'bg-zinc-800 text-zinc-500 border border-white/[0.06] cursor-not-allowed'
                  : 'bg-emerald-500 hover:bg-emerald-400 text-black shadow-emerald-500/30'
              }`}
            >
              <span>
                {revealedCount === 0
                  ? 'SELECCIONA UN SERVIDOR'
                  : `RETIRAR ${(bet * currentMultiplier).toFixed(0)} FICHAS (x${currentMultiplier.toFixed(2)})`}
              </span>
            </button>
          ) : (
            <button
              type="button"
              onClick={startGame}
              className="w-full py-4 rounded-2xl font-mono text-sm font-bold tracking-wider bg-white hover:bg-zinc-200 text-black shadow-lg shadow-white/10 active:scale-95 transition-all cursor-pointer flex items-center justify-center gap-2"
            >
              <Zap className="w-4 h-4 fill-black" />
              <span>INICIAR PARTIDA (-{bet} FICHAS)</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
