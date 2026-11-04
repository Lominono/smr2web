'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  Shield,
  ShieldAlert,
  ShieldCheck,
  Lock,
  Unlock,
  KeyRound,
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
  Terminal,
} from 'lucide-react';
import { PRELAUNCH_STORAGE_KEY } from '@/lib/prelaunchConstants';
import { sound } from '@/lib/audio';

export type DevLaunchState = 'countdown' | 'welcome' | 'auth' | 'app';

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

  // Escuchador global de atajos de teclado seguros para Administradores
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignorar si el usuario está escribiendo en inputs
      if (
        (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) &&
        !showAuthModal
      ) {
        return;
      }

      // Atajo seguro de Administrador: Ctrl + Alt + Shift + D
      if (e.ctrlKey && e.altKey && e.shiftKey && (e.key === 'D' || e.key === 'd')) {
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
          sound.toastClink();
        } catch {}
        setShowAuthModal(false);
        setPassword('');
        setIsOpen(true);
        onAdminAuthSuccess();
      } else {
        try {
          sound.impact(0.4);
        } catch {}
        setAuthError(data.error || 'Credencial de administrador no válida.');
      }
    } catch {
      setAuthError('Error de enlace con el servidor de seguridad.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleLock = () => {
    try {
      sound.tap();
    } catch {}
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
      {/* 1. MODAL DE AUTENTICACIÓN SEGURA PARA ADMINISTRADORES */}
      {showAuthModal && (
        <div
          role="dialog"
          aria-modal="true"
          onClick={() => {
            setShowAuthModal(false);
            setPassword('');
            setAuthError(null);
          }}
          className="fixed inset-0 z-[10050] flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200 select-none font-mono"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-sm bg-neutral-950 border border-neutral-800 rounded-2xl p-5 text-left text-neutral-200 shadow-2xl relative space-y-3.5"
          >
            <div className="flex items-center justify-between pb-2 border-b border-neutral-900">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  <ShieldCheck className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-white tracking-tight flex items-center gap-1.5">
                    <span>ADMIN DEBUG GATEWAY</span>
                  </h3>
                  <p className="text-[10px] text-neutral-500 mt-0.5">
                    Acceso exclusivo para administradores
                  </p>
                </div>
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
              <div className="space-y-1">
                <label className="text-[10px] font-semibold text-neutral-400 uppercase tracking-wider block">
                  Clave Maestra de Administrador
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      if (authError) setAuthError(null);
                    }}
                    placeholder="Introduce tu clave..."
                    autoFocus
                    disabled={isLoading}
                    className="w-full text-xs font-mono bg-neutral-900 border border-neutral-800 rounded-lg px-3 py-2 pr-9 text-white placeholder-neutral-600 focus:outline-none focus:border-emerald-500/50 transition-colors"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-neutral-500 hover:text-neutral-300 p-1 cursor-pointer"
                    tabIndex={-1}
                  >
                    {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              {authError && (
                <div className="p-2 rounded-lg bg-red-950/40 border border-red-900/50 flex items-center gap-2 text-[11px] text-red-300">
                  <ShieldAlert className="w-3.5 h-3.5 shrink-0 text-red-400" />
                  <span>{authError}</span>
                </div>
              )}

              <div className="flex items-center justify-between pt-1 text-[10px] text-neutral-500">
                <span>Atajo: Ctrl+Alt+Shift+D</span>
                <button
                  type="submit"
                  disabled={isLoading || !password.trim()}
                  className="px-3.5 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-black font-semibold text-xs rounded-lg transition-all inline-flex items-center gap-1.5 cursor-pointer disabled:opacity-40"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-3 h-3 animate-spin" />
                      <span>Verificando...</span>
                    </>
                  ) : (
                    <>
                      <Unlock className="w-3 h-3" />
                      <span>Desbloquear</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 2. BARRA DE HERRAMIENTAS DEV (Únicamente visible cuando isAdmin === true) */}
      {isAdmin && (
        <aside
          aria-label="Panel de depuración para administradores"
          className="fixed bottom-4 right-4 z-[10020] font-mono select-none"
        >
          {!isOpen ? (
            <button
              type="button"
              onClick={() => setIsOpen(true)}
              className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-neutral-900/95 hover:bg-neutral-800 text-neutral-300 hover:text-white border border-emerald-500/40 backdrop-blur-md shadow-2xl text-xs transition-all active:scale-95 cursor-pointer group"
              title="Panel de Admin (Ctrl + Alt + Shift + D)"
            >
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
              </span>
              <Shield className="w-3.5 h-3.5 text-emerald-400" />
              <span className="font-semibold text-neutral-200">Admin Debug</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-neutral-800 text-emerald-400 border border-neutral-700">
                {currentState}
              </span>
            </button>
          ) : (
            <div className="w-80 bg-neutral-950/95 backdrop-blur-xl border border-neutral-800 rounded-2xl p-4 shadow-2xl text-neutral-200 space-y-3.5 animate-in fade-in slide-in-from-bottom-2 duration-200">
              {/* Header */}
              <div className="flex items-center justify-between pb-2 border-b border-neutral-800/80">
                <div className="flex items-center gap-2">
                  <div className="p-1 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    <ShieldCheck className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-white tracking-tight flex items-center gap-1.5">
                      <span>ADMIN CONTROLS</span>
                      <span className="text-[9px] px-1 bg-emerald-950 text-emerald-400 border border-emerald-800 rounded">
                        Autenticado
                      </span>
                    </h4>
                    <p className="text-[10px] text-neutral-500">
                      Debug de salida y animaciones
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="p-1 text-neutral-400 hover:text-white rounded hover:bg-neutral-800 transition-colors cursor-pointer"
                  title="Minimizar"
                >
                  <ChevronDown className="w-4 h-4" />
                </button>
              </div>

              {/* Selector de Escenas / Estados */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-semibold text-neutral-400 uppercase tracking-wider block">
                  1. Vista Previa de Estados
                </label>
                <div className="grid grid-cols-3 gap-1.5">
                  <button
                    type="button"
                    onClick={() => onSetState('countdown')}
                    className={`px-2 py-1.5 rounded-lg text-[11px] font-medium border flex flex-col items-center gap-1 transition-all cursor-pointer ${
                      currentState === 'countdown'
                        ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 shadow-sm'
                        : 'bg-neutral-900/80 text-neutral-400 border-neutral-800 hover:bg-neutral-800 hover:text-white'
                    }`}
                  >
                    <Clock className="w-3.5 h-3.5" />
                    <span>Contador</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => onSetState('welcome')}
                    className={`px-2 py-1.5 rounded-lg text-[11px] font-medium border flex flex-col items-center gap-1 transition-all cursor-pointer ${
                      currentState === 'welcome'
                        ? 'bg-pink-500/20 text-pink-300 border-pink-500/40 shadow-sm'
                        : 'bg-neutral-900/80 text-neutral-400 border-neutral-800 hover:bg-neutral-800 hover:text-white'
                    }`}
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Bienvenida</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => onSetState('auth')}
                    className={`px-2 py-1.5 rounded-lg text-[11px] font-medium border flex flex-col items-center gap-1 transition-all cursor-pointer ${
                      currentState === 'auth'
                        ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40 shadow-sm'
                        : 'bg-neutral-900/80 text-neutral-400 border-neutral-800 hover:bg-neutral-800 hover:text-white'
                    }`}
                  >
                    <LogIn className="w-3.5 h-3.5" />
                    <span>AuthGate</span>
                  </button>
                </div>
              </div>

              {/* Acciones de Simulación */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-semibold text-neutral-400 uppercase tracking-wider block">
                  2. Pruebas de Transición
                </label>
                <div className="space-y-1.5">
                  <button
                    type="button"
                    onClick={() => onTestCountdown(3)}
                    className="w-full px-2.5 py-1.5 rounded-lg bg-gradient-to-r from-emerald-500/20 to-cyan-500/20 hover:from-emerald-500/30 hover:to-cyan-500/30 border border-emerald-500/30 text-emerald-300 text-xs font-medium flex items-center justify-between transition-all active:scale-[0.98] cursor-pointer"
                  >
                    <div className="flex items-center gap-1.5">
                      <Play className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Simular Fin Contador (3 seg)</span>
                    </div>
                    <span className="text-[10px] px-1.5 py-0.2 rounded bg-black/40 text-emerald-400 font-mono">
                      3s ➔ Fin
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={onReplayWelcome}
                    className="w-full px-2.5 py-1.5 rounded-lg bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 text-neutral-300 hover:text-white text-xs flex items-center justify-between transition-colors cursor-pointer"
                  >
                    <div className="flex items-center gap-1.5">
                      <RotateCcw className="w-3.5 h-3.5 text-pink-400" />
                      <span>Reiniciar Burbujas de Bienvenida</span>
                    </div>
                    <span className="text-[10px] text-neutral-500">Replay</span>
                  </button>
                </div>
              </div>

              {/* Control de Velocidad (Cámara Lenta / Normal) */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-[10px] font-semibold text-neutral-400 uppercase tracking-wider">
                  <span className="flex items-center gap-1">
                    <Gauge className="w-3 h-3 text-amber-400" />
                    <span>Velocidad de Animación</span>
                  </span>
                  <span className="text-amber-300 font-mono">{speedMultiplier}x</span>
                </div>
                <div className="grid grid-cols-3 gap-1">
                  {[
                    { label: '0.4x Lenta', val: 0.4 },
                    { label: '1x Normal', val: 1.0 },
                    { label: '2x Rápida', val: 2.0 },
                  ].map((opt) => (
                    <button
                      key={opt.val}
                      type="button"
                      onClick={() => onSetSpeed(opt.val)}
                      className={`py-1 text-[10px] rounded border font-mono transition-colors cursor-pointer ${
                        speedMultiplier === opt.val
                          ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                          : 'bg-neutral-900 text-neutral-400 border-neutral-800 hover:bg-neutral-800'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Botón de Bloqueo y Seguridad */}
              <div className="pt-2 border-t border-neutral-800/80 flex items-center justify-between text-[10px]">
                <button
                  type="button"
                  onClick={() => handleCopyPreviewLink(currentState)}
                  className="text-neutral-400 hover:text-cyan-400 flex items-center gap-1 transition-colors cursor-pointer"
                  title="Copiar link directo a este estado"
                >
                  {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                  <span>{copied ? '¡Copiado!' : 'Copiar URL preview'}</span>
                </button>

                <button
                  type="button"
                  onClick={handleLock}
                  className="px-2 py-1 rounded bg-red-950/40 hover:bg-red-900/40 text-red-400 hover:text-red-300 border border-red-900/50 flex items-center gap-1 transition-colors cursor-pointer"
                  title="Bloquear sesión de administrador y ocultar barra"
                >
                  <Lock className="w-3 h-3" />
                  <span>Bloquear y Ocultar</span>
                </button>
              </div>
            </div>
          )}
        </aside>
      )}
    </>
  );
};
