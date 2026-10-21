'use client';

import React, { useState, useEffect } from 'react';
import {
  Plus,
  Users,
  Coins,
  RefreshCw,
  Play,
  KeyRound,
  ShieldAlert,
  Flame,
  Clock,
  Sparkles,
} from 'lucide-react';
import { RRRoom } from '@/lib/russianRoulette';
import { UserProfile } from '@/lib/types';
import { sound } from '@/lib/audio';

interface RussianRouletteLobbyProps {
  user: UserProfile | null;
  onJoinRoom: (roomIdOrCode: string) => void;
  onRoomCreated: (room: RRRoom) => void;
  onOpenAuth: () => void;
}

export const RussianRouletteLobby: React.FC<RussianRouletteLobbyProps> = ({
  user,
  onJoinRoom,
  onRoomCreated,
  onOpenAuth,
}) => {
  const [rooms, setRooms] = useState<RRRoom[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [roomCodeInput, setRoomCodeInput] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Create room modal form state
  const [newRoomName, setNewRoomName] = useState('');
  const [newBetAmount, setNewBetAmount] = useState<number>(25);
  const [newMaxPlayers, setNewMaxPlayers] = useState<number>(6);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchRooms = async () => {
    try {
      const res = await fetch('/api/russian-roulette/rooms');
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setRooms(data.rooms || []);
        }
      }
    } catch (err) {
      console.warn('Error fetching rooms:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRooms();
    const interval = setInterval(fetchRooms, 3500);
    return () => clearInterval(interval);
  }, []);

  const handleCreateRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      onOpenAuth();
      return;
    }

    if (user.coins < newBetAmount) {
      setErrorMsg(`Saldo insuficiente (${user.coins} fichas). Se requieren ${newBetAmount}.`);
      return;
    }

    setIsSubmitting(true);
    setErrorMsg(null);

    try {
      const res = await fetch('/api/russian-roulette/rooms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newRoomName || `${user.username}'s Arena`,
          betAmount: newBetAmount,
          maxPlayers: newMaxPlayers,
          user,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Error al crear la sala.');
      }

      setIsCreateOpen(false);
      onRoomCreated(data.room);
    } catch (err: any) {
      setErrorMsg(err?.message || 'Error inesperado al crear la sala.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleJoinByCode = (e: React.FormEvent) => {
    e.preventDefault();
    const code = roomCodeInput.trim().toUpperCase();
    if (!code) return;
    if (!user) {
      onOpenAuth();
      return;
    }
    onJoinRoom(code);
  };

  return (
    <div className="space-y-6">
      {/* Top Header / Actions Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl bg-white/[0.02] border border-white/[0.08]">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1 rounded-md bg-amber-400/10 text-amber-400">
              <Flame className="w-4 h-4" />
            </span>
            <h2 className="text-lg font-bold text-white tracking-tight">
              Ruleta Rusa Multijugador
            </h2>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              En Vivo (2-6 Jugadores)
            </span>
          </div>
          <p className="text-xs text-zinc-400 mt-1">
            Partidas por turnos con cilindro virtual de 6 recámaras. El último en pie se lleva todo el bote.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => {
              if (!user) onOpenAuth();
              else {
                setErrorMsg(null);
                setIsCreateOpen(true);
                sound.tap();
              }
            }}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-black font-bold text-xs shadow-lg shadow-amber-400/10 transition-all cursor-pointer active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span>Crear Sala</span>
          </button>

          <button
            onClick={() => {
              fetchRooms();
              sound.tap();
            }}
            title="Refrescar lista"
            className="p-2 rounded-xl bg-white/[0.05] border border-white/10 hover:bg-white/10 text-zinc-300 transition-all cursor-pointer active:scale-95"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Code Join Bar */}
      <form
        onSubmit={handleJoinByCode}
        className="flex items-center gap-2 p-3 rounded-2xl bg-black/40 border border-white/[0.08]"
      >
        <KeyRound className="w-4 h-4 text-zinc-500 ml-2" />
        <input
          type="text"
          value={roomCodeInput}
          onChange={(e) => setRoomCodeInput(e.target.value.toUpperCase())}
          placeholder="¿Tienes un código de sala? (ej: R68K9A)"
          maxLength={6}
          className="flex-1 bg-transparent text-xs text-white placeholder-zinc-500 font-mono tracking-wider uppercase focus:outline-none"
        />
        <button
          type="submit"
          className="px-3.5 py-1.5 rounded-xl bg-white/[0.08] hover:bg-white/15 text-xs text-white font-semibold transition-all cursor-pointer"
        >
          Unirse
        </button>
      </form>

      {/* Rooms Grid */}
      <div className="space-y-3">
        <div className="flex items-center justify-between text-xs text-zinc-400 px-1">
          <span>Salas disponibles ({rooms.length})</span>
          <span className="text-[11px] text-zinc-500">Actualización en tiempo real</span>
        </div>

        {rooms.length === 0 ? (
          <div className="p-12 text-center rounded-2xl bg-white/[0.02] border border-white/[0.06] space-y-3">
            <Users className="w-8 h-8 text-zinc-600 mx-auto" />
            <p className="text-sm text-zinc-400 font-medium">
              No hay salas abiertas en este momento.
            </p>
            <p className="text-xs text-zinc-500">
              ¡Crea la primera sala y comparte el código con tus compañeros!
            </p>
            <button
              onClick={() => {
                if (!user) onOpenAuth();
                else setIsCreateOpen(true);
              }}
              className="mt-2 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-amber-400 text-black text-xs font-bold"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Crear Sala Ahora</span>
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {rooms.map((room) => {
              const isFull = (room.players?.length || 0) >= room.max_players;
              const isWaiting = room.status === 'waiting';

              return (
                <div
                  key={room.id}
                  className="p-4 rounded-2xl bg-[#0c0c10] border border-white/[0.08] hover:border-white/20 transition-all flex flex-col justify-between space-y-3 shadow-md"
                >
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-sm text-white truncate max-w-[170px]">
                        {room.name}
                      </span>
                      <span
                        className={`text-[10px] font-mono px-2 py-0.5 rounded-md font-semibold border ${
                          isWaiting
                            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                            : 'bg-amber-400/10 text-amber-400 border-amber-400/20'
                        }`}
                      >
                        {isWaiting ? 'Esperando' : 'En Juego'}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 text-xs text-zinc-400">
                      <span>Anfitrión: @{room.host_username}</span>
                      <span>•</span>
                      <span className="font-mono text-zinc-500">Cód: {room.code}</span>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-white/[0.06] flex items-center justify-between text-xs">
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-1 text-amber-300 font-semibold">
                        <Coins className="w-3.5 h-3.5 text-amber-400" />
                        <span>{room.bet_amount}</span>
                      </div>
                      <div className="flex items-center gap-1 text-zinc-400">
                        <Users className="w-3.5 h-3.5" />
                        <span>
                          {room.players?.length || 0}/{room.max_players}
                        </span>
                      </div>
                    </div>

                    <button
                      onClick={() => {
                        if (!user) onOpenAuth();
                        else onJoinRoom(room.id);
                        sound.tap();
                      }}
                      disabled={isFull && isWaiting}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                        isWaiting && !isFull
                          ? 'bg-white hover:bg-zinc-200 text-black active:scale-95'
                          : 'bg-white/10 text-zinc-400 hover:text-white'
                      }`}
                    >
                      {isWaiting ? (isFull ? 'Llena' : 'Entrar') : 'Espectar'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Create Room Modal */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="max-w-md w-full p-6 rounded-2xl bg-[#0d0d12] border border-white/20 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-400" />
                <h3 className="font-bold text-sm text-white">Crear Nueva Sala</h3>
              </div>
              <button
                onClick={() => setIsCreateOpen(false)}
                className="text-zinc-400 hover:text-white text-xs px-2 py-1 rounded-lg bg-white/5"
              >
                Cancelar
              </button>
            </div>

            {errorMsg && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            <form onSubmit={handleCreateRoom} className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs text-zinc-400 font-medium">Nombre de la Sala</label>
                <input
                  type="text"
                  value={newRoomName}
                  onChange={(e) => setNewRoomName(e.target.value)}
                  placeholder={`Arena de @${user?.username || 'alumno'}`}
                  maxLength={30}
                  className="w-full px-3 py-2 rounded-xl bg-black border border-white/10 text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-amber-400"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs text-zinc-400 font-medium">
                  Apuesta de Entrada (Fichas)
                </label>
                <div className="grid grid-cols-4 gap-2 mb-2">
                  {[25, 50, 100, 250].map((amount) => (
                    <button
                      type="button"
                      key={amount}
                      onClick={() => setNewBetAmount(amount)}
                      className={`py-1.5 rounded-xl text-xs font-mono font-semibold border transition-all cursor-pointer ${
                        newBetAmount === amount
                          ? 'bg-amber-400 text-black border-amber-400'
                          : 'bg-white/[0.04] text-zinc-300 border-white/10 hover:bg-white/10'
                      }`}
                    >
                      {amount}
                    </button>
                  ))}
                </div>
                <input
                  type="number"
                  min={10}
                  max={Math.min(user?.coins ?? 500, 500)}
                  value={newBetAmount}
                  onChange={(e) => setNewBetAmount(Math.min(500, parseInt(e.target.value, 10) || 25))}
                  className="w-full px-3 py-2 rounded-xl bg-black border border-white/10 text-xs text-amber-300 font-mono font-bold focus:outline-none focus:border-amber-400"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs text-zinc-400 font-medium">
                  Número Máximo de Jugadores (2 a 6)
                </label>
                <div className="grid grid-cols-5 gap-2">
                  {[2, 3, 4, 5, 6].map((num) => (
                    <button
                      type="button"
                      key={num}
                      onClick={() => setNewMaxPlayers(num)}
                      className={`py-1.5 rounded-xl text-xs font-mono font-semibold border transition-all cursor-pointer ${
                        newMaxPlayers === num
                          ? 'bg-white text-black border-white'
                          : 'bg-white/[0.04] text-zinc-300 border-white/10 hover:bg-white/10'
                      }`}
                    >
                      {num}
                    </button>
                  ))}
                </div>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsCreateOpen(false)}
                  className="px-3 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-zinc-400 text-xs"
                >
                  Volver
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-black font-bold text-xs shadow-md transition-all active:scale-95"
                >
                  {isSubmitting ? 'Creando...' : `Confirmar y Pagar ${newBetAmount} Fichas`}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
