'use client';

import React, { useState, useEffect, useRef } from 'react';
import { sound } from '@/lib/audio';
import { X, ArrowRight, RotateCcw } from 'lucide-react';

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
  const [isIdleChat, setIsIdleChat] = useState(false);
  const [idleMessage, setIdleMessage] = useState('');

  const typewriterTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Sincronizar apertura controlada desde el componente padre
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

  // Parpadeo natural de los ojos cada 3-5 segundos
  useEffect(() => {
    const blinkInterval = setInterval(() => {
      setIsBlinking(true);
      setTimeout(() => setIsBlinking(false), 180);
    }, 3200 + Math.random() * 2500);

    return () => clearInterval(blinkInterval);
  }, []);

  // Efecto máquina de escribir (Typewriter)
  useEffect(() => {
    if (!isOpen) {
      setIsTalking(false);
      return;
    }

    if (typewriterTimeoutRef.current) {
      clearTimeout(typewriterTimeoutRef.current);
    }

    setDisplayedText('');
    setIsTyping(true);
    setIsTalking(true);

    const targetText = isIdleChat ? idleMessage : TOUR_STEPS[currentStep].text;

    // Cambiar de pestaña automáticamente si el paso lo sugiere
    if (!isIdleChat && onSelectTab && TOUR_STEPS[currentStep].tabTarget) {
      onSelectTab(TOUR_STEPS[currentStep].tabTarget!);
    }

    let charIndex = 0;

    const typeNext = () => {
      if (charIndex <= targetText.length) {
        setDisplayedText(targetText.slice(0, charIndex));
        charIndex += 1;

        const char = targetText[charIndex - 1];
        const delay = char === '.' || char === '!' || char === '?' ? 65 : 20;

        typewriterTimeoutRef.current = setTimeout(typeNext, delay);
      } else {
        setIsTyping(false);
        setIsTalking(false);
      }
    };

    typewriterTimeoutRef.current = setTimeout(typeNext, 80);

    return () => {
      if (typewriterTimeoutRef.current) {
        clearTimeout(typewriterTimeoutRef.current);
      }
    };
  }, [currentStep, isOpen, isIdleChat, idleMessage, onSelectTab]);

  const handleBubbleClick = () => {
    if (isTyping) {
      if (typewriterTimeoutRef.current) {
        clearTimeout(typewriterTimeoutRef.current);
      }
      const targetText = isIdleChat ? idleMessage : TOUR_STEPS[currentStep].text;
      setDisplayedText(targetText);
      setIsTyping(false);
      setIsTalking(false);
      try { sound.tap(); } catch {}
    }
  };

  const handleNext = () => {
    try { sound.tap(); } catch {}

    if (isIdleChat) {
      handleClose(false);
      return;
    }

    if (currentStep < TOUR_STEPS.length - 1) {
      setCurrentStep((prev) => prev + 1);
    } else {
      handleClose(true);
    }
  };

  const handleClose = (markCompleted: boolean = false) => {
    setIsOpen(false);
    setIsIdleChat(false);
    if (onCloseControlled) onCloseControlled();

    if (markCompleted && typeof window !== 'undefined') {
      try {
        localStorage.setItem('smr2_putoisaac_tour_done', 'true');
      } catch {}
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
      // Si ya completó el tour, decir una frase aleatoria
      const randomMsg = RANDOM_TIPS[Math.floor(Math.random() * RANDOM_TIPS.length)];
      setIdleMessage(randomMsg);
      setIsIdleChat(true);
      setIsOpen(true);
    } else {
      // Iniciar el tour desde el principio
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

  return (
    <div className="fixed z-45 bottom-20 sm:bottom-6 right-4 sm:right-6 pointer-events-none select-none font-sans">
      <style jsx>{`
        @keyframes putoFloat {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-7px); }
        }
      `}</style>

      <div className="relative flex flex-col items-end pointer-events-auto">
        {/* Bocadillo de diálogo estilo cómic con typewriter */}
        {isOpen && (
          <div
            onClick={handleBubbleClick}
            className="mb-3.5 max-w-[290px] sm:max-w-[340px] bg-neutral-950 text-white border-2 border-neutral-800 rounded-2xl p-4 shadow-2xl cursor-pointer relative animate-in fade-in zoom-in-95 duration-200"
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
              {isIdleChat ? 'Consejo de Clase' : TOUR_STEPS[currentStep].title}
            </h4>

            {/* Texto mecanografiado */}
            <p className="text-xs text-neutral-200 leading-relaxed min-h-[50px]">
              {displayedText}
              {isTyping && (
                <span className="inline-block w-1.5 h-3.5 ml-0.5 bg-amber-400 animate-pulse align-middle" />
              )}
            </p>

            {/* Acciones y navegación del tour */}
            <div className="mt-3 pt-2.5 border-t border-neutral-800 flex items-center justify-between gap-2">
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
                    <span>Ver tour completo</span>
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

            {/* Puntero triangular que conecta el bocadillo con la esfera */}
            <div className="absolute -bottom-2 right-6 w-3.5 h-3.5 bg-neutral-950 border-r-2 border-b-2 border-neutral-800 transform rotate-45" />
          </div>
        )}

        {/* Mascota esférica interactiva PUTOISAAC */}
        <div
          onClick={handleMascotClick}
          className="group relative flex flex-col items-center cursor-pointer transition-transform active:scale-90"
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

          {/* Esfera 3D brillante */}
          <div
            className="w-13 h-13 sm:w-14 sm:h-14 rounded-full bg-gradient-to-tr from-amber-600 via-orange-500 to-yellow-400 border-2 border-white/80 shadow-2xl flex items-center justify-center relative overflow-hidden transition-all duration-300 group-hover:shadow-amber-500/50 group-hover:scale-105"
            style={{
              boxShadow: '0 8px 25px rgba(245, 158, 11, 0.45), inset 0 3px 6px rgba(255,255,255,0.7)',
            }}
          >
            {/* Brillo especular superior */}
            <div className="absolute top-1 left-2 w-4 h-2.5 rounded-full bg-white/70 blur-[0.4px] transform -rotate-12 pointer-events-none" />

            {/* Cara de PUTOISAAC */}
            <div className="flex flex-col items-center justify-center relative z-10 space-y-1.5 mt-0.5">
              {/* Ojos expresivos */}
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
    </div>
  );
};
