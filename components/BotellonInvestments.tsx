'use client';

import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import {
  TrendingUp,
  TrendingDown,
  ArrowUpRight,
  ArrowDownRight,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Clock,
  Activity,
  Zap,
  HelpCircle,
  Wine,
  Building2,
  Users,
  Shield,
  Coins,
  ChevronRight,
  Landmark,
  PiggyBank,
  Wallet,
  PieChart,
} from 'lucide-react';
import { sound } from '@/lib/audio';
import { createClient } from '@/lib/supabase/client';
import {
  MarketState,
  CompanyFinancials,
  PriceHistoryPoint,
  ParodyStock,
  UserStockHolding,
  InvestmentTransaction,
  MarketSentiment,
  StockShareholder,
} from '@/lib/types';
import {
  fetchMarketState,
  fetchCompanyFinancials,
  fetchPriceHistory,
  fetchRecentMarketTrades,
  fetchParodyStocks,
  fetchUserStocksPortfolio,
  fetchStockShareholders,
  tradeStock,
  triggerMarketTick,
  calculateMarketSentiment,
  subscribeToRealtimeTrades,
  DEFAULT_PARODY_STOCKS,
} from '@/lib/investmentsService';
import { InvestmentsTutorialModal } from '@/components/InvestmentsTutorialModal';

interface BotellonInvestmentsProps {
  userCoins: number;
  userId?: string;
  username?: string;
  onUpdateCoins?: (delta: number) => void;
  onRequireAuth?: () => void;
}

export const BotellonInvestments: React.FC<BotellonInvestmentsProps> = ({
  userCoins,
  userId,
  username,
  onUpdateCoins,
  onRequireAuth,
}) => {
  // Estado de mercado y activos
  const [marketState, setMarketState] = useState<MarketState | null>(null);
  const [companyFinancials, setCompanyFinancials] = useState<CompanyFinancials | null>(null);
  const [parodyStocks, setParodyStocks] = useState<ParodyStock[]>(DEFAULT_PARODY_STOCKS);
  const [selectedTicker, setSelectedTicker] = useState<string>('BTLN');
  const [userHoldings, setUserHoldings] = useState<Record<string, UserStockHolding>>({});

  // Histórico y transacciones
  const [priceHistory, setPriceHistory] = useState<PriceHistoryPoint[]>([]);
  const [transactions, setTransactions] = useState<InvestmentTransaction[]>([]);
  const [shareholders, setShareholders] = useState<StockShareholder[]>([]);

  // Estados UI
  const [tradeMode, setTradeMode] = useState<'buy' | 'sell'>('buy');
  const [timeFilter, setTimeFilter] = useState<'1H' | '6H' | '24H' | 'ALL'>('24H');
  const [tradeAmountInput, setTradeAmountInput] = useState<string>('50');
  const [viewTab, setViewTab] = useState<'tape' | 'shareholders' | 'balance'>('tape');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [cooldownSeconds, setCooldownSeconds] = useState<number>(0);
  const [hoveredPoint, setHoveredPoint] = useState<{
    price: number;
    time: string;
    description?: string;
    player?: string;
    changePct?: number;
  } | null>(null);

  // Notificación de trade en vivo
  const [recentLiveNotification, setRecentLiveNotification] = useState<{
    username: string;
    type: 'buy' | 'sell';
    ticker: string;
    coins: number;
    impact: number;
    time: number;
  } | null>(null);
  const [glowingTicker, setGlowingTicker] = useState<string | null>(null);
  const [isTutorialOpen, setIsTutorialOpen] = useState<boolean>(false);

  // Auto-apertura del tutorial en primera visita
  useEffect(() => {
    try {
      const seen = localStorage.getItem('botellon_investments_tutorial_seen');
      if (!seen) {
        const t = setTimeout(() => setIsTutorialOpen(true), 600);
        return () => clearTimeout(t);
      }
    } catch (_) {}
  }, []);

  // Carga unificada de datos
  const loadData = useCallback(async () => {
    try {
      const [mState, fin, history, txs, stocks, holdings, shs] = await Promise.all([
        fetchMarketState(),
        fetchCompanyFinancials(),
        fetchPriceHistory(80, selectedTicker),
        fetchRecentMarketTrades(30, selectedTicker),
        fetchParodyStocks(),
        fetchUserStocksPortfolio(userId),
        fetchStockShareholders(selectedTicker, 8),
      ]);

      setMarketState(mState);
      setCompanyFinancials(fin);
      setPriceHistory(history);
      setTransactions(txs);
      setParodyStocks(stocks);
      setUserHoldings(holdings);
      setShareholders(shs);
    } catch (err) {
      console.warn('Error cargando inversiones:', err);
    } finally {
      setIsLoading(false);
    }
  }, [selectedTicker, userId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Cargar histórico y accionistas cuando cambia el ticker seleccionado
  useEffect(() => {
    let active = true;
    Promise.all([
      fetchPriceHistory(80, selectedTicker),
      fetchStockShareholders(selectedTicker, 8),
      fetchRecentMarketTrades(30, selectedTicker),
    ]).then(([h, s, t]) => {
      if (active) {
        setPriceHistory(h);
        setShareholders(s);
        setTransactions(t);
      }
    });
    return () => {
      active = false;
    };
  }, [selectedTicker]);

  // Manejo de Cooldown
  useEffect(() => {
    if (cooldownSeconds <= 0) return;
    const interval = setInterval(() => {
      setCooldownSeconds((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(interval);
  }, [cooldownSeconds]);

  // Suscripción Realtime Unificada (BroadcastChannel + Supabase WebSockets)
  useEffect(() => {
    // 1. Canal Broadcast local instantáneo
    const unsub = subscribeToRealtimeTrades((payload) => {
      if (payload.pricePoint && payload.pricePoint.ticker === selectedTicker) {
        setPriceHistory((prev) => [...prev.slice(-79), payload.pricePoint!]);
      }
      if (payload.transaction) {
        const tx = payload.transaction;
        setTransactions((prev) => [tx, ...prev.filter((t) => t.id !== tx.id)].slice(0, 30));
        setRecentLiveNotification({
          username: tx.username,
          type: tx.type,
          ticker: tx.ticker,
          coins: tx.coins_amount,
          impact: tx.price_impact_percent || 0,
          time: Date.now(),
        });
        setGlowingTicker(tx.ticker);
        setTimeout(() => setGlowingTicker(null), 3000);
      }
      if (payload.treasuryBalance && companyFinancials) {
        setCompanyFinancials((prev) =>
          prev ? { ...prev, treasury_balance: payload.treasuryBalance! } : null
        );
      }
    });

    // 2. Supabase Realtime Channels
    const supabase = createClient();
    let channel: any = null;

    if (supabase) {
      try {
        channel = supabase
          .channel('botellon_market_live_stream')
          .on('broadcast', { event: 'market_trade' }, (msg: any) => {
            if (msg?.payload) {
              const { transaction, ticker, newPrice, pricePoint, treasuryBalance } = msg.payload;

              if (pricePoint && pricePoint.ticker === selectedTicker) {
                setPriceHistory((prev) => [...prev.slice(-79), pricePoint]);
              }

              if (transaction) {
                setTransactions((prev) => [transaction, ...prev.filter((t) => t.id !== transaction.id)].slice(0, 30));
                setRecentLiveNotification({
                  username: transaction.username,
                  type: transaction.type,
                  ticker: transaction.ticker || ticker || 'BTLN',
                  coins: Number(transaction.coins_amount || 0),
                  impact: Number(transaction.price_impact_percent || 0),
                  time: Date.now(),
                });
                setGlowingTicker(transaction.ticker || ticker || 'BTLN');
                setTimeout(() => setGlowingTicker(null), 3000);
              }

              if (treasuryBalance && companyFinancials) {
                setCompanyFinancials((prev) =>
                  prev ? { ...prev, treasury_balance: Number(treasuryBalance) } : null
                );
              }

              if (ticker === 'BTLN' && newPrice) {
                setMarketState((prev) => prev ? { ...prev, current_price: Number(newPrice) } : null);
              }
            }
          })
          .on(
            'postgres_changes',
            { event: 'INSERT', schema: 'public', table: 'price_history' },
            (payload) => {
              if (payload.new) {
                const pt = payload.new as any;
                if (pt.ticker === selectedTicker) {
                  const newPt: PriceHistoryPoint = {
                    id: pt.id,
                    ticker: pt.ticker,
                    price: Number(pt.price),
                    volume: Number(pt.volume || 0),
                    pool_balance: Number(pt.pool_balance || 0),
                    treasury_balance: Number(pt.treasury_balance || 0),
                    total_shares: Number(pt.total_shares || 0),
                    change_percent: Number(pt.change_percent || 0),
                    trigger_type: pt.trigger_type,
                    event_description: pt.event_description,
                    player_username: pt.player_username,
                    created_at: pt.created_at,
                  };
                  setPriceHistory((prev) => [...prev.slice(-79), newPt]);
                }
              }
            }
          )
          .on(
            'postgres_changes',
            { event: 'INSERT', schema: 'public', table: 'transactions' },
            (payload) => {
              if (payload.new) {
                const t = payload.new as any;
                const newTx: InvestmentTransaction = {
                  id: t.id,
                  user_id: t.user_id,
                  username: t.username || 'Alumno',
                  ticker: t.ticker || 'BTLN',
                  type: t.type,
                  coins_amount: Number(t.coins_amount || 0),
                  shares_amount: Number(t.shares_amount || 0),
                  price_per_share: Number(t.price_per_share || 0),
                  fee_coins: Number(t.fee_coins || 0),
                  net_coins: Number(t.net_coins || 0),
                  price_impact_percent: Number(t.price_impact_percent || 0),
                  created_at: t.created_at,
                };
                setTransactions((prev) => [newTx, ...prev.filter((item) => item.id !== newTx.id)].slice(0, 30));
              }
            }
          )
          .subscribe();
      } catch (_) {}
    }

    return () => {
      unsub();
      if (supabase && channel) {
        try {
          supabase.removeChannel(channel);
        } catch (_) {}
      }
    };
  }, [selectedTicker, companyFinancials]);

  // Lista unificada de todos los activos disponibles
  const allAssets = useMemo(() => {
    const btlPrice = marketState?.current_price || 10.0;
    const btlChange = Number((((btlPrice - 10.0) / 10.0) * 100).toFixed(2));

    const btlAsset: ParodyStock = {
      ticker: 'BTLN',
      name: 'Fondo Botellón',
      parodyOf: 'Índice colectivo',
      slogan: 'Tesorería central de la clase y holding de recreo',
      sector: 'Holding central',
      price: btlPrice,
      change24h: btlChange,
      volume: marketState?.total_volume || 0,
      accentColor: '#10b981',
      iconType: 'wine',
    };

    return [btlAsset, ...parodyStocks];
  }, [marketState, parodyStocks]);

  // Activo seleccionado
  const activeAsset = useMemo(() => {
    return allAssets.find((a) => a.ticker === selectedTicker) || allAssets[0];
  }, [allAssets, selectedTicker]);

  // Tenencia del activo seleccionado
  const currentHolding = useMemo(() => {
    const h = userHoldings[selectedTicker] || {
      ticker: selectedTicker,
      shares: 0,
      averagePrice: 0,
      totalInvested: 0,
    };
    const currentVal = h.shares * activeAsset.price;
    const diff = h.totalInvested > 0 ? currentVal - h.totalInvested : 0;
    const diffPct = h.totalInvested > 0 ? (diff / h.totalInvested) * 100 : 0;

    return {
      ticker: selectedTicker,
      shares: h.shares,
      averagePrice: h.averagePrice,
      totalInvested: h.totalInvested,
      currentValue: Math.round(currentVal),
      profitCoins: Math.round(diff),
      profitPercent: Number(diffPct.toFixed(1)),
    };
  }, [selectedTicker, userHoldings, activeAsset.price]);

  // Valor total del portfolio
  const totalPortfolioValue = useMemo(() => {
    let total = 0;
    allAssets.forEach((asset) => {
      const h = userHoldings[asset.ticker];
      if (h && h.shares > 0) {
        total += h.shares * asset.price;
      }
    });
    return Math.round(total);
  }, [allAssets, userHoldings]);

  // Sentimiento de mercado
  const marketSentiment = useMemo(() => {
    return calculateMarketSentiment(transactions);
  }, [transactions]);

  // Puntos filtrados para la gráfica
  const filteredHistory = useMemo(() => {
    if (priceHistory.length === 0) return [];
    if (timeFilter === 'ALL') return priceHistory;

    const now = Date.now();
    const msMap = {
      '1H': 60 * 60 * 1000,
      '6H': 6 * 60 * 60 * 1000,
      '24H': 24 * 60 * 60 * 1000,
    };
    const cutoff = now - msMap[timeFilter];
    const filtered = priceHistory.filter((p) => new Date(p.created_at).getTime() >= cutoff);
    return filtered.length >= 2 ? filtered : priceHistory.slice(-20);
  }, [priceHistory, timeFilter]);

  // Escala y datos de trazado SVG
  const { minPrice, maxPrice, isPriceUp, chartData } = useMemo(() => {
    const assetPrice = activeAsset.price;
    const prices = filteredHistory.map((p) => p.price);

    let min = prices.length > 0 ? Math.min(...prices, assetPrice) : assetPrice * 0.95;
    let max = prices.length > 0 ? Math.max(...prices, assetPrice) : assetPrice * 1.05;

    if (min === max) {
      min *= 0.95;
      max *= 1.05;
    }
    const padding = (max - min) * 0.12;
    min = Math.max(0.5, min - padding);
    max = max + padding;

    const firstP = filteredHistory[0]?.price || assetPrice;
    const lastP = filteredHistory[filteredHistory.length - 1]?.price || assetPrice;
    const isUp = lastP >= firstP;

    if (filteredHistory.length === 0) {
      return { minPrice: min, maxPrice: max, isPriceUp: true, chartData: { line: '', area: '', points: [] } };
    }

    const width = 600;
    const height = 180;
    const pts = filteredHistory.map((p, idx) => {
      const x = (idx / Math.max(1, filteredHistory.length - 1)) * (width - 40) + 20;
      const normalizedY = (p.price - min) / (max - min);
      const y = height - (normalizedY * (height - 40) + 20);
      const diffFromStart = Number((((p.price - firstP) / firstP) * 100).toFixed(1));

      return {
        x: Math.round(x),
        y: Math.round(y),
        price: p.price,
        time: new Date(p.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        description: p.event_description,
        player: p.player_username,
        triggerType: p.trigger_type,
        changePct: diffFromStart,
      };
    });

    const linePath = pts.reduce((acc, curr, idx) => {
      return idx === 0 ? `M ${curr.x} ${curr.y}` : `${acc} L ${curr.x} ${curr.y}`;
    }, '');

    const areaPath = pts.length > 0
      ? `${linePath} L ${pts[pts.length - 1].x} ${height} L ${pts[0].x} ${height} Z`
      : '';

    return {
      minPrice: min,
      maxPrice: max,
      isPriceUp: isUp,
      chartData: { line: linePath, area: areaPath, points: pts },
    };
  }, [filteredHistory, activeAsset.price]);

  // Cálculos de la orden
  const inputNumeric = parseFloat(tradeAmountInput) || 0;
  const estimatedShares = useMemo(() => {
    if (activeAsset.price <= 0 || inputNumeric <= 0) return 0;
    return Number((inputNumeric / activeAsset.price).toFixed(2));
  }, [inputNumeric, activeAsset.price]);

  const estimatedCoins = useMemo(() => {
    if (activeAsset.price <= 0 || inputNumeric <= 0) return { gross: 0, fee: 0, net: 0 };
    const gross = Math.round(inputNumeric * activeAsset.price);
    const fee = Math.max(1, Math.round(gross * 0.02));
    const net = Math.max(0, gross - fee);
    return { gross, fee, net };
  }, [inputNumeric, activeAsset.price]);

  // Ejecución de la orden de compra o venta
  const handleExecuteTrade = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!userId && onRequireAuth) {
      onRequireAuth();
      return;
    }

    if (cooldownSeconds > 0) {
      setFeedback({ type: 'error', message: `Espera ${cooldownSeconds}s para volver a operar.` });
      return;
    }

    setIsSubmitting(true);
    setFeedback(null);
    sound.tap();

    try {
      const realUsername = username || 'Alumno';

      if (tradeMode === 'buy') {
        if (inputNumeric < 10) throw new Error('La inversión mínima es de 10 monedas.');
        if (inputNumeric > userCoins) throw new Error('Saldo insuficiente.');

        const res = await tradeStock(selectedTicker, 'buy', inputNumeric, realUsername, userId);
        if (!res.success) throw new Error(res.message);

        setFeedback({ type: 'success', message: res.message });
        if (onUpdateCoins) onUpdateCoins(-inputNumeric);
      } else {
        if (inputNumeric <= 0) throw new Error('Indica cuántas acciones vender.');
        if (inputNumeric > currentHolding.shares) throw new Error('No posees suficientes acciones.');

        const res = await tradeStock(selectedTicker, 'sell', inputNumeric, realUsername, userId);
        if (!res.success) throw new Error(res.message);

        setFeedback({ type: 'success', message: res.message });
        if (onUpdateCoins && res.coins_received) onUpdateCoins(res.coins_received);
      }

      setCooldownSeconds(30);
      loadData();
    } catch (err: any) {
      setFeedback({ type: 'error', message: err?.message || 'Error al procesar la orden.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Refresco manual del mercado
  const handleManualRefresh = async () => {
    setIsRefreshing(true);
    sound.tap();
    try {
      await triggerMarketTick();
      await loadData();
    } catch (_) {}
    setIsRefreshing(false);
  };

  return (
    <div className="space-y-4 max-w-5xl mx-auto select-none">
      {/* 1. BARRA SUPERIOR: SELECTOR DE ACTIVOS (SCROLL HORIZONTAL OPTIMIZADO PARA MÓVILES) */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none touch-pan-x">
        {allAssets.map((asset) => {
          const isSelected = asset.ticker === selectedTicker;
          const isGlow = glowingTicker === asset.ticker;
          const isUp = asset.change24h >= 0;

          return (
            <button
              key={asset.ticker}
              type="button"
              onClick={() => {
                setSelectedTicker(asset.ticker);
                setFeedback(null);
                sound.tap();
              }}
              className={`px-3.5 py-2 rounded-xl border flex items-center gap-2.5 shrink-0 transition-all cursor-pointer text-left ${
                isSelected
                  ? 'bg-surface-raised border-foreground/40 shadow-xs'
                  : 'bg-surface hover:bg-surface-raised/70 border-border/70 text-foreground-muted'
              } ${isGlow ? 'ring-2 ring-emerald-500/50' : ''}`}
            >
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="font-mono font-bold text-xs text-foreground tracking-tight">
                    ${asset.ticker}
                  </span>
                  {asset.ticker === 'BTLN' && (
                    <span className="px-1 py-0.2 rounded text-[9px] font-semibold bg-emerald-500/15 text-emerald-400 border border-emerald-500/20">
                      HOLDING
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-1.5 font-mono text-[11px]">
                  <span className="font-semibold text-foreground">
                    {asset.price.toFixed(2)} 🪙
                  </span>
                  <span className={`text-[10px] ${isUp ? 'text-emerald-500' : 'text-rose-500'}`}>
                    {isUp ? '+' : ''}{asset.change24h.toFixed(1)}%
                  </span>
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {/* NOTIFICACIÓN FLOTANTE DE MOVIMIENTO EN VIVO */}
      {recentLiveNotification && (
        <div className="p-2.5 rounded-xl bg-surface-raised/90 border border-border flex items-center justify-between text-xs animate-in fade-in slide-in-from-top-1 duration-200">
          <div className="flex items-center gap-2 min-w-0">
            <span className={`w-2 h-2 rounded-full shrink-0 ${recentLiveNotification.type === 'buy' ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'}`} />
            <span className="text-foreground truncate">
              <strong>@{recentLiveNotification.username}</strong>{' '}
              {recentLiveNotification.type === 'buy' ? 'compró' : 'vendió'}{' '}
              {recentLiveNotification.coins.toLocaleString()} 🪙 de ${recentLiveNotification.ticker}
            </span>
          </div>
          <span className={`font-mono font-semibold text-[11px] shrink-0 ${recentLiveNotification.type === 'buy' ? 'text-emerald-500' : 'text-rose-500'}`}>
            {recentLiveNotification.type === 'buy' ? '+' : ''}{recentLiveNotification.impact.toFixed(1)}%
          </span>
        </div>
      )}

      {/* 2. CABECERA DEL ACTIVO + RESUMEN DE COTIZACIÓN */}
      <div className="p-4 sm:p-5 rounded-2xl bg-surface border border-border space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="space-y-0.5">
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-foreground tracking-tight">
                {activeAsset.name}
              </h2>
              <span className="px-2 py-0.5 rounded-md bg-surface-raised border border-border font-mono text-xs font-semibold text-foreground-muted">
                ${activeAsset.ticker}
              </span>
            </div>
            <p className="text-xs text-foreground-muted">
              {activeAsset.slogan}
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="text-right">
              <div className="font-mono font-bold text-2xl text-foreground tracking-tight">
                {activeAsset.price.toFixed(2)}{' '}
                <span className="text-xs font-normal text-foreground-subtle">🪙</span>
              </div>
              <div className="flex items-center justify-end gap-1 font-mono text-xs">
                <span className={`font-semibold ${isPriceUp ? 'text-emerald-500' : 'text-rose-500'}`}>
                  {isPriceUp ? '+' : ''}{activeAsset.change24h.toFixed(2)}%
                </span>
                <span className="text-foreground-subtle">24h</span>
              </div>
            </div>

            <button
              type="button"
              onClick={handleManualRefresh}
              disabled={isRefreshing}
              className="w-9 h-9 rounded-xl bg-surface-raised border border-border text-foreground-muted hover:text-foreground flex items-center justify-center transition-colors cursor-pointer"
              title="Refrescar cotización"
            >
              <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* 3. GRÁFICA SINCRONIZADA INTERACTIVA */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs">
            {/* Tooltip en hover sobre la curva */}
            <div className="text-xs font-mono min-h-[1.25rem]">
              {hoveredPoint ? (
                <span className="text-foreground flex items-center gap-1.5">
                  <span className="font-bold">{hoveredPoint.price.toFixed(2)} 🪙</span>
                  <span className="text-foreground-subtle">({hoveredPoint.time})</span>
                  {hoveredPoint.player && (
                    <span className="text-foreground-muted font-sans font-medium text-[11px]">
                      · @{hoveredPoint.player}
                    </span>
                  )}
                </span>
              ) : (
                <span className="text-foreground-subtle text-[11px]">
                  Pasa el ratón sobre los puntos para ver transacciones
                </span>
              )}
            </div>

            {/* Selector de periodo */}
            <div className="flex items-center gap-1 p-0.5 rounded-lg bg-surface-raised border border-border/80 text-[11px] font-mono">
              {(['1H', '6H', '24H', 'ALL'] as const).map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => {
                    setTimeFilter(r);
                    sound.tap();
                  }}
                  className={`px-2 py-0.5 rounded-md transition-colors cursor-pointer ${
                    timeFilter === r
                      ? 'bg-foreground text-background font-semibold'
                      : 'text-foreground-muted hover:text-foreground'
                  }`}
                >
                  {r === 'ALL' ? 'Todo' : r}
                </button>
              ))}
            </div>
          </div>

          <div className="relative w-full h-44 sm:h-52 bg-surface-raised/40 rounded-xl p-2 border border-border/60 overflow-hidden">
            <svg
              viewBox="0 0 600 180"
              className="w-full h-full overflow-visible"
              preserveAspectRatio="none"
            >
              <defs>
                <linearGradient id="titaniumGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="currentColor" stopOpacity="0.12" />
                  <stop offset="100%" stopColor="currentColor" stopOpacity="0.0" />
                </linearGradient>
              </defs>

              {/* Guías horizontales de escala */}
              <line x1="14" y1="20" x2="586" y2="20" stroke="currentColor" strokeOpacity="0.06" strokeDasharray="3 3" />
              <line x1="14" y1="90" x2="586" y2="90" stroke="currentColor" strokeOpacity="0.06" strokeDasharray="3 3" />
              <line x1="14" y1="160" x2="586" y2="160" stroke="currentColor" strokeOpacity="0.06" strokeDasharray="3 3" />

              {/* Área y Línea continua */}
              {chartData.area && <path d={chartData.area} fill="url(#titaniumGrad)" className="text-foreground" />}
              {chartData.line && (
                <path
                  d={chartData.line}
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className={isPriceUp ? 'text-emerald-500' : 'text-rose-500'}
                />
              )}

              {/* Puntos interactivos con información de jugadores */}
              {chartData.points.map((pt, idx) => {
                const isLast = idx === chartData.points.length - 1;
                const hasPlayer = !!pt.player;
                const isBuy = pt.triggerType === 'buy';

                return (
                  <circle
                    key={idx}
                    cx={pt.x}
                    cy={pt.y}
                    r={isLast ? 4 : hasPlayer ? 3 : 2}
                    className={`transition-all cursor-pointer ${
                      isLast
                        ? 'fill-foreground stroke-background stroke-2'
                        : hasPlayer
                        ? isBuy
                          ? 'fill-emerald-500 stroke-background stroke-1'
                          : 'fill-rose-500 stroke-background stroke-1'
                        : 'fill-transparent hover:fill-foreground'
                    }`}
                    onMouseEnter={() =>
                      setHoveredPoint({
                        price: pt.price,
                        time: pt.time,
                        description: pt.description,
                        player: pt.player,
                        changePct: pt.changePct,
                      })
                    }
                    onMouseLeave={() => setHoveredPoint(null)}
                  />
                );
              })}
            </svg>

            {/* Referencias Mín y Máx */}
            <div className="absolute top-2 right-2.5 text-[10px] font-mono text-foreground-subtle bg-surface/80 px-1.5 py-0.5 rounded border border-border/40">
              Máx: {maxPrice.toFixed(2)}
            </div>
            <div className="absolute bottom-2 right-2.5 text-[10px] font-mono text-foreground-subtle bg-surface/80 px-1.5 py-0.5 rounded border border-border/40">
              Mín: {minPrice.toFixed(2)}
            </div>
          </div>
        </div>

        {/* 4. PRESIÓN DE MERCADO EN VIVO (COMPRAS VS VENTAS) */}
        <div className="pt-2 border-t border-border/50 space-y-1.5">
          <div className="flex items-center justify-between text-xs">
            <span className="flex items-center gap-1.5 font-medium text-foreground-muted text-[11px]">
              <Activity className="w-3.5 h-3.5 text-accent" />
              Presión de mercado en vivo
            </span>
            <div className="flex items-center gap-2 font-mono text-[11px]">
              <span className="text-emerald-500 font-semibold">{marketSentiment.buyPercentage}% Compras</span>
              <span className="text-foreground-subtle">/</span>
              <span className="text-rose-500 font-semibold">{100 - marketSentiment.buyPercentage}% Ventas</span>
            </div>
          </div>
          <div className="w-full h-1.5 rounded-full bg-surface-raised border border-border/40 overflow-hidden flex">
            <div
              className="h-full bg-emerald-500 transition-all duration-300 rounded-l-full"
              style={{ width: `${marketSentiment.buyPercentage}%` }}
            />
          </div>
        </div>
      </div>

      {/* 5. GRID PRINCIPAL: PANEL DE OPERACIÓN (IZQUIERDA) Y PESTAÑAS ESTRATÉGICAS (DERECHA) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* PANEL DE OPERACIÓN (COMPRAR / VENDER) */}
        <div className="p-4 sm:p-5 rounded-2xl bg-surface border border-border space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-foreground">
              Operar en ${activeAsset.ticker}
            </h3>

            <div className="flex items-center p-0.5 rounded-lg bg-surface-raised border border-border text-xs">
              <button
                type="button"
                onClick={() => {
                  setTradeMode('buy');
                  setFeedback(null);
                  sound.tap();
                }}
                className={`px-3 py-1 rounded-md font-medium transition-colors cursor-pointer ${
                  tradeMode === 'buy'
                    ? 'bg-foreground text-background font-semibold shadow-xs'
                    : 'text-foreground-muted hover:text-foreground'
                }`}
              >
                Comprar
              </button>
              <button
                type="button"
                onClick={() => {
                  setTradeMode('sell');
                  setFeedback(null);
                  sound.tap();
                }}
                className={`px-3 py-1 rounded-md font-medium transition-colors cursor-pointer ${
                  tradeMode === 'sell'
                    ? 'bg-foreground text-background font-semibold shadow-xs'
                    : 'text-foreground-muted hover:text-foreground'
                }`}
              >
                Vender
              </button>
            </div>
          </div>

          {feedback && (
            <div
              className={`p-3 rounded-xl text-xs flex items-center gap-2 border ${
                feedback.type === 'success'
                  ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                  : 'bg-rose-500/10 border-rose-500/20 text-rose-400'
              }`}
            >
              {feedback.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 shrink-0" />
              )}
              <span>{feedback.message}</span>
            </div>
          )}

          {cooldownSeconds > 0 && (
            <div className="p-2.5 rounded-xl bg-surface-raised border border-border text-xs text-foreground-muted flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-foreground-subtle" />
                Enfriamiento entre órdenes:
              </span>
              <span className="font-mono font-semibold text-foreground">{cooldownSeconds}s</span>
            </div>
          )}

          <form onSubmit={handleExecuteTrade} className="space-y-3">
            <div className="space-y-1">
              <div className="flex items-center justify-between text-xs text-foreground-muted">
                <span>{tradeMode === 'buy' ? 'Monedas a invertir' : 'Acciones a vender'}</span>
                <span className="font-mono text-[11px]">
                  {tradeMode === 'buy'
                    ? `Saldo: ${userCoins.toLocaleString()} 🪙`
                    : `Tienes: ${currentHolding.shares.toFixed(2)} acc.`}
                </span>
              </div>

              <div className="relative">
                <input
                  type="number"
                  step={tradeMode === 'buy' ? '1' : '0.01'}
                  min="1"
                  value={tradeAmountInput}
                  onChange={(e) => setTradeAmountInput(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-surface-raised border border-border text-foreground font-mono font-bold text-sm focus:outline-hidden focus:border-foreground/50 transition-colors"
                  placeholder={tradeMode === 'buy' ? '50' : '1.00'}
                />
                <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-medium text-foreground-subtle">
                  {tradeMode === 'buy' ? 'monedas' : 'acciones'}
                </span>
              </div>

              {/* Botones rápidos */}
              <div className="flex items-center gap-1.5 pt-1">
                {tradeMode === 'buy' ? (
                  <>
                    {[50, 150, 500].map((amt) => (
                      <button
                        key={amt}
                        type="button"
                        onClick={() => {
                          setTradeAmountInput(String(amt));
                          sound.tap();
                        }}
                        className="flex-1 py-1 rounded-lg text-xs font-medium bg-surface-raised border border-border text-foreground-muted hover:text-foreground transition-colors cursor-pointer"
                      >
                        +{amt}
                      </button>
                    ))}
                    <button
                      type="button"
                      onClick={() => {
                        setTradeAmountInput(String(Math.min(userCoins, 25000)));
                        sound.tap();
                      }}
                      className="px-3 py-1 rounded-lg text-xs font-medium bg-surface-raised border border-border text-foreground hover:text-foreground transition-colors cursor-pointer"
                    >
                      Máx
                    </button>
                  </>
                ) : (
                  <>
                    {[0.25, 0.5, 0.75].map((pct) => (
                      <button
                        key={pct}
                        type="button"
                        onClick={() => {
                          setTradeAmountInput((currentHolding.shares * pct).toFixed(2));
                          sound.tap();
                        }}
                        className="flex-1 py-1 rounded-lg text-xs font-medium bg-surface-raised border border-border text-foreground-muted hover:text-foreground transition-colors cursor-pointer"
                      >
                        {pct * 100}%
                      </button>
                    ))}
                    <button
                      type="button"
                      onClick={() => {
                        setTradeAmountInput(currentHolding.shares.toFixed(2));
                        sound.tap();
                      }}
                      className="px-3 py-1 rounded-lg text-xs font-medium bg-surface-raised border border-border text-foreground hover:text-foreground transition-colors cursor-pointer"
                    >
                      Todo
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* Resumen de orden */}
            <div className="p-3 rounded-xl bg-surface-raised/60 border border-border text-xs space-y-1 text-foreground-muted">
              {tradeMode === 'buy' ? (
                <div className="flex items-center justify-between">
                  <span>Acciones estimadas a recibir:</span>
                  <span className="font-mono font-medium text-foreground">
                    ~{estimatedShares} acc.
                  </span>
                </div>
              ) : (
                <>
                  <div className="flex items-center justify-between">
                    <span>Importe bruto:</span>
                    <span className="font-mono text-foreground">{estimatedCoins.gross} 🪙</span>
                  </div>
                  <div className="flex items-center justify-between text-foreground-subtle text-[11px]">
                    <span>Comisión para tesorería (2%):</span>
                    <span className="font-mono">-{estimatedCoins.fee} 🪙</span>
                  </div>
                  <div className="flex items-center justify-between pt-1 border-t border-border/40 font-medium text-foreground">
                    <span>Recibirás neto:</span>
                    <span className="font-mono text-emerald-500 font-bold">
                      +{estimatedCoins.net} 🪙
                    </span>
                  </div>
                </>
              )}
            </div>

            <button
              type="submit"
              disabled={
                isSubmitting ||
                cooldownSeconds > 0 ||
                (tradeMode === 'buy' && (inputNumeric < 10 || inputNumeric > userCoins)) ||
                (tradeMode === 'sell' && (inputNumeric <= 0 || inputNumeric > currentHolding.shares))
              }
              className="w-full py-2.5 rounded-xl font-medium text-xs text-background bg-foreground hover:opacity-90 transition-opacity cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-1.5"
            >
              {isSubmitting ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Procesando en Supabase...</span>
                </>
              ) : tradeMode === 'buy' ? (
                `Comprar por ${Math.round(inputNumeric)} monedas`
              ) : (
                `Vender y cobrar +${estimatedCoins.net} monedas`
              )}
            </button>
          </form>

          {/* Posición actual del usuario */}
          <div className="p-3 rounded-xl bg-surface-raised/40 border border-border/60 text-xs space-y-1.5">
            <div className="text-[11px] font-semibold text-foreground-muted uppercase tracking-wider">
              Tu posición en ${activeAsset.ticker}
            </div>
            <div className="grid grid-cols-3 gap-2 font-mono text-[11px]">
              <div>
                <span className="text-foreground-subtle block text-[10px]">Acciones</span>
                <span className="font-semibold text-foreground">{currentHolding.shares.toFixed(2)}</span>
              </div>
              <div>
                <span className="text-foreground-subtle block text-[10px]">Valor</span>
                <span className="font-semibold text-foreground">{currentHolding.currentValue} 🪙</span>
              </div>
              <div>
                <span className="text-foreground-subtle block text-[10px]">Rendimiento</span>
                <span className={`font-semibold ${currentHolding.profitPercent >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                  {currentHolding.profitPercent >= 0 ? '+' : ''}{currentHolding.profitPercent}%
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* PESTAÑAS ESTRATÉGICAS (DERECHA): CINTA DE MERCADO / LIBRO DE ACCIONISTAS / BALANCE DE EMPRESA */}
        <div className="p-4 sm:p-5 rounded-2xl bg-surface border border-border space-y-3 flex flex-col">
          {/* Navegación entre vistas */}
          <div className="flex items-center p-1 rounded-xl bg-surface-raised border border-border text-xs">
            <button
              type="button"
              onClick={() => {
                setViewTab('tape');
                sound.tap();
              }}
              className={`flex-1 py-1.5 rounded-lg font-medium transition-colors cursor-pointer text-center ${
                viewTab === 'tape'
                  ? 'bg-foreground text-background font-semibold shadow-xs'
                  : 'text-foreground-muted hover:text-foreground'
              }`}
            >
              Cinta en Vivo
            </button>
            <button
              type="button"
              onClick={() => {
                setViewTab('shareholders');
                sound.tap();
              }}
              className={`flex-1 py-1.5 rounded-lg font-medium transition-colors cursor-pointer text-center ${
                viewTab === 'shareholders'
                  ? 'bg-foreground text-background font-semibold shadow-xs'
                  : 'text-foreground-muted hover:text-foreground'
              }`}
            >
              Accionistas
            </button>
            <button
              type="button"
              onClick={() => {
                setViewTab('balance');
                sound.tap();
              }}
              className={`flex-1 py-1.5 rounded-lg font-medium transition-colors cursor-pointer text-center ${
                viewTab === 'balance'
                  ? 'bg-foreground text-background font-semibold shadow-xs'
                  : 'text-foreground-muted hover:text-foreground'
              }`}
            >
              Tesorería
            </button>
          </div>

          {/* VISTA 1: CINTA DE MERCADO EN VIVO */}
          {viewTab === 'tape' && (
            <div className="space-y-2 flex-1">
              <div className="flex items-center justify-between text-[11px] text-foreground-subtle">
                <span>Operaciones recientes de compañeros</span>
                <span className="font-mono">{transactions.length} regs.</span>
              </div>

              {transactions.length === 0 ? (
                <div className="py-8 text-center text-xs text-foreground-subtle border border-dashed border-border/80 rounded-xl">
                  Aún no hay operaciones registradas. Sé el primero.
                </div>
              ) : (
                <div className="space-y-1.5 max-h-72 overflow-y-auto pr-1 scrollbar-none">
                  {transactions.slice(0, 15).map((tx) => {
                    const isBuy = tx.type === 'buy';
                    const isWhale = tx.coins_amount >= 1000;

                    return (
                      <div
                        key={tx.id}
                        className={`p-2 rounded-xl bg-surface-raised/60 border border-border/70 flex items-center justify-between text-xs ${
                          isWhale ? 'ring-1 ring-amber-500/30' : ''
                        }`}
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${isBuy ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                              <span className="font-medium text-foreground truncate">
                                @{tx.username}
                              </span>
                              <span className="text-[10px] font-mono text-foreground-subtle">
                                ${tx.ticker}
                              </span>
                              {isWhale && (
                                <span className="px-1 py-0.2 rounded text-[9px] font-bold bg-amber-500/15 text-amber-400 border border-amber-500/20">
                                  BALLENA
                                </span>
                              )}
                            </div>
                            <span className="text-[10px] text-foreground-subtle">
                              {new Date(tx.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                        </div>

                        <div className="text-right font-mono text-[11px]">
                          <span className={`font-semibold ${isBuy ? 'text-emerald-500' : 'text-rose-500'}`}>
                            {isBuy ? '+' : '-'}{tx.coins_amount.toLocaleString()} 🪙
                          </span>
                          <span className="text-[10px] text-foreground-subtle block">
                            {tx.shares_amount.toFixed(2)} acc.
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* VISTA 2: LIBRO DE ACCIONISTAS (CAP TABLE ESTRATÉGICA) */}
          {viewTab === 'shareholders' && (
            <div className="space-y-2 flex-1">
              <div className="flex items-center justify-between text-[11px] text-foreground-subtle">
                <span>Mayores accionistas de ${activeAsset.ticker}</span>
                <span>% Empresa</span>
              </div>

              {shareholders.length === 0 ? (
                <div className="py-8 text-center text-xs text-foreground-subtle border border-dashed border-border/80 rounded-xl">
                  No hay participaciones acumuladas en este activo todavía.
                </div>
              ) : (
                <div className="space-y-1.5 max-h-72 overflow-y-auto pr-1 scrollbar-none">
                  {shareholders.map((sh, idx) => (
                    <div
                      key={sh.user_id || idx}
                      className="p-2 rounded-xl bg-surface-raised/60 border border-border/70 flex items-center justify-between text-xs"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="w-5 h-5 rounded-md bg-surface border border-border font-mono font-bold text-[10px] flex items-center justify-center text-foreground-subtle">
                          #{idx + 1}
                        </span>
                        <div className="min-w-0">
                          <span className="font-semibold text-foreground truncate block">
                            @{sh.username}
                          </span>
                          <span className="text-[10px] font-mono text-foreground-subtle">
                            {sh.shares.toFixed(2)} acciones
                          </span>
                        </div>
                      </div>

                      <div className="text-right font-mono text-[11px]">
                        <span className="font-bold text-foreground">
                          {sh.ownership_percentage}%
                        </span>
                        <span className="text-[10px] text-foreground-subtle block">
                          ~{sh.position_value.toLocaleString()} 🪙
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* VISTA 3: BALANCE FINANCIERO Y TESORERÍA DE LA EMPRESA */}
          {viewTab === 'balance' && (
            <div className="space-y-3 flex-1">
              <div className="text-[11px] text-foreground-subtle">
                Caja contable y cómo la empresa genera riqueza
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="p-3 rounded-xl bg-surface-raised/70 border border-border/70 space-y-1">
                  <div className="flex items-center gap-1.5 text-foreground-subtle text-[11px]">
                    <Landmark className="w-3.5 h-3.5 text-emerald-500" />
                    <span>Caja Fuerte / Tesorería</span>
                  </div>
                  <div className="font-mono font-bold text-sm text-foreground">
                    {(companyFinancials?.treasury_balance ?? 5000).toLocaleString()} 🪙
                  </div>
                  <p className="text-[10px] text-foreground-subtle">Comisiones y beneficios retenidos</p>
                </div>

                <div className="p-3 rounded-xl bg-surface-raised/70 border border-border/70 space-y-1">
                  <div className="flex items-center gap-1.5 text-foreground-subtle text-[11px]">
                    <TrendingUp className="w-3.5 h-3.5 text-blue-500" />
                    <span>Ingresos Generados</span>
                  </div>
                  <div className="font-mono font-bold text-sm text-emerald-500">
                    +{(companyFinancials?.total_revenue_generated ?? 0).toLocaleString()} 🪙
                  </div>
                  <p className="text-[10px] text-foreground-subtle">Facturación operativa total</p>
                </div>

                <div className="p-3 rounded-xl bg-surface-raised/70 border border-border/70 space-y-1">
                  <div className="flex items-center gap-1.5 text-foreground-subtle text-[11px]">
                    <PiggyBank className="w-3.5 h-3.5 text-amber-500" />
                    <span>Rake del Casino</span>
                  </div>
                  <div className="font-mono font-bold text-sm text-foreground">
                    {(companyFinancials?.arcade_rake_accumulated ?? 0).toLocaleString()} 🪙
                  </div>
                  <p className="text-[10px] text-foreground-subtle">2% aportado por minijuegos</p>
                </div>

                <div className="p-3 rounded-xl bg-surface-raised/70 border border-border/70 space-y-1">
                  <div className="flex items-center gap-1.5 text-foreground-subtle text-[11px]">
                    <PieChart className="w-3.5 h-3.5 text-purple-500" />
                    <span>Valor Liquidativo (NAV)</span>
                  </div>
                  <div className="font-mono font-bold text-sm text-foreground">
                    {(companyFinancials?.nav_per_share ?? 10.0).toFixed(2)} 🪙/acc
                  </div>
                  <p className="text-[10px] text-foreground-subtle">Respaldo real en activos</p>
                </div>
              </div>

              <div className="p-2.5 rounded-xl bg-surface-raised/40 border border-border/60 text-[11px] text-foreground-muted leading-relaxed">
                Cada vez que un jugador vende acciones o juega en el arcade, un porcentaje ingresa directamente en la tesorería de la empresa. A más monedas en caja, mayor es el valor intrínseco de cada acción.
              </div>
            </div>
          )}
        </div>
      </div>

      {/* MODAL TUTORIAL INTERACTIVO */}
      <InvestmentsTutorialModal
        isOpen={isTutorialOpen}
        onClose={() => setIsTutorialOpen(false)}
      />
    </div>
  );
};
