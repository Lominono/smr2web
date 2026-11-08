'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import Image from 'next/image';
import { Eye, EyeOff, Loader2, ArrowRight, X, Terminal } from 'lucide-react';
import { sound } from '@/lib/audio';
import { PRELAUNCH_STORAGE_KEY } from '@/lib/prelaunchConstants';
import { LaunchWelcomeSequence } from '@/components/LaunchWelcomeSequence';
import { LaunchLoadingTransition } from '@/components/LaunchLoadingTransition';
import { MobileNotice } from '@/components/MobileNotice';

// Fecha oficial de apertura: 9 de noviembre de 2026 a las 10:08 AM (CET)
export const TARGET_LAUNCH_TIMESTAMP = new Date('2026-11-09T10:08:00+01:00').getTime();
const LAUNCH_START_TIMESTAMP = new Date('2026-10-20T00:00:00+01:00').getTime();

interface LaunchCountdownGateProps {
  onUnlock: () => void;
  forceWelcome?: boolean;
  forceLoading?: boolean;
  speedMultiplier?: number;
}

interface TimeLeft {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  progressPercent: number;
  isCompleted: boolean;
}

function calculateTime(): TimeLeft {
  const now = Date.now();
  const diff = TARGET_LAUNCH_TIMESTAMP - now;

  if (diff <= 0) {
    return { days: 0, hours: 0, minutes: 0, seconds: 0, progressPercent: 100, isCompleted: true };
  }

  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
  const minutes = Math.floor((diff / (1000 * 60)) % 60);
  const seconds = Math.floor((diff / 1000) % 60);

  const totalDuration = TARGET_LAUNCH_TIMESTAMP - LAUNCH_START_TIMESTAMP;
  const elapsed = Math.max(0, now - LAUNCH_START_TIMESTAMP);
  const progressPercent = Math.min(100, Math.max(0, Math.round((elapsed / totalDuration) * 100)));

  return { days, hours, minutes, seconds, progressPercent, isCompleted: false };
}

export const LaunchCountdownGate: React.FC<LaunchCountdownGateProps> = ({
  onUnlock,
  forceWelcome = false,
  forceLoading = false,
  speedMultiplier = 1,
}) => {
  const [stage, setStage] = useState<'countdown' | 'welcome' | 'loading'>(
    forceLoading ? 'loading' : forceWelcome ? 'welcome' : 'countdown'
  );
  const [welcomeKey, setWelcomeKey] = useState(0);
  const [simulatedRemaining, setSimulatedRemaining] = useState<number | null>(null);

  const [timeLeft, setTimeLeft] = useState<TimeLeft>(calculateTime);
  const [mounted, setMounted] = useState(false);

  // Animación inicial sobria: solo si la cuenta atrás existe y no ha concluido
  const initialTime = calculateTime();
  const [showIntro, setShowIntro] = useState<boolean>(!initialTime.isCompleted && !forceWelcome && !forceLoading);
  const [introFading, setIntroFading] = useState<boolean>(false);
  const introTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Modal oculto de acceso anticipado (Easter egg)
  const [showModal, setShowModal] = useState(false);
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Contadores de clics para el easter egg
  const [logoClicks, setLogoClicks] = useState(0);
  const [aulaClicks, setAulaClicks] = useState(0);
  const logoResetTimerRef = useRef<NodeJS.Timeout | null>(null);
  const aulaResetTimerRef = useRef<NodeJS.Timeout | null>(null);

  const [isTransitioningToWelcome, setIsTransitioningToWelcome] = useState(false);

  const startSimulatedCountdown = useCallback((seconds: number) => {
    setStage('countdown');
    setIsTransitioningToWelcome(false);
    setSimulatedRemaining(seconds);
  }, []);

  // Handle simulated countdown tick
  useEffect(() => {
    if (simulatedRemaining === null) return;

    if (simulatedRemaining <= 0) {
      setIsTransitioningToWelcome(true);
      const exitTimer = setTimeout(() => {
        setSimulatedRemaining(null);
        setStage('welcome');
        setWelcomeKey((k) => k + 1);
        setIsTransitioningToWelcome(false);
      }, 400);
      return () => clearTimeout(exitTimer);
    }

    const timer = setTimeout(() => {
      setSimulatedRemaining((prev) => (prev !== null ? prev - 1 : null));
    }, 1000);

    return () => clearTimeout(timer);
  }, [simulatedRemaining]);

  const handleLogoClick = () => {
    if (logoResetTimerRef.current) clearTimeout(logoResetTimerRef.current);
    const next = logoClicks + 1;
    setLogoClicks(next);
    if (next >= 5) {
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('smr2_open_admin_gate'));
      }
      setLogoClicks(0);
    } else {
      logoResetTimerRef.current = setTimeout(() => {
        setLogoClicks(0);
      }, 2500);
    }
  };

  const handleAulaClick = () => {
    if (aulaResetTimerRef.current) clearTimeout(aulaResetTimerRef.current);
    const next = aulaClicks + 1;
    setAulaClicks(next);
    if (next >= 3) {
      setShowModal(true);
      setErrorMessage(null);
      setAulaClicks(0);
    } else {
      aulaResetTimerRef.current = setTimeout(() => {
        setAulaClicks(0);
      }, 2500);
    }
  };

  useEffect(() => {
    setMounted(true);

    // Check preview search query
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const preview = params.get('preview');
      if (preview === 'welcome') {
        setStage('welcome');
      } else if (preview === 'loading') {
        setStage('loading');
      } else if (params.has('countdown')) {
        const secs = parseInt(params.get('countdown') || '3', 10);
        if (!isNaN(secs) && secs > 0) {
          startSimulatedCountdown(secs);
        }
      }
    }

    if (initialTime.isCompleted) {
      const hasSeenWelcome =
        typeof window !== 'undefined' && localStorage.getItem('smr2_launch_welcome_seen') === 'true';
      if (!hasSeenWelcome && !forceWelcome) {
        setStage('welcome');
      } else {
        onUnlock();
        return;
      }
    }

    const fadeTimer = setTimeout(() => {
      setIntroFading(true);
    }, 1600);

    const finishTimer = setTimeout(() => {
      setShowIntro(false);
    }, 2200);

    introTimerRef.current = finishTimer;

    const timer = setInterval(() => {
      const current = calculateTime();
      setTimeLeft(current);

      if (current.isCompleted) {
        clearInterval(timer);
        setIsTransitioningToWelcome(true);
        setTimeout(() => {
          setStage('welcome');
          setWelcomeKey((k) => k + 1);
          setIsTransitioningToWelcome(false);
        }, 400);
      }
    }, 1000);

    return () => {
      clearTimeout(fadeTimer);
      clearTimeout(finishTimer);
      clearInterval(timer);
    };
  }, [initialTime.isCompleted, onUnlock, forceWelcome, startSimulatedCountdown]);

  // Detector de atajos, secuencias de teclado y Konami Code para los "listillos"
  useEffect(() => {
    let keyBuffer = '';
    let keyTimer: NodeJS.Timeout | null = null;
    let konamiIdx = 0;
    const KONAMI = [
      'ArrowUp',
      'ArrowUp',
      'ArrowDown',
      'ArrowDown',
      'ArrowLeft',
      'ArrowRight',
      'ArrowLeft',
      'ArrowRight',
      'b',
      'a',
    ];

    const handleKeyDown = (e: KeyboardEvent) => {
      // Si el usuario está escribiendo dentro de un input
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        if (e.key === 'Escape') {
          setShowModal(false);
          setPassword('');
          setErrorMessage(null);
        }
        return;
      }

      // Konami Code detector
      if (e.key.toLowerCase() === KONAMI[konamiIdx]?.toLowerCase()) {
        konamiIdx++;
        if (konamiIdx === KONAMI.length) {
          konamiIdx = 0;
          setShowModal(true);
          setErrorMessage(null);
          return;
        }
      } else {
        konamiIdx = 0;
      }

      // Atajo de administrador: Alt+D, F2, ~, Ctrl+., Ctrl+Shift+S, Alt+A
      if (
        (e.altKey && (e.key === 'D' || e.key === 'd' || e.key === 'A' || e.key === 'a')) ||
        e.key === 'F2' ||
        e.key === '`' ||
        e.key === '~' ||
        (e.ctrlKey && e.key === '.') ||
        ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === 'D' || e.key === 'd' || e.key === 'S' || e.key === 's' || e.key === 'A' || e.key === 'a'))
      ) {
        e.preventDefault();
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('smr2_open_admin_gate'));
        }
        return;
      }

      // Detección de secuencias de teclado
      if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
        keyBuffer += e.key.toLowerCase();
        if (keyBuffer.length > 25) {
          keyBuffer = keyBuffer.slice(-25);
        }

        // Si el usuario teclea 'davidgay' directamente en la pantalla, bypass instantáneo sin modal
        if (keyBuffer.endsWith('davidgay')) {
          keyBuffer = '';
          try {
            sound.jackpot();
          } catch {}
          (async () => {
            try {
              const res = await fetch('/api/prelaunch/verify', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ password: 'davidgay' }),
              });
              const data = await res.json().catch(() => ({}));
              if (res.ok && data.success && data.token) {
                localStorage.setItem(PRELAUNCH_STORAGE_KEY, data.token);
                setShowModal(false);
                onUnlock();
              }
            } catch {}
          })();
          return;
        }

        if (
          keyBuffer.endsWith('smr') ||
          keyBuffer.endsWith('smr2') ||
          keyBuffer.endsWith('admin') ||
          keyBuffer.endsWith('root') ||
          keyBuffer.endsWith('2026') ||
          keyBuffer.endsWith('papu') ||
          keyBuffer.endsWith('hack') ||
          keyBuffer.endsWith('sudo') ||
          keyBuffer.endsWith('matrix') ||
          keyBuffer.endsWith('bypass') ||
          keyBuffer.endsWith('override')
        ) {
          try {
            sound.coinWin();
          } catch {}
          setShowModal(true);
          setErrorMessage(null);
          keyBuffer = '';
        }

        if (keyTimer) clearTimeout(keyTimer);
        keyTimer = setTimeout(() => {
          keyBuffer = '';
        }, 3000);
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    // Gancho en DevTools Console para desarrolladores e inspectores
    if (typeof window !== 'undefined') {
      (window as any).unlock = async (pass: string) => {
        const cleanPass = String(pass || '').trim();
        if (!cleanPass) {
          console.warn('[SMR2] Especifica la clave: unlock("tu_clave")');
          return;
        }
        console.log('%c[SMR2] Validando credencial con el servidor...', 'color: #38bdf8; font-family: monospace;');
        try {
          const res = await fetch('/api/prelaunch/verify', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ password: cleanPass }),
          });
          const data = await res.json().catch(() => ({}));
          if (res.ok && data.success && data.token) {
            localStorage.setItem(PRELAUNCH_STORAGE_KEY, data.token);
            try {
              sound.toastClink();
            } catch {}
            console.log('%c[SMR2] ¡Acceso concedido! Saltando la cuenta regresiva...', 'color: #10b981; font-weight: bold; font-family: monospace;');
            setShowModal(false);
            onUnlock();
          } else {
            console.error('[SMR2] Acceso denegado:', data.error || 'Clave incorrecta');
          }
        } catch (err: any) {
          console.error('[SMR2] Error de conexión:', err?.message);
        }
      };

      (window as any).smr2 = {
        ...(window as any).smr2,
        unlock: (window as any).unlock,
        auth: (window as any).unlock,
        info: '2º SMR · Aula: Ni puta idea',
        testCountdown: (secs = 3) => {
          const token = localStorage.getItem(PRELAUNCH_STORAGE_KEY);
          if (!token || !token.includes('.')) {
            console.warn('[SMR2] Acceso restringido. Autentícate primero con smr2.auth("clave")');
            return;
          }
          console.log(`%c[SMR2] Simulación de fin de cuenta atrás iniciada: ${secs}s`, 'color: #10b981; font-weight: bold;');
          startSimulatedCountdown(secs);
        },
        showWelcome: () => {
          const token = localStorage.getItem(PRELAUNCH_STORAGE_KEY);
          if (!token || !token.includes('.')) {
            console.warn('[SMR2] Acceso restringido. Autentícate primero con smr2.auth("clave")');
            return;
          }
          setStage('welcome');
          setWelcomeKey((k) => k + 1);
        },
        showCountdown: () => {
          setStage('countdown');
        },
        showAuth: () => {
          onUnlock();
        },
        replayWelcome: () => {
          setStage('welcome');
          setWelcomeKey((k) => k + 1);
        },
      };
    }

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      if (keyTimer) clearTimeout(keyTimer);
    };
  }, [onUnlock, startSimulatedCountdown]);

  const handleSkipIntro = () => {
    if (!showIntro) return;
    try {
      sound.tap();
    } catch {}
    setIntroFading(true);
    setTimeout(() => {
      setShowIntro(false);
    }, 200);
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanPassword = password.trim();
    if (!cleanPassword || isLoading) return;

    setIsLoading(true);
    setErrorMessage(null);

    try {
      const res = await fetch('/api/prelaunch/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: cleanPassword }),
      });

      const data = await res.json().catch(() => ({}));

      if (res.ok && data.success && data.token) {
        try {
          localStorage.setItem(PRELAUNCH_STORAGE_KEY, data.token);
          localStorage.removeItem('smr2_prelaunch_bypass');
          sound.toastClink();
        } catch {}
        setShowModal(false);
        onUnlock();
      } else {
        try {
          sound.impact(0.4);
        } catch {}
        setErrorMessage(data.error || 'Clave de acceso no válida.');
      }
    } catch {
      setErrorMessage('Error de conexión con el servidor. Inténtalo de nuevo.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleWelcomeComplete = () => {
    setStage('loading');
  };

  const handleLoadingComplete = () => {
    try {
      localStorage.setItem('smr2_launch_welcome_seen', 'true');
    } catch {}
    onUnlock();
  };

  if (!mounted) {
    return <div className="fixed inset-0 bg-[#09090b] z-[9999]" />;
  }

  // Si estamos en la etapa de Bienvenida con burbujas de texto animadas:
  if (stage === 'welcome') {
    return (
      <LaunchWelcomeSequence
        key={welcomeKey}
        onComplete={handleWelcomeComplete}
        speedMultiplier={speedMultiplier}
      />
    );
  }

  // Si estamos en la pantalla de carga épica con Mac Screen de Cult UI:
  if (stage === 'loading') {
    return (
      <LaunchLoadingTransition
        onComplete={handleLoadingComplete}
        speedMultiplier={speedMultiplier}
      />
    );
  }

  // Valores a mostrar (reales o simulados por el dev)
  const isSimulated = simulatedRemaining !== null;
  const displayedDays = isSimulated ? 0 : timeLeft.days;
  const displayedHours = isSimulated ? 0 : timeLeft.hours;
  const displayedMinutes = isSimulated ? 0 : timeLeft.minutes;
  const displayedSeconds = isSimulated ? simulatedRemaining : timeLeft.seconds;

  return (
    <div
      className={`fixed inset-0 z-[9999] flex flex-col justify-between bg-black text-white p-6 sm:p-10 md:p-14 select-none overflow-y-auto antialiased transition-all duration-500 ease-out ${
        isTransitioningToWelcome ? 'opacity-0 scale-[0.98]' : 'opacity-100 scale-100'
      }`}
    >
      {/* ============================================================ */}
      {/* 1. INTRO SPLASH: Revelación tipográfica minimalista           */}
      {/* ============================================================ */}
      {showIntro && (
        <div
          onClick={handleSkipIntro}
          className={`fixed inset-0 z-[10000] flex flex-col items-center justify-center bg-black p-6 cursor-pointer transition-opacity duration-500 ease-out ${
            introFading ? 'opacity-0 pointer-events-none' : 'opacity-100'
          }`}
        >
          <div className="flex flex-col items-center justify-center text-center space-y-4">
            <div className="relative w-16 h-16 sm:w-20 sm:h-20">
              <Image
                src="/logo.png"
                alt="SMR2 Logo"
                fill
                sizes="80px"
                className="object-contain brightness-95"
                priority
              />
            </div>

            <h1 className="text-4xl sm:text-6xl font-light tracking-tight text-white">
              2º SMR
            </h1>

            <p className="text-[11px] font-mono tracking-[0.2em] uppercase text-neutral-500">
              Aula: Ni puta idea
            </p>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* 2. PANTALLA PRINCIPAL: CONTADOR ULTRA-MINIMALISTA             */}
      {/* ============================================================ */}

      {/* Encabezado minimalista estilo Apple */}
      <header className="w-full max-w-4xl mx-auto flex items-center justify-between relative z-10 select-none">
        <div
          onClick={handleLogoClick}
          className="flex items-center gap-2.5 cursor-default active:opacity-75 transition-opacity"
          title="2º SMR"
        >
          <div className="w-6 h-6 relative flex items-center justify-center">
            <Image
              src="/logo.png"
              alt="SMR2 Logo"
              width={24}
              height={24}
              className="w-full h-full object-contain pointer-events-none brightness-95"
              priority
            />
          </div>
          <span className="text-xs font-semibold tracking-tight text-white/90">
            2º SMR
          </span>
        </div>

        <div
          onClick={handleAulaClick}
          className="text-[11px] font-mono tracking-wider text-neutral-500 hover:text-neutral-300 cursor-default transition-colors"
          title="Aula"
        >
          Aula: Ni puta idea
        </div>
      </header>

      {/* Núcleo cronométrico puramente minimalista */}
      <main className="w-full max-w-3xl mx-auto my-auto py-12 sm:py-20 flex flex-col items-center text-center relative z-10">
        <div className="mb-8 sm:mb-14">
          <p className="text-xs sm:text-sm font-mono tracking-[0.2em] uppercase text-neutral-400">
            Apertura oficial · 9 de noviembre · 10:08
          </p>
        </div>

        {/* Tipografía Monumental Suiza y minimalista */}
        <div className="flex items-baseline justify-center gap-2 sm:gap-6 md:gap-8 select-none">
          {/* DÍAS */}
          <div className="flex flex-col items-center min-w-[56px] sm:min-w-[88px] md:min-w-[110px]">
            <span className="text-4xl sm:text-7xl md:text-8xl lg:text-9xl font-extralight tracking-tight text-white tabular-nums leading-none">
              {displayedDays}
            </span>
            <span className="text-[10px] sm:text-xs font-mono uppercase tracking-[0.25em] text-neutral-500 mt-3 sm:mt-4">
              días
            </span>
          </div>

          <span className="text-2xl sm:text-5xl md:text-6xl font-thin text-neutral-700 self-center -translate-y-2 sm:-translate-y-3 select-none">
            :
          </span>

          {/* HORAS */}
          <div className="flex flex-col items-center min-w-[56px] sm:min-w-[88px] md:min-w-[110px]">
            <span className="text-4xl sm:text-7xl md:text-8xl lg:text-9xl font-extralight tracking-tight text-white tabular-nums leading-none">
              {String(displayedHours).padStart(2, '0')}
            </span>
            <span className="text-[10px] sm:text-xs font-mono uppercase tracking-[0.25em] text-neutral-500 mt-3 sm:mt-4">
              horas
            </span>
          </div>

          <span className="text-2xl sm:text-5xl md:text-6xl font-thin text-neutral-700 self-center -translate-y-2 sm:-translate-y-3 select-none">
            :
          </span>

          {/* MINUTOS */}
          <div className="flex flex-col items-center min-w-[56px] sm:min-w-[88px] md:min-w-[110px]">
            <span className="text-4xl sm:text-7xl md:text-8xl lg:text-9xl font-extralight tracking-tight text-white tabular-nums leading-none">
              {String(displayedMinutes).padStart(2, '0')}
            </span>
            <span className="text-[10px] sm:text-xs font-mono uppercase tracking-[0.25em] text-neutral-500 mt-3 sm:mt-4">
              min
            </span>
          </div>

          <span className="text-2xl sm:text-5xl md:text-6xl font-thin text-neutral-700 self-center -translate-y-2 sm:-translate-y-3 select-none">
            :
          </span>

          {/* SEGUNDOS */}
          <div className="flex flex-col items-center min-w-[56px] sm:min-w-[88px] md:min-w-[110px]">
            <span className="text-4xl sm:text-7xl md:text-8xl lg:text-9xl font-extralight tracking-tight text-white tabular-nums leading-none select-none">
              {String(displayedSeconds).padStart(2, '0')}
            </span>
            <span className="text-[10px] sm:text-xs font-mono uppercase tracking-[0.25em] text-neutral-500 mt-3 sm:mt-4">
              seg
            </span>
          </div>
        </div>
      </main>

      {/* Pie minimalista */}
      <footer className="w-full max-w-4xl mx-auto flex items-center justify-between pt-4 text-[11px] text-neutral-600 font-mono select-none">
        <div>JuanFe & David</div>
        <div>2º SMR</div>
      </footer>

      {/* Modal secreto del Easter Egg con estética Apple Sheet */}
      {showModal && (
        <div
          role="dialog"
          aria-modal="true"
          onClick={() => {
            setShowModal(false);
            setPassword('');
            setErrorMessage(null);
          }}
          className="fixed inset-0 z-[10001] flex items-center justify-center p-4 bg-black/80 backdrop-blur-xl animate-in fade-in duration-150"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-sm bg-neutral-950/90 border border-white/10 rounded-2xl p-6 text-left font-sans space-y-4 shadow-2xl backdrop-blur-2xl"
          >
            <div className="flex items-center justify-between pb-2 border-b border-white/5">
              <div className="flex items-center gap-2">
                <Terminal className="w-4 h-4 text-neutral-400" />
                <h3 className="text-xs font-semibold tracking-tight text-white">
                  Acceso anticipado
                </h3>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowModal(false);
                  setPassword('');
                  setErrorMessage(null);
                }}
                className="text-neutral-500 hover:text-white transition-colors p-1"
                title="Cerrar (Esc)"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handlePasswordSubmit} className="space-y-4">
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (errorMessage) setErrorMessage(null);
                  }}
                  placeholder="Clave de acceso..."
                  autoFocus
                  disabled={isLoading}
                  className="w-full text-xs font-mono bg-white/[0.05] border border-white/10 rounded-xl px-3.5 py-2.5 pr-10 text-white placeholder-neutral-500 focus:outline-none focus:border-white/30 transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-neutral-500 hover:text-white p-1"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                </button>
              </div>

              {errorMessage && (
                <p className="text-xs text-red-400 font-sans">
                  {errorMessage}
                </p>
              )}

              <div className="flex items-center justify-end pt-1">
                <button
                  type="submit"
                  disabled={isLoading || !password.trim()}
                  className="w-full py-2.5 bg-white hover:bg-neutral-200 text-black text-xs font-semibold rounded-xl transition-all inline-flex items-center justify-center gap-1.5 disabled:opacity-40"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Validando...</span>
                    </>
                  ) : (
                    <>
                      <span>Entrar</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Aviso exclusivo para usuarios móviles con disculpas y recomendación PC */}
      <MobileNotice />
    </div>
  );
};
