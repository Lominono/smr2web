'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
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
  Wallet,
  Building,
} from 'lucide-react';
import { sound } from '@/lib/audio';
import { createClient } from '@/lib/supabase/client';
import {
  MarketState,
  PriceHistoryPoint,
  ParodyStock,
  UserStockHolding,
  InvestmentTransaction,
} from '@/lib/types';
import {
  fetchMarketState,
  fetchPriceHistory,
  fetchUserPortfolio,
  fetchUserTransactions,
  fetchParodyStocks,
  fetchUserStocksPortfolio,
  investInBotellon,
  withdrawFromBotellon,
  tradeParodyStock,
  triggerMarketTick,
  DEFAULT_PARODY_STOCKS,
} from '@/lib/investmentsService';

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

  // Histórico y cartera del fondo general
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
  const [hoveredPoint, setHoveredPoint] = useState<{ price: number; time: string } | null>(null);

  // Carga unificada de datos
  const loadAllData = useCallback(async () => {
    try {
      const [mState, pHistory, port, txs, stocks, holdings] = await Promise.all([
        fetchMarketState(),
        fetchPriceHistory(60),
        fetchUserPortfolio(),
        fetchUserTransactions(10),
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
  }, []);

  useEffect(() => {
    loadAllData();
  }, [loadAllData, userId]);

  // Cooldown de 60 segundos
  useEffect(() => {
    if (cooldownSeconds <= 0) return;
    const interval = setInterval(() => {
      setCooldownSeconds((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(interval);
  }, [cooldownSeconds]);

  // Suscripción Realtime (con control de fallos)
  useEffect(() => {
    const supabase = createClient();
    if (!supabase) return;

    try {
      const channel = supabase
        .channel('botellon_investments_stream')
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
              const newPoint: PriceHistoryPoint = {
                id: payload.new.id,
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
        )
        .subscribe();

      return () => {
        try {
          supabase.removeChannel(channel);
        } catch (_) {}
      };
    } catch (_) {}
  }, []);

  // Lista combinada de todos los activos disponibles
  const allAssets = useMemo(() => {
    const btlPrice = marketState?.current_price || 12.5;
    const btlHolding = portfolio?.shares || 0;

    const btlAsset: ParodyStock = {
      ticker: 'BTLN',
      name: 'Fondo Botellón',
      parodyOf: 'Índice colectivo',
      slogan: 'Fondo global compartido entre todos los jugadores',
      sector: 'Índice general',
      price: btlPrice,
      change24h: 1.5,
      volume: marketState?.total_volume || 25000,
      accentColor: '#10b981',
      iconType: 'wine',
    };

    return [btlAsset, ...parodyStocks];
  }, [marketState, parodyStocks, portfolio]);

  // Activo seleccionado
  const activeAsset = useMemo(() => {
    return allAssets.find((a) => a.ticker === selectedTicker) || allAssets[0];
  }, [allAssets, selectedTicker]);

  // Tenencia del activo seleccionado
  const currentHolding = useMemo(() => {
    if (selectedTicker === 'BTLN') {
      return {
        ticker: 'BTLN',
        shares: portfolio?.shares || 0,
        averagePrice: portfolio?.average_buy_price || 0,
        totalInvested: portfolio?.total_invested_coins || 0,
      };
    }
    return (
      userHoldings[selectedTicker] || {
        ticker: selectedTicker,
        shares: 0,
        averagePrice: 0,
        totalInvested: 0,
      }
    );
  }, [selectedTicker, userHoldings, portfolio]);

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
    return filtered.length >= 2 ? filtered : priceHistory.slice(-16);
  }, [priceHistory, timeFilter]);

  // Escala para la gráfica
  const { minPrice, maxPrice, isPriceUp } = useMemo(() => {
    const assetPrice = activeAsset.price;
    const baseMarketPrice = marketState?.current_price || 12.5;

    const scaledPrices = filteredHistory.map((p) => {
      if (selectedTicker === 'BTLN') return p.price;
      return (p.price / baseMarketPrice) * assetPrice;
    });

    if (scaledPrices.length < 2) {
      return {
        minPrice: Number((assetPrice * 0.95).toFixed(2)),
        maxPrice: Number((assetPrice * 1.05).toFixed(2)),
        isPriceUp: activeAsset.change24h >= 0,
      };
    }

    const min = Math.min(...scaledPrices);
    const max = Math.max(...scaledPrices);
    const pad = (max - min) * 0.15 || assetPrice * 0.05;

    return {
      minPrice: Math.max(0.1, Number((min - pad).toFixed(2))),
      maxPrice: Number((max + pad).toFixed(2)),
      isPriceUp: activeAsset.change24h >= 0,
    };
  }, [filteredHistory, activeAsset, marketState?.current_price, selectedTicker]);

  // SVG de la gráfica
  const chartData = useMemo(() => {
    if (filteredHistory.length < 2) return { line: '', area: '', points: [] };

    const svgW = 540;
    const svgH = 150;
    const padX = 12;
    const padY = 14;
    const plotW = svgW - padX * 2;
    const plotH = svgH - padY * 2;
    const range = maxPrice - minPrice || 1;
    const assetPrice = activeAsset.price;
    const baseMarketPrice = marketState?.current_price || 12.5;

    const points = filteredHistory.map((pt, i) => {
      const scaledPrice =
        selectedTicker === 'BTLN' ? pt.price : (pt.price / baseMarketPrice) * assetPrice;
      const x = padX + (i / (filteredHistory.length - 1)) * plotW;
      const norm = (scaledPrice - minPrice) / range;
      const y = svgH - padY - Math.max(0, Math.min(1, norm)) * plotH;
      return {
        x: Number(x.toFixed(1)),
        y: Number(y.toFixed(1)),
        price: Number(scaledPrice.toFixed(2)),
        time: pt.created_at,
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

  // En compra: estimar acciones que recibirá
  const estimatedShares = useMemo(() => {
    if (tradeMode !== 'buy' || inputNumeric <= 0 || activeAsset.price <= 0) return 0;
    return Number((inputNumeric / activeAsset.price).toFixed(2));
  }, [tradeMode, inputNumeric, activeAsset.price]);

  // En venta: estimar monedas que recibirá tras comisión del 2%
  const estimatedCoins = useMemo(() => {
    if (tradeMode !== 'sell' || inputNumeric <= 0 || activeAsset.price <= 0) return { gross: 0, fee: 0, net: 0 };
    const gross = Math.round(inputNumeric * activeAsset.price);
    const fee = Math.max(gross > 0 ? 1 : 0, Math.round(gross * 0.02));
    const net = Math.max(0, gross - fee);
    return { gross, fee, net };
  }, [tradeMode, inputNumeric, activeAsset.price]);

  // Ejecución de la operación
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
      if (selectedTicker === 'BTLN') {
        if (tradeMode === 'buy') {
          if (inputNumeric < 10) throw new Error('La inversión mínima es de 10 monedas.');
          if (inputNumeric > userCoins) throw new Error('Saldo insuficiente.');

          const res = await investInBotellon(inputNumeric);
          if (!res.success) throw new Error(res.message);

          setFeedback({ type: 'success', message: res.message });
          if (onUpdateCoins) onUpdateCoins(-inputNumeric);
        } else {
          if (inputNumeric <= 0) throw new Error('Indica una cantidad de participaciones.');
          if (inputNumeric > currentHolding.shares) throw new Error('No tienes suficientes participaciones.');

          const res = await withdrawFromBotellon(inputNumeric);
          if (!res.success) throw new Error(res.message);

          setFeedback({ type: 'success', message: res.message });
          if (onUpdateCoins && res.coins_received) onUpdateCoins(res.coins_received);
        }
      } else {
        if (tradeMode === 'buy') {
          if (inputNumeric < 10) throw new Error('La inversión mínima es de 10 monedas.');
          if (inputNumeric > userCoins) throw new Error('Saldo insuficiente.');

          const res = await tradeParodyStock(selectedTicker, 'buy', inputNumeric);
          if (!res.success) throw new Error(res.message);

          setFeedback({ type: 'success', message: res.message });
          if (onUpdateCoins) onUpdateCoins(-inputNumeric);
        } else {
          if (inputNumeric <= 0) throw new Error('Indica cuántas acciones vender.');
          if (inputNumeric > currentHolding.shares) throw new Error('No posees suficientes acciones.');

          const res = await tradeParodyStock(selectedTicker, 'sell', inputNumeric);
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
      {/* 1. SELECTOR MINIMALISTA DE ACTIVOS (SCROLL HORIZONTAL CÓMODO EN MÓVIL) */}
      <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none py-1 px-0.5 touch-pan-x">
        {allAssets.map((asset) => {
          const isSelected = selectedTicker === asset.ticker;
          const isUp = asset.change24h >= 0;
          const holding = asset.ticker === 'BTLN' ? portfolio?.shares : userHoldings[asset.ticker]?.shares;

          return (
            <button
              key={asset.ticker}
              type="button"
              onClick={() => {
                setSelectedTicker(asset.ticker);
                setFeedback(null);
                sound.tap();
              }}
              className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium transition-colors shrink-0 cursor-pointer ${
                isSelected
                  ? 'bg-foreground text-background font-semibold shadow-xs'
                  : 'bg-surface border border-border text-foreground-muted hover:text-foreground hover:bg-surface-raised'
              }`}
            >
              <span>{asset.name}</span>
              <span className="font-mono text-[11px] opacity-80">
                {asset.price.toFixed(2)}
              </span>
              {holding && holding > 0 ? (
                <span className={`w-1.5 h-1.5 rounded-full ${isSelected ? 'bg-emerald-400' : 'bg-emerald-500'}`} />
              ) : null}
            </button>
          );
        })}
      </div>

      {/* 2. FICHA PRINCIPAL DEL ACTIVO + GRÁFICA */}
      <div className="p-4 sm:p-5 rounded-2xl bg-surface border border-border space-y-4">
        {/* Cabecera del activo */}
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg sm:text-xl font-bold text-foreground tracking-tight">
                {activeAsset.name}
              </h2>
              <span className="text-xs text-foreground-subtle">
                ({activeAsset.parodyOf})
              </span>
            </div>
            <p className="text-xs text-foreground-muted mt-0.5">
              {activeAsset.sector} · {activeAsset.slogan}
            </p>
          </div>

          <div className="text-right">
            <div className="text-xl sm:text-2xl font-bold font-mono text-foreground">
              {activeAsset.price.toFixed(2)}{' '}
              <span className="text-xs text-foreground-muted font-sans font-normal">monedas</span>
            </div>
            <div className="flex items-center justify-end gap-1 mt-0.5">
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
                title="Actualizar cotizaciones"
                aria-label="Actualizar cotizaciones"
                className="p-1 rounded-md text-foreground-subtle hover:text-foreground transition-colors cursor-pointer ml-1"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </div>
        </div>

        {/* Gráfica limpia SVG */}
        <div className="space-y-2 pt-2 border-t border-border/50">
          <div className="flex items-center justify-between text-xs">
            <span className="text-foreground-subtle text-[11px]">
              {hoveredPoint ? (
                <span className="font-mono text-foreground font-medium">
                  {hoveredPoint.price.toFixed(2)} monedas
                </span>
              ) : (
                'Evolución del precio'
              )}
            </span>

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

          <div className="relative w-full h-36 sm:h-44 bg-surface-raised/40 rounded-xl p-2 border border-border/60 overflow-hidden">
            <svg
              viewBox="0 0 540 150"
              className="w-full h-full overflow-visible"
              preserveAspectRatio="none"
            >
              <defs>
                <linearGradient id="calmChartGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="currentColor" stopOpacity="0.12" />
                  <stop offset="100%" stopColor="currentColor" stopOpacity="0.0" />
                </linearGradient>
              </defs>

              {/* Guías suaves */}
              <line x1="12" y1="20" x2="528" y2="20" stroke="currentColor" strokeOpacity="0.06" strokeDasharray="2 2" />
              <line x1="12" y1="75" x2="528" y2="75" stroke="currentColor" strokeOpacity="0.06" strokeDasharray="2 2" />
              <line x1="12" y1="130" x2="528" y2="130" stroke="currentColor" strokeOpacity="0.06" strokeDasharray="2 2" />

              {/* Área y línea */}
              {chartData.area && <path d={chartData.area} fill="url(#calmChartGrad)" className="text-foreground" />}
              {chartData.line && (
                <path
                  d={chartData.line}
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className={isPriceUp ? 'text-emerald-500' : 'text-rose-500'}
                />
              )}

              {/* Puntos para lectura */}
              {chartData.points.map((pt, idx) => (
                <circle
                  key={idx}
                  cx={pt.x}
                  cy={pt.y}
                  r="3"
                  className="fill-transparent hover:fill-foreground cursor-pointer transition-colors"
                  onMouseEnter={() => setHoveredPoint({ price: pt.price, time: pt.time })}
                  onMouseLeave={() => setHoveredPoint(null)}
                />
              ))}
            </svg>

            <div className="absolute top-1.5 right-2 text-[10px] font-mono text-foreground-subtle">
              Máx: {maxPrice.toFixed(2)}
            </div>
            <div className="absolute bottom-1.5 right-2 text-[10px] font-mono text-foreground-subtle">
              Mín: {minPrice.toFixed(2)}
            </div>
          </div>
        </div>
      </div>

      {/* 3. GRID PRINCIPAL: OPERAR (IZQUIERDA) Y MIS INVERSIONES (DERECHA) */}
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
                  <span>Acciones estimadas:</span>
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
                    <span>Comisión (2%):</span>
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
                  <span>Procesando...</span>
                </>
              ) : tradeMode === 'buy' ? (
                `Comprar por ${Math.round(inputNumeric)} monedas`
              ) : (
                `Vender por +${estimatedCoins.net} monedas`
              )}
            </button>
          </form>
        </div>

        {/* RESUMEN DE CARTERA Y POSICIONES */}
        <div className="p-4 sm:p-5 rounded-2xl bg-surface border border-border space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-foreground">
              Mis inversiones
            </h3>
            <span className="text-xs text-foreground-subtle font-mono">
              Total: {totalPortfolioValue.toLocaleString()} monedas
            </span>
          </div>

          {/* Métricas rápidas */}
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="p-2.5 rounded-xl bg-surface-raised border border-border">
              <span className="text-[11px] text-foreground-subtle block">En {activeAsset.name}</span>
              <span className="font-mono font-bold text-foreground text-sm">
                {currentHolding.shares.toFixed(2)}{' '}
                <span className="text-xs font-normal text-foreground-muted">acc.</span>
              </span>
              <span className="text-[10px] text-foreground-subtle block mt-0.5">
                Valor: {Math.round(currentHolding.shares * activeAsset.price).toLocaleString()} monedas
              </span>
            </div>

            <div className="p-2.5 rounded-xl bg-surface-raised border border-border">
              <span className="text-[11px] text-foreground-subtle block">Saldo en cartera</span>
              <span className="font-mono font-bold text-foreground text-sm">
                {userCoins.toLocaleString()}{' '}
                <span className="text-xs font-normal text-foreground-muted">monedas</span>
              </span>
              <span className="text-[10px] text-foreground-subtle block mt-0.5">
                Disponible para operar
              </span>
            </div>
          </div>

          {/* Lista de empresas en posesión */}
          <div className="space-y-1.5 pt-1">
            <div className="text-[11px] font-medium text-foreground-subtle uppercase tracking-wider">
              Acciones que posees
            </div>

            {allAssets.filter((a) => {
              const s = a.ticker === 'BTLN' ? portfolio?.shares : userHoldings[a.ticker]?.shares;
              return s && s > 0;
            }).length === 0 ? (
              <p className="text-xs text-foreground-subtle py-3 text-center border border-dashed border-border rounded-xl">
                Aún no tienes inversiones activas. Elige una empresa arriba para empezar.
              </p>
            ) : (
              <div className="space-y-1 max-h-48 overflow-y-auto pr-1">
                {allAssets
                  .filter((a) => {
                    const s = a.ticker === 'BTLN' ? portfolio?.shares : userHoldings[a.ticker]?.shares;
                    return s && s > 0;
                  })
                  .map((asset) => {
                    const shares =
                      asset.ticker === 'BTLN'
                        ? portfolio?.shares || 0
                        : userHoldings[asset.ticker]?.shares || 0;
                    const value = Math.round(shares * asset.price);

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
                        <div>
                          <span className="font-medium text-foreground">{asset.name}</span>
                          <span className="text-[10px] text-foreground-subtle block">
                            {shares.toFixed(2)} acciones
                          </span>
                        </div>
                        <div className="text-right">
                          <span className="font-mono font-medium text-foreground">
                            {value.toLocaleString()} monedas
                          </span>
                          <span className="text-[10px] text-foreground-subtle block">
                            {asset.price.toFixed(2)} c/u
                          </span>
                        </div>
                      </div>
                    );
                  })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 4. TABLA RESUMEN DE TODAS LAS EMPRESAS */}
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
                      {asset.sector}
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
    </div>
  );
};
