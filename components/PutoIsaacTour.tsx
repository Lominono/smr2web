'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { sound } from '@/lib/audio';
import {
  X,
  Send,
  Loader2,
  Terminal,
  Calendar,
  TrendingUp,
  MessageSquare,
  Sparkles,
  Command,
  RotateCcw,
  Compass,
  Volume2,
} from 'lucide-react';
import { SMR2_SUBJECTS } from '@/lib/scheduleData';

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

// Cálculo en vivo de la clase actual según horario lectivo oficial de 2º SMR
function getLiveClassStatus(): string {
  const now = new Date();
  const day = now.getDay(); // 0: Dom, 1: Lun, ..., 6: Sab
  const hours = now.getHours();
  const minutes = now.getMinutes();
  const currentTimeVal = hours * 60 + minutes;

  if (day === 0 || day === 6) {
    return 'Fin de semana sin actividad lectiva en Aula 204. La próxima sesión es el lunes a las 08:30.';
  }

  // Horario lectivo de 08:30 a 14:20
  if (currentTimeVal < 8 * 60 + 30) {
    return 'Antes de inicio de clases. La primera sesión arranca a las 08:30 en Aula 204.';
  }

  if (currentTimeVal >= 14 * 60 + 20) {
    return 'Jornada escolar concluida. Las clases se reanudan a las 08:30 en Aula 204.';
  }

  // Recreo (11:05 - 11:35)
  if (currentTimeVal >= 11 * 60 + 5 && currentTimeVal < 11 * 60 + 35) {
    return 'Periodo de recreo (11:05 - 11:35). Descanso de media mañana en el instituto.';
  }

  // Determinación aproximada por bloques del día
  if (currentTimeVal >= 8 * 60 + 30 && currentTimeVal < 10 * 60 + 20) {
    return 'Bloque matinal 1: Servicios en Red (SR) / Sistemas Operativos en Red (SOR) en Aula 204.';
  }

  if (currentTimeVal >= 10 * 60 + 20 && currentTimeVal < 11 * 60 + 5) {
    return 'Bloque previo al recreo: Seguridad Informática (SI) con análisis de redes en Aula 204.';
  }

  if (currentTimeVal >= 11 * 60 + 35 && currentTimeVal < 13 * 60 + 25) {
    return 'Bloque del mediodía: Aplicaciones Web (AW) y despliegue de servidores en Aula 204.';
  }

  return 'Última sesión de la jornada: Módulo Profesional / Empresa (MEP) e Inglés Técnico (IP2).';
}

export const PutoIsaacTour: React.FC<PutoIsaacTourProps> = ({
  onSelectTab,
  isOpenControlled,
  onCloseControlled,
  onToggleSound,
  onOpenFeedback,
  onOpenSettings,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: 'assistant',
      content:
        'ISAAC operativo. Asistente técnico de 2º SMR (Aula 204). Consulta horario, bolsa, accesos o comandos de red.',
    },
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Sincronizar apertura controlada externamente
  useEffect(() => {
    if (isOpenControlled !== undefined) {
      setIsOpen(isOpenControlled);
    }
  }, [isOpenControlled]);

  // Atajo de teclado global: Ctrl + K o Cmd + K para invocar a ISAAC
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

  // Scroll al final al recibir mensajes
  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen]);

  // Cooldown timer
  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setInterval(() => setCooldown((c) => Math.max(0, c - 1)), 1000);
    return () => clearInterval(t);
  }, [cooldown]);

  const handleClose = () => {
    setIsOpen(false);
    if (onCloseControlled) onCloseControlled();
  };

  const handleOpen = () => {
    setIsOpen(true);
    try {
      sound.tap();
    } catch {}
    setTimeout(() => inputRef.current?.focus(), 100);
  };

  // Ejecución de acciones dentro de la web
  const executeAction = useCallback(
    (actionStr: string) => {
      if (actionStr.includes('NAV:schedule') || actionStr === 'schedule') {
        onSelectTab?.('schedule');
        return 'Navegación: Horario';
      }
      if (actionStr.includes('NAV:investments') || actionStr === 'investments') {
        onSelectTab?.('investments');
        return 'Navegación: Bolsa';
      }
      if (actionStr.includes('NAV:chat') || actionStr === 'chat') {
        onSelectTab?.('chat');
        return 'Navegación: Tablón';
      }
      if (actionStr.includes('ACT:toggle_sound')) {
        onToggleSound?.();
        return 'Audio alternado';
      }
      if (actionStr.includes('ACT:open_feedback')) {
        onOpenFeedback?.();
        return 'Incidencias abiertas';
      }
      if (actionStr.includes('ACT:open_settings')) {
        onOpenSettings?.();
        return 'Ajustes abiertos';
      }
      return undefined;
    },
    [onSelectTab, onToggleSound, onOpenFeedback, onOpenSettings]
  );

  // Efecto de teletipo sonoro suave para cuando ISAAC escribe respuestas
  const appendAssistantWithTyping = useCallback(
    (fullText: string, actionExecuted?: string) => {
      let currentIdx = 0;

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

        // Disparo sonoro sutil cada 4 caracteres para sensación táctil mecánica
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

    // Consultas locales instantáneas para zero-latency
    const lower = textToSend.toLowerCase();
    if (lower.includes('que toca') || lower.includes('qué toca') || lower.includes('clase ahora')) {
      const statusText = getLiveClassStatus();
      appendAssistantWithTyping(statusText, 'Horario Lectivo');
      setIsLoading(false);
      return;
    }

    if (lower.includes('comandos') || lower.includes('red') || lower.includes('linux')) {
      const commandsText =
        'Comandos útiles Aula 204: ip a (ver IPs), ss -tuln (puertos), traceroute/tracert (rutas), sudo systemctl status isc-dhcp-server, Test-NetConnection -Port 80.';
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
      let rawReply = data.reply || 'Sin respuesta del sistema.';

      // Procesar etiquetas de control de la web
      let executedLabel: string | undefined;
      const navMatch = rawReply.match(/\[(NAV:[a-z]+|ACT:[a-z_]+)\]/);
      if (navMatch) {
        executedLabel = executeAction(navMatch[1]);
        rawReply = rawReply.replace(navMatch[0], '').trim();
      }

      appendAssistantWithTyping(rawReply, executedLabel);
    } catch {
      appendAssistantWithTyping('Fallo de enlace con el servicio central de ISAAC.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleClearChat = () => {
    try {
      sound.tap();
    } catch {}
    setMessages([
      {
        role: 'assistant',
        content: 'Historial del asistente restablecido.',
      },
    ]);
  };

  return (
    <>
      {/* Botón flotante ultra-minimalista: sin muñecos de IA, diseño de herramienta técnica */}
      <div
        className="fixed z-40 bottom-[calc(4.8rem+env(safe-area-inset-bottom,0px))] left-4 sm:left-6 sm:bottom-6 select-none font-mono"
        style={{ pointerEvents: 'auto' }}
      >
        <button
          type="button"
          onClick={handleOpen}
          aria-label="Abrir asistente técnico ISAAC"
          className="group flex items-center gap-2.5 px-3 py-2 rounded-xl bg-neutral-950/90 text-neutral-200 border border-neutral-800 shadow-xl hover:border-neutral-700 hover:text-white transition-all active:scale-95 cursor-pointer backdrop-blur-md"
        >
          <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-xs font-semibold tracking-wider">ISAAC</span>
          <span className="hidden sm:inline-block text-[10px] text-neutral-400 font-mono px-1.5 py-0.5 rounded bg-neutral-900 border border-neutral-800">
            ⌘K
          </span>
        </button>
      </div>

      {/* Panel Asistente / Command Palette */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-xs font-sans">
          <div
            className="w-full sm:max-w-xl h-[85vh] sm:h-[620px] max-h-[92vh] bg-neutral-950 border border-neutral-800 rounded-t-2xl sm:rounded-2xl flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150"
            style={{
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.75)',
            }}
          >
            {/* Header Técnico y Minimalista */}
            <header className="px-4 py-3.5 border-b border-neutral-800/80 flex items-center justify-between gap-3 bg-neutral-900/40 select-none">
              <div className="flex items-center gap-2.5">
                <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <div>
                  <h3 className="text-xs font-bold text-white tracking-wider font-mono">
                    ISAAC // ASISTENTE 2º SMR
                  </h3>
                  <p className="text-[10px] text-neutral-400 font-mono">
                    Aula 204 · Control web y resolución de red
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={handleClearChat}
                  className="p-1.5 rounded-lg text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800/60 transition-colors cursor-pointer"
                  title="Limpiar conversación"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={handleClose}
                  className="p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors cursor-pointer"
                  title="Cerrar (Esc)"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </header>

            {/* Quick Action Chips (Funciones reales de control dentro de la web) */}
            <div className="px-3.5 py-2 border-b border-neutral-900 bg-neutral-950/60 flex items-center gap-1.5 overflow-x-auto scrollbar-none select-none text-[11px] font-mono">
              <button
                type="button"
                onClick={() => {
                  executeAction('schedule');
                  handleSendMessage('¿Qué horario o clase toca hoy?');
                }}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-neutral-900 border border-neutral-800 text-neutral-300 hover:text-white hover:border-neutral-700 transition-colors shrink-0 cursor-pointer"
              >
                <Calendar className="w-3 h-3 text-sky-400" />
                <span>Horario</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  executeAction('investments');
                  handleSendMessage('Muéstrame la bolsa de El Botellón');
                }}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-neutral-900 border border-neutral-800 text-neutral-300 hover:text-white hover:border-neutral-700 transition-colors shrink-0 cursor-pointer"
              >
                <TrendingUp className="w-3 h-3 text-amber-400" />
                <span>Bolsa</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  executeAction('chat');
                  handleSendMessage('Ir al tablón en vivo');
                }}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-neutral-900 border border-neutral-800 text-neutral-300 hover:text-white hover:border-neutral-700 transition-colors shrink-0 cursor-pointer"
              >
                <MessageSquare className="w-3 h-3 text-emerald-400" />
                <span>Tablón</span>
              </button>

              <button
                type="button"
                onClick={() => handleSendMessage('¿Qué clase toca ahora mismo?')}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-neutral-900 border border-neutral-800 text-neutral-300 hover:text-white hover:border-neutral-700 transition-colors shrink-0 cursor-pointer"
              >
                <Compass className="w-3 h-3 text-purple-400" />
                <span>¿Qué toca?</span>
              </button>

              <button
                type="button"
                onClick={() => handleSendMessage('Comandos de red y Linux para 2º SMR')}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-neutral-900 border border-neutral-800 text-neutral-300 hover:text-white hover:border-neutral-700 transition-colors shrink-0 cursor-pointer"
              >
                <Terminal className="w-3 h-3 text-amber-500" />
                <span>Comandos SMR</span>
              </button>
            </div>

            {/* Lista de Mensajes */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3 font-mono text-xs">
              {messages.map((msg, idx) => (
                <div
                  key={idx}
                  className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}
                >
                  <div
                    className={`max-w-[85%] rounded-xl px-3.5 py-2.5 leading-relaxed ${
                      msg.role === 'user'
                        ? 'bg-neutral-800 text-neutral-100 border border-neutral-700'
                        : 'bg-neutral-900/90 text-neutral-300 border border-neutral-800/90'
                    }`}
                  >
                    <div className="text-[10px] text-neutral-400 mb-1 select-none font-semibold">
                      {msg.role === 'user' ? 'TÚ' : 'ISAAC'}
                    </div>
                    <div className="whitespace-pre-wrap">{msg.content}</div>

                    {msg.actionExecuted && (
                      <div className="mt-2 pt-1.5 border-t border-neutral-800 flex items-center gap-1 text-[10px] text-emerald-400">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                        <span>Acción web ejecutada: {msg.actionExecuted}</span>
                      </div>
                    )}
                  </div>
                </div>
              ))}

              {isLoading && (
                <div className="flex items-center gap-2 text-neutral-500 text-xs font-mono py-1">
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-neutral-400" />
                  <span>Consultando módulo...</span>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input Bar */}
            <div className="p-3 border-t border-neutral-800/80 bg-neutral-900/30">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSendMessage();
                }}
                className="flex items-center gap-2"
              >
                <div className="relative flex-1">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500 font-mono text-xs select-none">
                    &gt;
                  </span>
                  <input
                    ref={inputRef}
                    type="text"
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    placeholder={
                      cooldown > 0
                        ? `Espera ${cooldown}s...`
                        : 'Escribe a Isaac o pide navegar a una sección...'
                    }
                    disabled={isLoading || cooldown > 0}
                    className="w-full h-9 pl-7 pr-3 bg-neutral-900 border border-neutral-800 rounded-xl text-xs text-neutral-200 placeholder:text-neutral-500 font-mono focus:outline-none focus:border-neutral-600 transition-colors disabled:opacity-50"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isLoading || !inputValue.trim() || cooldown > 0}
                  className="h-9 px-3.5 rounded-xl bg-white hover:bg-neutral-200 active:scale-95 text-black text-xs font-mono font-semibold transition-all disabled:opacity-30 disabled:pointer-events-none cursor-pointer flex items-center gap-1"
                >
                  <Send className="w-3.5 h-3.5" />
                </button>
              </form>
              <div className="flex items-center justify-between text-[10px] text-neutral-400 font-mono mt-1.5 px-1">
                <span>Desarrollado para 2º SMR</span>
                <span>Enter para enviar</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
