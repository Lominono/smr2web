export interface UserProfile {
  id: string;
  username: string;
  email?: string;
  coins: number;
  biggest_win: number;
  streak_count?: number;
  last_claim_date?: string;
  created_at?: string;
  auth_provider?: 'supabase' | 'local';
  role?: 'admin' | 'delegado' | 'student';
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

export interface CalendarEvent {
  id: string;
  title: string;
  subject: string;
  event_type: 'exam' | 'homework' | 'reminder' | 'class';
  event_date: string;
  start_time?: string;
  end_time?: string;
  description?: string;
  priority?: 'high' | 'normal' | 'low';
  delivery_url?: string;
  is_completed?: boolean;
  created_by?: string;
  created_by_name?: string;
  created_at?: string;
}
