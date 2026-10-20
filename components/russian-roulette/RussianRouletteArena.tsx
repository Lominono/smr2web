'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import confetti from 'canvas-confetti';
import {
  ArrowLeft,
  Copy,
  Check,
  Crown,
  Flame,
  Coins,
  Users,
  Clock,
  Skull,
  Zap,
  ShieldAlert,
  Sparkles,
  Volume2,
} from 'lucide-react';
import { RussianRouletteChamber } from './RussianRouletteChamber';
import { RRRoom, RRRoomPlayer, RRGame, RRTurn } from '@/lib/russianRoulette';
import { UserProfile } from '@/lib/types';
import { sound } from '@/lib/audio';
import { createClient } from '@/lib/supabase/client';

interface RussianRouletteArenaProps {
  user: UserProfile | null;
  roomId: string;
  onLeaveRoom: () => void;
  onUpdateCoins: (newCoins: number) => void;
}

export const RussianRouletteArena: React.FC<RussianRouletteArenaProps> = ({
  user,
  roomId,
  onLeaveRoom,
  onUpdateCoins,
}) => {
  const [room, setRoom] = useState<RRRoom | null>(null);
  const [activeGame, setActiveGame] = useState<RRGame | null>(null);
  const [lastTurn, setLastTurn] = useState<RRTurn | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [secondsLeft, setSecondsLeft] = useState<number>(25);
  const [hasCelebrated, setHasCelebrated] = useState(false);

  // Fetch full room state from server
  const fetchRoomState = useCallback(async () => {
    try {
      const res = await fetch(`/api/russian-roulette/room/${roomId}`);
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.room) {
          const r: RRRoom = data.room;
          setRoom(r);
          if (r.active_game) {
            setActiveGame(r.active_game);
            if (r.active_game.last_turn) {
              setLastTurn(r.active_game.last_turn);
            }
          }
        }
      }
    } catch (err) {
      console.warn('Error fetching room state:', err);
    } finally {
      setLoading(false);
    }
  }, [roomId]);

  // Initial load and fast polling fallback
  useEffect(() => {
    fetchRoomState();
    const interval = setInterval(fetchRoomState, 1500);
    return () => clearInterval(interval);
  }, [fetchRoomState]);

  // Supabase Realtime channel subscription
  useEffect(() => {
    const supabase = createClient();
    if (!supabase) return;

    const channel = supabase
      .channel(`rr_room_${roomId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'rr_rooms', filter: `id=eq.${roomId}` },
        () => fetchRoomState()
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'rr_games', filter: `room_id=eq.${roomId}` },
        () => fetchRoomState()
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'rr_turns', filter: `room_id=eq.${roomId}` },
        () => fetchRoomState()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [roomId, fetchRoomState]);

  // Turn timer countdown
  useEffect(() => {
    if (!activeGame || activeGame.status !== 'active' || !activeGame.turn_deadline) {
      return;
    }

    const updateTimer = () => {
      const deadline = new Date(activeGame.turn_deadline!).getTime();
      const now = Date.now();
      const diff = Math.max(0, Math.ceil((deadline - now) / 1000));
      setSecondsLeft(diff);

      // Trigger timeout if active player runs out of time
      if (diff === 0 && activeGame.active_player_id === user?.id && !actionLoading) {
        handleTimeoutAction();
      }
    };

    updateTimer();
    const timerInterval = setInterval(updateTimer, 500);
    return () => clearInterval(timerInterval);
  }, [activeGame, user?.id, actionLoading]);

  // Celebrate winner with confetti
  useEffect(() => {
    if (activeGame?.status === 'finished' && activeGame.winner_id && !hasCelebrated) {
      setHasCelebrated(true);
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 },
      });
      sound.jackpot();

      // If user is the winner, update their coins
      if (user && activeGame.winner_id === user.id && room) {
        onUpdateCoins(user.coins + room.pot);
      }
    }
  }, [activeGame?.status, activeGame?.winner_id, hasCelebrated, user, room, onUpdateCoins]);

  // Copy room code
  const handleCopyCode = () => {
    if (!room?.code) return;
    navigator.clipboard.writeText(room.code);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
    sound.tap();
  };

  // Host starts game
  const handleStartGame = async () => {
    if (!user || !room) return;
    setErrorMsg(null);
    setActionLoading(true);

    try {
      const res = await fetch('/api/russian-roulette/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ roomId: room.id, user }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Error al iniciar la partida.');
      }

      sound.whoosh();
      fetchRoomState();
    } catch (err: any) {
      setErrorMsg(err?.message || 'Error al iniciar.');
    } finally {
      setActionLoading(false);
    }
  };

  // Active player pulls trigger
  const handlePullTrigger = async () => {
    if (!user || !room || !activeGame) return;
    setErrorMsg(null);
    setActionLoading(true);
    sound.tap();

    try {
      const res = await fetch('/api/russian-roulette/action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ roomId: room.id, user }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Error al procesar el disparo.');
      }

      if (data.isEliminated) {
        sound.crashExplode(); // Discharge boom!
      } else {
        sound.coinWin(); // Survived blank!
      }

      fetchRoomState();
    } catch (err: any) {
      setErrorMsg(err?.message || 'Error al disparar.');
    } finally {
      setActionLoading(false);
    }
  };

  // Auto-timeout trigger
  const handleTimeoutAction = async () => {
    if (!user || !room) return;
    try {
      await fetch('/api/russian-roulette/timeout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ roomId: room.id, user }),
      });
      fetchRoomState();
    } catch {}
  };

  if (loading && !room) {
    return (
      <div className="p-16 text-center text-zinc-400 font-mono text-xs space-y-3">
        <div className="w-6 h-6 border-2 border-amber-400 border-t-transparent rounded-full animate-spin mx-auto" />
        <p>Conectando con la sala de Ruleta Rusa...</p>
      </div>
    );
  }

  if (!room) {
    return (
      <div className="p-8 text-center text-zinc-400 font-mono text-xs space-y-3">
        <p>La sala no existe o ha sido cancelada.</p>
        <button
          onClick={onLeaveRoom}
          className="px-4 py-2 rounded-xl bg-white text-black font-bold"
        >
          Volver al Lobby
        </button>
      </div>
    );
  }

  const players = room.players || [];
  const isHost = user?.id === room.host_id;
  const isWaiting = room.status === 'waiting';
  const isInProgress = room.status === 'in_progress';
  const isFinished = room.status === 'finished';

  const myPlayer = players.find((p) => p.user_id === user?.id);
  const isMyTurn = isInProgress && activeGame?.active_player_id === user?.id && myPlayer?.is_alive;
  const amIEliminated = myPlayer && !myPlayer.is_alive;

  const activePlayerObj = players.find((p) => p.user_id === activeGame?.active_player_id);

  return (
    <div className="space-y-5">
      {/* Top Arena Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-4 rounded-2xl bg-[#0c0c12] border border-white/[0.08]">
        <div className="flex items-center gap-3">
          <button
            onClick={onLeaveRoom}
            className="p-2 rounded-xl bg-white/[0.05] border border-white/10 hover:bg-white/10 text-zinc-300 transition-all cursor-pointer"
            title="Salir de la sala"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="font-bold text-sm text-white tracking-tight">{room.name}</h2>
              <button
                onClick={handleCopyCode}
                className="flex items-center gap-1 px-2 py-0.5 rounded-lg bg-black/60 border border-white/10 text-[11px] font-mono text-zinc-300 hover:text-white transition-all cursor-pointer"
                title="Copiar código de sala"
              >
                <span>{room.code}</span>
                {copiedCode ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3 text-zinc-500" />}
              </button>
            </div>
            <p className="text-[11px] text-zinc-500 font-mono">
              Anfitrión: @{room.host_username} {isHost && '(Tú)'}
            </p>
          </div>
        </div>

        {/* Pot & Bet Pill */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-amber-500/10 border border-amber-500/20">
            <Coins className="w-4 h-4 text-amber-400" />
            <div className="flex flex-col">
              <span className="text-[10px] text-zinc-500 font-mono leading-none">BOTE EN JUEGO</span>
              <span className="text-xs font-mono font-bold text-amber-300">
                {room.pot.toLocaleString('es-ES')} Fichas
              </span>
            </div>
          </div>
        </div>
      </div>

      {errorMsg && (
        <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-center gap-2">
          <ShieldAlert className="w-4 h-4 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Main Arena Battlefield */}
      <div className="relative p-6 rounded-3xl bg-radial from-[#151520] to-[#08080c] border border-white/[0.08] flex flex-col items-center justify-center space-y-6 overflow-hidden min-h-[380px]">
        {/* Stylized Chamber Graphic */}
        <div className="relative z-10 flex flex-col items-center">
          <RussianRouletteChamber
            currentChamber={activeGame ? activeGame.current_chamber : 0}
            isSpinning={actionLoading}
            lastResult={lastTurn ? lastTurn.result : null}
            size={240}
          />

          {/* Chamber Status Indicator */}
          <div className="mt-3 text-center">
            {isInProgress && (
              <span className="text-[11px] font-mono px-3 py-1 rounded-full bg-white/[0.05] border border-white/10 text-zinc-300">
                Recámara activa: <span className="text-amber-400 font-bold">#{(activeGame?.current_chamber ?? 0) + 1} de 6</span>
              </span>
            )}
          </div>
        </div>

        {/* Players Seats Circular Grid */}
        <div className="w-full max-w-2xl grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2.5 z-10">
          {players.map((p) => {
            const isTurn = isInProgress && activeGame?.active_player_id === p.user_id;
            const isMe = user?.id === p.user_id;
            const isWinner = isFinished && activeGame?.winner_id === p.user_id;

            return (
              <div
                key={p.id}
                className={`p-2.5 rounded-2xl border flex flex-col items-center text-center transition-all ${
                  isWinner
                    ? 'bg-amber-400/15 border-amber-400/50 shadow-lg shadow-amber-400/20'
                    : isTurn
                    ? 'bg-amber-500/10 border-amber-400 ring-2 ring-amber-400/30 animate-pulse'
                    : !p.is_alive
                    ? 'bg-black/30 border-white/[0.04] opacity-40'
                    : 'bg-black/40 border-white/[0.08]'
                }`}
              >
                {/* Avatar */}
                <div className="relative mb-1">
                  <div
                    className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-xs uppercase font-mono border ${
                      isWinner
                        ? 'bg-amber-400 text-black border-amber-300'
                        : isTurn
                        ? 'bg-white text-black border-white'
                        : !p.is_alive
                        ? 'bg-rose-500/20 text-rose-400 border-rose-500/30'
                        : 'bg-white/[0.08] text-white border-white/10'
                    }`}
                  >
                    {p.username.charAt(0)}
                  </div>
                  {isWinner && (
                    <Crown className="w-4 h-4 text-amber-400 absolute -top-2.5 -right-2 drop-shadow" />
                  )}
                  {!p.is_alive && (
                    <Skull className="w-3.5 h-3.5 text-rose-400 absolute -top-1.5 -right-1.5 drop-shadow" />
                  )}
                </div>

                <span className="text-[11px] font-bold text-white truncate max-w-[85px]">
                  @{p.username}
                </span>

                <span className="text-[9px] font-mono mt-0.5">
                  {isWinner ? (
                    <span className="text-amber-300 font-bold">¡GANADOR!</span>
                  ) : !p.is_alive ? (
                    <span className="text-rose-400">Eliminado</span>
                  ) : isTurn ? (
                    <span className="text-amber-400 font-bold">Disparando</span>
                  ) : (
                    <span className="text-emerald-400">Vivo</span>
                  )}
                </span>
              </div>
            );
          })}
        </div>

        {/* Action Controls & Turn Indicators */}
        <div className="w-full max-w-md z-10 pt-2">
          {/* STATE 1: WAITING IN LOBBY */}
          {isWaiting && (
            <div className="p-4 rounded-2xl bg-black/60 border border-white/10 text-center space-y-3">
              <div className="text-xs text-zinc-400">
                Jugadores en la sala:{' '}
                <span className="font-bold text-white">
                  {players.length} / {room.max_players}
                </span>{' '}
                (Mínimo 2 requeridos)
              </div>

              {isHost ? (
                <button
                  onClick={handleStartGame}
                  disabled={players.length < 2 || actionLoading}
                  className="w-full py-3 rounded-xl bg-amber-400 hover:bg-amber-300 disabled:opacity-40 disabled:cursor-not-allowed text-black font-bold text-sm shadow-lg shadow-amber-400/10 transition-all cursor-pointer active:scale-95 flex items-center justify-center gap-2"
                >
                  <Zap className="w-4 h-4" />
                  <span>
                    {players.length < 2
                      ? 'Esperando a que se una otro jugador...'
                      : '¡INICIAR RULETA RUSA!'}
                  </span>
                </button>
              ) : (
                <div className="text-xs text-amber-300 flex items-center justify-center gap-2">
                  <Clock className="w-4 h-4 animate-spin" />
                  <span>Esperando a que el anfitrión @{room.host_username} inicie la partida...</span>
                </div>
              )}
            </div>
          )}

          {/* STATE 2: IN PROGRESS — MY TURN */}
          {isInProgress && isMyTurn && (
            <div className="p-5 rounded-2xl bg-amber-500/10 border border-amber-400/40 text-center space-y-3 shadow-xl shadow-amber-500/10 animate-in fade-in">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-amber-300 flex items-center gap-1.5">
                  <Flame className="w-4 h-4 text-amber-400" />
                  <span>¡ES TU TURNO DE DISPARAR!</span>
                </span>
                <span className="text-xs font-mono font-bold text-amber-400 px-2 py-0.5 rounded-lg bg-black/60 border border-amber-400/30">
                  {secondsLeft}s restantes
                </span>
              </div>

              <button
                onClick={handlePullTrigger}
                disabled={actionLoading}
                className="w-full py-4 rounded-2xl bg-gradient-to-r from-amber-400 to-yellow-500 hover:from-amber-300 hover:to-yellow-400 text-black font-black text-sm tracking-wide shadow-xl shadow-amber-400/20 transition-all cursor-pointer active:scale-95 flex items-center justify-center gap-2"
              >
                <Zap className="w-5 h-5 fill-black" />
                <span>
                  {actionLoading ? 'GIRANDO CILINDRO...' : '⚡ APRETAR GATILLO'}
                </span>
              </button>
            </div>
          )}

          {/* STATE 3: IN PROGRESS — SOMEONE ELSE'S TURN */}
          {isInProgress && !isMyTurn && !amIEliminated && (
            <div className="p-4 rounded-2xl bg-black/60 border border-white/10 text-center space-y-2">
              <div className="flex items-center justify-center gap-2 text-xs text-zinc-300">
                <Clock className="w-4 h-4 text-amber-400 animate-spin" />
                <span>
                  Turno de <span className="font-bold text-white">@{activePlayerObj?.username || 'oponente'}</span>...
                </span>
                <span className="text-[11px] font-mono text-zinc-500">({secondsLeft}s)</span>
              </div>
            </div>
          )}

          {/* STATE 4: ELIMINATED SPECTATOR */}
          {isInProgress && amIEliminated && (
            <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-center space-y-1">
              <div className="text-xs font-bold text-rose-300 flex items-center justify-center gap-1.5">
                <Skull className="w-4 h-4" />
                <span>Has sido descargado y eliminado</span>
              </div>
              <p className="text-[11px] text-zinc-400">
                Modo espectador activo mientras los demás jugadores completan la ronda.
              </p>
            </div>
          )}

          {/* STATE 5: FINISHED / WINNER */}
          {isFinished && (
            <div className="p-5 rounded-2xl bg-amber-400/10 border border-amber-400/40 text-center space-y-3 shadow-xl">
              <div className="w-12 h-12 rounded-2xl bg-amber-400 text-black flex items-center justify-center mx-auto shadow-md">
                <Crown className="w-7 h-7" />
              </div>
              <h3 className="text-base font-bold text-white">
                ¡Partida Finalizada!
              </h3>
              <p className="text-xs text-amber-300 font-semibold">
                Ganador: @{activeGame?.winner_username} ha reclamado el bote de {room.pot} fichas.
              </p>

              <div className="pt-2 flex items-center justify-center gap-2">
                <button
                  onClick={onLeaveRoom}
                  className="px-5 py-2.5 rounded-xl bg-white hover:bg-zinc-200 text-black font-bold text-xs transition-all cursor-pointer"
                >
                  Volver al Lobby
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
