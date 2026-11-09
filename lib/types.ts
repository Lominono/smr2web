export interface UserProfile {
  id: string;
  username: string;
  full_name?: string;
  student_number?: string;
  pc_seat?: string;
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
  notifications_enabled?: boolean;
  last_spin_date?: string;
  last_rescue_date?: string;
  is_banned?: boolean;
  ban_reason?: string;
}

export interface OnlineUser {
  id: string;
  username: string;
  full_name?: string;
  student_number?: string;
  pc_seat?: string;
  avatar_color?: string;
  role?: string;
  coins?: number;
  current_view?: string;
  online_at: string;
  last_ping: number;
  is_current_user?: boolean;
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
  comments_count?: number;
  is_liked_by_me?: boolean;
  tag?: string;
  reply_to_username?: string;
  pinned?: boolean;
}

export interface ChatComment {
  id: string;
  message_id: string;
  user_id?: string;
  username: string;
  text: string;
  created_at: string;
}

export interface Announcement {
  id: string;
  title: string;
  body: string;
  tag: string;
  url?: string;
  author_username: string;
  created_at: string;
}

export interface LeaderboardEntry {
  id: string;
  username: string;
  full_name?: string;
  student_number?: string;
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
  is_personal?: boolean;
}

export interface MarketState {
  id: number;
  current_price: number;
  total_shares: number;
  pool_balance: number;
  treasury_balance?: number;
  reserve_balance: number;
  total_volume: number;
  total_investors: number;
  total_revenue_generated?: number;
  total_dividends_paid?: number;
  arcade_rake_accumulated?: number;
  fee_rate: number;
  cooldown_seconds: number;
  min_investment: number;
  max_investment: number;
  last_event: string;
  last_event_type: 'neutral' | 'bullish' | 'bearish' | 'police' | 'epic';
  last_event_impact: number;
  last_tick_at: string;
  updated_at: string;
  parody_stocks?: Record<string, any>;
}

export interface CompanyFinancials {
  treasury_balance: number;
  pool_balance: number;
  reserve_balance: number;
  total_revenue_generated: number;
  arcade_rake_accumulated: number;
  total_volume: number;
  total_shares: number;
  nav_per_share: number;
  total_investors: number;
}

export interface InvestmentPosition {
  id: string;
  user_id: string;
  ticker?: string;
  shares: number;
  total_invested_coins: number;
  total_withdrawn_coins: number;
  average_buy_price: number;
  last_transaction_at?: string;
  created_at: string;
  updated_at: string;
}

export interface InvestmentTransaction {
  id: string;
  user_id: string;
  username: string;
  ticker: string;
  type: 'buy' | 'sell';
  coins_amount: number;
  shares_amount: number;
  price_per_share: number;
  fee_coins: number;
  net_coins: number;
  price_impact_percent?: number;
  created_at: string;
}

export interface MarketSentiment {
  buyVolume: number;
  sellVolume: number;
  buyCount: number;
  sellCount: number;
  buyPercentage: number;
  recentTrend: 'bullish' | 'bearish' | 'neutral';
}

export interface PriceHistoryPoint {
  id: string;
  ticker: string;
  price: number;
  volume?: number;
  pool_balance: number;
  treasury_balance?: number;
  total_shares: number;
  change_percent: number;
  trigger_type: 'tick' | 'buy' | 'sell' | 'event' | 'initial' | 'revenue' | 'arcade_rake';
  event_description?: string;
  player_username?: string;
  created_at: string;
}

export interface TopInvestor {
  user_id: string;
  username: string;
  avatar_color: string;
  shares: number;
  position_value: number;
  total_invested: number;
  profit_percent: number;
}

export interface StockShareholder {
  user_id: string;
  username: string;
  avatar_color: string;
  shares: number;
  ownership_percentage: number;
  position_value: number;
  total_invested: number;
  profit_percent: number;
}

export interface InvestmentActionResult {
  success: boolean;
  type: 'buy' | 'sell';
  coins_spent?: number;
  coins_received?: number;
  shares_bought?: number;
  shares_sold?: number;
  execution_price: number;
  fee_paid?: number;
  new_price: number;
  new_balance: number;
  new_shares: number;
  message: string;
  error?: string;
}

export interface ParodyStock {
  ticker: string;
  name: string;
  parodyOf: string;
  slogan: string;
  sector: string;
  basePrice?: number;
  price: number;
  change24h: number;
  volume: number;
  lastNews?: string;
  accentColor: string;
  iconType: string;
}

export interface UserStockHolding {
  ticker: string;
  shares: number;
  averagePrice: number;
  totalInvested: number;
}

export type FeedbackType = 'idea' | 'report' | 'improvement';
export type FeedbackCategory = 'general' | 'juegos' | 'horario' | 'portal' | 'inversiones' | 'otros';
export type FeedbackStatus = 'pending' | 'under_review' | 'planned' | 'completed' | 'dismissed';

export interface CommunityFeedback {
  id: string;
  user_id?: string;
  author_name: string;
  type: FeedbackType;
  title: string;
  description: string;
  category: FeedbackCategory;
  status: FeedbackStatus;
  upvotes_count: number;
  admin_response?: string;
  admin_responder_name?: string;
  created_at: string;
  updated_at: string;
  has_voted?: boolean;
}


