'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import Image from 'next/image';
import { ArrowRight, Sparkles, CheckCircle2, Volume2, VolumeX, RotateCcw } from 'lucide-react';
import confetti from 'canvas-confetti';
import { HaloBadge } from '@/components/ui/HaloBadge';
import { sound } from '@/lib/audio';

interface LaunchWelcomeSequenceProps {
  onComplete: () => void;
  speedMultiplier?: number; // 1 = normal, 0.4 = slowmo for design debug, 2 = fast
  soundEnabled?: boolean;
}

interface MessageBubble {
  id: number;
  sender: string;
  role: string;
  avatar: string;
  badgeVariant: 'cult' | 'default' | 'amber';
  text: string;
  highlight?: string;
  delayMs: number;
}

const MESSAGES: MessageBubble[] = [
  {
    id: 1,
    sender: 'JuanFe & David',
    role: 'Desarrolladores · 2º SMR',
    avatar: '/logo.png',
    badgeVariant: 'cult',
    text: '¡Por fin ha llegado el momento! 🎉 La cuenta atrás ha llegado a cero y el portal oficial ya está disponible.',
    highlight: '¡Por fin ha llegado el momento!',
    delayMs: 600,
  },
  {
    id: 2,
    sender: 'JuanFe Ospina',
    role: '2º SMR',
    avatar: '/logo.png',
    badgeVariant: 'default',
    text: 'Estamos súper felices y emocionados de que por fin podáis entrar y usar esta web. Le hemos dedicado muchísimas horas para que toda la clase tenga la mejor experiencia posible.',
    highlight: 'súper felices y emocionados',
    delayMs: 2200,
  },
  {
    id: 3,
    sender: 'David',
    role: '2º SMR',
    avatar: '/logo.png',
    badgeVariant: 'amber',
    text: 'Aquí tenéis todo centralizado: horarios de clase, avisos urgentes, calendario de entregas, chat en directo, apuestas de botellón y la ruleta rusa para los descansos.',
    highlight: 'todo centralizado',
    delayMs: 4400,
  },
  {
    id: 4,
    sender: 'Portal 2º SMR',
    role: 'Sistema Oficial',
    avatar: '/logo.png',
    badgeVariant: 'cult',
    text: 'Regístrate con tu usuario o inicia sesión para entrar al aula digital. ¡Esperamos que os sea de gran ayuda este curso! 🚀',
    highlight: '¡Esperamos que os sea de gran ayuda este curso!',
    delayMs: 6800,
  },
];

export const LaunchWelcomeSequence: React.FC<LaunchWelcomeSequenceProps> = ({
  onComplete,
  speedMultiplier = 1,
  soundEnabled = true,
}) => {
  const [visibleBubbles, setVisibleBubbles] = useState<number[]>([]);
  const [currentlyTyping, setCurrentlyTyping] = useState<string | null>('JuanFe & David');
  const [isExiting, setIsExiting] = useState(false);
  const [isAudioMuted, setIsAudioMuted] = useState(!soundEnabled);
  const [allFinished, setAllFinished] = useState(false);
  const [autoAdvanceSeconds, setAutoAdvanceSeconds] = useState<number | null>(null);

  const timersRef = useRef<NodeJS.Timeout[]>([]);
  const chatScrollRef = useRef<HTMLDivElement>(null);

  // Confetti celebration blast
  const fireCelebrationConfetti = useCallback(() => {
    try {
      const count = 200;
      const defaults = {
        origin: { y: 0.7 },
        zIndex: 10050,
      };

      const fire = (particleRatio: number, opts: confetti.Options) => {
        confetti({
          ...defaults,
          ...opts,
          particleCount: Math.floor(count * particleRatio),
        });
      };

      fire(0.25, {
        spread: 26,
        startVelocity: 55,
        colors: ['#10b981', '#06b6d4', '#ff0080'],
      });
      fire(0.2, {
        spread: 60,
        colors: ['#7928ca', '#00d4ff', '#f59e0b'],
      });
      fire(0.35, {
        spread: 100,
        decay: 0.91,
        scalar: 0.8,
        colors: ['#10b981', '#ffffff', '#fbbf24'],
      });
      fire(0.1, {
        spread: 120,
        startVelocity: 25,
        decay: 0.92,
        scalar: 1.2,
      });
      fire(0.1, {
        spread: 120,
        startVelocity: 45,
      });
    } catch {}
  }, []);

  const clearAllTimers = () => {
    timersRef.current.forEach((t) => clearTimeout(t));
    timersRef.current = [];
  };

  const startSequence = useCallback(() => {
    clearAllTimers();
    setVisibleBubbles([]);
    setAllFinished(false);
    setAutoAdvanceSeconds(null);
    setCurrentlyTyping('JuanFe & David');

    // Initial fanfare
    fireCelebrationConfetti();
    if (!isAudioMuted) {
      try {
        sound.windowsStartup();
      } catch {}
    }

    const pace = 1 / Math.max(0.2, speedMultiplier);

    MESSAGES.forEach((msg, idx) => {
      // 1. Start typing indicator slightly before message reveals
      const typingTime = Math.max(0, msg.delayMs * pace - 700 * pace);
      const typingTimer = setTimeout(() => {
        setCurrentlyTyping(msg.sender);
        if (chatScrollRef.current) {
          chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
        }
      }, typingTime);
      timersRef.current.push(typingTimer);

      // 2. Reveal bubble
      const bubbleTimer = setTimeout(() => {
        setVisibleBubbles((prev) => [...prev, msg.id]);
        if (!isAudioMuted) {
          try {
            sound.toastClink();
          } catch {}
        }
        if (idx === MESSAGES.length - 1) {
          setCurrentlyTyping(null);
          setAllFinished(true);
          // Set automatic countdown to transition after 10s if user doesn't click
          setAutoAdvanceSeconds(10);
        }
        if (chatScrollRef.current) {
          chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
        }
      }, msg.delayMs * pace);
      timersRef.current.push(bubbleTimer);
    });
  }, [fireCelebrationConfetti, isAudioMuted, speedMultiplier]);

  useEffect(() => {
    startSequence();
    return () => clearAllTimers();
  }, [startSequence]);

  // Handle auto-advance countdown after all bubbles appear
  useEffect(() => {
    if (autoAdvanceSeconds === null || autoAdvanceSeconds <= 0) {
      if (autoAdvanceSeconds === 0) {
        handleProceed();
      }
      return;
    }

    const timer = setTimeout(() => {
      setAutoAdvanceSeconds((prev) => (prev !== null ? prev - 1 : null));
    }, 1000);

    return () => clearTimeout(timer);
  }, [autoAdvanceSeconds]);

  // Execute the "fade bajo" transition into AuthGate
  const handleProceed = () => {
    if (isExiting) return;
    clearAllTimers();
    if (!isAudioMuted) {
      try {
        sound.tap();
      } catch {}
    }
    setIsExiting(true);

    // Wait for the downward exit animation (fade bajo) to finish before unmounting
    setTimeout(() => {
      onComplete();
    }, 650);
  };

  const handleReplay = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!isAudioMuted) {
      try {
        sound.tap();
      } catch {}
    }
    startSequence();
  };

  return (
    <div
      className={`fixed inset-0 z-[9999] flex flex-col justify-between items-center bg-[#09090b] text-neutral-100 p-4 sm:p-6 md:p-10 select-none overflow-hidden transition-all duration-700 ${
        isExiting ? 'animate-fade-down-exit pointer-events-none' : 'animate-in fade-in duration-500'
      }`}
    >
      {/* Radiant Background Ambient Spotlights */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {/* Top-left aura */}
        <div
          className="absolute -top-32 -left-32 w-96 h-96 rounded-full blur-[120px] opacity-25"
          style={{ background: 'radial-gradient(circle, #ff0080, #7928ca, transparent)' }}
        />
        {/* Center ambient glow */}
        <div
          className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[350px] rounded-full blur-[140px] opacity-20"
          style={{ background: 'radial-gradient(ellipse, #10b981, #06b6d4, transparent)' }}
        />
        {/* Bottom-right aura */}
        <div
          className="absolute -bottom-32 -right-32 w-96 h-96 rounded-full blur-[120px] opacity-20"
          style={{ background: 'radial-gradient(circle, #00d4ff, #0070f3, transparent)' }}
        />
      </div>

      {/* 1. Header with Cult UI Halo Badge */}
      <header className="w-full max-w-2xl mx-auto flex items-center justify-between relative z-10 pt-2 pb-3 shrink-0">
        <div className="flex items-center gap-3">
          <div className="relative w-10 h-10 rounded-xl bg-neutral-900 border border-neutral-800 p-2 flex items-center justify-center shadow-lg">
            <Image
              src="/logo.png"
              alt="SMR2 Logo"
              width={28}
              height={28}
              className="object-contain"
              priority
            />
          </div>
          <div>
            <div className="text-sm font-semibold tracking-tight text-white flex items-center gap-1.5">
              <span>2º SMR</span>
              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 font-mono border border-emerald-500/30">
                v2.0
              </span>
            </div>
            <div className="text-[10px] text-neutral-400 font-mono">
              Portal Oficial de la Clase
            </div>
          </div>
        </div>

        {/* Action icons (Sound, Replay, Skip) */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setIsAudioMuted(!isAudioMuted)}
            className="p-2 rounded-lg bg-neutral-900/80 hover:bg-neutral-800 border border-neutral-800 text-neutral-400 hover:text-white transition-colors cursor-pointer"
            title={isAudioMuted ? 'Activar sonido' : 'Silenciar sonido'}
          >
            {isAudioMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
          </button>

          <button
            type="button"
            onClick={handleReplay}
            className="p-2 rounded-lg bg-neutral-900/80 hover:bg-neutral-800 border border-neutral-800 text-neutral-400 hover:text-white transition-colors cursor-pointer"
            title="Reiniciar animación"
          >
            <RotateCcw className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={handleProceed}
            className="px-3 py-1.5 rounded-lg bg-neutral-900/80 hover:bg-neutral-800 border border-neutral-800 text-xs font-mono text-neutral-400 hover:text-white transition-colors cursor-pointer"
          >
            Saltar
          </button>
        </div>
      </header>

      {/* 2. Main Conversational Body */}
      <main className="w-full max-w-2xl mx-auto flex-1 flex flex-col justify-center items-center relative z-10 py-2 sm:py-4 overflow-hidden min-h-0">
        {/* Top Halo Badge announcement (Cult UI inspired) */}
        <div className="text-center mb-4 sm:mb-6 shrink-0">
          <div className="mb-2">
            <HaloBadge variant="cult" size="lg" live>
              <Sparkles className="w-3.5 h-3.5 text-pink-300 animate-spin-slow" />
              <span>SMR2 · OFICIALMENTE EN LÍNEA</span>
            </HaloBadge>
          </div>
          <h2 className="text-xl sm:text-2xl md:text-3xl font-bold tracking-tight text-white mt-2">
            ¡Bienvenidos a la nueva web de clase!
          </h2>
          <p className="text-xs sm:text-sm text-neutral-400 mt-1 max-w-md mx-auto">
            La cuenta regresiva ha concluido. El portal ya está operativo para todos.
          </p>
        </div>

        {/* Conversational Dialogue Bubbles Container */}
        <div
          ref={chatScrollRef}
          className="w-full max-w-xl flex-1 overflow-y-auto space-y-3.5 px-2 py-2 scrollbar-none"
        >
          {MESSAGES.map((msg) => {
            const isVisible = visibleBubbles.includes(msg.id);
            if (!isVisible) return null;

            return (
              <div
                key={msg.id}
                className="flex items-start gap-3 animate-bubble-pop"
              >
                {/* Avatar */}
                <div className="relative w-9 h-9 rounded-full bg-neutral-900 border border-neutral-800 p-1.5 shrink-0 shadow-md">
                  <Image
                    src={msg.avatar}
                    alt={msg.sender}
                    width={24}
                    height={24}
                    className="w-full h-full object-contain"
                  />
                  <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-emerald-500 border-2 border-neutral-950" />
                </div>

                {/* Speech Bubble Card */}
                <div className="flex-1 max-w-lg">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-semibold text-neutral-200">
                      {msg.sender}
                    </span>
                    <span className="text-[10px] text-neutral-500 font-mono">
                      {msg.role}
                    </span>
                    <CheckCircle2 className="w-3 h-3 text-cyan-400 shrink-0" />
                  </div>

                  <div className="relative p-3.5 sm:p-4 rounded-2xl rounded-tl-sm bg-neutral-900/85 backdrop-blur-md border border-neutral-800 text-xs sm:text-sm text-neutral-200 leading-relaxed shadow-lg shadow-black/30">
                    <p>{msg.text}</p>
                  </div>
                </div>
              </div>
            );
          })}

          {/* Typing Indicator */}
          {currentlyTyping && (
            <div className="flex items-center gap-2.5 px-3 py-2 text-xs text-neutral-500 font-mono animate-in fade-in">
              <div className="flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-neutral-400 animate-[typingBounce_1.2s_infinite_ease-in-out]" />
                <span className="w-1.5 h-1.5 rounded-full bg-neutral-400 animate-[typingBounce_1.2s_infinite_ease-in-out_0.2s]" />
                <span className="w-1.5 h-1.5 rounded-full bg-neutral-400 animate-[typingBounce_1.2s_infinite_ease-in-out_0.4s]" />
              </div>
              <span className="text-[11px] text-neutral-400">
                {currentlyTyping} está redactando...
              </span>
            </div>
          )}
        </div>
      </main>

      {/* 3. Footer Action: Halo Button to Transition with "Fade Bajo" */}
      <footer className="w-full max-w-2xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 pb-1 border-t border-neutral-900/80 relative z-10 shrink-0 select-none">
        <div className="text-[11px] text-neutral-500 font-mono text-center sm:text-left">
          {allFinished && autoAdvanceSeconds !== null && autoAdvanceSeconds > 0 ? (
            <span>
              Avanzando al acceso en{' '}
              <strong className="text-emerald-400">{autoAdvanceSeconds}s</strong>...
            </span>
          ) : (
            <span>Desarrollado para 2º SMR · 2026</span>
          )}
        </div>

        {/* Cult UI Halo Button Call-To-Action */}
        <div className="relative group">
          {/* Ambient button glow */}
          <div className="absolute -inset-1 rounded-xl bg-gradient-to-r from-emerald-500 via-cyan-500 to-pink-500 opacity-60 blur-md group-hover:opacity-90 transition-opacity duration-300" />

          {/* Button Outer Halo Rim */}
          <div className="relative p-[1px] rounded-xl overflow-hidden">
            <span
              className="absolute inset-[-200%] animate-[haloRotate_3s_linear_infinite]"
              style={{
                background:
                  'conic-gradient(from 0deg at 50% 50%, #0000 0%, #10b981 30%, #06b6d4 60%, #ff0080 85%, #0000 100%)',
              }}
            />

            <button
              type="button"
              onClick={handleProceed}
              className="relative z-10 px-5 py-2.5 rounded-xl bg-neutral-950/90 backdrop-blur-xl border border-white/15 text-white font-medium text-xs sm:text-sm tracking-tight flex items-center gap-2 shadow-2xl hover:bg-neutral-900/90 active:scale-[0.98] transition-all cursor-pointer"
            >
              <span>Acceder al Portal (Login / Registro)</span>
              <ArrowRight className="w-4 h-4 text-emerald-400 group-hover:translate-x-1 transition-transform" />
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
};
