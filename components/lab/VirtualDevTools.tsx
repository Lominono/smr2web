'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  Code,
  Terminal,
  Wifi,
  HardDrive,
  X,
  Maximize2,
  Minimize2,
  Play,
  Trash2,
  Plus,
  Edit2,
  Check,
  AlertCircle,
  Eye,
} from 'lucide-react';

interface VirtualDevToolsProps {
  isOpen: boolean;
  onClose: () => void;
  currentLevelId: number;
}

interface ConsoleLog {
  id: string;
  type: 'input' | 'output' | 'error';
  content: string;
}

export const VirtualDevTools: React.FC<VirtualDevToolsProps> = ({
  isOpen,
  onClose,
  currentLevelId,
}) => {
  const [activeTab, setActiveTab] = useState<'elements' | 'console' | 'network' | 'application'>('elements');
  const [isExpanded, setIsExpanded] = useState(false);

  // Estados de Console
  const [consoleLogs, setConsoleLogs] = useState<ConsoleLog[]>([
    {
      id: 'c-1',
      type: 'output',
      content: 'Consola JavaScript emulada del navegador. Puedes ejecutar expresiones como document.cookie, sessionStorage, atob(...) o btoa(...).',
    },
  ]);
  const [consoleInput, setConsoleInput] = useState('');
  const consoleBottomRef = useRef<HTMLDivElement>(null);

  // Estados de Application / Storage
  const [cookieList, setCookieList] = useState<{ key: string; value: string }[]>([]);
  const [storageList, setStorageList] = useState<{ key: string; value: string }[]>([]);
  const [editingCookieKey, setEditingCookieKey] = useState<string | null>(null);
  const [editingCookieVal, setEditingCookieVal] = useState<string>('');
  const [editingStorageKey, setEditingStorageKey] = useState<string | null>(null);
  const [editingStorageVal, setEditingStorageVal] = useState<string>('');

  // Cargar cookies y storage
  const refreshStorage = () => {
    if (typeof document !== 'undefined') {
      const cookies = document.cookie.split(';').map((c) => {
        const [k, ...v] = c.trim().split('=');
        return { key: k, value: v.join('=') };
      }).filter((c) => c.key);
      setCookieList(cookies);
    }

    if (typeof window !== 'undefined') {
      const items: { key: string; value: string }[] = [];
      for (let i = 0; i < sessionStorage.length; i++) {
        const k = sessionStorage.key(i);
        if (k) items.push({ key: k, value: sessionStorage.getItem(k) || '' });
      }
      setStorageList(items);
    }
  };

  useEffect(() => {
    if (isOpen) {
      refreshStorage();
    }
  }, [isOpen, activeTab]);

  const handleConsoleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cmd = consoleInput.trim();
    if (!cmd) return;

    const inLog: ConsoleLog = {
      id: `in-${Date.now()}`,
      type: 'input',
      content: cmd,
    };

    let outLog: ConsoleLog;
    try {
      // Ejecución real en el contexto seguro del navegador
      const result = window.eval(cmd);
      let formatted = '';
      if (typeof result === 'object' && result !== null) {
        formatted = JSON.stringify(result, null, 2);
      } else {
        formatted = String(result);
      }
      outLog = {
        id: `out-${Date.now()}`,
        type: 'output',
        content: formatted,
      };
    } catch (err: any) {
      outLog = {
        id: `err-${Date.now()}`,
        type: 'error',
        content: err?.message || 'Error al evaluar la expresión en consola.',
      };
    }

    setConsoleLogs((prev) => [...prev, inLog, outLog]);
    setConsoleInput('');
    refreshStorage();
  };

  const handleSaveCookie = (key: string, val: string) => {
    if (typeof document !== 'undefined') {
      document.cookie = `${key}=${val}; path=/; SameSite=Lax`;
      refreshStorage();
      setEditingCookieKey(null);
    }
  };

  const handleSaveStorage = (key: string, val: string) => {
    if (typeof window !== 'undefined') {
      sessionStorage.setItem(key, val);
      refreshStorage();
      setEditingStorageKey(null);
    }
  };

  if (!isOpen) return null;

  return (
    <section
      aria-label="Herramientas de Desarrollador Integradas (Modo Inspeccionar)"
      className={`fixed z-50 transition-all duration-200 border border-neutral-300 dark:border-neutral-800 bg-white/95 dark:bg-neutral-950/95 text-neutral-900 dark:text-neutral-100 shadow-2xl rounded-t-xl backdrop-blur flex flex-col font-mono text-xs ${
        isExpanded
          ? 'inset-x-2 bottom-2 top-12 md:inset-x-8 md:bottom-4 md:top-14'
          : 'inset-x-2 md:inset-x-8 bottom-0 h-96 md:h-[28rem]'
      }`}
    >
      {/* Barra superior de pestañas tipo Chrome DevTools */}
      <div className="flex items-center justify-between px-3 py-2 bg-neutral-100 dark:bg-neutral-900 border-b border-neutral-200 dark:border-neutral-800 select-none rounded-t-xl">
        <div className="flex items-center gap-1 sm:gap-2">
          <div className="flex items-center gap-1 mr-2 px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 font-bold text-[11px]">
            <Code className="w-3.5 h-3.5" />
            <span>DEVTOOLS (F12)</span>
          </div>

          <button
            onClick={() => setActiveTab('elements')}
            type="button"
            className={`px-2.5 py-1 rounded text-xs font-semibold cursor-pointer transition-colors ${
              activeTab === 'elements'
                ? 'bg-neutral-200 dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100'
                : 'text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-200'
            }`}
          >
            Elements
          </button>

          <button
            onClick={() => setActiveTab('console')}
            type="button"
            className={`px-2.5 py-1 rounded text-xs font-semibold cursor-pointer transition-colors ${
              activeTab === 'console'
                ? 'bg-neutral-200 dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100'
                : 'text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-200'
            }`}
          >
            Console
          </button>

          <button
            onClick={() => setActiveTab('network')}
            type="button"
            className={`px-2.5 py-1 rounded text-xs font-semibold cursor-pointer transition-colors ${
              activeTab === 'network'
                ? 'bg-neutral-200 dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100'
                : 'text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-200'
            }`}
          >
            Network
          </button>

          <button
            onClick={() => setActiveTab('application')}
            type="button"
            className={`px-2.5 py-1 rounded text-xs font-semibold cursor-pointer transition-colors ${
              activeTab === 'application'
                ? 'bg-neutral-200 dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100'
                : 'text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-200'
            }`}
          >
            Application
          </button>
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            type="button"
            className="p-1 hover:bg-neutral-200 dark:hover:bg-neutral-800 rounded text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200 cursor-pointer"
            title={isExpanded ? 'Restaurar' : 'Maximizar'}
          >
            {isExpanded ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
          </button>
          <button
            onClick={onClose}
            type="button"
            className="p-1 hover:bg-neutral-200 dark:hover:bg-neutral-800 rounded text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200 cursor-pointer"
            title="Cerrar DevTools"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Contenido según pestaña */}
      <div className="flex-1 overflow-y-auto p-4 font-mono text-xs">
        {/* PESTAÑA ELEMENTS (DOM INSPECTOR) */}
        {activeTab === 'elements' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between border-b border-neutral-200 dark:border-neutral-800 pb-2">
              <span className="text-neutral-500 uppercase text-[11px] font-bold">
                Árbol DOM del Reto Activo (Nivel {currentLevelId}):
              </span>
              <span className="text-[10px] text-neutral-400">
                Haz clic en cualquier valor para editarlo en vivo
              </span>
            </div>

            {currentLevelId === 1 && (
              <div className="p-3 bg-neutral-100 dark:bg-neutral-900 rounded-lg space-y-1 text-neutral-700 dark:text-neutral-300 select-text leading-relaxed">
                <div>&lt;<span className="text-rose-600 dark:text-rose-400">div</span> <span className="text-amber-600 dark:text-amber-400">class</span>=&quot;portal-container&quot;&gt;</div>
                <div className="pl-4">&lt;<span className="text-rose-600 dark:text-rose-400">h1</span>&gt;SecureCorp Cloud Defense&lt;/<span className="text-rose-600 dark:text-rose-400">h1</span>&gt;</div>
                <div className="pl-4">&lt;<span className="text-rose-600 dark:text-rose-400">p</span>&gt;Infraestructura protegida.&lt;/<span className="text-rose-600 dark:text-rose-400">p</span>&gt;</div>
                <div className="pl-4 py-1 text-emerald-600 dark:text-emerald-400 font-bold bg-emerald-500/10 p-1 rounded">
                  &lt;!-- TODO DE DESARROLLO (QUITAR EN PRODUCCIÓN):<br />
                  &nbsp;&nbsp;&nbsp;&nbsp;- Fichero robots.txt: /lab/robots.txt<br />
                  &nbsp;&nbsp;&nbsp;&nbsp;- Copia de notas de contingencia: /backup/staff_notes.txt<br />
                  &nbsp;&nbsp;&nbsp;&nbsp;- Flag: FLAG&#123;DOM_C0MM3NTS_4ND_R0B0TS&#125; --&gt;
                </div>
                <div className="pl-4">&lt;<span className="text-rose-600 dark:text-rose-400">footer</span>&gt;© 2026 SecureCorp IT.&lt;/<span className="text-rose-600 dark:text-rose-400">footer</span>&gt;</div>
                <div>&lt;/<span className="text-rose-600 dark:text-rose-400">div</span>&gt;</div>
              </div>
            )}

            {currentLevelId === 2 && (
              <div className="p-3 bg-neutral-100 dark:bg-neutral-900 rounded-lg space-y-1.5 text-neutral-700 dark:text-neutral-300 select-text">
                <div>&lt;<span className="text-rose-600 dark:text-rose-400">form</span> <span className="text-amber-600 dark:text-amber-400">id</span>=&quot;checkoutForm&quot;&gt;</div>
                <div className="pl-4">
                  &lt;<span className="text-rose-600 dark:text-rose-400">input</span> <span className="text-amber-600 dark:text-amber-400">type</span>=&quot;hidden&quot; <span className="text-amber-600 dark:text-amber-400">id</span>=&quot;checkoutPrice&quot; <span className="text-amber-600 dark:text-amber-400">value</span>=&quot;<span className="text-cyan-600 dark:text-cyan-400 font-bold">500</span>&quot; /&gt;
                </div>
                <div className="pl-4">
                  &lt;<span className="text-rose-600 dark:text-rose-400">button</span> <span className="text-amber-600 dark:text-amber-400">id</span>=&quot;btnBuy&quot; <span className="text-rose-600 dark:text-rose-400 font-bold bg-rose-500/10 px-1 rounded">disabled</span>&gt;
                  Comprar Certificación (500 €)
                  &lt;/<span className="text-rose-600 dark:text-rose-400">button</span>&gt;
                </div>
                <div>&lt;/<span className="text-rose-600 dark:text-rose-400">form</span>&gt;</div>
                <div className="pt-2 text-[11px] text-neutral-500">
                  Tip: En la pestaña del reto tienes los botones interactivos para borrar el atributo &quot;disabled&quot; y cambiar el valor a 0.
                </div>
              </div>
            )}

            {currentLevelId >= 3 && (
              <div className="p-3 bg-neutral-100 dark:bg-neutral-900 rounded-lg space-y-2 text-neutral-700 dark:text-neutral-300">
                <div className="text-neutral-500">
                  // Elementos DOM del Nivel {currentLevelId}:
                </div>
                <div>Para este reto, inspecciona la pestaña <strong>Network</strong>, <strong>Application</strong> o utiliza la <strong>Console</strong>.</div>
              </div>
            )}
          </div>
        )}

        {/* PESTAÑA CONSOLE (JS EVALUATOR) */}
        {activeTab === 'console' && (
          <div className="flex flex-col h-full space-y-2">
            <div className="flex items-center justify-between border-b border-neutral-200 dark:border-neutral-800 pb-2">
              <span className="text-neutral-500 uppercase text-[11px] font-bold">
                Consola JavaScript Interactiva:
              </span>
              <button
                onClick={() => setConsoleLogs([])}
                type="button"
                className="text-[10px] text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200"
              >
                Limpiar registros
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-1.5 p-2 bg-neutral-100 dark:bg-neutral-900 rounded-lg min-h-[12rem] select-text">
              {consoleLogs.map((log) => (
                <div key={log.id} className="text-xs">
                  {log.type === 'input' && (
                    <div className="text-emerald-700 dark:text-emerald-400 font-bold">
                      &gt; {log.content}
                    </div>
                  )}
                  {log.type === 'output' && (
                    <pre className="text-neutral-800 dark:text-neutral-200 pl-3 whitespace-pre-wrap">
                      &lt; {log.content}
                    </pre>
                  )}
                  {log.type === 'error' && (
                    <div className="text-rose-600 dark:text-rose-400 pl-3 font-semibold">
                      ✕ {log.content}
                    </div>
                  )}
                </div>
              ))}
              <div ref={consoleBottomRef} />
            </div>

            <form onSubmit={handleConsoleSubmit} className="flex items-center gap-2 pt-1">
              <span className="text-emerald-600 dark:text-emerald-400 font-bold">&gt;</span>
              <input
                type="text"
                value={consoleInput}
                onChange={(e) => setConsoleInput(e.target.value)}
                placeholder="Ejemplo: document.cookie  ó  atob('eyJ1c2VyIjoic3R1ZGVudCJ9')  ó  sessionStorage"
                className="flex-1 px-2.5 py-1.5 rounded border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100 font-mono text-xs focus:outline-none focus:border-emerald-500"
                autoFocus
              />
              <button
                type="submit"
                className="px-3 py-1.5 bg-emerald-600 dark:bg-emerald-500 text-white dark:text-neutral-950 font-bold rounded cursor-pointer text-xs hover:opacity-90"
              >
                Ejecutar
              </button>
            </form>
          </div>
        )}

        {/* PESTAÑA NETWORK (RED) */}
        {activeTab === 'network' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between border-b border-neutral-200 dark:border-neutral-800 pb-2">
              <span className="text-neutral-500 uppercase text-[11px] font-bold">
                Registro de Tráfico de Red (Peticiones HTTP):
              </span>
              <span className="text-[10px] text-neutral-400">Simulación Fetch / XHR</span>
            </div>

            <div className="border border-neutral-200 dark:border-neutral-800 rounded-lg overflow-x-auto bg-white dark:bg-neutral-900">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-neutral-100 dark:bg-neutral-800/60 border-b border-neutral-200 dark:border-neutral-800 text-neutral-500">
                    <th className="p-2 font-semibold">Método</th>
                    <th className="p-2 font-semibold">Ruta / URL</th>
                    <th className="p-2 font-semibold">Estado</th>
                    <th className="p-2 font-semibold">Tipo</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-200 dark:divide-neutral-800 text-neutral-700 dark:text-neutral-300">
                  <tr className="hover:bg-neutral-50 dark:hover:bg-neutral-800/40">
                    <td className="p-2 font-bold text-emerald-600 dark:text-emerald-400">GET</td>
                    <td className="p-2 font-mono">/api/mock/invoices?id=1042</td>
                    <td className="p-2"><span className="px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold">200 OK</span></td>
                    <td className="p-2 text-neutral-500">json</td>
                  </tr>
                  <tr className="hover:bg-neutral-50 dark:hover:bg-neutral-800/40">
                    <td className="p-2 font-bold text-emerald-600 dark:text-emerald-400">GET</td>
                    <td className="p-2 font-mono">/api/mock/invoices?id=1001</td>
                    <td className="p-2"><span className="px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold">200 OK</span></td>
                    <td className="p-2 text-neutral-500">json (IDOR)</td>
                  </tr>
                  <tr className="hover:bg-neutral-50 dark:hover:bg-neutral-800/40">
                    <td className="p-2 font-bold text-sky-600 dark:text-sky-400">POST</td>
                    <td className="p-2 font-mono">/api/mock/auth</td>
                    <td className="p-2"><span className="px-1.5 py-0.5 rounded bg-rose-500/10 text-rose-600 dark:text-rose-400 font-bold">401 Unauthorized</span></td>
                    <td className="p-2 text-neutral-500">json</td>
                  </tr>
                  <tr className="hover:bg-neutral-50 dark:hover:bg-neutral-800/40">
                    <td className="p-2 font-bold text-emerald-600 dark:text-emerald-400">GET</td>
                    <td className="p-2 font-mono">/api/mock/staff?dept=security</td>
                    <td className="p-2"><span className="px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold">200 OK</span></td>
                    <td className="p-2 text-neutral-500">json</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* PESTAÑA APPLICATION (COOKIES Y STORAGE) */}
        {activeTab === 'application' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-neutral-200 dark:border-neutral-800 pb-2">
              <span className="text-neutral-500 uppercase text-[11px] font-bold">
                Almacenamiento Local (Cookies y SessionStorage):
              </span>
              <button
                onClick={refreshStorage}
                type="button"
                className="text-[11px] text-emerald-600 dark:text-emerald-400 hover:underline cursor-pointer"
              >
                Actualizar valores
              </button>
            </div>

            {/* Cookies */}
            <div className="space-y-2">
              <span className="text-neutral-700 dark:text-neutral-300 font-bold text-xs flex items-center gap-1.5">
                <HardDrive className="w-3.5 h-3.5 text-amber-500" />
                <span>Cookies de la aplicación (document.cookie)</span>
              </span>

              <div className="border border-neutral-200 dark:border-neutral-800 rounded-lg overflow-hidden bg-white dark:bg-neutral-900">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-neutral-100 dark:bg-neutral-800/60 border-b border-neutral-200 dark:border-neutral-800 text-neutral-500">
                      <th className="p-2 font-semibold w-1/3">Nombre</th>
                      <th className="p-2 font-semibold">Valor</th>
                      <th className="p-2 font-semibold w-20">Acción</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-200 dark:divide-neutral-800">
                    {cookieList.map((c) => (
                      <tr key={c.key} className="hover:bg-neutral-50 dark:hover:bg-neutral-800/40">
                        <td className="p-2 font-bold text-cyan-700 dark:text-cyan-400">{c.key}</td>
                        <td className="p-2 break-all font-mono text-[11px]">
                          {editingCookieKey === c.key ? (
                            <input
                              type="text"
                              value={editingCookieVal}
                              onChange={(e) => setEditingCookieVal(e.target.value)}
                              className="w-full px-1.5 py-0.5 border rounded bg-white dark:bg-neutral-950 font-mono text-xs"
                            />
                          ) : (
                            c.value
                          )}
                        </td>
                        <td className="p-2">
                          {editingCookieKey === c.key ? (
                            <button
                              onClick={() => handleSaveCookie(c.key, editingCookieVal)}
                              type="button"
                              className="px-2 py-0.5 bg-emerald-600 text-white rounded text-[10px] font-bold"
                            >
                              Guardar
                            </button>
                          ) : (
                            <button
                              onClick={() => {
                                setEditingCookieKey(c.key);
                                setEditingCookieVal(c.value);
                              }}
                              type="button"
                              className="text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-200"
                              title="Editar cookie"
                            >
                              <Edit2 className="w-3 h-3" />
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Session Storage */}
            <div className="space-y-2 pt-2">
              <span className="text-neutral-700 dark:text-neutral-300 font-bold text-xs flex items-center gap-1.5">
                <HardDrive className="w-3.5 h-3.5 text-cyan-500" />
                <span>Session Storage</span>
              </span>

              <div className="border border-neutral-200 dark:border-neutral-800 rounded-lg overflow-hidden bg-white dark:bg-neutral-900">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-neutral-100 dark:bg-neutral-800/60 border-b border-neutral-200 dark:border-neutral-800 text-neutral-500">
                      <th className="p-2 font-semibold w-1/3">Clave</th>
                      <th className="p-2 font-semibold">Valor</th>
                      <th className="p-2 font-semibold w-20">Acción</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-200 dark:divide-neutral-800">
                    {storageList.map((s) => (
                      <tr key={s.key} className="hover:bg-neutral-50 dark:hover:bg-neutral-800/40">
                        <td className="p-2 font-bold text-amber-700 dark:text-amber-400">{s.key}</td>
                        <td className="p-2 break-all font-mono text-[11px]">
                          {editingStorageKey === s.key ? (
                            <input
                              type="text"
                              value={editingStorageVal}
                              onChange={(e) => setEditingStorageVal(e.target.value)}
                              className="w-full px-1.5 py-0.5 border rounded bg-white dark:bg-neutral-950 font-mono text-xs"
                            />
                          ) : (
                            s.value
                          )}
                        </td>
                        <td className="p-2">
                          {editingStorageKey === s.key ? (
                            <button
                              onClick={() => handleSaveStorage(s.key, editingStorageVal)}
                              type="button"
                              className="px-2 py-0.5 bg-emerald-600 text-white rounded text-[10px] font-bold"
                            >
                              Guardar
                            </button>
                          ) : (
                            <button
                              onClick={() => {
                                setEditingStorageKey(s.key);
                                setEditingStorageVal(s.value);
                              }}
                              type="button"
                              className="text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-200"
                              title="Editar almacenamiento"
                            >
                              <Edit2 className="w-3 h-3" />
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>
    </section>
  );
};
