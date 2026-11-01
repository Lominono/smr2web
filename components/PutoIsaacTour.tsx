'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { sound } from '@/lib/audio';
import {
  X,
  ArrowRight,
  RotateCcw,
  Send,
  Sparkles,
  Loader2,
  Trash2,
  Calendar,
  TrendingUp,
  MessageSquare,
  Dices,
  Coins,
  Trophy,
  Terminal,
  Check,
  Copy,
  Shield,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { getCurrentScheduleStatus } from '@/lib/scheduleData';
import { UserProfile } from '@/lib/types';

interface TourStep {
  title: string;
  text: string;
  tabTarget?: 'chat' | 'investments' | 'schedule';
}

const TOUR_STEPS: TourStep[] = [
  {
    title: '¡Epa socio!',
    text: 'Soy PUTOISAAC, la bola tonta de 2º SMR. Te enseño esto en dos patadas pa que no te pierdas el primer día.',
  },
  {
    title: 'El Tablón en Vivo',
    text: 'Aquí la peña escribe avisos, quejas del examen o tonterías. Lo que pongas le llega a toda la clase al instante sin recargar nada.',
    tabTarget: 'chat',
  },
  {
    title: 'La Bolsa del Botellón',
    text: 'Aquí te dan 1.000 monedas por la cara. Puedes comprar acciones de coña como Mercadona o Kebab Amigo para hacerte rico.',
    tabTarget: 'investments',
  },
  {
    title: 'Cotizaciones Reales',
    text: 'Ojo que esto se mueve de verdad: si los compas compran a lo loco, la gráfica sube. Si todos venden, se va a la mierda.',
    tabTarget: 'investments',
  },
  {
    title: 'Horario y Juegos',
    text: 'Arriba ves qué clase toca hoy para no llegar tarde, y hay juegos como la Ruleta Rusa. ¡Ale, ponte las pilas y no suspendas redes!',
    tabTarget: 'schedule',
  },
];

const RANDOM_TIPS = [
  'El Crash arranca en 0.50x. Si eres un cagón cobras en 0.70x, pero el equilibrio es 1.00x. No seas ludópata. [ACTION:games]',
  'Ponte a estudiar subnetting que luego vienen los lloros en el examen de redes. [CMD:ipcalc 192.168.1.0/24]',
  'Si tus colegas compran Kebab Amigo a saco, el precio sube en directo para todos. [ACTION:investments]',
  'Guarda siempre con Ctrl+S en los PCs del aula 35, que luego se va la luz y a llorar.',
  'En la Ruleta Rusa: si usas el Multímetro y sale salva, ¡dispárate a ti mismo para conservar el turno, espabila! [ACTION:games]',
  '¿Te has quedado sin fichas por apostar como un mono? Reclama en el grifo diario antes de llorar en el tablón. [ACTION:faucet]',
  'En el tablón puedes responder a tus compañeros y soltar propinas de 50 fichas al que no sea un lerdo. [ACTION:chat]',
  '¿Te has liado? Si quieres, te repito el tour de la web en dos patadas, pero no me des la chapa.',
];

export type IsaacActionType =
  | 'schedule'
  | 'investments'
  | 'chat'
  | 'games'
  | 'faucet'
  | 'leaderboard'
  | 'admin'
  | 'changelog';

export interface ParsedIsaacAction {
  type: IsaacActionType;
  label: string;
}

export function parseIsaacMessage(rawText: string): {
  cleanText: string;
  actions: ParsedIsaacAction[];
  commands: string[];
} {
  let cleanText = rawText || '';
  const actions: ParsedIsaacAction[] = [];
  const commands: string[] = [];

  const actionMap: Record<IsaacActionType, string> = {
    schedule: 'Ver Horario',
    investments: 'Ir a La Bolsa',
    chat: 'Ver Tablón',
    games: 'Jugar Ruleta',
    faucet: 'Pedir Fichas',
    leaderboard: 'Ver Ranking',
    admin: 'Panel Admin',
    changelog: 'Ver Novedades',
  };

  const actionMatches = Array.from(
    cleanText.matchAll(/\[ACTION:(schedule|investments|chat|games|faucet|leaderboard|admin|changelog)\]/g)
  );
  for (const match of actionMatches) {
    const act = match[1] as IsaacActionType;
    if (!actions.some((a) => a.type === act)) {
      actions.push({ type: act, label: actionMap[act] });
    }
  }
  cleanText = cleanText.replace(/\[ACTION:[^\]]+\]/g, '').trim();

  const cmdMatches = Array.from(cleanText.matchAll(/\[CMD:([^\]]+)\]/g));
  for (const match of cmdMatches) {
    const cmd = match[1].trim();
    if (cmd && !commands.includes(cmd)) {
      commands.push(cmd);
    }
  }
  cleanText = cleanText.replace(/\[CMD:[^\]]+\]/g, '').trim();

  return { cleanText, actions, commands };
}

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

interface HourlyQuotaInfo {
  remaining: number;
  total: number;
  minutesUntilReset: number;
  isBlocked: boolean;
}

const HOURLY_LIMIT = 12;

function getHourlyQuotaInfo(): HourlyQuotaInfo {
  try {
    const now = Date.now();
    const oneHourAgo = now - 60 * 60 * 1000;
    const raw = localStorage.getItem('smr2_isaac_hourly_requests');
    let timestamps: number[] = raw ? JSON.parse(raw) : [];
    timestamps = timestamps.filter((t) => typeof t === 'number' && t > oneHourAgo);
    localStorage.setItem('smr2_isaac_hourly_requests', JSON.stringify(timestamps));

    const remaining = Math.max(0, HOURLY_LIMIT - timestamps.length);
    let minutesUntilReset = 0;
    if (remaining === 0 && timestamps.length > 0) {
      const oldest = Math.min(...timestamps);
      minutesUntilReset = Math.max(1, Math.ceil((oldest + 60 * 60 * 1000 - now) / 60000));
    }
    return {
      remaining,
      total: HOURLY_LIMIT,
      minutesUntilReset,
      isBlocked: remaining <= 0,
    };
  } catch {
    return { remaining: HOURLY_LIMIT, total: HOURLY_LIMIT, minutesUntilReset: 0, isBlocked: false };
  }
}

function recordHourlyAiRequest(): void {
  try {
    const now = Date.now();
    const oneHourAgo = now - 60 * 60 * 1000;
    const raw = localStorage.getItem('smr2_isaac_hourly_requests');
    let timestamps: number[] = raw ? JSON.parse(raw) : [];
    timestamps = timestamps.filter((t) => typeof t === 'number' && t > oneHourAgo);
    timestamps.push(now);
    localStorage.setItem('smr2_isaac_hourly_requests', JSON.stringify(timestamps));
  } catch {}
}

interface PutoIsaacTourProps {
  onSelectTab?: (tab: 'chat' | 'investments' | 'schedule' | 'russian_roulette') => void;
  isOpenControlled?: boolean;
  onCloseControlled?: () => void;
  currentTab?: string;
  currentUser?: UserProfile | null;
  onOpenLeaderboard?: () => void;
  onOpenFaucet?: () => void;
  onTourStateChange?: (isActive: boolean) => void;
}

export const PutoIsaacTour: React.FC<PutoIsaacTourProps> = ({
  onSelectTab,
  isOpenControlled,
  onCloseControlled,
  currentTab = 'feed',
  currentUser = null,
  onOpenLeaderboard,
  onOpenFaucet,
  onTourStateChange,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [displayedText, setDisplayedText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [isBlinking, setIsBlinking] = useState(false);
  const [isTalking, setIsTalking] = useState(false);
  const [isMuted, setIsMuted] = useState(false);

  // Acciones interactivas y comandos extraídos del mensaje actual
  const [currentActions, setCurrentActions] = useState<ParsedIsaacAction[]>([]);
  const [currentCommands, setCurrentCommands] = useState<string[]>([]);
  const [copiedCmd, setCopiedCmd] = useState<string | null>(null);

  // Cuota por hora (en lugar de por día) para no agotar el plan gratuito
  const [hourlyQuota, setHourlyQuota] = useState<HourlyQuotaInfo>(getHourlyQuotaInfo);

  const refreshHourlyQuota = useCallback(() => {
    setHourlyQuota(getHourlyQuotaInfo());
  }, []);

  useEffect(() => {
    refreshHourlyQuota();
    const timer = setInterval(refreshHourlyQuota, 20000);
    return () => clearInterval(timer);
  }, [refreshHourlyQuota, isOpen]);

  // Estado del tour completado
  const [isTourCompleted, setIsTourCompleted] = useState(true);

  // Modo libre o IA
  const [isIdleChat, setIsIdleChat] = useState(false);
  const [idleMessage, setIdleMessage] = useState('');
  const [aiPrompt, setAiPrompt] = useState('');
  const [isAiLoading, setIsAiLoading] = useState(false);

  // Memoria volátil de la conversación durante la sesión activa
  const [volatileHistory, setVolatileHistory] = useState<ChatMessage[]>([]);

  // Sistema anti-abuso del frontend (cooldown entre mensajes)
  const [cooldown, setCooldown] = useState(0);

  // Control estricto de textos fijos sin reinicios
  const currentTextKeyRef = useRef<string>('');
  const typewriterTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const onSelectTabRef = useRef(onSelectTab);
  const onOpenLeaderboardRef = useRef(onOpenLeaderboard);
  const onOpenFaucetRef = useRef(onOpenFaucet);

  useEffect(() => {
    onSelectTabRef.current = onSelectTab;
    onOpenLeaderboardRef.current = onOpenLeaderboard;
    onOpenFaucetRef.current = onOpenFaucet;
  }, [onSelectTab, onOpenLeaderboard, onOpenFaucet]);

  // Comprobar al montar si el usuario ya vio el tour
  useEffect(() => {
    try {
      const tourDone = localStorage.getItem('smr2_putoisaac_tour_done') === 'true';
      setIsTourCompleted(tourDone);
      if (!tourDone && isOpenControlled === undefined) {
        const needsId = Boolean(
          currentUser &&
          currentUser.role !== 'admin' &&
          currentUser.username !== 'admin' &&
          (!currentUser.full_name || !currentUser.student_number)
        );
        if (!needsId) {
          const timer = setTimeout(() => {
            setIsOpen(true);
          }, 1200);
          return () => clearTimeout(timer);
        }
      }
    } catch {}
  }, [isOpenControlled, currentUser]);

  // Apertura controlada externa
  useEffect(() => {
    if (isOpenControlled) {
      setCurrentStep(0);
      setIsIdleChat(false);
      setIsTourCompleted(false);
      setIsOpen(true);
    }
  }, [isOpenControlled]);

  // Temporizador para el cooldown anti-abuso
  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setInterval(() => {
      setCooldown((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [cooldown]);

  // Animaciones físicas y reactivas de PUTOISAAC
  const [pupilOffset, setPupilOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isSquishing, setIsSquishing] = useState<boolean>(false);
  const [talkPhoneme, setTalkPhoneme] = useState<number>(0);
  const mascotRef = useRef<HTMLDivElement | null>(null);

  // Estados de animación procedural en reposo (idle)
  const [idleAction, setIdleAction] = useState<'normal' | 'look_left' | 'look_right' | 'yawn' | 'hop' | 'curious'>('normal');

  // Ciclo de animaciones procedurales periódicas cuando PUTOISAAC no está haciendo nada
  useEffect(() => {
    if (isTalking || isAiLoading || isSquishing) {
      setIdleAction('normal');
      return;
    }

    let resetTimer: NodeJS.Timeout;
    const interval = setInterval(() => {
      if (isTalking || isAiLoading || isSquishing) return;

      const actions: ('look_left' | 'look_right' | 'yawn' | 'hop' | 'curious')[] = [
        'look_left',
        'look_right',
        'yawn',
        'hop',
        'curious',
      ];
      const randomAction = actions[Math.floor(Math.random() * actions.length)];
      setIdleAction(randomAction);

      const duration = randomAction === 'yawn' ? 2400 : 1800;
      resetTimer = setTimeout(() => {
        setIdleAction('normal');
      }, duration);
    }, 5500 + Math.random() * 3500);

    return () => {
      clearInterval(interval);
      clearTimeout(resetTimer);
    };
  }, [isTalking, isAiLoading, isSquishing]);

  // Smart Docking: detectar desplazamiento del usuario para acomodarse discretamente
  const [isScrolling, setIsScrolling] = useState<boolean>(false);
  const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolling(true);
      if (scrollTimeoutRef.current) clearTimeout(scrollTimeoutRef.current);
      scrollTimeoutRef.current = setTimeout(() => {
        setIsScrolling(false);
      }, 700);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', handleScroll);
      if (scrollTimeoutRef.current) clearTimeout(scrollTimeoutRef.current);
    };
  }, []);

  // Seguimiento ocular interactivo del cursor
  useEffect(() => {
    let animFrame: number;
    const handlePointerMove = (e: MouseEvent) => {
      if (!mascotRef.current) return;
      cancelAnimationFrame(animFrame);
      animFrame = requestAnimationFrame(() => {
        if (!mascotRef.current) return;
        const rect = mascotRef.current.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;

        const dx = e.clientX - centerX;
        const dy = e.clientY - centerY;
        const angle = Math.atan2(dy, dx);
        const dist = Math.min(Math.hypot(dx, dy) / 100, 1);

        // Desplazamiento máximo de la pupila de 2.2px para mantener proporciones cómicas
        const maxDist = 2.2;
        setPupilOffset({
          x: Math.cos(angle) * dist * maxDist,
          y: Math.sin(angle) * dist * maxDist,
        });
      });
    };

    window.addEventListener('mousemove', handlePointerMove, { passive: true });
    return () => {
      window.removeEventListener('mousemove', handlePointerMove);
      cancelAnimationFrame(animFrame);
    };
  }, []);

  // Animación expresiva de fonemas de la boca mientras habla
  useEffect(() => {
    if (!isTalking) {
      setTalkPhoneme(0);
      return;
    }
    const timer = setInterval(() => {
      setTalkPhoneme((p) => (p + 1) % 4);
    }, 95);
    return () => clearInterval(timer);
  }, [isTalking]);

  const triggerSquish = useCallback(() => {
    setIsSquishing(true);
    setTimeout(() => setIsSquishing(false), 450);
  }, []);

  // Parpadeo natural de los ojos con micro-pausas orgánicas
  useEffect(() => {
    let timeout: NodeJS.Timeout;
    const scheduleNextBlink = () => {
      timeout = setTimeout(() => {
        setIsBlinking(true);
        setTimeout(() => {
          setIsBlinking(false);
          // 25% de probabilidad de doble parpadeo curioso
          if (Math.random() < 0.25) {
            setTimeout(() => {
              setIsBlinking(true);
              setTimeout(() => {
                setIsBlinking(false);
                scheduleNextBlink();
              }, 120);
            }, 140);
          } else {
            scheduleNextBlink();
          }
        }, 160);
      }, 3000 + Math.random() * 3200);
    };

    scheduleNextBlink();
    return () => clearTimeout(timeout);
  }, []);

  // Máquina de escribir: reproduce el sonido melódico rítmico mientras habla y extrae acciones
  const startTypewriter = useCallback((rawTargetText: string, messageKey: string) => {
    if (typewriterTimeoutRef.current) {
      clearTimeout(typewriterTimeoutRef.current);
    }

    const { cleanText, actions, commands } = parseIsaacMessage(rawTargetText);
    setCurrentActions(actions);
    setCurrentCommands(commands);
    setCopiedCmd(null);

    currentTextKeyRef.current = messageKey;
    setDisplayedText('');
    setIsTyping(true);
    setIsTalking(true);

    let charIndex = 0;

    const typeNext = () => {
      if (currentTextKeyRef.current !== messageKey) return;

      if (charIndex <= cleanText.length) {
        setDisplayedText(cleanText.slice(0, charIndex));
        charIndex += 1;

        const char = cleanText[charIndex - 1];
        if (char && char.trim() !== '' && charIndex % 2 === 0) {
          try {
            sound.isaacChirp(char, charIndex);
          } catch {}
        }

        const delay = char === '.' || char === '!' || char === '?' ? 55 : 18;
        typewriterTimeoutRef.current = setTimeout(typeNext, delay);
      } else {
        setDisplayedText(cleanText);
        setIsTyping(false);
        setIsTalking(false);
      }
    };

    typewriterTimeoutRef.current = setTimeout(typeNext, 40);
  }, []);

  const getTourStep = useCallback((stepIdx: number): TourStep => {
    const base = TOUR_STEPS[stepIdx] || TOUR_STEPS[0];
    if (stepIdx === 0) {
      if (currentUser?.full_name || currentUser?.student_number) {
        const firstName = currentUser.full_name ? currentUser.full_name.trim().split(' ')[0] : (currentUser.username || 'socio');
        const seatText = currentUser.student_number ? `Puesto #${currentUser.student_number}` : 'Aula 35';
        return {
          title: `¡Epa, ${firstName}!`,
          text: `¡${seatText} registrado! Soy PUTOISAAC, el asistente de 2º SMR. Te enseño esto en dos patadas para que no te pierdas el primer día.`,
        };
      }
      return {
        title: '¡Epa socio!',
        text: 'Ya tenemos tu puesto del aula fichado. Soy PUTOISAAC, el asistente de 2º SMR. Te enseño esto en dos patadas para que no te pierdas el primer día.',
      };
    }
    return base;
  }, [currentUser]);

  // Disparar texto correspondiente según el estado
  useEffect(() => {
    if (!isOpen) {
      setIsTalking(false);
      return;
    }

    if (isIdleChat) {
      const key = `idle_${idleMessage}`;
      if (currentTextKeyRef.current !== key) {
        startTypewriter(idleMessage, key);
      }
      return;
    }

    const step = getTourStep(currentStep);
    if (!step) return;

    if (onSelectTabRef.current && step.tabTarget) {
      onSelectTabRef.current(step.tabTarget);
    }

    const key = `tour_step_${currentStep}_${currentUser?.student_number || 'default'}`;
    if (currentTextKeyRef.current !== key) {
      startTypewriter(step.text, key);
    }
  }, [isOpen, currentStep, isIdleChat, idleMessage, startTypewriter, getTourStep, currentUser]);

  // Completar el texto al hacer clic en el bocadillo
  const handleBubbleClick = () => {
    if (isTyping) {
      if (typewriterTimeoutRef.current) {
        clearTimeout(typewriterTimeoutRef.current);
      }
      const rawText = isIdleChat ? idleMessage : getTourStep(currentStep)?.text || '';
      const { cleanText, actions, commands } = parseIsaacMessage(rawText);
      setCurrentActions(actions);
      setCurrentCommands(commands);
      setDisplayedText(cleanText);
      setIsTyping(false);
      setIsTalking(false);
      try {
        sound.isaacPop();
      } catch {}
    }
  };

  const handleNext = () => {
    try {
      sound.tap();
    } catch {}

    if (currentStep < TOUR_STEPS.length - 1) {
      setCurrentStep((prev) => prev + 1);
    } else {
      try {
        localStorage.setItem('smr2_putoisaac_tour_done', 'true');
        window.dispatchEvent(new CustomEvent('smr2_tour_completed'));
      } catch {}
      setIsTourCompleted(true);
      setIsOpen(false);
      setIsIdleChat(true);
      if (onCloseControlled) {
        onCloseControlled();
      }
    }
  };

  const handleClose = (markDone: boolean = true) => {
    try {
      sound.tap();
    } catch {}
    if (markDone) {
      try {
        localStorage.setItem('smr2_putoisaac_tour_done', 'true');
        window.dispatchEvent(new CustomEvent('smr2_tour_completed'));
      } catch {}
      setIsTourCompleted(true);
    }
    setIsOpen(false);
    if (onCloseControlled) {
      onCloseControlled();
    }
  };

  const handleMascotClick = () => {
    try {
      sound.isaacPop();
    } catch {}

    if (isOpen) {
      handleClose(false);
      return;
    }

    if (isTourCompleted) {
      const randomMsg = RANDOM_TIPS[Math.floor(Math.random() * RANDOM_TIPS.length)];
      setIdleMessage(randomMsg);
      setIsIdleChat(true);
      setIsOpen(true);
    } else {
      setCurrentStep(0);
      setIsIdleChat(false);
      setIsOpen(true);
    }
  };

  const handleRestartTour = () => {
    try {
      sound.tap();
    } catch {}
    setCurrentStep(0);
    setIsIdleChat(false);
    setIsTourCompleted(false);
    setIsOpen(true);
  };

  const toggleSound = () => {
    const nextState = !sound.enabled;
    sound.enabled = nextState;
    setIsMuted(!nextState);
    if (nextState) {
      try {
        sound.isaacPop();
      } catch {}
    }
  };

  // Ejecución interactiva de acciones del asistente
  const handleExecuteAction = (actionType: IsaacActionType) => {
    try {
      sound.isaacAction();
    } catch {}

    switch (actionType) {
      case 'schedule':
        onSelectTabRef.current?.('schedule');
        break;
      case 'investments':
        onSelectTabRef.current?.('investments');
        break;
      case 'chat':
        onSelectTabRef.current?.('chat');
        break;
      case 'games':
        onSelectTabRef.current?.('russian_roulette');
        break;
      case 'leaderboard':
        onOpenLeaderboardRef.current?.();
        break;
      case 'faucet':
        onOpenFaucetRef.current?.();
        break;
      case 'admin':
        window.location.href = '/admin';
        break;
      case 'changelog':
        window.dispatchEvent(new CustomEvent('smr2_open_changelog'));
        break;
    }
  };

  const handleCopyCommand = async (cmd: string) => {
    try {
      sound.isaacAction();
      await navigator.clipboard.writeText(cmd);
      setCopiedCmd(cmd);
      setTimeout(() => setCopiedCmd(null), 2000);
    } catch {}
  };

  // Motor del asistente inteligente con reconocimiento directo de intenciones
  const executeAssistantPrompt = async (rawInput: string) => {
    const prompt = rawInput.trim();
    if (!prompt || isAiLoading || cooldown > 0) return;

    if (prompt.length > 280) {
      const tooLong = 'Menudo tocho socio, resume un poco que no tengo el día para leer novelas en clase.';
      setIdleMessage(tooLong);
      startTypewriter(tooLong, `warn_${Date.now()}`);
      return;
    }

    const norm = prompt.toLowerCase();

    // 1. Filtro estricto de seguridad: Burlarse de quien pida claves o el Easter Egg
    if (
      norm.includes('contraseña') ||
      norm.includes('clave') ||
      norm.includes('password') ||
      norm.includes('prelaunch') ||
      norm.includes('easter egg') ||
      norm.includes('secreto') ||
      norm.includes('davidgay')
    ) {
      const reply = '¿Qué te crees, que te voy a regalar los accesos del sistema por la cara? Espabila y búscate la vida, que para ser hacker hay que tener cerebro y no pedirlo todo masticado, pedazo de vago.';
      setIdleMessage(reply);
      setIsIdleChat(true);
      startTypewriter(reply, `secret_pass_${Date.now()}`);
      return;
    }

    // 2. Comprobación estricta de cuota POR HORA antes de llamar a la IA
    const currentQuota = getHourlyQuotaInfo();
    if (currentQuota.isBlocked) {
      const quotaMsg = `Has fundido tu cupo de ${currentQuota.total} preguntas por hora, pesao. Vuelve en ${currentQuota.minutesUntilReset} min. Atiende a clase mientras tanto.`;
      setIdleMessage(quotaMsg);
      setIsIdleChat(true);
      startTypewriter(quotaMsg, `quota_${Date.now()}`);
      return;
    }

    // 3. Consulta a la API remota con contexto completo del aula y usuario
    try {
      sound.tap();
      setIsAiLoading(true);
      setAiPrompt('');
      setCooldown(5); // 5 segundos de cooldown anti-abuso

      const updatedHistory: ChatMessage[] = [
        ...volatileHistory.slice(-4),
        { role: 'user', content: prompt },
      ];
      setVolatileHistory(updatedHistory);

      const sched = getCurrentScheduleStatus();
      const context = {
        username: currentUser?.username || 'alumno',
        coins: currentUser?.coins ?? 1000,
        activeTab: currentTab || 'feed',
        scheduleStatus: {
          status: sched.status,
          currentSubject: sched.currentSubject?.name || sched.currentSubjectCode,
          minutesRemaining: sched.minutesRemaining,
          nextSubject: sched.nextSubject?.name || sched.nextSubjectCode,
          slotLabel: sched.currentSlot?.label,
        },
      };

      const res = await fetch('/api/ai/isaac', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt,
          history: updatedHistory,
          context,
        }),
      });

      // Registrar consulta de IA para la cuota horaria
      recordHourlyAiRequest();
      refreshHourlyQuota();

      const data = await res.json();
      const reply = data.reply || 'Buah me he liado yo solo, pregúntame otra vez.';

      setVolatileHistory((prev) => [...prev.slice(-4), { role: 'assistant', content: reply }]);

      setIdleMessage(reply);
      setIsIdleChat(true);
      startTypewriter(reply, `ai_${Date.now()}`);
    } catch {
      const errorMsg = 'Se me ha cortado la conexión de la bola. Dale otra vez.';
      setIdleMessage(errorMsg);
      startTypewriter(errorMsg, `ai_err_${Date.now()}`);
    } finally {
      setIsAiLoading(false);
      refreshHourlyQuota();
    }
  };

  const handleSendAiPrompt = async (e: React.FormEvent) => {
    e.preventDefault();
    await executeAssistantPrompt(aiPrompt);
  };

  const handleClearMemory = () => {
    setVolatileHistory([]);
    setIdleMessage('Memoria borrada fiera. ¿De qué hablábamos? Ya no me acuerdo de nada jajaja.');
    startTypewriter('Memoria borrada fiera. ¿De qué hablábamos? Ya no me acuerdo de nada jajaja.', `clear_${Date.now()}`);
    try {
      sound.tap();
    } catch {}
  };

  const isIntroTourActive = !isTourCompleted && isOpen && !isIdleChat;

  useEffect(() => {
    onTourStateChange?.(isIntroTourActive);
  }, [isIntroTourActive, onTourStateChange]);

  // Smart Docking: Posición inteligente sin estorbar la navegación ni los controles del aula
  let positionClasses = 'bottom-[calc(4.75rem+env(safe-area-inset-bottom,0px))] left-3.5 sm:left-6 sm:bottom-6';
  let mascotScale = 'scale-100';
  let bubbleAlignment = 'items-start';

  if (isIntroTourActive) {
    positionClasses = 'bottom-[calc(5rem+env(safe-area-inset-bottom,0px))] sm:bottom-10 left-1/2 -translate-x-1/2';
    mascotScale = 'scale-115 sm:scale-120';
    bubbleAlignment = 'items-center';
  } else if (!isOpen && isScrolling) {
    // Si el usuario hace scroll y PUTOISAAC está cerrado, se repliega discretamente
    mascotScale = 'scale-85 opacity-35 hover:opacity-100 hover:scale-100 transition-all duration-300';
  }

  return (
    <>
      {/* Telón sutil y limpio durante el tour guiado para evitar solapamientos y clics accidentales */}
      {isIntroTourActive && (
        <div
          className="fixed inset-0 z-40 bg-black/40 backdrop-blur-[1.5px] pointer-events-auto transition-opacity duration-300"
          aria-hidden="true"
        />
      )}

      {/* Fondo transparente para cerrar el bocadillo con un toque fuera en modo libre */}
      {isOpen && isTourCompleted && (
        <div
          onClick={() => handleClose(false)}
          className="fixed inset-0 z-40 bg-black/20 backdrop-blur-[1px] cursor-default pointer-events-auto"
          aria-hidden="true"
        />
      )}

      <aside
        aria-label="Asistente interactivo PUTOISAAC"
        className={`fixed z-50 pointer-events-none select-none font-sans transition-all duration-500 ease-out ${positionClasses}`}
      >
        <style jsx>{`
          @keyframes putoFloat {
            0%, 100% {
              transform: translateY(0px) rotate(0deg);
            }
            25% {
              transform: translateY(-4px) rotate(1.2deg);
            }
            50% {
              transform: translateY(-8px) rotate(-1deg);
            }
            75% {
              transform: translateY(-3px) rotate(0.8deg);
            }
          }
          @keyframes putoIdleHop {
            0%, 100% {
              transform: translateY(0px) scale(1, 1);
            }
            25% {
              transform: translateY(-8px) scale(0.95, 1.05);
            }
            50% {
              transform: translateY(-11px) scale(0.98, 1.02);
            }
            75% {
              transform: translateY(1px) scale(1.05, 0.95);
            }
          }
          @keyframes putoYawnAnim {
            0%, 100% {
              transform: scale(1, 1);
            }
            35% {
              transform: scale(0.95, 1.07) translateY(-2px);
            }
            70% {
              transform: scale(1.03, 0.97);
            }
          }
          @keyframes putoSquish {
            0% {
              transform: scale(1, 1);
            }
            25% {
              transform: scale(1.28, 0.74);
            }
            50% {
              transform: scale(0.88, 1.16);
            }
            75% {
              transform: scale(1.06, 0.96);
            }
            100% {
              transform: scale(1, 1);
            }
          }
          @keyframes shadowPulse {
            0%, 100% {
              transform: scale(1);
              opacity: 0.35;
            }
            50% {
              transform: scale(0.68);
              opacity: 0.16;
            }
          }
          @keyframes thinkPulse {
            0%, 100% {
              box-shadow: 0 0 0 0 rgba(245, 158, 11, 0.4), inset 0 2px 6px rgba(255, 255, 255, 0.8);
            }
            50% {
              box-shadow: 0 0 16px 4px rgba(245, 158, 11, 0.65), inset 0 2px 6px rgba(255, 255, 255, 0.95);
            }
          }
        `}</style>

        <div className={`relative flex flex-col pointer-events-auto ${bubbleAlignment}`}>
          {/* Bocadillo rediseñado: Minimalista, Obsidian & Titanium */}
          {isOpen && (
            <div
              onClick={handleBubbleClick}
              className="mb-2.5 w-[calc(100vw-28px)] max-w-[340px] sm:max-w-[360px] bg-neutral-950/95 backdrop-blur-2xl text-white border border-neutral-800/90 rounded-2xl p-4 shadow-2xl cursor-pointer relative animate-in fade-in zoom-in-95 duration-200 ring-1 ring-white/[0.06]"
              style={{
                boxShadow: '0 20px 48px rgba(0,0,0,0.65), inset 0 1px 0 rgba(255,255,255,0.08)',
              }}
            >
              {/* Cabecera minimalista del asistente */}
              <div className="flex items-center justify-between pb-2 border-b border-neutral-800/80 mb-2">
                <div className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="text-[11px] font-bold tracking-wider text-white uppercase font-mono">
                    PUTOISAAC
                  </span>
                  {!isTourCompleted && !isIdleChat ? (
                    <span className="text-[10px] text-neutral-400 font-mono ml-1">
                      {currentStep + 1}/{TOUR_STEPS.length}
                    </span>
                  ) : (
                    <span className="text-[9.5px] text-neutral-500 font-mono ml-1">
                      aula 35
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-1.5">
                  {/* Cuota por hora minimalista */}
                  {isIdleChat && (
                    <span
                      className={`text-[9.5px] font-mono px-2 py-0.5 rounded-full border transition-colors ${
                        hourlyQuota.isBlocked
                          ? 'bg-amber-500/10 border-amber-500/30 text-amber-400 font-medium'
                          : hourlyQuota.remaining <= 2
                          ? 'bg-amber-500/10 border-amber-500/20 text-amber-300'
                          : 'bg-neutral-900 border-neutral-800 text-neutral-400'
                      }`}
                      title={
                        hourlyQuota.isBlocked
                          ? `Cupo bloqueado temporalmente. Recarga en ${hourlyQuota.minutesUntilReset} min.`
                          : `${hourlyQuota.remaining} de ${hourlyQuota.total} preguntas restantes en esta hora.`
                      }
                    >
                      {hourlyQuota.isBlocked
                        ? `recarga ${hourlyQuota.minutesUntilReset}m`
                        : `${hourlyQuota.remaining}/${hourlyQuota.total} h`}
                    </span>
                  )}

                  {/* Botón de silenciar voz */}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleSound();
                    }}
                    className="w-5 h-5 rounded text-neutral-400 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
                    title={isMuted ? 'Activar voz' : 'Silenciar voz'}
                  >
                    {isMuted ? (
                      <VolumeX className="w-3 h-3 text-neutral-500" />
                    ) : (
                      <Volume2 className="w-3 h-3" />
                    )}
                  </button>

                  {/* Borrar memoria volátil */}
                  {isIdleChat && volatileHistory.length > 0 && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleClearMemory();
                      }}
                      className="w-5 h-5 rounded text-neutral-500 hover:text-amber-400 flex items-center justify-center transition-colors cursor-pointer"
                      title="Olvidar conversación previa"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  )}

                  {/* Cerrar asistente */}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleClose(true);
                    }}
                    className="w-5 h-5 rounded-md text-neutral-400 hover:text-white hover:bg-neutral-800 flex items-center justify-center transition-colors cursor-pointer"
                    title="Cerrar"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Título o estado de la conversación */}
              <h4 className="text-[11.5px] font-semibold text-amber-400 mb-1 font-mono tracking-tight">
                {isIdleChat ? 'Asistente Aula 35' : getTourStep(currentStep)?.title}
              </h4>

              {/* Texto mecanografiado con audio melódico suave */}
              <div className="text-[12px] text-neutral-200 leading-relaxed min-h-[42px] font-sans">
                {displayedText}
                {isTyping && (
                  <span className="inline-block w-1.5 h-3.5 ml-0.5 bg-amber-400/90 animate-pulse align-middle" />
                )}
              </div>

              {/* Acciones interactivas del asistente */}
              {currentActions.length > 0 && !isTyping && (
                <div className="mt-2.5 pt-2 border-t border-neutral-800/80 flex flex-wrap gap-1.5 animate-in fade-in duration-200">
                  {currentActions.map((act) => (
                    <button
                      key={act.type}
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleExecuteAction(act.type);
                      }}
                      className="px-2.5 py-1 rounded-lg bg-neutral-900 hover:bg-neutral-850 border border-neutral-700/80 hover:border-amber-400/50 text-neutral-200 hover:text-white text-[11px] font-medium flex items-center gap-1.5 transition-all active:scale-95 cursor-pointer shadow-xs"
                    >
                      {act.type === 'schedule' && <Calendar className="w-3 h-3 text-amber-400" />}
                      {act.type === 'investments' && <TrendingUp className="w-3 h-3 text-amber-400" />}
                      {act.type === 'chat' && <MessageSquare className="w-3 h-3 text-amber-400" />}
                      {act.type === 'games' && <Dices className="w-3 h-3 text-amber-400" />}
                      {act.type === 'leaderboard' && <Trophy className="w-3 h-3 text-amber-400" />}
                      {act.type === 'faucet' && <Coins className="w-3 h-3 text-amber-400" />}
                      {act.type === 'admin' && <Shield className="w-3 h-3 text-amber-400" />}
                      <span>{act.label}</span>
                    </button>
                  ))}
                </div>
              )}

              {/* Comandos ejecutables o copiables */}
              {currentCommands.length > 0 && !isTyping && (
                <div className="mt-2 flex flex-col gap-1.5 animate-in fade-in duration-200">
                  {currentCommands.map((cmd) => (
                    <button
                      key={cmd}
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleCopyCommand(cmd);
                      }}
                      className="w-full text-left px-2.5 py-1.5 rounded-lg bg-black/60 hover:bg-neutral-900 border border-neutral-800 hover:border-neutral-700 text-[11px] font-mono text-neutral-200 flex items-center justify-between gap-2 transition-all active:scale-[0.98] cursor-pointer"
                      title="Copiar comando al portapapeles"
                    >
                      <span className="flex items-center gap-1.5 truncate">
                        <Terminal className="w-3 h-3 text-amber-400 shrink-0" />
                        <code className="text-amber-300/90 truncate">{cmd}</code>
                      </span>
                      <span className="shrink-0 text-[10px] text-neutral-400 flex items-center gap-1 font-sans">
                        {copiedCmd === cmd ? (
                          <>
                            <Check className="w-3 h-3 text-emerald-400" />
                            <span className="text-emerald-400 font-medium">¡Copiado!</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3 h-3" />
                            <span>Copiar</span>
                          </>
                        )}
                      </span>
                    </button>
                  ))}
                </div>
              )}

              {/* Sugerencias rápidas minimalistas cuando está en reposo */}
              {isIdleChat && !isTyping && !isAiLoading && (
                <div className="mt-2.5 pt-2 border-t border-neutral-800/80 flex flex-wrap gap-1.5">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      executeAssistantPrompt('¿Cómo funciona el minijuego Crash?');
                    }}
                    className="px-2.5 py-1 rounded-lg bg-neutral-900/90 hover:bg-neutral-800 border border-neutral-800 hover:border-neutral-700 text-[10.5px] font-mono text-neutral-300 hover:text-white transition-all cursor-pointer select-none active:scale-95"
                  >
                    Estrategia Crash 0.5x
                  </button>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      executeAssistantPrompt('Objetos y trucos de la Ruleta Rusa');
                    }}
                    className="px-2.5 py-1 rounded-lg bg-neutral-900/90 hover:bg-neutral-800 border border-neutral-800 hover:border-neutral-700 text-[10.5px] font-mono text-neutral-300 hover:text-white transition-all cursor-pointer select-none active:scale-95"
                  >
                    Objetos Ruleta
                  </button>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      executeAssistantPrompt('¿Qué clase toca ahora?');
                    }}
                    className="px-2.5 py-1 rounded-lg bg-neutral-900/90 hover:bg-neutral-800 border border-neutral-800 hover:border-neutral-700 text-[10.5px] font-mono text-neutral-300 hover:text-white transition-all cursor-pointer select-none active:scale-95"
                  >
                    ¿Qué clase toca?
                  </button>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      executeAssistantPrompt('Subnetting /27');
                    }}
                    className="px-2.5 py-1 rounded-lg bg-neutral-900/90 hover:bg-neutral-800 border border-neutral-800 hover:border-neutral-700 text-[10.5px] font-mono text-neutral-300 hover:text-white transition-all cursor-pointer select-none active:scale-95"
                  >
                    Subnetting /27
                  </button>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      executeAssistantPrompt('¿Cómo funciona la Bolsa del Botellón?');
                    }}
                    className="px-2.5 py-1 rounded-lg bg-neutral-900/90 hover:bg-neutral-800 border border-neutral-800 hover:border-neutral-700 text-[10.5px] font-mono text-neutral-300 hover:text-white transition-all cursor-pointer select-none active:scale-95"
                  >
                    La Bolsa
                  </button>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      executeAssistantPrompt('Estoy sin fichas, ¿dónde pido monedas?');
                    }}
                    className="px-2.5 py-1 rounded-lg bg-neutral-900/90 hover:bg-neutral-800 border border-neutral-800 hover:border-neutral-700 text-[10.5px] font-mono text-neutral-300 hover:text-white transition-all cursor-pointer select-none active:scale-95"
                  >
                    Estoy sin fichas
                  </button>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      executeAssistantPrompt('Ver ranking de la clase');
                    }}
                    className="px-2.5 py-1 rounded-lg bg-neutral-900/90 hover:bg-neutral-800 border border-neutral-800 hover:border-neutral-700 text-[10.5px] font-mono text-neutral-300 hover:text-white transition-all cursor-pointer select-none active:scale-95"
                  >
                    Ranking clase
                  </button>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      executeAssistantPrompt('Novedades versión 2.9.0');
                    }}
                    className="px-2.5 py-1 rounded-lg bg-neutral-900/90 hover:bg-neutral-800 border border-neutral-800 hover:border-neutral-700 text-[10.5px] font-mono text-neutral-300 hover:text-white transition-all cursor-pointer select-none active:scale-95"
                  >
                    Novedades v2.9.0
                  </button>
                </div>
              )}

              {/* Formulario de chat con Isaac */}
              {isIdleChat && (
                <form onSubmit={handleSendAiPrompt} className="mt-2.5 pt-2 border-t border-neutral-800/80">
                  <div className="relative flex items-center">
                    <input
                      type="text"
                      maxLength={120}
                      value={aiPrompt}
                      onChange={(e) => setAiPrompt(e.target.value)}
                      placeholder={
                        hourlyQuota.isBlocked
                          ? `Recarga en ${hourlyQuota.minutesUntilReset} min...`
                          : cooldown > 0
                          ? `Espera ${cooldown}s...`
                          : 'Escribe a PUTOISAAC o pide ayuda...'
                      }
                      disabled={isAiLoading || cooldown > 0 || hourlyQuota.isBlocked}
                      className="w-full text-[11px] bg-neutral-900/90 border border-neutral-700/70 rounded-lg px-2.5 py-1.5 pr-8 text-neutral-100 placeholder-neutral-500 focus:outline-none focus:border-amber-400/60 transition-colors disabled:opacity-50 font-sans"
                    />
                    <button
                      type="submit"
                      disabled={isAiLoading || !aiPrompt.trim() || cooldown > 0 || hourlyQuota.isBlocked}
                      className="absolute right-1 w-6 h-6 rounded flex items-center justify-center text-neutral-400 hover:text-amber-400 disabled:opacity-30 cursor-pointer"
                      title="Enviar"
                    >
                      {isAiLoading ? (
                        <Loader2 className="w-3 h-3 animate-spin text-amber-400" />
                      ) : (
                        <Send className="w-3 h-3" />
                      )}
                    </button>
                  </div>

                  {/* Contador sutil y cuota horaria */}
                  <div className="flex items-center justify-between text-[9px] text-neutral-500 mt-1 px-0.5 font-mono">
                    <span className="flex items-center gap-1.5">
                      {hourlyQuota.isBlocked ? (
                        <span className="text-amber-400/90 font-medium">
                          Cupo por hora agotado · recarga en {hourlyQuota.minutesUntilReset}m
                        </span>
                      ) : (
                        <span>
                          {hourlyQuota.remaining} de {hourlyQuota.total} disponibles esta hora
                        </span>
                      )}
                    </span>
                    <span>{aiPrompt.length}/120</span>
                  </div>
                </form>
              )}

              {/* Navegación del tour inicial */}
              <div className="mt-2 pt-2 border-t border-neutral-800/80 flex items-center justify-between gap-2">
                {!isTourCompleted && !isIdleChat ? (
                  <>
                    <div className="flex items-center gap-1">
                      {TOUR_STEPS.map((_, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setCurrentStep(idx);
                          }}
                          className={`h-1.5 rounded-full transition-all cursor-pointer ${
                            idx === currentStep ? 'w-4 bg-amber-400' : 'w-1.5 bg-neutral-700 hover:bg-neutral-500'
                          }`}
                          aria-label={`Paso ${idx + 1}`}
                        />
                      ))}
                    </div>

                    <div className="flex items-center gap-1.5">
                      {currentStep > 0 && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setCurrentStep((p) => p - 1);
                          }}
                          className="px-2 py-1 text-[11px] font-medium text-neutral-400 hover:text-white cursor-pointer"
                        >
                          Atrás
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleNext();
                        }}
                        className="px-3 py-1.5 bg-white hover:bg-neutral-200 active:scale-95 text-black text-xs font-semibold rounded-lg transition-all cursor-pointer flex items-center gap-1 shadow-sm"
                      >
                        <span>{currentStep === TOUR_STEPS.length - 1 ? '¡Listo!' : 'Siguiente'}</span>
                        <ArrowRight className="w-3 h-3" />
                      </button>
                    </div>
                  </>
                ) : (
                  <div className="w-full flex items-center justify-between gap-2">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRestartTour();
                      }}
                      className="text-[11px] text-neutral-400 hover:text-amber-400 transition-colors flex items-center gap-1 cursor-pointer font-medium"
                    >
                      <RotateCcw className="w-3 h-3" />
                      <span>Repetir tour</span>
                    </button>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleClose(false);
                      }}
                      className="px-3 py-1 bg-neutral-800 hover:bg-neutral-700 text-white text-xs font-medium rounded-lg cursor-pointer"
                    >
                      Cerrar
                    </button>
                  </div>
                )}
              </div>

              {/* Puntero triangular sutil */}
              <div
                className={`absolute -bottom-1.5 w-3 h-3 bg-neutral-950 border-r border-b border-neutral-800/90 transform rotate-45 ${
                  bubbleAlignment === 'items-end'
                    ? 'right-6'
                    : bubbleAlignment === 'items-center'
                    ? 'left-1/2 -translate-x-1/2'
                    : 'left-6'
                }`}
              />
            </div>
          )}

          {/* Mascota esférica interactiva PUTOISAAC con animaciones fluidas y físicas */}
          <div
            ref={mascotRef}
            onClick={() => {
              triggerSquish();
              handleMascotClick();
            }}
            className={`group relative flex flex-col items-center cursor-pointer select-none transition-all duration-300 active:scale-95 ${mascotScale}`}
            style={{
              animation: isSquishing
                ? 'putoSquish 0.45s cubic-bezier(0.34, 1.56, 0.64, 1)'
                : idleAction === 'hop'
                ? 'putoIdleHop 0.9s ease-in-out'
                : idleAction === 'yawn'
                ? 'putoYawnAnim 2.2s ease-in-out'
                : 'putoFloat 4s ease-in-out infinite',
              transform: idleAction === 'curious' ? 'rotate(5deg)' : undefined,
            }}
            title="Toca para hablar con PUTOISAAC"
          >
            {/* Cartelito con el nombre */}
            <div className="mb-1 px-2 py-0.5 rounded-full bg-neutral-950/90 text-white border border-neutral-800 text-[9px] font-bold tracking-tight shadow-md transition-all group-hover:scale-105 flex items-center gap-1">
              <span className={`w-1.5 h-1.5 rounded-full ${isAiLoading ? 'bg-amber-300 animate-ping' : 'bg-amber-400'}`} />
              <span className="font-mono">PUTOISAAC</span>
              {isAiLoading && <span className="text-[8px] font-mono text-amber-300 animate-pulse">pensando...</span>}
            </div>

            {/* Esfera física táctil */}
            <div
              className={`w-11 h-11 sm:w-12 sm:h-12 rounded-full bg-gradient-to-tr from-amber-600 via-orange-500 to-yellow-400 border-2 border-white/85 shadow-xl flex items-center justify-center relative overflow-hidden transition-all duration-300 group-hover:scale-105 ${
                isAiLoading ? 'ring-2 ring-amber-400/60 ring-offset-2 ring-offset-neutral-950' : ''
              }`}
              style={{
                boxShadow: isAiLoading
                  ? '0 0 20px rgba(245, 158, 11, 0.6), inset 0 2px 5px rgba(255,255,255,0.8)'
                  : '0 8px 24px rgba(245, 158, 11, 0.42), inset 0 2px 5px rgba(255,255,255,0.7)',
                animation: isAiLoading ? 'thinkPulse 2s ease-in-out infinite' : undefined,
              }}
            >
              {/* Brillo especular superior de vidrio */}
              <div className="absolute top-1 left-1.5 w-3.5 h-2 rounded-full bg-white/75 blur-[0.3px] transform -rotate-12 pointer-events-none" />

              {/* Cara expresiva de PUTOISAAC */}
              <div className="flex flex-col items-center justify-center relative z-10 space-y-0.5 mt-0.5">
                {/* Cejas expresivas reactivas al estado */}
                <div className="flex items-center gap-2 mb-0.5">
                  <div
                    className="w-1.5 h-[1.5px] bg-neutral-950/80 rounded-full transition-transform duration-150"
                    style={{
                      transform: isAiLoading
                        ? 'translateY(-2px) rotate(-10deg)'
                        : isTalking && talkPhoneme % 2 === 1
                        ? 'translateY(-1.5px) rotate(4deg)'
                        : idleAction === 'curious'
                        ? 'translateY(-2.5px) rotate(-6deg)'
                        : idleAction === 'look_left'
                        ? 'translateY(-2px) rotate(-8deg)'
                        : 'translateY(0px)',
                    }}
                  />
                  <div
                    className="w-1.5 h-[1.5px] bg-neutral-950/80 rounded-full transition-transform duration-150"
                    style={{
                      transform: isAiLoading
                        ? 'translateY(-3.5px) rotate(14deg)'
                        : isTalking && talkPhoneme % 2 === 1
                        ? 'translateY(-1.5px) rotate(-4deg)'
                        : idleAction === 'curious'
                        ? 'translateY(-2.5px) rotate(6deg)'
                        : idleAction === 'look_right'
                        ? 'translateY(-2px) rotate(8deg)'
                        : 'translateY(0px)',
                    }}
                  />
                </div>

                {/* Ojos expresivos con seguimiento ocular de cursor y parpadeo orgánico */}
                <div className="flex items-center gap-1.5">
                  {/* Ojo Izquierdo */}
                  <div
                    className={`w-2.5 h-3 rounded-full bg-neutral-950 transition-all duration-100 flex items-center justify-center relative overflow-hidden ${
                      isBlinking
                        ? '!h-[1px] !w-2.5 my-1.5 !bg-neutral-900'
                        : idleAction === 'yawn'
                        ? '!h-[1.5px] !w-2.5 my-1 !bg-neutral-900'
                        : idleAction === 'curious'
                        ? '!h-3.5 !w-2.5'
                        : ''
                    }`}
                  >
                    {!isBlinking && idleAction !== 'yawn' && (
                      <div
                        className="w-1 h-1 rounded-full bg-white absolute transition-transform duration-75"
                        style={{
                          transform: isAiLoading
                            ? 'translate(0.6px, -0.9px)'
                            : idleAction === 'look_left'
                            ? 'translate(-1.4px, 0.1px)'
                            : idleAction === 'look_right'
                            ? 'translate(1.4px, 0.1px)'
                            : idleAction === 'curious'
                            ? 'translate(0.2px, -1px)'
                            : `translate(${pupilOffset.x * 0.45}px, ${pupilOffset.y * 0.45}px)`,
                        }}
                      />
                    )}
                  </div>

                  {/* Ojo Derecho */}
                  <div
                    className={`w-2.5 h-3 rounded-full bg-neutral-950 transition-all duration-100 flex items-center justify-center relative overflow-hidden ${
                      isBlinking
                        ? '!h-[1px] !w-2.5 my-1.5 !bg-neutral-900'
                        : idleAction === 'yawn'
                        ? '!h-[1.5px] !w-2.5 my-1 !bg-neutral-900'
                        : idleAction === 'curious'
                        ? '!h-3.5 !w-2.5'
                        : ''
                    }`}
                  >
                    {!isBlinking && idleAction !== 'yawn' && (
                      <div
                        className="w-1 h-1 rounded-full bg-white absolute transition-transform duration-75"
                        style={{
                          transform: isAiLoading
                            ? 'translate(0.6px, -0.9px)'
                            : idleAction === 'look_left'
                            ? 'translate(-1.4px, 0.1px)'
                            : idleAction === 'look_right'
                            ? 'translate(1.4px, 0.1px)'
                            : idleAction === 'curious'
                            ? 'translate(0.2px, -1px)'
                            : `translate(${pupilOffset.x * 0.45}px, ${pupilOffset.y * 0.45}px)`,
                        }}
                      />
                    )}
                  </div>
                </div>

                {/* Boca expresiva sincronizada por fonemas y estados de reposo */}
                <div className="h-2 flex items-center justify-center pt-0.5">
                  {isTalking ? (
                    <div
                      className={`transition-all duration-75 bg-neutral-950 ${
                        talkPhoneme === 0
                          ? 'w-2.5 h-1.5 rounded-full'
                          : talkPhoneme === 1
                          ? 'w-1.5 h-2 rounded-full'
                          : talkPhoneme === 2
                          ? 'w-2.5 h-1 rounded-b-full'
                          : 'w-2 h-1.5 rounded-full'
                      }`}
                    />
                  ) : isAiLoading ? (
                    <div className="w-1.5 h-1.5 rounded-full border border-neutral-950 animate-pulse" />
                  ) : idleAction === 'yawn' ? (
                    <div className="w-2 h-2 rounded-full bg-neutral-950" />
                  ) : idleAction === 'curious' ? (
                    <div className="w-1.5 h-1 border-b-[1.5px] border-neutral-950 rounded-full" />
                  ) : (
                    <div className="w-2 h-1 border-b-[1.5px] border-neutral-950 rounded-full translate-x-0.5" />
                  )}
                </div>
              </div>
            </div>

            {/* Sombra de suelo dinámica */}
            <div
              className="w-7 h-1.5 rounded-full bg-black/45 blur-[1.5px] mt-1 transition-all pointer-events-none"
              style={{
                animation: 'shadowPulse 4s ease-in-out infinite',
              }}
            />
          </div>
        </div>
      </aside>
    </>
  );
};
