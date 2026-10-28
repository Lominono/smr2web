'use client';

import React, { useState, useEffect, useRef } from 'react';
import { sound } from '@/lib/audio';
import { X, ArrowRight, RotateCcw, MessageSquare } from 'lucide-react';

interface TourStep {
  title: string;
  text: string;
  tabTarget?: 'chat' | 'investments' | 'schedule' | 'ranking';
}

const TOUR_STEPS: TourStep[] = [
  {
    title: '¡Eyyy!',
    text: 'Soy PUTOISAAC. Bienvenido al portal de 2º SMR. Te voy a hacer un tour rápido para que no te pierdas en clase.',
  },
  {
    title: 'El Tablón en Vivo',
    text: 'Aquí en el tablón cualquiera puede publicar avisos, apuntes o tonterías de clase. Todo se actualiza en tiempo real sin recargar la página.',
    tabTarget: 'chat',
  },
  {
    title: 'Bolsa y El Botellón',
    text: 'En Inversiones tienes la Bolsa de El Botellón y empresas de coña como Mercadona, Red Bull o Kebab Amigo. Empiezas con 1.000 monedas de saldo.',
    tabTarget: 'investments',
  },
  {
    title: 'Cotizaciones Reales',
    text: 'Ojo: los precios suben y bajan de verdad según lo que compre la gente. Si tus compañeros compran a tope, sube. Si venden, se desploma.',
    tabTarget: 'investments',
  },
  {
    title: 'Horario y Juegos',
    text: 'Arriba tienes el horario para ver qué clase toca cada día, y minijuegos como la Ruleta Rusa. ¡Dale caña y no suspendas redes!',
    tabTarget: 'schedule',
  },
];

interface PutoIsaacTourProps {
  onSelectTab?: (tab: 'chat' | 'investments' | 'schedule' | 'ranking') => void;
}

export const PutoIsaacTour: React.FC<PutoIsaacTourProps> = ({ onSelectTab }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [displayedText, setDisplayedText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [isBlinking, setIsBlinking] = useState(false);
  const [hasInteracted, setHasInteracted] = useState(false);

  const fullText = TOUR_STEPS[currentStep]?.text || '';
  const typewriterTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Parpadeo aleatorio y natural de los ojos de PUTOISAAC
  useEffect(() => {
    const blinkInterval = setInterval(() => {
      setIsBlinking(true);
      setTimeout(() => setIsBlinking(false), 160);
    }, 3500 + Math.random() * 2000);

    return () => clearInterval(blinkInterval);
  }, []);

  // Comprobar si ya se ha completado el tour anteriormente
  useEffect(() => {
    try {
      const done = localStorage.getItem('smr2_putoisaac_tour_done');
      if (!done) {
        // Iniciar automáticamente tras un breve retraso al entrar
        const timer = setTimeout(() => {
          setIsOpen(true);
        }, 1600);
        return () => clearTimeout(timer);
      }
    } catch {}
  }, []);

  // Efecto máquina de escribir (Typewriter)
  useEffect(() => {
    if (!isOpen) return;

    if (typewriterTimeoutRef.current) {
      clearTimeout(typewriterTimeoutRef.current);
    }

    setDisplayedText('');
    setIsTyping(true);

    let charIndex = 0;
    const targetText = TOUR_STEPS[currentStep].text;

    // Cambiar de pestaña automáticamente si el paso lo sugiere
    if (onSelectTab && TOUR_STEPS[currentStep].tabTarget) {
      onSelectTab(TOUR_STEPS[currentStep].tabTarget!);
    }

    const typeNextChar = () => {
      if (charIndex <= targetText.length) {
        setDisplayedText(targetText.slice(0, charIndex));
        charIndex += 1;
        // Velocidad de tecleo natural
        const speed = targetText[charIndex - 1] === '.' || targetText[charIndex - 1] === '!' ? 60 : 18;
        typewriterTimeoutRef.current = setTimeout(typeNextChar, speed);
      } else {
        setIsTyping(false);
      }
    };

    typewriterTimeoutRef.current = setTimeout(typeNextChar, 100);

    return () => {
      if (typewriterTimeoutRef.current) {
        clearTimeout(typewriterTimeoutRef.current);
      }
    };
  }, [currentStep, isOpen, onSelectTab]);

  const handleBubbleClick = () => {
    // Si aún está escribiendo, completar la frase al hacer clic
    if (isTyping) {
      if (typewriterTimeoutRef.current) {
        clearTimeout(typewriterTimeoutRef.current);
      }
      setDisplayedText(fullText);
      setIsTyping(false);
      try { sound.tap(); } catch {}
    }
  };

  const handleNext = () => {
    try { sound.tap(); } catch {}
    if (currentStep < TOUR_STEPS.length - 1) {
      setCurrentStep((prev) => prev + 1);
    } else {
      handleClose(true);
    }
  };

  const handleClose = (markCompleted: boolean = false) => {
    setIsOpen(false);
    setHasInteracted(true);
    if (markCompleted && typeof window !== 'undefined') {
      try {
        localStorage.setItem('smr2_putoisaac_tour_done', 'true');
      } catch {}
    }
  };

  const handleReopen = () => {
    try { sound.tap(); } catch {}
    setCurrentStep(0);
    setIsOpen(true);
  };

  return (
    <div className="fixed z-40 bottom-20 sm:bottom-6 right-4 sm:right-6 pointer-events-none select-none font-sans">
      <div className="relative flex flex-col items-end pointer-events-auto">
        {/* Globo de texto tipo cómic con efecto máquina de escribir */}
        {isOpen && (
          <div
            onClick={handleBubbleClick}
            className="mb-3 max-w-[280px] sm:max-w-[320px] bg-surface text-foreground border-2 border-border/90 rounded-2xl p-4 shadow-2xl cursor-pointer relative animate-in fade-in zoom-in-95 duration-200"
            style={{
              filter: 'drop-shadow(0 10px 25px rgba(0,0,0,0.3))',
            }}
          >
            {/* Cabecera del globo */}
            <div className="flex items-center justify-between pb-2 border-b border-border/60 mb-2">
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-[11px] font-bold tracking-wider text-foreground uppercase">
                  PUTOISAAC
                </span>
                <span className="text-[10px] text-foreground-subtle ml-1 font-mono">
                  {currentStep + 1}/{TOUR_STEPS.length}
                </span>
              </div>

              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleClose(true);
                }}
                className="w-5 h-5 rounded-md text-foreground-subtle hover:text-foreground hover:bg-surface-hover flex items-center justify-center transition-colors cursor-pointer"
                title="Cerrar tour"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Título y texto tipeado */}
            <h4 className="text-xs font-bold text-foreground mb-1">
              {TOUR_STEPS[currentStep].title}
            </h4>

            <p className="text-xs text-foreground-muted leading-relaxed min-h-[48px]">
              {displayedText}
              {isTyping && (
                <span className="inline-block w-1 h-3.5 ml-0.5 bg-foreground animate-pulse align-middle" />
              )}
            </p>

            {/* Barra de progreso de puntos y botón siguiente */}
            <div className="mt-3 pt-2 border-t border-border/40 flex items-center justify-between gap-2">
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
                      idx === currentStep ? 'w-4 bg-foreground' : 'w-1.5 bg-border hover:bg-foreground-muted'
                    }`}
                    aria-label={`Ir al paso ${idx + 1}`}
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
                    className="px-2 py-1 text-[11px] font-medium text-foreground-muted hover:text-foreground cursor-pointer"
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
                  className="px-3 py-1 bg-foreground text-background hover:opacity-90 active:scale-95 text-xs font-semibold rounded-lg transition-all cursor-pointer flex items-center gap-1 shadow-xs"
                >
                  <span>{currentStep === TOUR_STEPS.length - 1 ? '¡Listo!' : 'Siguiente'}</span>
                  <ArrowRight className="w-3 h-3" />
                </button>
              </div>
            </div>

            {/* Puntero triangular del globo que apunta hacia la bolita */}
            <div 
              className="absolute -bottom-2 right-6 w-3.5 h-3.5 bg-surface border-r-2 border-b-2 border-border/90 transform rotate-45"
            />
          </div>
        )}

        {/* La bolita PUTOISAAC (Mascota interactiva) */}
        <div 
          onClick={isOpen ? () => handleClose(false) : handleReopen}
          className="group relative flex flex-col items-center cursor-pointer transition-transform active:scale-90"
        >
          {/* Etiqueta flotante PUTOISAAC cuando está minimizado */}
          {!isOpen && (
            <div className="mb-1.5 px-2 py-0.5 rounded-md bg-neutral-900/90 dark:bg-neutral-100/90 text-white dark:text-neutral-900 text-[10px] font-bold tracking-tight shadow-md transition-all group-hover:scale-105 flex items-center gap-1">
              <span>PUTOISAAC</span>
              <span className="text-[10px]">💬</span>
            </div>
          )}

          {/* Cuerpo de la bolita */}
          <div 
            className="w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-gradient-to-tr from-amber-500 via-orange-400 to-yellow-300 dark:from-amber-600 dark:via-orange-500 dark:to-yellow-400 border-2 border-white/80 dark:border-white/20 shadow-xl flex items-center justify-center relative overflow-hidden transition-all duration-300 group-hover:shadow-orange-500/40 group-hover:-translate-y-1"
            style={{
              boxShadow: '0 8px 25px rgba(245, 158, 11, 0.4), inset 0 2px 4px rgba(255,255,255,0.7)',
            }}
          >
            {/* Brillo 3D en la parte superior de la esfera */}
            <div className="absolute top-1 left-2 w-4 h-2.5 rounded-full bg-white/60 blur-[0.5px] transform -rotate-12" />

            {/* Cara de PUTOISAAC: Ojos expresivos y boca */}
            <div className="flex flex-col items-center justify-center relative z-10 space-y-1 mt-0.5">
              {/* Ojos */}
              <div className="flex items-center gap-2">
                {/* Ojo izquierdo */}
                <div 
                  className={`w-2 h-2.5 rounded-full bg-neutral-950 transition-all duration-150 flex items-center justify-center relative ${
                    isBlinking ? 'h-0.5 mt-2 bg-neutral-900' : ''
                  }`}
                >
                  {!isBlinking && (
                    <div className="w-0.5 h-0.5 rounded-full bg-white absolute top-0.5 left-0.5" />
                  )}
                </div>

                {/* Ojo derecho */}
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

              {/* Sonrisa traviesa */}
              <div className="w-2.5 h-1 border-b-2 border-neutral-950 rounded-full" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
