'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Terminal as TerminalIcon,
  X,
  Maximize2,
  Minimize2,
  CornerDownLeft,
  Copy,
  Check,
  Trash2,
} from 'lucide-react';
import { TerminalEntry } from '@/lib/lab/types';
import { MOCK_FILESYSTEM, MOCK_DIRECTORIES, mockApiRouter } from '@/lib/lab/mockEngine';

interface LabTerminalProps {
  currentLevelId: number;
  onFlagSubmit: (flag: string) => void;
  onRequestHint?: () => void;
  isOpen: boolean;
  onClose?: () => void;
  initialCommand?: string | null;
  onClearInitialCommand?: () => void;
}

const AVAILABLE_COMMANDS = [
  'help',
  'ls',
  'cd',
  'pwd',
  'cat',
  'grep',
  'curl',
  'base64',
  'b64',
  'echo',
  'whoami',
  'id',
  'uname',
  'date',
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
  initialCommand,
  onClearInitialCommand,
}) => {
  const [cwd, setCwd] = useState<string>('/home/student');
  const [entries, setEntries] = useState<TerminalEntry[]>([
    {
      id: 'init-1',
      type: 'system',
      content: `CYBERLAB LINUX TERMINAL [Sandbox Aislado v2.5]
Escribe "help" para ver los comandos disponibles.
Nivel activo: Nivel ${currentLevelId}. Puedes usar "curl", "cat", "base64", "grep" o "submit <FLAG{...}>".`,
    },
  ]);
  const [inputValue, setInputValue] = useState('');
  const [history, setHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState<number>(-1);
  const [isExpanded, setIsExpanded] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll al final
  useEffect(() => {
    if (isOpen) {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
      inputRef.current?.focus();
    }
  }, [entries, isOpen]);

  // Ejecutar comando inicial si se recibe desde la interfaz
  useEffect(() => {
    if (initialCommand && isOpen) {
      handleCommand(initialCommand);
      if (onClearInitialCommand) onClearInitialCommand();
    }
  }, [initialCommand, isOpen]);

  const resolvePath = useCallback(
    (targetPath: string): string => {
      let resolved = targetPath.trim();
      if (!resolved || resolved === '.') return cwd;
      if (resolved === '~') return '/home/student';
      if (resolved.startsWith('~/')) resolved = '/home/student' + resolved.slice(1);

      if (!resolved.startsWith('/')) {
        resolved = (cwd === '/' ? '' : cwd) + '/' + resolved;
      }

      // Normalizar /../ y /./
      const segments = resolved.split('/').filter(Boolean);
      const stack: string[] = [];
      for (const seg of segments) {
        if (seg === '..') {
          if (stack.length > 0) stack.pop();
        } else if (seg !== '.') {
          stack.push(seg);
        }
      }
      return '/' + stack.join('/');
    },
    [cwd]
  );

  const handleCommand = useCallback(
    (cmdRaw: string) => {
      const trimmed = cmdRaw.trim();
      if (!trimmed) return;

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
            'SISTEMA DE COMANDOS DEL SANDBOX:',
            '  Archivos y Navegación:',
            '    ls [ruta]              Lista archivos del directorio',
            '    cd [ruta]              Cambia de directorio (p. ej. cd /var/www/html)',
            '    pwd                    Muestra la ruta actual de trabajo',
            '    cat <archivo>          Muestra el contenido de un archivo',
            '    grep [-i] <patrón> <f> Busca texto dentro de un archivo',
            '',
            '  Red y Peticiones Web:',
            '    curl [opciones] URL    Lanza peticiones HTTP simuladas en memoria',
            '                           Ejemplos:',
            '                             curl /lab/robots.txt',
            '                             curl /api/mock/invoices?id=1001',
            '                             curl -X POST /api/mock/auth -d "user=admin&pass=hunter2"',
            '                             curl -H "X-Employee-Id: sec-9902" -H "Authorization: Bearer emergency_override_2026" /api/mock/admin/flag',
            '',
            '  Codificación y Cripto:',
            '    base64 [-d] <cadena>   Codifica o decodifica en Base64',
            '    b64 [-d] <cadena>      Alias corto para base64',
            '',
            '  Utilidades y CTF:',
            '    submit <FLAG{...}>     Envía y valida la bandera del nivel activo',
            '    hint                   Muestra pistas del nivel activo',
            '    whoami, id, uname      Información de usuario y sistema',
            '    echo <texto>           Imprime texto en la terminal',
            '    date                   Fecha y hora del sistema',
            '    history                Historial de comandos',
            '    clear                  Limpia la consola',
          ].join('\n');
          break;

        case 'clear':
          setEntries([]);
          return;

        case 'pwd':
          outputEntry.content = cwd;
          break;

        case 'cd': {
          const target = args[0] || '/home/student';
          const resolved = resolvePath(target);
          const exists =
            MOCK_DIRECTORIES.includes(resolved) ||
            Object.keys(MOCK_FILESYSTEM).some((k) => k.startsWith(resolved + '/'));

          if (exists) {
            setCwd(resolved);
            return; // Sin salida cuando cd tiene éxito
          } else {
            outputEntry.type = 'error';
            outputEntry.content = `cd: no se puede acceder a '${target}': No existe el directorio`;
          }
          break;
        }

        case 'ls': {
          const target = args[0] ? resolvePath(args[0]) : cwd;
          const filesInTarget = Object.keys(MOCK_FILESYSTEM).filter((k) => {
            if (target === '/') {
              const segs = k.split('/').filter(Boolean);
              return segs.length === 1;
            }
            return k.startsWith(target + '/') && !k.slice(target.length + 1).includes('/');
          });

          // Subdirectorios inmediatos
          const subdirs = MOCK_DIRECTORIES.filter((d) => {
            if (d === target || d === '/') return false;
            if (target === '/') {
              return d.split('/').filter(Boolean).length === 1;
            }
            return d.startsWith(target + '/') && !d.slice(target.length + 1).includes('/');
          });

          const items = [
            ...subdirs.map((d) => d.split('/').pop() + '/'),
            ...filesInTarget.map((f) => f.split('/').pop() || ''),
          ];

          if (items.length > 0) {
            outputEntry.content = items.join('  ');
          } else {
            const isDir = MOCK_DIRECTORIES.includes(target);
            if (isDir) {
              outputEntry.content = '(directorio vacío)';
            } else {
              outputEntry.type = 'error';
              outputEntry.content = `ls: no se puede acceder a '${args[0] || target}': No existe el archivo o directorio`;
            }
          }
          break;
        }

        case 'cat': {
          const target = args[0];
          if (!target) {
            outputEntry.type = 'error';
            outputEntry.content = 'cat: falta el operando de archivo. Ejemplo: cat /var/www/html/robots.txt';
          } else {
            const resolved = resolvePath(target);
            const file = MOCK_FILESYSTEM[resolved] || MOCK_FILESYSTEM[target];
            if (file) {
              outputEntry.content = file.content;
            } else {
              outputEntry.type = 'error';
              outputEntry.content = `cat: ${target}: No existe el archivo`;
            }
          }
          break;
        }

        case 'grep': {
          if (args.length < 2) {
            outputEntry.type = 'error';
            outputEntry.content = 'Uso: grep [-i] <patrón> <archivo>\nEjemplo: grep -i flag /var/www/html/robots.txt';
          } else {
            let ignoreCase = false;
            let pattern = '';
            let filePath = '';

            if (args[0] === '-i') {
              ignoreCase = true;
              pattern = args[1] || '';
              filePath = args[2] || '';
            } else {
              pattern = args[0] || '';
              filePath = args[1] || '';
            }

            const resolved = resolvePath(filePath);
            const file = MOCK_FILESYSTEM[resolved] || MOCK_FILESYSTEM[filePath];

            if (!file) {
              outputEntry.type = 'error';
              outputEntry.content = `grep: ${filePath}: No existe el archivo`;
            } else {
              const lines = file.content.split('\n');
              const regex = new RegExp(pattern, ignoreCase ? 'i' : '');
              const matched = lines.filter((l) => regex.test(l));

              if (matched.length > 0) {
                outputEntry.type = 'success';
                outputEntry.content = matched.join('\n');
              } else {
                outputEntry.content = `(sin coincidencias para "${pattern}")`;
              }
            }
          }
          break;
        }

        case 'base64':
        case 'b64': {
          if (args.length === 0) {
            outputEntry.type = 'error';
            outputEntry.content = 'Uso: base64 [-d] <cadena>\nEjemplo: base64 "hola" o base64 -d "aG9sYQ=="';
          } else if (args[0] === '-d' || args[0] === '--decode') {
            const encoded = args.slice(1).join(' ').trim();
            try {
              outputEntry.type = 'success';
              outputEntry.content = atob(encoded);
            } catch {
              outputEntry.type = 'error';
              outputEntry.content = `base64: entrada no válida para decodificar: "${encoded}"`;
            }
          } else {
            const raw = args.join(' ');
            try {
              outputEntry.type = 'success';
              outputEntry.content = btoa(raw);
            } catch {
              outputEntry.type = 'error';
              outputEntry.content = 'base64: error al codificar la cadena';
            }
          }
          break;
        }

        case 'echo':
          outputEntry.content = args.join(' ');
          break;

        case 'whoami':
          outputEntry.content = 'student';
          break;

        case 'id':
          outputEntry.content = 'uid=1000(student) gid=1000(smr2) groups=1000(smr2),1001(cyberlab)';
          break;

        case 'uname':
          outputEntry.content = args.includes('-a')
            ? 'Linux cyberlab-smr2 6.6.0-10-amd64 #1 SMP PREEMPT_DYNAMIC Debian x86_64 GNU/Linux'
            : 'Linux';
          break;

        case 'date':
          outputEntry.content = new Date().toUTCString();
          break;

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
              `> ${method} ${url} HTTP/1.1`,
              `< HTTP/1.1 ${res.status} ${res.statusText}`,
              headerLines,
              '',
              res.body,
            ].join('\n');

            // Notificación visual si la respuesta contiene flag
            const flagMatch = res.body.match(/FLAG\{[A-Z0-9_]+\}/);
            if (flagMatch) {
              outputEntry.content += `\n\n🎉 [FLAG DETECTADA]: ${flagMatch[0]} (puedes copiarla o usar "submit ${flagMatch[0]}")`;
            }
          }
          break;
        }

        case 'hint':
          if (onRequestHint) {
            onRequestHint();
            outputEntry.type = 'system';
            outputEntry.content = 'Mostrando pistas para el nivel actual en la interfaz.';
          } else {
            outputEntry.content = 'Revisa la pestaña "Pistas" del nivel activo.';
          }
          break;

        case 'submit': {
          const flagCandidate = args[0];
          if (!flagCandidate) {
            outputEntry.type = 'error';
            outputEntry.content = 'Uso: submit <FLAG{...}>\nEjemplo: submit FLAG{DOM_C0MM3NTS_4ND_R0B0TS}';
          } else {
            onFlagSubmit(flagCandidate.trim());
            outputEntry.type = 'system';
            outputEntry.content = `Comprobando bandera: ${flagCandidate.trim()}...`;
          }
          break;
        }

        case 'history':
          outputEntry.content =
            history.map((h, idx) => `  ${idx + 1}  ${h}`).join('\n') || 'Historial vacío';
          break;

        default:
          outputEntry.type = 'error';
          outputEntry.content = `bash: comando no encontrado: "${command}". Escribe "help" para ver los comandos permitidos.`;
          break;
      }

      setEntries((prev) => [...prev, inputEntry, outputEntry]);
    },
    [cwd, history, onFlagSubmit, onRequestHint, resolvePath]
  );

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

  const copyToClipboard = (text: string, id: string) => {
    if (typeof navigator !== 'undefined') {
      navigator.clipboard.writeText(text);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    }
  };

  if (!isOpen) return null;

  return (
    <aside
      aria-label="Terminal interactiva del laboratorio"
      className={`fixed z-50 transition-all duration-200 border border-neutral-300 dark:border-neutral-800 bg-white/95 dark:bg-neutral-950/95 text-neutral-900 dark:text-neutral-100 shadow-2xl rounded-t-xl backdrop-blur flex flex-col font-mono text-xs ${
        isExpanded
          ? 'inset-x-2 bottom-2 top-14 md:inset-x-8 md:bottom-4 md:top-16'
          : 'inset-x-2 md:inset-x-8 bottom-0 h-80 md:h-[26rem]'
      }`}
    >
      {/* Barra superior de la terminal */}
      <div className="flex items-center justify-between px-3.5 py-2.5 bg-neutral-100 dark:bg-neutral-900 border-b border-neutral-200 dark:border-neutral-800 select-none rounded-t-xl">
        <div className="flex items-center gap-2.5">
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-500 inline-block" />
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block" />
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block" />
          </span>
          <TerminalIcon className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
          <span className="font-bold text-neutral-800 dark:text-neutral-200">
            student@cyberlab:{cwd}$
          </span>
          <span className="text-[10px] text-neutral-500 hidden sm:inline">
            (Nivel {currentLevelId})
          </span>
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={() => setEntries([])}
            type="button"
            className="p-1 hover:bg-neutral-200 dark:hover:bg-neutral-800 rounded text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200 cursor-pointer"
            title="Limpiar pantalla"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            type="button"
            className="p-1 hover:bg-neutral-200 dark:hover:bg-neutral-800 rounded text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200 cursor-pointer"
            title={isExpanded ? 'Restaurar' : 'Maximizar'}
          >
            {isExpanded ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
          </button>
          {onClose && (
            <button
              onClick={onClose}
              type="button"
              className="p-1 hover:bg-neutral-200 dark:hover:bg-neutral-800 rounded text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200 cursor-pointer"
              title="Cerrar terminal"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Salida de comandos con scroll */}
      <div className="flex-1 overflow-y-auto p-3.5 space-y-2 select-text font-mono text-[11px] leading-relaxed">
        {entries.map((entry) => (
          <div key={entry.id} className="group relative">
            {entry.type === 'input' && (
              <div className="flex items-center gap-2 font-semibold text-emerald-600 dark:text-emerald-400">
                <span>student@cyberlab:{cwd}$</span>
                <span className="text-neutral-900 dark:text-neutral-100">{entry.content}</span>
              </div>
            )}
            {entry.type === 'output' && (
              <div className="relative">
                <pre className="whitespace-pre-wrap text-neutral-700 dark:text-neutral-300 pl-4 py-0.5">
                  {entry.content}
                </pre>
                <button
                  onClick={() => copyToClipboard(entry.content, entry.id)}
                  type="button"
                  className="absolute right-1 top-0 opacity-0 group-hover:opacity-100 p-1 rounded bg-neutral-200 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100 transition-opacity"
                  title="Copiar texto"
                >
                  {copiedId === entry.id ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                </button>
              </div>
            )}
            {entry.type === 'error' && (
              <pre className="whitespace-pre-wrap text-rose-600 dark:text-rose-400 pl-4 py-0.5 font-medium">
                {entry.content}
              </pre>
            )}
            {entry.type === 'success' && (
              <pre className="whitespace-pre-wrap text-emerald-600 dark:text-emerald-400 pl-4 py-0.5 font-medium">
                {entry.content}
              </pre>
            )}
            {entry.type === 'system' && (
              <pre className="whitespace-pre-wrap text-sky-600 dark:text-sky-400 border-l-2 border-sky-500/40 pl-2.5 my-1 font-sans text-xs">
                {entry.content}
              </pre>
            )}
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Input de comandos */}
      <div className="flex items-center gap-2 px-3 py-2 bg-neutral-50 dark:bg-neutral-900/90 border-t border-neutral-200 dark:border-neutral-800">
        <span className="text-emerald-600 dark:text-emerald-400 font-bold shrink-0 text-xs">
          student@cyberlab:{cwd}$
        </span>
        <input
          ref={inputRef}
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Escribe un comando (help, ls, cat, curl, base64, grep, submit)..."
          className="flex-1 bg-transparent text-neutral-900 dark:text-neutral-100 focus:outline-none font-mono text-xs placeholder:text-neutral-400 dark:placeholder:text-neutral-600"
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
          className="p-1 hover:bg-neutral-200 dark:hover:bg-neutral-800 rounded text-neutral-500 hover:text-emerald-600 dark:hover:text-emerald-400 cursor-pointer"
          title="Ejecutar (Enter)"
        >
          <CornerDownLeft className="w-3.5 h-3.5" />
        </button>
      </div>
    </aside>
  );
};
