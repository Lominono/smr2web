'use client';

import React, { useState, useEffect, useRef } from 'react';
import confetti from 'canvas-confetti';
import {
  Flame,
  Zap,
  Shield,
  ShieldAlert,
  Coins,
  ArrowLeft,
  Search,
  Cpu,
  Scissors,
  Coffee,
  RotateCw,
  Trophy,
  AlertTriangle,
  Heart,
  Skull,
  User,
  HelpCircle,
  X,
  Volume2,
  VolumeX,
  Sparkles,
  Crosshair,
  TrendingUp,
} from 'lucide-react';
import { sound } from '@/lib/audio';
import { UserProfile } from '@/lib/types';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';

export interface RivalProfile {
  id: string;
  name: string;
  nickname: string;
  title: string;
  bet: number;
  maxHp: number;
  difficulty: 'Fácil' | 'Medio' | 'Difícil' | 'Boss';
  avatarInitials: string;
  introQuote: string;
  hurtQuote: string;
  winQuote: string;
  loseQuote: string;
}

export const RIVALS: RivalProfile[] = [
  {
    id: 'david',
    name: 'David',
    nickname: 'El Estratega',
    title: 'Compañero de aula',
    bet: 50,
    maxHp: 2,
    difficulty: 'Fácil',
    avatarInitials: 'DA',
    introQuote: 'Calculemos bien las probabilidades del tambor antes de apretar el gatillo.',
    hurtQuote: 'Bien jugado... no esperaba esa bala.',
    winQuote: 'Buena ronda. Las estadísticas estaban de mi lado.',
    loseQuote: 'Bien jugado, has medido mejor los turnos.',
  },
  {
    id: 'repetidor',
    name: 'Dani',
    nickname: 'El Repetidor del Fondo',
    title: '3 años cursando 2º SMR',
    bet: 150,
    maxHp: 3,
    difficulty: 'Medio',
    avatarInitials: 'DN',
    introQuote: 'Me sé todos los exámenes de Redes y todas las probabilidades de este tambor. Tira si te atreves.',
    hurtQuote: 'Bah, un rasguño. Me tomo un Monster y como nuevo.',
    winQuote: 'Para ser novato has aguantado bien, pero la veteranía es un grado.',
    loseQuote: 'Menos mal que en las prácticas de montaje no se juegan monedas...',
  },
  {
    id: 'empollon',
    name: 'Álex',
    nickname: 'El Empollón de Redes',
    title: 'Matrícula en Seguridad Informática',
    bet: 350,
    maxHp: 3,
    difficulty: 'Difícil',
    avatarInitials: 'AL',
    introQuote: 'He calculado la desviación estándar y el checksum del cargador. Tu probabilidad de supervivencia es baja.',
    hurtQuote: 'Error de paridad imprevisto... recalculando algoritmo.',
    winQuote: 'Las matemáticas nunca fallan. Deberías repasar binario.',
    loseQuote: 'Una anomalía estadística imperdonable... enhorabuena.',
  },
  {
    id: 'delegado',
    name: 'Marcos',
    nickname: 'El Delegado de Clase',
    title: 'Autoridad Suprema del Aula 35',
    bet: 800,
    maxHp: 4,
    difficulty: 'Boss',
    avatarInitials: 'MA',
    introQuote: 'Como delegado tengo la custodia del aula y de la banca. Si quieres mis 800 monedas vas a tener que sudar.',
    hurtQuote: '¡Falta leve por agresión a la autoridad del aula!',
    winQuote: 'Las monedas quedan confiscadas para la excursión de fin de curso.',
    loseQuote: 'Impresionante jugada. Me quito el sombrero de delegado.',
  },
];

export type ItemType = 'multimetro' | 'cable_rj45' | 'crimpadora' | 'monster' | 'inversor';

export interface ItemDef {
  id: ItemType;
  name: string;
  shortDesc: string;
  icon: any;
}

export const ITEMS: Record<ItemType, ItemDef> = {
  multimetro: {
    id: 'multimetro',
    name: 'Multímetro Fluke',
    shortDesc: 'Inspecciona en secreto si la recámara actual tiene BALA REAL o SALVA.',
    icon: Search,
  },
  cable_rj45: {
    id: 'cable_rj45',
    name: 'Cable RJ45 (Esposas)',
    shortDesc: 'Inmoviliza al oponente: se salta por completo su siguiente turno.',
    icon: Cpu,
  },
  crimpadora: {
    id: 'crimpadora',
    name: 'Crimpadora Afilada',
    shortDesc: 'El siguiente disparo inflige el DOBLE de daño (2 vidas en vez de 1).',
    icon: Scissors,
  },
  monster: {
    id: 'monster',
    name: 'Lata de Monster',
    shortDesc: 'Bebida energética de informática: recupera +1 punto de vida inmediatamente.',
    icon: Coffee,
  },
  inversor: {
    id: 'inversor',
    name: 'Inversor de Polaridad',
    shortDesc: 'Convierte la bala actual: si es Salva pasa a Real, y si es Real pasa a Salva.',
    icon: RotateCw,
  },
};

const ALL_ITEM_KEYS: ItemType[] = ['multimetro', 'cable_rj45', 'crimpadora', 'monster', 'inversor'];

interface DuelStats {
  wins: number;
  losses: number;
  currentStreak: number;
  bestStreak: number;
  coinsWon: number;
}

interface TacticalRouletteDuelProps {
  user: UserProfile | null;
  onOpenAuth: () => void;
  onUpdateCoins: (newCoins: number) => void;
}

export const TacticalRouletteDuel: React.FC<TacticalRouletteDuelProps> = ({
  user,
  onOpenAuth,
  onUpdateCoins,
}) => {
  // Estado de selección de rival
  const [selectedRival, setSelectedRival] = useState<RivalProfile | null>(null);
  const [inDuel, setInDuel] = useState<boolean>(false);

  // Estadísticas del jugador
  const [stats, setStats] = useState<DuelStats>(() => {
    if (typeof window !== 'undefined') {
      try {
        const raw = localStorage.getItem('smr2_roulette_stats');
        if (raw) return JSON.parse(raw);
      } catch {}
    }
    return { wins: 0, losses: 0, currentStreak: 0, bestStreak: 0, coinsWon: 0 };
  });

  const saveStats = (nextStats: DuelStats) => {
    setStats(nextStats);
    try {
      localStorage.setItem('smr2_roulette_stats', JSON.stringify(nextStats));
    } catch {}
  };

  // Estado del duelo activo
  const [playerHp, setPlayerHp] = useState<number>(3);
  const [rivalHp, setRivalHp] = useState<number>(3);
  const [magazine, setMagazine] = useState<boolean[]>([]); // true = bala real, false = salva
  const [remainingLives, setRemainingLives] = useState<number>(0);
  const [remainingBlanks, setRemainingBlanks] = useState<number>(0);
  const [turn, setTurn] = useState<'player' | 'rival'>('player');

  // Inventarios de objetos (máx 4 por combatiente)
  const [playerItems, setPlayerItems] = useState<ItemType[]>([]);
  const [rivalItems, setRivalItems] = useState<ItemType[]>([]);

  // Modificadores tácticos
  const [isDoubleDamage, setIsDoubleDamage] = useState<boolean>(false);
  const [isRivalHandcuffed, setIsRivalHandcuffed] = useState<boolean>(false);
  const [isPlayerHandcuffed, setIsPlayerHandcuffed] = useState<boolean>(false);

  // Estados visuales y de suspense
  const [screenShake, setScreenShake] = useState<boolean>(false);
  const [muzzleFlash, setMuzzleFlash] = useState<'live' | 'blank' | null>(null);
  const [isAimingTarget, setIsAimingTarget] = useState<'self' | 'rival' | null>(null);
  const [isActionInProgress, setIsActionInProgress] = useState<boolean>(false);
  const [actionLog, setActionLog] = useState<string[]>([]);
  const [secretInspection, setSecretInspection] = useState<boolean | null>(null);
  const [gameResult, setGameResult] = useState<'won' | 'lost' | null>(null);
  const [showRulesModal, setShowRulesModal] = useState<boolean>(false);

  // Mensaje actual del rival
  const [rivalSpeech, setRivalSpeech] = useState<string>('');

  // 1. Iniciar duelo contra un rival
  const handleStartDuel = (rival: RivalProfile) => {
    if (!user) {
      onOpenAuth();
      return;
    }

    if (user.coins < rival.bet) {
      alert(`Saldo insuficiente. Necesitas al menos ${rival.bet} monedas para retar a ${rival.name}.`);
      return;
    }

    // Cobrar la apuesta inicial
    sound.tap();
    onUpdateCoins(user.coins - rival.bet);

    setSelectedRival(rival);
    setPlayerHp(rival.maxHp);
    setRivalHp(rival.maxHp);
    setGameResult(null);
    setRivalSpeech(rival.introQuote);
    setIsRivalHandcuffed(false);
    setIsPlayerHandcuffed(false);
    setIsDoubleDamage(false);
    setSecretInspection(null);
    setPlayerItems([]);
    setRivalItems([]);
    setActionLog([`¡Duelo iniciado contra ${rival.name} (${rival.nickname})! Bote en juego: ${rival.bet * 2} monedas.`]);
    setInDuel(true);

    // Cargar primera ronda
    initRound(rival.maxHp);
  };

  // 2. Inicializar o recargar ronda del cargador
  const initRound = (maxHp: number) => {
    // Generar entre 3 y 5 balas (mínimo 1 real y 1 salva)
    const liveCount = Math.floor(Math.random() * 2) + 1; // 1 o 2 reales
    const blankCount = Math.floor(Math.random() * 2) + 2; // 2 o 3 salvas

    const shells: boolean[] = [];
    for (let i = 0; i < liveCount; i++) shells.push(true);
    for (let i = 0; i < blankCount; i++) shells.push(false);

    // Barajar aleatoriamente
    for (let i = shells.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shells[i], shells[j]] = [shells[j], shells[i]];
    }

    setMagazine(shells);
    setRemainingLives(liveCount);
    setRemainingBlanks(blankCount);
    setIsDoubleDamage(false);
    setSecretInspection(null);

    try {
      sound.pumpShotgun();
    } catch {}

    // Repartir 2 objetos al jugador y 2 al rival si tienen hueco (máx 4)
    setPlayerItems((prev) => {
      const next = [...prev];
      while (next.length < 4 && next.length < prev.length + 2) {
        const randomItem = ALL_ITEM_KEYS[Math.floor(Math.random() * ALL_ITEM_KEYS.length)];
        next.push(randomItem);
      }
      return next;
    });

    setRivalItems((prev) => {
      const next = [...prev];
      while (next.length < 4 && next.length < prev.length + 2) {
        const randomItem = ALL_ITEM_KEYS[Math.floor(Math.random() * ALL_ITEM_KEYS.length)];
        next.push(randomItem);
      }
      return next;
    });

    setActionLog((prev) => [
      `Cargador recargado: ${liveCount} ${liveCount === 1 ? 'Real' : 'Reales'} 🔥 y ${blankCount} ${blankCount === 1 ? 'Salva' : 'Salvas'} ⚪.`,
      ...prev.slice(0, 5),
    ]);
  };

  // Trigger screen shake & muzzle flash
  const triggerVisualImpact = (type: 'live' | 'blank') => {
    setMuzzleFlash(type);
    if (type === 'live') {
      setScreenShake(true);
      setTimeout(() => setScreenShake(false), 500);
    }
    setTimeout(() => setMuzzleFlash(null), 350);
  };

  // Finalizar partida con victoria
  const handleVictory = () => {
    if (!selectedRival || !user) return;
    setGameResult('won');
    sound.jackpot();
    confetti({ particleCount: 130, spread: 85, origin: { y: 0.6 } });
    const pot = selectedRival.bet * 2;
    onUpdateCoins(user.coins + pot);
    setRivalSpeech(selectedRival.loseQuote);
    setActionLog((prev) => [`¡VICTORIA! Has derrotado a ${selectedRival.name} y ganado el bote de ${pot} monedas.`, ...prev]);

    // Actualizar racha y estadísticas
    const nextStreak = stats.currentStreak + 1;
    saveStats({
      wins: stats.wins + 1,
      losses: stats.losses,
      currentStreak: nextStreak,
      bestStreak: Math.max(stats.bestStreak, nextStreak),
      coinsWon: stats.coinsWon + selectedRival.bet,
    });
  };

  // Finalizar partida con derrota
  const handleDefeat = () => {
    if (!selectedRival) return;
    setGameResult('lost');
    sound.broke();
    setRivalSpeech(selectedRival.winQuote);
    setActionLog((prev) => [`Has sido eliminado por ${selectedRival.name}. Has perdido ${selectedRival.bet} monedas.`, ...prev]);

    // Resetear racha
    saveStats({
      wins: stats.wins,
      losses: stats.losses + 1,
      currentStreak: 0,
      bestStreak: stats.bestStreak,
      coinsWon: stats.coinsWon - selectedRival.bet,
    });
  };

  // 3. Jugador usa un objeto de su inventario
  const handleUsePlayerItem = (itemType: ItemType, index: number) => {
    if (isActionInProgress || turn !== 'player' || gameResult) return;

    setPlayerItems((prev) => prev.filter((_, i) => i !== index));

    switch (itemType) {
      case 'multimetro': {
        try { sound.electricZap(); } catch { sound.itemSound(); }
        const currentShell = magazine[0];
        setSecretInspection(currentShell);
        setActionLog((prev) => [
          `Usaste Multímetro: La recámara actual contiene -> ${currentShell ? 'BALA REAL 🔥' : 'SALVA EN BLANCO ⚪'}.`,
          ...prev.slice(0, 5),
        ]);
        break;
      }
      case 'cable_rj45': {
        try { sound.itemSound(); } catch {}
        setIsRivalHandcuffed(true);
        setActionLog((prev) => [
          `Usaste Cable RJ45: ¡Has esposado a ${selectedRival?.name}! Se saltará su siguiente turno.`,
          ...prev.slice(0, 5),
        ]);
        break;
      }
      case 'crimpadora': {
        try { sound.pumpShotgun(); } catch { sound.itemSound(); }
        setIsDoubleDamage(true);
        setActionLog((prev) => [
          'Usaste Crimpadora: El cañón está serrado. ¡El siguiente disparo causará 2 PUNTOS DE DAÑO!',
          ...prev.slice(0, 5),
        ]);
        break;
      }
      case 'monster': {
        try { sound.bottlePop(); } catch { sound.itemSound(); }
        if (!selectedRival) return;
        setPlayerHp((prev) => Math.min(selectedRival.maxHp, prev + 1));
        setActionLog((prev) => [
          'Bebiste una lata de Monster: Has recuperado +1 punto de salud.',
          ...prev.slice(0, 5),
        ]);
        break;
      }
      case 'inversor': {
        try { sound.electricZap(); } catch { sound.itemSound(); }
        setMagazine((prev) => {
          if (prev.length === 0) return prev;
          const inverted = [...prev];
          inverted[0] = !inverted[0];
          return inverted;
        });
        setSecretInspection(null);
        // Ajustar conteos restantes
        setRemainingLives((prev) => (magazine[0] ? Math.max(0, prev - 1) : prev + 1));
        setRemainingBlanks((prev) => (magazine[0] ? prev + 1 : Math.max(0, prev - 1)));
        setActionLog((prev) => [
          'Usaste Inversor de Polaridad: La polaridad de la bala en la recámara ha sido invertida.',
          ...prev.slice(0, 5),
        ]);
        break;
      }
    }
  };

  // 4. Acción de disparo del jugador con suspense
  const handleShoot = (target: 'self' | 'rival') => {
    if (isActionInProgress || turn !== 'player' || gameResult || magazine.length === 0) return;

    setIsActionInProgress(true);
    setIsAimingTarget(target);
    setSecretInspection(null);

    // Suspense: Amartillar y latido
    try {
      sound.cockGun();
      setTimeout(() => {
        try { sound.heartbeat(); } catch {}
      }, 150);
    } catch {}

    const isLive = magazine[0];
    const damage = isDoubleDamage ? 2 : 1;
    setIsDoubleDamage(false);

    const nextMag = magazine.slice(1);
    const nextLives = isLive ? Math.max(0, remainingLives - 1) : remainingLives;
    const nextBlanks = !isLive ? Math.max(0, remainingBlanks - 1) : remainingBlanks;

    setTimeout(() => {
      setMagazine(nextMag);
      setRemainingLives(nextLives);
      setRemainingBlanks(nextBlanks);
      setIsAimingTarget(null);

      if (target === 'self') {
        if (isLive) {
          // Se disparó a sí mismo con bala real
          sound.gunshotBoom();
          triggerVisualImpact('live');
          const nextHp = Math.max(0, playerHp - damage);
          setPlayerHp(nextHp);
          setActionLog((prev) => [
            `¡BOOM! Te disparaste a ti mismo con BALA REAL (-${damage} de vida).`,
            ...prev.slice(0, 5),
          ]);

          if (nextHp <= 0) {
            handleDefeat();
            setIsActionInProgress(false);
            return;
          }

          // Pasa turno al rival
          passTurnToRival(nextMag);
        } else {
          // Se disparó a sí mismo con salva (CONSERVA TURNO)
          sound.dryFireClick();
          triggerVisualImpact('blank');
          setActionLog((prev) => [
            '¡CLICK! Te disparaste con una SALVA en blanco. ¡Conservas el turno!',
            ...prev.slice(0, 5),
          ]);

          // Comprobar si el cargador quedó vacío
          if (nextMag.length === 0) {
            setTimeout(() => {
              setActionLog((prev) => ['Cargador vacío. Recargando nueva tanda...', ...prev.slice(0, 5)]);
              if (selectedRival) initRound(selectedRival.maxHp);
              setIsActionInProgress(false);
            }, 900);
          } else {
            setIsActionInProgress(false);
          }
        }
      } else {
        // Disparó al rival
        if (isLive) {
          sound.gunshotBoom();
          triggerVisualImpact('live');
          const nextHp = Math.max(0, rivalHp - damage);
          setRivalHp(nextHp);
          if (selectedRival) setRivalSpeech(selectedRival.hurtQuote);
          setActionLog((prev) => [
            `¡BOOM! Disparaste a ${selectedRival?.name} con BALA REAL (-${damage} de vida).`,
            ...prev.slice(0, 5),
          ]);

          if (nextHp <= 0) {
            handleVictory();
            setIsActionInProgress(false);
            return;
          }
        } else {
          // Salva disparada al rival (Fallo)
          sound.dryFireClick();
          triggerVisualImpact('blank');
          setActionLog((prev) => [
            `¡CLICK! Disparaste a ${selectedRival?.name} pero la recámara estaba en SALVA.`,
            ...prev.slice(0, 5),
          ]);
        }

        // Pasa turno al rival
        passTurnToRival(nextMag);
      }
    }, 550);
  };

  // Pasar turno al rival con verificación de esposas / cargador vacío
  const passTurnToRival = (currentMag: boolean[]) => {
    if (currentMag.length === 0) {
      setTimeout(() => {
        setActionLog((prev) => ['Cargador vacío. Recargando nueva tanda...', ...prev.slice(0, 5)]);
        if (selectedRival) initRound(selectedRival.maxHp);
      }, 900);
    }

    if (isRivalHandcuffed) {
      setIsRivalHandcuffed(false);
      setActionLog((prev) => [`${selectedRival?.name} está esposado con el cable RJ45. ¡Salta su turno!`, ...prev.slice(0, 5)]);
      setIsActionInProgress(false);
      setTurn('player');
      return;
    }

    setTurn('rival');
    setIsActionInProgress(false);
  };

  // 5. Turno de la IA del rival (Táctica con cálculo de probabilidades y uso de objetos)
  useEffect(() => {
    if (turn !== 'rival' || gameResult || isActionInProgress || !selectedRival) return;

    let isMounted = true;
    setIsActionInProgress(true);

    const rivalTimer = setTimeout(() => {
      if (!isMounted || gameResult) return;

      let currentMag = [...magazine];
      let rivalDmgMult = 1;
      let knownBullet: boolean | null = null;

      // Evaluar objetos del rival
      if (rivalItems.length > 0) {
        // ¿Tiene Monster y salud baja?
        const monsterIdx = rivalItems.indexOf('monster');
        if (monsterIdx !== -1 && rivalHp < selectedRival.maxHp) {
          try { sound.bottlePop(); } catch {}
          setRivalItems((prev) => prev.filter((_, i) => i !== monsterIdx));
          setRivalHp((prev) => Math.min(selectedRival.maxHp, prev + 1));
          setActionLog((prev) => [`${selectedRival.name} bebió un Monster (+1 de salud).`, ...prev.slice(0, 5)]);
        }

        // ¿Tiene Multímetro para espiar?
        const multiIdx = rivalItems.indexOf('multimetro');
        if (multiIdx !== -1 && (currentMag.length > 1 || Math.random() < 0.7)) {
          try { sound.electricZap(); } catch {}
          setRivalItems((prev) => prev.filter((_, i) => i !== multiIdx));
          knownBullet = currentMag[0];
          setActionLog((prev) => [`${selectedRival.name} usó el Multímetro para inspeccionar la recámara.`, ...prev.slice(0, 5)]);
        }

        // Si sabe que es salva y tiene inversor, la invierte a bala real!
        const invIdx = rivalItems.indexOf('inversor');
        if (invIdx !== -1 && knownBullet === false) {
          try { sound.electricZap(); } catch {}
          setRivalItems((prev) => prev.filter((_, i) => i !== invIdx));
          currentMag[0] = true;
          knownBullet = true;
          setMagazine([...currentMag]);
          setRemainingLives((prev) => prev + 1);
          setRemainingBlanks((prev) => Math.max(0, prev - 1));
          setActionLog((prev) => [`${selectedRival.name} usó el Inversor: ¡ha convertido la salva en bala real!`, ...prev.slice(0, 5)]);
        }

        // ¿Tiene Crimpadora y sabe que es real?
        const crimpIdx = rivalItems.indexOf('crimpadora');
        if (crimpIdx !== -1 && (knownBullet === true || (remainingLives > remainingBlanks && Math.random() < 0.6))) {
          try { sound.pumpShotgun(); } catch {}
          setRivalItems((prev) => prev.filter((_, i) => i !== crimpIdx));
          rivalDmgMult = 2;
          setIsDoubleDamage(true);
          setActionLog((prev) => [`${selectedRival.name} usó la Crimpadora (¡Doble daño preparado!).`, ...prev.slice(0, 5)]);
        }

        // ¿Tiene Cable RJ45 y no está esposado el jugador?
        const cableIdx = rivalItems.indexOf('cable_rj45');
        if (cableIdx !== -1 && !isPlayerHandcuffed && Math.random() < 0.6) {
          try { sound.itemSound(); } catch {}
          setRivalItems((prev) => prev.filter((_, i) => i !== cableIdx));
          setIsPlayerHandcuffed(true);
          setActionLog((prev) => [`¡${selectedRival.name} te ató con un cable RJ45! Te saltarás tu próximo turno.`, ...prev.slice(0, 5)]);
        }
      }

      // Suspense: Amartillado del rival
      try { sound.cockGun(); } catch {}

      setTimeout(() => {
        if (!isMounted || gameResult) return;

        const isLive = currentMag[0];
        const nextMag = currentMag.slice(1);
        const nextLives = isLive ? Math.max(0, remainingLives - 1) : remainingLives;
        const nextBlanks = !isLive ? Math.max(0, remainingBlanks - 1) : remainingBlanks;

        setMagazine(nextMag);
        setRemainingLives(nextLives);
        setRemainingBlanks(nextBlanks);
        setIsDoubleDamage(false);

        // Decisión táctica de a quién disparar:
        let targetSelf = false;
        if (knownBullet === false) {
          targetSelf = true; // Si sabe al 100% que es salva, se dispara a sí mismo para conservar turno
        } else if (knownBullet === true) {
          targetSelf = false; // Si sabe que es real, te dispara a ti
        } else if (remainingLives === 0) {
          targetSelf = true; // No quedan balas reales, se dispara a sí mismo
        } else if (remainingBlanks === 0) {
          targetSelf = false; // Todas las que quedan son reales, dispara al jugador
        } else {
          // Cálculo estocástico según porcentaje de reales restantes
          const liveOdds = remainingLives / Math.max(1, currentMag.length);
          targetSelf = liveOdds < 0.38;
        }

        if (targetSelf) {
          // El rival se dispara a sí mismo
          if (isLive) {
            sound.gunshotBoom();
            triggerVisualImpact('live');
            const nextHp = Math.max(0, rivalHp - rivalDmgMult);
            setRivalHp(nextHp);
            setActionLog((prev) => [`¡BOOM! ${selectedRival.name} se disparó a sí mismo con BALA REAL (-${rivalDmgMult} de vida).`, ...prev.slice(0, 5)]);

            if (nextHp <= 0) {
              handleVictory();
              setIsActionInProgress(false);
              return;
            }

            // Pasa turno al jugador
            passTurnToPlayer(nextMag);
          } else {
            // El rival se disparó con salva (CONSERVA TURNO)
            sound.dryFireClick();
            triggerVisualImpact('blank');
            setActionLog((prev) => [`¡CLICK! ${selectedRival.name} se disparó con una SALVA y conserva el turno.`, ...prev.slice(0, 5)]);

            if (nextMag.length === 0) {
              setTimeout(() => {
                if (selectedRival) initRound(selectedRival.maxHp);
                setIsActionInProgress(false);
              }, 900);
            } else {
              setIsActionInProgress(false);
              // Vuelve a jugar el rival inmediatamente
              setTurn('player');
              setTimeout(() => setTurn('rival'), 300);
            }
          }
        } else {
          // El rival dispara al jugador
          if (isLive) {
            sound.gunshotBoom();
            triggerVisualImpact('live');
            const nextHp = Math.max(0, playerHp - rivalDmgMult);
            setPlayerHp(nextHp);
            setActionLog((prev) => [`¡BOOM! ${selectedRival.name} te disparó con BALA REAL (-${rivalDmgMult} de vida).`, ...prev.slice(0, 5)]);

            if (nextHp <= 0) {
              handleDefeat();
              setIsActionInProgress(false);
              return;
            }
          } else {
            sound.dryFireClick();
            triggerVisualImpact('blank');
            setActionLog((prev) => [`¡CLICK! ${selectedRival.name} te disparó pero la recámara estaba en SALVA.`, ...prev.slice(0, 5)]);
          }

          // Pasa turno al jugador
          passTurnToPlayer(nextMag);
        }
      }, 700);
    }, 1200);

    return () => {
      isMounted = false;
      clearTimeout(rivalTimer);
    };
  }, [turn, magazine, rivalItems, rivalHp, playerHp, isActionInProgress, gameResult, selectedRival, remainingLives, remainingBlanks]);

  // Pasar turno al jugador con verificación de esposas / cargador vacío
  const passTurnToPlayer = (currentMag: boolean[]) => {
    if (currentMag.length === 0) {
      setTimeout(() => {
        setActionLog((prev) => ['Cargador vacío. Recargando nueva tanda...', ...prev.slice(0, 5)]);
        if (selectedRival) initRound(selectedRival.maxHp);
      }, 900);
    }

    if (isPlayerHandcuffed) {
      setIsPlayerHandcuffed(false);
      setActionLog((prev) => ['¡Estás esposado con el cable RJ45! Te saltas tu turno.', ...prev.slice(0, 5)]);
      setTimeout(() => {
        setTurn('rival');
        setIsActionInProgress(false);
      }, 800);
      return;
    }

    setTurn('player');
    setIsActionInProgress(false);
  };

  // Renderizar indicador de salud
  const renderHealth = (hp: number, max: number) => {
    return (
      <div className="flex items-center gap-1.5">
        {Array.from({ length: max }).map((_, i) => (
          <span
            key={i}
            className={`w-6 h-3 rounded-full transition-all duration-300 ${
              i < hp
                ? 'bg-red-500 shadow-sm shadow-red-500/50 scale-105'
                : 'bg-surface-raised border border-border/80 opacity-40'
            }`}
          />
        ))}
      </div>
    );
  };

  // Porcentaje estimado de bala real
  const currentLiveOddsPercent =
    magazine.length > 0 ? Math.round((remainingLives / magazine.length) * 100) : 0;

  // ==========================================
  // VISTA 1: LOBBY DE RIVALES (SELECCIONAR OPONENTE)
  // ==========================================
  if (!inDuel || !selectedRival) {
    return (
      <div className="space-y-6">
        {/* Cabecera del Modo Duelo Táctico */}
        <div className="p-5 sm:p-6 rounded-3xl bg-surface-raised border border-border/70 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start sm:items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-red-500/10 text-red-500 border border-red-500/20 flex items-center justify-center shrink-0 shadow-xs">
              <Flame className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-foreground tracking-tight">
                  Ruleta Rusa: Duelo Táctico SMR
                </h2>
                <Badge variant="outline" className="text-[10px] font-mono border-red-500/30 text-red-500 bg-red-500/10">
                  Buckshot Edition
                </Badge>
              </div>
              <p className="text-xs text-foreground-muted mt-0.5">
                Reta a los personajes de clase en un duelo estratégico de cargador cerrado. Usa herramientas de redes para alterar el destino de la recámara.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => {
                sound.tap();
                setShowRulesModal(true);
              }}
              className="gap-1.5 text-xs font-medium cursor-pointer"
            >
              <HelpCircle className="w-4 h-4 text-accent" />
              <span>Reglas y Objetos</span>
            </Button>
          </div>
        </div>

        {/* Marcador de Estadísticas y Racha del Jugador */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 rounded-3xl bg-surface border border-border/70 shadow-xs">
          <div className="p-3 rounded-2xl bg-surface-raised/60 border border-border/50 text-center space-y-0.5">
            <span className="text-[10px] font-mono uppercase text-foreground-subtle">Victorias</span>
            <div className="text-base font-bold font-mono text-emerald-500">{stats.wins}</div>
          </div>
          <div className="p-3 rounded-2xl bg-surface-raised/60 border border-border/50 text-center space-y-0.5">
            <span className="text-[10px] font-mono uppercase text-foreground-subtle">Derrotas</span>
            <div className="text-base font-bold font-mono text-rose-500">{stats.losses}</div>
          </div>
          <div className="p-3 rounded-2xl bg-surface-raised/60 border border-border/50 text-center space-y-0.5">
            <span className="text-[10px] font-mono uppercase text-foreground-subtle flex items-center justify-center gap-1">
              <Flame className="w-3 h-3 text-amber-500" /> Racha Actual
            </span>
            <div className="text-base font-bold font-mono text-amber-500">{stats.currentStreak} 🔥</div>
          </div>
          <div className="p-3 rounded-2xl bg-surface-raised/60 border border-border/50 text-center space-y-0.5">
            <span className="text-[10px] font-mono uppercase text-foreground-subtle">Mejor Racha</span>
            <div className="text-base font-bold font-mono text-foreground">{stats.bestStreak}</div>
          </div>
        </div>

        {/* Modal de Reglas y Explicación */}
        {showRulesModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
            <Card className="w-full max-w-lg p-5 space-y-4 max-h-[85vh] overflow-y-auto rounded-3xl shadow-2xl bg-surface border border-border">
              <div className="flex items-center justify-between border-b border-border pb-3">
                <div className="flex items-center gap-2">
                  <Flame className="w-5 h-5 text-red-500" />
                  <h3 className="font-bold text-sm text-foreground">Reglas del Duelo Táctico SMR</h3>
                </div>
                <button
                  onClick={() => setShowRulesModal(false)}
                  className="p-1 rounded-lg text-foreground-muted hover:text-foreground cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-3 text-xs text-foreground-muted leading-relaxed">
                <div className="p-3 rounded-2xl bg-surface-raised border border-border space-y-1">
                  <span className="font-bold text-foreground block">1. La Mecánica del Tambor:</span>
                  <p>
                    El cargador se llena con una combinación secreta de <strong>Balas Reales (🔥)</strong> y <strong>Salvas (⚪)</strong>.
                  </p>
                  <p>
                    • Si te <strong>disparas a ti mismo</strong> con una Salva, no pierdes vida y <strong>¡conservas tu turno!</strong>
                  </p>
                  <p>
                    • Si disparas al <strong>rival</strong> con Bala Real, le infliges daño y le quitas vida.
                  </p>
                </div>

                <div className="p-3 rounded-2xl bg-surface-raised border border-border space-y-2">
                  <span className="font-bold text-foreground block">2. Los 5 Objetos Informáticos de 2º SMR:</span>
                  <div className="space-y-1.5 font-mono text-[11px]">
                    <div>🔍 <strong>Multímetro Fluke:</strong> Mide si la bala en la recámara actual es Real o Salva.</div>
                    <div>🔌 <strong>Cable RJ45 (Esposas):</strong> Ata al rival para saltarse su siguiente turno.</div>
                    <div>🪚 <strong>Crimpadora:</strong> El siguiente disparo hace el doble de daño (2 vidas).</div>
                    <div>⚡ <strong>Lata de Monster:</strong> Bebida energética que recupera +1 punto de salud.</div>
                    <div>🔄 <strong>Inversor:</strong> Invierte la bala actual: de Salva a Real o viceversa.</div>
                  </div>
                </div>

                <div className="p-3 rounded-2xl bg-surface-raised border border-border space-y-1">
                  <span className="font-bold text-foreground block">3. Bote y Monedas:</span>
                  <p>
                    El ganador se lleva el 100% de la bolsa (apuesta propia + apuesta del rival) transferido de inmediato a su saldo oficial.
                  </p>
                </div>
              </div>

              <Button
                variant="primary"
                size="sm"
                className="w-full cursor-pointer"
                onClick={() => setShowRulesModal(false)}
              >
                Entendido, ¡a jugar!
              </Button>
            </Card>
          </div>
        )}

        {/* Tarjetas de Selección de Rivales */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {RIVALS.map((rival) => {
            const canAfford = user ? user.coins >= rival.bet : false;

            return (
              <Card
                key={rival.id}
                className="p-5 rounded-3xl bg-surface/90 border border-border/80 hover:border-accent/40 shadow-xs flex flex-col justify-between space-y-4 transition-all"
              >
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-2xl bg-surface-raised border border-border flex items-center justify-center font-bold text-sm font-mono text-foreground shrink-0 shadow-2xs">
                        {rival.avatarInitials}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-bold text-sm text-foreground tracking-tight">
                            {rival.name}
                          </h3>
                          <Badge
                            variant="outline"
                            className={`text-[10px] font-mono ${
                              rival.difficulty === 'Boss'
                                ? 'border-amber-500/40 text-amber-500 bg-amber-500/10'
                                : rival.difficulty === 'Difícil'
                                ? 'border-rose-500/40 text-rose-500 bg-rose-500/10'
                                : rival.difficulty === 'Medio'
                                ? 'border-cyan-500/40 text-cyan-500 bg-cyan-500/10'
                                : 'border-emerald-500/40 text-emerald-500 bg-emerald-500/10'
                            }`}
                          >
                            {rival.difficulty}
                          </Badge>
                        </div>
                        <p className="text-xs text-foreground-muted font-mono">{rival.title}</p>
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="text-[10px] font-mono text-foreground-subtle uppercase">Apuesta</div>
                      <div className="text-sm font-bold font-mono text-amber-500 flex items-center justify-end gap-1">
                        <Coins className="w-3.5 h-3.5" />
                        <span>{rival.bet.toLocaleString()}</span>
                      </div>
                    </div>
                  </div>

                  <p className="text-xs text-foreground-muted italic bg-surface-raised/70 p-3 rounded-2xl border border-border/50">
                    &quot;{rival.introQuote}&quot;
                  </p>

                  <div className="flex items-center justify-between text-xs font-mono text-foreground-subtle pt-1">
                    <div className="flex items-center gap-2">
                      <span>Salud:</span>
                      {renderHealth(rival.maxHp, rival.maxHp)}
                    </div>
                    <span>Bote: <strong className="text-foreground">{(rival.bet * 2).toLocaleString()}</strong></span>
                  </div>
                </div>

                <Button
                  variant="primary"
                  size="md"
                  disabled={!canAfford}
                  onClick={() => handleStartDuel(rival)}
                  className="w-full rounded-2xl font-semibold gap-2 cursor-pointer shadow-xs"
                >
                  <Zap className="w-4 h-4 fill-current" />
                  <span>
                    {!user
                      ? 'Inicia sesión para retar'
                      : !canAfford
                      ? `Necesitas ${rival.bet} monedas`
                      : `Retar a ${rival.name} (${rival.bet} fichas)`}
                  </span>
                </Button>
              </Card>
            );
          })}
        </div>
      </div>
    );
  }

  // ==========================================
  // VISTA 2: TABLERO DE DUELO ACTIVO (MESA BUCKSHOT)
  // ==========================================
  return (
    <div className={`space-y-4 transition-transform duration-150 ${screenShake ? 'animate-shake' : ''}`}>
      {/* Destello de fogonazo en pantalla al disparar */}
      {muzzleFlash === 'live' && (
        <div className="fixed inset-0 pointer-events-none z-50 bg-red-600/25 animate-pulse" />
      )}
      {muzzleFlash === 'blank' && (
        <div className="fixed inset-0 pointer-events-none z-50 bg-cyan-400/15 animate-pulse" />
      )}

      {/* Barra superior de estado del combate */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 sm:p-4 rounded-3xl bg-surface-raised border border-border/80 shadow-xs">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => {
              if (window.confirm('¿Quieres abandonar el duelo? Se perderá la apuesta.')) {
                setInDuel(false);
                setSelectedRival(null);
              }
            }}
            className="w-9 h-9 rounded-xl bg-surface hover:bg-surface-hover border border-border flex items-center justify-center text-foreground-muted transition-colors cursor-pointer"
            title="Abandonar partida"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>

          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-foreground">
                vs {selectedRival.name} ({selectedRival.nickname})
              </h3>
              <Badge variant="outline" className="text-[10px] font-mono border-amber-500/30 text-amber-500 bg-amber-500/10">
                Bote: {(selectedRival.bet * 2).toLocaleString()} fichas
              </Badge>
            </div>
            <p className="text-[11px] text-foreground-muted font-mono mt-0.5">
              Turno: <strong className={turn === 'player' ? 'text-accent' : 'text-amber-500'}>{turn === 'player' ? 'Tu turno' : `Turno de ${selectedRival.name}`}</strong>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {isDoubleDamage && (
            <Badge variant="outline" className="text-xs font-mono font-medium bg-rose-500/15 text-rose-500 border-rose-500/30 animate-pulse">
              Doble daño preparado (2x)
            </Badge>
          )}
          {isRivalHandcuffed && (
            <Badge variant="outline" className="text-xs font-mono bg-cyan-500/20 text-cyan-400 border-cyan-500/40">
              Rival Esposado
            </Badge>
          )}
          {isPlayerHandcuffed && (
            <Badge variant="outline" className="text-xs font-mono bg-rose-500/20 text-rose-400 border-rose-500/40">
              Estás Esposado
            </Badge>
          )}
        </div>
      </div>

      {/* Mesa central de combate Buckshot */}
      <div className="relative p-5 sm:p-7 rounded-3xl bg-radial from-[#181824] via-[#0f0f16] to-[#07070b] border border-white/10 shadow-2xl flex flex-col items-center justify-between min-h-[480px] space-y-6 overflow-hidden">
        {/* Cabecera del Rival */}
        <div className="w-full flex items-center justify-between gap-4 z-10">
          <div className="flex items-center gap-3">
            <div className={`w-11 h-11 rounded-2xl border flex items-center justify-center font-bold text-sm font-mono transition-all ${
              rivalHp === 1
                ? 'bg-rose-500/20 border-rose-500/50 text-rose-400 animate-pulse'
                : 'bg-white/10 border-white/15 text-white'
            }`}>
              {rivalHp <= 0 ? '💀' : selectedRival.avatarInitials}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-sm text-white">{selectedRival.name}</span>
                <span className="text-[10px] font-mono text-zinc-400">({selectedRival.title})</span>
              </div>
              <div className="mt-1 flex items-center gap-2">
                <span className="text-[10px] font-mono text-zinc-400">Salud:</span>
                {renderHealth(rivalHp, selectedRival.maxHp)}
              </div>
            </div>
          </div>

          {/* Inventario del Rival */}
          <div className="flex items-center gap-1.5 bg-black/40 px-3 py-1.5 rounded-2xl border border-white/10">
            <span className="text-[10px] font-mono text-zinc-400 mr-1 hidden sm:inline">Objetos:</span>
            {rivalItems.length === 0 ? (
              <span className="text-[10px] font-mono text-zinc-500">Vacío</span>
            ) : (
              rivalItems.map((item, idx) => {
                const def = ITEMS[item];
                const IconComponent = def.icon;
                return (
                  <div
                    key={idx}
                    title={`${def.name}: ${def.shortDesc}`}
                    className="w-7 h-7 rounded-lg bg-white/10 border border-white/15 flex items-center justify-center text-zinc-300"
                  >
                    <IconComponent className="w-3.5 h-3.5" />
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Diálogo del Rival en vivo */}
        {rivalSpeech && (
          <div className="z-10 max-w-md w-full text-center px-4 py-2 rounded-2xl bg-white/[0.06] border border-white/10 text-xs text-zinc-200 italic shadow-sm animate-in fade-in">
            &quot;{rivalSpeech}&quot;
          </div>
        )}

        {/* ============================================================== */}
        {/* BANDEJA TÁCTICA VISUAL DE CARTUCHOS Y PROBABILIDADES */}
        {/* ============================================================== */}
        <div className="w-full max-w-md flex flex-col items-center justify-center space-y-3.5 z-10 py-1">
          {/* Bandeja de Cartuchos */}
          <div className="w-full p-4 rounded-3xl bg-black/60 border border-white/15 backdrop-blur-md shadow-xl flex flex-col items-center space-y-3">
            <div className="flex items-center justify-between w-full text-[11px] font-mono text-zinc-400 px-1">
              <span className="flex items-center gap-1.5">
                <Flame className="w-3.5 h-3.5 text-rose-500" />
                <span>Reales: <strong className="text-rose-400">{remainingLives}</strong></span>
              </span>

              <span className="text-zinc-500">|</span>

              <span className="flex items-center gap-1.5">
                <Shield className="w-3.5 h-3.5 text-cyan-400" />
                <span>Salvas: <strong className="text-cyan-400">{remainingBlanks}</strong></span>
              </span>

              <span className="text-zinc-500">|</span>

              <span className="text-amber-400 font-semibold">
                Riesgo Real: {currentLiveOddsPercent}%
              </span>
            </div>

            {/* Ranuras visuales de cartuchos */}
            <div className="flex items-center justify-center gap-2 sm:gap-3 py-1 flex-wrap">
              {magazine.map((isLiveShell, idx) => {
                const isCurrent = idx === 0;
                const isInspected = isCurrent && secretInspection !== null;

                return (
                  <div
                    key={idx}
                    className={`relative flex flex-col items-center transition-all duration-300 ${
                      isCurrent ? 'scale-110' : 'opacity-70'
                    }`}
                  >
                    {/* Cartucho cilíndrico */}
                    <div
                      className={`w-9 h-14 rounded-lg border-2 flex flex-col items-center justify-between p-1 transition-all ${
                        isInspected
                          ? secretInspection
                            ? 'bg-rose-950/80 border-rose-500 shadow-md shadow-rose-500/40'
                            : 'bg-cyan-950/80 border-cyan-400 shadow-md shadow-cyan-400/40'
                          : isCurrent
                          ? 'bg-neutral-800/90 border-amber-400 shadow-md shadow-amber-400/30'
                          : 'bg-neutral-900 border-neutral-700'
                      }`}
                    >
                      {/* Corona de latón */}
                      <div className="w-full h-3 rounded-sm bg-gradient-to-r from-amber-600 via-amber-400 to-amber-600" />

                      {/* Cuerpo del cartucho con icono */}
                      <div className="flex-1 flex items-center justify-center">
                        {isInspected ? (
                          secretInspection ? (
                            <Flame className="w-4 h-4 text-rose-400 animate-pulse" />
                          ) : (
                            <Shield className="w-4 h-4 text-cyan-300" />
                          )
                        ) : isCurrent ? (
                          <Crosshair className="w-4 h-4 text-amber-400 animate-spin" style={{ animationDuration: '8s' }} />
                        ) : (
                          <span className="text-[10px] font-mono text-zinc-500">#{idx + 1}</span>
                        )}
                      </div>

                      {/* Culote del cartucho */}
                      <div className="w-full text-center">
                        <span className="text-[8px] font-mono uppercase font-bold text-zinc-400">
                          {isInspected ? (secretInspection ? 'REAL' : 'SALVA') : isCurrent ? 'ACTUAL' : ''}
                        </span>
                      </div>
                    </div>

                    {isCurrent && (
                      <span className="text-[9px] font-mono text-amber-400 font-bold mt-1">
                        Recámara
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Registro del último movimiento */}
          <div className="text-xs font-mono text-zinc-300 bg-black/60 px-4 py-1.5 rounded-xl border border-white/5 max-w-lg text-center truncate">
            {actionLog[0] || 'Duelo listo. Toma tu decisión.'}
          </div>
        </div>

        {/* Zona Inferior: Datos del Jugador, Inventario y Controles */}
        <div className="w-full space-y-4 z-10">
          {/* Cabecera del Jugador */}
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-2xl border flex items-center justify-center font-mono font-bold ${
                playerHp === 1
                  ? 'bg-rose-500/20 border-rose-500/50 text-rose-400 animate-pulse'
                  : 'bg-accent/20 border-accent/40 text-accent'
              }`}>
                {playerHp <= 0 ? '💀' : 'TÚ'}
              </div>
              <div>
                <span className="font-bold text-sm text-white">Tu Estado</span>
                <div className="mt-1 flex items-center gap-2">
                  <span className="text-[10px] font-mono text-zinc-400">Salud:</span>
                  {renderHealth(playerHp, selectedRival.maxHp)}
                </div>
              </div>
            </div>

            {/* Inventario de Objetos del Jugador */}
            <div className="flex items-center gap-1.5 bg-black/50 px-3.5 py-2 rounded-2xl border border-white/15">
              <span className="text-[10px] font-mono text-zinc-400 mr-1 hidden sm:inline">Tus Objetos:</span>
              {playerItems.length === 0 ? (
                <span className="text-[10px] font-mono text-zinc-500">Sin objetos</span>
              ) : (
                playerItems.map((item, idx) => {
                  const def = ITEMS[item];
                  const IconComponent = def.icon;
                  return (
                    <button
                      key={idx}
                      type="button"
                      disabled={turn !== 'player' || isActionInProgress || Boolean(gameResult)}
                      onClick={() => handleUsePlayerItem(item, idx)}
                      title={`Usar ${def.name}: ${def.shortDesc}`}
                      className="px-2.5 py-1.5 rounded-xl bg-surface-raised hover:bg-surface border border-border/80 flex items-center gap-1.5 text-xs text-foreground font-medium transition-all active:scale-95 disabled:opacity-40 cursor-pointer shadow-2xs hover:border-accent"
                    >
                      <IconComponent className="w-3.5 h-3.5 text-accent" />
                      <span className="text-[11px] font-mono">{def.name.split(' ')[0]}</span>
                    </button>
                  );
                })
              )}
            </div>
          </div>

          {/* Botones de Disparo Táctico (Dispararme a mí mismo vs Disparar a rival) */}
          {!gameResult ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <button
                type="button"
                disabled={turn !== 'player' || isActionInProgress}
                onClick={() => handleShoot('self')}
                className={`py-3.5 px-4 rounded-2xl bg-surface-raised hover:bg-surface border border-border/80 text-foreground flex flex-col items-center justify-center transition-all active:scale-98 disabled:opacity-40 cursor-pointer shadow-sm relative overflow-hidden ${
                  isAimingTarget === 'self' ? 'ring-2 ring-emerald-400 bg-emerald-950/30' : ''
                }`}
              >
                <div className="flex items-center gap-2 font-bold text-sm">
                  <Heart className="w-4 h-4 text-emerald-400" />
                  <span>Dispararme a mí mismo</span>
                </div>
                <span className="text-[10px] font-mono text-foreground-muted mt-0.5">
                  Si es salva ⚪, ¡conservas el turno y vuelves a jugar!
                </span>
              </button>

              <button
                type="button"
                disabled={turn !== 'player' || isActionInProgress}
                onClick={() => handleShoot('rival')}
                className={`py-3.5 px-4 rounded-2xl bg-red-600/90 hover:bg-red-600 text-white flex flex-col items-center justify-center transition-all active:scale-98 disabled:opacity-40 cursor-pointer shadow-md shadow-red-600/20 relative overflow-hidden ${
                  isAimingTarget === 'rival' ? 'ring-2 ring-white bg-red-700' : ''
                }`}
              >
                <div className="flex items-center gap-2 font-bold text-sm">
                  <Skull className="w-4 h-4 text-white" />
                  <span>Disparar a {selectedRival.name}</span>
                </div>
                <span className="text-[10px] font-mono text-red-200 mt-0.5">
                  Si es real 🔥, inflige {isDoubleDamage ? '2 VIDAS' : '1 VIDA'} y pasa turno
                </span>
              </button>
            </div>
          ) : (
            /* Pantalla de Fin de Duelo */
            <div className="p-4 sm:p-5 rounded-3xl bg-black/85 border border-white/20 text-center space-y-3.5 animate-in fade-in shadow-2xl">
              <div className="flex items-center justify-center gap-2">
                {gameResult === 'won' ? (
                  <>
                    <Trophy className="w-6 h-6 text-amber-400" />
                    <h3 className="text-base sm:text-lg font-bold text-emerald-400">¡HAS GANADO EL DUELO!</h3>
                  </>
                ) : (
                  <>
                    <Skull className="w-6 h-6 text-rose-500" />
                    <h3 className="text-base sm:text-lg font-bold text-rose-500">HAS SIDO ELIMINADO</h3>
                  </>
                )}
              </div>
              <p className="text-xs text-zinc-300">
                {gameResult === 'won'
                  ? `Has ganado ${(selectedRival.bet * 2).toLocaleString()} fichas acreditadas directamente a tu saldo.`
                  : `Has perdido ${selectedRival.bet.toLocaleString()} fichas apostadas.`}
              </p>

              <div className="flex items-center justify-center gap-2.5 pt-1">
                <Button
                  variant="secondary"
                  size="sm"
                  className="cursor-pointer"
                  onClick={() => {
                    setInDuel(false);
                    setSelectedRival(null);
                  }}
                >
                  Volver al Lobby
                </Button>

                <Button
                  variant="primary"
                  size="sm"
                  className="cursor-pointer"
                  onClick={() => handleStartDuel(selectedRival)}
                >
                  Revancha Inmediata
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
