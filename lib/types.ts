export interface UserProfile {
  id: string;
  username: string;
  full_name?: string;
  student_number?: string;
  email?: string;
  coins: number;
  biggest_win: number;
  streak_count?: number;
  last_claim_date?: string;
  created_at?: string;
  auth_provider?: 'supabase' | 'local';
  role?: 'admin' | 'delegado' | 'student';
  avatar_color?: string;
  games_played?: number;
  games_won?: number;
  sound_enabled?: boolean;
  last_spin_date?: string;
  last_rescue_date?: string;
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
  game?: 'angry' | 'crash' | 'mines' | 'roulette';
  likes_count?: number;
  is_liked_by_me?: boolean;
  tag?: string;
}

export interface LeaderboardEntry {
  id: string;
  username: string;
  full_name?: string;
  coins: number;
  biggest_win: number;
  streak_count?: number;
  avatar_color?: string;
  role?: string;
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
