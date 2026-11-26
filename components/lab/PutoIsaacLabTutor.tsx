'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  X,
  Send,
  Terminal,
  Code,
  Loader2,
  Sparkles,
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
  onOpenDevTools?: () => void;
  onOpenTerminal?: () => void;
  onHighlightTarget?: (target: 'devtools' | 'terminal' | null) => void;
  isLevelCompleted: boolean;
}

// Pistas rápidas y sarcásticas locales para no gastar tokens innecesariamente
const SARCASMIC_QUIPS_PER_LEVEL: Record<number, { text: string; target: 'devtools' | 'terminal'; cmd?: string }> = {
  1: {
    text: 'A ver inútil, los desarrolladores dejaron comentarios en el HTML y un robots.txt. Abre Inspeccionar (F12) o tira de curl.',
    target: 'devtools',
    cmd: 'curl /lab/robots.txt',
  },
  2: {
    text: '¿En serio te vas a quedar mirando un botón bloqueado con disabled? Cámbialo en el inspector o pon el precio a 0 en el DOM.',
    target: 'devtools',
  },
  3: {
    text: 'Esa cookie lab_session huele a Base64 desde el pasillo. Abre la terminal, decodifícala y ponle role admin.',
    target: 'terminal',
    cmd: 'base64 -d "eyJ1c2VyIjoic3R1ZGVudCIsInJvbGUiOiJndWVzdCJ9"',
  },
  4: {
    text: '¿No sabes lo que es un IDOR? Tu factura es la 1042... cambia el número en la terminal con curl hasta ver la de dirección.',
    target: 'terminal',
    cmd: 'curl /api/mock/invoices?id=1001',
  },
  5: {
    text: 'Pon una comilla simple en el usuario para romper el SQL. O escribe sqlmap en la terminal si quieres ir de hacker pro.',
    target: 'terminal',
    cmd: 'sqlmap -u "http://localhost/login" --batch',
  },
  6: {
    text: 'Esa contraseña está en el diccionario sí o sí. Usa hydra en la terminal o lee el archivo con cat.',
    target: 'terminal',
    cmd: 'hydra -l admin -P /opt/wordlists/passwords.txt',
  },
  7: {
    text: 'Primero saca el token de Elena Ramos con la API de personal por curl, y luego manda la cabecera al mainframe.',
    target: 'terminal',
    cmd: 'curl /api/mock/staff?dept=security',
  },
};

const RANDOM_IDLE_SARCASTIC = [
  '¿Qué miras? ¿Acaso tengo monos en la cara? Ponte a hackear.',
  '¿Te vas a quedar mirándome o vas a picar algo en la terminal?',
  'Venga espabila, que el título de 2º SMR no te lo van a regalar.',
  'A ver si le damos al F12 de una vez y dejamos de lloriquear.',
  'Menos clics en mi bolita y más auditoría de seguridad.',
];

export const PutoIsaacLabTutor: React.FC<PutoIsaacLabTutorProps> = ({
  currentLevelId,
  levelTitle,
  failedAttempts,
  activeTab,
  isDevToolsOpen,
  isTerminalOpen,
  recentTerminalCmds,
  onExecuteCommand,
  onOpenDevTools,
  onOpenTerminal,
  onHighlightTarget,
  isLevelCompleted,
}) => {
  const [isBubbleOpen, setIsBubbleOpen] = useState(false);
  const [displayedText, setDisplayedText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [isTalking, setIsTalking] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSquishing, setIsSquishing] = useState(false);
  const [userQuery, setUserQuery] = useState('');
  const [pupilOffset, setPupilOffset] = useState({ x: 0, y: 0 });
  const [isBlinking, setIsBlinking] = useState(false);
  const [talkPhoneme, setTalkPhoneme] = useState(0);
  const [suggestedTarget, setSuggestedTarget] = useState<'devtools' | 'terminal' | null>(null);
  const [suggestedCmd, setSuggestedCmd] = useState<string | null>(null);

  // Control de estancamiento
  const [secondsOnLevel, setSecondsOnLevel] = useState(0);
  const hasTriggeredRef = useRef<Record<number, boolean>>({});
  const typewriterTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const mascotRef = useRef<HTMLDivElement>(null);

  // Contador de tiempo en el nivel
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
          x: Math.cos(angle) * dist * 2.2,
          y: Math.sin(angle) * dist * 2.2,
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
        }, 140);
      }, 3000 + Math.random() * 3500);
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
    }, 90);
    return () => clearInterval(interval);
  }, [isTalking]);

  // Efecto máquina de escribir con chirping procedural
  const startTypewriter = useCallback((fullText: string) => {
    if (typewriterTimeoutRef.current) clearTimeout(typewriterTimeoutRef.current);

    setDisplayedText('');
    setIsTyping(true);
    setIsTalking(true);

    let idx = 0;
    const typeNext = () => {
      if (idx <= fullText.length) {
        setDisplayedText(fullText.slice(0, idx));
        const char = fullText[idx - 1];
        if (char && char.trim() !== '' && idx % 2 === 0) {
          try {
            sound.isaacChirp(char, idx);
          } catch {}
        }
        idx++;
        const delay = char === '.' || char === '!' || char === '?' ? 50 : 18;
        typewriterTimeoutRef.current = setTimeout(typeNext, delay);
      } else {
        setDisplayedText(fullText);
        setIsTyping(false);
        setIsTalking(false);
      }
    };

    typewriterTimeoutRef.current = setTimeout(typeNext, 40);
  }, []);

  // Disparar pista sarcástica
  const deliverHint = useCallback(
    (customText?: string, target?: 'devtools' | 'terminal' | null, cmd?: string) => {
      setIsBubbleOpen(true);
      const textToSay = customText || SARCASMIC_QUIPS_PER_LEVEL[currentLevelId]?.text || 'A ver socio, inspecciona bien la pantalla.';
      const chosenTarget = target !== undefined ? target : SARCASMIC_QUIPS_PER_LEVEL[currentLevelId]?.target || null;
      const chosenCmd = cmd !== undefined ? cmd : SARCASMIC_QUIPS_PER_LEVEL[currentLevelId]?.cmd || null;

      setSuggestedTarget(chosenTarget);
      setSuggestedCmd(chosenCmd);

      if (chosenTarget && onHighlightTarget) {
        onHighlightTarget(chosenTarget);
      }

      startTypewriter(textToSay);
    },
    [currentLevelId, onHighlightTarget, startTypewriter]
  );

  // Solicitar a la IA en caso de duda personalizada
  const askIsaacAI = async (promptQuery: string) => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/ai/isaac', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: promptQuery,
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
        const reply = data.reply || 'Venga socio, no te rindas tan rápido.';
        
        // Detectar si sugiere DevTools o terminal
        let target: 'devtools' | 'terminal' | null = null;
        if (/f12|inspeccion|devtools|consola|dom|cookie/i.test(reply)) {
          target = 'devtools';
        } else if (/terminal|curl|nmap|gobuster|hydra|sqlmap/i.test(reply)) {
          target = 'terminal';
        }

        deliverHint(reply, target);
      } else {
        deliverHint('¡Epa! No me satures los tokens. Mira lo que tienes en pantalla.');
      }
    } catch {
      deliverHint('Se ha caído la conexión. Espabila tú solo con el Inspector o la terminal.');
    } finally {
      setIsLoading(false);
    }
  };

  // Trigger por estancamiento (aparece de repente cuando están atascados)
  useEffect(() => {
    if (isLevelCompleted) return;

    const isStuckByFailures = failedAttempts >= 2;
    const isStuckByTime = secondsOnLevel >= 60;
    const alreadyTriggered = hasTriggeredRef.current[currentLevelId];

    if ((isStuckByFailures || isStuckByTime) && !alreadyTriggered) {
      hasTriggeredRef.current[currentLevelId] = true;
      try {
        sound.whoosh();
      } catch {}
      deliverHint();
    }
  }, [failedAttempts, secondsOnLevel, currentLevelId, isLevelCompleted, deliverHint]);

  // Click en la esfera de Isaac
  const handleBallClick = () => {
    setIsSquishing(true);
    try {
      sound.isaacPop();
    } catch {}
    setTimeout(() => setIsSquishing(false), 450);

    if (!isBubbleOpen) {
      deliverHint();
    } else {
      // Si ya está abierto, decir una frase sarcástica aleatoria
      const randomText = RANDOM_IDLE_SARCASTIC[Math.floor(Math.random() * RANDOM_IDLE_SARCASTIC.length)];
      deliverHint(randomText, null, undefined);
    }
  };

  const handleCloseBubble = () => {
    setIsBubbleOpen(false);
    if (onHighlightTarget) {
      onHighlightTarget(null);
    }
  };

  const handleActionClick = () => {
    if (suggestedTarget === 'devtools' && onOpenDevTools) {
      onOpenDevTools();
      if (onHighlightTarget) onHighlightTarget(null);
    } else if (suggestedTarget === 'terminal') {
      if (suggestedCmd) {
        onExecuteCommand(suggestedCmd);
      } else if (onOpenTerminal) {
        onOpenTerminal();
      }
      if (onHighlightTarget) onHighlightTarget(null);
    }
    setIsBubbleOpen(false);
  };

  const handleSubmitQuestion = (e: React.FormEvent) => {
    e.preventDefault();
    if (!userQuery.trim() || isLoading || isTyping) return;
    const q = userQuery.trim().slice(0, 140);
    setUserQuery('');
    askIsaacAI(q);
  };

  if (isLevelCompleted) return null;

  return (
    <div className="fixed bottom-5 right-5 z-40 select-none font-sans flex flex-col items-end pointer-events-none">
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

      {/* Bocadillo de diálogo flotando ENCIMA de la esfera con puntero triangular */}
      {isBubbleOpen && (
        <div className="pointer-events-auto relative mb-3 mr-1 w-72 sm:w-80 rounded-2xl border border-amber-500/40 bg-white/95 dark:bg-neutral-900/95 backdrop-blur-md shadow-2xl p-3.5 text-neutral-900 dark:text-neutral-100 animate-in fade-in zoom-in-95 duration-200">
          
          {/* Cabecera del bocadillo */}
          <div className="flex items-center justify-between pb-2 border-b border-neutral-200 dark:border-neutral-800">
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-orange-500 animate-pulse" />
              <span className="font-mono text-xs font-bold text-orange-600 dark:text-amber-400">
                PUTOISAAC
              </span>
              <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-amber-500/10 text-amber-600 dark:text-amber-400 font-semibold">
                Tutor
              </span>
            </div>

            <button
              onClick={handleCloseBubble}
              type="button"
              className="p-1 rounded hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 transition-colors cursor-pointer"
              title="Cerrar bocadillo"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Mensaje corto y sarcástico */}
          <div className="py-2.5 text-xs text-neutral-800 dark:text-neutral-200 leading-relaxed min-h-[2.5rem]">
            {isLoading ? (
              <div className="flex items-center gap-2 text-neutral-500 font-mono text-[11px]">
                <Loader2 className="w-3.5 h-3.5 animate-spin text-orange-500" />
                <span>Mirando tu pantalla con cara de desprecio...</span>
              </div>
            ) : (
              <div>
                <p className="font-sans select-text">{displayedText || '¡Epa socio! Aquí estoy.'}</p>
                {isTyping && (
                  <span className="inline-block w-1.5 h-3 bg-amber-500 animate-pulse ml-0.5 align-middle" />
                )}
              </div>
            )}
          </div>

          {/* Botón de acción destacado si Isaac sugiere herramienta */}
          {suggestedTarget && (
            <div className="mt-1 mb-2">
              <button
                onClick={handleActionClick}
                type="button"
                className="w-full py-1.5 px-2.5 rounded-lg bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-mono text-[11px] font-bold flex items-center justify-center gap-1.5 shadow-sm transition-all cursor-pointer active:scale-95"
              >
                {suggestedTarget === 'devtools' ? (
                  <>
                    <Code className="w-3.5 h-3.5" />
                    <span>Abrir Inspeccionar (F12) ↗</span>
                  </>
                ) : (
                  <>
                    <Terminal className="w-3.5 h-3.5" />
                    <span>{suggestedCmd ? `Ejecutar: ${suggestedCmd}` : 'Abrir Terminal (Kali) ↗'}</span>
                  </>
                )}
              </button>
            </div>
          )}

          {/* Formulario rápido para preguntarle algo si está atascado */}
          <form onSubmit={handleSubmitQuestion} className="flex items-center gap-1 pt-1 border-t border-neutral-100 dark:border-neutral-800">
            <input
              type="text"
              value={userQuery}
              onChange={(e) => setUserQuery(e.target.value)}
              placeholder="¿Qué no pillas? (máx 140 c.)"
              maxLength={140}
              disabled={isLoading || isTyping}
              className="flex-1 px-2.5 py-1 rounded-lg bg-neutral-100 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 text-[11px] font-sans text-neutral-900 dark:text-neutral-100 focus:outline-none focus:border-amber-500"
            />
            <button
              type="submit"
              disabled={!userQuery.trim() || isLoading || isTyping}
              className="p-1.5 rounded-lg bg-orange-500 text-white hover:bg-orange-600 disabled:opacity-40 transition-colors cursor-pointer"
            >
              <Send className="w-3 h-3" />
            </button>
          </form>

          {/* Triángulo puntero hacia la esfera de Isaac */}
          <div className="absolute -bottom-1.5 right-6 w-3 h-3 bg-white dark:bg-neutral-900 border-r border-b border-amber-500/40 transform rotate-45" />
        </div>
      )}

      {/* Mascota física esférica PUTOISAAC auténtica */}
      <div
        ref={mascotRef}
        onClick={handleBallClick}
        className="pointer-events-auto group relative flex flex-col items-center cursor-pointer select-none transition-all duration-300 active:scale-95"
        style={{
          animation: isSquishing
            ? 'putoSquish 0.45s cubic-bezier(0.34, 1.56, 0.64, 1)'
            : 'putoFloat 4s ease-in-out infinite',
        }}
        title="Toca a PUTOISAAC para que te suelte una pista o una pulla"
      >
        {/* Cartelito minimalista superior con el nombre */}
        <div className="mb-1 px-2 py-0.5 rounded-full bg-white/90 dark:bg-neutral-900/90 text-neutral-800 dark:text-neutral-200 border border-neutral-200/80 dark:border-neutral-800 text-[9px] font-semibold tracking-wider font-mono shadow-xs transition-all group-hover:scale-105 flex items-center gap-1 backdrop-blur-xs">
          <span className={`w-1.5 h-1.5 rounded-full ${isLoading ? 'bg-orange-500 animate-ping' : isTalking ? 'bg-orange-500 animate-pulse' : 'bg-orange-500'}`} />
          <span>PUTOISAAC</span>
        </div>

        {/* Esfera física táctil de PUTOISAAC con brillo y sombra 3D */}
        <div
          className={`w-12 h-12 rounded-full bg-gradient-to-tr from-amber-600 via-orange-500 to-amber-400 border border-white/60 dark:border-white/20 shadow-lg shadow-orange-500/30 flex items-center justify-center relative overflow-hidden transition-all duration-300 group-hover:scale-105 ${
            isLoading ? 'ring-2 ring-orange-500/50 ring-offset-2 ring-offset-white dark:ring-offset-neutral-950' : ''
          }`}
          style={{
            boxShadow: isLoading
              ? '0 0 20px rgba(249, 115, 22, 0.4), inset 0 2px 4px rgba(255,255,255,0.6)'
              : '0 8px 20px rgba(249, 115, 22, 0.3), inset 0 2px 4px rgba(255,255,255,0.5)',
            animation: isLoading ? 'thinkPulse 2s ease-in-out infinite' : undefined,
          }}
        >
          {/* Brillo especular superior de vidrio */}
          <div className="absolute top-1 left-1.5 w-3.5 h-1.5 rounded-full bg-white/55 blur-[0.3px] transform -rotate-12 pointer-events-none" />

          {/* Cara expresiva de PUTOISAAC */}
          <div className="flex flex-col items-center justify-center relative z-10 space-y-0.5 mt-0.5">
            {/* Cejas sarcásticas reactivas */}
            <div className="flex items-center gap-2 mb-0.5">
              <div
                className="w-1.5 h-[1.5px] bg-neutral-950/80 rounded-full transition-transform duration-150"
                style={{
                  transform: isLoading
                    ? 'translateY(-2px) rotate(-10deg)'
                    : isTalking && talkPhoneme % 2 === 1
                    ? 'translateY(-1.5px) rotate(4deg)'
                    : 'translateY(-1px) rotate(-6deg)',
                }}
              />
              <div
                className="w-1.5 h-[1.5px] bg-neutral-950/80 rounded-full transition-transform duration-150"
                style={{
                  transform: isLoading
                    ? 'translateY(-3px) rotate(14deg)'
                    : isTalking && talkPhoneme % 2 === 1
                    ? 'translateY(-1.5px) rotate(-4deg)'
                    : 'translateY(-2px) rotate(8deg)',
                }}
              />
            </div>

            {/* Ojos expresivos con seguimiento ocular de cursor y parpadeo orgánico */}
            <div className="flex items-center gap-1.5">
              {/* Ojo Izquierdo */}
              <div
                className={`w-2.5 h-3 rounded-full bg-neutral-950 transition-all duration-100 flex items-center justify-center relative overflow-hidden ${
                  isBlinking ? '!h-[1px] !w-2.5 my-1.5 !bg-neutral-900' : ''
                }`}
              >
                {!isBlinking && (
                  <div
                    className="w-1 h-1 rounded-full bg-white absolute transition-transform duration-75"
                    style={{
                      transform: isLoading
                        ? 'translate(0.6px, -0.9px)'
                        : `translate(${pupilOffset.x * 0.45}px, ${pupilOffset.y * 0.45}px)`,
                    }}
                  />
                )}
              </div>

              {/* Ojo Derecho */}
              <div
                className={`w-2.5 h-3 rounded-full bg-neutral-950 transition-all duration-100 flex items-center justify-center relative overflow-hidden ${
                  isBlinking ? '!h-[1px] !w-2.5 my-1.5 !bg-neutral-900' : ''
                }`}
              >
                {!isBlinking && (
                  <div
                    className="w-1 h-1 rounded-full bg-white absolute transition-transform duration-75"
                    style={{
                      transform: isLoading
                        ? 'translate(0.6px, -0.9px)'
                        : `translate(${pupilOffset.x * 0.45}px, ${pupilOffset.y * 0.45}px)`,
                    }}
                  />
                )}
              </div>
            </div>

            {/* Boca sincronizada por fonemas y mueca sarcástica */}
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
              ) : isLoading ? (
                <div className="w-1.5 h-1.5 rounded-full border border-neutral-950 animate-pulse" />
              ) : (
                <div className="w-2 h-1 border-b-[1.5px] border-neutral-950 rounded-full translate-x-0.5" />
              )}
            </div>
          </div>
        </div>

        {/* Sombra de suelo dinámica */}
        <div
          className="w-7 h-1 rounded-full bg-black/20 dark:bg-black/50 blur-[1px] mt-1 transition-all pointer-events-none"
          style={{
            animation: 'shadowPulse 4s ease-in-out infinite',
          }}
        />
      </div>
    </div>
  );
};
