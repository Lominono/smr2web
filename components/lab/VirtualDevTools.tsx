'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Code,
  Terminal,
  Wifi,
  HardDrive,
  X,
  Maximize2,
  Minimize2,
  Trash2,
  Plus,
  Edit2,
  Check,
  AlertCircle,
  Eye,
  Crosshair,
  Columns,
  Rows,
  ChevronRight,
  ChevronDown,
  RefreshCw,
  Search,
  ArrowRight,
} from 'lucide-react';
import { sound } from '@/lib/audio';

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

interface NetworkRequest {
  id: string;
  method: string;
  url: string;
  status: number;
  statusText: string;
  headers: Record<string, string>;
  requestHeaders: Record<string, string>;
  requestBody?: string;
  responseBody: string;
  timestamp: number;
}

interface DOMNodeInfo {
  id: string;
  tagName: string;
  idAttr: string;
  classes: string;
  attributes: Record<string, string>;
  textContent: string;
  hasChildren: boolean;
  isComment?: boolean;
}

export const VirtualDevTools: React.FC<VirtualDevToolsProps> = ({
  isOpen,
  onClose,
  currentLevelId,
}) => {
  const [activeTab, setActiveTab] = useState<'elements' | 'console' | 'network' | 'application'>('elements');
  const [dockPosition, setDockPosition] = useState<'bottom' | 'right' | 'fullscreen'>('bottom');
  const [isPickerActive, setIsPickerActive] = useState(false);
  const [hoveredElementInfo, setHoveredElementInfo] = useState<{
    rect: DOMRect;
    label: string;
  } | null>(null);

  // Estados de Elements
  const [selectedElement, setSelectedElement] = useState<HTMLElement | null>(null);
  const [selectedAttrs, setSelectedAttrs] = useState<Record<string, string>>({});
  const [newAttrName, setNewAttrName] = useState('');
  const [newAttrVal, setNewAttrVal] = useState('');
  const [domRefreshKey, setDomRefreshKey] = useState(0);

  // Estados de Console
  const [consoleLogs, setConsoleLogs] = useState<ConsoleLog[]>([
    {
      id: 'c-1',
      type: 'output',
      content: '// Consola DevTools activa. Ejecuta expresiones JS (document.cookie, sessionStorage, atob, btoa...).',
    },
  ]);
  const [consoleInput, setConsoleInput] = useState('');
  const [historyIndex, setHistoryIndex] = useState<number>(-1);
  const [cmdHistory, setCmdHistory] = useState<string[]>([]);
  const consoleBottomRef = useRef<HTMLDivElement>(null);

  // Estados de Network
  const [networkRequests, setNetworkRequests] = useState<NetworkRequest[]>([]);
  const [selectedReq, setSelectedReq] = useState<NetworkRequest | null>(null);
  const [networkSubTab, setNetworkSubTab] = useState<'headers' | 'payload' | 'response'>('headers');
  const [networkFilter, setNetworkFilter] = useState('');

  // Estados de Application / Storage
  const [cookieList, setCookieList] = useState<{ key: string; value: string }[]>([]);
  const [storageList, setStorageList] = useState<{ key: string; value: string }[]>([]);
  const [editingCookieKey, setEditingCookieKey] = useState<string | null>(null);
  const [editingCookieVal, setEditingCookieVal] = useState<string>('');
  const [editingStorageKey, setEditingStorageKey] = useState<string | null>(null);
  const [editingStorageVal, setEditingStorageVal] = useState<string>('');
  const [newCookieKey, setNewCookieKey] = useState('');
  const [newCookieVal, setNewCookieVal] = useState('');

  // Recarga de almacenamiento (cookies y sessionStorage)
  const refreshStorage = useCallback(() => {
    if (typeof document !== 'undefined') {
      const raw = document.cookie;
      if (raw) {
        const cookies = raw
          .split(';')
          .map((c) => {
            const [k, ...v] = c.trim().split('=');
            return { key: k, value: v.join('=') };
          })
          .filter((c) => c.key);
        setCookieList(cookies);
      } else {
        setCookieList([]);
      }
    }

    if (typeof window !== 'undefined') {
      const items: { key: string; value: string }[] = [];
      for (let i = 0; i < sessionStorage.length; i++) {
        const k = sessionStorage.key(i);
        if (k) items.push({ key: k, value: sessionStorage.getItem(k) || '' });
      }
      setStorageList(items);
    }
  }, []);

  // Escuchar peticiones HTTP virtuales emitidas por el laboratorio
  useEffect(() => {
    const handleNetReq = (e: any) => {
      const detail: NetworkRequest = e.detail;
      if (detail) {
        setNetworkRequests((prev) => [detail, ...prev.slice(0, 49)]);
      }
    };

    window.addEventListener('lab:network_request', handleNetReq);
    return () => window.removeEventListener('lab:network_request', handleNetReq);
  }, []);

  useEffect(() => {
    if (isOpen) {
      refreshStorage();
    }
  }, [isOpen, activeTab, refreshStorage]);

  // Sincronizar atributos del elemento seleccionado en Elements tab
  const refreshSelectedElementAttrs = useCallback(() => {
    if (!selectedElement) {
      setSelectedAttrs({});
      return;
    }
    const attrs: Record<string, string> = {};
    for (let i = 0; i < selectedElement.attributes.length; i++) {
      const attr = selectedElement.attributes[i];
      attrs[attr.name] = attr.value;
    }
    setSelectedAttrs(attrs);
  }, [selectedElement]);

  useEffect(() => {
    refreshSelectedElementAttrs();
  }, [selectedElement, domRefreshKey, refreshSelectedElementAttrs]);

  // Lógica del cursor selector de elementos (Inspect Picker)
  useEffect(() => {
    if (!isPickerActive || !isOpen) {
      setHoveredElementInfo(null);
      return;
    }

    const handleMouseMove = (e: MouseEvent) => {
      const container = document.getElementById('challenge-container');
      if (!container) return;

      const target = document.elementFromPoint(e.clientX, e.clientY) as HTMLElement | null;
      if (target && container.contains(target) && target !== container) {
        const rect = target.getBoundingClientRect();
        const tag = target.tagName.toLowerCase();
        const id = target.id ? `#${target.id}` : '';
        const cls = target.className && typeof target.className === 'string'
          ? `.${target.className.split(' ')[0]}`
          : '';
        setHoveredElementInfo({
          rect,
          label: `<${tag}${id}${cls}> | ${Math.round(rect.width)}x${Math.round(rect.height)}`,
        });
      } else {
        setHoveredElementInfo(null);
      }
    };

    const handleClick = (e: MouseEvent) => {
      const container = document.getElementById('challenge-container');
      if (!container) return;

      const target = document.elementFromPoint(e.clientX, e.clientY) as HTMLElement | null;
      if (target && container.contains(target) && target !== container) {
        e.preventDefault();
        e.stopPropagation();
        setSelectedElement(target);
        setActiveTab('elements');
        setIsPickerActive(false);
        setHoveredElementInfo(null);
        try {
          sound.tap();
        } catch {}
      }
    };

    window.addEventListener('mousemove', handleMouseMove, { passive: true });
    window.addEventListener('click', handleClick, { capture: true });
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('click', handleClick, { capture: true });
    };
  }, [isPickerActive, isOpen]);

  // Modificación en vivo de atributos DOM
  const handleRemoveAttribute = (attrName: string) => {
    if (!selectedElement) return;
    selectedElement.removeAttribute(attrName);
    if (attrName === 'disabled' && 'disabled' in selectedElement) {
      (selectedElement as any).disabled = false;
    }
    setDomRefreshKey((k) => k + 1);
    refreshSelectedElementAttrs();
    try {
      sound.tap();
    } catch {}
  };

  const handleUpdateAttribute = (attrName: string, val: string) => {
    if (!selectedElement) return;
    selectedElement.setAttribute(attrName, val);
    if (attrName === 'value' && 'value' in selectedElement) {
      (selectedElement as any).value = val;
      selectedElement.dispatchEvent(new Event('input', { bubbles: true }));
      selectedElement.dispatchEvent(new Event('change', { bubbles: true }));
    }
    setDomRefreshKey((k) => k + 1);
    refreshSelectedElementAttrs();
    try {
      sound.tap();
    } catch {}
  };

  const handleAddAttribute = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedElement || !newAttrName.trim()) return;
    handleUpdateAttribute(newAttrName.trim(), newAttrVal.trim());
    setNewAttrName('');
    setNewAttrVal('');
  };

  // Consola interactiva
  const handleConsoleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cmd = consoleInput.trim();
    if (!cmd) return;

    setCmdHistory((prev) => [...prev, cmd]);
    setHistoryIndex(-1);

    const inLog: ConsoleLog = {
      id: `in-${Date.now()}`,
      type: 'input',
      content: cmd,
    };

    let outLog: ConsoleLog;
    try {
      if (cmd === 'clear' || cmd === 'clear()') {
        setConsoleLogs([]);
        setConsoleInput('');
        return;
      }
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
        content: err?.message || 'Error al evaluar la instrucción en consola.',
      };
    }

    setConsoleLogs((prev) => [...prev, inLog, outLog]);
    setConsoleInput('');
    refreshStorage();
    setTimeout(() => {
      consoleBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 50);
  };

  const handleConsoleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (cmdHistory.length === 0) return;
      const nextIdx = historyIndex === -1 ? cmdHistory.length - 1 : Math.max(0, historyIndex - 1);
      setHistoryIndex(nextIdx);
      setConsoleInput(cmdHistory[nextIdx]);
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (cmdHistory.length === 0 || historyIndex === -1) return;
      const nextIdx = historyIndex + 1;
      if (nextIdx >= cmdHistory.length) {
        setHistoryIndex(-1);
        setConsoleInput('');
      } else {
        setHistoryIndex(nextIdx);
        setConsoleInput(cmdHistory[nextIdx]);
      }
    }
  };

  // Guardar cookies y storage
  const handleSaveCookie = (key: string, val: string) => {
    if (typeof document !== 'undefined') {
      document.cookie = `${key.trim()}=${val.trim()}; path=/; SameSite=Lax`;
      refreshStorage();
      setEditingCookieKey(null);
    }
  };

  const handleDeleteCookie = (key: string) => {
    if (typeof document !== 'undefined') {
      document.cookie = `${key}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT`;
      refreshStorage();
    }
  };

  const handleSaveStorage = (key: string, val: string) => {
    if (typeof window !== 'undefined') {
      sessionStorage.setItem(key.trim(), val.trim());
      refreshStorage();
      setEditingStorageKey(null);
    }
  };

  const handleDeleteStorage = (key: string) => {
    if (typeof window !== 'undefined') {
      sessionStorage.removeItem(key);
      refreshStorage();
    }
  };

  if (!isOpen) return null;

  // Filtrado de peticiones de red
  const filteredRequests = networkRequests.filter(
    (req) =>
      req.url.toLowerCase().includes(networkFilter.toLowerCase()) ||
      req.method.toLowerCase().includes(networkFilter.toLowerCase())
  );

  return (
    <>
      {/* Resaltado flotante del cursor al usar el selector de elementos */}
      {isPickerActive && hoveredElementInfo && (
        <div
          className="fixed pointer-events-none z-[100] border-2 border-cyan-500 bg-cyan-500/20 transition-all duration-75"
          style={{
            top: hoveredElementInfo.rect.top,
            left: hoveredElementInfo.rect.left,
            width: hoveredElementInfo.rect.width,
            height: hoveredElementInfo.rect.height,
          }}
        >
          <div className="absolute -top-6 left-0 px-1.5 py-0.5 rounded bg-cyan-600 text-white font-mono text-[10px] font-bold shadow whitespace-nowrap">
            {hoveredElementInfo.label}
          </div>
        </div>
      )}

      {/* Contenedor principal de VirtualDevTools */}
      <section
        aria-label="Herramientas de Desarrollador Integradas (Modo Inspeccionar)"
        className={`fixed z-50 border border-neutral-300 dark:border-neutral-800 bg-white/95 dark:bg-neutral-950/95 text-neutral-900 dark:text-neutral-100 shadow-2xl backdrop-blur flex flex-col font-mono text-xs transition-all duration-200 select-none ${
          dockPosition === 'fullscreen'
            ? 'inset-2 md:inset-4 rounded-2xl'
            : dockPosition === 'right'
            ? 'top-14 right-2 bottom-2 w-full sm:w-[32rem] max-w-[calc(100vw-1rem)] rounded-2xl'
            : 'inset-x-2 md:inset-x-8 bottom-0 h-96 md:h-[28rem] rounded-t-2xl'
        }`}
      >
        {/* Barra superior de pestañas y herramientas de DevTools */}
        <div className="flex items-center justify-between px-3 py-2 bg-neutral-100 dark:bg-neutral-900 border-b border-neutral-200 dark:border-neutral-800 rounded-t-2xl">
          <div className="flex items-center gap-1 sm:gap-1.5 overflow-x-auto">
            {/* Botón selector de elementos (Target Picker) */}
            <button
              onClick={() => setIsPickerActive(!isPickerActive)}
              type="button"
              className={`p-1.5 rounded-lg border flex items-center gap-1 cursor-pointer transition-all ${
                isPickerActive
                  ? 'bg-cyan-500 text-neutral-950 border-cyan-400 ring-2 ring-cyan-500/50 shadow-sm animate-pulse'
                  : 'bg-white dark:bg-neutral-950 hover:bg-neutral-200 dark:hover:bg-neutral-800 text-cyan-600 dark:text-cyan-400 border-neutral-200 dark:border-neutral-800'
              }`}
              title="Seleccionar un elemento de la página para inspeccionarlo"
            >
              <Crosshair className="w-3.5 h-3.5" />
              <span className="text-[10px] font-bold hidden sm:inline">Inspeccionar</span>
            </button>

            <div className="h-4 w-[1px] bg-neutral-300 dark:bg-neutral-800 mx-1" />

            <button
              onClick={() => setActiveTab('elements')}
              type="button"
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold cursor-pointer transition-colors ${
                activeTab === 'elements'
                  ? 'bg-white dark:bg-neutral-950 shadow-xs text-neutral-900 dark:text-neutral-100'
                  : 'text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-200'
              }`}
            >
              Elements
            </button>

            <button
              onClick={() => setActiveTab('console')}
              type="button"
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold cursor-pointer transition-colors ${
                activeTab === 'console'
                  ? 'bg-white dark:bg-neutral-950 shadow-xs text-neutral-900 dark:text-neutral-100'
                  : 'text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-200'
              }`}
            >
              Console
            </button>

            <button
              onClick={() => setActiveTab('network')}
              type="button"
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold cursor-pointer transition-colors flex items-center gap-1 ${
                activeTab === 'network'
                  ? 'bg-white dark:bg-neutral-950 shadow-xs text-neutral-900 dark:text-neutral-100'
                  : 'text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-200'
              }`}
            >
              <span>Network</span>
              {networkRequests.length > 0 && (
                <span className="px-1 py-0.2 rounded-full bg-cyan-500/20 text-cyan-700 dark:text-cyan-400 text-[10px] font-bold">
                  {networkRequests.length}
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveTab('application')}
              type="button"
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold cursor-pointer transition-colors ${
                activeTab === 'application'
                  ? 'bg-white dark:bg-neutral-950 shadow-xs text-neutral-900 dark:text-neutral-100'
                  : 'text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-200'
              }`}
            >
              Application
            </button>
          </div>

          {/* Opciones de anclaje (Docking) y cierre */}
          <div className="flex items-center gap-1">
            <button
              onClick={() => setDockPosition(dockPosition === 'right' ? 'bottom' : 'right')}
              type="button"
              className="p-1 hover:bg-neutral-200 dark:hover:bg-neutral-800 rounded text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200 cursor-pointer hidden md:inline-flex"
              title={dockPosition === 'right' ? 'Anclar abajo' : 'Anclar a la derecha'}
            >
              {dockPosition === 'right' ? <Rows className="w-3.5 h-3.5" /> : <Columns className="w-3.5 h-3.5" />}
            </button>

            <button
              onClick={() => setDockPosition(dockPosition === 'fullscreen' ? 'bottom' : 'fullscreen')}
              type="button"
              className="p-1 hover:bg-neutral-200 dark:hover:bg-neutral-800 rounded text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200 cursor-pointer"
              title={dockPosition === 'fullscreen' ? 'Restaurar' : 'Maximizar'}
            >
              {dockPosition === 'fullscreen' ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
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

        {/* Panel principal según pestaña activa */}
        <div className="flex-1 overflow-hidden p-3 font-mono text-xs select-text">
          
          {/* PESTAÑA ELEMENTS: ÁRBOL DOM Y EDITOR EN VIVO DE ATRIBUTOS */}
          {activeTab === 'elements' && (
            <div className="grid grid-cols-1 md:grid-cols-12 gap-3 h-full overflow-hidden">
              {/* Columna Izquierda: Árbol DOM del reto activo */}
              <div className="md:col-span-7 flex flex-col h-full bg-neutral-100 dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800 overflow-hidden">
                <div className="p-2.5 border-b border-neutral-200 dark:border-neutral-800 flex items-center justify-between text-neutral-500 text-[11px] font-bold">
                  <span>Árbol DOM (#challenge-container):</span>
                  <span className="text-[10px] text-neutral-400">
                    {isPickerActive ? 'Haz clic en el reto para seleccionar' : 'Usa el cursor 🎯 para elegir elemento'}
                  </span>
                </div>

                <div className="flex-1 overflow-y-auto p-3 space-y-1.5 leading-relaxed text-[11px]">
                  {/* Comentario HTML oculto de seguridad */}
                  <div className="p-2 rounded bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-400 font-mono">
                    &lt;!-- TODO AUDITORÍA: Ver /lab/robots.txt y /backup/staff_notes.txt --&gt;
                  </div>

                  <div className="text-neutral-700 dark:text-neutral-300">
                    &lt;<span className="text-rose-600 dark:text-rose-400">div</span> <span className="text-amber-600 dark:text-amber-400">id</span>=&quot;challenge-container&quot;&gt;
                  </div>

                  {currentLevelId === 2 && (
                    <div className="pl-4 space-y-1">
                      <div className="text-neutral-600 dark:text-neutral-400">
                        &lt;<span className="text-rose-600 dark:text-rose-400">form</span> <span className="text-amber-600 dark:text-amber-400">id</span>=&quot;checkoutForm&quot;&gt;
                      </div>
                      <div className="pl-4">
                        &lt;<span className="text-rose-600 dark:text-rose-400">input</span> <span className="text-amber-600 dark:text-amber-400">id</span>=&quot;checkoutPrice&quot; <span className="text-amber-600 dark:text-amber-400">value</span>=&quot;500&quot; /&gt;
                      </div>
                      <div className="pl-4">
                        &lt;<span className="text-rose-600 dark:text-rose-400">button</span> <span className="text-amber-600 dark:text-amber-400">id</span>=&quot;btnBuy&quot; <span className="text-rose-600 dark:text-rose-400 font-bold bg-rose-500/10 px-1 rounded">disabled</span>&gt;
                      </div>
                      <div className="text-neutral-600 dark:text-neutral-400">&lt;/<span className="text-rose-600 dark:text-rose-400">form</span>&gt;</div>
                    </div>
                  )}

                  {selectedElement && (
                    <div className="p-2 mt-2 rounded bg-cyan-500/10 border border-cyan-500/30 text-cyan-800 dark:text-cyan-300">
                      <div className="font-bold flex items-center gap-1.5">
                        <Eye className="w-3.5 h-3.5" />
                        <span>Nodo Inspeccionado: &lt;{selectedElement.tagName.toLowerCase()}&gt;</span>
                      </div>
                      <div className="text-[10px] text-neutral-500 mt-1">
                        Puedes editar o eliminar sus atributos directamente en el panel lateral derecho.
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Columna Derecha: Inspector y Editor en vivo de atributos */}
              <div className="md:col-span-5 flex flex-col h-full bg-neutral-100 dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800 overflow-hidden">
                <div className="p-2.5 border-b border-neutral-200 dark:border-neutral-800 flex items-center justify-between text-neutral-500 text-[11px] font-bold">
                  <span>Atributos del Nodo Seleccionado:</span>
                  <button
                    onClick={refreshSelectedElementAttrs}
                    type="button"
                    className="p-1 hover:text-neutral-900 dark:hover:text-neutral-100 cursor-pointer"
                    title="Refrescar atributos"
                  >
                    <RefreshCw className="w-3 h-3" />
                  </button>
                </div>

                <div className="flex-1 overflow-y-auto p-3 space-y-3">
                  {selectedElement ? (
                    <div className="space-y-3">
                      <div className="space-y-1.5">
                        <span className="text-[10px] uppercase font-bold text-neutral-400">
                          Atributos existentes (clic para eliminar o editar):
                        </span>
                        {Object.keys(selectedAttrs).length === 0 ? (
                          <div className="text-neutral-400 text-xs italic">El nodo no tiene atributos.</div>
                        ) : (
                          Object.entries(selectedAttrs).map(([name, val]) => (
                            <div
                              key={name}
                              className="p-2 bg-white dark:bg-neutral-950 rounded-lg border border-neutral-200 dark:border-neutral-800 flex items-center justify-between gap-2"
                            >
                              <div className="truncate font-mono">
                                <span className="text-amber-600 dark:text-amber-400 font-bold">{name}</span>
                                {val !== '' && (
                                  <>
                                    <span className="text-neutral-400">=</span>
                                    <span className="text-cyan-600 dark:text-cyan-400">&quot;{val}&quot;</span>
                                  </>
                                )}
                              </div>
                              <div className="flex items-center gap-1 shrink-0">
                                {name === 'value' && (
                                  <button
                                    onClick={() => handleUpdateAttribute(name, '0')}
                                    type="button"
                                    className="px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[10px] font-bold cursor-pointer hover:bg-emerald-500/20"
                                  >
                                    =0
                                  </button>
                                )}
                                <button
                                  onClick={() => handleRemoveAttribute(name)}
                                  type="button"
                                  className="p-1 rounded text-rose-500 hover:bg-rose-500/10 cursor-pointer"
                                  title={`Eliminar atributo ${name}`}
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>
                          ))
                        )}
                      </div>

                      {/* Añadir nuevo atributo */}
                      <form onSubmit={handleAddAttribute} className="p-2.5 rounded-lg bg-white dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 space-y-2">
                        <span className="text-[10px] uppercase font-bold text-neutral-400 block">
                          Añadir / Sobrescribir Atributo:
                        </span>
                        <div className="flex items-center gap-1.5">
                          <input
                            type="text"
                            value={newAttrName}
                            onChange={(e) => setNewAttrName(e.target.value)}
                            placeholder="Nombre (p. ej. value)"
                            className="flex-1 px-2 py-1 rounded border border-neutral-300 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-900 text-xs font-mono"
                          />
                          <input
                            type="text"
                            value={newAttrVal}
                            onChange={(e) => setNewAttrVal(e.target.value)}
                            placeholder="Valor"
                            className="flex-1 px-2 py-1 rounded border border-neutral-300 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-900 text-xs font-mono"
                          />
                          <button
                            type="submit"
                            className="p-1.5 rounded bg-emerald-600 text-white hover:bg-emerald-500 cursor-pointer"
                            title="Añadir atributo"
                          >
                            <Plus className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </form>
                    </div>
                  ) : (
                    <div className="h-full flex flex-col items-center justify-center text-center p-4 text-neutral-400 space-y-2">
                      <Crosshair className="w-6 h-6 text-neutral-400 stroke-[1.5]" />
                      <p className="text-xs">
                        Activa el botón <strong>Inspeccionar (🎯)</strong> arriba para seleccionar y manipular cualquier elemento en vivo.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* PESTAÑA CONSOLE: EJECUTOR JAVASCRIPT Y CONTROL DE SESIÓN */}
          {activeTab === 'console' && (
            <div className="flex flex-col h-full space-y-2">
              <div className="flex items-center justify-between border-b border-neutral-200 dark:border-neutral-800 pb-2">
                <span className="text-neutral-500 uppercase text-[11px] font-bold">
                  Consola JavaScript Interactiva (Contexto Seguro):
                </span>
                <button
                  onClick={() => setConsoleLogs([])}
                  type="button"
                  className="text-[10px] text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 cursor-pointer flex items-center gap-1"
                >
                  <Trash2 className="w-3 h-3" />
                  <span>Limpiar</span>
                </button>
              </div>

              {/* Registro de logs */}
              <div className="flex-1 overflow-y-auto space-y-1.5 p-3 bg-neutral-100 dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800 select-text">
                {consoleLogs.map((log) => (
                  <div key={log.id} className="text-xs">
                    {log.type === 'input' && (
                      <div className="text-emerald-700 dark:text-emerald-400 font-bold flex items-start gap-1.5">
                        <span className="select-none">&gt;</span>
                        <span className="break-all">{log.content}</span>
                      </div>
                    )}
                    {log.type === 'output' && (
                      <pre className="text-neutral-800 dark:text-neutral-200 pl-4 whitespace-pre-wrap break-all font-mono">
                        {log.content}
                      </pre>
                    )}
                    {log.type === 'error' && (
                      <div className="text-rose-600 dark:text-rose-400 pl-4 font-semibold break-all">
                        ✕ {log.content}
                      </div>
                    )}
                  </div>
                ))}
                <div ref={consoleBottomRef} />
              </div>

              {/* Píldoras de expresiones rápidas */}
              <div className="flex flex-wrap items-center gap-1.5 font-mono text-[10px]">
                <span className="text-neutral-400">Atajos rápidos:</span>
                <button
                  onClick={() => setConsoleInput('document.cookie')}
                  type="button"
                  className="px-2 py-0.5 rounded bg-neutral-200 dark:bg-neutral-800 hover:bg-neutral-300 dark:hover:bg-neutral-700 text-neutral-700 dark:text-neutral-300 cursor-pointer"
                >
                  document.cookie
                </button>
                <button
                  onClick={() => setConsoleInput('sessionStorage.getItem("lab_user_balance")')}
                  type="button"
                  className="px-2 py-0.5 rounded bg-neutral-200 dark:bg-neutral-800 hover:bg-neutral-300 dark:hover:bg-neutral-700 text-neutral-700 dark:text-neutral-300 cursor-pointer"
                >
                  sessionStorage
                </button>
                <button
                  onClick={() => setConsoleInput('atob("eyJ1c2VyIjoic3R1ZGVudCIsInJvbGUiOiJndWVzdCJ9")')}
                  type="button"
                  className="px-2 py-0.5 rounded bg-neutral-200 dark:bg-neutral-800 hover:bg-neutral-300 dark:hover:bg-neutral-700 text-neutral-700 dark:text-neutral-300 cursor-pointer"
                >
                  atob(...)
                </button>
                <button
                  onClick={() => setConsoleInput('btoa(JSON.stringify({ user: "student", role: "admin" }))')}
                  type="button"
                  className="px-2 py-0.5 rounded bg-neutral-200 dark:bg-neutral-800 hover:bg-neutral-300 dark:hover:bg-neutral-700 text-neutral-700 dark:text-neutral-300 cursor-pointer"
                >
                  btoa(admin)
                </button>
              </div>

              {/* Input de consola */}
              <form onSubmit={handleConsoleSubmit} className="flex items-center gap-2 pt-0.5">
                <span className="text-emerald-600 dark:text-emerald-400 font-bold">&gt;</span>
                <input
                  type="text"
                  value={consoleInput}
                  onChange={(e) => setConsoleInput(e.target.value)}
                  onKeyDown={handleConsoleKeyDown}
                  placeholder="Introduce código JS (ej: document.cookie ó btoa(...))"
                  className="flex-1 px-3 py-1.5 rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100 font-mono text-xs focus:outline-none focus:border-emerald-500"
                />
                <button
                  type="submit"
                  className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-lg cursor-pointer text-xs transition-colors"
                >
                  Evaluar
                </button>
              </form>
            </div>
          )}

          {/* PESTAÑA NETWORK: INSPECTOR DE PETICIONES HTTP EN TIEMPO REAL */}
          {activeTab === 'network' && (
            <div className="grid grid-cols-1 md:grid-cols-12 gap-3 h-full overflow-hidden">
              {/* Tabla de Peticiones */}
              <div className="md:col-span-7 flex flex-col h-full bg-neutral-100 dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800 overflow-hidden">
                <div className="p-2 border-b border-neutral-200 dark:border-neutral-800 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5 flex-1">
                    <Search className="w-3.5 h-3.5 text-neutral-400 shrink-0" />
                    <input
                      type="text"
                      value={networkFilter}
                      onChange={(e) => setNetworkFilter(e.target.value)}
                      placeholder="Filtrar por ruta o método..."
                      className="w-full bg-transparent border-none text-xs focus:outline-none text-neutral-900 dark:text-neutral-100"
                    />
                  </div>
                  <button
                    onClick={() => setNetworkRequests([])}
                    type="button"
                    className="p-1 hover:text-neutral-800 dark:hover:text-neutral-100 text-neutral-400 cursor-pointer"
                    title="Limpiar registro de red"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="flex-1 overflow-y-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-neutral-200/60 dark:bg-neutral-800/60 border-b border-neutral-200 dark:border-neutral-800 text-neutral-500 text-[10px]">
                        <th className="p-2 font-semibold">Estado</th>
                        <th className="p-2 font-semibold">Método</th>
                        <th className="p-2 font-semibold">Ruta</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-200 dark:divide-neutral-800 text-neutral-700 dark:text-neutral-300">
                      {filteredRequests.length === 0 ? (
                        <tr>
                          <td colSpan={3} className="p-4 text-center text-neutral-400 italic">
                            No hay peticiones registradas aún. Interactúa con el reto (p. ej. consultar factura) para registrar tráfico HTTP.
                          </td>
                        </tr>
                      ) : (
                        filteredRequests.map((req) => (
                          <tr
                            key={req.id}
                            onClick={() => setSelectedReq(req)}
                            className={`cursor-pointer transition-colors ${
                              selectedReq?.id === req.id
                                ? 'bg-cyan-500/15 dark:bg-cyan-500/25 font-bold'
                                : 'hover:bg-neutral-200/50 dark:hover:bg-neutral-800/40'
                            }`}
                          >
                            <td className="p-2">
                              <span
                                className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                                  req.status === 200
                                    ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                                    : 'bg-rose-500/15 text-rose-600 dark:text-rose-400'
                                }`}
                              >
                                {req.status}
                              </span>
                            </td>
                            <td className="p-2 font-bold text-neutral-900 dark:text-neutral-100">
                              {req.method}
                            </td>
                            <td className="p-2 font-mono truncate max-w-[14rem]">
                              {req.url}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Panel de Detalle de la Petición Seleccionada */}
              <div className="md:col-span-5 flex flex-col h-full bg-neutral-100 dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800 overflow-hidden">
                {selectedReq ? (
                  <div className="flex flex-col h-full">
                    {/* Sub-pestañas de detalle */}
                    <div className="flex items-center gap-1 p-1.5 border-b border-neutral-200 dark:border-neutral-800 bg-neutral-200/40 dark:bg-neutral-800/40">
                      <button
                        onClick={() => setNetworkSubTab('headers')}
                        type="button"
                        className={`px-2 py-0.5 rounded text-[11px] font-bold cursor-pointer ${
                          networkSubTab === 'headers'
                            ? 'bg-white dark:bg-neutral-950 text-neutral-900 dark:text-neutral-100'
                            : 'text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-100'
                        }`}
                      >
                        Headers
                      </button>
                      <button
                        onClick={() => setNetworkSubTab('payload')}
                        type="button"
                        className={`px-2 py-0.5 rounded text-[11px] font-bold cursor-pointer ${
                          networkSubTab === 'payload'
                            ? 'bg-white dark:bg-neutral-950 text-neutral-900 dark:text-neutral-100'
                            : 'text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-100'
                        }`}
                      >
                        Payload
                      </button>
                      <button
                        onClick={() => setNetworkSubTab('response')}
                        type="button"
                        className={`px-2 py-0.5 rounded text-[11px] font-bold cursor-pointer ${
                          networkSubTab === 'response'
                            ? 'bg-white dark:bg-neutral-950 text-neutral-900 dark:text-neutral-100'
                            : 'text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-100'
                        }`}
                      >
                        Response
                      </button>
                    </div>

                    <div className="flex-1 overflow-y-auto p-3 space-y-3 font-mono text-[11px]">
                      {networkSubTab === 'headers' && (
                        <div className="space-y-3">
                          <div>
                            <span className="text-[10px] font-bold uppercase text-neutral-400 block mb-1">
                              General:
                            </span>
                            <div className="p-2 rounded bg-white dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 space-y-1">
                              <div><strong>URL:</strong> {selectedReq.url}</div>
                              <div><strong>Método:</strong> {selectedReq.method}</div>
                              <div><strong>Estado:</strong> {selectedReq.status} {selectedReq.statusText}</div>
                            </div>
                          </div>

                          <div>
                            <span className="text-[10px] font-bold uppercase text-neutral-400 block mb-1">
                              Response Headers:
                            </span>
                            <div className="p-2 rounded bg-white dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 space-y-0.5 text-neutral-600 dark:text-neutral-400">
                              {Object.entries(selectedReq.headers).map(([k, v]) => (
                                <div key={k}><strong className="text-neutral-800 dark:text-neutral-200">{k}:</strong> {v}</div>
                              ))}
                            </div>
                          </div>
                        </div>
                      )}

                      {networkSubTab === 'payload' && (
                        <div className="space-y-2">
                          <span className="text-[10px] font-bold uppercase text-neutral-400 block">
                            Parámetros / Cuerpo de la Solicitud:
                          </span>
                          <div className="p-2 rounded bg-white dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 whitespace-pre-wrap break-all">
                            {selectedReq.url.includes('?') ? (
                              <div>
                                <span className="text-cyan-600 dark:text-cyan-400 font-bold">Query Parameters:</span>
                                <div className="mt-1 pl-2">
                                  {selectedReq.url.split('?')[1]}
                                </div>
                              </div>
                            ) : selectedReq.requestBody ? (
                              selectedReq.requestBody
                            ) : (
                              <span className="text-neutral-400 italic">Sin cuerpo ni parámetros en la petición.</span>
                            )}
                          </div>
                        </div>
                      )}

                      {networkSubTab === 'response' && (
                        <div className="space-y-2">
                          <span className="text-[10px] font-bold uppercase text-neutral-400 block">
                            Cuerpo de Respuesta HTTP:
                          </span>
                          <pre className="p-2.5 rounded bg-white dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 whitespace-pre-wrap break-all text-neutral-800 dark:text-neutral-200 leading-relaxed">
                            {selectedReq.responseBody}
                          </pre>
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="h-full flex flex-col items-center justify-center p-4 text-center text-neutral-400">
                    <Wifi className="w-6 h-6 mb-2 stroke-[1.5]" />
                    <p className="text-xs">Selecciona una petición en la tabla para examinar sus cabeceras y parámetros.</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* PESTAÑA APPLICATION: GESTIÓN DE COOKIES Y SESSIONSTORAGE */}
          {activeTab === 'application' && (
            <div className="flex flex-col h-full space-y-3 overflow-y-auto">
              {/* Sección de Cookies */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-xs text-neutral-800 dark:text-neutral-200 flex items-center gap-1.5">
                    <HardDrive className="w-3.5 h-3.5 text-amber-500" />
                    <span>Cookies (document.cookie)</span>
                  </span>
                  <button
                    onClick={refreshStorage}
                    type="button"
                    className="text-[11px] text-emerald-600 dark:text-emerald-400 hover:underline cursor-pointer"
                  >
                    Actualizar
                  </button>
                </div>

                <div className="border border-neutral-200 dark:border-neutral-800 rounded-xl overflow-hidden bg-neutral-100 dark:bg-neutral-900">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-neutral-200/60 dark:bg-neutral-800/60 border-b border-neutral-200 dark:border-neutral-800 text-neutral-500 text-[10px]">
                        <th className="p-2 font-semibold w-1/3">Nombre</th>
                        <th className="p-2 font-semibold">Valor</th>
                        <th className="p-2 font-semibold w-24">Acciones</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-200 dark:divide-neutral-800">
                      {cookieList.map((c) => (
                        <tr key={c.key} className="hover:bg-neutral-200/40 dark:hover:bg-neutral-800/40">
                          <td className="p-2 font-bold text-cyan-700 dark:text-cyan-400">{c.key}</td>
                          <td className="p-2 break-all font-mono text-[11px]">
                            {editingCookieKey === c.key ? (
                              <input
                                type="text"
                                value={editingCookieVal}
                                onChange={(e) => setEditingCookieVal(e.target.value)}
                                className="w-full px-2 py-0.5 border rounded bg-white dark:bg-neutral-950 font-mono text-xs"
                              />
                            ) : (
                              c.value
                            )}
                          </td>
                          <td className="p-2">
                            <div className="flex items-center gap-1.5">
                              {editingCookieKey === c.key ? (
                                <button
                                  onClick={() => handleSaveCookie(c.key, editingCookieVal)}
                                  type="button"
                                  className="px-2 py-0.5 bg-emerald-600 text-white rounded text-[10px] font-bold cursor-pointer"
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
                                  className="p-1 text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-100 cursor-pointer"
                                  title="Editar cookie"
                                >
                                  <Edit2 className="w-3 h-3" />
                                </button>
                              )}
                              <button
                                onClick={() => handleDeleteCookie(c.key)}
                                type="button"
                                className="p-1 text-rose-500 hover:bg-rose-500/10 rounded cursor-pointer"
                                title="Eliminar cookie"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Sección de SessionStorage */}
              <div className="space-y-2 pt-2">
                <span className="font-bold text-xs text-neutral-800 dark:text-neutral-200 flex items-center gap-1.5">
                  <HardDrive className="w-3.5 h-3.5 text-cyan-500" />
                  <span>Session Storage</span>
                </span>

                <div className="border border-neutral-200 dark:border-neutral-800 rounded-xl overflow-hidden bg-neutral-100 dark:bg-neutral-900">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-neutral-200/60 dark:bg-neutral-800/60 border-b border-neutral-200 dark:border-neutral-800 text-neutral-500 text-[10px]">
                        <th className="p-2 font-semibold w-1/3">Clave</th>
                        <th className="p-2 font-semibold">Valor</th>
                        <th className="p-2 font-semibold w-24">Acciones</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-200 dark:divide-neutral-800">
                      {storageList.map((s) => (
                        <tr key={s.key} className="hover:bg-neutral-200/40 dark:hover:bg-neutral-800/40">
                          <td className="p-2 font-bold text-amber-700 dark:text-amber-400">{s.key}</td>
                          <td className="p-2 break-all font-mono text-[11px]">
                            {editingStorageKey === s.key ? (
                              <input
                                type="text"
                                value={editingStorageVal}
                                onChange={(e) => setEditingStorageVal(e.target.value)}
                                className="w-full px-2 py-0.5 border rounded bg-white dark:bg-neutral-950 font-mono text-xs"
                              />
                            ) : (
                              s.value
                            )}
                          </td>
                          <td className="p-2">
                            <div className="flex items-center gap-1.5">
                              {editingStorageKey === s.key ? (
                                <button
                                  onClick={() => handleSaveStorage(s.key, editingStorageVal)}
                                  type="button"
                                  className="px-2 py-0.5 bg-emerald-600 text-white rounded text-[10px] font-bold cursor-pointer"
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
                                  className="p-1 text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-100 cursor-pointer"
                                  title="Editar clave"
                                >
                                  <Edit2 className="w-3 h-3" />
                                </button>
                              )}
                              <button
                                onClick={() => handleDeleteStorage(s.key)}
                                type="button"
                                className="p-1 text-rose-500 hover:bg-rose-500/10 rounded cursor-pointer"
                                title="Eliminar clave"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            </div>
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
    </>
  );
};
