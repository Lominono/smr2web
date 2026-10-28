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
  ChevronRight,
  HelpCircle,
  Activity,
  Zap,
  BarChart2,
  Sparkles,
  Wine,
  User,
  Shield,
  Coins,
} from 'lucide-react';
import { sound } from '@/lib/audio';
import { createClient } from '@/lib/supabase/client';
import {
  MarketState,
  PriceHistoryPoint,
  ParodyStock,
  UserStockHolding,
  InvestmentTransaction,
  MarketSentiment,
} from '@/lib/types';
import {
  fetchMarketState,
  fetchPriceHistory,
  fetchUserPortfolio,
  fetchRecentMarketTrades,
  fetchParodyStocks,
  fetchUserStocksPortfolio,
  investInBotellon,
  withdrawFromBotellon,
  tradeParodyStock,
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
  const [parodyStocks, setParodyStocks] = useState<ParodyStock[]>(DEFAULT_PARODY_STOCKS);
  const [selectedTicker, setSelectedTicker] = useState<string>('ONION');
  const [userHoldings, setUserHoldings] = useState<Record<string, UserStockHolding>>({});

  // Histórico y transacciones globales
  const [priceHistory, setPriceHistory] = useState<PriceHistoryPoint[]>([]);
  const [portfolio, setPortfolio] = useState<{
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
  } | null>(null);
  const [transactions, setTransactions] = useState<InvestmentTransaction[]>([]);

  // Estados UI
  const [tradeMode, setTradeMode] = useState<'buy' | 'sell'>('buy');
  const [timeFilter, setTimeFilter] = useState<'1H' | '6H' | '24H' | 'ALL'>('24H');
  const [tradeAmountInput, setTradeAmountInput] = useState<string>('50');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [cooldownSeconds, setCooldownSeconds] = useState<number>(0);
  const [hoveredPoint, setHoveredPoint] = useState<{ price: number; time: string; changeFromStart: number } | null>(null);

  // Estados de Tiempo Real y Tutorial
  const [isTutorialOpen, setIsTutorialOpen] = useState<boolean>(false);
  const [glowingTicker, setGlowingTicker] = useState<string | null>(null);
  const [recentLiveNotification, setRecentLiveNotification] = useState<{
    username: string;
    type: 'buy' | 'sell';
    ticker: string;
    coins: number;
    time: number;
  } | null>(null);

  // Auto-apertura del tutorial en primera visita
  useEffect(() => {
    try {
      const seen = localStorage.getItem('botellon_investments_tutorial_seen');
      if (!seen) {
        const t = setTimeout(() => {
          setIsTutorialOpen(true);
        }, 800);
        return () => clearTimeout(t);
      }
    } catch (_) {}
  }, []);

  // Carga unificada de datos
  const loadAllData = useCallback(async () => {
    try {
      const [mState, pHistory, port, txs, stocks, holdings] = await Promise.all([
        fetchMarketState(),
        fetchPriceHistory(60, selectedTicker),
        fetchUserPortfolio(),
        fetchRecentMarketTrades(20),
        fetchParodyStocks(),
        fetchUserStocksPortfolio(),
      ]);

      setMarketState(mState);
      setPriceHistory(pHistory);
      setPortfolio(port);
      setTransactions(txs);
      setParodyStocks(stocks);
      setUserHoldings(holdings);

      if (port.cooldown_remaining_seconds > 0) {
        setCooldownSeconds(port.cooldown_remaining_seconds);
      }
    } catch (err) {
      console.warn('Carga de mercado:', err);
    } finally {
      setIsLoading(false);
    }
  }, [selectedTicker]);

  useEffect(() => {
    loadAllData();
  }, [loadAllData, userId]);

  // Actualizar historial al cambiar de activo seleccionado
  useEffect(() => {
    let active = true;
    fetchPriceHistory(60, selectedTicker).then((history) => {
      if (active) setPriceHistory(history);
    });
    return () => {
      active = false;
    };
  }, [selectedTicker]);

  // Cooldown de 60 segundos
  useEffect(() => {
    if (cooldownSeconds <= 0) return;
    const interval = setInterval(() => {
      setCooldownSeconds((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(interval);
  }, [cooldownSeconds]);

  // Suscripción Realtime (BroadcastChannel + Supabase Realtime)
  useEffect(() => {
    // 1. Canal de difusión instantáneo entre pestañas y clientes
    const unsubscribeTrades = subscribeToRealtimeTrades((payload) => {
      if (payload.pricePoint) {
        const pt = payload.pricePoint;
        if (!pt.ticker || pt.ticker === selectedTicker) {
          setPriceHistory((prev) => [...prev.slice(-79), pt]);
        }
      }

      if (payload.transaction) {
        const newTx = payload.transaction;
        setTransactions((prev) => [newTx, ...prev.filter((t) => t.id !== newTx.id)].slice(0, 25));
        setRecentLiveNotification({
          username: newTx.username,
          type: newTx.type,
          ticker: newTx.ticker || 'BTLN',
          coins: newTx.coins_amount,
          time: Date.now(),
        });
        setGlowingTicker(newTx.ticker || 'BTLN');
        setTimeout(() => setGlowingTicker(null), 3000);

        if (!newTx.ticker || newTx.ticker === selectedTicker) {
          fetchPriceHistory(60, selectedTicker).then(setPriceHistory).catch(() => {});
        }
      }

      if (payload.stock) {
        setParodyStocks((prev) =>
          prev.map((s) => (s.ticker === payload.stock!.ticker ? payload.stock! : s))
        );
      }

      if (payload.market) {
        setMarketState(payload.market);
      }
    });

    // 2. Suscripción Postgres Changes para actualizaciones persistentes
    const supabase = createClient();
    let channel: any = null;
    if (supabase) {
      try {
        channel = supabase
          .channel('botellon_market_live_stream')
          .on(
            'postgres_changes',
            { event: '*', schema: 'public', table: 'market_state' },
            (payload) => {
              if (payload.new) {
                const updated = payload.new as any;
                setMarketState((prev) =>
                  prev
                    ? {
                        ...prev,
                        current_price: Number(updated.current_price),
                        total_shares: Number(updated.total_shares),
                        pool_balance: Number(updated.pool_balance),
                        total_volume: Number(updated.total_volume),
                        total_investors: Number(updated.total_investors),
                        updated_at: updated.updated_at,
                      }
                    : null
                );
                if (updated.parody_stocks && typeof updated.parody_stocks === 'object') {
                  fetchParodyStocks().then(setParodyStocks).catch(() => {});
                }
              }
            }
          )
          .on(
            'postgres_changes',
            { event: 'INSERT', schema: 'public', table: 'price_history' },
            (payload) => {
              if (payload.new) {
                const ptTicker = payload.new.ticker || 'BTLN';
                if (ptTicker === selectedTicker) {
                  const newPoint: PriceHistoryPoint = {
                    id: payload.new.id,
                    ticker: ptTicker,
                    price: Number(payload.new.price),
                    pool_balance: Number(payload.new.pool_balance),
                    total_shares: Number(payload.new.total_shares),
                    change_percent: Number(payload.new.change_percent),
                    trigger_type: payload.new.trigger_type,
                    created_at: payload.new.created_at,
                  };
                  setPriceHistory((prev) => [...prev.slice(-79), newPoint]);
                }
              }
            }
          )
          .on(
            'postgres_changes',
            { event: 'INSERT', schema: 'public', table: 'transactions' },
            (payload) => {
              if (payload.new) {
                const newTx: InvestmentTransaction = {
                  id: payload.new.id,
                  user_id: payload.new.user_id,
                  username: payload.new.username || 'Compañero',
                  ticker: payload.new.ticker || 'BTLN',
                  type: payload.new.type as 'buy' | 'sell',
                  coins_amount: Number(payload.new.coins_amount || 0),
                  shares_amount: Number(payload.new.shares_amount || 0),
                  price_per_share: Number(payload.new.price_per_share || 0),
                  fee_coins: Number(payload.new.fee_coins || 0),
                  net_coins: Number(payload.new.net_coins || 0),
                  price_impact_percent: payload.new.type === 'buy' ? 0.9 : -0.7,
                  created_at: payload.new.created_at,
                };

                setTransactions((prev) => [newTx, ...prev.filter((t) => t.id !== newTx.id)].slice(0, 24));
                setRecentLiveNotification({
                  username: newTx.username,
                  type: newTx.type,
                  ticker: newTx.ticker || 'BTLN',
                  coins: newTx.coins_amount,
                  time: Date.now(),
                });
                setGlowingTicker(newTx.ticker || 'BTLN');
                setTimeout(() => setGlowingTicker(null), 3000);
              }
            }
          )
          .subscribe();
      } catch (_) {}
    }

    return () => {
      unsubscribeTrades();
      if (supabase && channel) {
        try {
          supabase.removeChannel(channel);
        } catch (_) {}
      }
    };
  }, [selectedTicker]);

  // Lista combinada de todos los activos disponibles
  const allAssets = useMemo(() => {
    const btlPrice = marketState?.current_price || 10.0;
    const btlChange = Number((((btlPrice - 10.0) / 10.0) * 100).toFixed(2));

    const btlAsset: ParodyStock = {
      ticker: 'BTLN',
      name: 'Fondo Botellón',
      parodyOf: 'Índice colectivo',
      slogan: 'Fondo general compartido y alimentado por las comisiones',
      sector: 'Índice general',
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
    if (selectedTicker === 'BTLN') {
      const shares = portfolio?.shares || 0;
      const avg = portfolio?.average_buy_price || 0;
      const invested = portfolio?.total_invested_coins || 0;
      const currentVal = shares * (marketState?.current_price || 12.5);
      const diff = invested > 0 ? currentVal - invested : 0;
      const diffPct = invested > 0 ? (diff / invested) * 100 : 0;

      return {
        ticker: 'BTLN',
        shares,
        averagePrice: avg,
        totalInvested: invested,
        currentValue: Math.round(currentVal),
        profitCoins: Math.round(diff),
        profitPercent: Number(diffPct.toFixed(1)),
      };
    }

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
  }, [selectedTicker, userHoldings, portfolio, marketState, activeAsset.price]);

  // Valor total del portfolio del usuario
  const totalPortfolioValue = useMemo(() => {
    let total = (portfolio?.shares || 0) * (marketState?.current_price || 12.5);
    parodyStocks.forEach((st) => {
      const h = userHoldings[st.ticker];
      if (h && h.shares > 0) {
        total += h.shares * st.price;
      }
    });
    return Math.round(total);
  }, [portfolio, marketState, parodyStocks, userHoldings]);

  // Métrica de Sentimiento / Presión de mercado
  const marketSentiment = useMemo(() => {
    return calculateMarketSentiment(transactions);
  }, [transactions]);

  // Puntos de la gráfica filtrados
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
    return filtered.length >= 2 ? filtered : priceHistory.slice(-18);
  }, [priceHistory, timeFilter]);

  // Escala para la gráfica con precios reales
  const { minPrice, maxPrice, isPriceUp } = useMemo(() => {
    const assetPrice = activeAsset.price;
    const prices = filteredHistory.map((p) => p.price);

    if (prices.length < 2) {
      return {
        minPrice: Number((assetPrice * 0.95).toFixed(2)),
        maxPrice: Number((assetPrice * 1.05).toFixed(2)),
        isPriceUp: activeAsset.change24h >= 0,
      };
    }

    const min = Math.min(...prices);
    const max = Math.max(...prices);
    const pad = (max - min) * 0.15 || assetPrice * 0.05;

    return {
      minPrice: Math.max(0.1, Number((min - pad).toFixed(2))),
      maxPrice: Number((max + pad).toFixed(2)),
      isPriceUp: activeAsset.change24h >= 0,
    };
  }, [filteredHistory, activeAsset]);

  // Generación SVG de la curva con cotizaciones reales
  const chartData = useMemo(() => {
    if (filteredHistory.length < 2) return { line: '', area: '', points: [] };

    const svgW = 600;
    const svgH = 160;
    const padX = 14;
    const padY = 16;
    const plotW = svgW - padX * 2;
    const plotH = svgH - padY * 2;
    const range = maxPrice - minPrice || 1;
    const firstPrice = filteredHistory[0]?.price || activeAsset.price;

    const points = filteredHistory.map((pt, i) => {
      const realPrice = pt.price;
      const x = padX + (i / (filteredHistory.length - 1)) * plotW;
      const norm = (realPrice - minPrice) / range;
      const y = svgH - padY - Math.max(0, Math.min(1, norm)) * plotH;
      const changeFromStart = firstPrice > 0 ? Number((((realPrice - firstPrice) / firstPrice) * 100).toFixed(2)) : 0;

      return {
        x: Number(x.toFixed(1)),
        y: Number(y.toFixed(1)),
        price: Number(realPrice.toFixed(2)),
        time: pt.created_at,
        changeFromStart,
      };
    });

    const linePath = points.reduce((acc, curr, idx) => {
      return idx === 0 ? `M ${curr.x} ${curr.y}` : `${acc} L ${curr.x} ${curr.y}`;
    }, '');

    const last = points[points.length - 1];
    const first = points[0];
    const areaPath = `${linePath} L ${last.x} ${svgH - padY} L ${first.x} ${svgH - padY} Z`;

    return { line: linePath, area: areaPath, points };
  }, [filteredHistory, activeAsset, minPrice, maxPrice, marketState?.current_price, selectedTicker]);

  // Cálculos de la orden
  const inputNumeric = Math.max(0, parseFloat(tradeAmountInput) || 0);

  const estimatedShares = useMemo(() => {
    if (tradeMode !== 'buy' || inputNumeric <= 0 || activeAsset.price <= 0) return 0;
    return Number((inputNumeric / activeAsset.price).toFixed(2));
  }, [tradeMode, inputNumeric, activeAsset.price]);

  const estimatedCoins = useMemo(() => {
    if (tradeMode !== 'sell' || inputNumeric <= 0 || activeAsset.price <= 0) return { gross: 0, fee: 0, net: 0 };
    const gross = Math.round(inputNumeric * activeAsset.price);
    const fee = Math.max(gross > 0 ? 1 : 0, Math.round(gross * 0.02));
    const net = Math.max(0, gross - fee);
    return { gross, fee, net };
  }, [tradeMode, inputNumeric, activeAsset.price]);

  // Envío de la orden
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

      if (selectedTicker === 'BTLN') {
        if (tradeMode === 'buy') {
          if (inputNumeric < 10) throw new Error('La inversión mínima es de 10 monedas.');
          if (inputNumeric > userCoins) throw new Error('Saldo insuficiente.');

          const res = await investInBotellon(inputNumeric, realUsername, userId);
          if (!res.success) throw new Error(res.message);

          setFeedback({ type: 'success', message: res.message });
          if (onUpdateCoins) onUpdateCoins(-inputNumeric);
        } else {
          if (inputNumeric <= 0) throw new Error('Indica una cantidad de participaciones.');
          if (inputNumeric > currentHolding.shares) throw new Error('No posees suficientes participaciones.');

          const res = await withdrawFromBotellon(inputNumeric, realUsername, userId);
          if (!res.success) throw new Error(res.message);

          setFeedback({ type: 'success', message: res.message });
          if (onUpdateCoins && res.coins_received) onUpdateCoins(res.coins_received);
        }
      } else {
        if (tradeMode === 'buy') {
          if (inputNumeric < 10) throw new Error('La inversión mínima es de 10 monedas.');
          if (inputNumeric > userCoins) throw new Error('Saldo insuficiente.');

          const res = await tradeParodyStock(selectedTicker, 'buy', inputNumeric, userId, realUsername);
          if (!res.success) throw new Error(res.message);

          setFeedback({ type: 'success', message: res.message });
          if (onUpdateCoins) onUpdateCoins(-inputNumeric);
        } else {
          if (inputNumeric <= 0) throw new Error('Indica cuántas acciones vender.');
          if (inputNumeric > currentHolding.shares) throw new Error('No posees suficientes acciones.');

          const res = await tradeParodyStock(selectedTicker, 'sell', inputNumeric, userId, realUsername);
          if (!res.success) throw new Error(res.message);

          setFeedback({ type: 'success', message: res.message });
          if (onUpdateCoins && res.coinsDelta > 0) onUpdateCoins(res.coinsDelta);
        }
      }

      setCooldownSeconds(60);
      loadAllData();
    } catch (err: any) {
      setFeedback({ type: 'error', message: err?.message || 'Error al tramitar la orden.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Refrescar mercado
  const handleManualRefresh = async () => {
    setIsRefreshing(true);
    sound.tap();
    try {
      await triggerMarketTick();
      await loadAllData();
    } catch (_) {
    } finally {
      setIsRefreshing(false);
    }
  };

  return (
    <div className="space-y-4 max-w-5xl mx-auto pb-6">
      {/* 1. TOP BAR: SELECTOR DE ACTIVOS + ACCESO A GUÍA TUTORIAL */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none py-1 px-0.5 touch-pan-x flex-1">
          {allAssets.map((asset) => {
            const isSelected = selectedTicker === asset.ticker;
            const isUp = asset.change24h >= 0;
            const holdingShares = asset.ticker === 'BTLN' ? portfolio?.shares : userHoldings[asset.ticker]?.shares;
            const isGlowing = glowingTicker === asset.ticker;

            return (
              <button
                key={asset.ticker}
                type="button"
                onClick={() => {
                  setSelectedTicker(asset.ticker);
                  setFeedback(null);
                  sound.tap();
                }}
                className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium transition-all shrink-0 cursor-pointer ${
                  isSelected
                    ? 'bg-foreground text-background font-semibold shadow-xs'
                    : isGlowing
                    ? 'bg-emerald-500/20 border-emerald-500/40 text-foreground ring-1 ring-emerald-500/30'
                    : 'bg-surface border border-border text-foreground-muted hover:text-foreground hover:bg-surface-raised'
                }`}
              >
                <span>{asset.name}</span>
                <span className="font-mono text-[11px] opacity-80">
                  {asset.price.toFixed(2)}
                </span>
                {holdingShares && holdingShares > 0 ? (
                  <span className={`w-1.5 h-1.5 rounded-full ${isSelected ? 'bg-emerald-400' : 'bg-emerald-500'}`} />
                ) : null}
              </button>
            );
          })}
        </div>

        {/* Botón ¿Cómo funciona? */}
        <button
          type="button"
          onClick={() => {
            setIsTutorialOpen(true);
            sound.tap();
          }}
          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium bg-surface border border-border text-foreground-muted hover:text-foreground hover:bg-surface-raised transition-colors shrink-0 cursor-pointer active:scale-95"
          title="Abrir tutorial de inversiones"
        >
          <HelpCircle className="w-3.5 h-3.5 text-accent" />
          <span className="hidden sm:inline">¿Cómo funciona?</span>
          <span className="sm:hidden">Guía</span>
        </button>
      </div>

      {/* 2. ALERTA REACTIVA EN TIEMPO REAL CUANDO OTRO JUGADOR OPERA */}
      {recentLiveNotification && Date.now() - recentLiveNotification.time < 8000 && (
        <div className="p-2.5 rounded-xl bg-surface-raised border border-border/80 flex items-center justify-between text-xs animate-in slide-in-from-top-2 duration-200">
          <div className="flex items-center gap-2 min-w-0">
            <span className="relative flex h-2 w-2 shrink-0">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
            </span>
            <span className="text-foreground-muted truncate">
              <strong className="text-foreground">@{recentLiveNotification.username}</strong> acaba de{' '}
              {recentLiveNotification.type === 'buy' ? (
                <span className="text-emerald-500 font-semibold">comprar</span>
              ) : (
                <span className="text-rose-500 font-semibold">vender</span>
              )}{' '}
              {recentLiveNotification.coins}🪙 en <strong className="text-foreground">${recentLiveNotification.ticker}</strong>
            </span>
          </div>
          <span className="text-[10px] text-foreground-subtle font-mono shrink-0 ml-2">hace unos segundos</span>
        </div>
      )}

      {/* 3. FICHA DEL ACTIVO PRINCIPAL + GRÁFICA INTERACTIVA CON SCRUBBER */}
      <div className="p-4 sm:p-5 rounded-2xl bg-surface border border-border space-y-4">
        {/* Cabecera del activo */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-lg sm:text-xl font-bold text-foreground tracking-tight">
                {activeAsset.name}
              </h2>
              <span className="text-xs text-foreground-subtle">
                ({activeAsset.parodyOf})
              </span>
              <span className="px-1.5 py-0.5 rounded text-[10px] uppercase font-mono bg-surface-raised border border-border text-foreground-subtle">
                ${activeAsset.ticker}
              </span>
            </div>
            <p className="text-xs text-foreground-muted mt-0.5">
              {activeAsset.sector} · {activeAsset.slogan}
            </p>
          </div>

          <div className="flex items-baseline sm:flex-col sm:items-end justify-between sm:justify-center">
            <div className="text-2xl sm:text-3xl font-bold font-mono text-foreground tracking-tight">
              {activeAsset.price.toFixed(2)}{' '}
              <span className="text-xs text-foreground-muted font-sans font-normal">monedas</span>
            </div>

            <div className="flex items-center gap-1.5 mt-0.5">
              <span
                className={`text-xs font-mono font-medium flex items-center ${
                  isPriceUp ? 'text-emerald-500' : 'text-rose-500'
                }`}
              >
                {isPriceUp ? (
                  <ArrowUpRight className="w-3.5 h-3.5 inline" />
                ) : (
                  <ArrowDownRight className="w-3.5 h-3.5 inline" />
                )}
                {isPriceUp ? '+' : ''}
                {activeAsset.change24h}%
              </span>

              <button
                type="button"
                onClick={handleManualRefresh}
                disabled={isRefreshing}
                title="Actualizar cotización"
                aria-label="Actualizar cotización"
                className="p-1 rounded-md text-foreground-subtle hover:text-foreground transition-colors cursor-pointer"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </div>
        </div>

        {/* Chip de posición personal en esta empresa (si tiene participaciones) */}
        {currentHolding.shares > 0 && (
          <div className="p-2.5 rounded-xl bg-surface-raised/60 border border-border flex flex-wrap items-center justify-between text-xs gap-2">
            <div className="flex items-center gap-2">
              <Coins className="w-3.5 h-3.5 text-amber-500" />
              <span className="text-foreground-muted">
                Posees <strong className="text-foreground font-mono">{currentHolding.shares.toFixed(2)}</strong> acciones ·
                Valor: <strong className="text-foreground font-mono">{currentHolding.currentValue.toLocaleString()}</strong> monedas
              </span>
            </div>

            <div className="flex items-center gap-1 text-[11px] font-mono">
              <span className="text-foreground-subtle">Rendimiento:</span>
              <span
                className={`font-semibold ${
                  currentHolding.profitCoins >= 0 ? 'text-emerald-500' : 'text-rose-500'
                }`}
              >
                {currentHolding.profitCoins >= 0 ? '+' : ''}
                {currentHolding.profitCoins} monedas ({currentHolding.profitPercent > 0 ? '+' : ''}
                {currentHolding.profitPercent}%)
              </span>
            </div>
          </div>
        )}

        {/* Gráfica interactiva con Scrubber */}
        <div className="space-y-2 pt-2 border-t border-border/50">
          <div className="flex items-center justify-between text-xs">
            <div className="text-foreground-subtle text-[11px]">
              {hoveredPoint ? (
                <div className="flex items-center gap-2">
                  <span className="font-mono text-foreground font-bold text-xs">
                    {hoveredPoint.price.toFixed(2)} monedas
                  </span>
                  <span className={`font-mono ${hoveredPoint.changeFromStart >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                    {hoveredPoint.changeFromStart >= 0 ? '+' : ''}{hoveredPoint.changeFromStart}%
                  </span>
                </div>
              ) : (
                <span>Evolución de cotización</span>
              )}
            </div>

            <div className="flex items-center gap-1 bg-surface-raised p-0.5 rounded-lg border border-border">
              {(['1H', '6H', '24H', 'ALL'] as const).map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => {
                    setTimeFilter(r);
                    sound.tap();
                  }}
                  className={`px-2 py-0.5 rounded-md text-[10px] font-medium transition-colors cursor-pointer ${
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

          <div className="relative w-full h-40 sm:h-48 bg-surface-raised/40 rounded-xl p-2 border border-border/60 overflow-hidden">
            <svg
              viewBox="0 0 600 160"
              className="w-full h-full overflow-visible"
              preserveAspectRatio="none"
            >
              <defs>
                <linearGradient id="fintechChartGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="currentColor" stopOpacity="0.14" />
                  <stop offset="100%" stopColor="currentColor" stopOpacity="0.0" />
                </linearGradient>
              </defs>

              {/* Guías horizontales de escala */}
              <line x1="14" y1="20" x2="586" y2="20" stroke="currentColor" strokeOpacity="0.06" strokeDasharray="3 3" />
              <line x1="14" y1="80" x2="586" y2="80" stroke="currentColor" strokeOpacity="0.06" strokeDasharray="3 3" />
              <line x1="14" y1="140" x2="586" y2="140" stroke="currentColor" strokeOpacity="0.06" strokeDasharray="3 3" />

              {/* Curva y Área rellena */}
              {chartData.area && <path d={chartData.area} fill="url(#fintechChartGrad)" className="text-foreground" />}
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

              {/* Puntos interactivos con scrubber */}
              {chartData.points.map((pt, idx) => {
                const isLast = idx === chartData.points.length - 1;
                return (
                  <circle
                    key={idx}
                    cx={pt.x}
                    cy={pt.y}
                    r={isLast ? 3.5 : 2.5}
                    className={`transition-colors cursor-pointer ${
                      isLast
                        ? 'fill-foreground stroke-background stroke-2'
                        : 'fill-transparent hover:fill-foreground'
                    }`}
                    onMouseEnter={() => setHoveredPoint({ price: pt.price, time: pt.time, changeFromStart: pt.changeFromStart })}
                    onMouseLeave={() => setHoveredPoint(null)}
                  />
                );
              })}
            </svg>

            {/* Marcadores de referencia Mín / Máx */}
            <div className="absolute top-1.5 right-2.5 text-[10px] font-mono text-foreground-subtle bg-surface/70 px-1 rounded">
              Máx: {maxPrice.toFixed(2)}
            </div>
            <div className="absolute bottom-1.5 right-2.5 text-[10px] font-mono text-foreground-subtle bg-surface/70 px-1 rounded">
              Mín: {minPrice.toFixed(2)}
            </div>
          </div>
        </div>

        {/* 4. INDICADOR DE PRESIÓN DE MERCADO (SENTIMIENTO COMPRADOR VS VENDEDOR EN TIEMPO REAL) */}
        <div className="pt-2 border-t border-border/50 space-y-1.5">
          <div className="flex items-center justify-between text-xs">
            <span className="flex items-center gap-1.5 font-medium text-foreground-muted text-[11px]">
              <Activity className="w-3.5 h-3.5 text-accent" />
              Presión de mercado en vivo
            </span>
            <div className="flex items-center gap-2 font-mono text-[11px]">
              {transactions.length === 0 ? (
                <span className="text-foreground-subtle text-[11px]">Esperando primeras operaciones</span>
              ) : (
                <>
                  <span className="text-emerald-500 font-semibold">{marketSentiment.buyPercentage}% Compras</span>
                  <span className="text-foreground-subtle">/</span>
                  <span className="text-rose-500 font-semibold">{100 - marketSentiment.buyPercentage}% Ventas</span>
                </>
              )}
            </div>
          </div>

          {/* Barra de progreso bicolor */}
          <div className="w-full h-1.5 rounded-full bg-surface-raised border border-border/40 overflow-hidden flex">
            {transactions.length === 0 ? (
              <div className="w-full h-full bg-border/40" />
            ) : (
              <div
                className="h-full bg-emerald-500 transition-all duration-300 rounded-l-full"
                style={{ width: `${marketSentiment.buyPercentage}%` }}
              />
            )}
          </div>
        </div>
      </div>

      {/* 5. GRID PRINCIPAL: OPERAR (IZQUIERDA) Y CARTERA / RESUMEN (DERECHA) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* PANEL DE OPERACIÓN */}
        <div className="p-4 sm:p-5 rounded-2xl bg-surface border border-border space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-foreground">
              Operar en {activeAsset.name}
            </h3>

            {/* Alternar Comprar / Vender */}
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

          {/* Feedback de la orden */}
          {feedback && (
            <div
              className={`p-3 rounded-xl text-xs flex items-center gap-2 border ${
                feedback.type === 'success'
                  ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400'
                  : 'bg-rose-500/10 border-rose-500/20 text-rose-600 dark:text-rose-400'
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

          {/* Aviso discreto de cooldown */}
          {cooldownSeconds > 0 && (
            <div className="p-2.5 rounded-xl bg-surface-raised border border-border text-xs text-foreground-muted flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-foreground-subtle" />
                Tiempo de espera entre operaciones:
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
                    ? `Saldo: ${userCoins.toLocaleString()} monedas`
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
                        setTradeAmountInput(String(Math.min(userCoins, 10000)));
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

            {/* Resumen de la orden */}
            <div className="p-3 rounded-xl bg-surface-raised/60 border border-border text-xs space-y-1 text-foreground-muted">
              {tradeMode === 'buy' ? (
                <div className="flex items-center justify-between">
                  <span>Acciones estimadas a recibir:</span>
                  <span className="font-mono font-medium text-foreground">
                    ~{estimatedShares} acciones
                  </span>
                </div>
              ) : (
                <>
                  <div className="flex items-center justify-between">
                    <span>Importe bruto:</span>
                    <span className="font-mono text-foreground">{estimatedCoins.gross} monedas</span>
                  </div>
                  <div className="flex items-center justify-between text-foreground-subtle text-[11px]">
                    <span>Comisión de liquidez (2%):</span>
                    <span className="font-mono">-{estimatedCoins.fee} monedas</span>
                  </div>
                  <div className="flex items-center justify-between pt-1 border-t border-border/40 font-medium text-foreground">
                    <span>Recibirás neto:</span>
                    <span className="font-mono text-emerald-500 font-bold">
                      +{estimatedCoins.net} monedas
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
                  <span>Procesando orden...</span>
                </>
              ) : tradeMode === 'buy' ? (
                `Comprar por ${Math.round(inputNumeric)} monedas`
              ) : (
                `Vender y cobrar +${estimatedCoins.net} monedas`
              )}
            </button>
          </form>
        </div>

        {/* CINTA DE OPERACIONES EN VIVO Y CARTERA */}
        <div className="p-4 sm:p-5 rounded-2xl bg-surface border border-border space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-foreground flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5 text-amber-500" />
              Cinta de mercado en vivo
            </h3>
            <span className="text-[11px] text-foreground-subtle font-mono">
              Patrimonio: {totalPortfolioValue.toLocaleString()} monedas
            </span>
          </div>

          {/* Listado en tiempo real de operaciones de compañeros */}
          <div className="space-y-1.5">
            <div className="text-[11px] font-medium text-foreground-subtle uppercase tracking-wider">
              Últimas compras y ventas de la clase
            </div>

            {transactions.length === 0 ? (
              <p className="text-xs text-foreground-subtle py-4 text-center border border-dashed border-border rounded-xl">
                Aún no hay transacciones en el mercado. Sé el primero en operar.
              </p>
            ) : (
              <div className="space-y-1 max-h-56 overflow-y-auto pr-1">
                {transactions.slice(0, 8).map((tx) => {
                  const isBuy = tx.type === 'buy';
                  return (
                    <div
                      key={tx.id}
                      className="p-2 rounded-xl bg-surface-raised/60 border border-border/80 flex items-center justify-between text-xs"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <span
                          className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                            isBuy ? 'bg-emerald-500' : 'bg-rose-500'
                          }`}
                        />
                        <div className="min-w-0">
                          <span className="font-semibold text-foreground truncate block">
                            @{tx.username}
                          </span>
                          <span className="text-[10px] text-foreground-subtle block font-mono">
                            {isBuy ? 'Compró' : 'Vendió'} en ${tx.ticker || 'BTLN'}
                          </span>
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <span
                          className={`font-mono font-medium ${
                            isBuy ? 'text-emerald-500' : 'text-rose-500'
                          }`}
                        >
                          {isBuy ? '+' : '-'}{tx.coins_amount} monedas
                        </span>
                        <span className="text-[10px] text-foreground-subtle block font-mono">
                          {new Date(tx.created_at).toLocaleTimeString('es-ES', {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Resumen de Mis Inversiones */}
          <div className="pt-2 border-t border-border/50 space-y-1.5">
            <div className="text-[11px] font-medium text-foreground-subtle uppercase tracking-wider">
              Tus participaciones activas
            </div>

            {allAssets.filter((a) => {
              const s = a.ticker === 'BTLN' ? portfolio?.shares : userHoldings[a.ticker]?.shares;
              return s && s > 0;
            }).length === 0 ? (
              <p className="text-xs text-foreground-subtle py-2.5 text-center border border-dashed border-border rounded-xl">
                No tienes participaciones actualmente.
              </p>
            ) : (
              <div className="space-y-1">
                {allAssets
                  .filter((a) => {
                    const s = a.ticker === 'BTLN' ? portfolio?.shares : userHoldings[a.ticker]?.shares;
                    return s && s > 0;
                  })
                  .map((asset) => {
                    const s =
                      asset.ticker === 'BTLN'
                        ? portfolio?.shares || 0
                        : userHoldings[asset.ticker]?.shares || 0;
                    const val = Math.round(s * asset.price);

                    return (
                      <div
                        key={asset.ticker}
                        onClick={() => {
                          setSelectedTicker(asset.ticker);
                          sound.tap();
                        }}
                        className={`p-2 rounded-xl border flex items-center justify-between text-xs transition-colors cursor-pointer ${
                          selectedTicker === asset.ticker
                            ? 'bg-surface-raised border-foreground/30'
                            : 'bg-surface border-border hover:bg-surface-raised/50'
                        }`}
                      >
                        <span className="font-medium text-foreground">{asset.name}</span>
                        <div className="text-right font-mono">
                          <span className="text-foreground font-semibold">{val.toLocaleString()} monedas</span>
                          <span className="text-[10px] text-foreground-subtle block">{s.toFixed(2)} acc.</span>
                        </div>
                      </div>
                    );
                  })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 6. TABLA RESUMEN DE TODAS LAS EMPRESAS COTIZADAS */}
      <div className="p-4 sm:p-5 rounded-2xl bg-surface border border-border space-y-3">
        <h3 className="text-sm font-semibold text-foreground">
          Cotizaciones del mercado
        </h3>

        <div className="divide-y divide-border/50">
          {allAssets.map((asset) => {
            const isSelected = selectedTicker === asset.ticker;
            const isUp = asset.change24h >= 0;
            const shares =
              asset.ticker === 'BTLN'
                ? portfolio?.shares || 0
                : userHoldings[asset.ticker]?.shares || 0;

            return (
              <div
                key={asset.ticker}
                onClick={() => {
                  setSelectedTicker(asset.ticker);
                  sound.tap();
                }}
                className={`py-2.5 px-2 flex items-center justify-between text-xs transition-colors cursor-pointer rounded-lg ${
                  isSelected ? 'bg-surface-raised' : 'hover:bg-surface-raised/40'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div>
                    <div className="font-medium text-foreground flex items-center gap-1.5">
                      <span>{asset.name}</span>
                      <span className="text-[10px] text-foreground-subtle">
                        {asset.parodyOf}
                      </span>
                    </div>
                    <div className="text-[11px] text-foreground-subtle">
                      {asset.sector} {asset.volume > 0 ? `· Vol: ${asset.volume.toLocaleString()} 🪙` : ''}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-4 text-right">
                  {shares > 0 && (
                    <span className="hidden sm:inline text-[11px] text-foreground-muted font-mono">
                      {shares.toFixed(2)} acc.
                    </span>
                  )}

                  <div>
                    <div className="font-mono font-semibold text-foreground">
                      {asset.price.toFixed(2)} monedas
                    </div>
                    <div
                      className={`text-[10px] font-mono ${
                        isUp ? 'text-emerald-500' : 'text-rose-500'
                      }`}
                    >
                      {isUp ? '+' : ''}
                      {asset.change24h}%
                    </div>
                  </div>

                  <ChevronRight className="w-3.5 h-3.5 text-foreground-subtle" />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* MODAL DEL MINI TUTORIAL */}
      <InvestmentsTutorialModal
        isOpen={isTutorialOpen}
        onClose={() => setIsTutorialOpen(false)}
      />
    </div>
  );
};
