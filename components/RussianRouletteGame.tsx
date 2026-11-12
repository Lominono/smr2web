'use client';

import React, { useState } from 'react';
import { RussianRouletteLobby } from './russian-roulette/RussianRouletteLobby';
import { RussianRouletteArena } from './russian-roulette/RussianRouletteArena';
import { TacticalRouletteDuel } from './russian-roulette/TacticalRouletteDuel';
import { RRRoom } from '@/lib/russianRoulette';
import { UserProfile, CoinClaimType } from '@/lib/types';
import { sound } from '@/lib/audio';
import { Flame, Users, Sparkles, Shield, Trophy } from 'lucide-react';

interface RussianRouletteGameProps {
  user: UserProfile | null;
  onOpenAuth: () => void;
  /** Aplica un delta de saldo (el servidor valida topes y recibos). */
  onUpdateCoins?: (delta: number, claimType?: CoinClaimType) => void;
  /**
   * Refresca el saldo desde el servidor. La apuesta y el bote los aplica el
   * backend de forma autoritativa: el cliente NUNCA suma ni resta monedas aquí
   * (antes se duplicaba el saldo al crear/unirse a una sala).
   */
  onSyncCoins?: () => void;
}

export const RussianRouletteGame: React.FC<RussianRouletteGameProps> = ({
  user,
  onOpenAuth,
  onUpdateCoins,
  onSyncCoins,
}) => {
  const [activeTab, setActiveTab] = useState<'tactical' | 'multiplayer'>('multiplayer');
  const [activeRoomId, setActiveRoomId] = useState<string | null>(null);

  const handleRoomCreated = (room: RRRoom) => {
    setActiveRoomId(room.id);
    // El servidor ya descontó la apuesta al crear la sala
    onSyncCoins?.();
  };

  const handleJoinRoom = async (roomIdOrCode: string) => {
    if (!user) {
      onOpenAuth();
      return;
    }

    try {
      const res = await fetch('/api/russian-roulette/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ roomId: roomIdOrCode }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        alert(data.error || 'No se pudo unir a la sala.');
        return;
      }

      setActiveRoomId(data.room.id);
      // El servidor ya descontó la apuesta al unirse a la sala
      onSyncCoins?.();
    } catch (err: any) {
      alert(err?.message || 'Error al conectar con la sala.');
    }
  };

  const handleLeaveRoom = () => {
    setActiveRoomId(null);
  };

  return (
    <div className="w-full max-w-5xl mx-auto px-2 sm:px-4 py-4 space-y-4">
      {/* Selector de modo de juego: Duelo Táctico (Buckshot) vs Salas Multijugador */}
      {!activeRoomId && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-2 bg-surface rounded-3xl border border-border/80 shadow-xs">
          <div className="flex items-center gap-2 px-3 py-1 text-xs text-foreground-muted font-mono">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>Zona Ruleta Rusa SMR</span>
          </div>

          <div className="p-1 rounded-2xl bg-surface-raised border border-border/70 flex items-center gap-1 shadow-2xs w-full sm:w-auto">
            <button
              type="button"
              onClick={() => {
                sound.tap();
                setActiveTab('multiplayer');
              }}
              className={`flex-1 sm:flex-initial flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                activeTab === 'multiplayer'
                  ? 'bg-foreground text-background shadow-xs'
                  : 'text-foreground-muted hover:text-foreground'
              }`}
            >
              <Users className="w-4 h-4 text-amber-500" />
              <span>Apuestas PvP (Entre Alumnos)</span>
              <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-amber-500/15 text-amber-500 font-bold hidden sm:inline">
                DUELOS
              </span>
            </button>

            <button
              type="button"
              onClick={() => {
                sound.tap();
                setActiveTab('tactical');
              }}
              className={`flex-1 sm:flex-initial flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                activeTab === 'tactical'
                  ? 'bg-foreground text-background shadow-xs'
                  : 'text-foreground-muted hover:text-foreground'
              }`}
            >
              <Flame className="w-4 h-4 text-red-500" />
              <span>Práctica Solo (Vs IA)</span>
            </button>
          </div>
        </div>
      )}

      {/* Contenido según el modo */}
      {activeTab === 'tactical' && !activeRoomId ? (
        <TacticalRouletteDuel
          user={user}
          onOpenAuth={onOpenAuth}
          onUpdateCoins={onUpdateCoins || (() => {})}
        />
      ) : activeRoomId ? (
        <RussianRouletteArena
          user={user}
          roomId={activeRoomId}
          onLeaveRoom={handleLeaveRoom}
          onSyncCoins={onSyncCoins}
        />
      ) : (
        <RussianRouletteLobby
          user={user}
          onJoinRoom={handleJoinRoom}
          onRoomCreated={handleRoomCreated}
          onOpenAuth={onOpenAuth}
        />
      )}
    </div>
  );
};
