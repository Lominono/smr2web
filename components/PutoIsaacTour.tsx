'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { sound } from '@/lib/audio';
import {
  X,
  ArrowRight,
  ArrowLeft,
  RotateCcw,
  Send,
  Loader2,
  Calendar,
  TrendingUp,
  MessageSquare,
  Terminal,
  Compass,
  Sparkles,
  Zap,
  Flame,
  ShieldAlert,
} from 'lucide-react';
import {
  getCurrentScheduleStatus,
  SCHEDULE_GRID,
  SMR2_SUBJECTS,
  DayKey,
  DAYS,
} from '@/lib/scheduleData';

interface TourStep {
  title: string;
  text: string;
  tabTarget?: 'chat' | 'investments' | 'schedule' | 'russian_roulette';
  targetPosClass: string;
}

const TOUR_STEPS: TourStep[] = [
  {
    title: '¡Epa tú, pedazo de vago!',
    text: 'Soy PUTOISAAC, la bola naranja más borde y macarra de 2º SMR. Te voy a enseñar este antro en un periquete y voy a hacer los clics por ti porque sé que tienes los dedos flojos.',
    targetPosClass: 'bottom-28 sm:bottom-36 left-1/2 -translate-x-1/2',
  },
  {
    title: '¡Clic al Tablón!',
    text: '¡Toma clic al Tablón! Aquí la peña de clase suelta sus lloros, avisos de exámenes y gilipolleces en directo sin recargar la puta página. No seas fantasma y no pongas spam de mierda.',
    tabTarget: 'chat',
    targetPosClass: 'bottom-24 sm:bottom-28 left-4 sm:left-16 translate-x-0',
  },
  {
    title: '¡Clic a La Bolsa!',
    text: '¡Catapúm, clic a la Bolsa de El Botellón! Te regalan 1.000 monedas virtuales por la patilla. Compra acciones de Mercadona o Kebab Amigo para forrarte o arruinarte como un desgraciado.',
    tabTarget: 'investments',
    targetPosClass: 'bottom-32 sm:bottom-40 right-4 sm:right-16 translate-x-0',
  },
  {
    title: '¡Clic al Horario!',
    text: '¡Le casco clic al Horario lectivo! Aquí ves qué coño de clase toca en el Aula 204 en tiempo real para no entrar con cara de sobado y saber qué profesor te va a amargar la mañana.',
    tabTarget: 'schedule',
    targetPosClass: 'top-20 sm:top-24 left-6 sm:left-16 translate-x-0',
  },
  {
    title: '¡Clic a la Ruleta Rusa!',
    text: '¡Y toma clic a la Ruleta Rusa! Un duelo a tiros táctico 1v1 donde usas sierras, birras y esposas para reventar a tus compas de clase y apostar tus monedas sin piedad.',
    tabTarget: 'russian_roulette',
    targetPosClass: 'bottom-28 sm:bottom-32 left-1/2 -translate-x-1/2',
  },
  {
    title: '¡Y a tomar por culo!',
    text: '¡Hala, ya te he hecho todo el tour y he hecho los clics por ti! Si me necesitas, pulsa en mi cabezón naranja y pregúntame lo que te salga del nabo, que como asistente te saco las castañas del fuego.',
    targetPosClass: 'bottom-[calc(4.8rem+env(safe-area-inset-bottom,0px))] left-4 sm:left-6 sm:bottom-6 translate-x-0',
  },
];

const BORED_THOUGHTS = [
  'Vaya muermo de clase, joder...',
  'Menudo tostón de día...',
  '¿Te has dormido encima del teclado o qué, cabrón?',
  'Ponte a configurar un DHCP y deja de mirar la pantalla empanado.',
  'Me aburro más que en clase de inglés técnico...',
  '¿Echamos una Ruleta Rusa o te da miedo?',
  '¡Compremos unas acciones de Kebab, que me pica la cartera!',
  'Me cago en la leche, qué silencio hay aquí...',
];

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  actionExecuted?: string;
}

interface PutoIsaacTourProps {
  onSelectTab?: (tab: 'chat' | 'investments' | 'schedule' | 'russian_roulette') => void;
  isOpenControlled?: boolean;
  onCloseControlled?: () => void;
  onToggleSound?: () => void;
  onOpenFeedback?: () => void;
  onOpenSettings?: () => void;
  user?: { username?: string; coins?: number } | null;
}

// Generador de respuesta local del horario en vivo con vocabulario borde y exacto
function getLiveScheduleKnowledge(username?: string): string {
  const nameTag = username ? `, ${username}` : '';
  const status = getCurrentScheduleStatus();

  if (status.status === 'weekend') {
    return `¡Es puto fin de semana${nameTag}! En el Aula 204 no hay ni Dios. Vete a emborracharte o a viciar y no me toques los cojones hasta el lunes a las 08:15.`;
  }

  if (status.status === 'recreo') {
    return `¡Hostia${nameTag}, estamos en el RECREO (10:55 - 11:25)! Deja el teclado y vete a pillar un bocata o un café, que te huele el aliento a monitor encendido.`;
  }

  if (status.status === 'before_school') {
    return `Aún no han abierto ni las puertas del instituto${nameTag}. Las clases empiezan a las 08:15 en el Aula 204 con ${status.nextSubject?.name || 'módulo'}. ¡No te duermas!`;
  }

  if (status.status === 'after_school') {
    return `Ya ha terminado la jornada lectiva${nameTag}, tira pa tu casa a descansar o a tocarte los huevos. Mañana a las 08:15 más sufrimiento.`;
  }

  const currentName = status.currentSubject?.name || status.currentSubjectCode || 'Clase';
  const nextName = status.nextSubject?.name || 'siguiente módulo';
  return `Ahora mismo en el Aula 204 estáis con ${currentName} (${status.currentSubjectCode}). Quedan unos ${status.minutesRemaining} minutos para que termine el calvario. Luego os toca ${nextName}.`;
}

// Conocimiento de días específicos de la semana
function getDayScheduleKnowledge(dayName: string): string | null {
  const normalized = dayName.toLowerCase();
  let targetKey: DayKey | null = null;
  if (normalized.includes('lunes')) targetKey = 'lunes';
  else if (normalized.includes('martes')) targetKey = 'martes';
  else if (normalized.includes('miercoles') || normalized.includes('miércoles')) targetKey = 'miercoles';
  else if (normalized.includes('jueves')) targetKey = 'jueves';
  else if (normalized.includes('viernes')) targetKey = 'viernes';

  if (!targetKey) return null;

  const subjects = SCHEDULE_GRID[targetKey].filter((s) => s !== 'RECREO');
  const uniqueNames = Array.from(new Set(subjects)).map((code) => SMR2_SUBJECTS[code]?.name || code);
  return `El ${targetKey.toUpperCase()} en el Aula 204 os machacan con: ${uniqueNames.join(', ')}. Recreo de 10:55 a 11:25. ¡Ponte las pilas!`;
}

export const PutoIsaacTour: React.FC<PutoIsaacTourProps> = ({
  onSelectTab,
  isOpenControlled,
  onCloseControlled,
  onToggleSound,
  onOpenFeedback,
  onOpenSettings,
  user,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [mode, setMode] = useState<'tour' | 'chat'>('tour');
  const [currentStep, setCurrentStep] = useState(0);

  // Estados visuales de la mascota
  const [isBlinking, setIsBlinking] = useState(false);
  const [isTalking, setIsTalking] = useState(false);
  const [isPoking, setIsPoking] = useState(false);
  const [eyeDirection, setEyeDirection] = useState<'center' | 'left' | 'right' | 'up'>('center');

  // Estados de aburrimiento y movimiento autónomo
  const [isBoredWandering, setIsBoredWandering] = useState(false);
  const [boredThought, setBoredThought] = useState<string | null>(null);
  const [isSleeping, setIsSleeping] = useState(false);
  const [isStartled, setIsStartled] = useState(false);

  // Efecto máquina de escribir para el tour
  const [tourDisplayText, setTourDisplayText] = useState('');
  const [isTourTyping, setIsTourTyping] = useState(false);
  const typewriterTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Chat con memoria e interacciones
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  // Memoria del usuario y conteo de pesadez
  const [interactionCount, setInteractionCount] = useState(0);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const onSelectTabRef = useRef(onSelectTab);
  const lastActivityTimeRef = useRef<number>(Date.now());

  useEffect(() => {
    onSelectTabRef.current = onSelectTab;
  }, [onSelectTab]);

  // Nombre del usuario con fallback
  const username = user?.username || 'tú';

  // Inicializar mensajes de bienvenida personalizados con memoria
  useEffect(() => {
    try {
      const storedCount = parseInt(localStorage.getItem('smr2_isaac_interact_count') || '0', 10);
      setInteractionCount(storedCount);

      let initialGreeting = `Soy PUTOISAAC, la bola naranja más borde de 2º SMR. Dime qué mierda quieres o dale a un botón de abajo, pedazo de vago.`;
      if (storedCount > 5) {
        initialGreeting = `¡Me cago en la puta, ${username}! Otra vez tú dándome la turra. ¿Es que no atiendes una mierda en clase de redes?`;
      } else if (user?.username) {
        initialGreeting = `¡Epa, ${user.username}! Soy PUTOISAAC. Suelta lo que coño necesites o pulsa un botón rápido.`;
      }

      setMessages([{ role: 'assistant', content: initialGreeting }]);
    } catch {}
  }, [user?.username]);

  // Verificar al montar si el tour ya fue completado
  useEffect(() => {
    try {
      const tourDone = localStorage.getItem('smr2_putoisaac_tour_done') === 'true';
      if (!tourDone && isOpenControlled === undefined) {
        const timer = setTimeout(() => {
          setMode('tour');
          setCurrentStep(0);
          setIsOpen(true);
        }, 1100);
        return () => clearTimeout(timer);
      }
    } catch {}
  }, [isOpenControlled]);

  // Apertura controlada externamente
  useEffect(() => {
    if (isOpenControlled !== undefined) {
      setIsOpen(isOpenControlled);
      if (isOpenControlled) {
        setMode('tour');
        setCurrentStep(0);
        setIsSleeping(false);
      }
    }
  }, [isOpenControlled]);

  // Cooldown timer
  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setInterval(() => setCooldown((c) => Math.max(0, c - 1)), 1000);
    return () => clearInterval(t);
  }, [cooldown]);

  // Parpadeo natural de los ojos
  useEffect(() => {
    const blinkInterval = setInterval(() => {
      if (isSleeping) return;
      setIsBlinking(true);
      setTimeout(() => setIsBlinking(false), 170);
    }, 3200 + Math.random() * 2500);

    return () => clearInterval(blinkInterval);
  }, [isSleeping]);

  // Movimiento sutil de ojos mientras está inactivo
  useEffect(() => {
    const eyeInterval = setInterval(() => {
      if (isSleeping || isTalking || isOpen) {
        setEyeDirection('center');
        return;
      }
      const dirs: ('center' | 'left' | 'right' | 'up')[] = ['center', 'left', 'right', 'up'];
      const chosen = dirs[Math.floor(Math.random() * dirs.length)];
      setEyeDirection(chosen);
      setTimeout(() => setEyeDirection('center'), 1400);
    }, 6000 + Math.random() * 4000);

    return () => clearInterval(eyeInterval);
  }, [isSleeping, isTalking, isOpen]);

  // Control de inactividad, aburrimiento y siesta
  useEffect(() => {
    const handleUserActivity = () => {
      lastActivityTimeRef.current = Date.now();
      if (isSleeping) {
        setIsSleeping(false);
        setIsStartled(true);
        setTimeout(() => setIsStartled(false), 800);
      }
    };

    window.addEventListener('mousemove', handleUserActivity, { passive: true });
    window.addEventListener('keydown', handleUserActivity, { passive: true });
    window.addEventListener('touchstart', handleUserActivity, { passive: true });

    const idleChecker = setInterval(() => {
      if (isOpen) return; // Si el menú está abierto no se aburre
      const elapsed = Date.now() - lastActivityTimeRef.current;

      // Dormirse tras 45s de inactividad total
      if (elapsed > 45000 && !isSleeping && !isBoredWandering) {
        setIsSleeping(true);
        return;
      }

      // Si lleva entre 18s y 35s inactivo: se aburre y se mueve por la pantalla
      if (elapsed > 18000 && elapsed < 42000 && !isBoredWandering && !isSleeping) {
        setIsBoredWandering(true);
        const randomThought = BORED_THOUGHTS[Math.floor(Math.random() * BORED_THOUGHTS.length)];
        setBoredThought(randomThought);

        setTimeout(() => {
          setIsBoredWandering(false);
          setBoredThought(null);
        }, 5000);
      }
    }, 5000);

    return () => {
      window.removeEventListener('mousemove', handleUserActivity);
      window.removeEventListener('keydown', handleUserActivity);
      window.removeEventListener('touchstart', handleUserActivity);
      clearInterval(idleChecker);
    };
  }, [isOpen, isSleeping, isBoredWandering]);

  // Atajos de teclado: Ctrl+K / Cmd+K para abrir/cerrar y Esc para cerrar
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsOpen((prev) => !prev);
      }
      if (e.key === 'Escape' && isOpen) {
        handleClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  // Scroll suave en el chat
  useEffect(() => {
    if (isOpen && mode === 'chat') {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen, mode]);

  // Ejecución de acciones dentro de la web
  const executeAction = useCallback(
    (actionStr: string) => {
      if (actionStr.includes('NAV:schedule') || actionStr === 'schedule') {
        onSelectTabRef.current?.('schedule');
        return 'Horario';
      }
      if (actionStr.includes('NAV:investments') || actionStr === 'investments') {
        onSelectTabRef.current?.('investments');
        return 'Bolsa';
      }
      if (actionStr.includes('NAV:chat') || actionStr === 'chat') {
        onSelectTabRef.current?.('chat');
        return 'Tablón';
      }
      if (actionStr.includes('NAV:games') || actionStr === 'russian_roulette') {
        onSelectTabRef.current?.('russian_roulette');
        return 'Ruleta Rusa';
      }
      if (actionStr.includes('ACT:toggle_sound')) {
        onToggleSound?.();
        return 'Audio';
      }
      if (actionStr.includes('ACT:open_feedback')) {
        onOpenFeedback?.();
        return 'Incidencias';
      }
      if (actionStr.includes('ACT:open_settings')) {
        onOpenSettings?.();
        return 'Ajustes';
      }
      return undefined;
    },
    [onToggleSound, onOpenFeedback, onOpenSettings]
  );

  // Máquina de escribir para el Tour con efecto sonoro
  const runTourTypewriter = useCallback((fullText: string) => {
    if (typewriterTimeoutRef.current) {
      clearTimeout(typewriterTimeoutRef.current);
    }

    setTourDisplayText('');
    setIsTourTyping(true);
    setIsTalking(true);

    let idx = 0;
    const speed = 15;

    const stepType = () => {
      idx += 2;
      const slice = fullText.slice(0, idx);
      setTourDisplayText(slice);

      if (idx % 4 === 0) {
        try {
          sound.typing();
        } catch {}
      }

      if (idx < fullText.length) {
        typewriterTimeoutRef.current = setTimeout(stepType, speed);
      } else {
        setTourDisplayText(fullText);
        setIsTourTyping(false);
        setIsTalking(false);
      }
    };

    typewriterTimeoutRef.current = setTimeout(stepType, speed);
  }, []);

  // ANIMACIÓN DE CLIC INTERACTIVO DURANTE EL TOUR:
  // PUTOISAAC viaja al sitio, hace el "poke" físico con sonido y cambia la pestaña
  useEffect(() => {
    if (isOpen && mode === 'tour') {
      const step = TOUR_STEPS[currentStep];
      if (step) {
        const targetTab = step.tabTarget;
        if (targetTab) {
          // Breve delay para que la bola viaje y luego haga el clic físico
          const pokeTimer = setTimeout(() => {
            setIsPoking(true);
            try {
              sound.tap();
            } catch {}
            onSelectTabRef.current?.(targetTab);

            setTimeout(() => {
              setIsPoking(false);
            }, 450);
          }, 350);

          runTourTypewriter(step.text);
          return () => clearTimeout(pokeTimer);
        } else {
          runTourTypewriter(step.text);
        }
      }
    }
  }, [currentStep, isOpen, mode, runTourTypewriter]);

  // Completar texto inmediatamente al tocar el bocadillo
  const handleSkipTyping = () => {
    if (isTourTyping) {
      if (typewriterTimeoutRef.current) {
        clearTimeout(typewriterTimeoutRef.current);
      }
      const targetText = TOUR_STEPS[currentStep]?.text || '';
      setTourDisplayText(targetText);
      setIsTourTyping(false);
      setIsTalking(false);
    }
  };

  const handleNextStep = () => {
    try {
      sound.tap();
    } catch {}

    if (currentStep < TOUR_STEPS.length - 1) {
      setCurrentStep((prev) => prev + 1);
    } else {
      try {
        localStorage.setItem('smr2_putoisaac_tour_done', 'true');
      } catch {}
      setMode('chat');
    }
  };

  const handlePrevStep = () => {
    if (currentStep > 0) {
      try {
        sound.tap();
      } catch {}
      setCurrentStep((prev) => prev - 1);
    }
  };

  const handleSkipTour = () => {
    try {
      sound.tap();
      localStorage.setItem('smr2_putoisaac_tour_done', 'true');
    } catch {}
    setMode('chat');
  };

  const handleClose = () => {
    try {
      sound.tap();
    } catch {}
    setIsOpen(false);
    if (onCloseControlled) onCloseControlled();
  };

  const handleMascotClick = () => {
    try {
      sound.tap();
    } catch {}
    setIsSleeping(false);
    setIsOpen((prev) => !prev);
  };

  // Efecto de teletipo sonoro para las respuestas del chat
  const appendAssistantWithTyping = useCallback(
    (fullText: string, actionExecuted?: string) => {
      let currentIdx = 0;
      setIsTalking(true);

      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: '',
          actionExecuted,
        },
      ]);

      const timer = setInterval(() => {
        currentIdx += 2;
        const slice = fullText.slice(0, currentIdx);

        if (currentIdx % 4 === 0) {
          try {
            sound.typing();
          } catch {}
        }

        setMessages((prev) => {
          if (prev.length === 0) return prev;
          const updated = [...prev];
          const last = updated[updated.length - 1];
          if (last && last.role === 'assistant') {
            updated[updated.length - 1] = {
              ...last,
              content: slice,
            };
          }
          return updated;
        });

        if (currentIdx >= fullText.length) {
          clearInterval(timer);
          setIsTalking(false);
          setMessages((prev) => {
            if (prev.length === 0) return prev;
            const updated = [...prev];
            const last = updated[updated.length - 1];
            if (last && last.role === 'assistant') {
              updated[updated.length - 1] = {
                ...last,
                content: fullText,
              };
            }
            return updated;
          });
        }
      }, 14);
    },
    []
  );

  // Manejador del chat con memoria y filtro de tokens
  const handleSendMessage = async (customPrompt?: string) => {
    const textToSend = (customPrompt || inputValue).trim();
    if (!textToSend || isLoading || cooldown > 0) return;

    try {
      sound.tap();
    } catch {}

    setInputValue('');
    setCooldown(2);

    const userMsg: ChatMessage = { role: 'user', content: textToSend };
    setMessages((prev) => [...prev, userMsg]);
    setIsLoading(true);

    // Incrementar memoria de interacciones
    const newCount = interactionCount + 1;
    setInteractionCount(newCount);
    try {
      localStorage.setItem('smr2_isaac_interact_count', newCount.toString());
    } catch {}

    const lower = textToSend.toLowerCase();

    // 1. RESTRICCIÓN DE ABUSO LOCAL: Cero tokens consumidos para el horario
    if (lower.includes('que toca') || lower.includes('qué toca') || lower.includes('clase ahora') || lower.includes('horario')) {
      const statusText = getLiveScheduleKnowledge(user?.username);
      appendAssistantWithTyping(statusText, 'Horario Lectivo');
      setIsLoading(false);
      return;
    }

    // 2. Consulta de días de la semana (Lunes a Viernes)
    const dayResult = getDayScheduleKnowledge(lower);
    if (dayResult) {
      appendAssistantWithTyping(dayResult, 'Horario');
      setIsLoading(false);
      return;
    }

    // 3. Comandos útiles SMR de redes y Linux
    if (lower.includes('comandos') || lower.includes('red') || lower.includes('linux') || lower.includes('powershell')) {
      const commandsText =
        'Toma comandos pa no cagarla en el Aula 204: `ip a` (ver IPs), `ss -tuln` (puertos), `traceroute` (rutas), `sudo systemctl restart networking` o `Test-NetConnection -Port 80`.';
      appendAssistantWithTyping(commandsText, 'Comandos SMR');
      setIsLoading(false);
      return;
    }

    // 4. Preguntas sobre la ruleta rusa e ítems tácticos
    if (lower.includes('ruleta') || lower.includes('items') || lower.includes('ítem') || lower.includes('sierra') || lower.includes('birra') || lower.includes('lupa')) {
      const rouletteText =
        'En la Ruleta Rusa usa la LUPA pa espiar si la bala es real. Si es real, métele la SIERRA pa reventarle 2 de daño. Si es fogueo, tírate el tiro a ti mismo para no perder el turno. ¡La birra expulsa la bala!';
      appendAssistantWithTyping(rouletteText, 'Ruleta Rusa');
      setIsLoading(false);
      return;
    }

    // 5. Preguntas sobre La Bolsa de El Botellón
    if (lower.includes('bolsa') || lower.includes('acciones') || lower.includes('mercadona') || lower.includes('kebab') || lower.includes('dinero') || lower.includes('invertir')) {
      const stockText =
        'En la Bolsa tienes Mercadona, Kebab Amigo, Monster Energy y Tabaco. Si compras en verde eres tonto, compra cuando caiga y vende cuando suba, pedazo de economista de pacotilla.';
      appendAssistantWithTyping(stockText, 'Bolsa');
      setIsLoading(false);
      return;
    }

    // 6. Preguntas sobre los creadores
    if (lower.includes('quien creo') || lower.includes('quién creó') || lower.includes('creadores') || lower.includes('juanfe') || lower.includes('david')) {
      const creatorsText =
        'Toda esta web la programaron JuanFe Ospina y David, los putos amos de 2º SMR. Tú mientras rascándote los huevos.';
      appendAssistantWithTyping(creatorsText, 'Creadores');
      setIsLoading(false);
      return;
    }

    // 7. CUOTA LOCAL ANTI-ABUSO DE TOKENS (Máximo 6 peticiones a la IA por hora para no fundir tokens)
    try {
      const now = Date.now();
      const quotaRaw = localStorage.getItem('smr2_isaac_token_quota');
      const quotaData = quotaRaw ? JSON.parse(quotaRaw) : { count: 0, resetTime: now + 3600000 };

      if (now > quotaData.resetTime) {
        quotaData.count = 0;
        quotaData.resetTime = now + 3600000;
      }

      if (quotaData.count >= 6) {
        const minsLeft = Math.ceil((quotaData.resetTime - now) / 60000);
        appendAssistantWithTyping(
          `¡Me cago en tus muertos, ${username}! Has fundido todos los tokens de la IA, pedazo de sanguijuela. No te pienso contestar más chorradas hasta dentro de ${minsLeft} minutos. Usa los botones rápidos o búscate la vida.`
        );
        setIsLoading(false);
        return;
      }

      quotaData.count += 1;
      localStorage.setItem('smr2_isaac_token_quota', JSON.stringify(quotaData));
    } catch {}

    // 8. Petición al endpoint con rate-limiting reforzado
    try {
      const res = await fetch('/api/ai/isaac', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: textToSend,
          history: messages.slice(-2),
        }),
      });

      const data = await res.json();
      let rawReply = data.reply || 'No te he entendido una mierda. Pregúntame otra vez, inútil.';

      let executedLabel: string | undefined;
      const navMatch = rawReply.match(/\[(NAV:[a-z]+|ACT:[a-z_]+)\]/);
      if (navMatch) {
        executedLabel = executeAction(navMatch[1]);
        rawReply = rawReply.replace(navMatch[0], '').trim();
      }

      appendAssistantWithTyping(rawReply, executedLabel);
    } catch {
      appendAssistantWithTyping('Se me ha cruzado un cable con el servidor. Prueba luego, pedazo de vago.');
    } finally {
      setIsLoading(false);
    }
  };

  // Determinar clases de posición de la mascota
  const isIntroTourActive = isOpen && mode === 'tour';

  let positionClasses =
    'bottom-[calc(4.8rem+env(safe-area-inset-bottom,0px))] left-4 sm:left-6 sm:bottom-6';
  let mascotScale = 'scale-100';
  let bubbleAlignment = 'items-start';

  if (isIntroTourActive) {
    const currentStepConfig = TOUR_STEPS[currentStep];
    if (currentStepConfig) {
      positionClasses = currentStepConfig.targetPosClass;
      if (currentStep === 0) {
        mascotScale = 'scale-115 sm:scale-125';
        bubbleAlignment = 'items-center';
      } else if (currentStep === 1) {
        mascotScale = 'scale-110 rotate-2';
        bubbleAlignment = 'items-start';
      } else if (currentStep === 2) {
        mascotScale = 'scale-110 -rotate-2';
        bubbleAlignment = 'items-end';
      } else if (currentStep === 3) {
        mascotScale = 'scale-110';
        bubbleAlignment = 'items-start';
      } else if (currentStep === 4) {
        mascotScale = 'scale-115';
        bubbleAlignment = 'items-center';
      } else {
        mascotScale = 'scale-105';
        bubbleAlignment = 'items-start';
      }
    }
  } else if (isBoredWandering) {
    // Si se aburre, flota hacia la derecha y arriba unos píxeles
    positionClasses =
      'bottom-[calc(6.8rem+env(safe-area-inset-bottom,0px))] left-16 sm:left-24 sm:bottom-12 translate-x-4';
    mascotScale = 'scale-110 rotate-6';
  } else if (isSleeping) {
    mascotScale = 'scale-95 opacity-90';
  } else if (isStartled) {
    mascotScale = 'scale-125 -translate-y-4 rotate-3';
  }

  return (
    <>
      <style jsx global>{`
        @keyframes putoFloat {
          0%, 100% {
            transform: translateY(0px);
          }
          50% {
            transform: translateY(-6px);
          }
        }
        @keyframes putoPoke {
          0% {
            transform: scale(1) translateY(0);
          }
          40% {
            transform: scale(1.3, 0.7) translateY(12px);
          }
          70% {
            transform: scale(0.9, 1.1) translateY(-6px);
          }
          100% {
            transform: scale(1) translateY(0);
          }
        }
        @keyframes zzzFloat {
          0% {
            opacity: 0;
            transform: translateY(0) scale(0.6);
          }
          50% {
            opacity: 1;
            transform: translateY(-12px) scale(1);
          }
          100% {
            opacity: 0;
            transform: translateY(-24px) scale(1.2);
          }
        }
      `}</style>

      {/* Contenedor flotante interactivo */}
      <aside
        aria-label="Asistente interactivo PUTOISAAC"
        className={`fixed z-45 pointer-events-none select-none font-sans transition-all duration-700 cubic-bezier(0.34, 1.56, 0.64, 1) ${positionClasses}`}
      >
        <div className={`relative flex flex-col pointer-events-auto ${bubbleAlignment}`}>
          {/* Pensamiento de aburrimiento si la mascota se mueve sola por la pantalla */}
          {!isOpen && boredThought && (
            <div className="mb-2 px-3 py-1.5 rounded-xl bg-neutral-900/90 text-neutral-100 border border-orange-500/40 text-[11px] font-mono shadow-xl backdrop-blur-md max-w-[220px] animate-in fade-in slide-in-from-bottom-2 duration-200 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-orange-500 shrink-0 animate-ping" />
              <span>{boredThought}</span>
            </div>
          )}

          {/* Animación Zzz si está durmiendo */}
          {!isOpen && isSleeping && (
            <div
              className="absolute -top-4 right-1 text-orange-400 font-mono font-bold text-xs pointer-events-none select-none"
              style={{ animation: 'zzzFloat 2.2s infinite ease-out' }}
            >
              Zzz...
            </div>
          )}

          {/* Cuadro de diálogo compacto (NO ocupa toda la pantalla, adaptable a modo oscuro y claro) */}
          {isOpen && (
            <div
              className="mb-2.5 w-[calc(100vw-32px)] max-w-[340px] sm:max-w-[360px] bg-white/95 dark:bg-neutral-900/95 text-neutral-900 dark:text-neutral-100 border-2 border-neutral-300 dark:border-neutral-800 rounded-2xl p-3.5 shadow-2xl relative backdrop-blur-md animate-in fade-in zoom-in-95 duration-200"
              style={{
                boxShadow: '0 20px 40px -10px rgba(0,0,0,0.4)',
              }}
            >
              {/* Header compacto con selector de modo */}
              <div className="flex items-center justify-between pb-2 mb-2 border-b border-neutral-200 dark:border-neutral-800 text-[11px] font-mono">
                <div className="flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-full bg-orange-500 animate-pulse" />
                  <span className="font-bold tracking-wider text-orange-600 dark:text-orange-400">
                    PUTOISAAC
                  </span>
                  {mode === 'tour' && (
                    <span className="text-[10px] text-neutral-500 dark:text-neutral-400">
                      [{currentStep + 1}/{TOUR_STEPS.length}]
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => {
                      try {
                        sound.tap();
                      } catch {}
                      setMode((m) => (m === 'tour' ? 'chat' : 'tour'));
                    }}
                    className="px-2 py-0.5 rounded text-[10px] font-medium bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 hover:text-neutral-900 dark:hover:text-white transition-colors cursor-pointer"
                    title={mode === 'tour' ? 'Hablar con la IA' : 'Ver tour interactivo'}
                  >
                    {mode === 'tour' ? 'Modo Chat' : 'Ver Tour'}
                  </button>

                  <button
                    type="button"
                    onClick={handleClose}
                    className="p-1 rounded-lg text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors cursor-pointer"
                    title="Cerrar diálogo"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* MODO TOUR GUIADO CON CLICS EN TIEMPO REAL */}
              {mode === 'tour' && (
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <h4 className="text-xs font-bold text-orange-600 dark:text-orange-400">
                      {TOUR_STEPS[currentStep]?.title}
                    </h4>
                    {isPoking && (
                      <span className="text-[9px] px-1.5 py-0.2 rounded bg-orange-500 text-white font-mono animate-bounce">
                        ¡HACIENDO CLIC!
                      </span>
                    )}
                  </div>

                  <div
                    onClick={handleSkipTyping}
                    className="text-xs leading-relaxed text-neutral-700 dark:text-neutral-300 min-h-[58px] cursor-pointer selection:bg-orange-500/20"
                    title="Toca para completar el texto inmediatamente"
                  >
                    {tourDisplayText}
                    {isTourTyping && (
                      <span className="inline-block w-1.5 h-3 ml-0.5 bg-orange-500 animate-pulse align-middle" />
                    )}
                  </div>

                  {/* Controles del tour */}
                  <div className="mt-3 pt-2 border-t border-neutral-200 dark:border-neutral-800 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1">
                      {TOUR_STEPS.map((_, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => {
                            try {
                              sound.tap();
                            } catch {}
                            setCurrentStep(idx);
                          }}
                          className={`w-2 h-2 rounded-full transition-all cursor-pointer ${
                            currentStep === idx
                              ? 'bg-orange-500 w-4'
                              : 'bg-neutral-300 dark:bg-neutral-700 hover:bg-neutral-400'
                          }`}
                          aria-label={`Ir al paso ${idx + 1}`}
                        />
                      ))}
                    </div>

                    <div className="flex items-center gap-1.5">
                      {currentStep > 0 && (
                        <button
                          type="button"
                          onClick={handlePrevStep}
                          className="px-2 py-1 text-[11px] font-medium text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white rounded transition-colors cursor-pointer"
                        >
                          Atrás
                        </button>
                      )}

                      {currentStep < TOUR_STEPS.length - 1 && (
                        <button
                          type="button"
                          onClick={handleSkipTour}
                          className="px-2 py-1 text-[11px] text-neutral-400 dark:text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300 transition-colors cursor-pointer"
                        >
                          Saltar
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={handleNextStep}
                        className="px-3 py-1 bg-neutral-900 hover:bg-neutral-800 dark:bg-white dark:hover:bg-neutral-200 text-white dark:text-neutral-900 text-xs font-semibold rounded-lg active:scale-95 transition-all cursor-pointer flex items-center gap-1 shadow-xs"
                      >
                        <span>
                          {currentStep === TOUR_STEPS.length - 1 ? '¡Listo!' : 'Siguiente'}
                        </span>
                        <ArrowRight className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* MODO CHAT / ASISTENTE CON MEMORIA Y PROTECCIÓN DE TOKENS */}
              {mode === 'chat' && (
                <div>
                  {/* Chips de acciones rápidas */}
                  <div className="flex items-center gap-1 overflow-x-auto pb-1.5 mb-2 scrollbar-none text-[10px] font-mono">
                    <button
                      type="button"
                      onClick={() => handleSendMessage('¿Qué clase toca ahora mismo?')}
                      className="px-2 py-0.5 rounded-md bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 hover:bg-orange-500 hover:text-white transition-colors shrink-0 cursor-pointer flex items-center gap-1"
                    >
                      <Compass className="w-3 h-3 text-purple-500" />
                      <span>¿Qué toca?</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        executeAction('investments');
                        handleSendMessage('Llévame a la Bolsa');
                      }}
                      className="px-2 py-0.5 rounded-md bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 hover:bg-orange-500 hover:text-white transition-colors shrink-0 cursor-pointer flex items-center gap-1"
                    >
                      <TrendingUp className="w-3 h-3 text-amber-500" />
                      <span>Bolsa</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        executeAction('chat');
                        handleSendMessage('Abre el tablón');
                      }}
                      className="px-2 py-0.5 rounded-md bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 hover:bg-orange-500 hover:text-white transition-colors shrink-0 cursor-pointer flex items-center gap-1"
                    >
                      <MessageSquare className="w-3 h-3 text-emerald-500" />
                      <span>Tablón</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        executeAction('russian_roulette');
                        handleSendMessage('¿Cómo se juega a la Ruleta Rusa y qué ítems hay?');
                      }}
                      className="px-2 py-0.5 rounded-md bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 hover:bg-orange-500 hover:text-white transition-colors shrink-0 cursor-pointer flex items-center gap-1"
                    >
                      <Flame className="w-3 h-3 text-rose-500" />
                      <span>Ruleta</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleSendMessage('Comandos útiles SMR')}
                      className="px-2 py-0.5 rounded-md bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 hover:bg-orange-500 hover:text-white transition-colors shrink-0 cursor-pointer flex items-center gap-1"
                    >
                      <Terminal className="w-3 h-3 text-sky-500" />
                      <span>Comandos</span>
                    </button>
                  </div>

                  {/* Historial de mensajes compacto */}
                  <div className="max-h-44 sm:max-h-48 overflow-y-auto space-y-2 pr-1 text-xs font-mono scrollbar-thin">
                    {messages.map((msg, idx) => (
                      <div
                        key={idx}
                        className={`flex flex-col ${
                          msg.role === 'user' ? 'items-end' : 'items-start'
                        }`}
                      >
                        <div
                          className={`max-w-[90%] rounded-xl px-2.5 py-1.5 leading-relaxed ${
                            msg.role === 'user'
                              ? 'bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 font-medium'
                              : 'bg-neutral-100 dark:bg-neutral-800/90 text-neutral-900 dark:text-neutral-100 border border-neutral-200 dark:border-neutral-700/60'
                          }`}
                        >
                          <div className="whitespace-pre-wrap">{msg.content}</div>
                          {msg.actionExecuted && (
                            <div className="mt-1 pt-1 border-t border-neutral-300 dark:border-neutral-700 text-[9px] text-orange-600 dark:text-orange-400 flex items-center gap-1">
                              <span className="w-1.5 h-1.5 rounded-full bg-orange-500" />
                              <span>Acción: {msg.actionExecuted}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}

                    {isLoading && (
                      <div className="flex items-center gap-1.5 text-neutral-500 text-[11px] font-mono py-0.5">
                        <Loader2 className="w-3 h-3 animate-spin text-orange-500" />
                        <span>Pensando qué burrada soltarte...</span>
                      </div>
                    )}
                    <div ref={messagesEndRef} />
                  </div>

                  {/* Formulario de entrada compacto */}
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      handleSendMessage();
                    }}
                    className="mt-2.5 pt-2 border-t border-neutral-200 dark:border-neutral-800 flex items-center gap-1.5"
                  >
                    <input
                      ref={inputRef}
                      type="text"
                      value={inputValue}
                      onChange={(e) => setInputValue(e.target.value)}
                      placeholder={
                        cooldown > 0
                          ? `Espera ${cooldown}s...`
                          : 'Pregúntale lo que quieras...'
                      }
                      disabled={isLoading || cooldown > 0}
                      className="flex-1 h-8 px-2.5 bg-neutral-100 dark:bg-neutral-800 text-neutral-900 dark:text-white placeholder:text-neutral-400 dark:placeholder:text-neutral-500 border border-neutral-300 dark:border-neutral-700 rounded-lg text-xs font-mono focus:outline-none focus:border-orange-500 transition-colors disabled:opacity-50"
                    />

                    <button
                      type="submit"
                      disabled={isLoading || !inputValue.trim() || cooldown > 0}
                      className="h-8 px-2.5 rounded-lg bg-orange-500 hover:bg-orange-600 active:scale-95 text-white text-xs font-semibold transition-all disabled:opacity-30 disabled:pointer-events-none cursor-pointer flex items-center justify-center shadow-xs"
                      title="Enviar a PUTOISAAC"
                    >
                      <Send className="w-3.5 h-3.5" />
                    </button>
                  </form>
                </div>
              )}

              {/* Flecha indicadora del bocadillo adaptada al tema */}
              <div
                className={`absolute -bottom-2 w-3.5 h-3.5 bg-white dark:bg-neutral-900 border-r-2 border-b-2 border-neutral-300 dark:border-neutral-800 transform rotate-45 ${
                  bubbleAlignment === 'items-end'
                    ? 'right-6'
                    : bubbleAlignment === 'items-center'
                    ? 'left-1/2 -translate-x-1/2'
                    : 'left-6'
                }`}
              />
            </div>
          )}

          {/* MASCOTA INTERACTIVA: LA BOLITA NARANJA CON OJOS (PUTOISAAC) */}
          <div
            onClick={handleMascotClick}
            className={`group relative flex flex-col items-center cursor-pointer transition-all duration-700 active:scale-90 ${mascotScale}`}
            style={{
              animation: isPoking
                ? 'putoPoke 0.45s ease-out'
                : isSleeping
                ? 'none'
                : 'putoFloat 3.8s ease-in-out infinite',
            }}
            title="Toca para interactuar con PUTOISAAC"
          >
            {/* Ondulación de clic expansivo cuando hace poke en el tour */}
            {isPoking && (
              <div className="absolute -inset-3 rounded-full border-2 border-orange-500 animate-ping pointer-events-none opacity-80" />
            )}

            {/* Cartelito con el nombre */}
            <div className="mb-1 px-2 py-0.5 rounded-full bg-neutral-950/90 text-white border border-neutral-700 text-[9px] font-bold tracking-tight shadow-md transition-all group-hover:scale-105 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-orange-500 animate-ping" />
              <span className="font-mono">PUTOISAAC</span>
            </div>

            {/* Esfera 3D naranja lustrosa */}
            <div
              className="w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-gradient-to-tr from-orange-600 via-amber-500 to-yellow-400 border-2 border-white/80 dark:border-white/60 shadow-xl flex items-center justify-center relative overflow-hidden transition-all duration-300 group-hover:shadow-orange-500/50 group-hover:scale-105"
              style={{
                boxShadow:
                  '0 8px 25px rgba(249, 115, 22, 0.45), inset 0 2px 5px rgba(255,255,255,0.8), inset 0 -3px 6px rgba(0,0,0,0.3)',
              }}
            >
              {/* Brillo especular superior */}
              <div className="absolute top-1 left-2 w-4 h-2 rounded-full bg-white/75 blur-[0.4px] transform -rotate-12 pointer-events-none" />

              {/* Cara cómica de PUTOISAAC */}
              <div className="flex flex-col items-center justify-center relative z-10 space-y-1 mt-0.5">
                {/* Ojos expresivos con parpadeo y dirección */}
                <div className="flex items-center gap-1.5">
                  <div
                    className={`w-2.5 h-3 rounded-full bg-neutral-950 transition-all duration-150 flex items-center justify-center relative ${
                      isBlinking || isSleeping ? 'h-0.5 mt-2 bg-neutral-900' : ''
                    }`}
                  >
                    {!isBlinking && !isSleeping && (
                      <div
                        className={`w-1 h-1 rounded-full bg-white absolute transition-all duration-200 ${
                          eyeDirection === 'left'
                            ? 'top-0.5 left-0'
                            : eyeDirection === 'right'
                            ? 'top-0.5 right-0'
                            : eyeDirection === 'up'
                            ? 'top-0 left-0.5'
                            : 'top-0.5 left-0.5'
                        }`}
                      />
                    )}
                  </div>

                  <div
                    className={`w-2.5 h-3 rounded-full bg-neutral-950 transition-all duration-150 flex items-center justify-center relative ${
                      isBlinking || isSleeping ? 'h-0.5 mt-2 bg-neutral-900' : ''
                    }`}
                  >
                    {!isBlinking && !isSleeping && (
                      <div
                        className={`w-1 h-1 rounded-full bg-white absolute transition-all duration-200 ${
                          eyeDirection === 'left'
                            ? 'top-0.5 left-0'
                            : eyeDirection === 'right'
                            ? 'top-0.5 right-0'
                            : eyeDirection === 'up'
                            ? 'top-0 left-0.5'
                            : 'top-0.5 left-0.5'
                        }`}
                      />
                    )}
                  </div>
                </div>

                {/* Boca expresiva que habla o bosteza */}
                <div
                  className={`transition-all duration-100 ${
                    isBoredWandering
                      ? 'w-3 h-3 bg-neutral-950 rounded-full'
                      : isTalking
                      ? 'w-2.5 h-2 bg-neutral-950 rounded-full animate-bounce'
                      : 'w-2.5 h-1 border-b-2 border-neutral-950 rounded-full'
                  }`}
                />
              </div>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
};
