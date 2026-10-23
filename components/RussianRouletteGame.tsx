'use client';

import React, { useState } from 'react';
import { RussianRouletteLobby } from './russian-roulette/RussianRouletteLobby';
import { RussianRouletteArena } from './russian-roulette/RussianRouletteArena';
import { TacticalRouletteDuel } from './russian-roulette/TacticalRouletteDuel';
import { RRRoom } from '@/lib/russianRoulette';
import { UserProfile } from '@/lib/types';
import { updateSessionCoins } from '@/lib/authSession';
import { sound } from '@/lib/audio';
import { Flame, Users } from 'lucide-react';

interface RussianRouletteGameProps {
  user: UserProfile | null;
  onOpenAuth: () => void;
  onUpdateCoins: (newCoins: number) => void;
}

export const RussianRouletteGame: React.FC<RussianRouletteGameProps> = ({
  user,
  onOpenAuth,
  onUpdateCoins,
}) => {
  const [activeTab, setActiveTab] = useState<'tactical' | 'multiplayer'>('tactical');
  const [activeRoomId, setActiveRoomId] = useState<string | null>(null);

  const handleRoomCreated = (room: RRRoom) => {
    setActiveRoomId(room.id);
    if (user) {
      const nextCoins = Math.max(0, user.coins - room.bet_amount);
      onUpdateCoins(nextCoins);
      updateSessionCoins(nextCoins);
    }
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
        body: JSON.stringify({ roomId: roomIdOrCode, user }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        alert(data.error || 'No se pudo unir a la sala.');
        return;
      }

      setActiveRoomId(data.room.id);
      const nextCoins = Math.max(0, user.coins - data.room.bet_amount);
      onUpdateCoins(nextCoins);
      updateSessionCoins(nextCoins);
    } catch (err: any) {
      alert(err?.message || 'Error al conectar con la sala.');
    }
  };

  const handleLeaveRoom = () => {
    setActiveRoomId(null);
  };

  return (
    <div className="w-full max-w-5xl mx-auto px-2 sm:px-4 py-4 space-y-4">
      {/* Selector de modo: Duelo Táctico (Buckshot) vs Salas Multijugador */}
      {!activeRoomId && (
        <div className="flex items-center justify-center">
          <div className="p-1 rounded-2xl bg-surface-raised border border-border/70 flex items-center gap-1 shadow-2xs">
            <button
              type="button"
              onClick={() => {
                sound.tap();
                setActiveTab('tactical');
              }}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                activeTab === 'tactical'
                  ? 'bg-foreground text-background shadow-xs'
                  : 'text-foreground-muted hover:text-foreground'
              }`}
            >
              <Flame className="w-4 h-4 text-red-500" />
              <span>Duelo Táctico SMR (Buckshot)</span>
            </button>

            <button
              type="button"
              onClick={() => {
                sound.tap();
                setActiveTab('multiplayer');
              }}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                activeTab === 'multiplayer'
                  ? 'bg-foreground text-background shadow-xs'
                  : 'text-foreground-muted hover:text-foreground'
              }`}
            >
              <Users className="w-4 h-4 text-cyan-400" />
              <span>Salas Multijugador (PvP)</span>
            </button>
          </div>
        </div>
      )}

      {/* Contenido según el modo */}
      {activeTab === 'tactical' && !activeRoomId ? (
        <TacticalRouletteDuel
          user={user}
          onOpenAuth={onOpenAuth}
          onUpdateCoins={onUpdateCoins}
        />
      ) : activeRoomId ? (
        <RussianRouletteArena
          user={user}
          roomId={activeRoomId}
          onLeaveRoom={handleLeaveRoom}
          onUpdateCoins={onUpdateCoins}
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
