import { createClient, isSupabaseConfigured } from '@/lib/supabase/client';
import {
  MarketState,
  CompanyFinancials,
  InvestmentPosition,
  InvestmentTransaction,
  PriceHistoryPoint,
  TopInvestor,
  StockShareholder,
  InvestmentActionResult,
  ParodyStock,
  UserStockHolding,
  MarketSentiment,
} from '@/lib/types';

export const DEFAULT_PARODY_STOCKS: ParodyStock[] = [
  {
    ticker: 'ONION',
    name: 'Onion Inc.',
    parodyOf: 'Apple',
    slogan: 'Dispositivos y tecnología',
    sector: 'Tecnología',
    basePrice: 45.0,
    price: 45.0,
    change24h: 0.0,
    volume: 0,
    accentColor: '#10b981',
    iconType: 'onion',
  },
  {
    ticker: 'ARDI',
    name: 'Ardidas Sport',
    parodyOf: 'Adidas',
    slogan: 'Ropa y zapatillas deportivas',
    sector: 'Deporte',
    basePrice: 28.0,
    price: 28.0,
    change24h: 0.0,
    volume: 0,
    accentColor: '#3b82f6',
    iconType: 'shoe',
  },
  {
    ticker: 'CHERR',
    name: 'Carlos Herrero',
    parodyOf: 'Carolina Herrera',
    slogan: 'Fragancias y moda',
    sector: 'Perfumería',
    basePrice: 20.0,
    price: 20.0,
    change24h: 0.0,
    volume: 0,
    accentColor: '#ec4899',
    iconType: 'perfume',
  },
  {
    ticker: 'MBRON',
    name: 'Mercabrona Hielos',
    parodyOf: 'Mercadona',
    slogan: 'Supermercados y alimentación',
    sector: 'Alimentación',
    basePrice: 12.0,
    price: 12.0,
    change24h: 0.0,
    volume: 0,
    accentColor: '#059669',
    iconType: 'cart',
  },
  {
    ticker: 'CUTI',
    name: 'Cutify Music',
    parodyOf: 'Spotify',
    slogan: 'Música y podcasts en streaming',
    sector: 'Streaming',
    basePrice: 8.0,
    price: 8.0,
    change24h: 0.0,
    volume: 0,
    accentColor: '#84cc16',
    iconType: 'music',
  },
  {
    ticker: 'TOLED',
    name: 'Toledo TDI Repro',
    parodyOf: 'Tesla',
    slogan: 'Vehículos y motor',
    sector: 'Automoción',
    basePrice: 34.0,
    price: 34.0,
    change24h: 0.0,
    volume: 0,
    accentColor: '#f59e0b',
    iconType: 'car',
  },
];

const STORAGE_MARKET_KEY = 'smr2_investments_market_v4';
const STORAGE_STOCKS_KEY = 'smr2_investments_stocks_v4';
const STORAGE_TRADES_KEY = 'smr2_investments_trades_v4';
const STORAGE_HISTORY_KEY = 'smr2_investments_history_v4';
const STORAGE_HOLDINGS_KEY = 'smr2_investments_holdings_v4';

const BROADCAST_CHANNEL_NAME = 'smr2_investments_realtime_channel';
let broadcastChannel: BroadcastChannel | null = null;

if (typeof window !== 'undefined') {
  try {
    broadcastChannel = new BroadcastChannel(BROADCAST_CHANNEL_NAME);
  } catch {}
}

function getStoredJson<T>(key: string, defaultValue: T): T {
  if (typeof window === 'undefined') return defaultValue;
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : defaultValue;
  } catch {
    return defaultValue;
  }
}

function setStoredJson(key: string, value: any): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {}
}

export function getInitialMarketState(): MarketState {
  return {
    id: 1,
    current_price: 10.0,
    total_shares: 0.0,
    pool_balance: 10000,
    treasury_balance: 5000,
    reserve_balance: 25000,
    total_volume: 0,
    total_investors: 0,
    total_revenue_generated: 0,
    total_dividends_paid: 0,
    arcade_rake_accumulated: 0,
    fee_rate: 0.02,
    cooldown_seconds: 30,
    min_investment: 10,
    max_investment: 50000,
    last_event: 'Mercado activo en tiempo real',
    last_event_type: 'neutral',
    last_event_impact: 0.0,
    last_tick_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
}

/**
 * Consulta el estado global del mercado y la tesorería de la empresa
 */
export async function fetchMarketState(): Promise<MarketState> {
  const supabase = createClient();
  if (supabase && isSupabaseConfigured()) {
    try {
      const { data, error } = await supabase
        .from('market_state')
        .select('*')
        .eq('id', 1)
        .maybeSingle();

      if (!error && data) {
        const state: MarketState = {
          id: data.id,
          current_price: Number(data.current_price || 10.0),
          total_shares: Number(data.total_shares || 0),
          pool_balance: Number(data.pool_balance || 10000),
          treasury_balance: Number(data.treasury_balance ?? 5000),
          reserve_balance: Number(data.reserve_balance || 25000),
          total_volume: Number(data.total_volume || 0),
          total_investors: Number(data.total_investors || 0),
          total_revenue_generated: Number(data.total_revenue_generated || 0),
          total_dividends_paid: Number(data.total_dividends_paid || 0),
          arcade_rake_accumulated: Number(data.arcade_rake_accumulated || 0),
          fee_rate: Number(data.fee_rate || 0.02),
          cooldown_seconds: Number(data.cooldown_seconds || 30),
          min_investment: Number(data.min_investment || 10),
          max_investment: Number(data.max_investment || 50000),
          last_event: data.last_event || 'Mercado activo',
          last_event_type: data.last_event_type || 'neutral',
          last_event_impact: Number(data.last_event_impact || 0),
          last_tick_at: data.last_tick_at || new Date().toISOString(),
          updated_at: data.updated_at || new Date().toISOString(),
          parody_stocks: data.parody_stocks || {},
        };
        setStoredJson(STORAGE_MARKET_KEY, state);
        return state;
      }
    } catch (err) {
      console.warn('Error consultando market_state en Supabase:', err);
    }
  }

  return getStoredJson<MarketState>(STORAGE_MARKET_KEY, getInitialMarketState());
}

/**
 * Consulta las métricas financieras de la empresa (cómo genera y gestiona el dinero)
 */
export async function fetchCompanyFinancials(): Promise<CompanyFinancials> {
  const m = await fetchMarketState();
  const totalShares = m.total_shares > 0 ? m.total_shares : 1;
  const navPerShare = Number(((m.treasury_balance! + m.reserve_balance) / totalShares).toFixed(2));

  return {
    treasury_balance: m.treasury_balance || 5000,
    pool_balance: m.pool_balance,
    reserve_balance: m.reserve_balance,
    total_revenue_generated: m.total_revenue_generated || 0,
    arcade_rake_accumulated: m.arcade_rake_accumulated || 0,
    total_volume: m.total_volume,
    total_shares: m.total_shares,
    nav_per_share: navPerShare,
    total_investors: m.total_investors,
  };
}

/**
 * Consulta el histórico de precios sincronizado para la gráfica de CUALQUIER activo
 */
export async function fetchPriceHistory(limit: number = 80, ticker: string = 'BTLN'): Promise<PriceHistoryPoint[]> {
  const cleanTicker = (ticker || 'BTLN').toUpperCase().trim();
  const supabase = createClient();

  if (supabase && isSupabaseConfigured()) {
    try {
      const { data, error } = await supabase
        .from('price_history')
        .select('*')
        .eq('ticker', cleanTicker)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (!error && Array.isArray(data) && data.length > 0) {
        const mapped: PriceHistoryPoint[] = data
          .map((item) => ({
            id: item.id,
            ticker: item.ticker || cleanTicker,
            price: Number(item.price),
            volume: Number(item.volume || 0),
            pool_balance: Number(item.pool_balance || 0),
            treasury_balance: Number(item.treasury_balance || 0),
            total_shares: Number(item.total_shares || 0),
            change_percent: Number(item.change_percent || 0),
            trigger_type: item.trigger_type,
            event_description: item.event_description,
            player_username: item.player_username,
            created_at: item.created_at,
          }))
          .reverse();

        return mapped;
      }
    } catch (err) {
      console.warn('Error consultando price_history en Supabase:', err);
    }
  }

  // Fallback local sincronizado
  const historyMap = getStoredJson<Record<string, PriceHistoryPoint[]>>(STORAGE_HISTORY_KEY, {});
  const points = historyMap[cleanTicker] || [];

  if (points.length === 0) {
    const defaultDef = DEFAULT_PARODY_STOCKS.find((s) => s.ticker === cleanTicker);
    const baseP = cleanTicker === 'BTLN' ? 10.0 : defaultDef?.basePrice || 10.0;
    const initialPoints: PriceHistoryPoint[] = [
      {
        id: `init-${cleanTicker}-1`,
        ticker: cleanTicker,
        price: baseP,
        pool_balance: 10000,
        treasury_balance: 5000,
        total_shares: 0,
        change_percent: 0,
        trigger_type: 'initial',
        event_description: 'Precio base de lanzamiento',
        created_at: new Date(Date.now() - 3600000).toISOString(),
      },
      {
        id: `init-${cleanTicker}-2`,
        ticker: cleanTicker,
        price: baseP,
        pool_balance: 10000,
        treasury_balance: 5000,
        total_shares: 0,
        change_percent: 0,
        trigger_type: 'initial',
        event_description: 'Mercado en vivo',
        created_at: new Date().toISOString(),
      },
    ];
    historyMap[cleanTicker] = initialPoints;
    setStoredJson(STORAGE_HISTORY_KEY, historyMap);
    return initialPoints;
  }

  return points.slice(-limit);
}

/**
 * Consulta la cinta en vivo de transacciones REALES ejecutadas por alumnos
 * Con opción de filtrar por ticker específico o ver la cinta global
 */
export async function fetchRecentMarketTrades(limit: number = 25, ticker?: string): Promise<InvestmentTransaction[]> {
  const supabase = createClient();
  if (supabase && isSupabaseConfigured()) {
    try {
      let query = supabase
        .from('transactions')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(limit);

      if (ticker && ticker !== 'ALL') {
        query = query.eq('ticker', ticker.toUpperCase().trim());
      }

      const { data, error } = await query;

      if (!error && Array.isArray(data)) {
        const mapped: InvestmentTransaction[] = data.map((t) => ({
          id: t.id,
          user_id: t.user_id,
          username: t.username || 'Alumno',
          ticker: t.ticker || 'BTLN',
          type: t.type as 'buy' | 'sell',
          coins_amount: Number(t.coins_amount || 0),
          shares_amount: Number(t.shares_amount || 0),
          price_per_share: Number(t.price_per_share || 0),
          fee_coins: Number(t.fee_coins || 0),
          net_coins: Number(t.net_coins || 0),
          price_impact_percent: t.price_impact_percent !== undefined ? Number(t.price_impact_percent) : (t.type === 'buy' ? 1.2 : -1.0),
          created_at: t.created_at,
        }));

        setStoredJson(STORAGE_TRADES_KEY, mapped);
        return mapped;
      }
    } catch (err) {
      console.warn('Error consultando transactions en Supabase:', err);
    }
  }

  const localTrades = getStoredJson<InvestmentTransaction[]>(STORAGE_TRADES_KEY, []);
  if (ticker && ticker !== 'ALL') {
    return localTrades.filter((t) => t.ticker === ticker).slice(0, limit);
  }
  return localTrades.slice(0, limit);
}

/**
 * Consulta el Libro de Accionistas (Cap Table / Ballenas) de un activo
 * Muestra quiénes tienen más participaciones y qué porcentaje de la empresa controlan
 */
export async function fetchStockShareholders(ticker: string = 'BTLN', limit: number = 10): Promise<StockShareholder[]> {
  const cleanTicker = (ticker || 'BTLN').toUpperCase().trim();
  const supabase = createClient();

  if (supabase && isSupabaseConfigured()) {
    try {
      // 1. Intentar llamar al RPC nativo si existe
      const { data: rpcData, error: rpcError } = await supabase.rpc('get_market_top_shareholders', {
        p_ticker: cleanTicker,
        p_limit: limit,
      });

      if (!rpcError && Array.isArray(rpcData) && rpcData.length > 0) {
        return rpcData.map((row) => ({
          user_id: row.user_id,
          username: row.username,
          avatar_color: row.avatar_color || 'emerald',
          shares: Number(row.shares),
          ownership_percentage: Number(row.ownership_percentage),
          position_value: Number(row.position_value),
          total_invested: Number(row.total_invested),
          profit_percent: Number(row.profit_percent),
        }));
      }

      // 2. Consulta directa a tabla investments
      const { data: invData, error: invError } = await supabase
        .from('investments')
        .select('user_id, shares, total_invested_coins, profiles(username, avatar_color)')
        .eq('ticker', cleanTicker)
        .gt('shares', 0.001)
        .order('shares', { ascending: false })
        .limit(limit);

      if (!invError && Array.isArray(invData) && invData.length > 0) {
        const totalShares = invData.reduce((acc, row) => acc + Number(row.shares || 0), 0) || 1;
        return invData.map((row: any) => {
          const shares = Number(row.shares || 0);
          const prof = row.profiles || {};
          return {
            user_id: row.user_id,
            username: prof.username || 'Alumno',
            avatar_color: prof.avatar_color || 'emerald',
            shares,
            ownership_percentage: Number(((shares / totalShares) * 100).toFixed(1)),
            position_value: Math.round(shares * 10),
            total_invested: Number(row.total_invested_coins || 0),
            profit_percent: 0,
          };
        });
      }
    } catch (err) {
      console.warn('Error consultando shareholders:', err);
    }
  }

  return [];
}

/**
 * Consulta la lista de empresas parodia con cotización en vivo y cambio real
 */
export async function fetchParodyStocks(): Promise<ParodyStock[]> {
  const supabase = createClient();
  if (supabase && isSupabaseConfigured()) {
    try {
      const { data, error } = await supabase
        .from('market_state')
        .select('parody_stocks')
        .eq('id', 1)
        .maybeSingle();

      if (!error && data && data.parody_stocks && typeof data.parody_stocks === 'object') {
        let remoteStocks: Record<string, any> = {};
        if (Array.isArray(data.parody_stocks)) {
          for (const item of data.parody_stocks) {
            if (item && item.ticker) remoteStocks[item.ticker] = item;
          }
        } else {
          remoteStocks = data.parody_stocks as Record<string, any>;
        }

        const mapped = DEFAULT_PARODY_STOCKS.map((base) => {
          const remote = remoteStocks[base.ticker];
          if (remote) {
            const p = Number(remote.price ?? base.price);
            const baseP = base.basePrice || base.price;
            const diffPct = Number((((p - baseP) / baseP) * 100).toFixed(2));
            return {
              ...base,
              price: p,
              change24h: remote.change24h !== undefined ? Number(remote.change24h) : diffPct,
              volume: Number(remote.volume ?? base.volume),
              lastNews: remote.lastNews || base.lastNews,
            };
          }
          return base;
        });

        setStoredJson(STORAGE_STOCKS_KEY, mapped);
        return mapped;
      }
    } catch (err) {
      console.warn('Error consultando parody_stocks en Supabase:', err);
    }
  }

  return getStoredJson<ParodyStock[]>(STORAGE_STOCKS_KEY, DEFAULT_PARODY_STOCKS);
}

/**
 * Consulta la cartera de acciones del usuario en Supabase (persistente entre dispositivos)
 */
export async function fetchUserStocksPortfolio(userId?: string): Promise<Record<string, UserStockHolding>> {
  const supabase = createClient();
  if (supabase && isSupabaseConfigured() && userId) {
    try {
      const { data, error } = await supabase
        .from('investments')
        .select('ticker, shares, average_buy_price, total_invested_coins')
        .eq('user_id', userId)
        .gt('shares', 0.001);

      if (!error && Array.isArray(data)) {
        const result: Record<string, UserStockHolding> = {};
        data.forEach((row) => {
          result[row.ticker] = {
            ticker: row.ticker,
            shares: Number(row.shares),
            averagePrice: Number(row.average_buy_price || 0),
            totalInvested: Number(row.total_invested_coins || 0),
          };
        });
        setStoredJson(STORAGE_HOLDINGS_KEY, result);
        return result;
      }
    } catch (err) {
      console.warn('Error consultando investments en Supabase:', err);
    }
  }

  return getStoredJson<Record<string, UserStockHolding>>(STORAGE_HOLDINGS_KEY, {});
}

/**
 * Consulta la cartera en el Fondo Botellón ($BTLN)
 */
export async function fetchUserPortfolio(userId?: string): Promise<{
  authenticated: boolean;
  shares: number;
  average_buy_price: number;
  total_invested_coins: number;
  total_withdrawn_coins: number;
  position_value: number;
  unrealized_profit_coins: number;
  unrealized_profit_percent: number;
  cooldown_remaining_seconds: number;
  last_transaction_at?: string;
}> {
  const holdings = await fetchUserStocksPortfolio(userId);
  const btln = holdings['BTLN'] || { ticker: 'BTLN', shares: 0, averagePrice: 0, totalInvested: 0 };
  const mState = await fetchMarketState();
  const price = mState.current_price;
  const val = btln.shares * price;
  const invested = btln.totalInvested;
  const diff = invested > 0 ? val - invested : 0;
  const diffPct = invested > 0 ? (diff / invested) * 100 : 0;

  return {
    authenticated: !!userId,
    shares: Number(btln.shares.toFixed(4)),
    average_buy_price: Number(btln.averagePrice.toFixed(4)),
    total_invested_coins: invested,
    total_withdrawn_coins: 0,
    position_value: Math.round(val),
    unrealized_profit_coins: Math.round(diff),
    unrealized_profit_percent: Number(diffPct.toFixed(1)),
    cooldown_remaining_seconds: 0,
  };
}

/**
 * Ejecuta una operación de compra o venta en cualquier activo
 * Actualiza balances, emite en tiempo real a Supabase y sincrónica la gráfica
 */
export async function tradeStock(
  ticker: string,
  action: 'buy' | 'sell',
  amountOrShares: number,
  username: string = 'Alumno',
  userId?: string
): Promise<InvestmentActionResult & { remainingShares?: number; coinsDelta?: number }> {
  const cleanTicker = (ticker || 'BTLN').toUpperCase().trim();
  const cleanAmount = Number(amountOrShares);

  if (cleanAmount <= 0) {
    return {
      success: false,
      type: action,
      execution_price: 0,
      new_price: 0,
      new_balance: 0,
      new_shares: 0,
      message: 'La cantidad debe ser mayor que cero.',
      error: 'Cantidad no válida',
    };
  }

  // Enviar a API autorizada
  try {
    const res = await fetch('/api/investments/trade', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ticker: cleanTicker,
        action,
        amount: cleanAmount,
        username,
        userId,
      }),
    });

    const data = await res.json();
    if (res.ok && data.success) {
      // Actualizar holdings en memoria local
      const holdings = getStoredJson<Record<string, UserStockHolding>>(STORAGE_HOLDINGS_KEY, {});
      if (action === 'buy') {
        const cur = holdings[cleanTicker] || { ticker: cleanTicker, shares: 0, averagePrice: 0, totalInvested: 0 };
        const nextShares = cur.shares + data.shares;
        const nextInvested = cur.totalInvested + Math.abs(data.coinsDelta);
        holdings[cleanTicker] = {
          ticker: cleanTicker,
          shares: nextShares,
          averagePrice: nextShares > 0 ? nextInvested / nextShares : data.price,
          totalInvested: nextInvested,
        };
      } else {
        const cur = holdings[cleanTicker];
        if (cur) {
          const nextShares = Math.max(0, cur.shares - data.shares);
          if (nextShares <= 0.001) delete holdings[cleanTicker];
          else holdings[cleanTicker] = { ...cur, shares: nextShares };
        }
      }
      setStoredJson(STORAGE_HOLDINGS_KEY, holdings);

      if (data.transaction) {
        const trades = getStoredJson<InvestmentTransaction[]>(STORAGE_TRADES_KEY, []);
        setStoredJson(STORAGE_TRADES_KEY, [data.transaction, ...trades.filter((t) => t.id !== data.transaction.id)].slice(0, 50));
      }

      if (data.pricePoint) {
        const historyMap = getStoredJson<Record<string, PriceHistoryPoint[]>>(STORAGE_HISTORY_KEY, {});
        const pts = historyMap[cleanTicker] || [];
        pts.push(data.pricePoint);
        historyMap[cleanTicker] = pts.slice(-100);
        setStoredJson(STORAGE_HISTORY_KEY, historyMap);
      }

      broadcastLiveTrade(data.transaction, undefined, undefined, data.pricePoint);

      return {
        success: true,
        type: action,
        shares_bought: action === 'buy' ? data.shares : undefined,
        shares_sold: action === 'sell' ? data.shares : undefined,
        coins_spent: action === 'buy' ? Math.abs(data.coinsDelta) : undefined,
        coins_received: action === 'sell' ? data.coinsDelta : undefined,
        execution_price: data.price,
        new_price: data.newPrice,
        new_balance: 0,
        new_shares: data.remainingShares,
        remainingShares: data.remainingShares,
        coinsDelta: data.coinsDelta,
        fee_paid: data.feePaid,
        message: data.message,
      };
    } else if (data && !data.fallbackLocal) {
      throw new Error(data.error || 'Error procesando la orden');
    }
  } catch (err: any) {
    if (err.message && !err.message.includes('fetch') && !err.message.includes('Network') && !err.message.includes('Failed to fetch')) {
      throw err;
    }
    console.warn('API /api/investments/trade fallback:', err);
  }

  // Fallback simulado si el servidor estuviera desconectado
  return {
    success: false,
    type: action,
    execution_price: 10.0,
    new_price: 10.0,
    new_balance: 0,
    new_shares: 0,
    message: 'No se pudo conectar con el servidor de Supabase.',
    error: 'Servidor no disponible',
  };
}

export const investInBotellon = (amount: number, username: string = 'Alumno', userId?: string) =>
  tradeStock('BTLN', 'buy', amount, username, userId);

export const withdrawFromBotellon = (shares: number, username: string = 'Alumno', userId?: string) =>
  tradeStock('BTLN', 'sell', shares, username, userId);

export const tradeParodyStock = tradeStock;

/**
 * Registra un aporte de rake del arcade/casino a la tesorería de la empresa
 */
export async function recordArcadeRake(amount: number, game: string = 'arcade'): Promise<void> {
  const cleanAmount = Math.round(amount);
  if (cleanAmount <= 0) return;

  try {
    await fetch('/api/investments/rake', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ amount: cleanAmount, game }),
    });
  } catch (_) {}
}

/**
 * Ejecuta un tick de ingresos de negocio y oscilación orgánica
 */
export async function triggerMarketTick(): Promise<{ success: boolean; data?: any; error?: string }> {
  try {
    const res = await fetch('/api/investments/tick', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });
    const data = await res.json();
    return { success: res.ok && data.success, data };
  } catch (err: any) {
    return { success: false, error: err?.message };
  }
}

/**
 * Emite una difusión en tiempo real entre pestañas y canales
 */
function broadcastLiveTrade(
  tx: InvestmentTransaction,
  updatedStock?: ParodyStock,
  updatedMarket?: MarketState,
  pricePoint?: PriceHistoryPoint
) {
  if (broadcastChannel) {
    try {
      broadcastChannel.postMessage({
        type: 'REALTIME_TRADE',
        transaction: tx,
        stock: updatedStock,
        market: updatedMarket,
        pricePoint,
      });
    } catch (_) {}
  }
}

/**
 * Suscripción en tiempo real unificada (BroadcastChannel + Supabase Realtime)
 */
export function subscribeToRealtimeTrades(
  callback: (payload: {
    transaction?: InvestmentTransaction;
    stock?: ParodyStock;
    market?: MarketState;
    pricePoint?: PriceHistoryPoint;
    treasuryBalance?: number;
  }) => void
): () => void {
  if (typeof window === 'undefined') return () => {};

  let bc: BroadcastChannel | null = null;
  try {
    bc = new BroadcastChannel(BROADCAST_CHANNEL_NAME);
    bc.onmessage = (event) => {
      if (event.data && event.data.type === 'REALTIME_TRADE') {
        callback({
          transaction: event.data.transaction,
          stock: event.data.stock,
          market: event.data.market,
          pricePoint: event.data.pricePoint,
        });
      }
    };
  } catch (_) {}

  return () => {
    if (bc) {
      try {
        bc.close();
      } catch (_) {}
    }
  };
}

/**
 * Calcula la métrica real de sentimiento del mercado
 */
export function calculateMarketSentiment(transactions: InvestmentTransaction[]): MarketSentiment {
  if (!transactions || transactions.length === 0) {
    return {
      buyVolume: 0,
      sellVolume: 0,
      buyCount: 0,
      sellCount: 0,
      buyPercentage: 50,
      recentTrend: 'neutral',
    };
  }

  let buyVolume = 0;
  let sellVolume = 0;
  let buyCount = 0;
  let sellCount = 0;

  transactions.forEach((tx) => {
    if (tx.type === 'buy') {
      buyVolume += tx.coins_amount;
      buyCount += 1;
    } else {
      sellVolume += tx.coins_amount;
      sellCount += 1;
    }
  });

  const totalVol = buyVolume + sellVolume;
  if (totalVol === 0) {
    return {
      buyVolume: 0,
      sellVolume: 0,
      buyCount: 0,
      sellCount: 0,
      buyPercentage: 50,
      recentTrend: 'neutral',
    };
  }

  const buyPercentage = Math.round((buyVolume / totalVol) * 100);
  let recentTrend: 'bullish' | 'bearish' | 'neutral' = 'neutral';
  if (buyPercentage > 52) recentTrend = 'bullish';
  else if (buyPercentage < 48) recentTrend = 'bearish';

  return {
    buyVolume,
    sellVolume,
    buyCount,
    sellCount,
    buyPercentage,
    recentTrend,
  };
}
