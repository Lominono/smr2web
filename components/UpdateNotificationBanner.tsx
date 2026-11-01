'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  RefreshCw,
  X,
  Check,
  ChevronRight,
  Sparkles,
  History,
  ExternalLink,
  Flame,
  Bot,
  Zap,
  ShieldCheck,
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

export const UpdateNotificationBanner: React.FC = () => {
  const initialVersionRef = useRef<string | null>(null);
  const [hasUpdate, setHasUpdate] = useState(false);
  const [updateDetails, setUpdateDetails] = useState<UpdateDetails | null>(null);
  const [changelogHistory, setChangelogHistory] = useState<ChangelogHistoryItem[]>([]);
  const [isMinimized, setIsMinimized] = useState(false);
  const [isLiveDeploy, setIsLiveDeploy] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedHistoryVersion, setSelectedHistoryVersion] = useState<string>('2.8.0');

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
          setSelectedHistoryVersion(latest.version || '2.8.0');
        }
        sound.tap();
      } else {
        if (!initialVersionRef.current) {
          initialVersionRef.current = serverVersion;
        }

        const lastSeen = typeof window !== 'undefined' ? localStorage.getItem('smr2_last_seen_version') : null;
        const currentVersion = latest?.version || data.appVersion || '2.8.0';
        if (latest) {
          setUpdateDetails(latest);
          setSelectedHistoryVersion(latest.version || '2.8.0');
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

    // Polling regular cada 40 segundos para detectar despliegues automáticos
    const interval = setInterval(checkVersion, 40000);

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
            setSelectedHistoryVersion(upd.version || '2.8.0');
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

  const handleReload = () => {
    sound.tap();
    const v = updateDetails?.version || '2.8.0';
    try {
      localStorage.setItem('smr2_last_seen_version', v);
    } catch {}
    window.location.reload();
  };

  const handleDismiss = () => {
    sound.tap();
    const v = updateDetails?.version || '2.8.0';
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
      '🎮 Ruleta Rusa Táctica Inmersiva: Nuevo visor de cartuchos reales y salvas, animaciones de recámara con tensión e IA de rivales avanzada.',
      '📢 Centro de Avisos y Novedades Veraces: Registro fiel y en tiempo real de todo lo que cambia en la plataforma.',
      '🤖 Asistente PUTOISAAC Pro: Temario completo de 2º SMR, atajos y comandos directos de aula.',
    ];
  };

  const currentChangeList = getChangeList(updateDetails?.changes);

  // Registro seleccionado para el visor de historial
  const activeHistoryEntry =
    changelogHistory.find((item) => item.version === selectedHistoryVersion) ||
    changelogHistory[0] || {
      version: updateDetails?.version || '2.8.0',
      title: updateDetails?.title || 'Novedades de la versión',
      description: updateDetails?.description || 'Mejoras en el portal de 2º SMR.',
      badge: 'ÚLTIMA NOVEDAD',
      date: 'Hoy',
      changes: currentChangeList,
    };

  return (
    <>
      {/* 1. Modal Completo de Novedades e Historial de Versiones */}
      {isModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-6 bg-black/70 backdrop-blur-md animate-in fade-in duration-200"
        >
          <div className="w-full max-w-2xl bg-surface/95 border border-border shadow-2xl rounded-3xl overflow-hidden flex flex-col max-h-[90vh]">
            {/* Cabecera del modal */}
            <div className="p-4 sm:p-6 border-b border-border/80 flex items-center justify-between gap-4 bg-surface-raised/40">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-base sm:text-lg font-bold text-foreground tracking-tight">
                      Centro de Novedades y Versiones
                    </h2>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                      v{updateDetails?.version || '2.8.0'}
                    </span>
                  </div>
                  <p className="text-xs text-foreground-muted">
                    Transparencia absoluta: qué se ha añadido, mejorado o arreglado de verdad.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="w-8 h-8 rounded-xl bg-surface hover:bg-surface-hover border border-border text-foreground-subtle hover:text-foreground flex items-center justify-center transition-colors cursor-pointer"
                title="Cerrar modal"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Pestañas de versiones anteriores (si hay varias) */}
            {changelogHistory.length > 1 && (
              <div className="flex items-center gap-2 px-4 sm:px-6 py-2.5 bg-surface-raised/60 border-b border-border/60 overflow-x-auto no-scrollbar">
                <span className="text-[11px] font-mono text-foreground-subtle shrink-0 mr-1 flex items-center gap-1">
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
                      className={`px-3 py-1 rounded-xl text-xs font-mono transition-all cursor-pointer shrink-0 flex items-center gap-1.5 ${
                        isSelected
                          ? 'bg-foreground text-background font-semibold shadow-xs'
                          : 'bg-surface hover:bg-surface-raised text-foreground-muted border border-border/80'
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
            <div className="p-4 sm:p-6 overflow-y-auto space-y-4 flex-1">
              <div className="p-4 rounded-2xl bg-surface-raised/50 border border-border/70 space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[11px] font-mono uppercase tracking-wider text-emerald-400 font-semibold">
                    {activeHistoryEntry.badge || `Versión ${activeHistoryEntry.version}`}
                  </span>
                  <span className="text-[11px] font-mono text-foreground-subtle">
                    {activeHistoryEntry.date}
                  </span>
                </div>
                <h3 className="text-sm sm:text-base font-bold text-foreground">
                  {activeHistoryEntry.title}
                </h3>
                <p className="text-xs text-foreground-muted leading-relaxed">
                  {activeHistoryEntry.description}
                </p>
              </div>

              <div className="space-y-2">
                <h4 className="text-xs font-semibold text-foreground tracking-tight flex items-center gap-1.5">
                  <span>Cambios y mejoras en esta versión:</span>
                </h4>
                <div className="space-y-2">
                  {getChangeList(activeHistoryEntry.changes).map((change, idx) => (
                    <div
                      key={idx}
                      className="p-3 rounded-2xl bg-surface border border-border/60 flex items-start gap-3 text-xs text-foreground-muted leading-relaxed"
                    >
                      <span className="w-5 h-5 rounded-lg bg-surface-raised border border-border/80 text-foreground font-mono text-[10px] flex items-center justify-center shrink-0 mt-0.5">
                        {idx + 1}
                      </span>
                      <span className="flex-1">{change}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Pie de acciones del modal */}
            <div className="p-4 sm:p-5 border-t border-border/80 bg-surface-raised/30 flex items-center justify-between gap-3">
              <div className="text-[11px] text-foreground-subtle font-mono hidden sm:block">
                SMR2 Web · Aula 204
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                {isLiveDeploy ? (
                  <button
                    type="button"
                    onClick={handleReload}
                    className="w-full sm:w-auto px-4 py-2 rounded-xl bg-foreground text-background text-xs font-semibold hover:opacity-90 active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer shadow-sm"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>Recargar para aplicar</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleDismiss}
                    className="w-full sm:w-auto px-5 py-2 rounded-xl bg-foreground text-background text-xs font-semibold hover:opacity-90 active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer shadow-sm"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>Entendido, marcar como leído</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 2. Píldora minimizada en esquina inferior */}
      {hasUpdate && isMinimized && (
        <div className="fixed bottom-4 right-4 z-50 animate-in fade-in slide-in-from-bottom-2 duration-200">
          <button
            type="button"
            onClick={() => {
              sound.tap();
              setIsMinimized(false);
            }}
            className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-surface/90 backdrop-blur-md text-foreground text-xs border border-border/80 shadow-md hover:bg-surface-raised active:scale-95 transition-all cursor-pointer font-sans"
            title="Ver detalles de la versión"
          >
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="font-mono text-[11px] text-foreground-muted">
              v{updateDetails?.version || '2.8.0'}
            </span>
            <span className="text-[11px] font-medium text-foreground">
              {isLiveDeploy ? 'Actualizar' : 'Novedades'}
            </span>
            <ChevronRight className="w-3 h-3 text-foreground-subtle" />
          </button>
        </div>
      )}

      {/* 3. Banner flotante superior (Aviso destacado con resumen de verdad) */}
      {hasUpdate && !isMinimized && !isModalOpen && (
        <div
          role="alert"
          aria-live="assertive"
          className="fixed top-3 left-3 right-3 sm:left-auto sm:right-6 sm:max-w-md z-50 animate-in slide-in-from-top-2 fade-in duration-200 select-none"
        >
          <div className="p-4 rounded-3xl bg-surface/95 backdrop-blur-xl border border-border shadow-2xl space-y-3 text-foreground">
            {/* Cabecera del aviso */}
            <div className="flex items-start justify-between gap-3">
              <div className="space-y-0.5 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0 animate-pulse" />
                  <span className="text-[11px] font-mono font-medium uppercase tracking-wider text-emerald-400">
                    Versión {updateDetails?.version || '2.8.0'}
                  </span>
                  <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-surface-raised text-foreground-subtle border border-border/60">
                    {isLiveDeploy ? 'Despliegue en vivo' : 'Nueva versión'}
                  </span>
                </div>
                <h3 className="text-xs font-bold text-foreground tracking-tight line-clamp-1">
                  {updateDetails?.title || 'Mejoras en Ruleta Rusa y Asistente'}
                </h3>
              </div>

              <button
                type="button"
                onClick={handleDismiss}
                className="w-6 h-6 rounded-lg text-foreground-subtle hover:text-foreground hover:bg-surface-raised flex items-center justify-center transition-colors cursor-pointer shrink-0"
                title="Cerrar aviso"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Resumen honesto de cambios */}
            <div className="p-3 rounded-2xl bg-surface-raised/70 border border-border/60 space-y-2">
              {updateDetails?.description && (
                <p className="text-[11px] text-foreground-muted leading-relaxed font-sans line-clamp-2">
                  {updateDetails.description}
                </p>
              )}

              <ul className="space-y-1.5 pt-0.5">
                {currentChangeList.slice(0, 3).map((change, idx) => (
                  <li key={idx} className="flex items-start gap-2 text-[11px] text-foreground-muted leading-relaxed">
                    <span className="text-emerald-500 shrink-0 mt-0.5 text-[9px] font-mono">✓</span>
                    <span className="line-clamp-2">{change}</span>
                  </li>
                ))}
              </ul>

              <button
                type="button"
                onClick={handleOpenFullModal}
                className="w-full pt-1 text-[11px] font-medium text-emerald-400 hover:text-emerald-300 flex items-center justify-center gap-1 transition-colors cursor-pointer"
              >
                <span>Ver todos los detalles y versiones anteriores</span>
                <ChevronRight className="w-3 h-3" />
              </button>
            </div>

            {/* Botones de acción */}
            <div className="flex items-center justify-between gap-2 pt-1 border-t border-border/60">
              <button
                type="button"
                onClick={() => {
                  sound.tap();
                  setIsMinimized(true);
                }}
                className="text-[11px] text-foreground-subtle hover:text-foreground transition-colors cursor-pointer"
              >
                Minimizar
              </button>

              <div className="flex items-center gap-2">
                {isLiveDeploy ? (
                  <>
                    <button
                      type="button"
                      onClick={handleDismiss}
                      className="px-2.5 py-1 text-xs text-foreground-muted hover:text-foreground transition-colors cursor-pointer"
                    >
                      Más tarde
                    </button>
                    <button
                      type="button"
                      onClick={handleReload}
                      className="px-3.5 py-1.5 rounded-xl bg-foreground text-background text-xs font-semibold hover:opacity-90 active:scale-95 transition-all flex items-center gap-1.5 cursor-pointer shadow-xs"
                    >
                      <RefreshCw className="w-3 h-3" />
                      <span>Actualizar ahora</span>
                    </button>
                  </>
                ) : (
                  <button
                    type="button"
                    onClick={handleDismiss}
                    className="px-3.5 py-1.5 rounded-xl bg-foreground text-background text-xs font-semibold hover:opacity-90 active:scale-95 transition-all flex items-center gap-1.5 cursor-pointer shadow-xs"
                  >
                    <Check className="w-3 h-3" />
                    <span>Entendido</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
