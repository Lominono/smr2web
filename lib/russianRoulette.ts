import crypto from 'crypto';

export type RRRoomStatus = 'waiting' | 'in_progress' | 'finished' | 'cancelled';
export type RRTurnResult = 'blank' | 'discharge' | 'timeout';

export interface RRRoom {
  id: string;
  code: string;
  name: string;
  host_id: string;
  host_username: string;
  bet_amount: number;
  max_players: number;
  status: RRRoomStatus;
  pot: number;
  created_at: string;
  updated_at: string;
  players?: RRRoomPlayer[];
  active_game?: RRGame | null;
}

export interface RRRoomPlayer {
  id: string;
  room_id: string;
  user_id: string;
  username: string;
  seat_order: number;
  is_alive: boolean;
  is_connected: boolean;
  joined_at: string;
}

export interface RRGame {
  id: string;
  room_id: string;
  bullet_chamber?: number; // Only visible on server! NEVER exposed in client responses
  current_chamber: number;
  active_player_id: string | null;
  active_player_username: string | null;
  turn_deadline: string | null;
  status: 'active' | 'finished' | 'aborted';
  winner_id: string | null;
  winner_username: string | null;
  round_number: number;
  created_at: string;
  finished_at?: string | null;
  last_turn?: RRTurn | null;
}

export interface RRTurn {
  id: string;
  game_id: string;
  room_id: string;
  player_id: string;
  player_username: string;
  chamber_index: number;
  result: RRTurnResult;
  details?: Record<string, any>;
  created_at: string;
}

export type EventType =
  | 'user_register'
  | 'user_login_success'
  | 'user_login_failed'
  | 'user_logout'
  | 'room_created'
  | 'room_joined'
  | 'room_left'
  | 'game_started'
  | 'turn_executed'
  | 'player_eliminated'
  | 'game_won'
  | 'balance_adjusted'
  | 'user_banned'
  | 'user_unbanned'
  | 'admin_action'
  | 'game_timeout'
  | 'error';

export interface EventLogEntry {
  id: string;
  event_type: EventType;
  user_id: string | null;
  username: string | null;
  room_id: string | null;
  game_id: string | null;
  ip_address: string | null;
  user_agent: string | null;
  details: Record<string, any>;
  created_at: string;
}

/**
 * Generates a random integer securely using Node.js crypto module.
 * Never uses Math.random() for game logic or chamber indexing.
 */
export function getSecureRandomChamber(): number {
  return crypto.randomInt(0, 6); // 0 to 5 inclusive
}

/**
 * Generates a 6-character uppercase alphanumeric room code.
 */
export function generateRoomCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    const idx = crypto.randomInt(0, chars.length);
    code += chars[idx];
  }
  return code;
}

/**
 * Finds next alive player seat in circular clockwise order.
 */
export function getNextAlivePlayer(
  players: RRRoomPlayer[],
  currentUserId: string
): RRRoomPlayer | null {
  const alivePlayers = players.filter((p) => p.is_alive);
  if (alivePlayers.length <= 1) return alivePlayers[0] || null;

  // Sort by seat order
  const sorted = [...players].sort((a, b) => a.seat_order - b.seat_order);
  const currentIndex = sorted.findIndex((p) => p.user_id === currentUserId);

  if (currentIndex === -1) return alivePlayers[0];

  const total = sorted.length;
  for (let step = 1; step <= total; step++) {
    const nextIndex = (currentIndex + step) % total;
    const candidate = sorted[nextIndex];
    if (candidate.is_alive) {
      return candidate;
    }
  }

  return alivePlayers[0] || null;
}
