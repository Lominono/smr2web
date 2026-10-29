'use client';

import React, { useState, useEffect, useRef } from 'react';
import { RefreshCw, X, Sparkles, Check, ArrowRight, ShieldCheck, Zap, Terminal } from 'lucide-react';
import { sound } from '@/lib/audio';
import { createClient } from '@/lib/supabase/client';

export const CURRENT_RELEASE_VERSION = '0.0.1-beta';

interface UpdateDetails {
  id?: string;
  version?: string;
  title?: string;
  description?: string;
  changes?: string[] | string;
  created_at?: string;
}

const DEFAULT_CHANGES: string[] = [
  'Asistente ISAAC: Control directo de la interfaz web, atajo de teclado ⌘K, consulta en vivo del horario de clase y síntesis sonora de teletipo al responder.',
  'Conteo oficial ultra-minimalista: Pantalla de espera sin botones con acceso seguro mediante atajo o secuencia de teclado (Shift+Esc / smr).',
  'Auditoría y seguridad (/admin): Terminal interactiva de hacking ético con pistas forenses, reto de subredes y payload confidencial desclasificado.',
  'Bolsa de El Botellón: Simulación del mercado de valores de la clase con cotizaciones y gráficas en tiempo real.',
  'Tablón de avisos: Comunicación instantánea sin recarga para los alumnos del Aula 204.',
];

export const UpdateNotificationBanner: React.FC = () => {
  const initialVersionRef = useRef<string | null>(null);
  const [hasUpdate, setHasUpdate] = useState(false);
  const [updateDetails, setUpdateDetails] = useState<UpdateDetails | null>(null);
  const [isMinimized, setIsMinimized] = useState(false);
  const [isLiveDeploy, setIsLiveDeploy] = useState(false);

  // Comprobar la versión del servidor contra la versión capturada
  const checkVersion = async () => {
    try {
      const res = await fetch(`/api/version?t=${Date.now()}`, {
        cache: 'no-store',
      });
      if (!res.ok) return;
      const data = await res.json();
      const serverVersion = data.version || data.commitSha || String(data.serverBootTime);
      const latest = data.latestUpdate;

      // 1. Si la versión cambió en caliente mientras el usuario tenía la pestaña abierta (despliegue en Vercel)
      if (initialVersionRef.current && initialVersionRef.current !== serverVersion) {
        setIsLiveDeploy(true);
        setHasUpdate(true);
        if (latest) setUpdateDetails(latest);
        try {
          sound.tap();
        } catch {}
      } else {
        if (!initialVersionRef.current) {
          initialVersionRef.current = serverVersion;
        }

        // 2. Si el usuario aún no ha reconocido la versión 0.0.1 Beta
        const lastSeen = typeof window !== 'undefined' ? localStorage.getItem('smr2_last_seen_version') : null;
        const currentVersion = latest?.version || CURRENT_RELEASE_VERSION;
        if (latest) setUpdateDetails(latest);

        if (lastSeen !== currentVersion) {
          setIsLiveDeploy(false);
          setHasUpdate(true);
        }
      }
    } catch {}
  };

  useEffect(() => {
    // 1. Comprobación inicial al montar
    checkVersion();

    // 2. Apertura bajo demanda desde el menú o barra de navegación
    const handleOpenChangelog = () => {
      setHasUpdate(true);
      setIsMinimized(false);
      checkVersion();
    };
    window.addEventListener('smr2_open_changelog', handleOpenChangelog);

    // 3. Comprobación recurrente ligera cada 45 segundos
    const interval = setInterval(checkVersion, 45000);

    // 4. Comprobación al volver a la pestaña
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        checkVersion();
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);
    window.addEventListener('focus', checkVersion);

    // 5. Suscripción en tiempo real en Supabase a la tabla `app_updates` si existe
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
            try {
              sound.tap();
            } catch {}
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
    try {
      sound.tap();
      const v = updateDetails?.version || CURRENT_RELEASE_VERSION;
      localStorage.setItem('smr2_last_seen_version', v);
    } catch {}
    window.location.reload();
  };

  const handleDismiss = () => {
    try {
      sound.tap();
      const v = updateDetails?.version || CURRENT_RELEASE_VERSION;
      localStorage.setItem('smr2_last_seen_version', v);
    } catch {}
    setHasUpdate(false);
  };

  if (!hasUpdate) return null;

  // Extraer lista de cambios limpia
  let changeList: string[] = [];
  if (Array.isArray(updateDetails?.changes)) {
    changeList = updateDetails.changes;
  } else if (typeof updateDetails?.changes === 'string') {
    try {
      const parsed = JSON.parse(updateDetails.changes);
      if (Array.isArray(parsed)) changeList = parsed;
    } catch {
      changeList = [updateDetails.changes];
    }
  }

  if (changeList.length === 0) {
    changeList = DEFAULT_CHANGES;
  }

  // Estado Minimizado: Píldora en la esquina inferior
  if (isMinimized) {
    return (
      <div className="fixed bottom-4 right-4 z-50 animate-in fade-in slide-in-from-bottom-2 duration-200">
        <button
          type="button"
          onClick={() => setIsMinimized(false)}
          className="flex items-center gap-2.5 px-3.5 py-2 rounded-xl bg-neutral-950/95 text-neutral-200 border border-neutral-800 text-xs font-mono shadow-2xl hover:border-neutral-700 active:scale-95 transition-all cursor-pointer backdrop-blur-md"
          title="Ver novedades de la versión"
        >
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-[11px] font-semibold text-white">v0.0.1 Beta</span>
          <span className="text-neutral-400">· Novedades</span>
        </button>
      </div>
    );
  }

  // Despliegue en vivo en caliente (Banner superior de recarga)
  if (isLiveDeploy) {
    return (
      <div
        role="alert"
        aria-live="assertive"
        className="fixed top-3 inset-x-3 sm:inset-x-auto sm:right-6 sm:max-w-md z-50 animate-in slide-in-from-top-2 duration-200"
      >
        <div className="p-4 rounded-xl bg-neutral-950/95 border border-neutral-800 text-white shadow-2xl space-y-3 font-mono text-xs backdrop-blur-md">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="font-semibold text-neutral-100">Nueva versión lista en servidor</span>
            </div>
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-neutral-900 border border-neutral-800 text-neutral-400">
              v0.0.1 Beta
            </span>
          </div>

          <p className="text-[11px] text-neutral-400 leading-relaxed font-sans">
            Se ha completado una actualización del portal en Vercel. Recarga para aplicar los cambios de inmediato.
          </p>

          <div className="flex items-center justify-end gap-2 pt-1 border-t border-neutral-900">
            <button
              type="button"
              onClick={handleDismiss}
              className="px-3 py-1.5 text-[11px] text-neutral-400 hover:text-white transition-colors cursor-pointer"
            >
              Más tarde
            </button>
            <button
              type="button"
              onClick={handleReload}
              className="px-3.5 py-1.5 rounded-lg bg-white hover:bg-neutral-200 active:scale-95 text-black font-semibold text-[11px] transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <RefreshCw className="w-3 h-3" />
              <span>Actualizar ahora</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Modal de Novedades Oficiales de la Versión 0.0.1 Beta
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs font-sans animate-in fade-in duration-150">
      <div
        className="max-w-lg w-full bg-neutral-950 border border-neutral-800 rounded-2xl p-5 sm:p-6 text-white space-y-4 shadow-2xl relative"
        style={{
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.85)',
        }}
      >
        {/* Cabecera del Release */}
        <div className="flex items-start justify-between gap-3 border-b border-neutral-900 pb-3">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-xs font-mono font-semibold tracking-wider text-emerald-400 uppercase">
                PORTAL 2º SMR · VERSIÓN OFICIAL
              </span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-neutral-900 border border-neutral-800 text-neutral-300 font-bold">
                0.0.1 Beta
              </span>
            </div>
            <h2 className="text-base font-bold text-white tracking-tight">
              {updateDetails?.title || 'Actualización del Sistema · Versión 0.0.1 Beta'}
            </h2>
            <p className="text-xs text-neutral-400">
              {updateDetails?.description || 'Despliegue inicial de la arquitectura minimalista del Aula 204.'}
            </p>
          </div>

          <button
            type="button"
            onClick={handleDismiss}
            className="p-1 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-900 transition-colors cursor-pointer"
            title="Cerrar"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Lista estructurada de cambios para que se den cuenta de todo */}
        <div className="space-y-2 py-1 max-h-[50vh] overflow-y-auto pr-1">
          <div className="text-[10px] font-mono uppercase tracking-wider text-neutral-400 font-semibold mb-2">
            Registro de cambios destacados:
          </div>

          <div className="space-y-2">
            {changeList.map((item, idx) => {
              const colonIndex = item.indexOf(':');
              const hasPrefix = colonIndex > 0;
              const title = hasPrefix ? item.slice(0, colonIndex) : null;
              const desc = hasPrefix ? item.slice(colonIndex + 1).trim() : item;

              return (
                <div
                  key={idx}
                  className="p-3 rounded-xl bg-neutral-900/60 border border-neutral-900 text-xs text-neutral-300 flex items-start gap-2.5 leading-relaxed"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0 mt-1.5" />
                  <div>
                    {title && (
                      <span className="font-semibold text-white block mb-0.5 font-mono text-[11px]">
                        {title}
                      </span>
                    )}
                    <span className="text-neutral-400 text-xs font-sans">{desc}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Pie y confirmación */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 border-t border-neutral-900 text-xs">
          <div className="text-[11px] font-mono text-neutral-400 text-center sm:text-left">
            JuanFe Ospina &amp; David · 2º SMR 2026
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              type="button"
              onClick={() => {
                sound.tap();
                setIsMinimized(true);
              }}
              className="flex-1 sm:flex-initial px-3 py-2 text-xs font-mono text-neutral-400 hover:text-white transition-colors cursor-pointer"
            >
              Minimizar
            </button>

            <button
              type="button"
              onClick={handleDismiss}
              className="flex-1 sm:flex-initial px-4 py-2 rounded-xl bg-white hover:bg-neutral-200 active:scale-95 text-black font-semibold text-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Check className="w-3.5 h-3.5" />
              <span>Entendido</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
