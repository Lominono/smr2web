'use client';

import React, { useState, useEffect } from 'react';
import { UserProfile } from '@/lib/types';
import { sound } from '@/lib/audio';

interface WindowsWelcomeModalProps {
  isOpen: boolean;
  user: UserProfile | null;
  onClose: () => void;
}

export const WindowsWelcomeModal: React.FC<WindowsWelcomeModalProps> = ({
  isOpen,
  user,
  onClose,
}) => {
  const [dontShowAgain, setDontShowAgain] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [loadingStep, setLoadingStep] = useState('Iniciando 2º SMR OS...');

  useEffect(() => {
    if (isOpen) {
      setIsLoading(true);
      setLoadingStep('Iniciando 2º SMR OS...');

      // Reproducir sonido clásico de inicio de Windows
      try {
        sound.windowsStartup();
      } catch {}

      const t1 = setTimeout(() => {
        setLoadingStep('Cargando sus preferencias personales...');
      }, 700);

      const t2 = setTimeout(() => {
        setLoadingStep('Conectando a la red del aula 2º SMR...');
      }, 1400);

      const t3 = setTimeout(() => {
        setIsLoading(false);
      }, 2100);

      return () => {
        clearTimeout(t1);
        clearTimeout(t2);
        clearTimeout(t3);
      };
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleClose = () => {
    if (dontShowAgain && typeof window !== 'undefined') {
      try {
        localStorage.setItem('smr2_windows_welcome_dismissed', 'true');
      } catch {}
    }
    onClose();
  };

  const username = user?.username || 'Alumno';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-xs animate-in fade-in duration-150">
      <div 
        className="w-full max-w-md bg-[#ece9d8] dark:bg-[#1e2430] text-[#111] dark:text-[#f0f3f6] rounded-t-lg rounded-b-md shadow-2xl border-2 border-[#0055ea] dark:border-[#388bfd] overflow-hidden font-sans select-none"
        style={{
          boxShadow: '0 20px 50px rgba(0,0,0,0.6), inset 1px 1px 0 rgba(255,255,255,0.8)'
        }}
      >
        {/* Barra de título retro Windows */}
        <div className="bg-gradient-to-r from-[#0058ee] via-[#2a7ffc] to-[#0058ee] dark:from-[#0d1117] dark:via-[#161b22] dark:to-[#0d1117] text-white px-2.5 py-1.5 flex items-center justify-between shadow-xs border-b border-[#0038a8] dark:border-[#30363d]">
          <div className="flex items-center gap-2">
            {/* Logo 4 colores retro Windows */}
            <div className="grid grid-cols-2 gap-0.5 w-3.5 h-3.5 shrink-0 transform rotate-12">
              <div className="bg-[#e73d2a] rounded-[1px]" />
              <div className="bg-[#61b835] rounded-[1px]" />
              <div className="bg-[#2995db] rounded-[1px]" />
              <div className="bg-[#ffb900] rounded-[1px]" />
            </div>
            <span className="text-xs font-bold tracking-wide drop-shadow-xs truncate">
              Microsoft Windows SMR 2.0 Professional
            </span>
          </div>

          {/* Botones ventana: minimizar, maximizar, cerrar */}
          <div className="flex items-center gap-1 shrink-0">
            <button
              type="button"
              tabIndex={-1}
              className="w-5 h-5 bg-[#ece9d8] dark:bg-[#21262d] text-black dark:text-white border border-[#7f9db9] rounded-[2px] text-[10px] font-bold flex items-center justify-center cursor-default shadow-xs opacity-75"
              aria-label="Minimizar"
            >
              _
            </button>
            <button
              type="button"
              tabIndex={-1}
              className="w-5 h-5 bg-[#ece9d8] dark:bg-[#21262d] text-black dark:text-white border border-[#7f9db9] rounded-[2px] text-[10px] font-bold flex items-center justify-center cursor-default shadow-xs opacity-75"
              aria-label="Maximizar"
            >
              □
            </button>
            <button
              type="button"
              onClick={handleClose}
              className="w-5 h-5 bg-[#e81123] hover:bg-[#f13847] active:bg-[#c40e1d] text-white rounded-[2px] text-[11px] font-bold flex items-center justify-center cursor-pointer shadow-xs transition-colors"
              aria-label="Cerrar"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Contenido de la ventana */}
        <div className="p-4 sm:p-5">
          {isLoading ? (
            /* Pantalla de carga estilo Logon Screen */
            <div className="py-8 flex flex-col items-center justify-center text-center space-y-4">
              <div className="relative w-16 h-14 bg-gradient-to-b from-[#2563eb] to-[#1d4ed8] rounded-md p-1.5 shadow-md border-2 border-white/50 flex flex-col items-center justify-center text-white">
                <span className="text-2xl">🖥️</span>
                <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 rounded-full border border-white animate-pulse" />
              </div>

              <div className="space-y-1">
                <p className="text-sm font-semibold tracking-tight text-[#0038a8] dark:text-[#58a6ff]">
                  {loadingStep}
                </p>
                <p className="text-[11px] text-[#666] dark:text-[#8b949e]">
                  Por favor, espere un momento...
                </p>
              </div>

              {/* Barra de progreso retro marquesina */}
              <div className="w-56 h-4 bg-[#fff] dark:bg-[#0d1117] border border-[#7f9db9] dark:border-[#30363d] p-0.5 rounded-[2px] overflow-hidden relative">
                <div 
                  className="h-full bg-gradient-to-r from-[#22c55e] via-[#3b82f6] to-[#22c55e] w-1/3 rounded-[1px] animate-[progress_1.2s_ease-in-out_infinite]"
                  style={{
                    backgroundImage: 'repeating-linear-gradient(90deg, #3b82f6 0px, #3b82f6 8px, #1d4ed8 8px, #1d4ed8 10px)'
                  }}
                />
              </div>

              <button
                type="button"
                onClick={() => setIsLoading(false)}
                className="text-[11px] text-blue-600 dark:text-blue-400 hover:underline pt-2 cursor-pointer"
              >
                Saltar espera
              </button>
            </div>
          ) : (
            /* Pantalla de bienvenida retro auténtica */
            <div className="space-y-4">
              <div className="flex items-start gap-3.5">
                <div className="w-12 h-12 bg-white dark:bg-[#161b22] border-2 border-[#7f9db9] dark:border-[#30363d] rounded-md p-1 flex items-center justify-center shrink-0 shadow-inner text-2xl">
                  💻
                </div>
                <div>
                  <h3 className="text-base font-bold text-[#0038a8] dark:text-[#58a6ff] leading-snug">
                    ¡Bienvenido a 2º SMR OS!
                  </h3>
                  <p className="text-xs text-[#444] dark:text-[#c9d1d9] mt-0.5">
                    Sesión iniciada con éxito para el usuario <strong className="font-semibold text-foreground">@{username}</strong>.
                  </p>
                </div>
              </div>

              {/* Caja de detalles de sistema retro beveled */}
              <div 
                className="p-3 bg-white dark:bg-[#0d1117] rounded-[3px] border border-[#7f9db9] dark:border-[#30363d] text-xs space-y-2"
                style={{
                  boxShadow: 'inset 1px 1px 3px rgba(0,0,0,0.1)'
                }}
              >
                <div className="flex items-center justify-between pb-1.5 border-b border-[#e5e5e5] dark:border-[#21262d]">
                  <span className="text-[#666] dark:text-[#8b949e]">Entorno de red:</span>
                  <span className="font-mono font-semibold text-[#111] dark:text-[#58a6ff]">AULA_2_SMR</span>
                </div>
                <div className="flex items-center justify-between pb-1.5 border-b border-[#e5e5e5] dark:border-[#21262d]">
                  <span className="text-[#666] dark:text-[#8b949e]">Bono de bienvenida:</span>
                  <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                    +1.000 monedas virtuales
                  </span>
                </div>
                <div className="flex items-center justify-between pb-1.5 border-b border-[#e5e5e5] dark:border-[#21262d]">
                  <span className="text-[#666] dark:text-[#8b949e]">Bolsa El Botellón:</span>
                  <span className="font-medium text-[#111] dark:text-[#c9d1d9]">Tiempo real activo</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[#666] dark:text-[#8b949e]">Protocolo de aula:</span>
                  <span className="font-medium text-[#111] dark:text-[#c9d1d9]">TCP/IP SMR2 Edition</span>
                </div>
              </div>

              {/* Sugerencia / Bromas de informática */}
              <div className="p-2.5 bg-[#ffffe1] dark:bg-[#1f242c] border border-[#d6d6a0] dark:border-[#3b434f] rounded-[3px] text-[11px] text-[#444] dark:text-[#adbac7] flex items-start gap-2">
                <span className="text-sm shrink-0">💡</span>
                <p className="leading-relaxed">
                  <strong>Sugerencia de administración:</strong> No reinicies el router del aula ni apagues el equipo mientras operas en el Botellón. Los precios fluctúan según las compras de tus compañeros.
                </p>
              </div>

              {/* Checkbox y botón de acción */}
              <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-[#d8d4c8] dark:border-[#30363d]">
                <label className="flex items-center gap-2 text-[11px] text-[#555] dark:text-[#8b949e] cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={dontShowAgain}
                    onChange={(e) => setDontShowAgain(e.target.checked)}
                    className="w-3.5 h-3.5 rounded-[2px] border border-[#7f9db9] text-blue-600 accent-blue-600 cursor-pointer"
                  />
                  <span>No volver a mostrar al entrar</span>
                </label>

                <button
                  type="button"
                  onClick={handleClose}
                  className="w-full sm:w-auto px-5 py-1.5 min-h-[38px] bg-gradient-to-b from-[#f9f9f9] to-[#e3e3e3] dark:from-[#21262d] dark:to-[#161b22] hover:from-[#ffffff] hover:to-[#ebebeb] dark:hover:from-[#30363d] dark:hover:to-[#21262d] active:from-[#d0d0d0] active:to-[#dfdfdf] text-xs font-bold text-[#111] dark:text-white rounded-[3px] border border-[#003c74] dark:border-[#388bfd] shadow-sm cursor-pointer transition-all flex items-center justify-center gap-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                  style={{
                    boxShadow: 'inset 1px 1px 0 #fff, 0 1px 2px rgba(0,0,0,0.2)'
                  }}
                >
                  <span>Iniciar escritorio</span>
                  <span>↵</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
