'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  RefreshCw,
  X,
  Check,
  ChevronRight,
  GitBranch,
  History,
  Terminal,
  Layers,
  ArrowUpRight,
} from 'lucide-react';
import { sound } from '@/lib/audio';
import { createClient } from '@/lib/supabase/client';

export interface UpdateDetails {
  id?: string;
  version?: string;
  title?: string;
  description?: string;
  badge?: string;
  date?: string;
  changes?: string[] | string;
  created_at?: string;
}

export interface ChangelogHistoryItem {
  version: string;
  title: string;
  description: string;
  badge?: string;
  date: string;
  changes: string[];
}

interface UpdateNotificationBannerProps {
  isBlocked?: boolean;
}

export const UpdateNotificationBanner: React.FC<UpdateNotificationBannerProps> = ({
  isBlocked = false,
}) => {
  const initialVersionRef = useRef<string | null>(null);
  const [hasUpdate, setHasUpdate] = useState(false);
  const [updateDetails, setUpdateDetails] = useState<UpdateDetails | null>(null);
  const [changelogHistory, setChangelogHistory] = useState<ChangelogHistoryItem[]>([]);
  const [isMinimized, setIsMinimized] = useState(false);
  const [isLiveDeploy, setIsLiveDeploy] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedHistoryVersion, setSelectedHistoryVersion] = useState<string>('1.0.1');

  const checkVersion = async () => {
    try {
      const res = await fetch(`/api/version?t=${Date.now()}`, {
        cache: 'no-store',
      });
      if (!res.ok) return;
      const data = await res.json();
      const serverVersion = data.version || data.commitSha || String(data.serverBootTime);
      const latest = data.latestUpdate;
      const historyList = data.history || [];

      if (historyList.length > 0) {
        setChangelogHistory(historyList);
      }

      if (initialVersionRef.current && initialVersionRef.current !== serverVersion) {
        setIsLiveDeploy(true);
        setHasUpdate(true);
        if (latest) {
          setUpdateDetails(latest);
          setSelectedHistoryVersion(latest.version || '1.0.0');
        }
        sound.tap();
      } else {
        if (!initialVersionRef.current) {
          initialVersionRef.current = serverVersion;
        }

        const lastSeen = typeof window !== 'undefined' ? localStorage.getItem('smr2_last_seen_version') : null;
        const currentVersion = latest?.version || data.appVersion || '1.0.0';
        if (latest) {
          setUpdateDetails(latest);
          setSelectedHistoryVersion(latest.version || '1.0.0');
        }

        if (lastSeen !== currentVersion) {
          setIsLiveDeploy(false);
          setHasUpdate(true);
        }
      }
    } catch {}
  };

  useEffect(() => {
    checkVersion();

    const handleOpenChangelog = () => {
      sound.tap();
      setIsModalOpen(true);
      checkVersion();
    };
    window.addEventListener('smr2_open_changelog', handleOpenChangelog);

    // Polling regular cada 45 segundos para detectar despliegues automáticos
    const interval = setInterval(checkVersion, 45000);

    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        checkVersion();
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);
    window.addEventListener('focus', checkVersion);

    const supabase = createClient();
    let channel: any = null;
    if (supabase) {
      channel = supabase
        .channel('app_updates_broadcast_global')
        .on(
          'postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'app_updates' },
          (payload) => {
            const upd = payload.new as UpdateDetails;
            setIsLiveDeploy(true);
            setHasUpdate(true);
            setUpdateDetails(upd);
            setSelectedHistoryVersion(upd.version || '1.0.0');
            sound.tap();
          }
        )
        .subscribe();
    }

    return () => {
      window.removeEventListener('smr2_open_changelog', handleOpenChangelog);
      clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibility);
      window.removeEventListener('focus', checkVersion);
      if (supabase && channel) {
        supabase.removeChannel(channel);
      }
    };
  }, []);

  const handleReload = async () => {
    sound.tap();
    const v = updateDetails?.version || '1.5.0';
    try {
      localStorage.setItem('smr2_last_seen_version', v);
    } catch {}
    if ('serviceWorker' in navigator) {
      try {
        const regs = await navigator.serviceWorker.getRegistrations();
        for (const reg of regs) {
          await reg.update();
        }
      } catch {}
    }
    if ('caches' in window) {
      try {
        const keys = await caches.keys();
        for (const k of keys) {
          await caches.delete(k);
        }
      } catch {}
    }
    window.location.reload();
  };

  const handleDismiss = () => {
    sound.tap();
    const v = updateDetails?.version || '1.0.0';
    try {
      localStorage.setItem('smr2_last_seen_version', v);
    } catch {}
    setHasUpdate(false);
    setIsModalOpen(false);
  };

  const handleOpenFullModal = () => {
    sound.tap();
    setIsModalOpen(true);
  };

  // Helper para normalizar lista de cambios
  const getChangeList = (changesInput: any): string[] => {
    if (Array.isArray(changesInput)) return changesInput;
    if (typeof changesInput === 'string') {
      try {
        const parsed = JSON.parse(changesInput);
        if (Array.isArray(parsed)) return parsed;
      } catch {
        return [changesInput];
      }
    }
    return [
      'Identidad verídica en el tablón: Corrección definitiva del fallo que mostraba a los alumnos bajo el alias BANCA_SISTEMA.',
      'Minijuego Crash optimizado: El multiplicador arranca en 0.50x con aceleración suave y telemetría de osciloscopio.',
      'Secuencia de inducción ordenada: El recorrido de PUTOISAAC inicia estrictamente tras la verificación del puesto.',
      'Rendimiento y fluidez: Sincronización inmediata de saldo y optimización para pantallas táctiles.',
    ];
  };

  const currentChangeList = getChangeList(updateDetails?.changes);

  // Registro seleccionado para el visor de historial
  const activeHistoryEntry =
    changelogHistory.find((item) => item.version === selectedHistoryVersion) ||
    changelogHistory[0] || {
      version: updateDetails?.version || '1.0.0',
      title: updateDetails?.title || 'Novedades de la versión',
      description: updateDetails?.description || 'Mejoras en el portal de 2º SMR.',
      badge: 'ACTUAL',
      date: 'Hoy',
      changes: currentChangeList,
    };

  // Si está bloqueado por el tour activo pero no hay actualización obligatoria pendiente
  if (isBlocked && !isModalOpen && !hasUpdate) {
    return null;
  }

  return (
    <>
      {/* 1. Modal Editorial de Novedades e Historial de Versiones */}
      {isModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-6 bg-black/60 backdrop-blur-md animate-in fade-in duration-200"
        >
          <div className="w-full max-w-2xl bg-surface/98 border border-border shadow-2xl rounded-2xl overflow-hidden flex flex-col max-h-[90vh]">
            {/* Cabecera editorial */}
            <div className="px-5 py-4 border-b border-border flex items-center justify-between gap-4 bg-surface-raised/40">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-8 h-8 rounded-lg bg-surface-raised border border-border text-foreground flex items-center justify-center shrink-0">
                  <GitBranch className="w-4 h-4 text-foreground-muted" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h2 className="text-sm font-semibold text-foreground tracking-tight truncate">
                      Registro de Versiones y Cambios
                    </h2>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-surface-raised text-foreground-muted border border-border/70">
                      v{updateDetails?.version || '1.0.0'}
                    </span>
                  </div>
                  <p className="text-[11px] text-foreground-muted truncate">
                    Registro de desarrollo y mejoras del aula 35.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="w-7 h-7 rounded-lg text-foreground-subtle hover:text-foreground hover:bg-surface-raised border border-border flex items-center justify-center transition-colors cursor-pointer"
                title="Cerrar modal"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Pestañas de versiones anteriores */}
            {changelogHistory.length > 1 && (
              <div className="flex items-center gap-1.5 px-5 py-2 bg-surface border-b border-border/60 overflow-x-auto scrollbar-none">
                <span className="text-[11px] font-mono text-foreground-subtle shrink-0 mr-1.5 flex items-center gap-1">
                  <History className="w-3 h-3" /> Historial:
                </span>
                {changelogHistory.map((entry) => {
                  const isSelected = entry.version === activeHistoryEntry.version;
                  return (
                    <button
                      key={entry.version}
                      type="button"
                      onClick={() => {
                        sound.tap();
                        setSelectedHistoryVersion(entry.version);
                      }}
                      className={`px-2.5 py-1 rounded-md text-xs font-mono transition-colors cursor-pointer shrink-0 flex items-center gap-1.5 ${
                        isSelected
                          ? 'bg-foreground text-background font-medium'
                          : 'bg-surface-raised/60 hover:bg-surface-raised text-foreground-muted border border-border/60'
                      }`}
                    >
                      <span>v{entry.version}</span>
                      {entry.badge && (
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                      )}
                    </button>
                  );
                })}
              </div>
            )}

            {/* Contenido de la versión activa */}
            <div className="p-5 overflow-y-auto space-y-4 flex-1">
              <div className="p-4 rounded-xl bg-surface-raised/40 border border-border/70 space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[10px] font-mono uppercase tracking-wider text-foreground-muted font-medium">
                    {activeHistoryEntry.badge || `Versión ${activeHistoryEntry.version}`}
                  </span>
                  <span className="text-[11px] font-mono text-foreground-subtle">
                    {activeHistoryEntry.date}
                  </span>
                </div>
                <h3 className="text-sm font-semibold text-foreground">
                  {activeHistoryEntry.title}
                </h3>
                <p className="text-xs text-foreground-muted leading-relaxed">
                  {activeHistoryEntry.description}
                </p>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="text-[11px] font-semibold text-foreground uppercase tracking-wider font-mono">
                    Detalle de Cambios
                  </h4>
                  <span className="text-[10px] font-mono text-foreground-subtle">
                    {getChangeList(activeHistoryEntry.changes).length} entradas
                  </span>
                </div>
                <div className="space-y-2">
                  {getChangeList(activeHistoryEntry.changes).map((change, idx) => (
                    <div
                      key={idx}
                      className="p-3 rounded-lg bg-surface border border-border/60 flex items-start gap-3 text-xs text-foreground leading-relaxed"
                    >
                      <span className="w-4 h-4 rounded bg-surface-raised border border-border/80 text-foreground-muted font-mono text-[10px] flex items-center justify-center shrink-0 mt-0.5">
                        {idx + 1}
                      </span>
                      <span className="flex-1 text-foreground-muted">{change}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Pie de acciones del modal */}
            <div className="px-5 py-3.5 border-t border-border bg-surface-raised/30 flex items-center justify-between gap-3">
              <div className="text-[11px] text-foreground-subtle font-mono hidden sm:block">
                SMR2 Web · Aula 35
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                {isLiveDeploy ? (
                  <button
                    type="button"
                    onClick={handleReload}
                    className="w-full sm:w-auto px-4 py-1.5 rounded-lg bg-foreground text-background text-xs font-medium hover:opacity-90 active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer shadow-xs"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>Recargar para aplicar</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleDismiss}
                    className="w-full sm:w-auto px-4 py-1.5 rounded-lg bg-foreground text-background text-xs font-medium hover:opacity-90 active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer shadow-xs"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>Marcar como leído</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 2. Píldora minimizada en esquina inferior derecha */}
      {hasUpdate && isMinimized && (
        <div className="fixed bottom-4 right-4 z-40 animate-in fade-in slide-in-from-bottom-2 duration-200">
          <button
            type="button"
            onClick={() => {
              sound.tap();
              setIsMinimized(false);
            }}
            className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-surface/95 backdrop-blur-md text-foreground text-xs border border-border shadow-md hover:bg-surface-raised active:scale-95 transition-all cursor-pointer font-sans"
            title="Ver detalles de la versión"
          >
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="font-mono text-[11px] text-foreground-muted">
              v{updateDetails?.version || '1.0.0'}
            </span>
            <span className="text-[11px] font-medium text-foreground">
              {isLiveDeploy ? 'Actualización' : 'Novedades'}
            </span>
            <ChevronRight className="w-3 h-3 text-foreground-subtle" />
          </button>
        </div>
      )}

      {/* 3. Pantalla en negro obligatoria de actualización */}
      {hasUpdate && (
        <div
          role="alertdialog"
          aria-modal="true"
          className="fixed inset-0 z-[99999] bg-black text-white flex flex-col items-center justify-center p-4 sm:p-6 overflow-y-auto antialiased animate-in fade-in duration-300"
        >
          <div className="w-full max-w-lg bg-neutral-950 border border-neutral-800 rounded-3xl p-6 sm:p-8 space-y-6 shadow-2xl relative my-auto">
            {/* Cabecera con indicación obligatoria */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-[10px] font-mono uppercase tracking-widest text-neutral-400">
                  Actualización obligatoria
                </span>
                <span className="text-[10px] font-mono px-2.5 py-0.5 rounded-full bg-neutral-900 border border-neutral-800 text-neutral-300 ml-auto">
                  v{updateDetails?.version || '1.5.0'}
                </span>
              </div>
              <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-white font-sans">
                {updateDetails?.title || `Nueva versión ${updateDetails?.version || '1.5.0'} disponible`}
              </h2>
              <p className="text-xs sm:text-sm text-neutral-300 leading-relaxed font-sans">
                Debes actualizar a la última versión para poder continuar. Esta actualización es obligatoria para que el juego funcione correctamente y mantenga las mismas reglas y condiciones justas para todos los alumnos.
              </p>
            </div>

            {/* Explicación detallada de la actualización */}
            <div className="p-4 rounded-2xl bg-neutral-900/80 border border-neutral-800 space-y-3">
              <div className="flex items-center justify-between text-xs text-neutral-400 font-mono pb-2 border-b border-neutral-800/80">
                <span>Novedades del parche</span>
                <span>{updateDetails?.date || 'Hoy'}</span>
              </div>

              {updateDetails?.description && (
                <p className="text-xs text-neutral-300 leading-relaxed font-sans">
                  {updateDetails.description}
                </p>
              )}

              <ul className="space-y-2 pt-1 font-sans">
                {currentChangeList.map((change, idx) => (
                  <li key={idx} className="flex items-start gap-2.5 text-xs text-neutral-300 leading-relaxed">
                    <span className="text-neutral-500 font-mono text-[11px] shrink-0 mt-0.5">—</span>
                    <span>{change}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Botón único y obligatorio de actualización */}
            <div className="space-y-2.5 pt-1">
              <button
                type="button"
                onClick={handleReload}
                className="w-full min-h-[50px] py-3.5 px-5 rounded-2xl bg-white hover:bg-neutral-200 text-black font-semibold text-sm transition-all active:scale-[0.99] flex items-center justify-center gap-2.5 cursor-pointer shadow-lg"
              >
                <RefreshCw className="w-4 h-4" />
                <span>Actualizar a la versión {updateDetails?.version || '1.5.0'}</span>
              </button>
              <p className="text-[11px] text-center text-neutral-500 font-mono">
                Se limpiará la caché y se cargará la versión oficial más reciente.
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
