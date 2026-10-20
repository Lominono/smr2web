'use client';

import React, { useState } from 'react';
import { RussianRouletteLobby } from './russian-roulette/RussianRouletteLobby';
import { RussianRouletteArena } from './russian-roulette/RussianRouletteArena';
import { RRRoom } from '@/lib/russianRoulette';
import { UserProfile } from '@/lib/types';
import { updateSessionCoins } from '@/lib/authSession';

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
    <div className="w-full max-w-5xl mx-auto px-2 sm:px-4 py-4">
      {activeRoomId ? (
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
