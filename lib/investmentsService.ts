import { createClient, isSupabaseConfigured } from '@/lib/supabase/client';
import {
  MarketState,
  InvestmentPosition,
  InvestmentTransaction,
  PriceHistoryPoint,
  TopInvestor,
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

// Claves de almacenamiento local para persistencia real sin pérdida de transacciones
const STORAGE_MARKET_KEY = 'smr2_investments_market_v3';
const STORAGE_STOCKS_KEY = 'smr2_investments_stocks_v3';
const STORAGE_TRADES_KEY = 'smr2_investments_trades_v3';
const STORAGE_HISTORY_KEY = 'smr2_investments_history_v3';
const STORAGE_HOLDINGS_KEY = 'smr2_investments_holdings_v3';
const STORAGE_BTLN_KEY = 'smr2_investments_btln_pos_v3';

// Canal de difusión en tiempo real entre pestañas y ventanas
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

// Estado base sin datos falsos
function getInitialMarketState(): MarketState {
  return {
    id: 1,
    current_price: 10.0,
    total_shares: 0.0,
    pool_balance: 0,
    reserve_balance: 10000,
    total_volume: 0,
    total_investors: 0,
    fee_rate: 0.02,
    cooldown_seconds: 60,
    min_investment: 10,
    max_investment: 25000,
    last_event: 'Mercado activo',
    last_event_type: 'neutral',
    last_event_impact: 0.0,
    last_tick_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
}

/**
 * Consulta el estado global del mercado compartido
 */
export async function fetchMarketState(): Promise<MarketState> {
  const supabase = createClient();
  if (supabase && isSupabaseConfigured()) {
    try {
      const { data, error } = await supabase
        .from('market_state')
        .select('*')
        .eq('id', 1)
        .single();

      if (!error && data) {
        const state: MarketState = {
          id: data.id,
          current_price: Number(data.current_price || 10.0),
          total_shares: Number(data.total_shares || 0),
          pool_balance: Number(data.pool_balance || 0),
          reserve_balance: Number(data.reserve_balance || 10000),
          total_volume: Number(data.total_volume || 0),
          total_investors: Number(data.total_investors || 0),
          fee_rate: Number(data.fee_rate || 0.02),
          cooldown_seconds: Number(data.cooldown_seconds || 60),
          min_investment: Number(data.min_investment || 10),
          max_investment: Number(data.max_investment || 25000),
          last_event: data.last_event || 'Mercado activo',
          last_event_type: data.last_event_type || 'neutral',
          last_event_impact: Number(data.last_event_impact || 0),
          last_tick_at: data.last_tick_at || new Date().toISOString(),
          updated_at: data.updated_at || new Date().toISOString(),
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
 * Consulta el histórico de precios para alimentar la gráfica de un activo
 */
export async function fetchPriceHistory(limit: number = 80, ticker: string = 'BTLN'): Promise<PriceHistoryPoint[]> {
  const supabase = createClient();
  if (supabase && isSupabaseConfigured()) {
    try {
      let query = supabase
        .from('price_history')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(limit);

      if (ticker) {
        query = query.eq('ticker', ticker);
      }

      const { data, error } = await query;

      if (!error && Array.isArray(data) && data.length > 0) {
        const mapped = data
          .map((item) => ({
            id: item.id,
            ticker: item.ticker || ticker,
            price: Number(item.price),
            pool_balance: Number(item.pool_balance || 0),
            total_shares: Number(item.total_shares || 0),
            change_percent: Number(item.change_percent || 0),
            trigger_type: item.trigger_type,
            event_description: item.event_description,
            created_at: item.created_at,
          }))
          .reverse();

        return mapped;
      }
    } catch (err) {
      console.warn('Error consultando price_history en Supabase:', err);
    }
  }

  // Fallback persistente local
  const historyMap = getStoredJson<Record<string, PriceHistoryPoint[]>>(STORAGE_HISTORY_KEY, {});
  const points = historyMap[ticker] || [];

  if (points.length === 0) {
    // Si no hay operaciones previas, un punto base inicial limpio
    const baseP = ticker === 'BTLN' ? 10.0 : DEFAULT_PARODY_STOCKS.find((s) => s.ticker === ticker)?.basePrice || 10.0;
    const initialPoints: PriceHistoryPoint[] = [
      {
        id: `init-${ticker}`,
        ticker,
        price: baseP,
        pool_balance: 0,
        total_shares: 0,
        change_percent: 0,
        trigger_type: 'initial',
        created_at: new Date(Date.now() - 3600000).toISOString(),
      },
      {
        id: `init-${ticker}-now`,
        ticker,
        price: baseP,
        pool_balance: 0,
        total_shares: 0,
        change_percent: 0,
        trigger_type: 'initial',
        created_at: new Date().toISOString(),
      },
    ];
    historyMap[ticker] = initialPoints;
    setStoredJson(STORAGE_HISTORY_KEY, historyMap);
    return initialPoints;
  }

  return points.slice(-limit);
}

/**
 * Consulta la cartera del usuario en el Fondo Botellón
 */
export async function fetchUserPortfolio(): Promise<{
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
  const supabase = createClient();
  if (supabase && isSupabaseConfigured()) {
    try {
      const { data, error } = await supabase.rpc('get_botellon_portfolio');

      if (!error && data && data.authenticated !== false) {
        return {
          authenticated: true,
          shares: Number(data.shares || 0),
          average_buy_price: Number(data.average_buy_price || 0),
          total_invested_coins: Number(data.total_invested_coins || 0),
          total_withdrawn_coins: Number(data.total_withdrawn_coins || 0),
          position_value: Number(data.position_value || 0),
          unrealized_profit_coins: Number(data.unrealized_profit_coins || 0),
          unrealized_profit_percent: Number(data.unrealized_profit_percent || 0),
          cooldown_remaining_seconds: Number(data.cooldown_remaining_seconds || 0),
          last_transaction_at: data.last_transaction_at,
        };
      }
    } catch (err) {
      console.warn('Error get_botellon_portfolio RPC:', err);
    }
  }

  // Fallback local real
  const localBtln = getStoredJson<InvestmentPosition>(STORAGE_BTLN_KEY, {
    id: 'local-btln',
    user_id: 'local-user',
    shares: 0,
    total_invested_coins: 0,
    total_withdrawn_coins: 0,
    average_buy_price: 0,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  });

  const mState = getStoredJson<MarketState>(STORAGE_MARKET_KEY, getInitialMarketState());
  const price = mState.current_price;
  const val = localBtln.shares * price;
  const invested = localBtln.total_invested_coins;
  const diff = invested > 0 ? val - invested : 0;
  const diffPct = invested > 0 ? (diff / invested) * 100 : 0;

  return {
    authenticated: true,
    shares: Number(localBtln.shares.toFixed(4)),
    average_buy_price: Number(localBtln.average_buy_price.toFixed(4)),
    total_invested_coins: localBtln.total_invested_coins,
    total_withdrawn_coins: localBtln.total_withdrawn_coins,
    position_value: Math.round(val),
    unrealized_profit_coins: Math.round(diff),
    unrealized_profit_percent: Number(diffPct.toFixed(1)),
    cooldown_remaining_seconds: 0,
    last_transaction_at: localBtln.last_transaction_at,
  };
}

/**
 * Consulta la cinta en vivo de transacciones REALES del mercado ejecutadas por alumnos
 * (Sin usuarios falsos ni datos inventados)
 */
export async function fetchRecentMarketTrades(limit: number = 20): Promise<InvestmentTransaction[]> {
  const supabase = createClient();
  if (supabase && isSupabaseConfigured()) {
    try {
      const { data, error } = await supabase
        .from('transactions')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(limit);

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
          price_impact_percent: t.type === 'buy' ? 1.2 : -1.0,
          created_at: t.created_at,
        }));

        setStoredJson(STORAGE_TRADES_KEY, mapped);
        return mapped;
      }
    } catch (err) {
      console.warn('Error consultando transactions en Supabase:', err);
    }
  }

  // Fallback local real
  const localTrades = getStoredJson<InvestmentTransaction[]>(STORAGE_TRADES_KEY, []);
  return localTrades.slice(0, limit);
}

/**
 * Calcula la métrica real de sentimiento del mercado (compras vs ventas de usuarios reales)
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

/**
 * Consulta el ranking público de mayores inversores reales
 */
export async function fetchTopInvestors(limit: number = 10): Promise<TopInvestor[]> {
  const supabase = createClient();
  if (supabase && isSupabaseConfigured()) {
    try {
      const { data, error } = await supabase.rpc('get_botellon_top_investors', {
        p_limit: limit,
      });

      if (!error && Array.isArray(data)) {
        return data.map((item) => ({
          user_id: item.user_id,
          username: item.username,
          avatar_color: item.avatar_color || 'emerald',
          shares: Number(item.shares),
          position_value: Number(item.position_value),
          total_invested: Number(item.total_invested),
          profit_percent: Number(item.profit_percent),
        }));
      }
    } catch (err) {
      console.warn('Error fetching top investors via RPC:', err);
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
        .single();

      if (!error && data && data.parody_stocks && typeof data.parody_stocks === 'object') {
        let remoteStocks: Record<string, any> = {};
        if (Array.isArray(data.parody_stocks)) {
          for (const item of data.parody_stocks) {
            if (item && item.ticker) {
              remoteStocks[item.ticker] = item;
            }
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
              change24h: remote.change_24h !== undefined ? Number(remote.change_24h) : diffPct,
              volume: Number(remote.volume ?? base.volume),
              lastNews: remote.last_news || base.lastNews,
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

  // Fallback local real
  const stored = getStoredJson<ParodyStock[]>(STORAGE_STOCKS_KEY, DEFAULT_PARODY_STOCKS);
  // Recalcular change24h según precio actual vs precio base real
  return stored.map((s) => {
    const defaultDef = DEFAULT_PARODY_STOCKS.find((d) => d.ticker === s.ticker);
    const baseP = defaultDef?.basePrice || s.price;
    const realDiffPct = Number((((s.price - baseP) / baseP) * 100).toFixed(2));
    return {
      ...s,
      basePrice: baseP,
      change24h: realDiffPct,
    };
  });
}

/**
 * Consulta las tenencias de acciones del usuario actual
 */
export async function fetchUserStocksPortfolio(): Promise<Record<string, UserStockHolding>> {
  const supabase = createClient();
  if (supabase && isSupabaseConfigured()) {
    try {
      const { data, error } = await supabase
        .from('investments')
        .select('stocks_portfolio')
        .maybeSingle();

      if (!error && data && data.stocks_portfolio) {
        const raw = data.stocks_portfolio as Record<string, any>;
        const result: Record<string, UserStockHolding> = {};
        for (const key of Object.keys(raw)) {
          result[key] = {
            ticker: key,
            shares: Number(raw[key].shares || 0),
            averagePrice: Number(raw[key].average_price || 0),
            totalInvested: Number(raw[key].total_invested || 0),
          };
        }
        setStoredJson(STORAGE_HOLDINGS_KEY, result);
        return result;
      }
    } catch (err) {
      console.warn('Error consultando stocks_portfolio en Supabase:', err);
    }
  }

  return getStoredJson<Record<string, UserStockHolding>>(STORAGE_HOLDINGS_KEY, {});
}

/**
 * Emite una difusión en tiempo real a otras pestañas y Supabase
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

  const supabase = createClient();
  if (supabase && isSupabaseConfigured()) {
    try {
      const channel = supabase.channel('botellon_market_realtime_broadcast');
      channel.subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          channel.send({
            type: 'broadcast',
            event: 'market_trade',
            payload: { transaction: tx, stock: updatedStock, market: updatedMarket, pricePoint },
          });
        }
      });

      // Insertar punto en price_history de Supabase para alimentar las gráficas
      if (pricePoint) {
        Promise.resolve(
          supabase
            .from('price_history')
            .insert([
              {
                ticker: pricePoint.ticker || tx.ticker || 'BTLN',
                price: pricePoint.price,
                pool_balance: pricePoint.pool_balance || 0,
                total_shares: pricePoint.total_shares || 0,
                change_percent: pricePoint.change_percent || 0,
                trigger_type: pricePoint.trigger_type || tx.type,
                event_description: pricePoint.event_description,
              },
            ])
        ).catch(() => {});
      }
    } catch (_) {}
  }
}

/**
 * Invertir monedas en el fondo botellón (BTLN)
 */
export async function investInBotellon(amount: number, username: string = 'Alumno', userId?: string): Promise<InvestmentActionResult> {
  const cleanAmount = Math.round(amount);
  if (cleanAmount <= 0) {
    return {
      success: false,
      type: 'buy',
      execution_price: 0,
      new_price: 0,
      new_balance: 0,
      new_shares: 0,
      message: 'La cantidad debe ser mayor que cero.',
      error: 'Cantidad no válida',
    };
  }

  // 1. Ejecutar transacción autorizada en el servidor (conectado a Supabase Realtime)
  try {
    const res = await fetch('/api/investments/trade', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ticker: 'BTLN',
        action: 'buy',
        amount: cleanAmount,
        username,
        userId,
      }),
    });

    const data = await res.json();
    if (res.ok && data.success) {
      if (data.transaction) {
        const trades = getStoredJson<InvestmentTransaction[]>(STORAGE_TRADES_KEY, []);
        setStoredJson(STORAGE_TRADES_KEY, [data.transaction, ...trades.slice(0, 49)]);
      }
      if (data.pricePoint) {
        const historyMap = getStoredJson<Record<string, PriceHistoryPoint[]>>(STORAGE_HISTORY_KEY, {});
        const pts = historyMap['BTLN'] || [];
        pts.push(data.pricePoint);
        historyMap['BTLN'] = pts.slice(-100);
        setStoredJson(STORAGE_HISTORY_KEY, historyMap);
      }
      broadcastLiveTrade(data.transaction, undefined, undefined, data.pricePoint);
      return {
        success: true,
        type: 'buy',
        coins_spent: cleanAmount,
        shares_bought: data.shares,
        execution_price: data.price,
        new_price: data.newPrice,
        new_balance: 0,
        new_shares: data.shares,
        message: data.message || `Has invertido ${cleanAmount} monedas con éxito.`,
      };
    } else if (data && !data.fallbackLocal) {
      throw new Error(data.error || 'Error al procesar la inversión en el servidor.');
    }
  } catch (err: any) {
    if (err.message && !err.message.includes('fetch') && !err.message.includes('Network') && !err.message.includes('Failed to fetch')) {
      throw err;
    }
    console.warn('API /api/investments/trade fallback:', err);
  }

  const supabase = createClient();
  if (supabase && isSupabaseConfigured()) {
    try {
      const { data, error } = await supabase.rpc('invest_in_botellon', {
        p_amount: cleanAmount,
      });

      if (!error && data) {
        const result: InvestmentActionResult = {
          success: true,
          type: 'buy',
          coins_spent: Number(data.coins_spent),
          shares_bought: Number(data.shares_bought),
          execution_price: Number(data.execution_price),
          new_price: Number(data.new_price),
          new_balance: Number(data.new_balance),
          new_shares: Number(data.new_shares),
          message: data.message || `Has invertido ${cleanAmount} monedas con éxito.`,
        };

        const tx: InvestmentTransaction = {
          id: `tx-${Date.now()}`,
          user_id: userId || 'user',
          username,
          ticker: 'BTLN',
          type: 'buy',
          coins_amount: cleanAmount,
          shares_amount: result.shares_bought || 0,
          price_per_share: result.execution_price,
          fee_coins: 0,
          net_coins: cleanAmount,
          created_at: new Date().toISOString(),
        };

        const pt: PriceHistoryPoint = {
          id: `hist-BTLN-${Date.now()}`,
          ticker: 'BTLN',
          price: result.new_price,
          pool_balance: result.new_balance || 0,
          total_shares: result.new_shares || 0,
          change_percent: 1.0,
          trigger_type: 'buy',
          event_description: `@${username} invirtió en BTLN`,
          created_at: new Date().toISOString(),
        };

        broadcastLiveTrade(tx, undefined, undefined, pt);
        return result;
      }
    } catch (err: any) {
      console.warn('invest_in_botellon RPC error, aplicando lógica local:', err);
    }
  }

  // Operación local real y persistente
  const mState = getStoredJson<MarketState>(STORAGE_MARKET_KEY, getInitialMarketState());
  const execPrice = mState.current_price;
  const sharesBought = Number((cleanAmount / execPrice).toFixed(4));
  // Impacto de oferta y demanda real (comprar sube el precio)
  const slippage = Math.min(0.12, cleanAmount / (mState.reserve_balance + mState.pool_balance + 5000));
  const newPrice = Number((execPrice * (1 + slippage)).toFixed(4));

  mState.current_price = newPrice;
  mState.pool_balance += cleanAmount;
  mState.total_shares += sharesBought;
  mState.total_volume += cleanAmount;
  mState.total_investors = Math.max(1, mState.total_investors + 1);
  mState.updated_at = new Date().toISOString();
  setStoredJson(STORAGE_MARKET_KEY, mState);

  // Cartera BTLN del usuario
  const userBtln = getStoredJson<InvestmentPosition>(STORAGE_BTLN_KEY, {
    id: 'local-btln',
    user_id: userId || 'local-user',
    shares: 0,
    total_invested_coins: 0,
    total_withdrawn_coins: 0,
    average_buy_price: 0,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  });

  const nextShares = userBtln.shares + sharesBought;
  const nextAvg = Number(
    ((userBtln.average_buy_price * userBtln.shares + execPrice * sharesBought) / nextShares).toFixed(4)
  );
  userBtln.shares = nextShares;
  userBtln.average_buy_price = nextAvg;
  userBtln.total_invested_coins += cleanAmount;
  userBtln.last_transaction_at = new Date().toISOString();
  setStoredJson(STORAGE_BTLN_KEY, userBtln);

  // Registro de transacción real
  const newTx: InvestmentTransaction = {
    id: `tx-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    user_id: userId || 'local-user',
    username,
    ticker: 'BTLN',
    type: 'buy',
    coins_amount: cleanAmount,
    shares_amount: sharesBought,
    price_per_share: execPrice,
    fee_coins: 0,
    net_coins: cleanAmount,
    price_impact_percent: Number((slippage * 100).toFixed(1)),
    created_at: new Date().toISOString(),
  };

  const trades = getStoredJson<InvestmentTransaction[]>(STORAGE_TRADES_KEY, []);
  setStoredJson(STORAGE_TRADES_KEY, [newTx, ...trades.slice(0, 49)]);

  // Registro en histórico de precios
  const historyMap = getStoredJson<Record<string, PriceHistoryPoint[]>>(STORAGE_HISTORY_KEY, {});
  const btlPoints = historyMap['BTLN'] || [];
  btlPoints.push({
    id: `hist-btln-${Date.now()}`,
    ticker: 'BTLN',
    price: newPrice,
    pool_balance: mState.pool_balance,
    total_shares: mState.total_shares,
    change_percent: Number((slippage * 100).toFixed(2)),
    trigger_type: 'buy',
    event_description: `@${username} compró ${cleanAmount} 🪙`,
    created_at: new Date().toISOString(),
  });
  historyMap['BTLN'] = btlPoints.slice(-100);
  setStoredJson(STORAGE_HISTORY_KEY, historyMap);

  broadcastLiveTrade(newTx, undefined, mState, btlPoints[btlPoints.length - 1]);

  return {
    success: true,
    type: 'buy',
    coins_spent: cleanAmount,
    shares_bought: sharesBought,
    execution_price: execPrice,
    new_price: newPrice,
    new_balance: 0,
    new_shares: nextShares,
    message: `Has invertido ${cleanAmount} monedas (+${sharesBought.toFixed(2)} participaciones en $BTLN a ${execPrice} 🪙)`,
  };
}

/**
 * Vender participaciones del fondo botellón (BTLN)
 */
export async function withdrawFromBotellon(shares: number, username: string = 'Alumno', userId?: string): Promise<InvestmentActionResult> {
  const cleanShares = Number(shares.toFixed(4));
  if (cleanShares <= 0) {
    return {
      success: false,
      type: 'sell',
      execution_price: 0,
      new_price: 0,
      new_balance: 0,
      new_shares: 0,
      message: 'Debes indicar una cantidad mayor a cero.',
      error: 'Cantidad no válida',
    };
  }

  // 1. Ejecutar venta autorizada en el servidor (conectado a Supabase Realtime)
  try {
    const res = await fetch('/api/investments/trade', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ticker: 'BTLN',
        action: 'sell',
        amount: cleanShares,
        username,
        userId,
      }),
    });

    const data = await res.json();
    if (res.ok && data.success) {
      if (data.transaction) {
        const trades = getStoredJson<InvestmentTransaction[]>(STORAGE_TRADES_KEY, []);
        setStoredJson(STORAGE_TRADES_KEY, [data.transaction, ...trades.slice(0, 49)]);
      }
      if (data.pricePoint) {
        const historyMap = getStoredJson<Record<string, PriceHistoryPoint[]>>(STORAGE_HISTORY_KEY, {});
        const pts = historyMap['BTLN'] || [];
        pts.push(data.pricePoint);
        historyMap['BTLN'] = pts.slice(-100);
        setStoredJson(STORAGE_HISTORY_KEY, historyMap);
      }
      broadcastLiveTrade(data.transaction, undefined, undefined, data.pricePoint);
      return {
        success: true,
        type: 'sell',
        shares_sold: cleanShares,
        coins_received: data.coinsDelta,
        fee_paid: data.feePaid,
        execution_price: data.price,
        new_price: data.newPrice,
        new_balance: 0,
        new_shares: data.remainingShares,
        message: data.message || `Has retirado ${cleanShares} participaciones con éxito.`,
      };
    } else if (data && !data.fallbackLocal) {
      throw new Error(data.error || 'Error al procesar la retirada.');
    }
  } catch (err: any) {
    if (err.message && !err.message.includes('fetch') && !err.message.includes('Network') && !err.message.includes('Failed to fetch')) {
      throw err;
    }
    console.warn('API /api/investments/trade fallback:', err);
  }

  const supabase = createClient();
  if (supabase && isSupabaseConfigured()) {
    try {
      const { data, error } = await supabase.rpc('withdraw_from_botellon', {
        p_shares: cleanShares,
      });

      if (!error && data) {
        const result: InvestmentActionResult = {
          success: true,
          type: 'sell',
          shares_sold: Number(data.shares_sold),
          coins_received: Number(data.coins_received),
          fee_paid: Number(data.fee_paid),
          execution_price: Number(data.execution_price),
          new_price: Number(data.new_price),
          new_balance: Number(data.new_balance),
          new_shares: Number(data.new_shares),
          message: data.message || `Has retirado ${cleanShares} participaciones con éxito.`,
        };

        const tx: InvestmentTransaction = {
          id: `tx-${Date.now()}`,
          user_id: userId || 'user',
          username,
          ticker: 'BTLN',
          type: 'sell',
          coins_amount: result.coins_received || 0,
          shares_amount: cleanShares,
          price_per_share: result.execution_price,
          fee_coins: result.fee_paid || 0,
          net_coins: result.coins_received || 0,
          created_at: new Date().toISOString(),
        };

        const pt: PriceHistoryPoint = {
          id: `hist-BTLN-${Date.now()}`,
          ticker: 'BTLN',
          price: result.new_price,
          pool_balance: result.new_balance || 0,
          total_shares: result.new_shares || 0,
          change_percent: -1.0,
          trigger_type: 'sell',
          event_description: `@${username} retiró de BTLN`,
          created_at: new Date().toISOString(),
        };

        broadcastLiveTrade(tx, undefined, undefined, pt);
        return result;
      }
    } catch (err: any) {
      console.warn('withdraw_from_botellon RPC error, aplicando lógica local:', err);
    }
  }

  // Operación local real y persistente
  const mState = getStoredJson<MarketState>(STORAGE_MARKET_KEY, getInitialMarketState());
  const execPrice = mState.current_price;
  const gross = Math.round(cleanShares * execPrice);
  const fee = Math.max(1, Math.round(gross * mState.fee_rate));
  const net = Math.max(0, gross - fee);

  // Vender baja la cotización
  const slippage = Math.min(0.12, gross / (mState.reserve_balance + mState.pool_balance + 5000));
  const newPrice = Math.max(1.0, Number((execPrice * (1 - slippage)).toFixed(4)));

  mState.current_price = newPrice;
  mState.pool_balance = Math.max(0, mState.pool_balance - net);
  mState.total_shares = Math.max(0, mState.total_shares - cleanShares);
  mState.total_volume += gross;
  mState.updated_at = new Date().toISOString();
  setStoredJson(STORAGE_MARKET_KEY, mState);

  const userBtln = getStoredJson<InvestmentPosition>(STORAGE_BTLN_KEY, {
    id: 'local-btln',
    user_id: userId || 'local-user',
    shares: 0,
    total_invested_coins: 0,
    total_withdrawn_coins: 0,
    average_buy_price: 0,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  });

  const nextShares = Math.max(0, Number((userBtln.shares - cleanShares).toFixed(4)));
  userBtln.shares = nextShares;
  userBtln.total_withdrawn_coins += net;
  userBtln.last_transaction_at = new Date().toISOString();
  setStoredJson(STORAGE_BTLN_KEY, userBtln);

  const newTx: InvestmentTransaction = {
    id: `tx-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    user_id: userId || 'local-user',
    username,
    ticker: 'BTLN',
    type: 'sell',
    coins_amount: gross,
    shares_amount: cleanShares,
    price_per_share: execPrice,
    fee_coins: fee,
    net_coins: net,
    price_impact_percent: -Number((slippage * 100).toFixed(1)),
    created_at: new Date().toISOString(),
  };

  const trades = getStoredJson<InvestmentTransaction[]>(STORAGE_TRADES_KEY, []);
  setStoredJson(STORAGE_TRADES_KEY, [newTx, ...trades.slice(0, 49)]);

  const historyMap = getStoredJson<Record<string, PriceHistoryPoint[]>>(STORAGE_HISTORY_KEY, {});
  const btlPoints = historyMap['BTLN'] || [];
  btlPoints.push({
    id: `hist-btln-${Date.now()}`,
    ticker: 'BTLN',
    price: newPrice,
    pool_balance: mState.pool_balance,
    total_shares: mState.total_shares,
    change_percent: -Number((slippage * 100).toFixed(2)),
    trigger_type: 'sell',
    event_description: `@${username} vendió ${cleanShares} acc.`,
    created_at: new Date().toISOString(),
  });
  historyMap['BTLN'] = btlPoints.slice(-100);
  setStoredJson(STORAGE_HISTORY_KEY, historyMap);

  broadcastLiveTrade(newTx, undefined, mState, btlPoints[btlPoints.length - 1]);

  return {
    success: true,
    type: 'sell',
    shares_sold: cleanShares,
    coins_received: net,
    fee_paid: fee,
    execution_price: execPrice,
    new_price: newPrice,
    new_balance: 0,
    new_shares: nextShares,
    message: `Has vendido ${cleanShares} participaciones de $BTLN y cobrado ${net} monedas (comisión de ${fee} 🪙 al pool)`,
  };
}

/**
 * Operación de compra o venta de empresas parodia (Bolsa de la clase)
 * Las compras SUBEN el precio de la empresa y las ventas lo BAJAN en tiempo real.
 */
export async function tradeParodyStock(
  ticker: string,
  action: 'buy' | 'sell',
  amountOrShares: number,
  username: string = 'Alumno',
  userId?: string
): Promise<{
  success: boolean;
  ticker: string;
  action: 'buy' | 'sell';
  shares: number;
  price: number;
  newPrice: number;
  coinsDelta: number;
  feePaid: number;
  remainingShares: number;
  newBalance?: number;
  message: string;
  error?: string;
}> {
  let effectiveUsername = username;
  let effectiveUserId = userId;
  if (typeof username === 'string' && /^[0-9a-f-]{36}$/i.test(username) && typeof userId === 'string') {
    effectiveUserId = username;
    effectiveUsername = userId;
  }

  // 1. Ejecutar orden autorizada en el servidor (conectado a Supabase Realtime)
  try {
    const res = await fetch('/api/investments/trade', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ticker,
        action,
        amount: amountOrShares,
        username: effectiveUsername,
        userId: effectiveUserId,
      }),
    });

    const data = await res.json();
    if (res.ok && data.success) {
      // Guardar posición local para visualización instantánea
      const holdings = getStoredJson<Record<string, UserStockHolding>>(STORAGE_HOLDINGS_KEY, {});
      if (action === 'buy') {
        const cur = holdings[ticker] || { ticker, shares: 0, averagePrice: 0, totalInvested: 0 };
        const nextShares = cur.shares + data.shares;
        const nextInvested = cur.totalInvested + Math.abs(data.coinsDelta);
        holdings[ticker] = {
          ticker,
          shares: nextShares,
          averagePrice: nextShares > 0 ? nextInvested / nextShares : data.price,
          totalInvested: nextInvested,
        };
      } else {
        const cur = holdings[ticker];
        if (cur) {
          const nextShares = Math.max(0, cur.shares - data.shares);
          if (nextShares <= 0.001) delete holdings[ticker];
          else holdings[ticker] = { ...cur, shares: nextShares };
        }
      }
      setStoredJson(STORAGE_HOLDINGS_KEY, holdings);

      if (data.transaction) {
        const trades = getStoredJson<InvestmentTransaction[]>(STORAGE_TRADES_KEY, []);
        setStoredJson(STORAGE_TRADES_KEY, [data.transaction, ...trades.slice(0, 49)]);
      }

      if (data.pricePoint) {
        const historyMap = getStoredJson<Record<string, PriceHistoryPoint[]>>(STORAGE_HISTORY_KEY, {});
        const pts = historyMap[ticker] || [];
        pts.push(data.pricePoint);
        historyMap[ticker] = pts.slice(-100);
        setStoredJson(STORAGE_HISTORY_KEY, historyMap);
      }

      broadcastLiveTrade(data.transaction, undefined, undefined, data.pricePoint);
      return data;
    } else if (data && !data.fallbackLocal) {
      throw new Error(data.error || 'Error procesando la orden');
    }
  } catch (err: any) {
    if (err.message && !err.message.includes('fetch') && !err.message.includes('Network') && !err.message.includes('Failed to fetch')) {
      throw err;
    }
    console.warn('API /api/investments/trade fallback:', err);
  }

  const supabase = createClient();
  if (supabase && isSupabaseConfigured()) {
    try {
      const { data, error } = await supabase.rpc('trade_parody_stock', {
        p_ticker: ticker,
        p_action: action,
        p_amount: amountOrShares,
      });

      if (!error && data && data.success) {
        const result = {
          success: true,
          ticker: data.ticker,
          action: data.action,
          shares: Number(data.shares),
          price: Number(data.price),
          newPrice: Number(data.new_price),
          coinsDelta: Number(data.coins_delta),
          feePaid: Number(data.fee_paid || 0),
          remainingShares: Number(data.remaining_shares || 0),
          newBalance: data.new_balance ? Number(data.new_balance) : undefined,
          message:
            action === 'buy'
              ? `Has comprado ${Number(data.shares).toFixed(2)} acciones de ${ticker} (+${((Number(data.new_price) - Number(data.price)) / Number(data.price) * 100).toFixed(1)}% subida)`
              : `Has vendido ${Number(data.shares).toFixed(2)} acciones de ${ticker} (+${Number(data.coins_delta)} monedas)`,
        };

        const tx: InvestmentTransaction = {
          id: `tx-${Date.now()}`,
          user_id: userId || 'user',
          username,
          ticker,
          type: action,
          coins_amount: Math.abs(result.coinsDelta),
          shares_amount: result.shares,
          price_per_share: result.price,
          fee_coins: result.feePaid,
          net_coins: Math.abs(result.coinsDelta),
          created_at: new Date().toISOString(),
        };

        const pt: PriceHistoryPoint = {
          id: `hist-${ticker}-${Date.now()}`,
          ticker,
          price: result.newPrice,
          pool_balance: Math.abs(result.coinsDelta),
          total_shares: result.shares,
          change_percent: action === 'buy' ? 1.0 : -1.0,
          trigger_type: action,
          event_description: `@${username} ${action === 'buy' ? 'compró' : 'vendió'} ${ticker}`,
          created_at: new Date().toISOString(),
        };

        broadcastLiveTrade(tx, undefined, undefined, pt);
        return result;
      }
    } catch (err: any) {
      console.warn('trade_parody_stock RPC error, aplicando lógica de mercado local:', err);
    }
  }

  // Operación local real y persistente con impacto real en la tabla de cotizaciones
  const stocks = getStoredJson<ParodyStock[]>(STORAGE_STOCKS_KEY, DEFAULT_PARODY_STOCKS);
  const stockIndex = stocks.findIndex((s) => s.ticker === ticker);
  if (stockIndex === -1) {
    return {
      success: false,
      ticker,
      action,
      shares: 0,
      price: 0,
      newPrice: 0,
      coinsDelta: 0,
      feePaid: 0,
      remainingShares: 0,
      message: 'Empresa no encontrada.',
      error: 'Empresa no encontrada',
    };
  }

  const stock = stocks[stockIndex];
  const defaultDef = DEFAULT_PARODY_STOCKS.find((d) => d.ticker === ticker);
  const basePrice = defaultDef?.basePrice || stock.basePrice || stock.price;
  const currentPrice = stock.price;

  const holdings = getStoredJson<Record<string, UserStockHolding>>(STORAGE_HOLDINGS_KEY, {});
  const userHolding = holdings[ticker] || {
    ticker,
    shares: 0,
    averagePrice: 0,
    totalInvested: 0,
  };

  const poolLiquidity = 15000; // Profundidad de liquidez de cada acción

  if (action === 'buy') {
    const coins = Math.round(amountOrShares);
    const sharesBought = Number((coins / currentPrice).toFixed(4));
    // La compra eleva la cotización según el volumen invertido
    const slippage = Math.min(0.18, coins / poolLiquidity);
    const newPrice = Number((currentPrice * (1 + slippage)).toFixed(2));

    stock.price = newPrice;
    stock.volume += coins;
    // El porcentaje 24h refleja el cambio real respecto al precio base
    stock.change24h = Number((((newPrice - basePrice) / basePrice) * 100).toFixed(2));
    stocks[stockIndex] = stock;
    setStoredJson(STORAGE_STOCKS_KEY, stocks);

    const newTotalShares = userHolding.shares + sharesBought;
    const newAvg = Number(
      ((userHolding.averagePrice * userHolding.shares + currentPrice * sharesBought) / newTotalShares).toFixed(4)
    );

    holdings[ticker] = {
      ticker,
      shares: newTotalShares,
      averagePrice: newAvg,
      totalInvested: userHolding.totalInvested + coins,
    };
    setStoredJson(STORAGE_HOLDINGS_KEY, holdings);

    const newTx: InvestmentTransaction = {
      id: `tx-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      user_id: userId || 'local-user',
      username,
      ticker,
      type: 'buy',
      coins_amount: coins,
      shares_amount: sharesBought,
      price_per_share: currentPrice,
      fee_coins: 0,
      net_coins: coins,
      price_impact_percent: Number((slippage * 100).toFixed(1)),
      created_at: new Date().toISOString(),
    };

    const trades = getStoredJson<InvestmentTransaction[]>(STORAGE_TRADES_KEY, []);
    setStoredJson(STORAGE_TRADES_KEY, [newTx, ...trades.slice(0, 49)]);

    const historyMap = getStoredJson<Record<string, PriceHistoryPoint[]>>(STORAGE_HISTORY_KEY, {});
    const stPoints = historyMap[ticker] || [];
    stPoints.push({
      id: `hist-${ticker}-${Date.now()}`,
      ticker,
      price: newPrice,
      pool_balance: stock.volume,
      total_shares: newTotalShares,
      change_percent: Number((slippage * 100).toFixed(2)),
      trigger_type: 'buy',
      event_description: `@${username} compró ${coins} 🪙`,
      created_at: new Date().toISOString(),
    });
    historyMap[ticker] = stPoints.slice(-100);
    setStoredJson(STORAGE_HISTORY_KEY, historyMap);

    broadcastLiveTrade(newTx, stock, undefined, stPoints[stPoints.length - 1]);

    return {
      success: true,
      ticker,
      action: 'buy',
      shares: sharesBought,
      price: currentPrice,
      newPrice,
      coinsDelta: -coins,
      feePaid: 0,
      remainingShares: newTotalShares,
      message: `Has comprado ${sharesBought.toFixed(2)} acciones de ${stock.name}. Precio sube a ${newPrice.toFixed(2)} 🪙 (+${(slippage * 100).toFixed(1)}%)`,
    };
  } else {
    const sharesToSell = Number(amountOrShares.toFixed(4));
    if (sharesToSell > userHolding.shares) {
      return {
        success: false,
        ticker,
        action: 'sell',
        shares: 0,
        price: currentPrice,
        newPrice: currentPrice,
        coinsDelta: 0,
        feePaid: 0,
        remainingShares: userHolding.shares,
        message: `No posees suficientes acciones de ${ticker}.`,
      };
    }

    const gross = Math.round(sharesToSell * currentPrice);
    const fee = Math.max(1, Math.round(gross * 0.02));
    const net = Math.max(0, gross - fee);

    // La venta hace caer la cotización
    const slippage = Math.min(0.18, gross / poolLiquidity);
    const newPrice = Math.max(1.0, Number((currentPrice * (1 - slippage)).toFixed(2)));

    stock.price = newPrice;
    stock.volume += gross;
    stock.change24h = Number((((newPrice - basePrice) / basePrice) * 100).toFixed(2));
    stocks[stockIndex] = stock;
    setStoredJson(STORAGE_STOCKS_KEY, stocks);

    const remaining = Number((userHolding.shares - sharesToSell).toFixed(4));
    if (remaining <= 0.0001) {
      delete holdings[ticker];
    } else {
      holdings[ticker] = {
        ...userHolding,
        shares: remaining,
      };
    }
    setStoredJson(STORAGE_HOLDINGS_KEY, holdings);

    const newTx: InvestmentTransaction = {
      id: `tx-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      user_id: userId || 'local-user',
      username,
      ticker,
      type: 'sell',
      coins_amount: gross,
      shares_amount: sharesToSell,
      price_per_share: currentPrice,
      fee_coins: fee,
      net_coins: net,
      price_impact_percent: -Number((slippage * 100).toFixed(1)),
      created_at: new Date().toISOString(),
    };

    const trades = getStoredJson<InvestmentTransaction[]>(STORAGE_TRADES_KEY, []);
    setStoredJson(STORAGE_TRADES_KEY, [newTx, ...trades.slice(0, 49)]);

    const historyMap = getStoredJson<Record<string, PriceHistoryPoint[]>>(STORAGE_HISTORY_KEY, {});
    const stPoints = historyMap[ticker] || [];
    stPoints.push({
      id: `hist-${ticker}-${Date.now()}`,
      ticker,
      price: newPrice,
      pool_balance: stock.volume,
      total_shares: remaining,
      change_percent: -Number((slippage * 100).toFixed(2)),
      trigger_type: 'sell',
      event_description: `@${username} vendió ${sharesToSell.toFixed(2)} acc.`,
      created_at: new Date().toISOString(),
    });
    historyMap[ticker] = stPoints.slice(-100);
    setStoredJson(STORAGE_HISTORY_KEY, historyMap);

    broadcastLiveTrade(newTx, stock, undefined, stPoints[stPoints.length - 1]);

    return {
      success: true,
      ticker,
      action: 'sell',
      shares: sharesToSell,
      price: currentPrice,
      newPrice,
      coinsDelta: net,
      feePaid: fee,
      remainingShares: remaining,
      message: `Has vendido ${sharesToSell.toFixed(2)} acciones de ${stock.name} y cobrado ${net} 🪙 (Precio ajustado a ${newPrice.toFixed(2)} 🪙)`,
    };
  }
}

/**
 * Escucha cambios en tiempo real vía BroadcastChannel y Supabase Broadcast
 */
export function subscribeToRealtimeTrades(
  callback: (payload: {
    transaction: InvestmentTransaction;
    stock?: ParodyStock;
    market?: MarketState;
    pricePoint?: PriceHistoryPoint;
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
  } catch {}

  let supabaseChannel: any = null;
  const supabase = createClient();
  if (supabase && isSupabaseConfigured()) {
    try {
      supabaseChannel = supabase
        .channel('botellon_market_realtime_broadcast')
        .on('broadcast', { event: 'market_trade' }, (payload: any) => {
          if (payload && payload.payload) {
            callback({
              transaction: payload.payload.transaction,
              stock: payload.payload.stock,
              market: payload.payload.market,
              pricePoint: payload.payload.pricePoint,
            });
          }
        })
        .subscribe();
    } catch {}
  }

  return () => {
    try {
      if (bc) bc.close();
      if (supabase && supabaseChannel) {
        supabase.removeChannel(supabaseChannel);
      }
    } catch {}
  };
}

/**
 * Fuerza un tick de mercado
 */
export async function triggerMarketTick(): Promise<{ success: boolean; data?: any; error?: string }> {
  try {
    const res = await fetch('/api/investments/tick', { method: 'POST' });
    const data = await res.json();
    return { success: res.ok, data };
  } catch (err: any) {
    return { success: false, error: err?.message };
  }
}
