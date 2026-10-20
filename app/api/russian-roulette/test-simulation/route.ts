import { NextResponse } from 'next/server';
import {
  createRoomServer,
  joinRoomServer,
  startGameServer,
  triggerActionServer,
  getRoomById,
} from '@/lib/russianRouletteServer';
import { queryEventLogs } from '@/lib/logger';
import { UserProfile } from '@/lib/types';

export const dynamic = 'force-dynamic';

export async function GET() {
  const steps: string[] = [];

  try {
    const player1: UserProfile = {
      id: 'user_p1_test',
      username: 'marco_antonio',
      coins: 1000,
      biggest_win: 0,
      role: 'student',
    };

    const player2: UserProfile = {
      id: 'user_p2_test',
      username: 'carlos_smr',
      coins: 1000,
      biggest_win: 0,
      role: 'student',
    };

    // 1. Create Room
    const room = await createRoomServer(player1, 'Arena 2º SMR Test', 50, 2);
    steps.push(`1. Sala creada con código ${room.code} por @${player1.username} (Bote: ${room.pot})`);

    // 2. Join Room
    const joinedRoom = await joinRoomServer(player2, room.id);
    steps.push(`2. @${player2.username} se unió a la sala (Bote acumulado: ${joinedRoom.pot})`);

    // 3. Start Game
    const startedGame = await startGameServer(player1, room.id);
    steps.push(`3. Partida iniciada por anfitrión. Turno inicial: @${startedGame.active_player_username}`);

    // 4. Play Turns until Winner
    let currentRoom = await getRoomById(room.id);
    let stepCount = 1;
    let winnerName = '';

    while (currentRoom?.status === 'in_progress' && stepCount <= 12) {
      const activeUserId = currentRoom.active_game?.active_player_id;
      const actingUser = activeUserId === player1.id ? player1 : player2;
      const ch = (currentRoom.active_game?.current_chamber ?? 0) + 1;

      const actionResult = await triggerActionServer(actingUser, room.id, false);
      const resText = actionResult.turn.result === 'discharge' ? '💥 DESCARGA (Eliminado)' : '🟢 BLANCO (Sobrevivió)';
      steps.push(`Turno #${stepCount}: @${actingUser.username} disparó recámara #${ch} -> ${resText}`);

      if (actionResult.isWinner && actionResult.winnerPlayer) {
        winnerName = actionResult.winnerPlayer.username;
        steps.push(`👑 ¡GANADOR DECLARADO! @${winnerName} se lleva el bote de ${actionResult.potWon} fichas`);
        break;
      }

      currentRoom = await getRoomById(room.id);
      stepCount++;
    }

    // 5. Query Audit Logs
    const logData = await queryEventLogs({ roomId: room.id, limit: 20 });
    steps.push(`5. Logs de auditoría inmutables verificados: ${logData.logs.length} eventos registrados.`);

    return NextResponse.json({
      success: true,
      simulation: 'OK',
      room_code: room.code,
      winner: winnerName,
      steps,
      logs_count: logData.logs.length,
      sample_logs: logData.logs.slice(0, 5),
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err?.message || 'Error en simulación' },
      { status: 500 }
    );
  }
}
