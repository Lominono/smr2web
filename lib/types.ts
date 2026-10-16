export interface UserProfile {
  id: string;
  username: string;
  full_name?: string;
  avatar_url: string;
  coins: number;
  net_profit: number;
  biggest_win: number;
  bankrupt_count: number;
  rank: 'Inversor Rata' | 'Apostador Casual' | 'High Roller del Aula' | 'Lobo de Wall Street' | 'Banquero del Recreo';
}

export interface ChatMessage {
  id: string;
  user_id: string;
  username: string;
  avatar_url: string;
  text: string;
  created_at: string;
  is_system_win?: boolean;
  win_amount?: number;
  multiplier?: number;
  game?: 'angry' | 'crash';
  tip_recipient?: string;
}

export interface CrashHistoryItem {
  id: string;
  crashPoint: number;
  timestamp: string;
}

export interface LeaderboardEntry {
  id: string;
  username: string;
  avatar_url: string;
  coins: number;
  biggest_win: number;
  rank: string;
  is_current_user?: boolean;
}
