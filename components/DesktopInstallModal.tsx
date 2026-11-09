'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import {
  X,
  MonitorDown,
  Laptop,
  CheckCircle2,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  Zap,
  Bell,
  Layers,
  HelpCircle,
  ExternalLink,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { sound } from '@/lib/audio';
import {
  isStandaloneApp,
  hasNativeInstallPrompt,
  promptDesktopInstall,
  getDesktopPlatform,
  getBrowserType,
} from '@/lib/desktopInstallService';

interface DesktopInstallModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const DesktopInstallModal: React.FC<DesktopInstallModalProps> = ({
  isOpen,
  onClose,
}) => {
  const [isStandalone, setIsStandalone] = useState(false);
  const [canPrompt, setCanPrompt] = useState(false);
  const [platform, setPlatform] = useState<'windows' | 'mac' | 'linux' | 'mobile' | 'unknown'>('windows');
  const [browser, setBrowser] = useState<'chrome' | 'edge' | 'safari' | 'brave' | 'firefox' | 'opera' | 'other'>('chrome');
  const [activeGuideTab, setActiveGuideTab] = useState<'chrome' | 'edge' | 'safari' | 'other'>('chrome');
  const [installSuccess, setInstallSuccess] = useState(false);
  const [isInstalling, setIsInstalling] = useState(false);

  useEffect(() => {
    if (!isOpen) return;

    const standalone = isStandaloneApp();
    setIsStandalone(standalone);
    setCanPrompt(hasNativeInstallPrompt());

    const detectedPlatform = getDesktopPlatform();
    setPlatform(detectedPlatform);

    const detectedBrowser = getBrowserType();
    setBrowser(detectedBrowser);

    if (detectedBrowser === 'edge') {
      setActiveGuideTab('edge');
    } else if (detectedBrowser === 'safari' || detectedPlatform === 'mac') {
      setActiveGuideTab('safari');
    } else if (detectedBrowser === 'chrome' || detectedBrowser === 'brave' || detectedBrowser === 'opera') {
      setActiveGuideTab('chrome');
    } else {
      setActiveGuideTab('chrome');
    }

    const handlePromptChanged = () => {
      setCanPrompt(hasNativeInstallPrompt());
      setIsStandalone(isStandaloneApp());
    };

    const handleInstalled = () => {
      setIsStandalone(true);
      setInstallSuccess(true);
    };

    window.addEventListener('smr2_install_prompt_changed', handlePromptChanged);
    window.addEventListener('smr2_app_installed', handleInstalled);

    return () => {
      window.removeEventListener('smr2_install_prompt_changed', handlePromptChanged);
      window.removeEventListener('smr2_app_installed', handleInstalled);
    };
  }, [isOpen]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleInstallClick = async () => {
    sound.tap();
    setIsInstalling(true);
    try {
      const result = await promptDesktopInstall();
      if (result === 'accepted') {
        setInstallSuccess(true);
        setIsStandalone(true);
      }
    } finally {
      setIsInstalling(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-200">
      {/* Apple-style backdrop */}
      <div
        className="fixed inset-0 bg-black/60 dark:bg-black/75 backdrop-blur-md transition-opacity"
        onClick={onClose}
      />

      {/* Modal Dialog */}
      <div className="relative w-full max-w-lg bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92dvh] transition-colors">
        {/* Header */}
        <div className="px-5 py-4 border-b border-neutral-200 dark:border-neutral-800/80 flex items-center justify-between bg-neutral-50/70 dark:bg-neutral-900/50 backdrop-blur-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-neutral-900 dark:bg-neutral-800 flex items-center justify-center p-1.5 shadow-xs border border-neutral-200 dark:border-neutral-700">
              <Image
                src="/logo.png"
                alt="2º SMR"
                width={36}
                height={36}
                className="w-full h-full object-contain"
              />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm sm:text-base font-semibold text-neutral-900 dark:text-neutral-100 tracking-tight">
                  Aplicación de Escritorio
                </h2>
                <Badge variant={isStandalone ? 'success' : 'default'} size="sm">
                  {isStandalone ? 'Instalada' : 'PWA'}
                </Badge>
              </div>
              <p className="text-[11px] text-neutral-500 dark:text-neutral-400">
                Portal 2º SMR para Windows, macOS y Linux
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-lg text-neutral-500 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-100 hover:bg-neutral-100 dark:hover:bg-neutral-800 flex items-center justify-center transition-colors cursor-pointer"
            aria-label="Cerrar"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="p-5 overflow-y-auto space-y-4 text-neutral-800 dark:text-neutral-200 text-xs sm:text-sm">
          {/* Status Banner */}
          {isStandalone || installSuccess ? (
            <div className="p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/60 flex items-start gap-3">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-emerald-900 dark:text-emerald-200 text-xs sm:text-sm">
                  ¡Aplicación instalada y lista!
                </p>
                <p className="text-[11px] text-emerald-700 dark:text-emerald-400 mt-0.5 leading-relaxed">
                  Ya estás ejecutando la aplicación de forma nativa e independiente, o la tienes integrada en tu menú Inicio / Dock.
                </p>
              </div>
            </div>
          ) : (
            <div className="p-3.5 rounded-xl bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900/50 flex items-start gap-3">
              <Laptop className="w-5 h-5 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="font-semibold text-blue-950 dark:text-blue-200 text-xs sm:text-sm">
                  Instala SMR2 como aplicación nativa
                </p>
                <p className="text-[11px] text-blue-800 dark:text-blue-300 leading-relaxed">
                  Disfruta de una experiencia limpia, rápida y sin barras de pestañas ni distracciones. Funciona con Chrome, Edge, Safari y navegadores basados en Chromium.
                </p>
              </div>
            </div>
          )}

          {/* Primary Action Button */}
          {!isStandalone && !installSuccess && canPrompt && (
            <div className="pt-1">
              <Button
                variant="primary"
                size="lg"
                onClick={handleInstallClick}
                disabled={isInstalling}
                className="w-full justify-center text-sm py-2.5 rounded-xl font-medium shadow-md shadow-neutral-900/10 dark:shadow-black/40"
              >
                <MonitorDown className="w-4 h-4 mr-2" />
                <span>{isInstalling ? 'Instalando...' : 'Instalar ahora en este equipo'}</span>
              </Button>
            </div>
          )}

          {/* Features Highlights */}
          <div className="space-y-2 pt-1">
            <h3 className="text-xs font-semibold text-neutral-900 dark:text-neutral-100 uppercase tracking-wider font-mono">
              Ventajas en el ordenador
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <div className="p-3 rounded-xl bg-neutral-50 dark:bg-neutral-800/50 border border-neutral-200 dark:border-neutral-800 space-y-1">
                <div className="flex items-center gap-2 text-neutral-900 dark:text-neutral-100 font-medium text-xs">
                  <Layers className="w-3.5 h-3.5 text-blue-500" />
                  <span>Ventana dedicada</span>
                </div>
                <p className="text-[11px] text-neutral-500 dark:text-neutral-400 leading-snug">
                  Sin barra de direcciones ni pestañas confusas. Se abre como programa nativo.
                </p>
              </div>

              <div className="p-3 rounded-xl bg-neutral-50 dark:bg-neutral-800/50 border border-neutral-200 dark:border-neutral-800 space-y-1">
                <div className="flex items-center gap-2 text-neutral-900 dark:text-neutral-100 font-medium text-xs">
                  <Zap className="w-3.5 h-3.5 text-amber-500" />
                  <span>Arranque instantáneo</span>
                </div>
                <p className="text-[11px] text-neutral-500 dark:text-neutral-400 leading-snug">
                  Acceso directo desde la barra de tareas de Windows o el Dock de macOS.
                </p>
              </div>

              <div className="p-3 rounded-xl bg-neutral-50 dark:bg-neutral-800/50 border border-neutral-200 dark:border-neutral-800 space-y-1">
                <div className="flex items-center gap-2 text-neutral-900 dark:text-neutral-100 font-medium text-xs">
                  <Bell className="w-3.5 h-3.5 text-emerald-500" />
                  <span>Avisos y timbre</span>
                </div>
                <p className="text-[11px] text-neutral-500 dark:text-neutral-400 leading-snug">
                  Notificaciones del timbre de clase y avisos de compañeros en directo.
                </p>
              </div>

              <div className="p-3 rounded-xl bg-neutral-50 dark:bg-neutral-800/50 border border-neutral-200 dark:border-neutral-800 space-y-1">
                <div className="flex items-center gap-2 text-neutral-900 dark:text-neutral-100 font-medium text-xs">
                  <ShieldCheck className="w-3.5 h-3.5 text-purple-500" />
                  <span>Sin instaladores pesados</span>
                </div>
                <p className="text-[11px] text-neutral-500 dark:text-neutral-400 leading-snug">
                  No requiere permisos de administrador ni archivos `.exe` externos. Se actualiza sola.
                </p>
              </div>
            </div>
          </div>

          {/* Browser-specific Step-by-Step Guide */}
          <div className="space-y-2.5 pt-1">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-semibold text-neutral-900 dark:text-neutral-100 uppercase tracking-wider font-mono flex items-center gap-1.5">
                <HelpCircle className="w-3.5 h-3.5 text-neutral-500" />
                <span>Instrucciones según tu navegador</span>
              </h3>
            </div>

            {/* Apple segmented tabs for browsers */}
            <div className="p-1 rounded-xl bg-neutral-100 dark:bg-neutral-800/80 border border-neutral-200 dark:border-neutral-700/80 flex gap-1">
              <button
                type="button"
                onClick={() => {
                  sound.tap();
                  setActiveGuideTab('chrome');
                }}
                className={`flex-1 py-1.5 px-2 text-xs font-medium rounded-lg transition-all cursor-pointer text-center ${
                  activeGuideTab === 'chrome'
                    ? 'bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100 shadow-xs font-semibold'
                    : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100'
                }`}
              >
                Chrome / Brave
              </button>
              <button
                type="button"
                onClick={() => {
                  sound.tap();
                  setActiveGuideTab('edge');
                }}
                className={`flex-1 py-1.5 px-2 text-xs font-medium rounded-lg transition-all cursor-pointer text-center ${
                  activeGuideTab === 'edge'
                    ? 'bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100 shadow-xs font-semibold'
                    : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100'
                }`}
              >
                Microsoft Edge
              </button>
              <button
                type="button"
                onClick={() => {
                  sound.tap();
                  setActiveGuideTab('safari');
                }}
                className={`flex-1 py-1.5 px-2 text-xs font-medium rounded-lg transition-all cursor-pointer text-center ${
                  activeGuideTab === 'safari'
                    ? 'bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100 shadow-xs font-semibold'
                    : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100'
                }`}
              >
                macOS / Safari
              </button>
            </div>

            {/* Guide Content */}
            <div className="p-3.5 rounded-xl bg-neutral-50 dark:bg-neutral-800/40 border border-neutral-200 dark:border-neutral-800 space-y-2.5">
              {activeGuideTab === 'chrome' && (
                <ol className="space-y-2 list-decimal list-inside text-[11px] sm:text-xs text-neutral-700 dark:text-neutral-300">
                  <li className="leading-relaxed">
                    <span className="font-semibold text-neutral-900 dark:text-neutral-100">
                      Icono en la barra de URL:
                    </span>{' '}
                    En la parte derecha de la barra de direcciones de Chrome o Brave, busca el icono{' '}
                    <span className="font-mono px-1 py-0.5 rounded bg-neutral-200 dark:bg-neutral-700 text-neutral-900 dark:text-neutral-100 text-[10px]">
                      ⊕ Instalar Portal 2º SMR
                    </span>
                    .
                  </li>
                  <li className="leading-relaxed">
                    <span className="font-semibold text-neutral-900 dark:text-neutral-100">
                      Desde el menú:
                    </span>{' '}
                    Haz clic en el menú <span className="font-semibold">⋮</span> (arriba a la derecha) &gt;{' '}
                    <span className="font-semibold">Guardar y compartir</span> &gt;{' '}
                    <span className="font-semibold">Instalar Portal 2º SMR...</span>
                  </li>
                  <li className="leading-relaxed">
                    <span className="font-semibold text-neutral-900 dark:text-neutral-100">
                      Confirmar:
                    </span>{' '}
                    Pulsa en <span className="font-semibold">Instalar</span> en el diálogo emergente para crear el acceso en tu escritorio y menú de aplicaciones.
                  </li>
                </ol>
              )}

              {activeGuideTab === 'edge' && (
                <ol className="space-y-2 list-decimal list-inside text-[11px] sm:text-xs text-neutral-700 dark:text-neutral-300">
                  <li className="leading-relaxed">
                    <span className="font-semibold text-neutral-900 dark:text-neutral-100">
                      Icono de aplicación:
                    </span>{' '}
                    En la barra de direcciones de Edge, pulsa el botón con icono{' '}
                    <span className="font-mono px-1 py-0.5 rounded bg-neutral-200 dark:bg-neutral-700 text-neutral-900 dark:text-neutral-100 text-[10px]">
                      ⊞ Aplicación disponible
                    </span>
                    .
                  </li>
                  <li className="leading-relaxed">
                    <span className="font-semibold text-neutral-900 dark:text-neutral-100">
                      Desde el menú:
                    </span>{' '}
                    Haz clic en <span className="font-semibold">…</span> &gt;{' '}
                    <span className="font-semibold">Aplicaciones</span> &gt;{' '}
                    <span className="font-semibold">Instalar este sitio como una aplicación</span>.
                  </li>
                  <li className="leading-relaxed">
                    <span className="font-semibold text-neutral-900 dark:text-neutral-100">
                      Anclar:
                    </span>{' '}
                    Marca las casillas <span className="font-semibold">Anclar a la barra de tareas</span> y{' '}
                    <span className="font-semibold">Anclar a Inicio</span> para tener acceso en 1 clic.
                  </li>
                </ol>
              )}

              {activeGuideTab === 'safari' && (
                <ol className="space-y-2 list-decimal list-inside text-[11px] sm:text-xs text-neutral-700 dark:text-neutral-300">
                  <li className="leading-relaxed">
                    <span className="font-semibold text-neutral-900 dark:text-neutral-100">
                      Menú Archivo de macOS:
                    </span>{' '}
                    En la barra superior de Mac con Safari abierto, haz clic en{' '}
                    <span className="font-semibold">Archivo</span> &gt;{' '}
                    <span className="font-semibold">Agregar al Dock...</span>
                  </li>
                  <li className="leading-relaxed">
                    <span className="font-semibold text-neutral-900 dark:text-neutral-100">
                      O botón Compartir:
                    </span>{' '}
                    Pulsa el icono de Compartir de Safari y selecciona{' '}
                    <span className="font-semibold">Agregar al Dock</span>.
                  </li>
                  <li className="leading-relaxed">
                    <span className="font-semibold text-neutral-900 dark:text-neutral-100">
                      Confirmar:
                    </span>{' '}
                    Haz clic en <span className="font-semibold">Agregar</span>. El icono de Portal 2º SMR se fijará en tu Dock de Mac.
                  </li>
                </ol>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-neutral-200 dark:border-neutral-800 bg-neutral-50/80 dark:bg-neutral-900/60 flex items-center justify-between">
          <div className="text-[11px] text-neutral-500 dark:text-neutral-400 font-mono">
            PWA · v2.9.0
          </div>
          <Button
            variant="secondary"
            size="sm"
            onClick={onClose}
            className="rounded-xl"
          >
            Cerrar
          </Button>
        </div>
      </div>
    </div>
  );
};
