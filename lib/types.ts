export interface UserProfile {
  id: string;
  username: string;
  email?: string;
  coins: number;
  biggest_win: number;
  created_at?: string;
}

export interface ChatMessage {
  id: string;
  user_id: string;
  username: string;
  text: string;
  created_at: string;
  is_system_win?: boolean;
  win_amount?: number;
  multiplier?: number;
  game?: 'angry' | 'crash';
}

export interface LeaderboardEntry {
  id: string;
  username: string;
  coins: number;
  biggest_win: number;
  is_current_user?: boolean;
}

export interface CrashHistoryItem {
  id: string;
  crashPoint: number;
  timestamp: string;
}
