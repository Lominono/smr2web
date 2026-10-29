'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import confetti from 'canvas-confetti';
import {
  Flame,
  Zap,
  Coins,
  ArrowLeft,
  Search,
  Cpu,
  Scissors,
  Coffee,
  RotateCw,
  Trophy,
  Heart,
  Skull,
  User,
  HelpCircle,
  X,
  Volume2,
  Crosshair,
  Activity,
  Layers,
  Sparkles,
  ShieldAlert,
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
  iqRating: string;
  introQuote: string;
  hurtQuote: string;
  winQuote: string;
  loseQuote: string;
  taunts: string[];
}

export const RIVALS: RivalProfile[] = [
  {
    id: 'david',
    name: 'David',
    nickname: 'El Estratega',
    title: 'Compañero y desarrollador',
    bet: 50,
    maxHp: 2,
    difficulty: 'Fácil',
    avatarInitials: 'DA',
    iqRating: 'Cálculo básico de tambor',
    introQuote: 'Calculemos bien las probabilidades del cargador antes de apretar el gatillo.',
    hurtQuote: 'Bien medido... no esperaba esa bala en este turno.',
    winQuote: 'Buena ronda. Las estadísticas estaban de mi lado.',
    loseQuote: 'Bien jugado, has gestionado mejor el tambor.',
    taunts: [
      'Si dudas, la probabilidad siempre se pone en tu contra.',
      'Un técnico mide dos veces antes de cortar la conexión.',
      'Cuidado con dispararte sin tener claro el tambor.',
    ],
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
    iqRating: 'Agresivo y amante del Monster',
    introQuote: 'Me sé todos los exámenes de Redes y las mañas de esta ruleta. Tira si tienes agallas.',
    hurtQuote: 'Bah, un rasguño. Me tomo un Monster y como nuevo.',
    winQuote: 'Para ser novato has aguantado bien, pero la veteranía es un grado.',
    loseQuote: 'Menos mal que en las prácticas de montaje no se juegan monedas...',
    taunts: [
      '¡Aquí venimos a jugar fuerte, nada de mariconadas!',
      '¿Otro turno pensándotelo? Que se me enfría el kebab.',
      'El cable RJ45 no solo sirve para dar internet, chaval.',
    ],
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
    iqRating: 'Probabilidad Bayesiana estricta',
    introQuote: 'He calculado la desviación estándar y el checksum del cargador. Tu probabilidad de supervivencia es mínima.',
    hurtQuote: 'Error de paridad imprevisto... recalculando algoritmo.',
    winQuote: 'Las matemáticas nunca fallan. Deberías repasar binario.',
    loseQuote: 'Una anomalía estadística imperdonable... enhorabuena.',
    taunts: [
      'El espacio muestral no deja margen para el azar.',
      'Contar las balas disparadas es lo primero que se aprende en criptografía.',
      'Tu vector de ataque tiene una vulnerabilidad evidente.',
    ],
  },
  {
    id: 'delegado',
    name: 'Marcos',
    nickname: 'El Delegado de Clase',
    title: 'Autoridad Suprema del Aula 204',
    bet: 800,
    maxHp: 4,
    difficulty: 'Boss',
    avatarInitials: 'MA',
    iqRating: 'Gran Maestro SMR (Combos tácticos)',
    introQuote: 'Como delegado tengo la custodia del aula y de la banca. Si quieres mis 800 monedas vas a tener que sudar tinta.',
    hurtQuote: '¡Falta leve por agresión a la autoridad del aula!',
    winQuote: 'Las monedas quedan confiscadas para la excursión de fin de curso.',
    loseQuote: 'Impresionante jugada táctica. Me quito el sombrero de delegado.',
    taunts: [
      'Si pierdes este duelo te pongo de guardia en el recreo.',
      'He visto a muchos venirse arriba con una salva y caer con la real.',
      'La banca del delegado nunca regala una sola ficha.',
    ],
  },
];

export type ItemType = 'multimetro' | 'cable_rj45' | 'crimpadora' | 'monster' | 'inversor';

export interface ItemDef {
  id: ItemType;
  name: string;
  shortDesc: string;
  icon: any;
  colorClass: string;
}

export const ITEMS: Record<ItemType, ItemDef> = {
  multimetro: {
    id: 'multimetro',
    name: 'Multímetro Fluke',
    shortDesc: 'Inspecciona en secreto si la recámara actual tiene BALA REAL o SALVA.',
    icon: Search,
    colorClass: 'text-amber-500 dark:text-amber-400',
  },
  cable_rj45: {
    id: 'cable_rj45',
    name: 'Cable RJ45 (Esposas)',
    shortDesc: 'Inmoviliza al oponente: se salta por completo su siguiente turno.',
    icon: Cpu,
    colorClass: 'text-sky-500 dark:text-sky-400',
  },
  crimpadora: {
    id: 'crimpadora',
    name: 'Crimpadora Afilada',
    shortDesc: 'Sierra el cañón: el siguiente disparo inflige el DOBLE de daño (2 vidas).',
    icon: Scissors,
    colorClass: 'text-rose-500 dark:text-rose-400',
  },
  monster: {
    id: 'monster',
    name: 'Lata de Monster',
    shortDesc: 'Bebida energética de informática: recupera +1 punto de salud inmediatamente.',
    icon: Coffee,
    colorClass: 'text-emerald-500 dark:text-emerald-400',
  },
  inversor: {
    id: 'inversor',
    name: 'Inversor de Polaridad',
    shortDesc: 'Invierte la recámara: si es Salva pasa a Real, y si es Real pasa a Salva.',
    icon: RotateCw,
    colorClass: 'text-purple-500 dark:text-purple-400',
  },
};

const ALL_ITEM_KEYS: ItemType[] = ['multimetro', 'cable_rj45', 'crimpadora', 'monster', 'inversor'];

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

  // Estado del combate
  const [playerHp, setPlayerHp] = useState<number>(3);
  const [rivalHp, setRivalHp] = useState<number>(3);
  const [magazine, setMagazine] = useState<boolean[]>([]); // true = real, false = salva
  const [totalLivesLoaded, setTotalLivesLoaded] = useState<number>(0);
  const [totalBlanksLoaded, setTotalBlanksLoaded] = useState<number>(0);
  const [firedLives, setFiredLives] = useState<number>(0);
  const [firedBlanks, setFiredBlanks] = useState<number>(0);
  const [turn, setTurn] = useState<'player' | 'rival'>('player');

  // Inventarios de objetos
  const [playerItems, setPlayerItems] = useState<ItemType[]>([]);
  const [rivalItems, setRivalItems] = useState<ItemType[]>([]);

  // Modificadores de estado táctico
  const [isDoubleDamage, setIsDoubleDamage] = useState<boolean>(false);
  const [isRivalHandcuffed, setIsRivalHandcuffed] = useState<boolean>(false);
  const [isPlayerHandcuffed, setIsPlayerHandcuffed] = useState<boolean>(false);

  // Interactividad y animaciones
  const [chamberRotation, setChamberRotation] = useState<number>(0);
  const [screenShake, setScreenShake] = useState<boolean>(false);
  const [isActionInProgress, setIsActionInProgress] = useState<boolean>(false);
  const [aimingTarget, setAimingTarget] = useState<'self' | 'rival' | null>(null);
  const [actionLog, setActionLog] = useState<string[]>([]);
  const [secretInspection, setSecretInspection] = useState<string | null>(null);
  const [gameResult, setGameResult] = useState<'won' | 'lost' | null>(null);
  const [showRulesModal, setShowRulesModal] = useState<boolean>(false);

  // Diálogo dinámico del rival
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
    setActionLog([`¡Duelo táctico iniciado contra ${rival.name} (${rival.nickname})! Bote: ${rival.bet * 2} monedas.`]);
    setInDuel(true);

    // Inicializar ronda
    initRound(rival.maxHp);
  };

  // 2. Inicializar o recargar ronda del cargador
  const initRound = (maxHp: number) => {
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
    setTotalLivesLoaded(liveCount);
    setTotalBlanksLoaded(blankCount);
    setFiredLives(0);
    setFiredBlanks(0);
    setIsDoubleDamage(false);
    setSecretInspection(null);

    // Repartir objetos
    setPlayerItems((prev) => {
      const next = [...prev];
      while (next.length < 4 && next.length < prev.length + 2) {
        const item = ALL_ITEM_KEYS[Math.floor(Math.random() * ALL_ITEM_KEYS.length)];
        next.push(item);
      }
      return next;
    });

    setRivalItems((prev) => {
      const next = [...prev];
      while (next.length < 4 && next.length < prev.length + 2) {
        const item = ALL_ITEM_KEYS[Math.floor(Math.random() * ALL_ITEM_KEYS.length)];
        next.push(item);
      }
      return next;
    });

    setActionLog((prev) => [
      `Tambor cargado: ${liveCount} ${liveCount === 1 ? 'Bala Real' : 'Balas Reales'} y ${blankCount} ${blankCount === 1 ? 'Salva' : 'Salvas'}.`,
      ...prev.slice(0, 5),
    ]);
  };

  // Sacudida de pantalla en impacto
  const triggerShake = () => {
    setScreenShake(true);
    setTimeout(() => setScreenShake(false), 450);
  };

  // Giro mecánico del tambor
  const spinChamber = () => {
    setChamberRotation((prev) => prev + 60);
    try {
      sound.rouletteTick(1.2);
    } catch {}
  };

  // Victoria
  const handleVictory = () => {
    if (!selectedRival || !user) return;
    setGameResult('won');
    sound.jackpot();
    confetti({ particleCount: 140, spread: 85, origin: { y: 0.6 } });
    const pot = selectedRival.bet * 2;
    onUpdateCoins(user.coins + pot);
    setRivalSpeech(selectedRival.loseQuote);
    setActionLog((prev) => [`¡VICTORIA TOTAL! Has derrotado a ${selectedRival.name} y ganado ${pot} monedas.`, ...prev]);
  };

  // Derrota
  const handleDefeat = () => {
    if (!selectedRival) return;
    setGameResult('lost');
    sound.broke();
    setRivalSpeech(selectedRival.winQuote);
    setActionLog((prev) => [`Has sido eliminado por ${selectedRival.name}. Pierdes ${selectedRival.bet} monedas.`, ...prev]);
  };

  // 3. Jugador usa un objeto
  const handleUsePlayerItem = (itemType: ItemType, index: number) => {
    if (isActionInProgress || turn !== 'player' || gameResult) return;

    sound.itemSound();
    setPlayerItems((prev) => prev.filter((_, i) => i !== index));

    switch (itemType) {
      case 'multimetro': {
        const currentShell = magazine[0];
        setSecretInspection(currentShell ? 'BALA REAL (Peligro)' : 'SALVA EN BLANCO (Seguro)');
        setActionLog((prev) => [
          `Multímetro Fluke: Medición completada -> ${currentShell ? 'Bala Real' : 'Salva'}.`,
          ...prev.slice(0, 5),
        ]);
        if (selectedRival) setRivalSpeech(selectedRival.taunts[0] || '¿Midiendo tensiones?');
        break;
      }
      case 'cable_rj45': {
        setIsRivalHandcuffed(true);
        setActionLog((prev) => [
          `Cable RJ45: ¡Has atado las manos a ${selectedRival?.name}! Se saltará su turno.`,
          ...prev.slice(0, 5),
        ]);
        if (selectedRival) setRivalSpeech('¡Bloqueo de puerto RJ45 no reglamentario!');
        break;
      }
      case 'crimpadora': {
        setIsDoubleDamage(true);
        setActionLog((prev) => [
          'Crimpadora: Cañón recortado. ¡El siguiente disparo causará 2 PUNTOS DE DAÑO!',
          ...prev.slice(0, 5),
        ]);
        if (selectedRival) setRivalSpeech('Esa crimpadora corta demasiado fino...');
        break;
      }
      case 'monster': {
        if (!selectedRival) return;
        setPlayerHp((prev) => Math.min(selectedRival.maxHp, prev + 1));
        setActionLog((prev) => [
          'Lata de Monster: Recuperas +1 punto de salud.',
          ...prev.slice(0, 5),
        ]);
        if (selectedRival) setRivalSpeech('Mucha cafeína para un solo examen.');
        break;
      }
      case 'inversor': {
        setMagazine((prev) => {
          if (prev.length === 0) return prev;
          const inverted = [...prev];
          inverted[0] = !inverted[0];
          return inverted;
        });
        setSecretInspection(null);
        setActionLog((prev) => [
          'Inversor de Polaridad: La bala en la recámara ha cambiado de polaridad.',
          ...prev.slice(0, 5),
        ]);
        if (selectedRival) setRivalSpeech('Invertir la polaridad... truco clásico de redes.');
        break;
      }
    }
  };

  // 4. Acción de disparo del jugador
  const handleShoot = (target: 'self' | 'rival') => {
    if (isActionInProgress || turn !== 'player' || gameResult || magazine.length === 0) return;

    setIsActionInProgress(true);
    setAimingTarget(target);
    setSecretInspection(null);
    spinChamber();

    const isLive = magazine[0];
    const damage = isDoubleDamage ? 2 : 1;
    setIsDoubleDamage(false);

    const nextMag = magazine.slice(1);
    setMagazine(nextMag);

    if (isLive) {
      setFiredLives((p) => p + 1);
    } else {
      setFiredBlanks((p) => p + 1);
    }

    setTimeout(() => {
      setAimingTarget(null);

      if (target === 'self') {
        if (isLive) {
          sound.gunshotBoom();
          triggerShake();
          const nextHp = Math.max(0, playerHp - damage);
          setPlayerHp(nextHp);
          setActionLog((prev) => [
            `¡BOOM! Te disparaste a ti mismo con BALA REAL (-${damage} vidas).`,
            ...prev.slice(0, 5),
          ]);

          if (nextHp <= 0) {
            handleDefeat();
            setIsActionInProgress(false);
            return;
          }

          passTurnToRival(nextMag);
        } else {
          // Salva disparada a sí mismo (CONSERVA EL TURNO)
          sound.dryFireClick();
          setActionLog((prev) => [
            '¡CLICK! Te disparaste con una SALVA en blanco. ¡Mantienes el turno!',
            ...prev.slice(0, 5),
          ]);
          if (selectedRival) setRivalSpeech('Bien jugado el descarte de salva...');

          if (nextMag.length === 0) {
            setTimeout(() => {
              setActionLog((prev) => ['Cargador agotado. Recargando...', ...prev.slice(0, 5)]);
              if (selectedRival) initRound(selectedRival.maxHp);
              setIsActionInProgress(false);
            }, 800);
          } else {
            setIsActionInProgress(false);
          }
        }
      } else {
        // Disparar al rival
        if (isLive) {
          sound.gunshotBoom();
          triggerShake();
          const nextHp = Math.max(0, rivalHp - damage);
          setRivalHp(nextHp);
          if (selectedRival) setRivalSpeech(selectedRival.hurtQuote);
          setActionLog((prev) => [
            `¡BOOM! Disparaste a ${selectedRival?.name} con BALA REAL (-${damage} vidas).`,
            ...prev.slice(0, 5),
          ]);

          if (nextHp <= 0) {
            handleVictory();
            setIsActionInProgress(false);
            return;
          }
        } else {
          sound.dryFireClick();
          setActionLog((prev) => [
            `¡CLICK! Disparaste a ${selectedRival?.name} pero la recámara tenía una SALVA.`,
            ...prev.slice(0, 5),
          ]);
          if (selectedRival) setRivalSpeech('Has desperdiciado una salva en mí. Mi turno.');
        }

        passTurnToRival(nextMag);
      }
    }, 450);
  };

  const passTurnToRival = (currentMag: boolean[]) => {
    if (currentMag.length === 0) {
      setTimeout(() => {
        setActionLog((prev) => ['Cargador agotado. Nueva tanda de balas en camino...', ...prev.slice(0, 5)]);
        if (selectedRival) initRound(selectedRival.maxHp);
      }, 800);
    }

    if (isRivalHandcuffed) {
      setIsRivalHandcuffed(false);
      setActionLog((prev) => [`${selectedRival?.name} está esposado con el RJ45 y se salta su turno.`, ...prev.slice(0, 5)]);
      setIsActionInProgress(false);
      setTurn('player');
      return;
    }

    setTurn('rival');
    setIsActionInProgress(false);
  };

  // =========================================================================
  // 5. MOTOR DE INTELIGENCIA DE BOTS (ESTRATEGIA AVANZADA & CONTEO DE BALAS)
  // =========================================================================
  useEffect(() => {
    if (turn !== 'rival' || gameResult || isActionInProgress || !selectedRival) return;

    let isMounted = true;
    setIsActionInProgress(true);

    const rivalTimer = setTimeout(() => {
      if (!isMounted || gameResult) return;

      // Estado exacto del tambor según el conteo del bot
      let currentMag = [...magazine];
      let rivalDmgMult = 1;
      let knownBullet: boolean | null = null;

      const remainingLives = totalLivesLoaded - firedLives;
      const remainingBlanks = totalBlanksLoaded - firedBlanks;
      const totalRemaining = Math.max(1, currentMag.length);
      const liveOdds = remainingLives / totalRemaining;

      // A) USO INTELIGENTE DE OBJETOS
      let updatedRivalItems = [...rivalItems];

      // 1. Si el rival está herido y tiene Monster, se cura
      const monsterIdx = updatedRivalItems.indexOf('monster');
      if (monsterIdx !== -1 && rivalHp < selectedRival.maxHp) {
        sound.itemSound();
        updatedRivalItems = updatedRivalItems.filter((_, i) => i !== monsterIdx);
        setRivalItems(updatedRivalItems);
        setRivalHp((p) => Math.min(selectedRival.maxHp, p + 1));
        setActionLog((prev) => [`${selectedRival.name} bebió un Monster (+1 de salud).`, ...prev.slice(0, 5)]);
      }

      // 2. Uso inteligente del Multímetro si no tiene certeza absoluta
      const multiIdx = updatedRivalItems.indexOf('multimetro');
      const needsInspection = remainingLives > 0 && remainingBlanks > 0;
      if (multiIdx !== -1 && needsInspection) {
        sound.itemSound();
        updatedRivalItems = updatedRivalItems.filter((_, i) => i !== multiIdx);
        setRivalItems(updatedRivalItems);
        knownBullet = currentMag[0]; // Sabe con certeza qué bala hay
        setActionLog((prev) => [`${selectedRival.name} usó el Multímetro para diagnosticar la recámara.`, ...prev.slice(0, 5)]);
      }

      // 3. Uso inteligente del Inversor de polaridad
      const invIdx = updatedRivalItems.indexOf('inversor');
      if (invIdx !== -1) {
        // Si sabe que es salva (o solo quedan salvas) y quiere atacar al jugador, la invierte a REAL
        const shouldInvertToLive =
          (knownBullet === false || remainingLives === 0) && playerHp <= 2;
        // Si sabe que es real y le queda 1 de vida y se va a disparar a sí mismo, la invierte a SALVA
        const shouldInvertToBlank =
          knownBullet === true && rivalHp === 1 && remainingBlanks > 0;

        if (shouldInvertToLive || shouldInvertToBlank) {
          sound.itemSound();
          updatedRivalItems = updatedRivalItems.filter((_, i) => i !== invIdx);
          setRivalItems(updatedRivalItems);
          currentMag[0] = !currentMag[0];
          setMagazine([...currentMag]);
          knownBullet = currentMag[0];
          setActionLog((prev) => [
            `${selectedRival.name} usó el Inversor de Polaridad en la recámara.`,
            ...prev.slice(0, 5),
          ]);
        }
      }

      // 4. Uso de Crimpadora si sabe o está casi seguro de que es REAL
      const crimpIdx = updatedRivalItems.indexOf('crimpadora');
      const isConfidentReal =
        knownBullet === true || (knownBullet === null && (remainingBlanks === 0 || liveOdds >= 0.7));
      if (crimpIdx !== -1 && isConfidentReal) {
        sound.itemSound();
        updatedRivalItems = updatedRivalItems.filter((_, i) => i !== crimpIdx);
        setRivalItems(updatedRivalItems);
        rivalDmgMult = 2;
        setActionLog((prev) => [`${selectedRival.name} recortó el cañón con la Crimpadora (Doble daño).`, ...prev.slice(0, 5)]);
      }

      // 5. Uso de Cable RJ45 para inmovilizar al jugador
      const cableIdx = updatedRivalItems.indexOf('cable_rj45');
      if (cableIdx !== -1 && !isPlayerHandcuffed && (rivalDmgMult === 2 || playerHp > 1)) {
        sound.itemSound();
        updatedRivalItems = updatedRivalItems.filter((_, i) => i !== cableIdx);
        setRivalItems(updatedRivalItems);
        setIsPlayerHandcuffed(true);
        setActionLog((prev) => [`¡${selectedRival.name} te inmovilizó con un cable RJ45! Te saltas tu turno.`, ...prev.slice(0, 5)]);
      }

      // B) DECISIÓN TÁCTICA DE DISPARO DEL BOT
      setTimeout(() => {
        if (!isMounted || gameResult) return;

        spinChamber();
        const isLive = currentMag[0];
        const nextMag = currentMag.slice(1);
        setMagazine(nextMag);

        if (isLive) {
          setFiredLives((p) => p + 1);
        } else {
          setFiredBlanks((p) => p + 1);
        }

        // Determinar objetivo del bot con su árbol de decisión inteligente
        let targetSelf = false;

        if (knownBullet === false) {
          // Si sabe al 100% que es salva, SIEMPRE se dispara a sí mismo para conservar turno
          targetSelf = true;
        } else if (knownBullet === true) {
          // Si sabe al 100% que es real, NUNCA se dispara a sí mismo
          targetSelf = false;
        } else if (remainingLives === 0) {
          // Conteo perfecto: No quedan balas reales en el tambor -> disparo seguro a sí mismo
          targetSelf = true;
        } else if (remainingBlanks === 0) {
          // Conteo perfecto: Todas las que quedan son reales -> disparo obligatorio al jugador
          targetSelf = false;
        } else {
          // Ponderación de dificultad
          if (selectedRival.difficulty === 'Fácil') {
            targetSelf = liveOdds < 0.35;
          } else if (selectedRival.difficulty === 'Medio') {
            targetSelf = liveOdds < 0.45;
          } else {
            // Difícil y Boss calculan el valor esperado matemático
            targetSelf = liveOdds <= 0.3;
          }
        }

        if (targetSelf) {
          // El rival se dispara a sí mismo
          if (isLive) {
            sound.gunshotBoom();
            triggerShake();
            const nextHp = Math.max(0, rivalHp - rivalDmgMult);
            setRivalHp(nextHp);
            setActionLog((prev) => [
              `¡BOOM! ${selectedRival.name} calculó mal y se disparó BALA REAL (-${rivalDmgMult} vidas).`,
              ...prev.slice(0, 5),
            ]);

            if (nextHp <= 0) {
              handleVictory();
              setIsActionInProgress(false);
              return;
            }

            passTurnToPlayer(nextMag);
          } else {
            // El rival acierta al dispararse con salva -> CONSERVA TURNO
            sound.dryFireClick();
            setActionLog((prev) => [
              `¡CLICK! ${selectedRival.name} se disparó con SALVA y conserva el turno.`,
              ...prev.slice(0, 5),
            ]);
            setRivalSpeech('El tambor me favorece. Sigo disparando.');

            if (nextMag.length === 0) {
              setTimeout(() => {
                if (selectedRival) initRound(selectedRival.maxHp);
                setIsActionInProgress(false);
              }, 800);
            } else {
              setIsActionInProgress(false);
              setTurn('player');
              setTimeout(() => setTurn('rival'), 150);
            }
          }
        } else {
          // El rival dispara al jugador
          if (isLive) {
            sound.gunshotBoom();
            triggerShake();
            const nextHp = Math.max(0, playerHp - rivalDmgMult);
            setPlayerHp(nextHp);
            setActionLog((prev) => [
              `¡BOOM! ${selectedRival.name} te disparó BALA REAL (-${rivalDmgMult} vidas).`,
              ...prev.slice(0, 5),
            ]);

            if (nextHp <= 0) {
              handleDefeat();
              setIsActionInProgress(false);
              return;
            }
          } else {
            sound.dryFireClick();
            setActionLog((prev) => [
              `¡CLICK! ${selectedRival.name} te disparó pero la recámara estaba en SALVA.`,
              ...prev.slice(0, 5),
            ]);
            setRivalSpeech('Mala suerte... era una salva. Tu turno.');
          }

          passTurnToPlayer(nextMag);
        }
      }, 700);
    }, 1200);

    return () => {
      isMounted = false;
      clearTimeout(rivalTimer);
    };
  }, [turn, magazine, rivalItems, rivalHp, playerHp, isActionInProgress, gameResult, selectedRival, firedLives, firedBlanks, totalLivesLoaded, totalBlanksLoaded]);

  const passTurnToPlayer = (currentMag: boolean[]) => {
    if (currentMag.length === 0) {
      setTimeout(() => {
        setActionLog((prev) => ['Cargador vacío. Recargando tambor...', ...prev.slice(0, 5)]);
        if (selectedRival) initRound(selectedRival.maxHp);
      }, 800);
    }

    if (isPlayerHandcuffed) {
      setIsPlayerHandcuffed(false);
      setActionLog((prev) => ['Estás esposado con el cable RJ45. ¡Te saltas tu turno!', ...prev.slice(0, 5)]);
      setTimeout(() => {
        setTurn('rival');
        setIsActionInProgress(false);
      }, 800);
      return;
    }

    setTurn('player');
    setIsActionInProgress(false);
  };

  // Renderizador de celdas de salud minimalistas
  const renderHealth = (hp: number, max: number) => {
    return (
      <div className="flex items-center gap-1.5">
        {Array.from({ length: max }).map((_, i) => (
          <span
            key={i}
            className={`w-5 h-2.5 rounded-sm transition-all duration-300 ${
              i < hp
                ? 'bg-red-500 shadow-xs shadow-red-500/40'
                : 'bg-surface-raised border border-border/70 opacity-40'
            }`}
          />
        ))}
      </div>
    );
  };

  // ==========================================
  // VISTA 1: LOBBY DE RIVALES (SELECCIONAR OPONENTE)
  // ==========================================
  if (!inDuel || !selectedRival) {
    return (
      <div className="space-y-6 font-sans">
        {/* Cabecera del Modo Duelo Táctico */}
        <div className="p-5 sm:p-6 rounded-3xl bg-surface border border-border shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start sm:items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-red-500/10 text-red-500 border border-red-500/20 flex items-center justify-center shrink-0 shadow-xs">
              <Crosshair className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-foreground tracking-tight">
                  Ruleta Rusa: Duelo Táctico SMR
                </h2>
                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-md bg-surface-raised border border-border text-foreground-muted">
                  Tactical Buckshot
                </span>
              </div>
              <p className="text-xs text-foreground-muted mt-0.5">
                Reta a los compañeros de clase con IA táctica inteligente. Conteo real de balas, objetos de redes y probabilidad dinámica.
              </p>
            </div>
          </div>

          <Button
            variant="secondary"
            size="sm"
            onClick={() => {
              sound.tap();
              setShowRulesModal(true);
            }}
            className="gap-1.5 text-xs font-mono font-medium"
          >
            <HelpCircle className="w-3.5 h-3.5" />
            <span>Reglas y Objetos</span>
          </Button>
        </div>

        {/* Modal de Reglas Minimalista */}
        {showRulesModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
            <Card className="max-w-lg w-full p-6 space-y-4 rounded-3xl bg-surface border border-border shadow-2xl text-foreground">
              <div className="flex items-center justify-between border-b border-border pb-3">
                <div className="flex items-center gap-2">
                  <ShieldAlert className="w-4 h-4 text-red-500" />
                  <h3 className="font-bold text-sm text-foreground">
                    Reglas del Duelo Táctico SMR
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setShowRulesModal(false)}
                  className="p-1 rounded-lg text-foreground-muted hover:text-foreground hover:bg-surface-raised transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-3 text-xs text-foreground-muted leading-relaxed">
                <div className="p-3 rounded-2xl bg-surface-raised border border-border/80 space-y-1">
                  <span className="font-bold text-foreground font-mono block">1. Mecánica de Turnos:</span>
                  <p>
                    El tambor se carga con una proporción conocida de <strong>Balas Reales</strong> y <strong>Salvas</strong>.
                  </p>
                  <p>
                    • Dispararte a <strong>ti mismo con Salva</strong>: No sufres daño y <strong>mantienes el turno</strong>.
                  </p>
                  <p>
                    • Disparar al <strong>rival con Bala Real</strong>: Le infliges daño y cedes el turno.
                  </p>
                </div>

                <div className="p-3 rounded-2xl bg-surface-raised border border-border/80 space-y-2">
                  <span className="font-bold text-foreground font-mono block">2. Herramientas Tácticas de Aula 204:</span>
                  <div className="space-y-1.5 font-mono text-[11px]">
                    <div>🔍 <strong>Multímetro Fluke:</strong> Mide si la bala en la recámara es real o salva.</div>
                    <div>🔌 <strong>Cable RJ45:</strong> Inmoviliza al oponente para que se salte su turno.</div>
                    <div>🪚 <strong>Crimpadora:</strong> El siguiente disparo causa el doble de daño (-2 vidas).</div>
                    <div>⚡ <strong>Lata de Monster:</strong> Recupera +1 punto de salud.</div>
                    <div>🔄 <strong>Inversor:</strong> Invierte la polaridad de la bala actual (Salva ↔ Real).</div>
                  </div>
                </div>
              </div>

              <Button
                variant="primary"
                size="sm"
                className="w-full font-mono text-xs"
                onClick={() => setShowRulesModal(false)}
              >
                Comprendido, ¡a jugar!
              </Button>
            </Card>
          </div>
        )}

        {/* Tarjetas de Selección de Rivales Minimalistas */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {RIVALS.map((rival) => {
            const canAfford = user ? user.coins >= rival.bet : false;

            return (
              <Card
                key={rival.id}
                className="p-5 rounded-3xl bg-surface border border-border hover:border-accent/40 shadow-xs flex flex-col justify-between space-y-4 transition-all"
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
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-surface-raised border border-border text-foreground-muted">
                            {rival.difficulty}
                          </span>
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

                  <p className="text-xs text-foreground-muted italic bg-surface-raised/50 p-3 rounded-2xl border border-border/60">
                    &quot;{rival.introQuote}&quot;
                  </p>

                  <div className="flex items-center justify-between text-xs font-mono text-foreground-subtle pt-1">
                    <div className="flex items-center gap-2">
                      <span>Salud:</span>
                      {renderHealth(rival.maxHp, rival.maxHp)}
                    </div>
                    <span>IA: <strong className="text-foreground">{rival.iqRating}</strong></span>
                  </div>
                </div>

                <Button
                  variant="primary"
                  size="md"
                  disabled={!canAfford}
                  onClick={() => handleStartDuel(rival)}
                  className="w-full rounded-2xl font-mono text-xs font-semibold gap-2 cursor-pointer shadow-xs"
                >
                  <Zap className="w-3.5 h-3.5 fill-current" />
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
  // VISTA 2: TABLERO DE DUELO ACTIVO (COMBATE TÁCTICO)
  // ==========================================
  const remainingLives = totalLivesLoaded - firedLives;
  const remainingBlanks = totalBlanksLoaded - firedBlanks;
  const currentTotalRemaining = Math.max(1, magazine.length);
  const liveProbabilityPercent = Math.round((remainingLives / currentTotalRemaining) * 100);

  return (
    <div className={`space-y-4 font-sans transition-transform duration-150 ${screenShake ? 'animate-shake' : ''}`}>
      {/* Barra superior de telemetría del duelo */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-4 rounded-3xl bg-surface border border-border shadow-xs">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => {
              if (window.confirm('¿Deseas retirarte del duelo? Se perderá la apuesta.')) {
                setInDuel(false);
                setSelectedRival(null);
              }
            }}
            className="w-9 h-9 rounded-xl bg-surface-raised hover:bg-surface border border-border flex items-center justify-center text-foreground-muted transition-colors cursor-pointer"
            title="Abandonar partida"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>

          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-foreground font-mono">
                VS {selectedRival.name.toUpperCase()}
              </h3>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-surface-raised border border-border text-amber-500 font-bold">
                Bote: {(selectedRival.bet * 2).toLocaleString()} fichas
              </span>
            </div>
            <p className="text-[11px] text-foreground-muted font-mono mt-0.5">
              Turno: <strong className={turn === 'player' ? 'text-accent font-bold' : 'text-amber-500 font-bold'}>
                {turn === 'player' ? 'TU TURNO' : `TURNO DE ${selectedRival.name.toUpperCase()}`}
              </strong>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 font-mono text-xs">
          {isDoubleDamage && (
            <span className="px-2.5 py-1 rounded-lg bg-rose-500/10 text-rose-500 border border-rose-500/30 text-[11px] font-bold">
              DOBLE DAÑO
            </span>
          )}
          {isRivalHandcuffed && (
            <span className="px-2.5 py-1 rounded-lg bg-sky-500/10 text-sky-400 border border-sky-500/30 text-[11px] font-bold">
              RIVAL ESPOSADO
            </span>
          )}
          {isPlayerHandcuffed && (
            <span className="px-2.5 py-1 rounded-lg bg-amber-500/10 text-amber-500 border border-amber-500/30 text-[11px] font-bold">
              ESTÁS ESPOSADO
            </span>
          )}
        </div>
      </div>

      {/* Mesa central de combate: Diseño táctico industrial sin diseño de IA */}
      <div className="relative p-6 sm:p-8 rounded-3xl bg-surface border border-border shadow-md flex flex-col items-center justify-between min-h-[480px] space-y-6 overflow-hidden">
        {/* Cabecera del Rival */}
        <div className="w-full flex items-center justify-between gap-4 z-10">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-surface-raised border border-border flex items-center justify-center font-mono font-bold text-foreground">
              {selectedRival.avatarInitials}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-sm text-foreground">{selectedRival.name}</span>
                <span className="text-[10px] font-mono text-foreground-subtle">({selectedRival.difficulty})</span>
              </div>
              <div className="mt-1 flex items-center gap-2">
                <span className="text-[10px] font-mono text-foreground-muted">Salud:</span>
                {renderHealth(rivalHp, selectedRival.maxHp)}
              </div>
            </div>
          </div>

          {/* Inventario del Rival */}
          <div className="flex items-center gap-1.5 bg-surface-raised px-3 py-1.5 rounded-2xl border border-border">
            <span className="text-[10px] font-mono text-foreground-subtle mr-1 hidden sm:inline">Objetos:</span>
            {rivalItems.length === 0 ? (
              <span className="text-[10px] font-mono text-foreground-subtle">Sin objetos</span>
            ) : (
              rivalItems.map((item, idx) => {
                const def = ITEMS[item];
                const IconComponent = def.icon;
                return (
                  <div
                    key={idx}
                    title={`${def.name}: ${def.shortDesc}`}
                    className="w-7 h-7 rounded-lg bg-surface border border-border flex items-center justify-center text-foreground-muted"
                  >
                    <IconComponent className={`w-3.5 h-3.5 ${def.colorClass}`} />
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Diálogo dinámico de reacción del bot */}
        {rivalSpeech && (
          <div className="z-10 max-w-md w-full text-center px-4 py-2 rounded-2xl bg-surface-raised border border-border text-xs text-foreground italic shadow-xs animate-in fade-in font-mono">
            &quot;{rivalSpeech}&quot;
          </div>
        )}

        {/* CILINDRO MECÁNICO TÁCTICO & HUD DE PROBABILIDAD */}
        <div className="flex flex-col items-center justify-center space-y-4 z-10 py-2">
          {/* Tambor Visual Giratorio SVG */}
          <div className="relative w-20 h-20 flex items-center justify-center">
            <svg
              viewBox="0 0 100 100"
              className="w-20 h-20 transition-transform duration-500 ease-out"
              style={{ transform: `rotate(${chamberRotation}deg)` }}
            >
              <circle cx="50" cy="50" r="46" fill="currentColor" className="text-surface-raised" stroke="currentColor" strokeWidth="4" />
              <circle cx="50" cy="50" r="16" fill="currentColor" className="text-border" />
              {/* Orificios del tambor */}
              {[0, 60, 120, 180, 240, 300].map((angle, idx) => {
                const rad = (angle * Math.PI) / 180;
                const x = 50 + 30 * Math.cos(rad);
                const y = 50 + 30 * Math.sin(rad);
                return (
                  <circle
                    key={idx}
                    cx={x}
                    cy={y}
                    r="8"
                    fill="currentColor"
                    className={idx === 0 ? 'text-red-500/80 animate-pulse' : 'text-border'}
                  />
                );
              })}
            </svg>
          </div>

          {/* HUD de Probabilidad Táctica */}
          <div className="flex flex-wrap items-center justify-center gap-2 font-mono text-xs select-none">
            <div className="px-3 py-1 rounded-xl bg-surface-raised border border-border flex items-center gap-2">
              <Activity className="w-3.5 h-3.5 text-accent" />
              <span>
                Probabilidad Real:{' '}
                <strong
                  className={
                    liveProbabilityPercent >= 60
                      ? 'text-red-500 font-bold'
                      : liveProbabilityPercent <= 30
                      ? 'text-emerald-500 font-bold'
                      : 'text-amber-500 font-bold'
                  }
                >
                  {liveProbabilityPercent}%
                </strong>
              </span>
            </div>

            <div className="px-3 py-1 rounded-xl bg-surface-raised border border-border text-foreground-muted">
              Tambor: <strong className="text-red-500">{remainingLives} Reales</strong> ·{' '}
              <strong className="text-foreground">{remainingBlanks} Salvas</strong>
            </div>
          </div>

          {/* Revelación del Multímetro si fue utilizado */}
          {secretInspection && (
            <div className="px-4 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-500 text-xs font-mono font-bold animate-in zoom-in-95">
              Voltaje Recámara: {secretInspection}
            </div>
          )}

          {/* Registro del último movimiento */}
          <div className="text-xs font-mono text-foreground-muted bg-surface-raised px-4 py-1.5 rounded-xl border border-border/80 max-w-lg text-center truncate">
            {actionLog[0] || 'Duelo en curso.'}
          </div>
        </div>

        {/* Zona del Jugador & Acciones */}
        <div className="w-full space-y-4 z-10">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-foreground text-background font-bold flex items-center justify-center font-mono text-xs">
                TÚ
              </div>
              <div>
                <span className="font-bold text-sm text-foreground">Tu Estado</span>
                <div className="mt-1 flex items-center gap-2">
                  <span className="text-[10px] font-mono text-foreground-muted">Salud:</span>
                  {renderHealth(playerHp, selectedRival.maxHp)}
                </div>
              </div>
            </div>

            {/* Inventario de Objetos del Jugador */}
            <div className="flex items-center gap-1.5 bg-surface-raised px-3.5 py-2 rounded-2xl border border-border">
              <span className="text-[10px] font-mono text-foreground-subtle mr-1 hidden sm:inline">Tus Objetos:</span>
              {playerItems.length === 0 ? (
                <span className="text-[10px] font-mono text-foreground-subtle">Sin objetos</span>
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
                      title={`${def.name}: ${def.shortDesc}`}
                      className="px-2.5 py-1.5 rounded-xl bg-surface hover:bg-surface-raised border border-border/80 flex items-center gap-1.5 text-xs text-foreground font-mono transition-all active:scale-95 disabled:opacity-40 cursor-pointer shadow-2xs"
                    >
                      <IconComponent className={`w-3.5 h-3.5 ${def.colorClass}`} />
                      <span className="text-[11px] font-medium">{def.name.split(' ')[0]}</span>
                    </button>
                  );
                })
              )}
            </div>
          </div>

          {/* Toma de Decisión Crítica: Botones de Disparo */}
          {!gameResult ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 font-mono">
              <button
                type="button"
                disabled={turn !== 'player' || isActionInProgress}
                onClick={() => handleShoot('self')}
                className={`py-3.5 px-4 rounded-2xl border transition-all active:scale-98 disabled:opacity-40 cursor-pointer flex flex-col items-center justify-center ${
                  aimingTarget === 'self'
                    ? 'bg-emerald-500/20 border-emerald-500 text-emerald-500'
                    : 'bg-surface-raised hover:bg-surface border-border text-foreground'
                }`}
              >
                <div className="flex items-center gap-2 font-bold text-xs sm:text-sm">
                  <Heart className="w-4 h-4 text-emerald-500" />
                  <span>DISPARARME A MÍ MISMO</span>
                </div>
                <span className="text-[10px] text-foreground-muted mt-0.5">
                  Si es salva, no recibes daño y conservas el turno
                </span>
              </button>

              <button
                type="button"
                disabled={turn !== 'player' || isActionInProgress}
                onClick={() => handleShoot('rival')}
                className={`py-3.5 px-4 rounded-2xl border transition-all active:scale-98 disabled:opacity-40 cursor-pointer flex flex-col items-center justify-center ${
                  aimingTarget === 'rival'
                    ? 'bg-red-500 text-white border-red-600 shadow-lg'
                    : 'bg-red-600/90 hover:bg-red-600 text-white border-red-700/80 shadow-xs'
                }`}
              >
                <div className="flex items-center gap-2 font-bold text-xs sm:text-sm">
                  <Skull className="w-4 h-4" />
                  <span>DISPARAR A {selectedRival.name.toUpperCase()}</span>
                </div>
                <span className="text-[10px] text-red-200 mt-0.5">
                  Si es bala real, le infliges daño y cedes el turno
                </span>
              </button>
            </div>
          ) : (
            /* Pantalla Final de Duelo */
            <div className="p-4 rounded-2xl bg-surface-raised border border-border text-center space-y-3 animate-in fade-in font-mono">
              <div className="flex items-center justify-center gap-2">
                {gameResult === 'won' ? (
                  <>
                    <Trophy className="w-5 h-5 text-amber-500" />
                    <h3 className="text-sm font-bold text-emerald-500">¡DUELO GANADO CON ÉXITO!</h3>
                  </>
                ) : (
                  <>
                    <Skull className="w-5 h-5 text-rose-500" />
                    <h3 className="text-sm font-bold text-rose-500">HAS SIDO ELIMINADO</h3>
                  </>
                )}
              </div>
              <p className="text-xs text-foreground-muted">
                {gameResult === 'won'
                  ? `Has ganado ${(selectedRival.bet * 2).toLocaleString()} fichas añadidas a tu cuenta.`
                  : `Has perdido ${selectedRival.bet.toLocaleString()} fichas en esta partida.`}
              </p>

              <div className="flex items-center justify-center gap-2 pt-2">
                <Button
                  variant="secondary"
                  size="sm"
                  className="rounded-xl font-mono text-xs"
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
                  className="rounded-xl font-mono text-xs"
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
