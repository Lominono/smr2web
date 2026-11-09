'use client';

import React, { useState, useEffect } from 'react';
import {
  Plus,
  Users,
  Coins,
  RefreshCw,
  KeyRound,
  ShieldAlert,
  Flame,
  Swords,
  Copy,
  Check,
  TrendingUp,
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
  const [copiedRoomCode, setCopiedRoomCode] = useState<string | null>(null);
  const [filterMode, setFilterMode] = useState<'all' | '1v1' | 'multiplayer'>('all');

  // Modal de creación de sala con apuestas personalizadas
  const [newRoomName, setNewRoomName] = useState('');
  const [newBetAmount, setNewBetAmount] = useState<number>(50);
  const [isDuelMode, setIsDuelMode] = useState<boolean>(true); // true = 1v1 (2 jugadores), false = mesa (3 a 6)
  const [newMaxPlayers, setNewMaxPlayers] = useState<number>(2);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const userCoins = user?.coins ?? 0;

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

    const bet = Math.max(5, Math.floor(newBetAmount || 10));

    if (userCoins < bet) {
      setErrorMsg(`Saldo insuficiente (${userCoins.toLocaleString()} fichas). La apuesta es de ${bet.toLocaleString()} fichas.`);
      return;
    }

    setIsSubmitting(true);
    setErrorMsg(null);

    const playersCount = isDuelMode ? 2 : newMaxPlayers;
    const defaultName = isDuelMode
      ? `Duelo 1v1 vs @${user.username}`
      : `Mesa de @${user.username}`;

    try {
      const res = await fetch('/api/russian-roulette/rooms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newRoomName.trim() || defaultName,
          betAmount: bet,
          maxPlayers: playersCount,
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

  const handleCopyInvite = (room: RRRoom) => {
    const inviteText = `⚔️ ¡Te reto a un duelo de Ruleta Rusa de ${room.bet_amount.toLocaleString()} fichas! Entra con el código: ${room.code}`;
    if (navigator.clipboard) {
      navigator.clipboard.writeText(inviteText);
      sound.tap();
      setCopiedRoomCode(room.id);
      setTimeout(() => setCopiedRoomCode(null), 2000);
    }
  };

  // Filtrado de salas
  const filteredRooms = rooms.filter((r) => {
    if (filterMode === '1v1') return r.max_players === 2;
    if (filterMode === 'multiplayer') return r.max_players > 2;
    return true;
  });

  const estimatedPot = newBetAmount * (isDuelMode ? 2 : newMaxPlayers);
  const estimatedProfit = newBetAmount * ((isDuelMode ? 2 : newMaxPlayers) - 1);

  return (
    <div className="space-y-5">
      {/* Cabecera del Lobby y Botones de Creación */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl bg-surface border border-border shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-xl bg-amber-500/10 text-amber-500">
              <Swords className="w-4 h-4" />
            </span>
            <h2 className="text-base sm:text-lg font-bold text-foreground tracking-tight">
              Apuestas PvP entre Alumnos
            </h2>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 font-bold">
              En Vivo
            </span>
          </div>
          <p className="text-xs text-foreground-muted mt-1 leading-relaxed">
            Reta a compañeros en <strong>Duelos 1v1</strong> cara a cara o compite en mesas multijugador. Apuesta cualquier cantidad y el ganador se lleva todo el bote.
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <button
            type="button"
            onClick={() => {
              if (!user) onOpenAuth();
              else {
                setErrorMsg(null);
                setIsDuelMode(true);
                setNewMaxPlayers(2);
                setIsCreateOpen(true);
                sound.tap();
              }
            }}
            className="min-h-[44px] flex items-center gap-2 px-4 py-2.5 rounded-xl bg-foreground text-background font-bold text-xs shadow-md transition-all cursor-pointer active:scale-95 touch-manipulation"
          >
            <Plus className="w-4 h-4" />
            <span>Crear Apuesta / Sala</span>
          </button>

          <button
            type="button"
            onClick={() => {
              fetchRooms();
              sound.tap();
            }}
            title="Actualizar salas"
            aria-label="Actualizar lista de salas"
            className="w-11 h-11 rounded-xl bg-surface-raised border border-border text-foreground-muted hover:text-foreground flex items-center justify-center transition-all cursor-pointer active:scale-95 touch-manipulation"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-foreground' : ''}`} />
          </button>
        </div>
      </div>

      {/* Barra para unirse por código y selector de filtro */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        {/* Selector de filtro */}
        <div className="p-1 rounded-xl bg-surface-raised border border-border flex items-center gap-1 text-xs font-medium">
          <button
            type="button"
            onClick={() => {
              sound.tap();
              setFilterMode('all');
            }}
            className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
              filterMode === 'all'
                ? 'bg-foreground text-background font-bold shadow-xs'
                : 'text-foreground-muted hover:text-foreground'
            }`}
          >
            Todas ({rooms.length})
          </button>
          <button
            type="button"
            onClick={() => {
              sound.tap();
              setFilterMode('1v1');
            }}
            className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer flex items-center gap-1.5 ${
              filterMode === '1v1'
                ? 'bg-foreground text-background font-bold shadow-xs'
                : 'text-foreground-muted hover:text-foreground'
            }`}
          >
            <Swords className="w-3.5 h-3.5 text-amber-500" />
            <span>Duelos 1v1 ({rooms.filter((r) => r.max_players === 2).length})</span>
          </button>
          <button
            type="button"
            onClick={() => {
              sound.tap();
              setFilterMode('multiplayer');
            }}
            className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer flex items-center gap-1.5 ${
              filterMode === 'multiplayer'
                ? 'bg-foreground text-background font-bold shadow-xs'
                : 'text-foreground-muted hover:text-foreground'
            }`}
          >
            <Users className="w-3.5 h-3.5 text-sky-400" />
            <span>Mesas ({rooms.filter((r) => r.max_players > 2).length})</span>
          </button>
        </div>

        {/* Input de unirse con código */}
        <form
          onSubmit={handleJoinByCode}
          className="flex items-center gap-2 p-1.5 rounded-xl bg-surface-raised border border-border sm:max-w-xs w-full"
        >
          <KeyRound className="w-4 h-4 text-foreground-subtle ml-2 shrink-0" />
          <input
            type="text"
            value={roomCodeInput}
            onChange={(e) => setRoomCodeInput(e.target.value.toUpperCase())}
            placeholder="Código de sala (ej: 8F2K9A)"
            maxLength={6}
            className="flex-1 bg-transparent text-xs text-foreground placeholder:text-foreground-subtle font-mono tracking-wider uppercase focus:outline-none"
          />
          <button
            type="submit"
            className="px-3.5 py-1.5 rounded-lg bg-foreground text-background font-bold text-xs transition-all cursor-pointer active:scale-95 shrink-0"
          >
            Entrar
          </button>
        </form>
      </div>

      {/* Grid de Salas y Duelos Activos */}
      <div className="space-y-3">
        {filteredRooms.length === 0 ? (
          <div className="p-12 text-center rounded-2xl bg-surface-raised border border-border space-y-3">
            <Swords className="w-8 h-8 text-foreground-muted mx-auto opacity-60" />
            <p className="text-sm text-foreground font-semibold">
              {filterMode === '1v1'
                ? 'No hay duelos 1v1 abiertos en este momento.'
                : 'No hay salas de apuestas abiertas en este momento.'}
            </p>
            <p className="text-xs text-foreground-muted max-w-sm mx-auto">
              Crea un reto con la cantidad de fichas que quieras y comparte el código con tus compañeros de clase.
            </p>
            <button
              type="button"
              onClick={() => {
                if (!user) onOpenAuth();
                else setIsCreateOpen(true);
              }}
              className="mt-2 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-foreground text-background text-xs font-bold shadow-md cursor-pointer active:scale-95 transition-all"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Crear Reto Ahora</span>
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {filteredRooms.map((room) => {
              const isFull = (room.players?.length || 0) >= room.max_players;
              const isWaiting = room.status === 'waiting';
              const isDuel = room.max_players === 2;

              return (
                <div
                  key={room.id}
                  className={`p-4 rounded-2xl bg-surface border transition-all flex flex-col justify-between space-y-3 shadow-xs hover:shadow-md ${
                    isDuel
                      ? 'border-amber-500/30 bg-gradient-to-b from-amber-500/[0.03] to-transparent'
                      : 'border-border hover:border-foreground-muted/40'
                  }`}
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5 min-w-0">
                        {isDuel ? (
                          <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-md bg-amber-500/15 border border-amber-500/30 text-amber-500 flex items-center gap-1 shrink-0">
                            <Swords className="w-3 h-3" />
                            <span>1v1</span>
                          </span>
                        ) : (
                          <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-md bg-sky-500/15 border border-sky-500/30 text-sky-400 flex items-center gap-1 shrink-0">
                            <Users className="w-3 h-3" />
                            <span>Mesa</span>
                          </span>
                        )}

                        <span className="font-bold text-xs sm:text-sm text-foreground truncate">
                          {room.name}
                        </span>
                      </div>

                      <span
                        className={`text-[10px] font-mono px-2 py-0.5 rounded-md font-semibold border shrink-0 ${
                          isWaiting
                            ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20'
                            : 'bg-amber-500/10 text-amber-500 border-amber-500/20'
                        }`}
                      >
                        {isWaiting ? 'Esperando' : 'En Juego'}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-xs text-foreground-muted font-mono">
                      <span>Anfitrión: @{room.host_username}</span>
                      <button
                        type="button"
                        onClick={() => handleCopyInvite(room)}
                        title="Copiar invitación y código"
                        className="text-[11px] text-foreground-subtle hover:text-foreground flex items-center gap-1 cursor-pointer transition-colors"
                      >
                        <span>Cód: {room.code}</span>
                        {copiedRoomCode === room.id ? (
                          <Check className="w-3 h-3 text-emerald-400" />
                        ) : (
                          <Copy className="w-3 h-3" />
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Bote y Apuesta */}
                  <div className="pt-2.5 border-t border-border flex items-center justify-between text-xs">
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-1 text-foreground font-semibold">
                        <Coins className="w-3.5 h-3.5 text-amber-500" />
                        <span className="font-mono">{room.bet_amount.toLocaleString()} fichas</span>
                      </div>
                      <div className="text-[10px] text-foreground-muted font-mono">
                        Bote total: <strong className="text-amber-500">{room.pot.toLocaleString()}</strong> ({room.players?.length || 0}/{room.max_players} jug.)
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        if (!user) onOpenAuth();
                        else onJoinRoom(room.id);
                        sound.tap();
                      }}
                      disabled={isFull && isWaiting}
                      className={`min-h-[40px] px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer active:scale-95 touch-manipulation shadow-xs ${
                        isWaiting && !isFull
                          ? isDuel
                            ? 'bg-amber-400 text-black hover:bg-amber-300 font-black'
                            : 'bg-foreground text-background hover:opacity-90'
                          : 'bg-surface-raised text-foreground-muted border border-border'
                      }`}
                    >
                      {isWaiting ? (isFull ? 'Llena' : isDuel ? 'Aceptar Duelo' : 'Entrar') : 'Espectar'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Modal de Creación de Reto / Sala con Apuesta 100% Libre */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs">
          <div className="max-w-md w-full p-5 sm:p-6 rounded-3xl bg-surface border border-border space-y-4 shadow-2xl animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div className="flex items-center gap-2">
                <span className="p-1.5 rounded-xl bg-amber-500/10 text-amber-500">
                  <Swords className="w-4 h-4" />
                </span>
                <h3 className="font-bold text-sm text-foreground">Crear Reto de Apuesta</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsCreateOpen(false)}
                className="text-xs text-foreground-muted hover:text-foreground px-2 py-1 rounded-lg cursor-pointer"
              >
                Cancelar
              </button>
            </div>

            {errorMsg && (
              <div className="p-3 rounded-xl bg-danger-subtle border border-danger/25 text-danger text-xs flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            <form onSubmit={handleCreateRoom} className="space-y-4">
              {/* Selector de Tipo: Duelo 1v1 vs Mesa */}
              <div className="space-y-1.5">
                <label className="text-xs text-foreground-muted font-medium">Modalidad</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      sound.tap();
                      setIsDuelMode(true);
                      setNewMaxPlayers(2);
                    }}
                    className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex flex-col gap-1 ${
                      isDuelMode
                        ? 'bg-amber-500/10 border-amber-500/40 text-foreground font-bold shadow-xs'
                        : 'bg-surface-raised border-border text-foreground-muted hover:text-foreground'
                    }`}
                  >
                    <div className="flex items-center gap-1.5 text-xs text-amber-500">
                      <Swords className="w-4 h-4" />
                      <span>Duelo 1v1 Directo</span>
                    </div>
                    <span className="text-[10px] text-foreground-muted font-normal">
                      Cara a cara. El ganador se lleva el doble.
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      sound.tap();
                      setIsDuelMode(false);
                      setNewMaxPlayers(4);
                    }}
                    className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex flex-col gap-1 ${
                      !isDuelMode
                        ? 'bg-sky-500/10 border-sky-500/40 text-foreground font-bold shadow-xs'
                        : 'bg-surface-raised border-border text-foreground-muted hover:text-foreground'
                    }`}
                  >
                    <div className="flex items-center gap-1.5 text-xs text-sky-400">
                      <Users className="w-4 h-4" />
                      <span>Mesa Multijugador</span>
                    </div>
                    <span className="text-[10px] text-foreground-muted font-normal">
                      De 3 a 6 jugadores con gran bote acumulado.
                    </span>
                  </button>
                </div>
              </div>

              {/* Nombre de la Sala */}
              <div className="space-y-1.5">
                <label className="text-xs text-foreground-muted font-medium">Nombre del Reto / Sala</label>
                <input
                  type="text"
                  value={newRoomName}
                  onChange={(e) => setNewRoomName(e.target.value)}
                  placeholder={isDuelMode ? `Duelo 1v1 vs @${user?.username || 'alumno'}` : `Mesa de @${user?.username || 'alumno'}`}
                  maxLength={32}
                  className="w-full min-h-[42px] px-3.5 py-2 rounded-xl bg-surface-raised border border-border text-xs text-foreground placeholder:text-foreground-subtle focus:outline-none focus:border-border-focus"
                />
              </div>

              {/* Cantidad de Apuesta Totalmente Libre */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs font-medium">
                  <span className="text-foreground-muted flex items-center gap-1">
                    <Coins className="w-3.5 h-3.5 text-amber-500" />
                    <span>Tu Apuesta de Entrada:</span>
                  </span>
                  <span className="font-mono text-foreground-subtle">
                    Tu saldo: <strong className="text-amber-500">{userCoins.toLocaleString()}</strong>
                  </span>
                </div>

                {/* Input de cantidad personalizada sin topes artificiales */}
                <div className="relative flex items-center">
                  <input
                    type="number"
                    min={5}
                    max={userCoins > 0 ? userCoins : 1000000}
                    value={newBetAmount || ''}
                    onChange={(e) => {
                      const val = parseInt(e.target.value, 10);
                      setNewBetAmount(isNaN(val) ? 0 : Math.max(0, val));
                    }}
                    placeholder="Introduce cualquier cantidad..."
                    className="w-full min-h-[46px] pl-4 pr-16 rounded-xl bg-surface-raised border border-border text-base font-mono font-bold text-amber-500 focus:outline-none focus:border-border-focus"
                  />
                  <span className="absolute right-3.5 text-xs font-mono font-bold text-foreground-muted pointer-events-none">
                    FICHAS
                  </span>
                </div>

                {/* Modificadores rápidos de apuesta */}
                <div className="grid grid-cols-5 gap-1.5 pt-1">
                  {[
                    { label: '50', val: 50 },
                    { label: '100', val: 100 },
                    { label: '500', val: 500 },
                    { label: '1k', val: 1000 },
                    { label: '2.5k', val: 2500 },
                  ].map((preset) => (
                    <button
                      key={preset.label}
                      type="button"
                      onClick={() => {
                        sound.tap();
                        setNewBetAmount(preset.val);
                      }}
                      className={`py-1.5 rounded-lg text-xs font-mono font-semibold border transition-all cursor-pointer active:scale-95 ${
                        newBetAmount === preset.val
                          ? 'bg-foreground text-background font-bold border-foreground'
                          : 'bg-surface-raised text-foreground-muted border-border hover:text-foreground'
                      }`}
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>

                {/* Modificadores porcentuales (Mitad, Doble, Max / All-in) */}
                <div className="grid grid-cols-4 gap-1.5">
                  <button
                    type="button"
                    onClick={() => {
                      sound.tap();
                      setNewBetAmount(10);
                    }}
                    className="py-1 rounded-lg text-[11px] font-mono text-foreground-muted hover:text-foreground bg-surface-raised border border-border"
                  >
                    Mín (10)
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      sound.tap();
                      setNewBetAmount((prev) => Math.max(10, Math.floor(prev / 2)));
                    }}
                    className="py-1 rounded-lg text-[11px] font-mono text-foreground-muted hover:text-foreground bg-surface-raised border border-border"
                  >
                    ½ Mitad
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      sound.tap();
                      setNewBetAmount((prev) => Math.min(userCoins, prev * 2 || 50));
                    }}
                    className="py-1 rounded-lg text-[11px] font-mono text-foreground-muted hover:text-foreground bg-surface-raised border border-border"
                  >
                    2× Doble
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      sound.coinWin();
                      setNewBetAmount(userCoins);
                    }}
                    className={`py-1 rounded-lg text-[11px] font-mono font-bold transition-all cursor-pointer ${
                      newBetAmount === userCoins && userCoins > 0
                        ? 'bg-amber-400 text-black shadow-xs font-black'
                        : 'text-amber-500 bg-amber-500/10 border border-amber-500/30'
                    }`}
                  >
                    MÁX / All-In
                  </button>
                </div>
              </div>

              {/* Selector de jugadores si es modo mesa */}
              {!isDuelMode && (
                <div className="space-y-1.5">
                  <label className="text-xs text-foreground-muted font-medium">
                    Jugadores en la mesa (3 a 6)
                  </label>
                  <div className="grid grid-cols-4 gap-2">
                    {[3, 4, 5, 6].map((num) => (
                      <button
                        type="button"
                        key={num}
                        onClick={() => {
                          sound.tap();
                          setNewMaxPlayers(num);
                        }}
                        className={`py-1.5 rounded-xl text-xs font-mono font-semibold border transition-all cursor-pointer ${
                          newMaxPlayers === num
                            ? 'bg-foreground text-background font-bold border-foreground'
                            : 'bg-surface-raised text-foreground-muted border-border hover:text-foreground'
                        }`}
                      >
                        {num} jug.
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Previsualización del Bote y Beneficio */}
              <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/25 space-y-1.5 font-mono text-xs">
                <div className="flex items-center justify-between text-foreground">
                  <span className="text-foreground-muted">Bote Total en Juego:</span>
                  <strong className="text-amber-500 font-bold">{estimatedPot.toLocaleString()} fichas</strong>
                </div>
                <div className="flex items-center justify-between text-emerald-500 text-[11px]">
                  <span>Beneficio si ganas:</span>
                  <span className="font-bold">+{estimatedProfit.toLocaleString()} fichas</span>
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isSubmitting || newBetAmount <= 0}
                  className="w-full min-h-[46px] py-2.5 rounded-xl bg-foreground text-background font-bold text-xs uppercase tracking-wider transition-all cursor-pointer active:scale-[0.98] disabled:opacity-50 shadow-md"
                >
                  {isSubmitting ? 'Creando reto...' : isDuelMode ? `Crear Duelo por ${newBetAmount.toLocaleString()} Fichas` : `Crear Mesa por ${newBetAmount.toLocaleString()} Fichas`}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
