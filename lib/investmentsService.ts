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
} from '@/lib/types';

export const DEFAULT_PARODY_STOCKS: ParodyStock[] = [
  {
    ticker: 'ONION',
    name: 'Onion',
    parodyOf: 'Apple',
    slogan: 'Dispositivos y tecnología',
    sector: 'Tecnología',
    price: 45.2,
    change24h: 3.4,
    volume: 128400,
    accentColor: '#10b981',
    iconType: 'onion',
  },
  {
    ticker: 'ARDI',
    name: 'Ardidas',
    parodyOf: 'Adidas',
    slogan: 'Ropa y zapatillas deportivas',
    sector: 'Deporte',
    price: 28.5,
    change24h: -1.2,
    volume: 84200,
    accentColor: '#3b82f6',
    iconType: 'shoe',
  },
  {
    ticker: 'CHERR',
    name: 'Carlos Herrero',
    parodyOf: 'Carolina Herrera',
    slogan: 'Fragancias y moda',
    sector: 'Perfumería',
    price: 19.8,
    change24h: 2.1,
    volume: 62500,
    accentColor: '#ec4899',
    iconType: 'perfume',
  },
  {
    ticker: 'MBRON',
    name: 'Mercabrona',
    parodyOf: 'Mercadona',
    slogan: 'Supermercados y alimentación',
    sector: 'Alimentación',
    price: 12.1,
    change24h: 0.8,
    volume: 215000,
    accentColor: '#059669',
    iconType: 'cart',
  },
  {
    ticker: 'CUTI',
    name: 'Cutify',
    parodyOf: 'Spotify',
    slogan: 'Música y podcasts en streaming',
    sector: 'Streaming',
    price: 8.4,
    change24h: 4.2,
    volume: 94100,
    accentColor: '#84cc16',
    iconType: 'music',
  },
  {
    ticker: 'TOLED',
    name: 'Toledo TDI',
    parodyOf: 'Tesla',
    slogan: 'Vehículos y motor',
    sector: 'Automoción',
    price: 34.0,
    change24h: -0.9,
    volume: 110400,
    accentColor: '#f59e0b',
    iconType: 'car',
  },
];

let mockParodyStocks: ParodyStock[] = [...DEFAULT_PARODY_STOCKS];
let mockUserStockHoldings: Record<string, UserStockHolding> = {};

// Estado de simulación en memoria para desarrollo local o si faltan tablas en Supabase
let mockMarketState: MarketState = {
  id: 1,
  current_price: 12.5,
  total_shares: 420.0,
  pool_balance: 15200,
  reserve_balance: 25000,
  total_volume: 48500,
  total_investors: 6,
  fee_rate: 0.02,
  cooldown_seconds: 60,
  min_investment: 10,
  max_investment: 25000,
  last_event: 'Mercado estable',
  last_event_type: 'neutral',
  last_event_impact: 0.0,
  last_tick_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

let mockPriceHistory: PriceHistoryPoint[] = generateInitialMockHistory();
let mockTransactions: InvestmentTransaction[] = [];
let mockPosition: InvestmentPosition = {
  id: 'mock-pos',
  user_id: 'local-user',
  shares: 0,
  total_invested_coins: 0,
  total_withdrawn_coins: 0,
  average_buy_price: 0,
  last_transaction_at: undefined,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

function generateInitialMockHistory(): PriceHistoryPoint[] {
  const points: PriceHistoryPoint[] = [];
  const now = Date.now();
  let base = 10.0;
  for (let i = 24; i >= 0; i--) {
    const time = new Date(now - i * 15 * 60 * 1000).toISOString();
    const fluctuation = (Math.sin(i * 0.7) * 0.8) + ((Math.random() - 0.48) * 0.4);
    base = Math.max(1.0, Number((base + fluctuation).toFixed(4)));
    points.push({
      id: `mock-hist-${i}`,
      price: base,
      pool_balance: 10000 + i * 200,
      total_shares: 300 + i * 5,
      change_percent: Number((fluctuation * 10).toFixed(2)),
      trigger_type: i === 5 ? 'event' : i % 4 === 0 ? 'buy' : 'tick',
      event_description: i === 5 ? '🎉 ¡Noche Épica de Botellón!' : undefined,
      created_at: time,
    });
  }
  return points;
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
        return {
          id: data.id,
          current_price: Number(data.current_price),
          total_shares: Number(data.total_shares),
          pool_balance: Number(data.pool_balance),
          reserve_balance: Number(data.reserve_balance),
          total_volume: Number(data.total_volume),
          total_investors: Number(data.total_investors),
          fee_rate: Number(data.fee_rate),
          cooldown_seconds: Number(data.cooldown_seconds),
          min_investment: Number(data.min_investment),
          max_investment: Number(data.max_investment),
          last_event: data.last_event,
          last_event_type: data.last_event_type,
          last_event_impact: Number(data.last_event_impact),
          last_tick_at: data.last_tick_at,
          updated_at: data.updated_at,
        };
      }
    } catch (err) {
      console.warn('Error fetching market state from Supabase, using local fallback:', err);
    }
  }

  return mockMarketState;
}

/**
 * Consulta el histórico de precios para alimentar la gráfica
 */
export async function fetchPriceHistory(limit: number = 80): Promise<PriceHistoryPoint[]> {
  const supabase = createClient();
  if (supabase && isSupabaseConfigured()) {
    try {
      const { data, error } = await supabase
        .from('price_history')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(limit);

      if (!error && Array.isArray(data) && data.length > 0) {
        // Invertir para orden cronológico ascendente (izquierda a derecha en gráfica)
        return data
          .map((item) => ({
            id: item.id,
            price: Number(item.price),
            pool_balance: Number(item.pool_balance),
            total_shares: Number(item.total_shares),
            change_percent: Number(item.change_percent),
            trigger_type: item.trigger_type,
            event_description: item.event_description,
            created_at: item.created_at,
          }))
          .reverse();
      }
    } catch (err) {
      console.warn('Error fetching price history from Supabase:', err);
    }
  }

  return [...mockPriceHistory];
}

/**
 * Consulta la cartera de inversión del usuario actual
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
      console.warn('Error fetching portfolio via RPC:', err);
    }
  }

  // Fallback local
  const price = mockMarketState.current_price;
  const value = mockPosition.shares * price;
  const invested = mockPosition.shares * mockPosition.average_buy_price;
  const profit = invested > 0 ? value - invested : 0;
  const profitPct = invested > 0 ? (profit / invested) * 100 : 0;

  return {
    authenticated: true,
    shares: mockPosition.shares,
    average_buy_price: mockPosition.average_buy_price,
    total_invested_coins: mockPosition.total_invested_coins,
    total_withdrawn_coins: mockPosition.total_withdrawn_coins,
    position_value: Number(value.toFixed(2)),
    unrealized_profit_coins: Number(profit.toFixed(2)),
    unrealized_profit_percent: Number(profitPct.toFixed(2)),
    cooldown_remaining_seconds: 0,
    last_transaction_at: mockPosition.last_transaction_at,
  };
}

/**
 * Consulta el historial de transacciones propias
 */
export async function fetchUserTransactions(limit: number = 20): Promise<InvestmentTransaction[]> {
  const supabase = createClient();
  if (supabase && isSupabaseConfigured()) {
    try {
      const { data, error } = await supabase
        .from('transactions')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(limit);

      if (!error && Array.isArray(data)) {
        return data.map((t) => ({
          id: t.id,
          user_id: t.user_id,
          username: t.username,
          type: t.type,
          coins_amount: Number(t.coins_amount),
          shares_amount: Number(t.shares_amount),
          price_per_share: Number(t.price_per_share),
          fee_coins: Number(t.fee_coins),
          net_coins: Number(t.net_coins),
          created_at: t.created_at,
        }));
      }
    } catch (err) {
      console.warn('Error fetching user transactions:', err);
    }
  }

  return mockTransactions;
}

/**
 * Consulta el ranking público de mayores inversores
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

  // Mock top investors
  return [
    {
      user_id: 'mock-1',
      username: 'ElCapoDelParque',
      avatar_color: 'purple',
      shares: 180.5,
      position_value: Number((180.5 * mockMarketState.current_price).toFixed(2)),
      total_invested: 1800,
      profit_percent: 24.8,
    },
    {
      user_id: 'mock-2',
      username: 'JBL_Master',
      avatar_color: 'amber',
      shares: 95.0,
      position_value: Number((95.0 * mockMarketState.current_price).toFixed(2)),
      total_invested: 1000,
      profit_percent: 18.2,
    },
    {
      user_id: 'mock-3',
      username: 'LitronaKing',
      avatar_color: 'emerald',
      shares: 55.2,
      position_value: Number((55.2 * mockMarketState.current_price).toFixed(2)),
      total_invested: 600,
      profit_percent: 14.5,
    },
  ];
}

/**
 * RPC: Invertir monedas en el fondo botellón
 */
export async function investInBotellon(amount: number): Promise<InvestmentActionResult> {
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

  const supabase = createClient();
  if (supabase && isSupabaseConfigured()) {
    try {
      const { data, error } = await supabase.rpc('invest_in_botellon', {
        p_amount: cleanAmount,
      });

      if (error) {
        const isMissingRpc =
          error?.code === '42883' ||
          error?.message?.toLowerCase().includes('function') ||
          error?.message?.toLowerCase().includes('does not exist');

        if (!isMissingRpc) {
          return {
            success: false,
            type: 'buy',
            execution_price: 0,
            new_price: 0,
            new_balance: 0,
            new_shares: 0,
            message: error.message,
            error: error.message,
          };
        }
      } else {
        return {
          success: true,
          type: 'buy',
          coins_spent: Number(data.coins_spent),
          shares_bought: Number(data.shares_bought),
          execution_price: Number(data.execution_price),
          new_price: Number(data.new_price),
          new_balance: Number(data.new_balance),
          new_shares: Number(data.new_shares),
          message: data.message || 'Inversión realizada con éxito.',
        };
      }
    } catch (err: any) {
      console.warn('invest_in_botellon error, falling back to local simulation:', err);
    }
  }

  // Fallback local simulation
  const execPrice = mockMarketState.current_price;
  const sharesBought = Number((cleanAmount / execPrice).toFixed(4));
  const slippage = Math.min(0.12, cleanAmount / (mockMarketState.reserve_balance + mockMarketState.pool_balance));
  const newPrice = Number((execPrice * (1 + slippage)).toFixed(4));

  mockMarketState.current_price = newPrice;
  mockMarketState.pool_balance += cleanAmount;
  mockMarketState.total_shares += sharesBought;
  mockMarketState.total_volume += cleanAmount;

  mockPosition.shares += sharesBought;
  mockPosition.total_invested_coins += cleanAmount;
  mockPosition.average_buy_price = Number(
    ((mockPosition.average_buy_price * (mockPosition.shares - sharesBought) + execPrice * sharesBought) / mockPosition.shares).toFixed(4)
  );
  mockPosition.last_transaction_at = new Date().toISOString();

  const newTx: InvestmentTransaction = {
    id: `local-tx-${Date.now()}`,
    user_id: 'local-user',
    username: 'Tú',
    type: 'buy',
    coins_amount: cleanAmount,
    shares_amount: sharesBought,
    price_per_share: execPrice,
    fee_coins: 0,
    net_coins: cleanAmount,
    created_at: new Date().toISOString(),
  };
  mockTransactions.unshift(newTx);

  mockPriceHistory.push({
    id: `hist-${Date.now()}`,
    price: newPrice,
    pool_balance: mockMarketState.pool_balance,
    total_shares: mockMarketState.total_shares,
    change_percent: Number((slippage * 100).toFixed(2)),
    trigger_type: 'buy',
    event_description: `Inversión de ${cleanAmount} monedas`,
    created_at: new Date().toISOString(),
  });

  return {
    success: true,
    type: 'buy',
    coins_spent: cleanAmount,
    shares_bought: sharesBought,
    execution_price: execPrice,
    new_price: newPrice,
    new_balance: 0,
    new_shares: mockPosition.shares,
    message: `Has invertido ${cleanAmount} monedas y recibido ${sharesBought} participaciones a ${execPrice} 🪙`,
  };
}

/**
 * RPC: Vender participaciones al precio actual
 */
export async function withdrawFromBotellon(shares: number): Promise<InvestmentActionResult> {
  const cleanShares = Number(shares.toFixed(4));
  if (cleanShares <= 0) {
    return {
      success: false,
      type: 'sell',
      execution_price: 0,
      new_price: 0,
      new_balance: 0,
      new_shares: 0,
      message: 'Debes indicar una cantidad de participaciones superior a cero.',
      error: 'Cantidad no válida',
    };
  }

  const supabase = createClient();
  if (supabase && isSupabaseConfigured()) {
    try {
      const { data, error } = await supabase.rpc('withdraw_from_botellon', {
        p_shares: cleanShares,
      });

      if (error) {
        const isMissingRpc =
          error?.code === '42883' ||
          error?.message?.toLowerCase().includes('function') ||
          error?.message?.toLowerCase().includes('does not exist');

        if (!isMissingRpc) {
          return {
            success: false,
            type: 'sell',
            execution_price: 0,
            new_price: 0,
            new_balance: 0,
            new_shares: 0,
            message: error.message,
            error: error.message,
          };
        }
      } else {
        return {
          success: true,
          type: 'sell',
          shares_sold: Number(data.shares_sold),
          coins_received: Number(data.coins_received),
          fee_paid: Number(data.fee_paid),
          execution_price: Number(data.execution_price),
          new_price: Number(data.new_price),
          new_balance: Number(data.new_balance),
          new_shares: Number(data.new_shares),
          message: data.message || 'Retirada completada.',
        };
      }
    } catch (err: any) {
      console.warn('withdraw_from_botellon error, falling back to local simulation:', err);
    }
  }

  // Fallback local simulation
  const execPrice = mockMarketState.current_price;
  const gross = Math.round(cleanShares * execPrice);
  const fee = Math.max(1, Math.round(gross * mockMarketState.fee_rate));
  const net = gross - fee;
  const slippage = Math.min(0.12, gross / (mockMarketState.reserve_balance + mockMarketState.pool_balance));
  const newPrice = Math.max(1.0, Number((execPrice * (1 - slippage)).toFixed(4)));

  mockMarketState.current_price = newPrice;
  mockMarketState.pool_balance = Math.max(0, mockMarketState.pool_balance - net);
  mockMarketState.total_shares = Math.max(0, mockMarketState.total_shares - cleanShares);
  mockMarketState.total_volume += gross;

  mockPosition.shares = Math.max(0, Number((mockPosition.shares - cleanShares).toFixed(4)));
  mockPosition.total_withdrawn_coins += net;
  mockPosition.last_transaction_at = new Date().toISOString();

  const newTx: InvestmentTransaction = {
    id: `local-tx-${Date.now()}`,
    user_id: 'local-user',
    username: 'Tú',
    type: 'sell',
    coins_amount: gross,
    shares_amount: cleanShares,
    price_per_share: execPrice,
    fee_coins: fee,
    net_coins: net,
    created_at: new Date().toISOString(),
  };
  mockTransactions.unshift(newTx);

  mockPriceHistory.push({
    id: `hist-${Date.now()}`,
    price: newPrice,
    pool_balance: mockMarketState.pool_balance,
    total_shares: mockMarketState.total_shares,
    change_percent: -Number((slippage * 100).toFixed(2)),
    trigger_type: 'sell',
    event_description: `Retirada de ${cleanShares} participaciones`,
    created_at: new Date().toISOString(),
  });

  return {
    success: true,
    type: 'sell',
    shares_sold: cleanShares,
    coins_received: net,
    fee_paid: fee,
    execution_price: execPrice,
    new_price: newPrice,
    new_balance: 0,
    new_shares: mockPosition.shares,
    message: `Has vendido ${cleanShares} participaciones y cobrado ${net} monedas (comisión de ${fee} 🪙 al pool)`,
  };
}

/**
 * Fuerza un tick de mercado (para admins o pruebas)
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

/**
 * Consulta la lista de empresas parodia con cotización en vivo
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
        const remoteStocks = data.parody_stocks as Record<string, any>;
        return DEFAULT_PARODY_STOCKS.map((base) => {
          const remote = remoteStocks[base.ticker];
          if (remote) {
            return {
              ...base,
              price: Number(remote.price ?? base.price),
              change24h: Number(remote.change_24h ?? base.change24h),
              volume: Number(remote.volume ?? base.volume),
              lastNews: remote.last_news || base.lastNews,
            };
          }
          return base;
        });
      }
    } catch (err) {
      console.warn('Error fetching parody stocks from Supabase, using local defaults:', err);
    }
  }

  return mockParodyStocks;
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
        return result;
      }
    } catch (err) {
      console.warn('Error fetching stocks portfolio from Supabase:', err);
    }
  }

  return mockUserStockHoldings;
}

/**
 * Ejecuta una operación de compra o venta de acciones parodia
 */
export async function tradeParodyStock(
  ticker: string,
  action: 'buy' | 'sell',
  amountOrShares: number
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
  const supabase = createClient();
  if (supabase && isSupabaseConfigured()) {
    try {
      const { data, error } = await supabase.rpc('trade_parody_stock', {
        p_ticker: ticker,
        p_action: action,
        p_amount: amountOrShares,
      });

      if (!error && data && data.success) {
        return {
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
              ? `Has comprado ${Number(data.shares).toFixed(2)} acciones de ${ticker}`
              : `Has vendido ${Number(data.shares).toFixed(2)} acciones de ${ticker} (+${Number(data.coins_delta)} monedas)`,
        };
      }

      // Si el error es de función no encontrada en Supabase, recurrir a simulación local
      const isMissingRpc =
        error?.code === '42883' ||
        error?.message?.toLowerCase().includes('function') ||
        error?.message?.toLowerCase().includes('does not exist');

      if (!isMissingRpc && error) {
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
          message: error.message,
          error: error.message,
        };
      }
    } catch (err: any) {
      console.warn('RPC trade_parody_stock error, falling back to local simulation:', err);
    }
  }

  // Simulación local en memoria
  const stock = mockParodyStocks.find((s) => s.ticker === ticker);
  if (!stock) {
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
      message: 'Empresa no encontrada',
      error: 'Stock no encontrado',
    };
  }

  const currentPrice = stock.price;
  const holding = mockUserStockHoldings[ticker] || {
    ticker,
    shares: 0,
    averagePrice: 0,
    totalInvested: 0,
  };

  if (action === 'buy') {
    const coins = Math.round(amountOrShares);
    const sharesBought = Number((coins / currentPrice).toFixed(4));
    const slippage = Math.min(0.08, coins / 40000);
    const newPrice = Number((currentPrice * (1 + slippage)).toFixed(4));

    stock.price = newPrice;
    stock.volume += coins;

    const newShares = holding.shares + sharesBought;
    const newAvg = Number(
      ((holding.averagePrice * holding.shares + currentPrice * sharesBought) / newShares).toFixed(4)
    );

    mockUserStockHoldings[ticker] = {
      ticker,
      shares: newShares,
      averagePrice: newAvg,
      totalInvested: holding.totalInvested + coins,
    };

    return {
      success: true,
      ticker,
      action: 'buy',
      shares: sharesBought,
      price: currentPrice,
      newPrice,
      coinsDelta: -coins,
      feePaid: 0,
      remainingShares: newShares,
      message: `Has comprado ${sharesBought.toFixed(2)} acciones de ${stock.name} a ${currentPrice.toFixed(2)} 🪙`,
    };
  } else {
    const sharesToSell = Number(amountOrShares.toFixed(4));
    if (sharesToSell > holding.shares) {
      return {
        success: false,
        ticker,
        action: 'sell',
        shares: 0,
        price: currentPrice,
        newPrice: currentPrice,
        coinsDelta: 0,
        feePaid: 0,
        remainingShares: holding.shares,
        message: `No posees suficientes acciones de ${ticker}.`,
      };
    }

    const gross = Math.round(sharesToSell * currentPrice);
    const fee = Math.max(1, Math.round(gross * 0.02));
    const net = gross - fee;

    const slippage = Math.min(0.08, gross / 40000);
    const newPrice = Math.max(1.0, Number((currentPrice * (1 - slippage)).toFixed(4)));

    stock.price = newPrice;
    stock.volume += gross;

    const remaining = Number((holding.shares - sharesToSell).toFixed(4));
    if (remaining <= 0.0001) {
      delete mockUserStockHoldings[ticker];
    } else {
      mockUserStockHoldings[ticker] = {
        ...holding,
        shares: remaining,
      };
    }

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
      message: `Has vendido ${sharesToSell.toFixed(2)} acciones de ${stock.name} y cobrado ${net} 🪙 (Comisión: ${fee} 🪙)`,
    };
  }
}

