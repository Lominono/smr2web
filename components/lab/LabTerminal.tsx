'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Terminal as TerminalIcon, X, Maximize2, Minimize2, CornerDownLeft, Sparkles } from 'lucide-react';
import { TerminalEntry } from '@/lib/lab/types';
import { MOCK_FILESYSTEM, mockApiRouter } from '@/lib/lab/mockEngine';

interface LabTerminalProps {
  currentLevelId: number;
  onFlagSubmit: (flag: string) => void;
  onRequestHint?: () => void;
  isOpen: boolean;
  onClose?: () => void;
}

const AVAILABLE_COMMANDS = [
  'help',
  'ls',
  'cat',
  'curl',
  'whoami',
  'id',
  'clear',
  'hint',
  'submit',
  'history',
];

export const LabTerminal: React.FC<LabTerminalProps> = ({
  currentLevelId,
  onFlagSubmit,
  onRequestHint,
  isOpen,
  onClose,
}) => {
  const [entries, setEntries] = useState<TerminalEntry[]>([
    {
      id: 'init-1',
      type: 'system',
      content: 'CyberLab Terminal Emulator v2.4 [Sandbox JS Puro]\nEscribe "help" para ver los comandos disponibles.\nPuedes usar "curl", "cat", "ls", "hint" o "submit <FLAG{...}>".',
    },
  ]);
  const [inputValue, setInputValue] = useState('');
  const [history, setHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState<number>(-1);
  const [isExpanded, setIsExpanded] = useState(false);

  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
      inputRef.current?.focus();
    }
  }, [entries, isOpen]);

  const handleCommand = useCallback((cmdRaw: string) => {
    const trimmed = cmdRaw.trim();
    if (!trimmed) return;

    // Guardar en historial
    setHistory((prev) => [...prev, trimmed]);
    setHistoryIndex(-1);

    const inputEntry: TerminalEntry = {
      id: `in-${Date.now()}`,
      type: 'input',
      content: trimmed,
    };

    const parts = trimmed.match(/(?:[^\s"']+|"[^"]*"|'[^']*')+/g) || [];
    const command = parts[0]?.toLowerCase();
    const args = parts.slice(1).map((arg) => arg.replace(/^['"]|['"]$/g, ''));

    let outputEntry: TerminalEntry = {
      id: `out-${Date.now()}`,
      type: 'output',
      content: '',
    };

    switch (command) {
      case 'help':
        outputEntry.content = [
          'COMANDOS DISPONIBLES EN EL SANDBOX:',
          '  help                 Muestra esta ayuda',
          '  ls [directorio]      Lista archivos del sistema simulado',
          '  cat <archivo>        Muestra el contenido de un archivo',
          '  curl [opciones] URL  Realiza peticiones HTTP simuladas en memoria',
          '                       Ejemplos:',
          '                         curl /lab/robots.txt',
          '                         curl /api/mock/invoices?id=1001',
          '                         curl -X POST /api/mock/auth -d "user=admin&pass=123"',
          '                         curl -H "X-Employee-Id: sec-9902" -H "Authorization: Bearer emergency_override_2026" /api/mock/admin/flag',
          '  submit <FLAG{...}>   Valida una bandera directamente desde la terminal',
          '  hint                 Solicita una pista para el nivel en curso',
          '  whoami               Muestra el usuario actual en el sandbox',
          '  id                   Muestra identificadores de usuario y grupo',
          '  history              Historial de comandos ejecutados',
          '  clear                Limpia la pantalla',
        ].join('\n');
        break;

      case 'clear':
        setEntries([]);
        return;

      case 'whoami':
        outputEntry.content = 'student';
        break;

      case 'id':
        outputEntry.content = 'uid=1000(student) gid=1000(smr2) groups=1000(smr2),1001(cyberlab)';
        break;

      case 'ls': {
        const targetPath = args[0] || '/';
        const files = Object.keys(MOCK_FILESYSTEM);
        if (targetPath === '/' || targetPath === '.') {
          outputEntry.content = 'home/   var/   etc/   opt/   backup/';
        } else {
          const matching = files.filter((f) => f.startsWith(targetPath));
          if (matching.length > 0) {
            outputEntry.content = matching.map((f) => f.split('/').pop()).join('  ');
          } else {
            outputEntry.type = 'error';
            outputEntry.content = `ls: no se puede acceder a '${targetPath}': No existe el archivo o el directorio`;
          }
        }
        break;
      }

      case 'cat': {
        const filePath = args[0];
        if (!filePath) {
          outputEntry.type = 'error';
          outputEntry.content = 'cat: falta el nombre del archivo. Ejemplo: cat /var/www/html/robots.txt';
        } else {
          const normalized = filePath.startsWith('/') ? filePath : `/home/student/${filePath}`;
          const file = MOCK_FILESYSTEM[normalized] || MOCK_FILESYSTEM[filePath];
          if (file) {
            outputEntry.content = file.content;
          } else {
            outputEntry.type = 'error';
            outputEntry.content = `cat: ${filePath}: No existe el archivo`;
          }
        }
        break;
      }

      case 'curl': {
        let method = 'GET';
        let url = '';
        const headers: Record<string, string> = {};
        let body = '';

        for (let i = 0; i < args.length; i++) {
          const arg = args[i];
          if (arg === '-X' && args[i + 1]) {
            method = args[i + 1].toUpperCase();
            i++;
          } else if (arg === '-H' && args[i + 1]) {
            const [hKey, ...hVal] = args[i + 1].split(':');
            if (hKey) headers[hKey.trim()] = hVal.join(':').trim();
            i++;
          } else if ((arg === '-d' || arg === '--data') && args[i + 1]) {
            body = args[i + 1];
            i++;
          } else if (!arg.startsWith('-')) {
            url = arg;
          }
        }

        if (!url) {
          outputEntry.type = 'error';
          outputEntry.content = 'curl: falta la URL de destino. Ejemplo: curl /lab/robots.txt';
        } else {
          const res = mockApiRouter(url, method, headers, body);
          const headerLines = Object.entries(res.headers)
            .map(([k, v]) => `< ${k}: ${v}`)
            .join('\n');

          outputEntry.type = res.status >= 200 && res.status < 300 ? 'success' : 'error';
          outputEntry.content = [
            `HTTP/1.1 ${res.status} ${res.statusText}`,
            headerLines,
            '',
            res.body,
          ].join('\n');

          // Auto-detectar flags en la respuesta para comodidad
          const flagMatch = res.body.match(/FLAG\{[A-Z0-9_]+\}/);
          if (flagMatch) {
            outputEntry.content += `\n\n🎉 [FLAG DETECTADA EN RESPUESTA]: ${flagMatch[0]}`;
          }
        }
        break;
      }

      case 'hint':
        if (onRequestHint) {
          onRequestHint();
          outputEntry.type = 'system';
          outputEntry.content = 'Revisa la sección de pistas del nivel activo en la interfaz.';
        } else {
          outputEntry.content = 'Pistas disponibles en la pestaña "Pistas" del nivel.';
        }
        break;

      case 'submit': {
        const flagCandidate = args[0];
        if (!flagCandidate) {
          outputEntry.type = 'error';
          outputEntry.content = 'Uso: submit <FLAG{...}>';
        } else {
          onFlagSubmit(flagCandidate.trim());
          outputEntry.type = 'system';
          outputEntry.content = `Validando flag: ${flagCandidate.trim()}...`;
        }
        break;
      }

      case 'history':
        outputEntry.content = history.map((h, idx) => `  ${idx + 1}  ${h}`).join('\n') || 'Historial vacío';
        break;

      default:
        outputEntry.type = 'error';
        outputEntry.content = `Comando no reconocido: "${command}". Escribe "help" para ver los comandos permitidos.`;
        break;
    }

    setEntries((prev) => [...prev, inputEntry, outputEntry]);
  }, [history, onFlagSubmit, onRequestHint]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleCommand(inputValue);
      setInputValue('');
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (history.length > 0) {
        const nextIdx = historyIndex === -1 ? history.length - 1 : Math.max(0, historyIndex - 1);
        setHistoryIndex(nextIdx);
        setInputValue(history[nextIdx] || '');
      }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (historyIndex !== -1) {
        const nextIdx = historyIndex + 1;
        if (nextIdx >= history.length) {
          setHistoryIndex(-1);
          setInputValue('');
        } else {
          setHistoryIndex(nextIdx);
          setInputValue(history[nextIdx] || '');
        }
      }
    } else if (e.key === 'Tab') {
      e.preventDefault();
      const current = inputValue.trim().toLowerCase();
      if (current) {
        const match = AVAILABLE_COMMANDS.find((cmd) => cmd.startsWith(current));
        if (match) setInputValue(match + ' ');
      }
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className={`fixed z-50 transition-all duration-200 border border-neutral-700 bg-neutral-950/95 text-neutral-100 shadow-2xl rounded-t-lg backdrop-blur flex flex-col font-mono text-xs ${
        isExpanded
          ? 'inset-x-2 bottom-2 top-16 md:inset-x-12 md:bottom-6 md:top-20'
          : 'inset-x-2 md:inset-x-12 bottom-0 h-80 md:h-96'
      }`}
    >
      {/* Barra superior de la terminal */}
      <div className="flex items-center justify-between px-3 py-2 bg-neutral-900 border-b border-neutral-800 select-none">
        <div className="flex items-center gap-2">
          <TerminalIcon className="w-4 h-4 text-emerald-400" />
          <span className="font-bold text-neutral-300">
            student@cyberlab:~$ (Nivel {currentLevelId})
          </span>
          <span className="text-[10px] text-neutral-500 hidden sm:inline">
            [Tab = autocompletar · ↑/↓ = historial]
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            type="button"
            className="p-1 hover:bg-neutral-800 rounded text-neutral-400 hover:text-neutral-200 cursor-pointer"
            title={isExpanded ? 'Restaurar' : 'Maximizar'}
          >
            {isExpanded ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
          </button>
          {onClose && (
            <button
              onClick={onClose}
              type="button"
              className="p-1 hover:bg-neutral-800 rounded text-neutral-400 hover:text-neutral-200 cursor-pointer"
              title="Cerrar terminal"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Salida de comandos con scroll */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2 select-text">
        {entries.map((entry) => (
          <div key={entry.id} className="leading-relaxed">
            {entry.type === 'input' && (
              <div className="flex items-center gap-2 text-emerald-400 font-semibold">
                <span>student@cyberlab:~$</span>
                <span className="text-neutral-100">{entry.content}</span>
              </div>
            )}
            {entry.type === 'output' && (
              <pre className="whitespace-pre-wrap text-neutral-300 font-mono text-[11px] pl-4">
                {entry.content}
              </pre>
            )}
            {entry.type === 'error' && (
              <pre className="whitespace-pre-wrap text-rose-400 font-mono text-[11px] pl-4">
                {entry.content}
              </pre>
            )}
            {entry.type === 'success' && (
              <pre className="whitespace-pre-wrap text-emerald-300 font-mono text-[11px] pl-4">
                {entry.content}
              </pre>
            )}
            {entry.type === 'system' && (
              <pre className="whitespace-pre-wrap text-cyan-400 font-mono text-[11px] border-l-2 border-cyan-500/40 pl-2 my-1">
                {entry.content}
              </pre>
            )}
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Input de comandos */}
      <div className="flex items-center gap-2 px-3 py-2 bg-neutral-900/80 border-t border-neutral-800">
        <span className="text-emerald-400 font-bold shrink-0">student@cyberlab:~$</span>
        <input
          ref={inputRef}
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Escribe un comando (help, ls, cat, curl, submit)..."
          className="flex-1 bg-transparent text-neutral-100 focus:outline-none font-mono text-xs"
          autoFocus
          spellCheck={false}
          autoComplete="off"
        />
        <button
          onClick={() => {
            handleCommand(inputValue);
            setInputValue('');
          }}
          type="button"
          className="p-1 hover:bg-neutral-800 rounded text-neutral-400 hover:text-emerald-400 cursor-pointer"
          title="Ejecutar"
        >
          <CornerDownLeft className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};
