'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Sprout,
  Wheat,
  Droplets,
  Sparkles,
  TrendingUp,
  TrendingDown,
  Warehouse,
  ShoppingBag,
  Clock,
  Check,
  Coins,
  Award,
  ChevronRight,
  RefreshCw,
  Lock,
  Plus,
  Flame,
  ArrowRight,
  Info,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { sound } from '@/lib/audio';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';

export interface FarmhandGameProps {
  userCoins: number;
  userId?: string;
  onUpdateCoins: (delta: number) => void;
  onNavigateGame?: (game: string) => void;
}

export type CropId =
  | 'trigo'
  | 'zanahoria'
  | 'patata'
  | 'tomate'
  | 'maiz'
  | 'fresa'
  | 'calabaza'
  | 'sandia';

export interface CropConfig {
  id: CropId;
  name: string;
  desc: string;
  seedCost: number;
  baseCropPrice: number;
  growthSeconds: number;
  xpReward: number;
  requiredLevel: number;
  emoji: string;
  badge: string;
}

export const CROPS: Record<CropId, CropConfig> = {
  trigo: {
    id: 'trigo',
    name: 'Trigo SMR',
    desc: 'Cosecha rápida y económica. Ideal para mover la tierra.',
    seedCost: 2,
    baseCropPrice: 4,
    growthSeconds: 8,
    xpReward: 3,
    requiredLevel: 1,
    emoji: '🌾',
    badge: 'Básico',
  },
  zanahoria: {
    id: 'zanahoria',
    name: 'Zanahoria Dulce',
    desc: 'Hortaliza clásica con demanda muy estable en la cantina.',
    seedCost: 6,
    baseCropPrice: 12,
    growthSeconds: 18,
    xpReward: 8,
    requiredLevel: 1,
    emoji: '🥕',
    badge: 'Popular',
  },
  patata: {
    id: 'patata',
    name: 'Patata de Huerto',
    desc: 'Tubérculo resistente que siempre tiene compradores garantizados.',
    seedCost: 14,
    baseCropPrice: 28,
    growthSeconds: 32,
    xpReward: 18,
    requiredLevel: 2,
    emoji: '🥔',
    badge: 'Nvl 2',
  },
  tomate: {
    id: 'tomate',
    name: 'Tomate Raff',
    desc: 'Tomate maduro muy cotizado cuando la lonja se dispara.',
    seedCost: 30,
    baseCropPrice: 65,
    growthSeconds: 55,
    xpReward: 38,
    requiredLevel: 2,
    emoji: '🍅',
    badge: 'Nvl 2',
  },
  maiz: {
    id: 'maiz',
    name: 'Mazorca Dulce',
    desc: 'Granos dorados listos para asar. Gran margen de beneficio.',
    seedCost: 65,
    baseCropPrice: 145,
    growthSeconds: 95,
    xpReward: 80,
    requiredLevel: 3,
    emoji: '🌽',
    badge: 'Nvl 3',
  },
  fresa: {
    id: 'fresa',
    name: 'Fresas Silvestres',
    desc: 'Fruta gourmet de alta rentabilidad para granjeros experimentados.',
    seedCost: 150,
    baseCropPrice: 340,
    growthSeconds: 160,
    xpReward: 175,
    requiredLevel: 4,
    emoji: '🍓',
    badge: 'Gourmet',
  },
  calabaza: {
    id: 'calabaza',
    name: 'Gran Calabaza',
    desc: 'Tarda en crecer pero su venta en lonja te llena los bolsillos.',
    seedCost: 350,
    baseCropPrice: 820,
    growthSeconds: 260,
    xpReward: 420,
    requiredLevel: 5,
    emoji: '🎃',
    badge: 'Pesada',
  },
  sandia: {
    id: 'sandia',
    name: 'Sandía Gigante',
    desc: 'El cultivo supremo del huerto de 2º SMR. Fortuna asegurada.',
    seedCost: 800,
    baseCropPrice: 1950,
    growthSeconds: 420,
    xpReward: 950,
    requiredLevel: 6,
    emoji: '🍉',
    badge: 'Supremo',
  },
};

export const CROP_LIST: CropConfig[] = Object.values(CROPS);

export interface FarmPlot {
  id: number;
  isUnlocked: boolean;
  unlockCost: number;
  unlockLevel: number;
  cropId: CropId | null;
  plantedAtMs: number | null;
  isWatered: boolean;
  isFertilized: boolean;
}

export interface MarketPriceInfo {
  price: number;
  previousPrice: number;
  trend: 'up' | 'down' | 'stable' | 'surge';
  percentChange: number;
  history: number[];
}

export interface FarmhandState {
  plots: FarmPlot[];
  seedInventory: Record<CropId, number>;
  cropInventory: Record<CropId, number>;
  farmerLevel: number;
  farmerXp: number;
  fertilizerStock: number;
  totalCropsHarvested: number;
  totalCoinsEarned: number;
  lastSavedMs: number;
}

const STORAGE_KEY_PREFIX = 'smr2_farmhand_data_';
const MARKET_CYCLE_SECONDS = 30;
const TOTAL_PLOTS = 16;

export function getXpForNextLevel(level: number): number {
  return Math.floor(60 * Math.pow(1.6, level - 1));
}

function initializePlots(): FarmPlot[] {
  const plots: FarmPlot[] = [];
  const unlockConfigs = [
    { cost: 0, level: 1 },    // Plot 0
    { cost: 0, level: 1 },    // Plot 1
    { cost: 0, level: 1 },    // Plot 2
    { cost: 0, level: 1 },    // Plot 3
    { cost: 0, level: 1 },    // Plot 4
    { cost: 0, level: 1 },    // Plot 5
    { cost: 40, level: 2 },   // Plot 6
    { cost: 60, level: 2 },   // Plot 7
    { cost: 120, level: 3 },  // Plot 8
    { cost: 150, level: 3 },  // Plot 9
    { cost: 220, level: 3 },  // Plot 10
    { cost: 300, level: 4 },  // Plot 11
    { cost: 450, level: 4 },  // Plot 12
    { cost: 650, level: 5 },  // Plot 13
    { cost: 950, level: 5 },  // Plot 14
    { cost: 1400, level: 6 }, // Plot 15
  ];

  for (let i = 0; i < TOTAL_PLOTS; i++) {
    const cfg = unlockConfigs[i] || { cost: 500, level: 4 };
    plots.push({
      id: i,
      isUnlocked: i < 6, // 6 initial plots
      unlockCost: cfg.cost,
      unlockLevel: cfg.level,
      cropId: null,
      plantedAtMs: null,
      isWatered: false,
      isFertilized: false,
    });
  }
  return plots;
}

function initialMarketPrices(): Record<CropId, MarketPriceInfo> {
  const res = {} as Record<CropId, MarketPriceInfo>;
  CROP_LIST.forEach((c) => {
    res[c.id] = {
      price: c.baseCropPrice,
      previousPrice: c.baseCropPrice,
      trend: 'stable',
      percentChange: 0,
      history: [c.baseCropPrice, c.baseCropPrice, c.baseCropPrice],
    };
  });
  return res;
}

export const FarmhandGame: React.FC<FarmhandGameProps> = ({
  userCoins,
  userId,
  onUpdateCoins,
  onNavigateGame,
}) => {
  // Estado del juego
  const [plots, setPlots] = useState<FarmPlot[]>(() => initializePlots());
  const [seedInventory, setSeedInventory] = useState<Record<CropId, number>>(() => ({
    trigo: 3,
    zanahoria: 2,
    patata: 0,
    tomate: 0,
    maiz: 0,
    fresa: 0,
    calabaza: 0,
    sandia: 0,
  }));
  const [cropInventory, setCropInventory] = useState<Record<CropId, number>>(() => ({
    trigo: 0,
    zanahoria: 0,
    patata: 0,
    tomate: 0,
    maiz: 0,
    fresa: 0,
    calabaza: 0,
    sandia: 0,
  }));
  const [farmerLevel, setFarmerLevel] = useState(1);
  const [farmerXp, setFarmerXp] = useState(0);
  const [fertilizerStock, setFertilizerStock] = useState(2);
  const [totalCropsHarvested, setTotalCropsHarvested] = useState(0);
  const [totalCoinsEarned, setTotalCoinsEarned] = useState(0);

  // Herramientas y navegación
  const [selectedCropId, setSelectedCropId] = useState<CropId>('trigo');
  const [activeTool, setActiveTool] = useState<'plant' | 'water' | 'fertilize'>('plant');
  const [activeTab, setActiveTab] = useState<'huerto' | 'lonja' | 'tienda'>('huerto');
  const [buyQuantity, setBuyQuantity] = useState<1 | 5 | 10>(1);

  // Mercado de la lonja (Farmhand fluctuating prices)
  const [marketPrices, setMarketPrices] = useState<Record<CropId, MarketPriceInfo>>(() =>
    initialMarketPrices()
  );
  const [marketTimer, setMarketTimer] = useState(MARKET_CYCLE_SECONDS);
  const [lastMarketEvent, setLastMarketEvent] = useState<string>(
    'La Lonja Municipal abre con precios estables en toda la comarca.'
  );

  // Feedback y reloj
  const [nowMs, setNowMs] = useState(Date.now());
  const [justSoldAll, setJustSoldAll] = useState(false);
  const storageKey = `${STORAGE_KEY_PREFIX}${userId || 'local'}`;

  // Cargar estado guardado y calcular progreso offline
  useEffect(() => {
    try {
      const raw = localStorage.getItem(storageKey);
      if (raw) {
        const parsed: FarmhandState = JSON.parse(raw);
        if (parsed.plots && Array.isArray(parsed.plots)) {
          // Si hubo tiempo transcurrido, conservamos el timestamp para que las plantas avancen
          setPlots(parsed.plots);
        }
        if (parsed.seedInventory) setSeedInventory(parsed.seedInventory);
        if (parsed.cropInventory) setCropInventory(parsed.cropInventory);
        if (parsed.farmerLevel) setFarmerLevel(parsed.farmerLevel);
        if (parsed.farmerXp) setFarmerXp(parsed.farmerXp);
        if (typeof parsed.fertilizerStock === 'number') setFertilizerStock(parsed.fertilizerStock);
        if (typeof parsed.totalCropsHarvested === 'number')
          setTotalCropsHarvested(parsed.totalCropsHarvested);
        if (typeof parsed.totalCoinsEarned === 'number')
          setTotalCoinsEarned(parsed.totalCoinsEarned);
      }
    } catch {}
  }, [storageKey]);

  // Guardar estado
  const saveCurrentState = useCallback(
    (customPlots?: FarmPlot[], customSeeds?: any, customCrops?: any) => {
      try {
        const payload: FarmhandState = {
          plots: customPlots || plots,
          seedInventory: customSeeds || seedInventory,
          cropInventory: customCrops || cropInventory,
          farmerLevel,
          farmerXp,
          fertilizerStock,
          totalCropsHarvested,
          totalCoinsEarned,
          lastSavedMs: Date.now(),
        };
        localStorage.setItem(storageKey, JSON.stringify(payload));
      } catch {}
    },
    [
      plots,
      seedInventory,
      cropInventory,
      farmerLevel,
      farmerXp,
      fertilizerStock,
      totalCropsHarvested,
      totalCoinsEarned,
      storageKey,
    ]
  );

  // Ticker de crecimiento en tiempo real (cada 250ms para fluidez de barras)
  useEffect(() => {
    const interval = setInterval(() => {
      setNowMs(Date.now());
    }, 250);
    return () => clearInterval(interval);
  }, []);

  // Fluctuación del Mercado de Lonja (Mecánica insignia de Jeremy Kahn)
  useEffect(() => {
    const marketInterval = setInterval(() => {
      setMarketTimer((prev) => {
        if (prev <= 1) {
          // Re-calcular cotizaciones de la Lonja
          setMarketPrices((prevPrices) => {
            const next = { ...prevPrices };
            const surgeCrop =
              Math.random() < 0.35
                ? CROP_LIST[Math.floor(Math.random() * CROP_LIST.length)]
                : null;

            CROP_LIST.forEach((c) => {
              const old = prevPrices[c.id]?.price || c.baseCropPrice;
              let multiplier = 1 + (Math.random() * 0.45 - 0.22); // variación +/- 22%

              let trend: 'up' | 'down' | 'stable' | 'surge' = 'stable';
              if (surgeCrop && surgeCrop.id === c.id) {
                multiplier = 1.45 + Math.random() * 0.35; // Subidón 🚀
                trend = 'surge';
              } else if (multiplier > 1.08) {
                trend = 'up';
              } else if (multiplier < 0.92) {
                trend = 'down';
              }

              // Límites entre 65% y 185% del precio base
              const rawNewPrice = Math.round(c.baseCropPrice * multiplier);
              const minAllowed = Math.max(1, Math.round(c.baseCropPrice * 0.65));
              const maxAllowed = Math.round(c.baseCropPrice * 1.85);
              const newPrice = Math.min(Math.max(rawNewPrice, minAllowed), maxAllowed);

              const percent = Math.round(((newPrice - c.baseCropPrice) / c.baseCropPrice) * 100);
              const history = [...(prevPrices[c.id]?.history || [c.baseCropPrice]).slice(-5), newPrice];

              next[c.id] = {
                price: newPrice,
                previousPrice: old,
                trend,
                percentChange: percent,
                history,
              };
            });

            if (surgeCrop) {
              setLastMarketEvent(
                `¡SUBIDÓN EN LA LONJA! Alta demanda de ${surgeCrop.name} (${surgeCrop.emoji}). ¡Aprovecha para vender!`
              );
            } else {
              setLastMarketEvent(
                'Nuevas cotizaciones en la Lonja. Los precios han variado según la oferta del día.'
              );
            }

            return next;
          });

          return MARKET_CYCLE_SECONDS;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(marketInterval);
  }, []);

  // Calcular progreso de maduración de una parcela (0 a 1)
  const getPlotProgress = useCallback(
    (plot: FarmPlot): { progress: number; secondsLeft: number; isReady: boolean } => {
      if (!plot.cropId || !plot.plantedAtMs) {
        return { progress: 0, secondsLeft: 0, isReady: false };
      }
      const crop = CROPS[plot.cropId];
      if (!crop) return { progress: 0, secondsLeft: 0, isReady: false };

      // Si está regada, crece el doble de rápido (divide tiempo requerido a la mitad)
      const requiredDurationMs = plot.isWatered
        ? (crop.growthSeconds * 1000) / 2
        : crop.growthSeconds * 1000;

      const elapsedMs = nowMs - plot.plantedAtMs;
      const progress = Math.min(1, Math.max(0, elapsedMs / requiredDurationMs));
      const remainingMs = Math.max(0, requiredDurationMs - elapsedMs);
      const secondsLeft = Math.ceil(remainingMs / 1000);

      return {
        progress,
        secondsLeft,
        isReady: progress >= 1,
      };
    },
    [nowMs]
  );

  // Añadir XP y gestionar subida de nivel
  const addFarmerXp = (amount: number) => {
    let nextXp = farmerXp + amount;
    let currentLvl = farmerLevel;
    let nextThreshold = getXpForNextLevel(currentLvl);

    while (nextXp >= nextThreshold && currentLvl < 10) {
      nextXp -= nextThreshold;
      currentLvl += 1;
      sound.jackpot();
      confetti({ particleCount: 80, spread: 70 });
      nextThreshold = getXpForNextLevel(currentLvl);
    }

    setFarmerLevel(currentLvl);
    setFarmerXp(nextXp);
  };

  // Comprar semillas en la tienda
  const handleBuySeed = (crop: CropConfig, qty: number) => {
    const totalCost = crop.seedCost * qty;
    if (userCoins < totalCost) {
      sound.broke();
      return;
    }

    sound.coinWin();
    onUpdateCoins(-totalCost);

    setSeedInventory((prev) => {
      const next = {
        ...prev,
        [crop.id]: (prev[crop.id] || 0) + qty,
      };
      saveCurrentState(undefined, next, undefined);
      return next;
    });
  };

  // Desbloquear una nueva parcela
  const handleUnlockPlot = (plot: FarmPlot) => {
    if (farmerLevel < plot.unlockLevel) {
      sound.broke();
      alert(`Necesitas Nivel ${plot.unlockLevel} de Granjero para desbloquear esta parcela.`);
      return;
    }
    if (userCoins < plot.unlockCost) {
      sound.broke();
      return;
    }

    sound.coinWin();
    confetti({ particleCount: 40, spread: 50 });
    onUpdateCoins(-plot.unlockCost);

    setPlots((prev) => {
      const next = prev.map((p) => (p.id === plot.id ? { ...p, isUnlocked: true } : p));
      saveCurrentState(next, undefined, undefined);
      return next;
    });
  };

  // Sembrar en una parcela específica
  const handlePlantPlot = (plotId: number, cropIdToPlant: CropId) => {
    const currentStock = seedInventory[cropIdToPlant] || 0;
    const crop = CROPS[cropIdToPlant];

    // Si no tiene la semilla en almacén pero tiene monedas, auto-comprar 1
    if (currentStock <= 0) {
      if (userCoins >= crop.seedCost) {
        onUpdateCoins(-crop.seedCost);
      } else {
        sound.broke();
        alert(`No tienes semillas de ${crop.name} ni monedas suficientes para comprarla.`);
        return;
      }
    } else {
      setSeedInventory((prev) => ({
        ...prev,
        [cropIdToPlant]: prev[cropIdToPlant] - 1,
      }));
    }

    sound.tap();

    setPlots((prev) => {
      const next = prev.map((p) => {
        if (p.id === plotId) {
          return {
            ...p,
            cropId: cropIdToPlant,
            plantedAtMs: Date.now(),
            isWatered: false,
            isFertilized: false,
          };
        }
        return p;
      });
      saveCurrentState(next, undefined, undefined);
      return next;
    });
  };

  // Regar una parcela
  const handleWaterPlot = (plotId: number) => {
    sound.tap();
    setPlots((prev) => {
      const next = prev.map((p) => {
        if (p.id === plotId && p.cropId && !p.isWatered) {
          return { ...p, isWatered: true };
        }
        return p;
      });
      saveCurrentState(next, undefined, undefined);
      return next;
    });
  };

  // Fertilizar una parcela
  const handleFertilizePlot = (plotId: number) => {
    if (fertilizerStock <= 0) {
      sound.broke();
      alert('No tienes fertilizante en el saco. Puedes comprarlo en la tienda.');
      return;
    }

    sound.coinWin();
    setFertilizerStock((prev) => prev - 1);

    setPlots((prev) => {
      const next = prev.map((p) => {
        if (p.id === plotId && p.cropId && !p.isFertilized) {
          return { ...p, isFertilized: true };
        }
        return p;
      });
      saveCurrentState(next, undefined, undefined);
      return next;
    });
  };

  // Cosechar una parcela madura
  const handleHarvestPlot = (plotId: number) => {
    const targetPlot = plots.find((p) => p.id === plotId);
    if (!targetPlot || !targetPlot.cropId) return;

    const { isReady } = getPlotProgress(targetPlot);
    if (!isReady) return;

    const crop = CROPS[targetPlot.cropId];
    sound.tap();

    // Probabilidad de cosecha doble si estaba fertilizado
    const yieldCount = targetPlot.isFertilized && Math.random() < 0.65 ? 2 : 1;

    setCropInventory((prev) => {
      const next = {
        ...prev,
        [targetPlot.cropId!]: (prev[targetPlot.cropId!] || 0) + yieldCount,
      };
      saveCurrentState(undefined, undefined, next);
      return next;
    });

    addFarmerXp(crop.xpReward * yieldCount);
    setTotalCropsHarvested((prev) => prev + yieldCount);

    setPlots((prev) => {
      const next = prev.map((p) => {
        if (p.id === plotId) {
          return {
            ...p,
            cropId: null,
            plantedAtMs: null,
            isWatered: false,
            isFertilized: false,
          };
        }
        return p;
      });
      saveCurrentState(next, undefined, undefined);
      return next;
    });
  };

  // Clic directo en una parcela
  const handlePlotClick = (plot: FarmPlot) => {
    if (!plot.isUnlocked) {
      handleUnlockPlot(plot);
      return;
    }

    if (!plot.cropId) {
      // Parcela vacía: sembrar
      handlePlantPlot(plot.id, selectedCropId);
      return;
    }

    const { isReady } = getPlotProgress(plot);
    if (isReady) {
      // Parcela madura: cosechar
      handleHarvestPlot(plot.id);
      return;
    }

    // Parcela en crecimiento: aplicar herramienta activa
    if (activeTool === 'water') {
      if (!plot.isWatered) handleWaterPlot(plot.id);
    } else if (activeTool === 'fertilize') {
      if (!plot.isFertilized) handleFertilizePlot(plot.id);
    } else {
      // Si el modo es sembrar pero ya hay cultivo, por defecto regar si le falta agua
      if (!plot.isWatered) {
        handleWaterPlot(plot.id);
      }
    }
  };

  // ACCIÓN MASIVA: Plantar todo el huerto libre
  const handleBulkPlantAll = () => {
    const emptyPlots = plots.filter((p) => p.isUnlocked && !p.cropId);
    if (emptyPlots.length === 0) return;

    const crop = CROPS[selectedCropId];
    let availableSeeds = seedInventory[selectedCropId] || 0;
    let coinsLeft = userCoins;
    let plantedCount = 0;
    let coinsSpent = 0;

    const updatedPlots = [...plots];

    for (const plot of emptyPlots) {
      if (availableSeeds > 0) {
        availableSeeds--;
        plantedCount++;
        const idx = updatedPlots.findIndex((p) => p.id === plot.id);
        updatedPlots[idx] = {
          ...updatedPlots[idx],
          cropId: selectedCropId,
          plantedAtMs: Date.now(),
          isWatered: false,
          isFertilized: false,
        };
      } else if (coinsLeft >= crop.seedCost) {
        coinsLeft -= crop.seedCost;
        coinsSpent += crop.seedCost;
        plantedCount++;
        const idx = updatedPlots.findIndex((p) => p.id === plot.id);
        updatedPlots[idx] = {
          ...updatedPlots[idx],
          cropId: selectedCropId,
          plantedAtMs: Date.now(),
          isWatered: false,
          isFertilized: false,
        };
      } else {
        break;
      }
    }

    if (plantedCount > 0) {
      sound.tap();
      if (coinsSpent > 0) onUpdateCoins(-coinsSpent);
      setSeedInventory((prev) => ({
        ...prev,
        [selectedCropId]: availableSeeds,
      }));
      setPlots(updatedPlots);
      saveCurrentState(updatedPlots, undefined, undefined);
    } else {
      sound.broke();
      alert(`No tienes semillas de ${crop.name} ni monedas para sembrar.`);
    }
  };

  // ACCIÓN MASIVA: Regar todo el huerto
  const handleBulkWaterAll = () => {
    const dryPlots = plots.filter((p) => p.isUnlocked && p.cropId && !p.isWatered);
    if (dryPlots.length === 0) return;

    sound.whoosh();
    setPlots((prev) => {
      const next = prev.map((p) => {
        if (p.isUnlocked && p.cropId && !p.isWatered) {
          return { ...p, isWatered: true };
        }
        return p;
      });
      saveCurrentState(next, undefined, undefined);
      return next;
    });
  };

  // ACCIÓN MASIVA: Cosechar todo lo maduro
  const handleBulkHarvestAll = () => {
    let harvestedCount = 0;
    let totalXpGained = 0;
    const nextCrops = { ...cropInventory };

    const nextPlots = plots.map((p) => {
      if (p.isUnlocked && p.cropId) {
        const { isReady } = getPlotProgress(p);
        if (isReady) {
          const crop = CROPS[p.cropId];
          const yieldCount = p.isFertilized && Math.random() < 0.65 ? 2 : 1;
          harvestedCount += yieldCount;
          totalXpGained += crop.xpReward * yieldCount;
          nextCrops[p.cropId] = (nextCrops[p.cropId] || 0) + yieldCount;
          return {
            ...p,
            cropId: null,
            plantedAtMs: null,
            isWatered: false,
            isFertilized: false,
          };
        }
      }
      return p;
    });

    if (harvestedCount > 0) {
      sound.coinWin();
      confetti({ particleCount: 60, spread: 60 });
      setCropInventory(nextCrops);
      setPlots(nextPlots);
      addFarmerXp(totalXpGained);
      setTotalCropsHarvested((prev) => prev + harvestedCount);
      saveCurrentState(nextPlots, undefined, nextCrops);
    }
  };

  // Vender un tipo de cultivo en la Lonja
  const handleSellCrop = (cropId: CropId) => {
    const count = cropInventory[cropId] || 0;
    if (count <= 0) return;

    const price = marketPrices[cropId]?.price || CROPS[cropId].baseCropPrice;
    const payout = count * price;

    sound.coinWin();
    onUpdateCoins(payout);
    setTotalCoinsEarned((prev) => prev + payout);

    setCropInventory((prev) => {
      const next = { ...prev, [cropId]: 0 };
      saveCurrentState(undefined, undefined, next);
      return next;
    });
  };

  // Vender todo el Granero en la Lonja
  const handleSellAllBarn = () => {
    let totalPayout = 0;
    let totalItems = 0;

    CROP_LIST.forEach((c) => {
      const count = cropInventory[c.id] || 0;
      if (count > 0) {
        const price = marketPrices[c.id]?.price || c.baseCropPrice;
        totalPayout += count * price;
        totalItems += count;
      }
    });

    if (totalPayout <= 0) return;

    sound.coinWin();
    if (totalPayout > 100) {
      confetti({ particleCount: 100, spread: 70, origin: { y: 0.7 } });
    }

    onUpdateCoins(totalPayout);
    setTotalCoinsEarned((prev) => prev + totalPayout);
    setJustSoldAll(true);
    setTimeout(() => setJustSoldAll(false), 2000);

    const emptyCrops = {} as Record<CropId, number>;
    CROP_LIST.forEach((c) => (emptyCrops[c.id] = 0));
    setCropInventory(emptyCrops);
    saveCurrentState(undefined, undefined, emptyCrops);
  };

  // Valoración estimada total del Granero
  const totalBarnValuation = CROP_LIST.reduce((acc, c) => {
    const count = cropInventory[c.id] || 0;
    const price = marketPrices[c.id]?.price || c.baseCropPrice;
    return acc + count * price;
  }, 0);

  const totalCropsInBarn = CROP_LIST.reduce((acc, c) => acc + (cropInventory[c.id] || 0), 0);
  const xpNeeded = getXpForNextLevel(farmerLevel);
  const xpPercent = Math.min(100, Math.floor((farmerXp / xpNeeded) * 100));

  return (
    <div className="w-full space-y-4">
      {/* 1. Header Apple del Huerto */}
      <Card className="p-4 sm:p-5 rounded-2xl bg-surface border border-border/80 shadow-xs relative overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start sm:items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/25 flex items-center justify-center shrink-0 text-emerald-400">
              <Sprout className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base sm:text-lg font-semibold tracking-tight text-foreground">
                  El Huerto SMR
                </h1>
                <Badge variant="outline" className="text-[10px] bg-emerald-500/10 text-emerald-400 border-emerald-500/30">
                  Farmhand SMR
                </Badge>
              </div>
              <p className="text-xs text-foreground-muted">
                Cultiva, riega y consulta las cotizaciones de la Lonja para vender cuando los precios suban.
              </p>
            </div>
          </div>

          {/* Medidor de Nivel & Cartera */}
          <div className="flex flex-wrap sm:flex-nowrap items-center gap-3">
            <div className="px-3.5 py-2 rounded-xl bg-surface-raised border border-border/60 flex items-center gap-3 min-w-[160px]">
              <Award className="w-4 h-4 text-amber-400 shrink-0" />
              <div className="flex-1">
                <div className="flex justify-between text-[11px] font-medium">
                  <span className="text-foreground">Nivel {farmerLevel}</span>
                  <span className="text-foreground-subtle font-mono">{farmerXp}/{xpNeeded} XP</span>
                </div>
                <div className="w-full h-1.5 bg-background/60 rounded-full mt-1 overflow-hidden">
                  <div
                    className="h-full bg-emerald-400 rounded-full transition-all duration-300"
                    style={{ width: `${xpPercent}%` }}
                  />
                </div>
              </div>
            </div>

            <div className="px-3.5 py-2 rounded-xl bg-surface-raised border border-border/60 flex items-center gap-2.5">
              <Coins className="w-4 h-4 text-amber-400" />
              <div>
                <span className="text-[10px] text-foreground-subtle block leading-none">Cartera SMR</span>
                <span className="text-sm font-semibold text-foreground font-mono">
                  {userCoins.toLocaleString()} <span className="text-xs font-normal text-amber-400">🪙</span>
                </span>
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* 2. Barra de Lonja Dinámica (Ticker animado de precios estilo Jeremy Kahn) */}
      <div className="p-3 sm:p-3.5 rounded-2xl bg-surface/70 border border-border/70 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2 text-foreground-muted min-w-0">
          <TrendingUp className="w-4 h-4 text-emerald-400 shrink-0" />
          <span className="truncate">{lastMarketEvent}</span>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-surface-raised border border-border/50 text-[11px] font-mono text-foreground-muted">
            <Clock className="w-3.5 h-3.5 text-foreground-subtle" />
            <span>Lonja en {marketTimer}s</span>
          </div>
          <button
            type="button"
            onClick={() => setActiveTab('lonja')}
            className="text-[11px] text-accent hover:underline font-medium cursor-pointer"
          >
            Ver cotizaciones →
          </button>
        </div>
      </div>

      {/* 3. Selector Segmentado de Pestañas Apple */}
      <div className="flex items-center justify-between gap-2 border-b border-border/60 pb-1">
        <div className="flex items-center p-1 rounded-full bg-surface-raised border border-border/60 gap-1">
          {[
            { id: 'huerto', label: 'Parcelas & Cultivo', icon: Sprout },
            { id: 'lonja', label: 'Lonja & Mercado', icon: TrendingUp, badge: 'Precios' },
            { id: 'tienda', label: 'Tienda de Semillas', icon: ShoppingBag },
          ].map((tab) => {
            const isActive = activeTab === tab.id;
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => {
                  setActiveTab(tab.id as any);
                  sound.tap();
                }}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all cursor-pointer active:scale-95 touch-manipulation ${
                  isActive
                    ? 'bg-foreground text-background font-semibold shadow-xs'
                    : 'text-foreground-muted hover:text-foreground'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
                {tab.badge && (
                  <span
                    className={`text-[9px] px-1.5 py-0.2 rounded-full font-mono ${
                      isActive ? 'bg-background/25 text-background' : 'bg-emerald-500/15 text-emerald-400'
                    }`}
                  >
                    {tab.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Acceso Rápido a Venta de Granero */}
        {totalCropsInBarn > 0 && (
          <Button
            variant="primary"
            size="sm"
            onClick={handleSellAllBarn}
            className="rounded-full gap-1.5 shadow-xs bg-emerald-600 hover:bg-emerald-500 text-white"
          >
            <Warehouse className="w-3.5 h-3.5" />
            <span>Vender Granero (+{totalBarnValuation.toLocaleString()} 🪙)</span>
          </Button>
        )}
      </div>

      {/* PESTAÑA 1: EL HUERTO (PARCELAS) */}
      {activeTab === 'huerto' && (
        <div className="space-y-4">
          {/* Barra de Herramientas y Acciones Masivas */}
          <Card className="p-3.5 rounded-2xl bg-surface border border-border/70 flex flex-wrap items-center justify-between gap-3">
            {/* Semilla seleccionada para sembrar */}
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[11px] font-mono text-foreground-subtle uppercase">Semilla:</span>
              <div className="flex items-center gap-1 overflow-x-auto scrollbar-none py-0.5">
                {CROP_LIST.map((crop) => {
                  const isSelected = selectedCropId === crop.id;
                  const isUnlocked = farmerLevel >= crop.requiredLevel;
                  const stock = seedInventory[crop.id] || 0;

                  return (
                    <button
                      key={crop.id}
                      type="button"
                      disabled={!isUnlocked}
                      onClick={() => {
                        setSelectedCropId(crop.id);
                        sound.tap();
                      }}
                      className={`flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-medium border transition-all cursor-pointer ${
                        !isUnlocked
                          ? 'opacity-40 bg-surface-raised border-transparent cursor-not-allowed'
                          : isSelected
                          ? 'bg-foreground text-background font-semibold border-foreground shadow-xs'
                          : 'bg-surface-raised text-foreground-muted border-border/50 hover:text-foreground'
                      }`}
                    >
                      <span>{crop.emoji}</span>
                      <span className="hidden sm:inline">{crop.name}</span>
                      {stock > 0 && (
                        <span className={`text-[10px] font-mono px-1 rounded-full ${isSelected ? 'bg-background/30 text-background' : 'bg-emerald-500/20 text-emerald-400'}`}>
                          x{stock}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Acciones de Campo Masivas */}
            <div className="flex items-center gap-1.5">
              <Button
                variant="secondary"
                size="sm"
                onClick={handleBulkPlantAll}
                className="rounded-xl text-xs gap-1.5 h-8"
                title="Planta la semilla seleccionada en todas las parcelas libres"
              >
                <Sprout className="w-3.5 h-3.5 text-emerald-400" />
                <span>Plantar todo</span>
              </Button>

              <Button
                variant="secondary"
                size="sm"
                onClick={handleBulkWaterAll}
                className="rounded-xl text-xs gap-1.5 h-8"
                title="Riega todas las parcelas secas (crecen x2 más rápido)"
              >
                <Droplets className="w-3.5 h-3.5 text-blue-400" />
                <span>Regar todo</span>
              </Button>

              <Button
                variant="primary"
                size="sm"
                onClick={handleBulkHarvestAll}
                className="rounded-xl text-xs gap-1.5 h-8 bg-amber-600 hover:bg-amber-500 text-white"
                title="Recoge todas las cosechas listas"
              >
                <Check className="w-3.5 h-3.5" />
                <span>Cosechar todo</span>
              </Button>
            </div>
          </Card>

          {/* Cuadrícula de Parcelas (Grid 4x4) */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-3.5">
            {plots.map((plot) => {
              if (!plot.isUnlocked) {
                const canUnlock = farmerLevel >= plot.unlockLevel && userCoins >= plot.unlockCost;
                return (
                  <div
                    key={plot.id}
                    onClick={() => handleUnlockPlot(plot)}
                    className="h-32 sm:h-36 rounded-2xl border border-dashed border-border/80 bg-surface/40 hover:bg-surface-raised flex flex-col items-center justify-center p-3 text-center cursor-pointer transition-all active:scale-[0.98] group"
                  >
                    <div className="w-8 h-8 rounded-full bg-surface-raised border border-border/60 flex items-center justify-center text-foreground-subtle group-hover:text-foreground transition-colors mb-1.5">
                      <Lock className="w-4 h-4" />
                    </div>
                    <span className="text-xs font-semibold text-foreground">
                      Parcela {plot.id + 1}
                    </span>
                    <span className="text-[11px] text-foreground-muted font-mono mt-0.5">
                      {plot.unlockCost} 🪙 · Nvl {plot.unlockLevel}
                    </span>
                    <span className="text-[10px] text-accent mt-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      Desbrozar terreno
                    </span>
                  </div>
                );
              }

              // Parcela desbloqueada pero vacía
              if (!plot.cropId) {
                const selectedCrop = CROPS[selectedCropId];
                return (
                  <div
                    key={plot.id}
                    onClick={() => handlePlotClick(plot)}
                    className="h-32 sm:h-36 rounded-2xl border border-border/60 bg-gradient-to-b from-[#2a1e17]/40 to-[#1c140f]/60 hover:border-emerald-500/50 flex flex-col items-center justify-center p-3 text-center cursor-pointer transition-all active:scale-[0.98] group relative overflow-hidden"
                  >
                    <div className="w-9 h-9 rounded-2xl bg-amber-950/40 border border-amber-900/40 flex items-center justify-center text-amber-500/80 group-hover:text-amber-400 group-hover:scale-110 transition-all mb-1">
                      <Plus className="w-4 h-4" />
                    </div>
                    <span className="text-xs font-medium text-foreground-muted group-hover:text-foreground">
                      Tierra lista
                    </span>
                    <span className="text-[10px] text-emerald-400 font-mono mt-0.5">
                      + Sembrar {selectedCrop.name.split(' ')[0]}
                    </span>
                  </div>
                );
              }

              // Parcela con cultivo
              const crop = CROPS[plot.cropId];
              const { progress, secondsLeft, isReady } = getPlotProgress(plot);

              return (
                <div
                  key={plot.id}
                  onClick={() => handlePlotClick(plot)}
                  className={`h-32 sm:h-36 rounded-2xl border p-3 flex flex-col justify-between cursor-pointer transition-all active:scale-[0.98] relative overflow-hidden ${
                    isReady
                      ? 'bg-emerald-950/20 border-emerald-500/60 shadow-xs shadow-emerald-500/10'
                      : 'bg-surface/80 border-border/70 hover:border-border'
                  }`}
                >
                  {/* Cabecera de la parcela: estado de riego y fertilizante */}
                  <div className="flex items-center justify-between w-full">
                    <span className="text-lg">{crop.emoji}</span>
                    <div className="flex items-center gap-1">
                      {plot.isWatered && (
                        <span className="w-5 h-5 rounded-full bg-blue-500/20 border border-blue-500/40 flex items-center justify-center text-[10px] text-blue-400" title="Regada: Crece x2 más rápido">
                          💧
                        </span>
                      )}
                      {plot.isFertilized && (
                        <span className="w-5 h-5 rounded-full bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-[10px] text-amber-400" title="Fertilizada: Cosecha doble">
                          ✨
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Cuerpo central: Nombre y Estado */}
                  <div className="text-center my-auto">
                    <span className="text-xs font-semibold text-foreground block truncate">
                      {crop.name}
                    </span>
                    {isReady ? (
                      <span className="inline-block mt-1 px-2 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 text-[10px] font-semibold animate-pulse">
                        ¡LISTA PARA COSECHAR!
                      </span>
                    ) : (
                      <span className="text-[10px] font-mono text-foreground-subtle block mt-0.5">
                        {secondsLeft}s restantes
                      </span>
                    )}
                  </div>

                  {/* Barra de progreso inferior */}
                  <div className="w-full">
                    <div className="w-full h-1.5 bg-surface-raised rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-300 ${
                          isReady ? 'bg-emerald-400' : 'bg-accent'
                        }`}
                        style={{ width: `${Math.round(progress * 100)}%` }}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* PESTAÑA 2: LONJA & MERCADO (FLUX DE PRECIOS JEREMY KAHN) */}
      {activeTab === 'lonja' && (
        <div className="space-y-4">
          {/* Tarjeta de Resumen del Granero y Lonja */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <Card className="p-4 rounded-2xl bg-surface border border-border/70">
              <span className="text-xs text-foreground-muted block">Cosechas en el Granero</span>
              <span className="text-xl font-bold text-foreground font-mono mt-1 block">
                {totalCropsInBarn} <span className="text-xs font-normal text-foreground-subtle">unidades</span>
              </span>
            </Card>

            <Card className="p-4 rounded-2xl bg-surface border border-border/70">
              <span className="text-xs text-foreground-muted block">Valoración de Lonja Actual</span>
              <span className="text-xl font-bold text-emerald-400 font-mono mt-1 block">
                +{totalBarnValuation.toLocaleString()} <span className="text-xs font-normal">🪙</span>
              </span>
            </Card>

            <Card className="p-4 rounded-2xl bg-surface border border-border/70 flex items-center justify-between">
              <div>
                <span className="text-xs text-foreground-muted block">Próxima Variación</span>
                <span className="text-sm font-semibold text-foreground font-mono mt-0.5 block">
                  en {marketTimer} segundos
                </span>
              </div>
              <Button
                variant="primary"
                size="sm"
                disabled={totalCropsInBarn <= 0}
                onClick={handleSellAllBarn}
                className="rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white shadow-xs"
              >
                Vender Todo
              </Button>
            </Card>
          </div>

          {/* Tabla de Cotizaciones de la Lonja */}
          <Card className="p-4 rounded-2xl bg-surface border border-border/70 overflow-hidden">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h3 className="text-xs font-semibold uppercase tracking-wider text-foreground-subtle font-mono">
                  Cotización Oficial de Cosechas
                </h3>
                <p className="text-[11px] text-foreground-muted">
                  Vende tus cultivos cuando la tendencia marque subidón 🚀 para multiplicar tus ganancias.
                </p>
              </div>
            </div>

            <div className="divide-y divide-border/50">
              {CROP_LIST.map((crop) => {
                const info = marketPrices[crop.id] || {
                  price: crop.baseCropPrice,
                  trend: 'stable',
                  percentChange: 0,
                  history: [crop.baseCropPrice],
                };
                const inBarn = cropInventory[crop.id] || 0;
                const canSell = inBarn > 0;

                return (
                  <div
                    key={crop.id}
                    className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{crop.emoji}</span>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-foreground">{crop.name}</span>
                          <span className="text-[10px] font-mono text-foreground-subtle">
                            Base: {crop.baseCropPrice} 🪙
                          </span>
                        </div>
                        <span className="text-[11px] text-foreground-muted block">
                          En granero: <strong className="text-foreground">{inBarn} uds</strong>
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between sm:justify-end gap-4">
                      {/* Cotización actual y tendencia */}
                      <div className="text-right">
                        <div className="flex items-center gap-1.5 justify-end">
                          <span className="font-mono font-bold text-sm text-foreground">
                            {info.price} 🪙
                          </span>
                          {info.trend === 'surge' ? (
                            <Badge variant="outline" className="text-[9px] bg-amber-500/20 text-amber-300 border-amber-500/40">
                              🚀 ¡SUBIDÓN!
                            </Badge>
                          ) : info.percentChange > 0 ? (
                            <span className="text-[11px] font-mono text-emerald-400 font-semibold flex items-center">
                              <TrendingUp className="w-3 h-3 mr-0.5" /> +{info.percentChange}%
                            </span>
                          ) : info.percentChange < 0 ? (
                            <span className="text-[11px] font-mono text-red-400 font-semibold flex items-center">
                              <TrendingDown className="w-3 h-3 mr-0.5" /> {info.percentChange}%
                            </span>
                          ) : (
                            <span className="text-[11px] font-mono text-foreground-subtle">
                              0%
                            </span>
                          )}
                        </div>
                        <span className="text-[10px] text-foreground-subtle font-mono block">
                          Total: {(inBarn * info.price).toLocaleString()} 🪙
                        </span>
                      </div>

                      {/* Botón de venta individual */}
                      <Button
                        variant="secondary"
                        size="sm"
                        disabled={!canSell}
                        onClick={() => handleSellCrop(crop.id)}
                        className="rounded-xl text-xs h-8 shrink-0 min-w-[90px]"
                      >
                        Vender {inBarn > 0 ? `(${inBarn})` : ''}
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>
        </div>
      )}

      {/* PESTAÑA 3: TIENDA DE SEMILLAS & INSUMOS */}
      {activeTab === 'tienda' && (
        <div className="space-y-4">
          {/* Selector de Cantidad de Compra */}
          <div className="flex items-center justify-between p-3 rounded-2xl bg-surface border border-border/70 text-xs">
            <span className="text-foreground-muted">Cantidad por compra:</span>
            <div className="flex items-center p-0.5 rounded-xl bg-surface-raised border border-border/50 gap-0.5">
              {([1, 5, 10] as const).map((q) => (
                <button
                  key={q}
                  type="button"
                  onClick={() => setBuyQuantity(q)}
                  className={`px-3 py-1 rounded-lg font-mono text-xs font-medium cursor-pointer transition-all ${
                    buyQuantity === q
                      ? 'bg-foreground text-background font-semibold shadow-xs'
                      : 'text-foreground-muted hover:text-foreground'
                  }`}
                >
                  x{q}
                </button>
              ))}
            </div>
          </div>

          {/* Catálogo de Semillas */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {CROP_LIST.map((crop) => {
              const isUnlocked = farmerLevel >= crop.requiredLevel;
              const cost = crop.seedCost * buyQuantity;
              const canAfford = userCoins >= cost;
              const inStock = seedInventory[crop.id] || 0;

              return (
                <Card
                  key={crop.id}
                  className={`p-4 rounded-2xl border transition-all ${
                    !isUnlocked
                      ? 'bg-surface/40 border-border/40 opacity-60'
                      : 'bg-surface border-border/70 hover:border-border'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <span className="text-3xl">{crop.emoji}</span>
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="text-xs font-semibold text-foreground">{crop.name}</h4>
                          <Badge variant="outline" className="text-[9px]">
                            {crop.badge}
                          </Badge>
                        </div>
                        <p className="text-[11px] text-foreground-muted mt-0.5">
                          {crop.desc}
                        </p>
                        <div className="flex items-center gap-3 mt-2 text-[10px] font-mono text-foreground-subtle">
                          <span>⏱️ {crop.growthSeconds}s</span>
                          <span>⭐ +{crop.xpReward} XP</span>
                          <span>📦 En saco: {inStock}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="mt-3.5 pt-3 border-t border-border/50 flex items-center justify-between">
                    <div>
                      <span className="text-[10px] text-foreground-subtle block">Precio ({buyQuantity} uds)</span>
                      <span className="text-xs font-bold text-foreground font-mono">
                        {cost} 🪙
                      </span>
                    </div>

                    <Button
                      variant={canAfford && isUnlocked ? 'primary' : 'secondary'}
                      size="sm"
                      disabled={!isUnlocked || !canAfford}
                      onClick={() => handleBuySeed(crop, buyQuantity)}
                      className="rounded-xl text-xs h-8"
                    >
                      {!isUnlocked
                        ? `Req. Nvl ${crop.requiredLevel}`
                        : !canAfford
                        ? 'Sin monedas'
                        : `Comprar x${buyQuantity}`}
                    </Button>
                  </div>
                </Card>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
