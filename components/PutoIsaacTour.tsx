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
  Bot,
} from 'lucide-react';

interface TourStep {
  title: string;
  text: string;
  tabTarget?: 'chat' | 'investments' | 'schedule';
}

const TOUR_STEPS: TourStep[] = [
  {
    title: '¡Epa tú!',
    text: 'Soy PUTOISAAC, la bola naranja tonta de 2º SMR. Te voy a dar un paseo rápido por esta mierda pa que no te pierdas el primer día, pedazo de vago.',
  },
  {
    title: 'El Tablón en Vivo',
    text: 'Aquí la peña escribe avisos, quejas de los exámenes o tonterías. Lo que sueltes le llega a toda la clase al instante sin recargar, no seas fantasma.',
    tabTarget: 'chat',
  },
  {
    title: 'La Bolsa de El Botellón',
    text: 'Te regalan 1.000 pavos virtuales por la patilla. Puedes comprar acciones del Mercadona o Kebab Amigo para forrarte o arruinarte como un desgraciado.',
    tabTarget: 'investments',
  },
  {
    title: 'Horario y Juegos',
    text: 'Aquí arriba ves qué coño toca hoy en el Aula 204 para no entrar con cara de sobado, y juegos como la Ruleta Rusa pa jugarte las perras con la clase.',
    tabTarget: 'schedule',
  },
  {
    title: '¡Hala, a currar!',
    text: 'Ya te sabes el percal. Si necesitas algo, pulsa en mi cabezón naranja y pregúntame lo que te salga de las narices, que aunque sea un poco tonto te ayudo.',
  },
];

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  actionExecuted?: string;
}

interface PutoIsaacTourProps {
  onSelectTab?: (tab: 'chat' | 'investments' | 'schedule') => void;
  isOpenControlled?: boolean;
  onCloseControlled?: () => void;
  onToggleSound?: () => void;
  onOpenFeedback?: () => void;
  onOpenSettings?: () => void;
}

function getLiveClassStatusRude(): string {
  const now = new Date();
  const day = now.getDay();
  const hours = now.getHours();
  const minutes = now.getMinutes();
  const currentTimeVal = hours * 60 + minutes;

  if (day === 0 || day === 6) {
    return '¡Es fin de semana, pedazo de vago! En el Aula 204 no hay ni un alma. La próxima clase es el lunes a las 08:30.';
  }

  if (currentTimeVal < 8 * 60 + 30) {
    return 'Aún no han abierto ni las puertas. La primera clase arranca a las 08:30 en el Aula 204, no te duermas.';
  }

  if (currentTimeVal >= 14 * 60 + 20) {
    return 'Ya ha terminado la jornada lectiva, tira pa tu casa a descansar o a viciar. Mañana a las 08:30 más.';
  }

  if (currentTimeVal >= 11 * 60 + 5 && currentTimeVal < 11 * 60 + 35) {
    return '¡Estamos en el recreo (11:05 - 11:35)! Vete a pillar un bocadillo o un café y no me ralles.';
  }

  if (currentTimeVal >= 8 * 60 + 30 && currentTimeVal < 10 * 60 + 20) {
    return 'Ahora toca el primer bloque: Servicios en Red (SR) / Sistemas Operativos en Red (SOR) en el Aula 204. Ponte a configurar IPs y deja de empanarte.';
  }

  if (currentTimeVal >= 10 * 60 + 20 && currentTimeVal < 11 * 60 + 5) {
    return 'Toca Seguridad Informática (SI). A ver si no dejas la contraseña puesta en el terminal como siempre.';
  }

  if (currentTimeVal >= 11 * 60 + 35 && currentTimeVal < 13 * 60 + 25) {
    return 'Bloque del mediodía: Aplicaciones Web (AW) y servidores. Dale caña al Apache/Nginx.';
  }

  return 'Última hora: Módulo Profesional / Empresa (MEP) o Inglés Técnico (IP2). Ya casi te vas a tu casa.';
}

export const PutoIsaacTour: React.FC<PutoIsaacTourProps> = ({
  onSelectTab,
  isOpenControlled,
  onCloseControlled,
  onToggleSound,
  onOpenFeedback,
  onOpenSettings,
}) => {
  // Estado de apertura del diálogo compacto
  const [isOpen, setIsOpen] = useState(false);

  // Modo: 'tour' (recorrido interactivo) o 'chat' (asistente de IA)
  const [mode, setMode] = useState<'tour' | 'chat'>('tour');
  const [currentStep, setCurrentStep] = useState(0);

  // Estados visuales de la mascota
  const [isBlinking, setIsBlinking] = useState(false);
  const [isTalking, setIsTalking] = useState(false);

  // Efecto máquina de escribir para el tour
  const [tourDisplayText, setTourDisplayText] = useState('');
  const [isTourTyping, setIsTourTyping] = useState(false);
  const typewriterTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Chat con PUTOISAAC
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: 'assistant',
      content:
        'Soy PUTOISAAC. Dime qué coño quieres o dale a un botón de abajo si te da pereza escribir, pedazo de vago.',
    },
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const onSelectTabRef = useRef(onSelectTab);

  useEffect(() => {
    onSelectTabRef.current = onSelectTab;
  }, [onSelectTab]);

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

  // Apertura controlada externamente (ej: desde botón de bienvenida o menú)
  useEffect(() => {
    if (isOpenControlled !== undefined) {
      setIsOpen(isOpenControlled);
      if (isOpenControlled) {
        setMode('tour');
        setCurrentStep(0);
      }
    }
  }, [isOpenControlled]);

  // Cooldown timer
  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setInterval(() => setCooldown((c) => Math.max(0, c - 1)), 1000);
    return () => clearInterval(t);
  }, [cooldown]);

  // Parpadeo natural de los ojos de PUTOISAAC
  useEffect(() => {
    const blinkInterval = setInterval(() => {
      setIsBlinking(true);
      setTimeout(() => setIsBlinking(false), 170);
    }, 3200 + Math.random() * 2500);

    return () => clearInterval(blinkInterval);
  }, []);

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

  // Scroll en el chat
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
    const speed = 16;

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

  // Sincronizar texto y pestaña cuando cambia el paso del tour
  useEffect(() => {
    if (isOpen && mode === 'tour') {
      const step = TOUR_STEPS[currentStep];
      if (step) {
        if (step.tabTarget) {
          onSelectTabRef.current?.(step.tabTarget);
        }
        runTourTypewriter(step.text);
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
      // Fin del tour: marcar como completado y cambiar a modo chat
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

    const lower = textToSend.toLowerCase();

    // Respuestas instantáneas sin latencia
    if (lower.includes('que toca') || lower.includes('qué toca') || lower.includes('clase ahora')) {
      const statusText = getLiveClassStatusRude();
      appendAssistantWithTyping(statusText, 'Horario Lectivo');
      setIsLoading(false);
      return;
    }

    if (lower.includes('comandos') || lower.includes('red') || lower.includes('linux')) {
      const commandsText =
        'Toma comandos pa no cagarla en el Aula 204: `ip a` (ver IPs), `ss -tuln` (puertos), `traceroute` (rutas), `sudo systemctl restart networking` o `Test-NetConnection -Port 80`.';
      appendAssistantWithTyping(commandsText, 'Comandos SMR');
      setIsLoading(false);
      return;
    }

    try {
      const res = await fetch('/api/ai/isaac', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: textToSend,
          history: messages.slice(-4),
        }),
      });

      const data = await res.json();
      let rawReply = data.reply || 'No te he entendido una mierda. Pregúntame otra vez.';

      let executedLabel: string | undefined;
      const navMatch = rawReply.match(/\[(NAV:[a-z]+|ACT:[a-z_]+)\]/);
      if (navMatch) {
        executedLabel = executeAction(navMatch[1]);
        rawReply = rawReply.replace(navMatch[0], '').trim();
      }

      appendAssistantWithTyping(rawReply, executedLabel);
    } catch {
      appendAssistantWithTyping('Se me ha cruzado un cable en el servidor. Prueba luego, pedazo de vago.');
    } finally {
      setIsLoading(false);
    }
  };

  // Posición dinámica de la bolita según el paso del tour
  const isIntroTourActive = isOpen && mode === 'tour';

  let positionClasses = 'bottom-[calc(4.8rem+env(safe-area-inset-bottom,0px))] left-4 sm:left-6 sm:bottom-6';
  let mascotScale = 'scale-100';
  let bubbleAlignment = 'items-start';

  if (isIntroTourActive) {
    if (currentStep === 0) {
      // Paso 0: Bienvenida centrada en primer plano
      positionClasses = 'bottom-28 sm:bottom-36 left-1/2 -translate-x-1/2';
      mascotScale = 'scale-115 sm:scale-125';
      bubbleAlignment = 'items-center';
    } else if (currentStep === 1) {
      // Paso 1: Izquierda señalando el tablón
      positionClasses = 'bottom-28 sm:bottom-32 left-4 sm:left-14 translate-x-0';
      mascotScale = 'scale-110 rotate-2';
      bubbleAlignment = 'items-start';
    } else if (currentStep === 2) {
      // Paso 2: Derecha señalando la bolsa
      positionClasses = 'bottom-36 sm:bottom-44 right-4 sm:right-14 translate-x-0';
      mascotScale = 'scale-110 -rotate-2';
      bubbleAlignment = 'items-end';
    } else if (currentStep === 3) {
      // Paso 3: Arriba señalando el horario
      positionClasses = 'top-24 sm:top-28 left-6 sm:left-16 translate-x-0';
      mascotScale = 'scale-110';
      bubbleAlignment = 'items-start';
    } else {
      // Paso 4: De vuelta a la base
      positionClasses = 'bottom-[calc(4.8rem+env(safe-area-inset-bottom,0px))] left-4 sm:left-6 sm:bottom-6 translate-x-0';
      mascotScale = 'scale-105';
      bubbleAlignment = 'items-start';
    }
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
      `}</style>

      {/* Contenedor flotante que se desplaza fluidamente por la pantalla */}
      <aside
        aria-label="Asistente interactivo PUTOISAAC"
        className={`fixed z-45 pointer-events-none select-none font-sans transition-all duration-700 cubic-bezier(0.34, 1.56, 0.64, 1) ${positionClasses}`}
      >
        <div className={`relative flex flex-col pointer-events-auto ${bubbleAlignment}`}>
          {/* Cuadro de diálogo compacto (NO ocupa toda la pantalla, adaptativo modo oscuro/claro) */}
          {isOpen && (
            <div
              className="mb-2.5 w-[calc(100vw-32px)] max-w-[330px] sm:max-w-[360px] bg-white/95 dark:bg-neutral-900/95 text-neutral-900 dark:text-neutral-100 border-2 border-neutral-300 dark:border-neutral-800 rounded-2xl p-3.5 shadow-2xl relative backdrop-blur-md animate-in fade-in zoom-in-95 duration-200"
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
                  {/* Selector rápido entre Tour y Asistente */}
                  <button
                    type="button"
                    onClick={() => {
                      try {
                        sound.tap();
                      } catch {}
                      setMode((m) => (m === 'tour' ? 'chat' : 'tour'));
                    }}
                    className="px-2 py-0.5 rounded text-[10px] font-medium bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 hover:text-neutral-900 dark:hover:text-white transition-colors cursor-pointer"
                    title={mode === 'tour' ? 'Ir al chat con IA' : 'Ver tour de la web'}
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

              {/* CONTENIDO MODO TOUR */}
              {mode === 'tour' && (
                <div>
                  <h4 className="text-xs font-bold text-orange-600 dark:text-orange-400 mb-1">
                    {TOUR_STEPS[currentStep]?.title}
                  </h4>

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

              {/* CONTENIDO MODO CHAT / ASISTENTE IA */}
              {mode === 'chat' && (
                <div>
                  {/* Chips de acciones rápidas */}
                  <div className="flex items-center gap-1 overflow-x-auto pb-1.5 mb-2 scrollbar-none text-[10px] font-mono">
                    <button
                      type="button"
                      onClick={() => handleSendMessage('¿Qué toca ahora?')}
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
                        <span>Pensando la burrada que soltarte...</span>
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
              animation: 'putoFloat 3.8s ease-in-out infinite',
            }}
            title="Toca para abrir/cerrar a PUTOISAAC"
          >
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
                {/* Ojos expresivos con parpadeo */}
                <div className="flex items-center gap-1.5">
                  <div
                    className={`w-2.5 h-3 rounded-full bg-neutral-950 transition-all duration-150 flex items-center justify-center relative ${
                      isBlinking ? 'h-0.5 mt-2 bg-neutral-900' : ''
                    }`}
                  >
                    {!isBlinking && (
                      <div className="w-0.5 h-0.5 rounded-full bg-white absolute top-0.5 left-0.5" />
                    )}
                  </div>

                  <div
                    className={`w-2.5 h-3 rounded-full bg-neutral-950 transition-all duration-150 flex items-center justify-center relative ${
                      isBlinking ? 'h-0.5 mt-2 bg-neutral-900' : ''
                    }`}
                  >
                    {!isBlinking && (
                      <div className="w-0.5 h-0.5 rounded-full bg-white absolute top-0.5 left-0.5" />
                    )}
                  </div>
                </div>

                {/* Boca expresiva que habla */}
                <div
                  className={`transition-all duration-100 ${
                    isTalking
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
