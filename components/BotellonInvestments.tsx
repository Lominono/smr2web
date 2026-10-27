'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  TrendingUp,
  TrendingDown,
  Coins,
  ArrowUpRight,
  ArrowDownRight,
  Clock,
  Sparkles,
  AlertTriangle,
  Siren,
  Activity,
  Trophy,
  History,
  Info,
  CheckCircle2,
  DollarSign,
  PieChart,
  RefreshCw,
  ShoppingBag,
  Music,
  Car,
  Wine,
  Flame,
  Zap,
  Tag,
  ShieldCheck,
  Building2,
  Newspaper,
  ChevronRight,
} from 'lucide-react';
import { sound } from '@/lib/audio';
import confetti from 'canvas-confetti';
import { createClient } from '@/lib/supabase/client';
import {
  MarketState,
  InvestmentPosition,
  InvestmentTransaction,
  PriceHistoryPoint,
  TopInvestor,
  ParodyStock,
  UserStockHolding,
} from '@/lib/types';
import {
  fetchMarketState,
  fetchPriceHistory,
  fetchUserPortfolio,
  fetchUserTransactions,
  fetchTopInvestors,
  investInBotellon,
  withdrawFromBotellon,
  triggerMarketTick,
  fetchParodyStocks,
  fetchUserStocksPortfolio,
  tradeParodyStock,
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
  // Estado general de mercado y activos
  const [marketState, setMarketState] = useState<MarketState | null>(null);
  const [parodyStocks, setParodyStocks] = useState<ParodyStock[]>(DEFAULT_PARODY_STOCKS);
  const [selectedTicker, setSelectedTicker] = useState<string>('ONION');
  const [userHoldings, setUserHoldings] = useState<Record<string, UserStockHolding>>({});

  // Histórico y cartera
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
  const [topInvestors, setTopInvestors] = useState<TopInvestor[]>([]);

  // Estados UI
  const [tradeMode, setTradeMode] = useState<'buy' | 'sell'>('buy');
  const [timeFilter, setTimeFilter] = useState<'1H' | '6H' | '24H' | 'ALL'>('24H');
  const [tradeAmountInput, setTradeAmountInput] = useState<string>('100');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [isTicking, setIsTicking] = useState<boolean>(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [cooldownSeconds, setCooldownSeconds] = useState<number>(0);
  const [hoveredPoint, setHoveredPoint] = useState<PriceHistoryPoint | null>(null);

  // Carga inicial unificada
  const loadAllData = useCallback(async () => {
    try {
      const [mState, pHistory, port, txs, investors, stocks, holdings] = await Promise.all([
        fetchMarketState(),
        fetchPriceHistory(80),
        fetchUserPortfolio(),
        fetchUserTransactions(15),
        fetchTopInvestors(5),
        fetchParodyStocks(),
        fetchUserStocksPortfolio(),
      ]);

      setMarketState(mState);
      setPriceHistory(pHistory);
      setPortfolio(port);
      setTransactions(txs);
      setTopInvestors(investors);
      setParodyStocks(stocks);
      setUserHoldings(holdings);

      if (port.cooldown_remaining_seconds > 0) {
        setCooldownSeconds(port.cooldown_remaining_seconds);
      }
    } catch (err) {
      console.error('Error cargando mercado del botellón:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAllData();
  }, [loadAllData, userId]);

  // Temporizador de cooldown de seguridad
  useEffect(() => {
    if (cooldownSeconds <= 0) return;
    const interval = setInterval(() => {
      setCooldownSeconds((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(interval);
  }, [cooldownSeconds]);

  // Suscripción Realtime en Supabase
  useEffect(() => {
    const supabase = createClient();
    if (!supabase) return;

    const channel = supabase
      .channel('botellon_parody_investments_realtime')
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
                    last_event: updated.last_event,
                    last_event_type: updated.last_event_type,
                    last_event_impact: Number(updated.last_event_impact),
                    last_tick_at: updated.last_tick_at,
                    updated_at: updated.updated_at,
                  }
                : null
            );
            if (updated.parody_stocks && typeof updated.parody_stocks === 'object') {
              fetchParodyStocks().then(setParodyStocks);
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
              event_description: payload.new.event_description,
              created_at: payload.new.created_at,
            };
            setPriceHistory((prev) => [...prev.slice(-99), newPoint]);
          }
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'investments', filter: userId ? `user_id=eq.${userId}` : undefined },
        () => {
          fetchUserPortfolio().then(setPortfolio);
          fetchUserStocksPortfolio().then(setUserHoldings);
          fetchTopInvestors(5).then(setTopInvestors);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId]);

  // Empresa seleccionada actualmente
  const activeStock = useMemo(() => {
    if (selectedTicker === 'BTLN') {
      return {
        ticker: 'BTLN',
        name: 'Fondo Botellón Global',
        parodyOf: 'Índice General',
        slogan: 'El fondo indexado colectivo de la fiesta',
        sector: 'Índice de Mercado',
        price: marketState?.current_price || 10.0,
        change24h: 3.2,
        volume: marketState?.total_volume || 50000,
        lastNews: marketState?.last_event || 'Apertura oficial de la Bolsa del Botellón',
        accentColor: '#34c759',
        iconType: 'wine',
      };
    }
    return (
      parodyStocks.find((s) => s.ticker === selectedTicker) ||
      parodyStocks[0] ||
      DEFAULT_PARODY_STOCKS[0]
    );
  }, [selectedTicker, parodyStocks, marketState]);

  // Tenencia actual del activo seleccionado
  const currentHolding = useMemo(() => {
    if (selectedTicker === 'BTLN') {
      return {
        ticker: 'BTLN',
        shares: portfolio?.shares || 0,
        averagePrice: portfolio?.average_buy_price || 0,
        totalInvested: portfolio?.total_invested_coins || 0,
      };
    }
    return userHoldings[selectedTicker] || {
      ticker: selectedTicker,
      shares: 0,
      averagePrice: 0,
      totalInvested: 0,
    };
  }, [selectedTicker, userHoldings, portfolio]);

  // Valor total del patrimonio en acciones de todas las empresas
  const totalPortfolioValue = useMemo(() => {
    let total = (portfolio?.shares || 0) * (marketState?.current_price || 10.0);
    parodyStocks.forEach((st) => {
      const h = userHoldings[st.ticker];
      if (h && h.shares > 0) {
        total += h.shares * st.price;
      }
    });
    return Math.round(total);
  }, [portfolio, marketState, parodyStocks, userHoldings]);

  // Puntos para la gráfica filtrada por tiempo
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
    return filtered.length >= 2 ? filtered : priceHistory.slice(-12);
  }, [priceHistory, timeFilter]);

  // Escala min/max de la gráfica adaptada al precio de la acción seleccionada
  const { minPrice, maxPrice, isPriceUp } = useMemo(() => {
    const assetPrice = activeStock.price;
    const historyPrices = filteredHistory.map((p) => (p.price / (marketState?.current_price || 10.0)) * assetPrice);
    if (historyPrices.length < 2) {
      return { minPrice: assetPrice * 0.9, maxPrice: assetPrice * 1.1, isPriceUp: activeStock.change24h >= 0 };
    }
    const min = Math.min(...historyPrices);
    const max = Math.max(...historyPrices);
    const pad = (max - min) * 0.18 || assetPrice * 0.05;
    return {
      minPrice: Math.max(0.5, min - pad),
      maxPrice: max + pad,
      isPriceUp: activeStock.change24h >= 0,
    };
  }, [filteredHistory, activeStock, marketState?.current_price]);

  // Generación SVG (ViewBox: 600 x 200)
  const chartSvg = useMemo(() => {
    if (filteredHistory.length < 2) return { line: '', area: '', points: [] };

    const svgW = 600;
    const svgH = 200;
    const padX = 16;
    const padY = 20;
    const plotW = svgW - padX * 2;
    const plotH = svgH - padY * 2;
    const range = maxPrice - minPrice || 1;
    const assetPrice = activeStock.price;

    const points = filteredHistory.map((point, i) => {
      const priceScaled = (point.price / (marketState?.current_price || 10.0)) * assetPrice;
      const x = padX + (i / (filteredHistory.length - 1)) * plotW;
      const norm = (priceScaled - minPrice) / range;
      const y = svgH - padY - norm * plotH;
      return { x, y, price: priceScaled, rawPoint: point };
    });

    const linePath = points.reduce((acc, curr, idx) => {
      return idx === 0 ? `M ${curr.x} ${curr.y}` : `${acc} L ${curr.x} ${curr.y}`;
    }, '');

    const last = points[points.length - 1];
    const first = points[0];
    const areaPath = `${linePath} L ${last.x} ${svgH - padY} L ${first.x} ${svgH - padY} Z`;

    return { line: linePath, area: areaPath, points };
  }, [filteredHistory, activeStock, minPrice, maxPrice, marketState?.current_price]);

  // Cálculos dinámicos de simulación de orden
  const inputNumeric = parseFloat(tradeAmountInput) || 0;
  const currentAssetPrice = activeStock.price;

  // Si estamos en modo "buy":
  const estimatedSharesBought = useMemo(() => {
    if (tradeMode !== 'buy' || inputNumeric <= 0 || currentAssetPrice <= 0) return 0;
    return Number((inputNumeric / currentAssetPrice).toFixed(4));
  }, [tradeMode, inputNumeric, currentAssetPrice]);

  // Si estamos en modo "sell":
  const grossCoinsSell = useMemo(() => {
    if (tradeMode !== 'sell' || inputNumeric <= 0 || currentAssetPrice <= 0) return 0;
    return Math.round(inputNumeric * currentAssetPrice);
  }, [tradeMode, inputNumeric, currentAssetPrice]);

  const feeSell = useMemo(() => {
    return Math.max(grossCoinsSell > 0 ? 1 : 0, Math.round(grossCoinsSell * 0.02));
  }, [grossCoinsSell]);

  const netCoinsSell = Math.max(0, grossCoinsSell - feeSell);

  // Manejo de envío de orden
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
        // Fondo Botellón principal
        if (tradeMode === 'buy') {
          if (inputNumeric < 10) throw new Error('La inversión mínima es de 10 monedas.');
          if (inputNumeric > userCoins) throw new Error('Saldo insuficiente.');

          const res = await investInBotellon(inputNumeric);
          if (!res.success) throw new Error(res.message);

          sound.coinWin();
          confetti({ particleCount: 35, spread: 70, origin: { y: 0.8 } });
          setFeedback({ type: 'success', message: res.message });
          if (onUpdateCoins) onUpdateCoins(-inputNumeric);
        } else {
          if (inputNumeric <= 0) throw new Error('Cantidad no válida.');
          if (inputNumeric > currentHolding.shares) throw new Error('No tienes suficientes participaciones.');

          const res = await withdrawFromBotellon(inputNumeric);
          if (!res.success) throw new Error(res.message);

          sound.coinWin();
          setFeedback({ type: 'success', message: res.message });
          if (onUpdateCoins && res.coins_received) onUpdateCoins(res.coins_received);
        }
      } else {
        // Empresa Parodia (ONION, ARDIDAS, CARLOS HERRERO, etc.)
        if (tradeMode === 'buy') {
          if (inputNumeric < 10) throw new Error('La inversión mínima es de 10 monedas.');
          if (inputNumeric > userCoins) throw new Error('Saldo insuficiente.');

          const res = await tradeParodyStock(selectedTicker, 'buy', inputNumeric);
          if (!res.success) throw new Error(res.message);

          sound.coinWin();
          confetti({ particleCount: 40, spread: 80, origin: { y: 0.8 } });
          setFeedback({ type: 'success', message: res.message });
          if (onUpdateCoins) onUpdateCoins(-inputNumeric);
        } else {
          if (inputNumeric <= 0) throw new Error('Indica cuántas acciones vender.');
          if (inputNumeric > currentHolding.shares) throw new Error('No posees suficientes acciones de esta empresa.');

          const res = await tradeParodyStock(selectedTicker, 'sell', inputNumeric);
          if (!res.success) throw new Error(res.message);

          sound.coinWin();
          setFeedback({ type: 'success', message: res.message });
          if (onUpdateCoins && res.coinsDelta > 0) onUpdateCoins(res.coinsDelta);
        }
      }

      setCooldownSeconds(60);
      loadAllData();
    } catch (err: any) {
      setFeedback({ type: 'error', message: err?.message || 'Error en la orden.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Forzar tick de simulación
  const handleManualTick = async () => {
    setIsTicking(true);
    sound.tap();
    try {
      await triggerMarketTick();
      sound.tap();
      loadAllData();
    } finally {
      setIsTicking(false);
    }
  };

  const getCompanyIcon = (iconType: string) => {
    switch (iconType) {
      case 'onion':
        return <span className="text-base select-none">🧅</span>;
      case 'shoe':
        return <span className="text-base select-none">👟</span>;
      case 'perfume':
        return <span className="text-base select-none">👔</span>;
      case 'cart':
        return <span className="text-base select-none">🛒</span>;
      case 'music':
        return <Music className="w-4 h-4 text-lime-400" />;
      case 'car':
        return <Car className="w-4 h-4 text-amber-400" />;
      default:
        return <Wine className="w-4 h-4 text-emerald-400" />;
    }
  };

  return (
    <div className="space-y-4 animate-in fade-in duration-150 max-w-7xl mx-auto">
      {/* 1. TOP TICKER MARQUEE: EMPRESAS PARODIA (SCROLL HORIZONTAL OPTIMIZADO PARA MÓVIL) */}
      <div className="p-1 rounded-2xl bg-surface border border-border overflow-hidden shadow-2xs">
        <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none py-1 px-1 touch-pan-x">
          {/* Fondo General */}
          <button
            type="button"
            onClick={() => {
              setSelectedTicker('BTLN');
              sound.tap();
            }}
            className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap active:scale-95 shrink-0 ${
              selectedTicker === 'BTLN'
                ? 'bg-foreground text-background shadow-xs'
                : 'text-foreground-muted hover:text-foreground hover:bg-surface-raised'
            }`}
          >
            <Wine className="w-3.5 h-3.5 text-emerald-400" />
            <span>FONDO BOTELLÓN</span>
            <span className="font-mono text-[11px] opacity-80">
              {(marketState?.current_price || 10).toFixed(2)} 🪙
            </span>
          </button>

          {/* Empresas Parodia */}
          {parodyStocks.map((stock) => {
            const isSelected = selectedTicker === stock.ticker;
            const isUp = stock.change24h >= 0;

            return (
              <button
                key={stock.ticker}
                type="button"
                onClick={() => {
                  setSelectedTicker(stock.ticker);
                  sound.tap();
                }}
                className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap active:scale-95 shrink-0 border ${
                  isSelected
                    ? 'bg-surface-raised border-foreground/30 text-foreground shadow-2xs'
                    : 'bg-transparent border-transparent text-foreground-muted hover:text-foreground hover:bg-surface-raised/60'
                }`}
              >
                <div className="w-5 h-5 rounded-lg flex items-center justify-center shrink-0">
                  {getCompanyIcon(stock.iconType)}
                </div>
                <div className="text-left">
                  <div className="flex items-center gap-1.5">
                    <span className="font-black text-foreground">{stock.ticker}</span>
                    <span
                      className={`text-[10px] font-mono font-bold ${
                        isUp ? 'text-emerald-400' : 'text-rose-400'
                      }`}
                    >
                      {isUp ? '+' : ''}
                      {stock.change24h}%
                    </span>
                  </div>
                  <div className="text-[10px] font-mono text-foreground-subtle">
                    {stock.price.toFixed(2)} 🪙
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* 2. CABECERA PRINCIPAL DEL ACTIVO SELECCIONADO */}
      <div className="p-4 sm:p-5 rounded-3xl bg-surface border border-border shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-12 h-12 rounded-2xl bg-surface-raised border border-border flex items-center justify-center text-2xl shadow-inner shrink-0">
              {getCompanyIcon(activeStock.iconType)}
            </div>

            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-lg sm:text-xl font-black text-foreground tracking-tight truncate">
                  {activeStock.name}
                </h1>
                <span className="px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider bg-surface-raised border border-border text-foreground-muted">
                  ${activeStock.ticker}
                </span>
                <span className="text-[11px] text-foreground-subtle italic truncate">
                  (Parodia de {activeStock.parodyOf})
                </span>
              </div>
              <p className="text-xs text-foreground-muted truncate font-medium">
                {activeStock.slogan}
              </p>
            </div>
          </div>

          {/* Precio y variación */}
          <div className="flex items-baseline sm:flex-col sm:items-end justify-between sm:justify-center gap-2">
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl sm:text-3xl font-black tracking-tight text-foreground font-mono">
                {activeStock.price.toFixed(2)}
              </span>
              <span className="text-sm font-bold text-amber-400">🪙</span>
            </div>

            <div className="flex items-center gap-2">
              <span
                className={`px-2 py-0.5 rounded-lg text-xs font-bold font-mono flex items-center gap-1 ${
                  isPriceUp
                    ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                    : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                }`}
              >
                {isPriceUp ? <ArrowUpRight className="w-3.5 h-3.5" /> : <ArrowDownRight className="w-3.5 h-3.5" />}
                <span>{activeStock.change24h > 0 ? `+${activeStock.change24h}` : activeStock.change24h}%</span>
              </span>

              <button
                type="button"
                onClick={handleManualTick}
                disabled={isTicking}
                title="Sincronizar y forzar volatilidad"
                className="p-1.5 rounded-xl bg-surface-raised hover:bg-surface-hover text-foreground-muted hover:text-foreground border border-border transition-all cursor-pointer active:scale-95"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isTicking ? 'animate-spin text-emerald-400' : ''}`} />
              </button>
            </div>
          </div>
        </div>

        {/* Noticia temático-paródica de última hora */}
        {activeStock.lastNews && (
          <div className="flex items-center gap-2.5 p-2.5 rounded-2xl bg-surface-raised/70 border border-border text-xs">
            <Newspaper className="w-4 h-4 text-accent shrink-0" />
            <span className="font-semibold text-foreground-subtle text-[11px] uppercase tracking-wider shrink-0">
              Flash Informativo:
            </span>
            <span className="text-foreground truncate text-xs font-medium">
              {activeStock.lastNews}
            </span>
          </div>
        )}

        {/* 3. GRÁFICA SVG RESPONSIVE CON SCRUBBER */}
        <div className="space-y-2 pt-1">
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <span className="text-foreground-subtle font-medium text-[11px]">Tendencia</span>
              {hoveredPoint && (
                <span className="font-mono font-bold text-emerald-400 text-xs">
                  {hoveredPoint.price.toFixed(2)} 🪙
                </span>
              )}
            </div>

            {/* Selector de Rango */}
            <div className="flex items-center gap-1 bg-surface-raised p-0.5 rounded-xl border border-border">
              {(['1H', '6H', '24H', 'ALL'] as const).map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => {
                    setTimeFilter(r);
                    sound.tap();
                  }}
                  className={`px-2.5 py-0.5 rounded-lg text-[10px] font-bold transition-all cursor-pointer ${
                    timeFilter === r
                      ? 'bg-foreground text-background shadow-xs'
                      : 'text-foreground-muted hover:text-foreground'
                  }`}
                >
                  {r}
                </button>
              ))}
            </div>
          </div>

          <div className="relative w-full h-44 sm:h-52 bg-surface-raised/30 rounded-2xl p-2 border border-border/60 overflow-hidden">
            <svg
              viewBox="0 0 600 200"
              className="w-full h-full overflow-visible"
              preserveAspectRatio="none"
            >
              <defs>
                <linearGradient id="parodyGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={activeStock.accentColor} stopOpacity="0.32" />
                  <stop offset="100%" stopColor={activeStock.accentColor} stopOpacity="0.0" />
                </linearGradient>
              </defs>

              {/* Grid horizontal */}
              <line x1="16" y1="30" x2="584" y2="30" stroke="currentColor" strokeOpacity="0.07" strokeDasharray="3 3" />
              <line x1="16" y1="100" x2="584" y2="100" stroke="currentColor" strokeOpacity="0.07" strokeDasharray="3 3" />
              <line x1="16" y1="170" x2="584" y2="170" stroke="currentColor" strokeOpacity="0.07" strokeDasharray="3 3" />

              {/* Curva y Área */}
              {chartSvg.area && <path d={chartSvg.area} fill="url(#parodyGradient)" />}
              {chartSvg.line && (
                <path
                  d={chartSvg.line}
                  fill="none"
                  stroke={activeStock.accentColor}
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              )}

              {/* Puntos interactivos */}
              {chartSvg.points.map((pt, idx) => {
                const isLast = idx === chartSvg.points.length - 1;
                return (
                  <circle
                    key={idx}
                    cx={pt.x}
                    cy={pt.y}
                    r={isLast ? 4.5 : 2}
                    className={`transition-all ${
                      isLast
                        ? 'fill-foreground stroke-surface stroke-2 animate-pulse'
                        : 'fill-transparent hover:fill-foreground-muted cursor-pointer'
                    }`}
                    onMouseEnter={() => setHoveredPoint(pt.rawPoint)}
                    onMouseLeave={() => setHoveredPoint(null)}
                  />
                );
              })}
            </svg>

            <div className="absolute top-2 right-3 text-[10px] font-mono text-foreground-subtle bg-surface/80 px-1.5 py-0.5 rounded border border-border/40">
              Máx: {maxPrice.toFixed(2)} 🪙
            </div>
            <div className="absolute bottom-2 right-3 text-[10px] font-mono text-foreground-subtle bg-surface/80 px-1.5 py-0.5 rounded border border-border/40">
              Mín: {minPrice.toFixed(2)} 🪙
            </div>
          </div>
        </div>
      </div>

      {/* 4. DASHBOARD DE MI CARTERA (4 MÉTRICAS COMPACTAS) */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
        <div className="p-3.5 rounded-2xl bg-surface border border-border space-y-1">
          <div className="flex items-center justify-between text-foreground-subtle text-[11px] font-medium">
            <span>En ${activeStock.ticker}</span>
            <Building2 className="w-3.5 h-3.5 text-accent" />
          </div>
          <div className="text-base sm:text-lg font-black text-foreground font-mono">
            {currentHolding.shares.toFixed(2)} <span className="text-xs font-sans text-foreground-muted">acc.</span>
          </div>
          <div className="text-[10px] text-foreground-subtle truncate">
            {currentHolding.averagePrice > 0
              ? `Compra media: ${currentHolding.averagePrice.toFixed(2)} 🪙`
              : 'Sin posición actual'}
          </div>
        </div>

        <div className="p-3.5 rounded-2xl bg-surface border border-border space-y-1">
          <div className="flex items-center justify-between text-foreground-subtle text-[11px] font-medium">
            <span>Valor de mi posición</span>
            <Coins className="w-3.5 h-3.5 text-amber-400" />
          </div>
          <div className="text-base sm:text-lg font-black text-foreground font-mono">
            {Math.round(currentHolding.shares * activeStock.price).toLocaleString()} 🪙
          </div>
          <div className="text-[10px] text-foreground-subtle truncate">
            A cotización actual
          </div>
        </div>

        <div className="p-3.5 rounded-2xl bg-surface border border-border space-y-1">
          <div className="flex items-center justify-between text-foreground-subtle text-[11px] font-medium">
            <span>Patrimonio Total</span>
            <PieChart className="w-3.5 h-3.5 text-blue-400" />
          </div>
          <div className="text-base sm:text-lg font-black text-emerald-400 font-mono">
            {totalPortfolioValue.toLocaleString()} 🪙
          </div>
          <div className="text-[10px] text-foreground-subtle truncate">
            Suma de todas tus acciones
          </div>
        </div>

        <div className="p-3.5 rounded-2xl bg-surface border border-border space-y-1">
          <div className="flex items-center justify-between text-foreground-subtle text-[11px] font-medium">
            <span>Saldo Líquido</span>
            <DollarSign className="w-3.5 h-3.5 text-emerald-400" />
          </div>
          <div className="text-base sm:text-lg font-black text-foreground font-mono">
            {userCoins.toLocaleString()} 🪙
          </div>
          <div className="text-[10px] text-foreground-subtle truncate">
            Disponible para invertir
          </div>
        </div>
      </div>

      {/* 5. PANEL DE OPERACIÓN (COMPRAR / VENDER) */}
      <div className="p-4 sm:p-5 rounded-3xl bg-surface border border-border space-y-4">
        {/* Selector Comprar / Vender */}
        <div className="flex items-center p-1 rounded-2xl bg-surface-raised border border-border gap-1">
          <button
            type="button"
            onClick={() => {
              setTradeMode('buy');
              sound.tap();
            }}
            className={`flex-1 py-2.5 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center justify-center gap-1.5 active:scale-95 ${
              tradeMode === 'buy'
                ? 'bg-emerald-500 text-white shadow-xs'
                : 'text-foreground-muted hover:text-foreground'
            }`}
          >
            <ArrowUpRight className="w-4 h-4" />
            <span>Comprar ${activeStock.ticker}</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setTradeMode('sell');
              sound.tap();
            }}
            className={`flex-1 py-2.5 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center justify-center gap-1.5 active:scale-95 ${
              tradeMode === 'sell'
                ? 'bg-rose-500 text-white shadow-xs'
                : 'text-foreground-muted hover:text-foreground'
            }`}
          >
            <ArrowDownRight className="w-4 h-4" />
            <span>Vender ${activeStock.ticker}</span>
          </button>
        </div>

        {/* Feedback visual */}
        {feedback && (
          <div
            className={`p-3 rounded-2xl text-xs font-medium border flex items-center gap-2 ${
              feedback.type === 'success'
                ? 'bg-emerald-500/10 border-emerald-500/25 text-emerald-400'
                : 'bg-rose-500/10 border-rose-500/25 text-rose-400'
            }`}
          >
            {feedback.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 shrink-0" />
            ) : (
              <AlertTriangle className="w-4 h-4 shrink-0" />
            )}
            <span className="flex-1">{feedback.message}</span>
          </div>
        )}

        {/* Cooldown bar */}
        {cooldownSeconds > 0 && (
          <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 animate-spin text-amber-400 shrink-0" />
              <span>Cooldown de mercado: espera {cooldownSeconds}s</span>
            </div>
            <span className="font-mono font-black text-sm">{cooldownSeconds}s</span>
          </div>
        )}

        {/* Formulario */}
        <form onSubmit={handleExecuteTrade} className="space-y-4">
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <label htmlFor="trade-input" className="font-bold text-foreground">
                {tradeMode === 'buy' ? 'Monedas a invertir:' : 'Acciones a vender:'}
              </label>
              <span className="text-foreground-subtle font-mono text-[11px]">
                {tradeMode === 'buy'
                  ? `Disponible: ${userCoins.toLocaleString()} 🪙`
                  : `Posees: ${currentHolding.shares.toFixed(2)} acc.`}
              </span>
            </div>

            <div className="relative">
              <input
                id="trade-input"
                type="number"
                step={tradeMode === 'buy' ? '1' : '0.01'}
                min="1"
                value={tradeAmountInput}
                onChange={(e) => setTradeAmountInput(e.target.value)}
                className="w-full px-4 py-3 rounded-2xl bg-surface-raised border border-border text-foreground font-mono font-black text-base focus:outline-hidden focus:border-accent transition-all pr-14"
                placeholder={tradeMode === 'buy' ? '100' : '1.00'}
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-bold text-foreground-subtle">
                {tradeMode === 'buy' ? '🪙' : 'ACC'}
              </span>
            </div>

            {/* Presets Rápidos */}
            <div className="flex items-center gap-1.5 pt-1">
              {tradeMode === 'buy' ? (
                <>
                  {[50, 150, 500, 1500].map((amt) => (
                    <button
                      key={amt}
                      type="button"
                      onClick={() => {
                        setTradeAmountInput(String(amt));
                        sound.tap();
                      }}
                      className="flex-1 py-1 rounded-xl text-xs font-bold bg-surface-raised hover:bg-surface-hover text-foreground-muted hover:text-foreground border border-border transition-all cursor-pointer active:scale-95"
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
                    className="px-3 py-1 rounded-xl text-xs font-black bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 transition-all cursor-pointer"
                  >
                    MÁX
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
                      className="flex-1 py-1 rounded-xl text-xs font-bold bg-surface-raised hover:bg-surface-hover text-foreground-muted hover:text-foreground border border-border transition-all cursor-pointer active:scale-95"
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
                    className="px-3 py-1 rounded-xl text-xs font-black bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 transition-all cursor-pointer"
                  >
                    TODO
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Desglose estimativo */}
          <div className="p-3.5 rounded-2xl bg-surface-raised/40 border border-border/60 text-xs space-y-1.5 font-medium">
            {tradeMode === 'buy' ? (
              <>
                <div className="flex items-center justify-between text-foreground-muted">
                  <span>Acciones estimadas a recibir:</span>
                  <span className="font-mono font-bold text-foreground">
                    +{estimatedSharesBought.toFixed(2)} acc.
                  </span>
                </div>
                <div className="flex items-center justify-between text-foreground-muted">
                  <span>Precio por acción:</span>
                  <span className="font-mono text-foreground">{currentAssetPrice.toFixed(2)} 🪙</span>
                </div>
              </>
            ) : (
              <>
                <div className="flex items-center justify-between text-foreground-muted">
                  <span>Cobro bruto:</span>
                  <span className="font-mono text-foreground">{grossCoinsSell.toLocaleString()} 🪙</span>
                </div>
                <div className="flex items-center justify-between text-foreground-muted">
                  <span>Comisión al fondo (2%):</span>
                  <span className="font-mono text-amber-400">-{feeSell.toLocaleString()} 🪙</span>
                </div>
                <div className="pt-1 border-t border-border/50 flex items-center justify-between font-bold text-foreground">
                  <span>Neto a recibir en tu bolsillo:</span>
                  <span className="font-mono text-emerald-400 font-black">
                    +{netCoinsSell.toLocaleString()} 🪙
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
            className={`w-full py-3.5 rounded-2xl font-black text-sm text-white transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed shadow-xs active:scale-98 flex items-center justify-center gap-2 ${
              tradeMode === 'buy'
                ? 'bg-emerald-500 hover:bg-emerald-600'
                : 'bg-rose-500 hover:bg-rose-600'
            }`}
          >
            {isSubmitting ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Ejecutando en el mercado...</span>
              </>
            ) : tradeMode === 'buy' ? (
              <>
                <ArrowUpRight className="w-4 h-4" />
                <span>Comprar por {inputNumeric > 0 ? Math.round(inputNumeric).toLocaleString() : 0} Monedas</span>
              </>
            ) : (
              <>
                <ArrowDownRight className="w-4 h-4" />
                <span>Vender y Cobrar +{netCoinsSell.toLocaleString()} Monedas</span>
              </>
            )}
          </button>
        </form>
      </div>

      {/* 6. CATÁLOGO COMPLETO DE EMPRESAS PARODIA (TARJETAS COMPACTAS PARA MÓVIL Y DESKTOP) */}
      <div className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <h2 className="text-xs font-black text-foreground uppercase tracking-wider flex items-center gap-1.5">
            <Building2 className="w-4 h-4 text-accent" />
            <span>Empresas Cotizadas en la Bolsa del Botellón</span>
          </h2>
          <span className="text-[10px] text-foreground-subtle">
            IBEX-Parodia
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {parodyStocks.map((stock) => {
            const isUp = stock.change24h >= 0;
            const holding = userHoldings[stock.ticker];
            const isSelected = selectedTicker === stock.ticker;

            return (
              <div
                key={stock.ticker}
                onClick={() => {
                  setSelectedTicker(stock.ticker);
                  sound.tap();
                }}
                className={`p-4 rounded-3xl border transition-all cursor-pointer active:scale-98 relative overflow-hidden ${
                  isSelected
                    ? 'bg-surface border-accent shadow-xs'
                    : 'bg-surface hover:bg-surface-raised border-border'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <div className="w-10 h-10 rounded-2xl bg-surface-raised border border-border flex items-center justify-center text-xl shrink-0">
                      {getCompanyIcon(stock.iconType)}
                    </div>
                    <div>
                      <div className="font-black text-foreground text-sm flex items-center gap-1.5">
                        <span>{stock.name}</span>
                        <span className="text-[10px] text-foreground-subtle font-mono font-bold">
                          ${stock.ticker}
                        </span>
                      </div>
                      <div className="text-[11px] text-foreground-muted truncate">
                        {stock.parodyOf}
                      </div>
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="text-sm font-black font-mono text-foreground">
                      {stock.price.toFixed(2)} 🪙
                    </div>
                    <div
                      className={`text-[10px] font-mono font-bold ${
                        isUp ? 'text-emerald-400' : 'text-rose-400'
                      }`}
                    >
                      {isUp ? '+' : ''}
                      {stock.change24h}%
                    </div>
                  </div>
                </div>

                <div className="mt-3 pt-2.5 border-t border-border/50 flex items-center justify-between text-xs">
                  <span className="text-[11px] text-foreground-subtle truncate">
                    {stock.sector}
                  </span>
                  {holding && holding.shares > 0 ? (
                    <span className="px-2 py-0.5 rounded-full font-mono text-[10px] font-black bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                      Tienes {holding.shares.toFixed(1)} acc.
                    </span>
                  ) : (
                    <span className="text-[10px] text-foreground-subtle flex items-center gap-0.5">
                      Operar <ChevronRight className="w-3 h-3" />
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
