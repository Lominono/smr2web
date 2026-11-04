'use client';

import React, { useState, useEffect } from 'react';
import {
  Lock,
  Unlock,
  Eye,
  EyeOff,
  Loader2,
  X,
  Clock,
  Sparkles,
  LogIn,
  RotateCcw,
  Gauge,
  ChevronDown,
  Play,
  Copy,
  Check,
  Sliders,
} from 'lucide-react';
import { PRELAUNCH_STORAGE_KEY } from '@/lib/prelaunchConstants';

export type DevLaunchState = 'countdown' | 'welcome' | 'loading' | 'auth' | 'app';

interface LaunchDevToolbarProps {
  isAdmin: boolean;
  onAdminAuthSuccess: () => void;
  onLockAdmin: () => void;
  currentState: DevLaunchState;
  onSetState: (state: DevLaunchState) => void;
  onTestCountdown: (seconds: number) => void;
  onReplayWelcome: () => void;
  speedMultiplier: number;
  onSetSpeed: (speed: number) => void;
}

export const LaunchDevToolbar: React.FC<LaunchDevToolbarProps> = ({
  isAdmin,
  onAdminAuthSuccess,
  onLockAdmin,
  currentState,
  onSetState,
  onTestCountdown,
  onReplayWelcome,
  speedMultiplier,
  onSetSpeed,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // Escuchador global de atajos de teclado para Administradores
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignorar si el usuario está escribiendo en campos de texto normales
      if (
        (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) &&
        !showAuthModal
      ) {
        return;
      }

      // Atajos de acceso al panel de Debug de Administrador
      const isDebugShortcut =
        (e.altKey && (e.key === 'D' || e.key === 'd')) ||
        e.key === 'F2' ||
        e.key === '`' ||
        e.key === '~' ||
        (e.ctrlKey && e.key === '.') ||
        (e.ctrlKey && e.altKey && e.shiftKey && (e.key === 'D' || e.key === 'd'));

      if (isDebugShortcut) {
        e.preventDefault();
        if (isAdmin) {
          setIsOpen((prev) => !prev);
        } else {
          setShowAuthModal(true);
          setAuthError(null);
        }
        return;
      }

      // Cerrar modal con Escape
      if (e.key === 'Escape' && showAuthModal) {
        setShowAuthModal(false);
        setPassword('');
        setAuthError(null);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isAdmin, showAuthModal]);

  // Escuchar evento personalizado emitido desde la app (ej: 5 clics en logo)
  useEffect(() => {
    const handleOpenAdminTrigger = () => {
      if (isAdmin) {
        setIsOpen(true);
      } else {
        setShowAuthModal(true);
        setAuthError(null);
      }
    };

    window.addEventListener('smr2_open_admin_gate', handleOpenAdminTrigger);
    return () => window.removeEventListener('smr2_open_admin_gate', handleOpenAdminTrigger);
  }, [isAdmin]);

  // Validación de contraseña de administrador con el endpoint seguro
  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanPass = password.trim();
    if (!cleanPass || isLoading) return;

    setIsLoading(true);
    setAuthError(null);

    try {
      const res = await fetch('/api/prelaunch/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: cleanPass }),
      });

      const data = await res.json().catch(() => ({}));

      if (res.ok && data.success && data.token) {
        try {
          localStorage.setItem(PRELAUNCH_STORAGE_KEY, data.token);
        } catch {}
        setShowAuthModal(false);
        setPassword('');
        setIsOpen(true);
        onAdminAuthSuccess();
      } else {
        setAuthError(data.error || 'Clave de administrador incorrecta.');
      }
    } catch {
      setAuthError('Error de enlace con el servidor de seguridad.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleLock = () => {
    setIsOpen(false);
    onLockAdmin();
  };

  const handleCopyPreviewLink = (state: DevLaunchState) => {
    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href);
      url.searchParams.set('preview', state);
      navigator.clipboard.writeText(url.toString()).then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      });
    }
  };

  return (
    <>
      {/* 1. MODAL DE AUTENTICACIÓN MINIMALISTA (Estilo Command Palette) */}
      {showAuthModal && (
        <div
          role="dialog"
          aria-modal="true"
          onClick={() => {
            setShowAuthModal(false);
            setPassword('');
            setAuthError(null);
          }}
          className="fixed inset-0 z-[10050] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150 select-none font-sans"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-sm bg-neutral-950 border border-neutral-800 rounded-2xl p-5 text-left text-neutral-200 shadow-2xl relative space-y-4"
          >
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-sm font-semibold text-white tracking-tight">
                  Acceso de Administrador
                </h3>
                <p className="text-xs text-neutral-500 mt-0.5">
                  Introduce la clave maestra para activar el modo debug.
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowAuthModal(false);
                  setPassword('');
                  setAuthError(null);
                }}
                className="text-neutral-500 hover:text-neutral-300 p-1 cursor-pointer transition-colors"
                title="Cerrar (Esc)"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAuthSubmit} className="space-y-3 pt-1">
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (authError) setAuthError(null);
                  }}
                  placeholder="Contraseña..."
                  autoFocus
                  disabled={isLoading}
                  className="w-full text-xs font-mono bg-neutral-900 border border-neutral-800 rounded-lg px-3 py-2.5 pr-9 text-white placeholder-neutral-600 focus:outline-none focus:border-neutral-600 transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-neutral-500 hover:text-neutral-300 p-0.5 cursor-pointer"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                </button>
              </div>

              {authError && (
                <div className="p-2 rounded-lg bg-red-950/30 border border-red-900/40 text-xs text-red-300">
                  {authError}
                </div>
              )}

              <div className="flex items-center justify-between pt-1 text-[11px] text-neutral-500 font-mono">
                <span>Atajo: Alt+D o F2</span>
                <button
                  type="submit"
                  disabled={isLoading || !password.trim()}
                  className="px-4 py-2 bg-white hover:bg-neutral-200 text-neutral-950 font-medium text-xs rounded-lg transition-all inline-flex items-center gap-1.5 cursor-pointer disabled:opacity-40"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Verificando...</span>
                    </>
                  ) : (
                    <span>Desbloquear</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 2. BARRA DE HERRAMIENTAS DEV (Visible únicamente cuando isAdmin === true) */}
      {isAdmin && (
        <aside
          aria-label="Herramientas de depuración"
          className="fixed bottom-4 right-4 z-[10020] font-sans select-none"
        >
          {!isOpen ? (
            <button
              type="button"
              onClick={() => setIsOpen(true)}
              className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-neutral-900/90 hover:bg-neutral-800 text-neutral-400 hover:text-neutral-200 border border-neutral-800 backdrop-blur-md shadow-lg text-xs font-mono transition-all active:scale-95 cursor-pointer group"
              title="Panel de Admin (Alt + D / F2)"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-neutral-400" />
              <span>Debug · {currentState}</span>
            </button>
          ) : (
            <div className="w-80 bg-neutral-950/95 backdrop-blur-xl border border-neutral-800 rounded-2xl p-4 shadow-2xl text-neutral-200 space-y-3.5 animate-in fade-in slide-in-from-bottom-2 duration-150">
              {/* Header */}
              <div className="flex items-center justify-between pb-2 border-b border-neutral-900">
                <div className="flex items-center gap-2">
                  <Sliders className="w-3.5 h-3.5 text-neutral-400" />
                  <span className="text-xs font-semibold text-white">Debug & Preview</span>
                </div>
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="p-1 text-neutral-500 hover:text-white rounded hover:bg-neutral-900 transition-colors cursor-pointer"
                  title="Minimizar"
                >
                  <ChevronDown className="w-4 h-4" />
                </button>
              </div>

              {/* Selector de Escenas / Segmented Control */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-mono uppercase tracking-wider text-neutral-500 block">
                  Estado Activo
                </label>
                <div className="grid grid-cols-4 gap-1 bg-neutral-900 p-1 rounded-xl border border-neutral-800/80">
                  <button
                    type="button"
                    onClick={() => onSetState('countdown')}
                    className={`py-1.5 rounded-lg text-[10px] font-medium transition-all cursor-pointer ${
                      currentState === 'countdown'
                        ? 'bg-neutral-800 text-white shadow-sm'
                        : 'text-neutral-400 hover:text-neutral-200'
                    }`}
                  >
                    Contador
                  </button>

                  <button
                    type="button"
                    onClick={() => onSetState('welcome')}
                    className={`py-1.5 rounded-lg text-[10px] font-medium transition-all cursor-pointer ${
                      currentState === 'welcome'
                        ? 'bg-neutral-800 text-white shadow-sm'
                        : 'text-neutral-400 hover:text-neutral-200'
                    }`}
                  >
                    Bienvenida
                  </button>

                  <button
                    type="button"
                    onClick={() => onSetState('loading')}
                    className={`py-1.5 rounded-lg text-[10px] font-medium transition-all cursor-pointer ${
                      currentState === 'loading'
                        ? 'bg-neutral-800 text-white shadow-sm'
                        : 'text-neutral-400 hover:text-neutral-200'
                    }`}
                  >
                    Carga Mac
                  </button>

                  <button
                    type="button"
                    onClick={() => onSetState('auth')}
                    className={`py-1.5 rounded-lg text-[10px] font-medium transition-all cursor-pointer ${
                      currentState === 'auth'
                        ? 'bg-neutral-800 text-white shadow-sm'
                        : 'text-neutral-400 hover:text-neutral-200'
                    }`}
                  >
                    Login
                  </button>
                </div>
              </div>

              {/* Acciones de Simulación */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-mono uppercase tracking-wider text-neutral-500 block">
                  Simulación
                </label>
                <div className="space-y-1.5">
                  <button
                    type="button"
                    onClick={() => onTestCountdown(3)}
                    className="w-full px-3 py-2 rounded-lg bg-neutral-900 hover:bg-neutral-800/80 border border-neutral-800 text-neutral-200 text-xs font-medium flex items-center justify-between transition-colors cursor-pointer"
                  >
                    <div className="flex items-center gap-2">
                      <Play className="w-3.5 h-3.5 text-neutral-400" />
                      <span>Simular fin del contador</span>
                    </div>
                    <span className="text-[10px] text-neutral-500 font-mono">3 seg</span>
                  </button>

                  <button
                    type="button"
                    onClick={onReplayWelcome}
                    className="w-full px-3 py-2 rounded-lg bg-neutral-900 hover:bg-neutral-800/80 border border-neutral-800 text-neutral-200 text-xs font-medium flex items-center justify-between transition-colors cursor-pointer"
                  >
                    <div className="flex items-center gap-2">
                      <RotateCcw className="w-3.5 h-3.5 text-neutral-400" />
                      <span>Reiniciar bienvenida</span>
                    </div>
                    <span className="text-[10px] text-neutral-500 font-mono">Replay</span>
                  </button>
                </div>
              </div>

              {/* Control de Velocidad */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-[10px] font-mono uppercase tracking-wider text-neutral-500">
                  <span>Velocidad</span>
                  <span className="text-neutral-400 font-mono">{speedMultiplier}x</span>
                </div>
                <div className="grid grid-cols-3 gap-1 bg-neutral-900 p-1 rounded-xl border border-neutral-800/80">
                  {[
                    { label: '0.5x', val: 0.5 },
                    { label: '1.0x', val: 1.0 },
                    { label: '2.0x', val: 2.0 },
                  ].map((opt) => (
                    <button
                      key={opt.val}
                      type="button"
                      onClick={() => onSetSpeed(opt.val)}
                      className={`py-1 text-xs rounded-lg font-mono transition-colors cursor-pointer ${
                        speedMultiplier === opt.val
                          ? 'bg-neutral-800 text-white font-medium shadow-sm'
                          : 'text-neutral-500 hover:text-neutral-300'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Pie de acciones */}
              <div className="pt-2 border-t border-neutral-900 flex items-center justify-between text-xs">
                <button
                  type="button"
                  onClick={() => handleCopyPreviewLink(currentState)}
                  className="text-neutral-500 hover:text-neutral-300 flex items-center gap-1.5 transition-colors cursor-pointer text-xs"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-white" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copied ? 'Copiado' : 'Copiar URL preview'}</span>
                </button>

                <button
                  type="button"
                  onClick={handleLock}
                  className="text-neutral-500 hover:text-red-400 flex items-center gap-1.5 transition-colors cursor-pointer text-xs"
                  title="Bloquear sesión y ocultar barra"
                >
                  <Lock className="w-3 h-3" />
                  <span>Bloquear</span>
                </button>
              </div>
            </div>
          )}
        </aside>
      )}
    </>
  );
};

export default LaunchDevToolbar;
