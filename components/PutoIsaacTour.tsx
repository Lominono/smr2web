'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { sound } from '@/lib/audio';
import { X, ArrowRight, RotateCcw, Send, Sparkles, Loader2, Trash2 } from 'lucide-react';

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
  'Illo, no metas todas tus monedas en Mercadona que luego te quedas a dos velas.',
  'Ponte a estudiar subnetting que luego vienen los lloros en el examen de redes.',
  'Si tus colegas compran Kebab Amigo a saco, el precio sube en directo para todos.',
  'Guarda siempre con Ctrl+S en los PCs del aula, que luego se va la luz y a llorar.',
  '¿Te has liado? Si quieres, te repito el tour de la web en un segundo.',
];

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

interface PutoIsaacTourProps {
  onSelectTab?: (tab: 'chat' | 'investments' | 'schedule') => void;
  isOpenControlled?: boolean;
  onCloseControlled?: () => void;
}

export const PutoIsaacTour: React.FC<PutoIsaacTourProps> = ({
  onSelectTab,
  isOpenControlled,
  onCloseControlled,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [displayedText, setDisplayedText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [isBlinking, setIsBlinking] = useState(false);
  const [isTalking, setIsTalking] = useState(false);

  // Estado del tour completado (solo se mueve fluidamente por la pantalla AL PRINCIPIO)
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

  useEffect(() => {
    onSelectTabRef.current = onSelectTab;
  }, [onSelectTab]);

  // Comprobar al montar si el usuario ya vio el tour
  useEffect(() => {
    try {
      const tourDone = localStorage.getItem('smr2_putoisaac_tour_done') === 'true';
      setIsTourCompleted(tourDone);
      if (!tourDone && isOpenControlled === undefined) {
        const timer = setTimeout(() => {
          setIsOpen(true);
        }, 1200);
        return () => clearTimeout(timer);
      }
    } catch {}
  }, [isOpenControlled]);

  // Apertura controlada externa (ej: desde bienvenida o ajustes)
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

  // Parpadeo natural de los ojos
  useEffect(() => {
    const blinkInterval = setInterval(() => {
      setIsBlinking(true);
      setTimeout(() => setIsBlinking(false), 180);
    }, 3400 + Math.random() * 2600);

    return () => clearInterval(blinkInterval);
  }, []);

  // Máquina de escribir: escribe una vez y se queda fija
  const startTypewriter = useCallback((targetText: string, messageKey: string) => {
    if (typewriterTimeoutRef.current) {
      clearTimeout(typewriterTimeoutRef.current);
    }

    currentTextKeyRef.current = messageKey;
    setDisplayedText('');
    setIsTyping(true);
    setIsTalking(true);

    let charIndex = 0;

    const typeNext = () => {
      if (currentTextKeyRef.current !== messageKey) return;

      if (charIndex <= targetText.length) {
        setDisplayedText(targetText.slice(0, charIndex));
        charIndex += 1;

        const char = targetText[charIndex - 1];
        const delay = char === '.' || char === '!' || char === '?' ? 55 : 18;

        typewriterTimeoutRef.current = setTimeout(typeNext, delay);
      } else {
        setDisplayedText(targetText);
        setIsTyping(false);
        setIsTalking(false);
      }
    };

    typewriterTimeoutRef.current = setTimeout(typeNext, 50);
  }, []);

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

    const step = TOUR_STEPS[currentStep];
    if (!step) return;

    if (onSelectTabRef.current && step.tabTarget) {
      onSelectTabRef.current(step.tabTarget);
    }

    const key = `tour_step_${currentStep}`;
    if (currentTextKeyRef.current !== key) {
      startTypewriter(step.text, key);
    }
  }, [isOpen, currentStep, isIdleChat, idleMessage, startTypewriter]);

  // Completar el texto al hacer clic en el bocadillo
  const handleBubbleClick = () => {
    if (isTyping) {
      if (typewriterTimeoutRef.current) {
        clearTimeout(typewriterTimeoutRef.current);
      }
      const targetText = isIdleChat ? idleMessage : TOUR_STEPS[currentStep]?.text || '';
      setDisplayedText(targetText);
      setIsTyping(false);
      setIsTalking(false);
      try { sound.tap(); } catch {}
    }
  };

  const handleNext = () => {
    try { sound.tap(); } catch {}

    if (currentStep < TOUR_STEPS.length - 1) {
      setCurrentStep((prev) => prev + 1);
    } else {
      // Fin del tour: guardar marca, estacionarse en el lugar seguro y no volver a moverse por la pantalla
      try {
        localStorage.setItem('smr2_putoisaac_tour_done', 'true');
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
    try { sound.tap(); } catch {}
    if (markDone) {
      try {
        localStorage.setItem('smr2_putoisaac_tour_done', 'true');
      } catch {}
      setIsTourCompleted(true);
    }
    setIsOpen(false);
    if (onCloseControlled) {
      onCloseControlled();
    }
  };

  const handleMascotClick = () => {
    try { sound.tap(); } catch {}

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
    try { sound.tap(); } catch {}
    setCurrentStep(0);
    setIsIdleChat(false);
    setIsTourCompleted(false);
    setIsOpen(true);
  };

  // Enviar pregunta a la IA de PUTOISAAC con memoria volátil y protección anti-abuso
  const handleSendAiPrompt = async (e: React.FormEvent) => {
    e.preventDefault();
    const prompt = aiPrompt.trim();
    if (!prompt || isAiLoading || cooldown > 0) return;

    if (prompt.length > 180) {
      setIdleMessage('Menudo tocho loco, que soy una bola y me mareo leyendo tanto.');
      startTypewriter('Menudo tocho loco, que soy una bola y me mareo leyendo tanto.', `warn_${Date.now()}`);
      return;
    }

    try {
      sound.tap();
      setIsAiLoading(true);
      setAiPrompt('');
      setCooldown(4); // 4 segundos de cooldown anti-abuso

      // Guardar en memoria volátil
      const updatedHistory: ChatMessage[] = [
        ...volatileHistory.slice(-6),
        { role: 'user', content: prompt },
      ];
      setVolatileHistory(updatedHistory);

      const res = await fetch('/api/ai/isaac', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt,
          history: updatedHistory,
        }),
      });

      const data = await res.json();
      const reply = data.reply || 'Buah me he liado yo solo, pregúntame otra vez.';

      // Actualizar memoria volátil con la respuesta del colega
      setVolatileHistory((prev) => [...prev.slice(-6), { role: 'assistant', content: reply }]);

      setIdleMessage(reply);
      setIsIdleChat(true);
      startTypewriter(reply, `ai_${Date.now()}`);
    } catch {
      const errorMsg = 'Se me ha cortado la conexión de la bola. Dale otra vez.';
      setIdleMessage(errorMsg);
      startTypewriter(errorMsg, `ai_err_${Date.now()}`);
    } finally {
      setIsAiLoading(false);
    }
  };

  const handleClearMemory = () => {
    setVolatileHistory([]);
    setIdleMessage('Memoria borrada fiera. ¿De qué hablábamos? Ya no me acuerdo de nada jajaja.');
    startTypewriter('Memoria borrada fiera. ¿De qué hablábamos? Ya no me acuerdo de nada jajaja.', `clear_${Date.now()}`);
    try { sound.tap(); } catch {}
  };

  // REGLA CRUCIAL DE POSICIONAMIENTO:
  // 1. "Deberá moverse fluidamente y SOLO AL PRINCIPIO":
  //    Solo durante el primer tour activo (!isTourCompleted && isOpen && !isIdleChat) se mueve por la pantalla con animación fluida.
  // 2. "Debe SIEMPRE posicionarse el asistente en un lugar donde no estorbe":
  //    En cualquier otro momento (y permanentemente tras el tour), está SIEMPRE en su aparcamiento seguro:
  //    Esquina inferior izquierda (bottom-left) justo encima de la barra móvil de pestañas, con un avatar compacto que no tapa contenido.
  const isIntroTourActive = !isTourCompleted && isOpen && !isIdleChat;

  let positionClasses = 'bottom-[calc(4.5rem+env(safe-area-inset-bottom,0px))] left-3.5 sm:left-5 sm:bottom-5';
  let mascotScale = 'scale-100';
  let bubbleAlignment = 'items-start';

  if (isIntroTourActive) {
    if (currentStep === 0) {
      // Paso 0: Bienvenida en el centro, se acerca en grande (scale-125)
      positionClasses = 'bottom-28 sm:bottom-36 left-1/2 -translate-x-1/2';
      mascotScale = 'scale-125 sm:scale-130';
      bubbleAlignment = 'items-center';
    } else if (currentStep === 1) {
      // Paso 1: Glissando suave a la izquierda señalando el tablón
      positionClasses = 'bottom-28 sm:bottom-32 left-4 sm:left-12 translate-x-0';
      mascotScale = 'scale-110 rotate-3';
      bubbleAlignment = 'items-start';
    } else if (currentStep === 2) {
      // Paso 2: Flota hacia la derecha arriba cerca de la bolsa
      positionClasses = 'bottom-36 sm:bottom-44 right-4 sm:right-12 translate-x-0';
      mascotScale = 'scale-115 -rotate-3';
      bubbleAlignment = 'items-end';
    } else if (currentStep === 3) {
      // Paso 3: Regresa al centro en primer plano ("Ojo con el mercado")
      positionClasses = 'bottom-28 sm:bottom-36 left-1/2 -translate-x-1/2';
      mascotScale = 'scale-125';
      bubbleAlignment = 'items-center';
    } else if (currentStep === 4) {
      // Paso 4: Sube flotando señalando el menú superior
      positionClasses = 'top-24 sm:top-28 left-6 sm:left-14 translate-x-0';
      mascotScale = 'scale-110';
      bubbleAlignment = 'items-start';
    }
  }

  return (
    <>
      {/* Fondo transparente para cerrar el bocadillo con un toque fuera (si está abierto fuera del tour) */}
      {isOpen && isTourCompleted && (
        <div
          onClick={() => handleClose(false)}
          className="fixed inset-0 z-40 bg-black/10 backdrop-blur-[0.5px] cursor-default pointer-events-auto"
          aria-hidden="true"
        />
      )}

      <aside
        aria-label="Asistente interactivo PUTOISAAC"
        className={`fixed z-45 pointer-events-none select-none font-sans transition-all duration-800 cubic-bezier(0.34, 1.56, 0.64, 1) ${positionClasses}`}
      >
        <style jsx>{`
          @keyframes putoFloat {
            0%, 100% { transform: translateY(0px); }
            50% { transform: translateY(-6px); }
          }
        `}</style>

        <div className={`relative flex flex-col pointer-events-auto ${bubbleAlignment}`}>
          {/* Bocadillo de diálogo estilo cómic que NUNCA se reinicia al leer */}
          {isOpen && (
            <div
              onClick={handleBubbleClick}
              className="mb-2.5 w-[calc(100vw-28px)] max-w-[310px] sm:max-w-[340px] bg-neutral-950 text-white border-2 border-neutral-800 rounded-2xl p-4 shadow-2xl cursor-pointer relative animate-in fade-in zoom-in-95 duration-200"
              style={{
                boxShadow: '0 16px 36px rgba(0,0,0,0.55), inset 0 1px 0 rgba(255,255,255,0.1)',
              }}
            >
              {/* Cabecera del bocadillo */}
              <div className="flex items-center justify-between pb-2 border-b border-neutral-800/80 mb-2">
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="text-[11px] font-bold tracking-wider text-white uppercase font-mono">
                    PUTOISAAC
                  </span>
                  {!isTourCompleted && !isIdleChat && (
                    <span className="text-[10px] text-neutral-400 font-mono ml-1">
                      {currentStep + 1}/{TOUR_STEPS.length}
                    </span>
                  )}
                  {isIdleChat && (
                    <span className="text-[10px] text-amber-400 flex items-center gap-0.5 ml-1 font-mono">
                      <Sparkles className="w-2.5 h-2.5" />
                      <span>Colega</span>
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-1">
                  {/* Botón para vaciar memoria volátil */}
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

              {/* Título */}
              <h4 className="text-xs font-bold text-amber-400 mb-1">
                {isIdleChat ? 'Tu colega de SMR' : TOUR_STEPS[currentStep]?.title}
              </h4>

              {/* Texto mecanografiado que permanece fijo */}
              <p className="text-xs text-neutral-200 leading-relaxed min-h-[44px]">
                {displayedText}
                {isTyping && (
                  <span className="inline-block w-1.5 h-3.5 ml-0.5 bg-amber-400 animate-pulse align-middle" />
                )}
              </p>

              {/* Modo chat con IA tontita (con memoria y anti-abuso) */}
              {isIdleChat && (
                <form onSubmit={handleSendAiPrompt} className="mt-3 pt-2 border-t border-neutral-800/80">
                  <div className="relative flex items-center">
                    <input
                      type="text"
                      maxLength={180}
                      value={aiPrompt}
                      onChange={(e) => setAiPrompt(e.target.value)}
                      placeholder={
                        cooldown > 0
                          ? `Espera ${cooldown}s...`
                          : 'Dile algo a PUTOISAAC...'
                      }
                      disabled={isAiLoading || cooldown > 0}
                      className="w-full text-[11px] bg-neutral-900 border border-neutral-700/80 rounded-lg px-2.5 py-1.5 pr-8 text-white placeholder-neutral-500 focus:outline-none focus:border-amber-400/80 transition-colors disabled:opacity-50"
                    />
                    <button
                      type="submit"
                      disabled={isAiLoading || !aiPrompt.trim() || cooldown > 0}
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

                  {/* Contador sutil y aviso de memoria volátil */}
                  <div className="flex items-center justify-between text-[9px] text-neutral-500 mt-1 px-0.5 font-mono">
                    <span>
                      {volatileHistory.length > 0
                        ? `Memoria: ${volatileHistory.length} mensajes`
                        : 'Memoria activa'}
                    </span>
                    <span>{aiPrompt.length}/180</span>
                  </div>
                </form>
              )}

              {/* Botones y navegación */}
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
                      className="text-[11px] text-amber-400 hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      <RotateCcw className="w-3 h-3" />
                      <span>Ver tour otra vez</span>
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

              {/* Puntero triangular del bocadillo */}
              <div
                className={`absolute -bottom-2 w-3.5 h-3.5 bg-neutral-950 border-r-2 border-b-2 border-neutral-800 transform rotate-45 ${
                  bubbleAlignment === 'items-end'
                    ? 'right-6'
                    : bubbleAlignment === 'items-center'
                    ? 'left-1/2 -translate-x-1/2'
                    : 'left-6'
                }`}
              />
            </div>
          )}

          {/* Mascota esférica interactiva PUTOISAAC (pequeña y discreta donde no estorba) */}
          <div
            onClick={handleMascotClick}
            className={`group relative flex flex-col items-center cursor-pointer transition-all duration-700 active:scale-90 ${mascotScale}`}
            style={{
              animation: 'putoFloat 3.8s ease-in-out infinite',
            }}
            title="Toca para hablar con PUTOISAAC"
          >
            {/* Cartelito con el nombre */}
            <div className="mb-1 px-2 py-0.5 rounded-full bg-neutral-950/90 text-white border border-neutral-700 text-[9px] font-bold tracking-tight shadow-md transition-all group-hover:scale-105 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping" />
              <span className="font-mono">PUTOISAAC</span>
            </div>

            {/* Esfera 3D lustrosa */}
            <div
              className="w-11 h-11 sm:w-12 sm:h-12 rounded-full bg-gradient-to-tr from-amber-600 via-orange-500 to-yellow-400 border-2 border-white/80 shadow-xl flex items-center justify-center relative overflow-hidden transition-all duration-300 group-hover:shadow-amber-500/50 group-hover:scale-105"
              style={{
                boxShadow: '0 6px 20px rgba(245, 158, 11, 0.4), inset 0 2px 5px rgba(255,255,255,0.7)',
              }}
            >
              {/* Brillo especular superior */}
              <div className="absolute top-1 left-1.5 w-3.5 h-2 rounded-full bg-white/70 blur-[0.3px] transform -rotate-12 pointer-events-none" />

              {/* Cara cómica de PUTOISAAC */}
              <div className="flex flex-col items-center justify-center relative z-10 space-y-1 mt-0.5">
                {/* Ojos expresivos con parpadeo */}
                <div className="flex items-center gap-1.5">
                  <div
                    className={`w-2 h-2.5 rounded-full bg-neutral-950 transition-all duration-150 flex items-center justify-center relative ${
                      isBlinking ? 'h-0.5 mt-2 bg-neutral-900' : ''
                    }`}
                  >
                    {!isBlinking && (
                      <div className="w-0.5 h-0.5 rounded-full bg-white absolute top-0.5 left-0.5" />
                    )}
                  </div>

                  <div
                    className={`w-2 h-2.5 rounded-full bg-neutral-950 transition-all duration-150 flex items-center justify-center relative ${
                      isBlinking ? 'h-0.5 mt-2 bg-neutral-900' : ''
                    }`}
                  >
                    {!isBlinking && (
                      <div className="w-0.5 h-0.5 rounded-full bg-white absolute top-0.5 left-0.5" />
                    )}
                  </div>
                </div>

                {/* Boca que habla */}
                <div
                  className={`transition-all duration-100 ${
                    isTalking
                      ? 'w-2 h-2 bg-neutral-950 rounded-full animate-bounce'
                      : 'w-2 h-1 border-b-2 border-neutral-950 rounded-full'
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
