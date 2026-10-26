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
    introQuote: 'He calculado la desviación estándar y el checksum del cargador. Tu probabilidad de supervivencia es del 33%.',
    hurtQuote: 'Error de paridad imprevisto... recalculando algoritmo.',
    winQuote: 'Las matemáticas nunca fallan. Deberías repasar binario.',
    loseQuote: 'Una anomalía estadística imperdonable... enhorabuena.',
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

  // Estado del duelo activo
  const [playerHp, setPlayerHp] = useState<number>(3);
  const [rivalHp, setRivalHp] = useState<number>(3);
  const [magazine, setMagazine] = useState<boolean[]>([]); // true = bala real, false = salva
  const [totalLivesLoaded, setTotalLivesLoaded] = useState<number>(0);
  const [totalBlanksLoaded, setTotalBlanksLoaded] = useState<number>(0);
  const [turn, setTurn] = useState<'player' | 'rival'>('player');

  // Inventarios de objetos
  const [playerItems, setPlayerItems] = useState<ItemType[]>([]);
  const [rivalItems, setRivalItems] = useState<ItemType[]>([]);

  // Modificadores de turno
  const [isDoubleDamage, setIsDoubleDamage] = useState<boolean>(false);
  const [isRivalHandcuffed, setIsRivalHandcuffed] = useState<boolean>(false);
  const [isPlayerHandcuffed, setIsPlayerHandcuffed] = useState<boolean>(false);

  // Estados visuales y de suspense
  const [screenShake, setScreenShake] = useState<boolean>(false);
  const [isActionInProgress, setIsActionInProgress] = useState<boolean>(false);
  const [actionLog, setActionLog] = useState<string[]>([]);
  const [secretInspection, setSecretInspection] = useState<string | null>(null);
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
    const total = liveCount + blankCount;

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
    setIsDoubleDamage(false);
    setSecretInspection(null);

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
      `Cargador cargado: ${liveCount} ${liveCount === 1 ? 'Bala Real' : 'Balas Reales'} y ${blankCount} ${blankCount === 1 ? 'Salva' : 'Salvas'}.`,
      ...prev.slice(0, 5),
    ]);
  };

  // Trigger screen shake animation
  const triggerShake = () => {
    setScreenShake(true);
    setTimeout(() => setScreenShake(false), 450);
  };

  // Finalizar partida con victoria
  const handleVictory = () => {
    if (!selectedRival || !user) return;
    setGameResult('won');
    sound.jackpot();
    confetti({ particleCount: 120, spread: 80, origin: { y: 0.6 } });
    const pot = selectedRival.bet * 2;
    onUpdateCoins(user.coins + pot);
    setRivalSpeech(selectedRival.loseQuote);
    setActionLog((prev) => [`¡VICTORIA! Has derrotado a ${selectedRival.name} y ganado el bote de ${pot} monedas.`, ...prev]);
  };

  // Finalizar partida con derrota
  const handleDefeat = () => {
    if (!selectedRival) return;
    setGameResult('lost');
    sound.broke();
    setRivalSpeech(selectedRival.winQuote);
    setActionLog((prev) => [`Has sido eliminado por ${selectedRival.name}. Has perdido ${selectedRival.bet} monedas.`, ...prev]);
  };

  // 3. Jugador usa un objeto de su inventario
  const handleUsePlayerItem = (itemType: ItemType, index: number) => {
    if (isActionInProgress || turn !== 'player' || gameResult) return;

    sound.itemSound();
    setPlayerItems((prev) => prev.filter((_, i) => i !== index));

    switch (itemType) {
      case 'multimetro': {
        const currentShell = magazine[0];
        setSecretInspection(currentShell ? 'BALA REAL (Peligro)' : 'SALVA EN BLANCO (Seguro)');
        setActionLog((prev) => [
          `Usaste Multímetro: Has medido la recámara actual -> ${currentShell ? 'Bala Real' : 'Salva'}.`,
          ...prev.slice(0, 5),
        ]);
        break;
      }
      case 'cable_rj45': {
        setIsRivalHandcuffed(true);
        setActionLog((prev) => [
          `Usaste Cable RJ45: ¡Has atado a ${selectedRival?.name}! Se saltará su siguiente turno.`,
          ...prev.slice(0, 5),
        ]);
        break;
      }
      case 'crimpadora': {
        setIsDoubleDamage(true);
        setActionLog((prev) => [
          'Usaste Crimpadora: El cañón está serrado. ¡El siguiente disparo causará 2 DE DAÑO!',
          ...prev.slice(0, 5),
        ]);
        break;
      }
      case 'monster': {
        if (!selectedRival) return;
        setPlayerHp((prev) => Math.min(selectedRival.maxHp, prev + 1));
        setActionLog((prev) => [
          'Bebiste una lata de Monster: Has recuperado +1 punto de salud.',
          ...prev.slice(0, 5),
        ]);
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
          'Usaste Inversor de Polaridad: La polaridad de la bala en la recámara ha sido invertida.',
          ...prev.slice(0, 5),
        ]);
        break;
      }
    }
  };

  // 4. Acción de disparo del jugador
  const handleShoot = (target: 'self' | 'rival') => {
    if (isActionInProgress || turn !== 'player' || gameResult || magazine.length === 0) return;

    setIsActionInProgress(true);
    setSecretInspection(null);
    sound.tap();

    const isLive = magazine[0];
    const damage = isDoubleDamage ? 2 : 1;
    setIsDoubleDamage(false);

    const nextMag = magazine.slice(1);
    setMagazine(nextMag);

    setTimeout(() => {
      if (target === 'self') {
        if (isLive) {
          // Se disparó a sí mismo con bala real
          sound.gunshotBoom();
          triggerShake();
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
          setActionLog((prev) => [
            '¡CLICK! Te disparaste a ti mismo con una SALVA en blanco. ¡Conservas el turno!',
            ...prev.slice(0, 5),
          ]);

          // Comprobar si el cargador quedó vacío
          if (nextMag.length === 0) {
            setTimeout(() => {
              setActionLog((prev) => ['Cargador vacío. Recargando nueva tanda...', ...prev.slice(0, 5)]);
              if (selectedRival) initRound(selectedRival.maxHp);
              setIsActionInProgress(false);
            }, 1000);
          } else {
            setIsActionInProgress(false);
          }
        }
      } else {
        // Disparó al rival
        if (isLive) {
          sound.gunshotBoom();
          triggerShake();
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
          setActionLog((prev) => [
            `¡CLICK! Disparaste a ${selectedRival?.name} pero era una SALVA en blanco.`,
            ...prev.slice(0, 5),
          ]);
        }

        // Pasa turno al rival
        passTurnToRival(nextMag);
      }
    }, 400);
  };

  // Pasar turno al rival con verificación de esposas / cargador vacío
  const passTurnToRival = (currentMag: boolean[]) => {
    // Si el cargador quedó vacío, recargar
    if (currentMag.length === 0) {
      setTimeout(() => {
        setActionLog((prev) => ['Cargador vacío. Recargando nueva tanda de balas...', ...prev.slice(0, 5)]);
        if (selectedRival) initRound(selectedRival.maxHp);
      }, 1000);
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

  // 5. Turno de la IA del rival
  useEffect(() => {
    if (turn !== 'rival' || gameResult || isActionInProgress || !selectedRival) return;

    let isMounted = true;
    setIsActionInProgress(true);

    const rivalTimer = setTimeout(() => {
      if (!isMounted || gameResult) return;

      // 1. Decisión de uso de objeto por parte del rival
      let currentMag = [...magazine];
      let rivalDmgMult = 1;
      let knownBullet: boolean | null = null;

      // Si el rival tiene objetos en su inventario, evalúa si usar uno
      if (rivalItems.length > 0) {
        // ¿Tiene Monster y salud baja?
        const monsterIdx = rivalItems.indexOf('monster');
        if (monsterIdx !== -1 && rivalHp < selectedRival.maxHp) {
          sound.itemSound();
          setRivalItems((prev) => prev.filter((_, i) => i !== monsterIdx));
          setRivalHp((prev) => Math.min(selectedRival.maxHp, prev + 1));
          setActionLog((prev) => [`${selectedRival.name} se bebió un Monster (+1 de salud).`, ...prev.slice(0, 5)]);
        }

        // ¿Tiene Multímetro para espiar?
        const multiIdx = rivalItems.indexOf('multimetro');
        if (multiIdx !== -1 && Math.random() < 0.6) {
          sound.itemSound();
          setRivalItems((prev) => prev.filter((_, i) => i !== multiIdx));
          knownBullet = currentMag[0];
          setActionLog((prev) => [`${selectedRival.name} usó el Multímetro para inspeccionar la recámara.`, ...prev.slice(0, 5)]);
        }

        // ¿Tiene Crimpadora y sabe que es real?
        const crimpIdx = rivalItems.indexOf('crimpadora');
        if (crimpIdx !== -1 && (knownBullet === true || Math.random() < 0.35)) {
          sound.itemSound();
          setRivalItems((prev) => prev.filter((_, i) => i !== crimpIdx));
          rivalDmgMult = 2;
          setActionLog((prev) => [`${selectedRival.name} afiló el cañón con la Crimpadora (Doble daño).`, ...prev.slice(0, 5)]);
        }

        // ¿Tiene Cable RJ45 y no está esposado el jugador?
        const cableIdx = rivalItems.indexOf('cable_rj45');
        if (cableIdx !== -1 && !isPlayerHandcuffed && Math.random() < 0.5) {
          sound.itemSound();
          setRivalItems((prev) => prev.filter((_, i) => i !== cableIdx));
          setIsPlayerHandcuffed(true);
          setActionLog((prev) => [`¡${selectedRival.name} te ha atado con un cable RJ45! Te saltarás tu próximo turno.`, ...prev.slice(0, 5)]);
        }
      }

      // 2. Decisión de disparo del rival
      setTimeout(() => {
        if (!isMounted || gameResult) return;

        const isLive = currentMag[0];
        const nextMag = currentMag.slice(1);
        setMagazine(nextMag);

        // Si sabe que es salva, se dispara a sí mismo para mantener turno.
        // Si no sabe, calcula según proporción de balas.
        let targetSelf = false;
        if (knownBullet === false) {
          targetSelf = true;
        } else if (knownBullet === true) {
          targetSelf = false;
        } else {
          // Probabilidad aleatoria según dificultad
          const liveOdds = totalLivesLoaded / Math.max(1, currentMag.length);
          targetSelf = liveOdds < 0.35;
        }

        if (targetSelf) {
          // El rival se dispara a sí mismo
          if (isLive) {
            sound.gunshotBoom();
            triggerShake();
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
            setActionLog((prev) => [`¡CLICK! ${selectedRival.name} se disparó con una SALVA en blanco y conserva el turno.`, ...prev.slice(0, 5)]);

            if (nextMag.length === 0) {
              setTimeout(() => {
                if (selectedRival) initRound(selectedRival.maxHp);
                setIsActionInProgress(false);
              }, 1000);
            } else {
              setIsActionInProgress(false);
              // Vuelve a jugar el rival inmediatamente
              setTurn('player'); // Temporal toggle to trigger rival effect if needed or keep in rival
              setTimeout(() => setTurn('rival'), 200);
            }
          }
        } else {
          // El rival dispara al jugador
          if (isLive) {
            sound.gunshotBoom();
            triggerShake();
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
            setActionLog((prev) => [`¡CLICK! ${selectedRival.name} te disparó pero la recámara estaba en SALVA.`, ...prev.slice(0, 5)]);
          }

          // Pasa turno al jugador
          passTurnToPlayer(nextMag);
        }
      }, 700);
    }, 1300);

    return () => {
      isMounted = false;
      clearTimeout(rivalTimer);
    };
  }, [turn, magazine, rivalItems, rivalHp, playerHp, isActionInProgress, gameResult, selectedRival]);

  // Pasar turno al jugador con verificación de esposas / cargador vacío
  const passTurnToPlayer = (currentMag: boolean[]) => {
    if (currentMag.length === 0) {
      setTimeout(() => {
        setActionLog((prev) => ['Cargador vacío. Recargando nueva tanda de balas...', ...prev.slice(0, 5)]);
        if (selectedRival) initRound(selectedRival.maxHp);
      }, 1000);
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

  // Renderizar indicador de salud (corazones/baterías)
  const renderHealth = (hp: number, max: number) => {
    return (
      <div className="flex items-center gap-1.5">
        {Array.from({ length: max }).map((_, i) => (
          <span
            key={i}
            className={`w-6 h-3 rounded-full transition-all duration-300 ${
              i < hp ? 'bg-red-500 shadow-sm shadow-red-500/50' : 'bg-surface-raised border border-border/80'
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
      <div className="space-y-6">
        {/* Cabecera del Modo Duelo Táctico */}
        <div className="p-5 sm:p-6 rounded-3xl bg-surface-raised border border-border/70 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start sm:items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-red-500/10 text-red-400 border border-red-500/20 flex items-center justify-center shrink-0 shadow-xs">
              <Flame className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-foreground tracking-tight">
                  Ruleta Rusa: Duelo Táctico SMR
                </h2>
                <Badge variant="outline" className="text-[10px] font-mono border-red-500/30 text-red-400 bg-red-500/10">
                  Buckshot Style
                </Badge>
              </div>
              <p className="text-xs text-foreground-muted mt-0.5">
                Reta al instante a los personajes de clase. Elige si dispararte a ti mismo o al rival y usa herramientas de redes para ganar.
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
              className="gap-1.5 text-xs font-medium"
            >
              <HelpCircle className="w-4 h-4 text-accent" />
              <span>Reglas y Objetos</span>
            </Button>
          </div>
        </div>

        {/* Modal de Reglas y Explicación */}
        {showRulesModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
            <Card className="w-full max-w-lg p-5 space-y-4 max-h-[85vh] overflow-y-auto rounded-3xl shadow-2xl bg-surface border border-border">
              <div className="flex items-center justify-between border-b border-border pb-3">
                <div className="flex items-center gap-2">
                  <Flame className="w-5 h-5 text-red-500" />
                  <h3 className="font-bold text-sm text-foreground">Reglas del Duelo Táctico</h3>
                </div>
                <button
                  onClick={() => setShowRulesModal(false)}
                  className="p-1 rounded-lg text-foreground-muted hover:text-foreground"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-3 text-xs text-foreground-muted leading-relaxed">
                <div className="p-3 rounded-2xl bg-surface-raised border border-border space-y-1">
                  <span className="font-bold text-foreground block">1. La Mecánica del Disparo:</span>
                  <p>
                    El tambor se carga con una mezcla de <strong>Balas Reales</strong> y <strong>Salvas (en blanco)</strong>.
                  </p>
                  <p>
                    • Si te <strong>disparas a ti mismo</strong> con una Salva, ¡no recibes daño y <strong>conservas el turno</strong>!
                  </p>
                  <p>
                    • Si disparas al <strong>rival</strong> con una Bala Real, le quitas vida.
                  </p>
                </div>

                <div className="p-3 rounded-2xl bg-surface-raised border border-border space-y-2">
                  <span className="font-bold text-foreground block">2. Los 5 Objetos de 2º SMR:</span>
                  <div className="space-y-1.5 font-mono text-[11px]">
                    <div>🔍 <strong>Multímetro Fluke:</strong> Te dice qué bala hay en la recámara actual.</div>
                    <div>🔌 <strong>Cable RJ45:</strong> Inmoviliza al rival para que se salte su turno.</div>
                    <div>🪚 <strong>Crimpadora:</strong> El siguiente disparo hace el doble de daño (-2 vidas).</div>
                    <div>⚡ <strong>Lata de Monster:</strong> Recupera +1 punto de salud.</div>
                    <div>🔄 <strong>Inversor:</strong> Cambia la bala de Salva a Real (o viceversa).</div>
                  </div>
                </div>

                <div className="p-3 rounded-2xl bg-surface-raised border border-border space-y-1">
                  <span className="font-bold text-foreground block">3. Apuestas y Bote:</span>
                  <p>
                    El ganador se lleva el 100% del bote (tu apuesta + la apuesta del rival) transferido a sus monedas oficiales.
                  </p>
                </div>
              </div>

              <Button
                variant="primary"
                size="sm"
                className="w-full"
                onClick={() => setShowRulesModal(false)}
              >
                Entendido, ¡vamos a jugar!
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
                                ? 'border-amber-500/40 text-amber-400 bg-amber-500/10'
                                : rival.difficulty === 'Difícil'
                                ? 'border-rose-500/40 text-rose-400 bg-rose-500/10'
                                : rival.difficulty === 'Medio'
                                ? 'border-cyan-500/40 text-cyan-400 bg-cyan-500/10'
                                : 'border-emerald-500/40 text-emerald-400 bg-emerald-500/10'
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
                      <span>Salud inicial:</span>
                      {renderHealth(rival.maxHp, rival.maxHp)}
                    </div>
                    <span>Bote ganador: <strong className="text-foreground">{(rival.bet * 2).toLocaleString()}</strong></span>
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
  // VISTA 2: TABLERO DE DUELO ACTIVO (MESA DE JUEGO)
  // ==========================================
  const remainingLiveEstimate = totalLivesLoaded;
  const remainingBlankEstimate = totalBlanksLoaded;

  return (
    <div className={`space-y-5 transition-transform duration-150 ${screenShake ? 'animate-shake' : ''}`}>
      {/* Barra superior de estado del duelo */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-4 rounded-3xl bg-surface-raised border border-border/80 shadow-xs">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => {
              if (window.confirm('¿Quieres abandonar el duelo? Se perderá la apuesta.')) {
                setInDuel(false);
                setSelectedRival(null);
              }
            }}
            className="w-10 h-10 rounded-xl bg-surface hover:bg-surface-hover border border-border flex items-center justify-center text-foreground-muted transition-colors cursor-pointer"
            title="Abandonar partida"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>

          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-foreground">
                Duelo vs {selectedRival.name} ({selectedRival.nickname})
              </h3>
              <Badge variant="outline" className="text-[10px] font-mono border-amber-500/30 text-amber-400 bg-amber-500/10">
                Bote: {(selectedRival.bet * 2).toLocaleString()} fichas
              </Badge>
            </div>
            <p className="text-[11px] text-foreground-muted font-mono mt-0.5">
              Turno actual: <strong className={turn === 'player' ? 'text-accent' : 'text-amber-500'}>{turn === 'player' ? 'Tu turno' : `Turno de ${selectedRival.name}`}</strong>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {isDoubleDamage && (
            <Badge variant="outline" className="text-xs font-mono font-medium bg-rose-500/15 text-rose-500 border-rose-500/30">
              Doble daño activo
            </Badge>
          )}
          {isRivalHandcuffed && (
            <Badge variant="outline" className="text-xs font-mono bg-cyan-500/20 text-cyan-300 border-cyan-500/40">
              Rival Esposado
            </Badge>
          )}
        </div>
      </div>

      {/* Mesa central de combate */}
      <div className="relative p-6 sm:p-8 rounded-3xl bg-radial from-[#151520] to-[#0a0a0f] border border-white/10 shadow-2xl flex flex-col items-center justify-between min-h-[460px] space-y-6 overflow-hidden">
        {/* Cabecera del Rival */}
        <div className="w-full flex items-center justify-between gap-4 z-10">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-white/10 border border-white/15 text-white font-bold flex items-center justify-center font-mono">
              {selectedRival.avatarInitials}
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
              <span className="text-[10px] font-mono text-zinc-500">Sin objetos</span>
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

        {/* Indicador de Balas en el Cargador Central */}
        <div className="flex flex-col items-center justify-center space-y-3 z-10 py-2">
          <div className="flex items-center gap-2 px-4 py-2 rounded-2xl bg-black/50 border border-white/15 backdrop-blur-md shadow-lg">
            <span className="text-xs font-mono text-zinc-300 font-semibold">
              Balas en el cargador: <strong className="text-amber-400">{magazine.length}</strong> restantes
            </span>
          </div>

          {/* Revelación secreta si usó el Multímetro */}
          {secretInspection && (
            <div className="px-3.5 py-1 rounded-full bg-cyan-500/15 border border-cyan-500/30 text-cyan-400 text-xs font-mono font-medium">
              Inspección: {secretInspection}
            </div>
          )}

          {/* Registro del último movimiento */}
          <div className="text-xs font-mono text-zinc-300 bg-black/60 px-4 py-1.5 rounded-xl border border-white/5 max-w-lg text-center truncate">
            {actionLog[0] || 'La partida está en marcha.'}
          </div>
        </div>

        {/* Zona Inferior: Datos del Jugador y Controles */}
        <div className="w-full space-y-4 z-10">
          {/* Cabecera del Jugador */}
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-accent/20 border border-accent/40 text-accent font-bold flex items-center justify-center font-mono">
                TÚ
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
                      title={`Pulsar para usar ${def.name}: ${def.shortDesc}`}
                      className="px-2.5 py-1.5 rounded-xl bg-surface-raised hover:bg-surface border border-border/80 flex items-center gap-1.5 text-xs text-foreground font-medium transition-all active:scale-95 disabled:opacity-40 cursor-pointer"
                    >
                      <IconComponent className="w-3.5 h-3.5 text-accent" />
                      <span className="text-[11px] font-mono">{def.name.split(' ')[0]}</span>
                    </button>
                  );
                })
              )}
            </div>
          </div>

          {/* Botones de Disparo (Toma de Decisión Crítica) */}
          {!gameResult ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
              <button
                type="button"
                disabled={turn !== 'player' || isActionInProgress}
                onClick={() => handleShoot('self')}
                className="py-3.5 px-4 rounded-2xl bg-surface-raised hover:bg-surface border border-border/80 text-foreground flex flex-col items-center justify-center transition-all active:scale-98 disabled:opacity-40 cursor-pointer shadow-sm"
              >
                <div className="flex items-center gap-2 font-bold text-sm">
                  <Heart className="w-4 h-4 text-emerald-400" />
                  <span>Dispararme a mí mismo</span>
                </div>
                <span className="text-[10px] font-mono text-foreground-muted mt-0.5">
                  Si es salva, conservas tu turno y juegas otra vez
                </span>
              </button>

              <button
                type="button"
                disabled={turn !== 'player' || isActionInProgress}
                onClick={() => handleShoot('rival')}
                className="py-3.5 px-4 rounded-2xl bg-red-600/90 hover:bg-red-600 text-white flex flex-col items-center justify-center transition-all active:scale-98 disabled:opacity-40 cursor-pointer shadow-md shadow-red-600/20"
              >
                <div className="flex items-center gap-2 font-bold text-sm">
                  <Skull className="w-4 h-4 text-white" />
                  <span>Disparar a {selectedRival.name}</span>
                </div>
                <span className="text-[10px] font-mono text-red-200 mt-0.5">
                  Si es bala real, le infliges daño y pasa turno
                </span>
              </button>
            </div>
          ) : (
            /* Pantalla de Fin de Duelo */
            <div className="p-4 rounded-2xl bg-black/70 border border-white/20 text-center space-y-3 animate-in fade-in">
              <div className="flex items-center justify-center gap-2">
                {gameResult === 'won' ? (
                  <>
                    <Trophy className="w-6 h-6 text-amber-400" />
                    <h3 className="text-base font-bold text-emerald-400">¡HAS GANADO EL DUELO!</h3>
                  </>
                ) : (
                  <>
                    <Skull className="w-6 h-6 text-rose-400" />
                    <h3 className="text-base font-bold text-rose-400">HAS SIDO ELIMINADO</h3>
                  </>
                )}
              </div>
              <p className="text-xs text-zinc-300">
                {gameResult === 'won'
                  ? `Has ganado ${(selectedRival.bet * 2).toLocaleString()} fichas acreditadas directamente a tu saldo.`
                  : `Has perdido ${selectedRival.bet.toLocaleString()} fichas apostadas.`}
              </p>

              <div className="flex items-center justify-center gap-2 pt-2">
                <Button
                  variant="secondary"
                  size="sm"
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
                  onClick={() => handleStartDuel(selectedRival)}
                >
                  Revancha inmediata
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
