import crypto from 'crypto';
import { createAdminClient, isServerSupabaseConfigured } from '@/lib/supabase/server';
import { logEvent } from '@/lib/logger';
import {
  RRRoom,
  RRRoomPlayer,
  RRGame,
  RRTurn,
  generateRoomCode,
  getSecureRandomChamber,
  getNextAlivePlayer,
} from '@/lib/russianRoulette';
import { UserProfile } from '@/lib/types';

// In-memory state for local testing/offline resilience
const memoryRooms = new Map<string, RRRoom>();
const memoryPlayers = new Map<string, RRRoomPlayer[]>();
const memoryGames = new Map<string, RRGame>();
const memoryTurns = new Map<string, RRTurn[]>();

/**
 * Strips secret bullet chamber before sending game state to clients
 */
export function sanitizeGameForClient(game: RRGame | null | undefined): RRGame | null {
  if (!game) return null;
  const { bullet_chamber, ...safeGame } = game;
  return safeGame as RRGame;
}

/**
 * Gets all active rooms (waiting or in_progress)
 */
export async function getRooms(): Promise<RRRoom[]> {
  if (isServerSupabaseConfigured()) {
    try {
      const client = createAdminClient();
      if (client) {
        const { data: rooms, error } = await client
          .from('rr_rooms')
          .select('*, rr_room_players(*)')
          .in('status', ['waiting', 'in_progress'])
          .order('created_at', { ascending: false });

        if (!error && rooms) {
          return rooms.map((r: any) => ({
            id: r.id,
            code: r.code,
            name: r.name,
            host_id: r.host_id,
            host_username: r.host_username,
            bet_amount: Number(r.bet_amount),
            max_players: Number(r.max_players),
            status: r.status,
            pot: Number(r.pot),
            created_at: r.created_at,
            updated_at: r.updated_at,
            players: (r.rr_room_players || []).map((p: any) => ({
              id: p.id,
              room_id: p.room_id,
              user_id: p.user_id,
              username: p.username,
              seat_order: Number(p.seat_order),
              is_alive: Boolean(p.is_alive),
              is_connected: Boolean(p.is_connected),
              joined_at: p.joined_at,
            })),
          }));
        }
      }
    } catch (err) {
      console.warn('[GET_ROOMS_WARN] Supabase query failed, falling back to memory:', err);
    }
  }

  // Memory fallback
  const result: RRRoom[] = [];
  for (const room of memoryRooms.values()) {
    if (room.status === 'waiting' || room.status === 'in_progress') {
      const players = memoryPlayers.get(room.id) || [];
      const game = memoryGames.get(room.id);
      result.push({
        ...room,
        players,
        active_game: sanitizeGameForClient(game),
      });
    }
  }
  return result;
}

/**
 * Fetches a single room with players and active game (sanitized)
 */
export async function getRoomById(roomId: string): Promise<RRRoom | null> {
  if (isServerSupabaseConfigured()) {
    try {
      const client = createAdminClient();
      if (client) {
        const { data: room, error } = await client
          .from('rr_rooms')
          .select('*, rr_room_players(*)')
          .eq('id', roomId)
          .single();

        if (!error && room) {
          // Fetch active game
          const { data: games } = await client
            .from('rr_games')
            .select('*')
            .eq('room_id', roomId)
            .order('created_at', { ascending: false })
            .limit(1);

          const activeGame = games && games.length > 0 ? games[0] : null;

          // Fetch last turn
          let lastTurn: RRTurn | null = null;
          if (activeGame) {
            const { data: turns } = await client
              .from('rr_turns')
              .select('*')
              .eq('game_id', activeGame.id)
              .order('created_at', { ascending: false })
              .limit(1);
            if (turns && turns.length > 0) {
              lastTurn = turns[0];
            }
          }

          return {
            id: room.id,
            code: room.code,
            name: room.name,
            host_id: room.host_id,
            host_username: room.host_username,
            bet_amount: Number(room.bet_amount),
            max_players: Number(room.max_players),
            status: room.status,
            pot: Number(room.pot),
            created_at: room.created_at,
            updated_at: room.updated_at,
            players: (room.rr_room_players || []).map((p: any) => ({
              id: p.id,
              room_id: p.room_id,
              user_id: p.user_id,
              username: p.username,
              seat_order: Number(p.seat_order),
              is_alive: Boolean(p.is_alive),
              is_connected: Boolean(p.is_connected),
              joined_at: p.joined_at,
            })),
            active_game: activeGame
              ? {
                  ...sanitizeGameForClient(activeGame)!,
                  last_turn: lastTurn,
                }
              : null,
          };
        }
      }
    } catch (err) {
      console.warn('[GET_ROOM_ID_WARN] Supabase query failed:', err);
    }
  }

  const room = memoryRooms.get(roomId);
  if (!room) return null;
  const players = memoryPlayers.get(roomId) || [];
  const game = memoryGames.get(roomId);
  const turns = game ? memoryTurns.get(game.id) || [] : [];
  const lastTurn = turns[turns.length - 1] || null;

  return {
    ...room,
    players,
    active_game: game
      ? {
          ...sanitizeGameForClient(game)!,
          last_turn: lastTurn,
        }
      : null,
  };
}

/**
 * Creates a new room and seats the host
 */
export async function createRoomServer(
  user: UserProfile,
  name: string,
  betAmount: number,
  maxPlayers: number,
  req?: Request
): Promise<RRRoom> {
  const cleanName = (name || `${user.username}'s Arena`).trim().slice(0, 32);
  const cleanBet = Math.max(10, Math.min(500, Math.floor(betAmount || 25)));
  const cleanMax = Math.max(2, Math.min(6, Math.floor(maxPlayers || 6)));

  if (user.coins < cleanBet) {
    throw new Error(`Saldo insuficiente. Tienes ${user.coins} fichas y la apuesta es de ${cleanBet}.`);
  }

  const roomId = crypto.randomUUID();
  const code = generateRoomCode();
  const now = new Date().toISOString();

  const room: RRRoom = {
    id: roomId,
    code,
    name: cleanName,
    host_id: user.id,
    host_username: user.username,
    bet_amount: cleanBet,
    max_players: cleanMax,
    status: 'waiting',
    pot: cleanBet,
    created_at: now,
    updated_at: now,
  };

  const hostPlayer: RRRoomPlayer = {
    id: crypto.randomUUID(),
    room_id: roomId,
    user_id: user.id,
    username: user.username,
    seat_order: 0,
    is_alive: true,
    is_connected: true,
    joined_at: now,
  };

  if (isServerSupabaseConfigured()) {
    try {
      const client = createAdminClient();
      if (client) {
        // Deduct bet from host
        const newBalance = user.coins - cleanBet;
        await client
          .from('profiles')
          .update({ coins: newBalance })
          .eq('id', user.id);

        await client.from('balance_transactions').insert([
          {
            user_id: user.id,
            amount: -cleanBet,
            balance_before: user.coins,
            balance_after: newBalance,
            type: 'game_bet',
            reference_id: roomId,
            description: `Apuesta de entrada para crear sala ${cleanName} (${code})`,
          },
        ]);

        // Insert room
        await client.from('rr_rooms').insert([
          {
            id: room.id,
            code: room.code,
            name: room.name,
            host_id: room.host_id,
            host_username: room.host_username,
            bet_amount: room.bet_amount,
            max_players: room.max_players,
            status: room.status,
            pot: room.pot,
          },
        ]);

        // Insert host player
        await client.from('rr_room_players').insert([hostPlayer]);
      }
    } catch (err) {
      console.warn('[CREATE_ROOM_SUPABASE_ERROR] Falling back to memory:', err);
    }
  }

  // Memory store
  memoryRooms.set(roomId, room);
  memoryPlayers.set(roomId, [hostPlayer]);

  // Log event
  await logEvent({
    eventType: 'room_created',
    userId: user.id,
    username: user.username,
    roomId,
    req,
    details: {
      room_name: cleanName,
      code,
      bet_amount: cleanBet,
      max_players: cleanMax,
    },
  });

  return {
    ...room,
    players: [hostPlayer],
  };
}

/**
 * Player joins an existing room
 */
export async function joinRoomServer(
  user: UserProfile,
  roomIdOrCode: string,
  req?: Request
): Promise<RRRoom> {
  let room: RRRoom | null = null;

  if (isServerSupabaseConfigured()) {
    try {
      const client = createAdminClient();
      if (client) {
        const { data: found } = await client
          .from('rr_rooms')
          .select('*, rr_room_players(*)')
          .or(`id.eq.${roomIdOrCode},code.eq.${roomIdOrCode.toUpperCase()}`)
          .single();

        if (found) {
          room = {
            id: found.id,
            code: found.code,
            name: found.name,
            host_id: found.host_id,
            host_username: found.host_username,
            bet_amount: Number(found.bet_amount),
            max_players: Number(found.max_players),
            status: found.status,
            pot: Number(found.pot),
            created_at: found.created_at,
            updated_at: found.updated_at,
            players: (found.rr_room_players || []).map((p: any) => ({
              id: p.id,
              room_id: p.room_id,
              user_id: p.user_id,
              username: p.username,
              seat_order: Number(p.seat_order),
              is_alive: Boolean(p.is_alive),
              is_connected: Boolean(p.is_connected),
              joined_at: p.joined_at,
            })),
          };
        }
      }
    } catch (err) {
      console.warn('[JOIN_ROOM_WARN] Supabase query failed:', err);
    }
  }

  if (!room) {
    // Check memory
    for (const r of memoryRooms.values()) {
      if (r.id === roomIdOrCode || r.code === roomIdOrCode.toUpperCase()) {
        room = { ...r, players: memoryPlayers.get(r.id) || [] };
        break;
      }
    }
  }

  if (!room) {
    throw new Error('No se encontró la sala especificada.');
  }

  if (room.status !== 'waiting') {
    throw new Error('La partida ya ha comenzado o ha finalizado.');
  }

  const existingPlayers = room.players || [];
  if (existingPlayers.some((p) => p.user_id === user.id)) {
    // Already in room, return room
    return room;
  }

  if (existingPlayers.length >= room.max_players) {
    throw new Error(`La sala está llena (máximo ${room.max_players} jugadores).`);
  }

  if (user.coins < room.bet_amount) {
    throw new Error(`Saldo insuficiente. Tienes ${user.coins} fichas y la entrada cuesta ${room.bet_amount}.`);
  }

  // Find lowest available seat order (0-5)
  const takenSeats = new Set(existingPlayers.map((p) => p.seat_order));
  let seatOrder = 0;
  while (takenSeats.has(seatOrder) && seatOrder < room.max_players) {
    seatOrder++;
  }

  const newPlayer: RRRoomPlayer = {
    id: crypto.randomUUID(),
    room_id: room.id,
    user_id: user.id,
    username: user.username,
    seat_order: seatOrder,
    is_alive: true,
    is_connected: true,
    joined_at: new Date().toISOString(),
  };

  const newPot = room.pot + room.bet_amount;

  if (isServerSupabaseConfigured()) {
    try {
      const client = createAdminClient();
      if (client) {
        const newBalance = user.coins - room.bet_amount;
        await client
          .from('profiles')
          .update({ coins: newBalance })
          .eq('id', user.id);

        await client.from('balance_transactions').insert([
          {
            user_id: user.id,
            amount: -room.bet_amount,
            balance_before: user.coins,
            balance_after: newBalance,
            type: 'game_bet',
            reference_id: room.id,
            description: `Apuesta de entrada para unirse a sala ${room.name} (${room.code})`,
          },
        ]);

        await client.from('rr_room_players').insert([newPlayer]);

        await client
          .from('rr_rooms')
          .update({ pot: newPot, updated_at: new Date().toISOString() })
          .eq('id', room.id);
      }
    } catch (err) {
      console.warn('[JOIN_ROOM_SUPABASE_ERROR] Falling back to memory:', err);
    }
  }

  // Update memory
  const updatedPlayers = [...existingPlayers, newPlayer];
  memoryPlayers.set(room.id, updatedPlayers);
  const updatedRoom = { ...room, pot: newPot, players: updatedPlayers };
  memoryRooms.set(room.id, updatedRoom);

  // Log event
  await logEvent({
    eventType: 'room_joined',
    userId: user.id,
    username: user.username,
    roomId: room.id,
    req,
    details: {
      seat_order: seatOrder,
      bet_deducted: room.bet_amount,
      total_players: updatedPlayers.length,
      pot: newPot,
    },
  });

  return updatedRoom;
}

/**
 * Host starts the game
 */
export async function startGameServer(
  user: UserProfile,
  roomId: string,
  req?: Request
): Promise<RRGame> {
  const room = await getRoomById(roomId);
  if (!room) {
    throw new Error('Sala no encontrada.');
  }

  if (room.host_id !== user.id) {
    throw new Error('Solo el anfitrión de la sala puede iniciar la partida.');
  }

  if (room.status !== 'waiting') {
    throw new Error('La partida ya fue iniciada previamente.');
  }

  const players = room.players || [];
  if (players.length < 2) {
    throw new Error('Se necesitan al menos 2 jugadores para iniciar la Ruleta Rusa.');
  }

  // Cryptographically generate secret discharge chamber (0-5)
  const secretBulletChamber = getSecureRandomChamber();
  const startingPlayer = players[0];
  const turnDeadline = new Date(Date.now() + 25000).toISOString(); // 25s timeout

  const gameId = crypto.randomUUID();
  const newGame: RRGame = {
    id: gameId,
    room_id: roomId,
    bullet_chamber: secretBulletChamber,
    current_chamber: 0,
    active_player_id: startingPlayer.user_id,
    active_player_username: startingPlayer.username,
    turn_deadline: turnDeadline,
    status: 'active',
    winner_id: null,
    winner_username: null,
    round_number: 1,
    created_at: new Date().toISOString(),
  };

  if (isServerSupabaseConfigured()) {
    try {
      const client = createAdminClient();
      if (client) {
        await client
          .from('rr_rooms')
          .update({ status: 'in_progress', updated_at: new Date().toISOString() })
          .eq('id', roomId);

        await client.from('rr_games').insert([
          {
            id: newGame.id,
            room_id: newGame.room_id,
            bullet_chamber: newGame.bullet_chamber,
            current_chamber: newGame.current_chamber,
            active_player_id: newGame.active_player_id,
            active_player_username: newGame.active_player_username,
            turn_deadline: newGame.turn_deadline,
            status: newGame.status,
            round_number: newGame.round_number,
          },
        ]);
      }
    } catch (err) {
      console.warn('[START_GAME_SUPABASE_ERROR] Memory fallback:', err);
    }
  }

  // Memory
  room.status = 'in_progress';
  memoryRooms.set(roomId, room);
  memoryGames.set(roomId, newGame);
  memoryTurns.set(gameId, []);

  // Log event
  await logEvent({
    eventType: 'game_started',
    userId: user.id,
    username: user.username,
    roomId,
    gameId,
    req,
    details: {
      players_count: players.length,
      pot: room.pot,
      starting_player: startingPlayer.username,
    },
  });

  return sanitizeGameForClient(newGame)!;
}

export interface ActionResult {
  game: RRGame;
  turn: RRTurn;
  isEliminated: boolean;
  isWinner: boolean;
  winnerPlayer?: RRRoomPlayer | null;
  potWon?: number;
}

/**
 * Server-authoritative action: pull trigger on active chamber
 */
export async function triggerActionServer(
  user: UserProfile,
  roomId: string,
  isTimeout: boolean = false,
  req?: Request
): Promise<ActionResult> {
  const room = await getRoomById(roomId);
  if (!room) {
    throw new Error('Sala no encontrada.');
  }

  if (room.status !== 'in_progress') {
    throw new Error('No hay ninguna partida activa en esta sala.');
  }

  let game: RRGame | null = null;
  let secretBullet = 0;

  if (isServerSupabaseConfigured()) {
    try {
      const client = createAdminClient();
      if (client) {
        const { data: dbGames } = await client
          .from('rr_games')
          .select('*')
          .eq('room_id', roomId)
          .eq('status', 'active')
          .order('created_at', { ascending: false })
          .limit(1);

        if (dbGames && dbGames.length > 0) {
          game = dbGames[0];
          secretBullet = Number(dbGames[0].bullet_chamber);
        }
      }
    } catch (err) {
      console.warn('[TRIGGER_ACTION_SUPABASE_FETCH_ERR] Memory fallback:', err);
    }
  }

  if (!game) {
    game = memoryGames.get(roomId) || null;
    if (game) {
      secretBullet = game.bullet_chamber ?? 0;
    }
  }

  if (!game || game.status !== 'active') {
    throw new Error('Partida finalizada o no encontrada.');
  }

  // Verify turn ownership
  if (game.active_player_id !== user.id && !isTimeout) {
    throw new Error('No es tu turno de disparar.');
  }

  const players = room.players || [];
  const actingPlayer = players.find((p) => p.user_id === (isTimeout ? game!.active_player_id : user.id));

  if (!actingPlayer || !actingPlayer.is_alive) {
    throw new Error('Jugador ya eliminado o no encontrado en la sala.');
  }

  const currentChamber = game.current_chamber;
  const isDischarge = isTimeout || currentChamber === secretBullet;
  const turnResult: 'discharge' | 'blank' | 'timeout' = isTimeout
    ? 'timeout'
    : isDischarge
    ? 'discharge'
    : 'blank';

  const turnId = crypto.randomUUID();
  const turn: RRTurn = {
    id: turnId,
    game_id: game.id,
    room_id: roomId,
    player_id: actingPlayer.user_id,
    player_username: actingPlayer.username,
    chamber_index: currentChamber,
    result: turnResult,
    details: {
      isTimeout,
      bulletChamber: secretBullet,
    },
    created_at: new Date().toISOString(),
  };

  let isEliminated = false;
  let isWinner = false;
  let winnerPlayer: RRRoomPlayer | null = null;
  let potWon = 0;

  if (isDischarge) {
    // Discharge -> Player eliminated!
    isEliminated = true;
    actingPlayer.is_alive = false;

    // Check remaining alive players
    const remainingAlive = players.filter((p) => p.is_alive);

    if (remainingAlive.length <= 1) {
      // Game Over -> WINNER!
      isWinner = true;
      winnerPlayer = remainingAlive[0] || actingPlayer;
      potWon = room.pot;

      game.status = 'finished';
      game.winner_id = winnerPlayer.user_id;
      game.winner_username = winnerPlayer.username;
      game.finished_at = new Date().toISOString();
      game.active_player_id = null;
      game.active_player_username = null;

      room.status = 'finished';

      // Payout and stats in DB
      if (isServerSupabaseConfigured()) {
        try {
          const client = createAdminClient();
          if (client) {
            // Update winner coins
            const { data: winnerProf } = await client
              .from('profiles')
              .select('coins, games_won, games_played')
              .eq('id', winnerPlayer.user_id)
              .single();

            const curCoins = Number(winnerProf?.coins || 0);
            const nextCoins = curCoins + potWon;

            await client
              .from('profiles')
              .update({
                coins: nextCoins,
                games_won: Number(winnerProf?.games_won || 0) + 1,
                games_played: Number(winnerProf?.games_played || 0) + 1,
              })
              .eq('id', winnerPlayer.user_id);

            // Record win transaction
            await client.from('balance_transactions').insert([
              {
                user_id: winnerPlayer.user_id,
                amount: potWon,
                balance_before: curCoins,
                balance_after: nextCoins,
                type: 'game_win',
                reference_id: game.id,
                description: `¡Bote ganado en Ruleta Rusa! (${room.name})`,
              },
            ]);

            // Update games_played for other participants
            for (const p of players) {
              if (p.user_id !== winnerPlayer.user_id) {
                const { data: prof } = await client
                  .from('profiles')
                  .select('games_played')
                  .eq('id', p.user_id)
                  .single();
                if (prof) {
                  await client
                    .from('profiles')
                    .update({ games_played: Number(prof.games_played || 0) + 1 })
                    .eq('id', p.user_id);
                }
              }
            }
          }
        } catch (err) {
          console.warn('[WINNER_PAYOUT_ERR] Memory fallback:', err);
        }
      }

      await logEvent({
        eventType: 'player_eliminated',
        userId: actingPlayer.user_id,
        username: actingPlayer.username,
        roomId,
        gameId: game.id,
        req,
        details: { chamber: currentChamber, isTimeout },
      });

      await logEvent({
        eventType: 'game_won',
        userId: winnerPlayer.user_id,
        username: winnerPlayer.username,
        roomId,
        gameId: game.id,
        req,
        details: { pot_won: potWon, total_players: players.length },
      });
    } else {
      // More than 1 alive player remains:
      // Spin cylinder again for remaining players!
      const newBullet = getSecureRandomChamber();
      const nextPlayer = getNextAlivePlayer(players, actingPlayer.user_id);

      game.bullet_chamber = newBullet;
      game.current_chamber = 0;
      game.active_player_id = nextPlayer ? nextPlayer.user_id : null;
      game.active_player_username = nextPlayer ? nextPlayer.username : null;
      game.turn_deadline = new Date(Date.now() + 25000).toISOString();
      game.round_number = (game.round_number || 1) + 1;

      await logEvent({
        eventType: 'player_eliminated',
        userId: actingPlayer.user_id,
        username: actingPlayer.username,
        roomId,
        gameId: game.id,
        req,
        details: {
          chamber: currentChamber,
          remaining_players: remainingAlive.length,
          cylinder_spun: true,
        },
      });
    }
  } else {
    // Blank shot -> Survived!
    const nextPlayer = getNextAlivePlayer(players, actingPlayer.user_id);
    const nextChamber = (currentChamber + 1) % 6;

    game.current_chamber = nextChamber;
    game.active_player_id = nextPlayer ? nextPlayer.user_id : null;
    game.active_player_username = nextPlayer ? nextPlayer.username : null;
    game.turn_deadline = new Date(Date.now() + 25000).toISOString();

    await logEvent({
      eventType: 'turn_executed',
      userId: actingPlayer.user_id,
      username: actingPlayer.username,
      roomId,
      gameId: game.id,
      req,
      details: {
        chamber_index: currentChamber,
        result: 'blank',
        next_chamber: nextChamber,
        next_player: nextPlayer?.username,
      },
    });
  }

  // Persist game state & turn in DB
  if (isServerSupabaseConfigured()) {
    try {
      const client = createAdminClient();
      if (client) {
        // Record turn
        await client.from('rr_turns').insert([
          {
            id: turn.id,
            game_id: turn.game_id,
            room_id: turn.room_id,
            player_id: turn.player_id,
            player_username: turn.player_username,
            chamber_index: turn.chamber_index,
            result: turn.result,
            details: turn.details,
          },
        ]);

        // Update player alive status
        if (isDischarge) {
          await client
            .from('rr_room_players')
            .update({ is_alive: false })
            .eq('room_id', roomId)
            .eq('user_id', actingPlayer.user_id);
        }

        // Update game
        await client
          .from('rr_games')
          .update({
            bullet_chamber: game.bullet_chamber,
            current_chamber: game.current_chamber,
            active_player_id: game.active_player_id,
            active_player_username: game.active_player_username,
            turn_deadline: game.turn_deadline,
            status: game.status,
            winner_id: game.winner_id,
            winner_username: game.winner_username,
            round_number: game.round_number,
            finished_at: game.finished_at,
          })
          .eq('id', game.id);

        if (room.status === 'finished') {
          await client
            .from('rr_rooms')
            .update({ status: 'finished', updated_at: new Date().toISOString() })
            .eq('id', roomId);
        }
      }
    } catch (err) {
      console.warn('[ACTION_UPDATE_DB_WARN] Memory fallback:', err);
    }
  }

  // Update memory store
  memoryGames.set(roomId, game);
  const turns = memoryTurns.get(game.id) || [];
  turns.push(turn);
  memoryTurns.set(game.id, turns);
  memoryRooms.set(roomId, room);

  return {
    game: {
      ...sanitizeGameForClient(game)!,
      last_turn: turn,
    },
    turn,
    isEliminated,
    isWinner,
    winnerPlayer,
    potWon,
  };
}
