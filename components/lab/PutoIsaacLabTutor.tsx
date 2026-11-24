'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  X,
  Send,
  Sparkles,
  Terminal,
  Loader2,
  HelpCircle,
  Minimize2,
  Maximize2,
  Check,
} from 'lucide-react';
import { sound } from '@/lib/audio';

interface PutoIsaacLabTutorProps {
  currentLevelId: number;
  levelTitle: string;
  failedAttempts: number;
  activeTab: 'challenge' | 'lesson' | 'hints' | 'solution';
  isDevToolsOpen: boolean;
  isTerminalOpen: boolean;
  recentTerminalCmds: string[];
  onExecuteCommand: (cmd: string) => void;
  isLevelCompleted: boolean;
}

export const PutoIsaacLabTutor: React.FC<PutoIsaacLabTutorProps> = ({
  currentLevelId,
  levelTitle,
  failedAttempts,
  activeTab,
  isDevToolsOpen,
  isTerminalOpen,
  recentTerminalCmds,
  onExecuteCommand,
  isLevelCompleted,
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const [isMinimized, setIsMinimized] = useState(true);
  const [displayedText, setDisplayedText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [isTalking, setIsTalking] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [userQuery, setUserQuery] = useState('');
  const [pupilOffset, setPupilOffset] = useState({ x: 0, y: 0 });
  const [isBlinking, setIsBlinking] = useState(false);
  const [talkPhoneme, setTalkPhoneme] = useState(0);
  const [extractedCommand, setExtractedCommand] = useState<string | null>(null);

  // Control de estancamiento
  const [secondsOnLevel, setSecondsOnLevel] = useState(0);
  const hasTriggeredRef = useRef<Record<number, boolean>>({});
  const typewriterTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const mascotRef = useRef<HTMLDivElement>(null);

  // Contador de tiempo en el nivel activo
  useEffect(() => {
    setSecondsOnLevel(0);
    const interval = setInterval(() => {
      setSecondsOnLevel((s) => s + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [currentLevelId]);

  // Seguimiento del cursor con los ojos de Isaac
  useEffect(() => {
    let animFrame: number;
    const handleMouseMove = (e: MouseEvent) => {
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
        setPupilOffset({
          x: Math.cos(angle) * dist * 2.5,
          y: Math.sin(angle) * dist * 2.5,
        });
      });
    };

    window.addEventListener('mousemove', handleMouseMove, { passive: true });
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      cancelAnimationFrame(animFrame);
    };
  }, []);

  // Parpadeo orgánico
  useEffect(() => {
    let timeout: NodeJS.Timeout;
    const loopBlink = () => {
      timeout = setTimeout(() => {
        setIsBlinking(true);
        setTimeout(() => {
          setIsBlinking(false);
          loopBlink();
        }, 150);
      }, 3500 + Math.random() * 3000);
    };
    loopBlink();
    return () => clearTimeout(timeout);
  }, []);

  // Animación de fonemas al hablar
  useEffect(() => {
    if (!isTalking) {
      setTalkPhoneme(0);
      return;
    }
    const interval = setInterval(() => {
      setTalkPhoneme((p) => (p + 1) % 4);
    }, 100);
    return () => clearInterval(interval);
  }, [isTalking]);

  // Efecto máquina de escribir con chirping procedural
  const startTypewriter = useCallback((fullText: string) => {
    if (typewriterTimeoutRef.current) clearTimeout(typewriterTimeoutRef.current);

    // Extraer comando [CMD:...]
    const cmdMatch = fullText.match(/\[CMD:([^\]]+)\]/i);
    if (cmdMatch) {
      setExtractedCommand(cmdMatch[1].trim());
    } else {
      setExtractedCommand(null);
    }

    const cleanText = fullText.replace(/\[CMD:[^\]]+\]/gi, '').trim();

    setDisplayedText('');
    setIsTyping(true);
    setIsTalking(true);

    let idx = 0;
    const typeNext = () => {
      if (idx <= cleanText.length) {
        setDisplayedText(cleanText.slice(0, idx));
        const char = cleanText[idx - 1];
        if (char && char.trim() !== '' && idx % 2 === 0) {
          try {
            sound.isaacChirp(char, idx);
          } catch {}
        }
        idx++;
        const delay = char === '.' || char === '!' || char === '?' ? 60 : 20;
        typewriterTimeoutRef.current = setTimeout(typeNext, delay);
      } else {
        setDisplayedText(cleanText);
        setIsTyping(false);
        setIsTalking(false);
      }
    };
    typewriterTimeoutRef.current = setTimeout(typeNext, 50);
  }, []);

  // Solicitar pista a la IA (OpenCode / Isaac API)
  const askIsaacForHint = useCallback(
    async (promptCustom?: string) => {
      setIsLoading(true);
      try {
        const res = await fetch('/api/ai/isaac', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            prompt:
              promptCustom ||
              `Estoy atascado en el Nivel ${currentLevelId} (${levelTitle}). Llevo ${failedAttempts} fallos y ${secondsOnLevel} segundos intentándolo. Dame una pista sutil.`,
            mode: 'lab',
            context: {
              isLab: true,
              levelId: currentLevelId,
              failedAttempts,
              timeSpentSec: secondsOnLevel,
              activeTab,
              activeDevTab: isDevToolsOpen ? 'DevTools Abierto' : 'Cerrado',
              recentCmds: recentTerminalCmds,
            },
          }),
        });

        if (res.ok) {
          const data = await res.json();
          if (data.reply) {
            startTypewriter(data.reply);
          }
        } else {
          startTypewriter(
            '¡Epa socio! Parece que se me han cruzado los cables con el servidor. Revisa el código del reto o mira la pestaña de pistas mientras me recupero.'
          );
        }
      } catch {
        startTypewriter(
          '¡Epa socio! Se me ha ido la conexión con el servidor. Pero no te rindas: inspecciona el DOM o prueba comandos con curl en la terminal.'
        );
      } finally {
        setIsLoading(false);
      }
    },
    [
      currentLevelId,
      levelTitle,
      failedAttempts,
      secondsOnLevel,
      activeTab,
      isDevToolsOpen,
      recentTerminalCmds,
      startTypewriter,
    ]
  );

  // DETECCIÓN DE ESTANCAMIENTO ("APARECE DE REPENTE SOLO CUANDO ESTÁN MUY ESTANCADOS")
  useEffect(() => {
    if (isLevelCompleted) return;

    // Condición 1: 2 o más intentos de bandera fallidos
    const isStuckByFailures = failedAttempts >= 2;
    // Condición 2: Más de 75 segundos en el nivel sin resolverlo
    const isStuckByTime = secondsOnLevel >= 75;

    const alreadyTriggeredForLevel = hasTriggeredRef.current[currentLevelId];

    if ((isStuckByFailures || isStuckByTime) && !alreadyTriggeredForLevel) {
      hasTriggeredRef.current[currentLevelId] = true;
      setIsVisible(true);
      setIsMinimized(false);

      try {
        sound.whoosh();
      } catch {}

      askIsaacForHint();
    }
  }, [
    failedAttempts,
    secondsOnLevel,
    currentLevelId,
    isLevelCompleted,
    askIsaacForHint,
  ]);

  const handleManualOpen = () => {
    setIsVisible(true);
    setIsMinimized(false);
    if (!displayedText) {
      askIsaacForHint();
    }
  };

  const handleDismiss = () => {
    setIsMinimized(true);
  };

  const handleSubmitQuestion = (e: React.FormEvent) => {
    e.preventDefault();
    if (!userQuery.trim() || isLoading || isTyping) return;
    const query = userQuery.trim();
    setUserQuery('');
    askIsaacForHint(query);
  };

  if (isLevelCompleted && isMinimized) return null;

  return (
    <div className="fixed bottom-4 right-4 z-40 select-none font-sans">
      {/* Botón flotante minimizado de PutoIsaac */}
      {isMinimized && (
        <button
          onClick={handleManualOpen}
          type="button"
          className="group flex items-center gap-2.5 px-3.5 py-2 rounded-full bg-gradient-to-r from-amber-500 to-orange-500 text-white font-mono text-xs font-bold shadow-lg hover:shadow-orange-500/30 hover:scale-105 active:scale-95 transition-all cursor-pointer border border-amber-300/40"
          title="Pedir ayuda a PUTOISAAC (IA Tutor de 2º SMR)"
        >
          {/* Pequeña esfera animada */}
          <span className="relative flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-orange-600 shadow-inner">
            <span className="h-1.5 w-1.5 rounded-full bg-amber-200" />
            <span className="absolute -top-0.5 -right-0.5 flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-300 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-400" />
            </span>
          </span>
          <span className="tracking-tight">PUTOISAAC</span>
          <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-black/20 text-amber-100 font-normal hidden sm:inline">
            Tutor IA
          </span>
        </button>
      )}

      {/* Tarjeta emergente interactiva de PutoIsaac ("Aparece de repente") */}
      {!isMinimized && (
        <div className="w-[22rem] sm:w-[26rem] max-w-[calc(100vw-2rem)] rounded-2xl border border-amber-400/40 dark:border-amber-500/30 bg-white/95 dark:bg-neutral-900/95 backdrop-blur-xl shadow-2xl p-4 text-neutral-900 dark:text-neutral-100 transition-all animate-in fade-in slide-in-from-bottom-4 duration-200 flex flex-col gap-3 font-sans">
          
          {/* Cabecera del bocadillo de Isaac */}
          <div className="flex items-center justify-between border-b border-neutral-200 dark:border-neutral-800 pb-2.5">
            <div className="flex items-center gap-2.5">
              {/* Avatar procedimental de PutoIsaac */}
              <div
                ref={mascotRef}
                className="relative w-8 h-8 rounded-full bg-gradient-to-tr from-orange-600 via-amber-500 to-amber-400 shadow-md flex items-center justify-center overflow-hidden shrink-0 border border-amber-300/60"
              >
                {/* Ojos expresivos */}
                <div className="absolute inset-x-1.5 top-2 flex justify-between">
                  {/* Ojo izquierdo */}
                  <div
                    className={`w-1.5 h-2 rounded-full bg-neutral-950 transition-all flex items-center justify-center overflow-hidden ${
                      isBlinking ? 'scale-y-[0.1]' : 'scale-y-100'
                    }`}
                  >
                    <div
                      className="w-0.5 h-0.5 rounded-full bg-white transition-transform"
                      style={{
                        transform: `translate(${pupilOffset.x}px, ${pupilOffset.y}px)`,
                      }}
                    />
                  </div>
                  {/* Ojo derecho */}
                  <div
                    className={`w-1.5 h-2 rounded-full bg-neutral-950 transition-all flex items-center justify-center overflow-hidden ${
                      isBlinking ? 'scale-y-[0.1]' : 'scale-y-100'
                    }`}
                  >
                    <div
                      className="w-0.5 h-0.5 rounded-full bg-white transition-transform"
                      style={{
                        transform: `translate(${pupilOffset.x}px, ${pupilOffset.y}px)`,
                      }}
                    />
                  </div>
                </div>

                {/* Boca animada */}
                <div
                  className={`absolute bottom-1.5 w-2 bg-neutral-950 rounded-full transition-all ${
                    isTalking
                      ? talkPhoneme === 0
                        ? 'h-1 w-2 rounded-full'
                        : talkPhoneme === 1
                        ? 'h-1.5 w-1.5 rounded-full'
                        : talkPhoneme === 2
                        ? 'h-0.5 w-2.5'
                        : 'h-1.5 w-2 rounded-full'
                      : 'h-0.5 w-1.5'
                  }`}
                />
              </div>

              <div>
                <div className="flex items-center gap-1.5">
                  <span className="font-mono text-xs font-bold text-orange-600 dark:text-amber-400">
                    PUTOISAAC
                  </span>
                  <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-amber-500/10 text-amber-700 dark:text-amber-300 font-semibold">
                    Tutor SMR2
                  </span>
                </div>
                <span className="text-[10px] text-neutral-500 block">
                  Te está viendo atascado en el Nivel {currentLevelId}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <button
                onClick={handleDismiss}
                type="button"
                className="p-1 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 transition-colors cursor-pointer"
                title="Minimizar a Isaac"
              >
                <Minimize2 className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={handleDismiss}
                type="button"
                className="p-1 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 transition-colors cursor-pointer"
                title="Cerrar pista"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Mensaje de Isaac con efecto mecanografiado */}
          <div className="text-xs sm:text-[13px] leading-relaxed text-neutral-800 dark:text-neutral-200 font-sans min-h-[3.5rem] bg-neutral-50 dark:bg-neutral-950/60 p-3 rounded-xl border border-neutral-200 dark:border-neutral-800/80">
            {isLoading ? (
              <div className="flex items-center gap-2 text-neutral-500 text-xs py-2 font-mono">
                <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-500" />
                <span>Mirando lo que estás haciendo en pantalla...</span>
              </div>
            ) : (
              <div className="space-y-2 select-text">
                <p>{displayedText || '¡Epa socio! Aquí estoy por si te atascas.'}</p>
                {isTyping && (
                  <span className="inline-block w-1.5 h-3 bg-amber-500 animate-pulse ml-0.5 align-middle" />
                )}
              </div>
            )}
          </div>

          {/* Botón de acción rápida si Isaac sugiere un comando */}
          {extractedCommand && (
            <div className="flex items-center justify-between gap-2 p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-xs font-mono">
              <div className="flex items-center gap-1.5 truncate text-emerald-700 dark:text-emerald-400">
                <Terminal className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate">&gt; {extractedCommand}</span>
              </div>
              <button
                onClick={() => onExecuteCommand(extractedCommand)}
                type="button"
                className="px-2.5 py-1 rounded bg-emerald-600 hover:bg-emerald-500 text-white font-mono text-[11px] font-bold cursor-pointer transition-colors shrink-0 shadow-sm"
              >
                Ejecutar en terminal
              </button>
            </div>
          )}

          {/* Pie interactivo: Pregunta directa a Isaac */}
          <form onSubmit={handleSubmitQuestion} className="flex items-center gap-1.5 pt-0.5">
            <input
              type="text"
              value={userQuery}
              onChange={(e) => setUserQuery(e.target.value)}
              placeholder="¿Qué no entiendes? Pregúntale a Isaac..."
              disabled={isLoading || isTyping}
              className="flex-1 px-3 py-1.5 rounded-xl bg-neutral-100 dark:bg-neutral-950 border border-neutral-300 dark:border-neutral-800 text-xs font-sans text-neutral-900 dark:text-neutral-100 focus:outline-none focus:border-amber-500"
            />
            <button
              type="submit"
              disabled={!userQuery.trim() || isLoading || isTyping}
              className="p-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-white hover:opacity-90 disabled:opacity-40 transition-opacity cursor-pointer shadow-sm"
              title="Preguntar a Isaac"
            >
              <Send className="w-3.5 h-3.5" />
            </button>
          </form>

          <div className="flex items-center justify-between text-[10px] text-neutral-400 font-mono pt-0.5">
            <span>Isaac no te dará la flag directamente (regla de oro)</span>
            <button
              type="button"
              onClick={() => askIsaacForHint()}
              disabled={isLoading || isTyping}
              className="text-amber-600 dark:text-amber-400 hover:underline cursor-pointer"
            >
              Pedir otra pista
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
