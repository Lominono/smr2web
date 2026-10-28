'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { sound } from '@/lib/audio';
import { X, ArrowRight, RotateCcw, Send, Sparkles, Loader2 } from 'lucide-react';

interface TourStep {
  title: string;
  text: string;
  tabTarget?: 'chat' | 'investments' | 'schedule';
}

const TOUR_STEPS: TourStep[] = [
  {
    title: '¡Eyyy!',
    text: 'Soy PUTOISAAC. Bienvenido al portal de 2º SMR. Te voy a enseñar rápido cuatro cosas para que no te pierdas en el aula.',
  },
  {
    title: 'El Tablón en Vivo',
    text: 'Aquí en el tablón cualquiera puede publicar avisos, dudas de clase o quejas en tiempo real. Lo que escribas le llega a toda la clase al instante sin recargar.',
    tabTarget: 'chat',
  },
  {
    title: 'Bolsa y El Botellón',
    text: 'En Inversiones tienes la Bolsa de El Botellón y empresas de coña como Mercadona, Red Bull o Kebab Amigo. Tienes 1.000 monedas para tradear.',
    tabTarget: 'investments',
  },
  {
    title: 'Cotizaciones en Directo',
    text: 'Ojo con el mercado: si la gente compra mucho una empresa, el precio sube de verdad. Y si todos venden en masa, se desploma en la gráfica.',
    tabTarget: 'investments',
  },
  {
    title: 'Horario y Minijuegos',
    text: 'Arriba tienes el horario para saber qué clase toca en cada momento y minijuegos como la Ruleta Rusa. ¡A darle caña y no suspendas redes!',
    tabTarget: 'schedule',
  },
];

const RANDOM_TIPS = [
  '¿Qué pasa fiera? Recuerda diversificar tus monedas y no meterlo todo en Mercadona.',
  'Ponte a estudiar subnetting que luego vienen los lloros en el examen de redes.',
  '¿Sabías que si tus compañeros compran Kebab Amigo el precio sube en vivo para todos?',
  'No te olvides de guardar siempre los proyectos con Ctrl+S en los PCs del aula.',
  '¿Te has perdido? Si quieres, te repito el tour de la web en un segundo.',
];

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

  // Modo libre o IA
  const [isIdleChat, setIsIdleChat] = useState(false);
  const [idleMessage, setIdleMessage] = useState('');
  const [aiPrompt, setAiPrompt] = useState('');
  const [isAiLoading, setIsAiLoading] = useState(false);

  // Control estricto para que los textos nunca se reinicien mientras se leen
  const currentTextKeyRef = useRef<string>('');
  const typewriterTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const onSelectTabRef = useRef(onSelectTab);

  useEffect(() => {
    onSelectTabRef.current = onSelectTab;
  }, [onSelectTab]);

  // Sincronizar apertura externa controlada (ej: tras bienvenida o desde ajustes)
  useEffect(() => {
    if (isOpenControlled) {
      setCurrentStep(0);
      setIsIdleChat(false);
      setIsOpen(true);
    }
  }, [isOpenControlled]);

  // Si no está controlado externamente, abrir automáticamente tras el primer inicio
  useEffect(() => {
    if (isOpenControlled !== undefined) return;
    try {
      const tourDone = localStorage.getItem('smr2_putoisaac_tour_done');
      if (!tourDone) {
        const timer = setTimeout(() => {
          setIsOpen(true);
        }, 1200);
        return () => clearTimeout(timer);
      }
    } catch {}
  }, [isOpenControlled]);

  // Parpadeo natural de los ojos
  useEffect(() => {
    const blinkInterval = setInterval(() => {
      setIsBlinking(true);
      setTimeout(() => setIsBlinking(false), 180);
    }, 3400 + Math.random() * 2600);

    return () => clearInterval(blinkInterval);
  }, []);

  // Máquina de escribir sólida: NUNCA se reinicia salvo que cambie de paso o de prompt
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
      // Si la clave ya no coincide, abortar
      if (currentTextKeyRef.current !== messageKey) return;

      if (charIndex <= targetText.length) {
        setDisplayedText(targetText.slice(0, charIndex));
        charIndex += 1;

        const char = targetText[charIndex - 1];
        const delay = char === '.' || char === '!' || char === '?' ? 60 : 18;

        typewriterTimeoutRef.current = setTimeout(typeNext, delay);
      } else {
        // Al terminar, el texto queda fijo y finalizado
        setDisplayedText(targetText);
        setIsTyping(false);
        setIsTalking(false);
      }
    };

    typewriterTimeoutRef.current = setTimeout(typeNext, 60);
  }, []);

  // Efecto disparador según el paso activo
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

    // Cambiar de vista en la web si el paso lo requiere
    if (onSelectTabRef.current && step.tabTarget) {
      onSelectTabRef.current(step.tabTarget);
    }

    const key = `tour_step_${currentStep}`;
    if (currentTextKeyRef.current !== key) {
      startTypewriter(step.text, key);
    }
  }, [isOpen, currentStep, isIdleChat, idleMessage, startTypewriter]);

  // Completar el texto instantáneamente si el usuario hace clic en el globo
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
      // Fin del tour: guardar marca y pasar al modo acoplado en su nuevo lugar
      try {
        localStorage.setItem('smr2_putoisaac_tour_done', 'true');
      } catch {}
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

    const tourDone = typeof window !== 'undefined' && localStorage.getItem('smr2_putoisaac_tour_done') === 'true';

    if (tourDone) {
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
    setIsOpen(true);
  };

  // Enviar pregunta a la IA de PUTOISAAC (OpenRouter)
  const handleSendAiPrompt = async (e: React.FormEvent) => {
    e.preventDefault();
    const prompt = aiPrompt.trim();
    if (!prompt || isAiLoading) return;

    try {
      sound.tap();
      setIsAiLoading(true);
      setAiPrompt('');

      const res = await fetch('/api/ai/isaac', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt }),
      });

      const data = await res.json();
      const reply = data.reply || '¡Se me ha quedado pillado el proceso! Pregúntame otra vez.';

      setIdleMessage(reply);
      setIsIdleChat(true);
      startTypewriter(reply, `ai_${Date.now()}`);
    } catch {
      const errorMsg = 'No he podido conectar con el servidor. Revisa si hay conexión a internet.';
      setIdleMessage(errorMsg);
      startTypewriter(errorMsg, `ai_err_${Date.now()}`);
    } finally {
      setIsAiLoading(false);
    }
  };

  // Posicionamiento dinámico:
  // Durante el tour se mueve, acerca, aleja y cambia de lugar según el paso.
  // Al terminar o estar docked, se queda en su NUEVO LUGAR: esquina inferior izquierda (bottom-left).
  const isTourActive = isOpen && !isIdleChat;

  let positionClasses = 'bottom-20 sm:bottom-6 left-4 sm:left-6'; // Nuevo lugar definitivo tras el tour (bottom-left)
  let mascotScale = 'scale-100';
  let bubblePosition = 'items-start';

  if (isTourActive) {
    if (currentStep === 0) {
      // Paso 0: Bienvenida en el centro, se acerca en grande (scale-135)
      positionClasses = 'bottom-28 sm:bottom-36 left-1/2 -translate-x-1/2';
      mascotScale = 'scale-125 sm:scale-135';
      bubblePosition = 'items-center';
    } else if (currentStep === 1) {
      // Paso 1: Se desplaza a la izquierda hacia el tablón de anuncios
      positionClasses = 'bottom-28 sm:bottom-32 left-4 sm:left-14';
      mascotScale = 'scale-110 rotate-3';
      bubblePosition = 'items-start';
    } else if (currentStep === 2) {
      // Paso 2: Flota hacia la derecha arriba hacia la bolsa de inversiones
      positionClasses = 'bottom-36 sm:bottom-44 right-4 sm:right-14';
      mascotScale = 'scale-115 -rotate-3';
      bubblePosition = 'items-end';
    } else if (currentStep === 3) {
      // Paso 3: Se acerca en primer plano al centro ("Ojo con el mercado")
      positionClasses = 'bottom-28 sm:bottom-36 left-1/2 -translate-x-1/2';
      mascotScale = 'scale-130';
      bubblePosition = 'items-center';
    } else if (currentStep === 4) {
      // Paso 4: Sube flotando hacia las pestañas de navegación superior
      positionClasses = 'top-28 sm:top-32 left-6 sm:left-14';
      mascotScale = 'scale-110';
      bubblePosition = 'items-start';
    }
  }

  return (
    <aside
      aria-label="Asistente interactivo PUTOISAAC"
      className={`fixed z-45 pointer-events-none select-none font-sans transition-all duration-700 cubic-bezier(0.34, 1.56, 0.64, 1) ${positionClasses}`}
    >
      <style jsx>{`
        @keyframes putoFloat {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-7px); }
        }
      `}</style>

      <div className={`relative flex flex-col pointer-events-auto ${bubblePosition}`}>
        {/* Bocadillo de diálogo estilo cómic */}
        {isOpen && (
          <div
            onClick={handleBubbleClick}
            className="mb-3 max-w-[300px] sm:max-w-[360px] bg-neutral-950 text-white border-2 border-neutral-800 rounded-2xl p-4 shadow-2xl cursor-pointer relative animate-in fade-in zoom-in-95 duration-200"
            style={{
              boxShadow: '0 15px 35px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.1)',
            }}
          >
            {/* Cabecera del bocadillo */}
            <div className="flex items-center justify-between pb-2 border-b border-neutral-800 mb-2">
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-[11px] font-bold tracking-wider text-white uppercase font-mono">
                  PUTOISAAC
                </span>
                {!isIdleChat && (
                  <span className="text-[10px] text-neutral-400 font-mono ml-1">
                    {currentStep + 1}/{TOUR_STEPS.length}
                  </span>
                )}
                {isIdleChat && (
                  <span className="text-[10px] text-amber-400 flex items-center gap-0.5 ml-1 font-mono">
                    <Sparkles className="w-2.5 h-2.5" />
                    <span>AI</span>
                  </span>
                )}
              </div>

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

            {/* Título */}
            <h4 className="text-xs font-bold text-amber-400 mb-1">
              {isIdleChat ? 'Asistente de Clase' : TOUR_STEPS[currentStep]?.title}
            </h4>

            {/* Texto mecanografiado que permanece fijo al terminar */}
            <p className="text-xs text-neutral-200 leading-relaxed min-h-[46px]">
              {displayedText}
              {isTyping && (
                <span className="inline-block w-1.5 h-3.5 ml-0.5 bg-amber-400 animate-pulse align-middle" />
              )}
            </p>

            {/* Si está en modo libre / acoplado en su nuevo lugar: entrada de chat con IA */}
            {isIdleChat && (
              <form onSubmit={handleSendAiPrompt} className="mt-3 pt-2 border-t border-neutral-800/80">
                <div className="relative flex items-center">
                  <input
                    type="text"
                    value={aiPrompt}
                    onChange={(e) => setAiPrompt(e.target.value)}
                    placeholder="Hazle una pregunta a PUTOISAAC..."
                    disabled={isAiLoading}
                    className="w-full text-[11px] bg-neutral-900 border border-neutral-700/80 rounded-lg px-2.5 py-1.5 pr-8 text-white placeholder-neutral-500 focus:outline-none focus:border-amber-400/80 transition-colors"
                  />
                  <button
                    type="submit"
                    disabled={isAiLoading || !aiPrompt.trim()}
                    className="absolute right-1 w-6 h-6 rounded flex items-center justify-center text-neutral-400 hover:text-amber-400 disabled:opacity-30 cursor-pointer"
                    title="Preguntar"
                  >
                    {isAiLoading ? (
                      <Loader2 className="w-3 h-3 animate-spin text-amber-400" />
                    ) : (
                      <Send className="w-3 h-3" />
                    )}
                  </button>
                </div>
              </form>
            )}

            {/* Acciones y navegación del tour */}
            <div className="mt-2.5 pt-2 border-t border-neutral-800 flex items-center justify-between gap-2">
              {!isIdleChat ? (
                <>
                  {/* Puntos de paso */}
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
                      className="px-3.5 py-1.5 bg-white hover:bg-neutral-200 active:scale-95 text-black text-xs font-semibold rounded-lg transition-all cursor-pointer flex items-center gap-1 shadow-sm"
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
                    <span>Ver tour de la web</span>
                  </button>

                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleClose(false);
                    }}
                    className="px-3 py-1 bg-neutral-800 hover:bg-neutral-700 text-white text-xs font-medium rounded-lg cursor-pointer"
                  >
                    Entendido
                  </button>
                </div>
              )}
            </div>

            {/* Puntero triangular del bocadillo */}
            <div
              className={`absolute -bottom-2 w-3.5 h-3.5 bg-neutral-950 border-r-2 border-b-2 border-neutral-800 transform rotate-45 ${
                bubblePosition === 'items-end'
                  ? 'right-6'
                  : bubblePosition === 'items-center'
                  ? 'left-1/2 -translate-x-1/2'
                  : 'left-6'
              }`}
            />
          </div>
        )}

        {/* Mascota esférica interactiva PUTOISAAC con movimiento y zoom */}
        <div
          onClick={handleMascotClick}
          className={`group relative flex flex-col items-center cursor-pointer transition-all duration-700 active:scale-90 ${mascotScale}`}
          style={{
            animation: 'putoFloat 3.8s ease-in-out infinite',
          }}
          title="Haz clic para hablar con PUTOISAAC"
        >
          {/* Cartelito flotante con el nombre */}
          <div className="mb-1.5 px-2.5 py-0.5 rounded-full bg-neutral-950/90 text-white border border-neutral-700 text-[10px] font-bold tracking-tight shadow-lg transition-all group-hover:scale-105 flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping" />
            <span className="font-mono">PUTOISAAC</span>
          </div>

          {/* Esfera 3D brillante con reflejos y sombras */}
          <div
            className="w-12 h-12 sm:w-13 sm:h-13 rounded-full bg-gradient-to-tr from-amber-600 via-orange-500 to-yellow-400 border-2 border-white/80 shadow-2xl flex items-center justify-center relative overflow-hidden transition-all duration-300 group-hover:shadow-amber-500/50 group-hover:scale-105"
            style={{
              boxShadow: '0 8px 25px rgba(245, 158, 11, 0.45), inset 0 3px 6px rgba(255,255,255,0.7)',
            }}
          >
            {/* Brillo especular superior */}
            <div className="absolute top-1 left-2 w-4 h-2.5 rounded-full bg-white/70 blur-[0.4px] transform -rotate-12 pointer-events-none" />

            {/* Cara de PUTOISAAC */}
            <div className="flex flex-col items-center justify-center relative z-10 space-y-1.5 mt-0.5">
              {/* Ojos expresivos con parpadeo */}
              <div className="flex items-center gap-2">
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

              {/* Boca que se mueve al hablar */}
              <div
                className={`transition-all duration-100 ${
                  isTalking
                    ? 'w-2 h-2 bg-neutral-950 rounded-full animate-bounce'
                    : 'w-2.5 h-1 border-b-2 border-neutral-950 rounded-full'
                }`}
              />
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
};
