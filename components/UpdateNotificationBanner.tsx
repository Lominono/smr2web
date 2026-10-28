'use client';

import React, { useState, useEffect, useRef } from 'react';
import { RefreshCw, ArrowUpRight, X, Sparkles } from 'lucide-react';
import { sound } from '@/lib/audio';
import { createClient } from '@/lib/supabase/client';

interface UpdateDetails {
  id?: string;
  version?: string;
  title?: string;
  description?: string;
  changes?: string[] | string;
  created_at?: string;
}

export const UpdateNotificationBanner: React.FC = () => {
  const initialVersionRef = useRef<string | null>(null);
  const [hasUpdate, setHasUpdate] = useState(false);
  const [updateDetails, setUpdateDetails] = useState<UpdateDetails | null>(null);
  const [isMinimized, setIsMinimized] = useState(false);

  // Comprobar la versión del servidor contra la versión capturada al cargar la app
  const checkVersion = async () => {
    try {
      const res = await fetch(`/api/version?t=${Date.now()}`, {
        cache: 'no-store',
      });
      if (!res.ok) return;
      const data = await res.json();
      const serverVersion = data.version || data.commitSha || String(data.serverBootTime);

      if (!initialVersionRef.current) {
        initialVersionRef.current = serverVersion;
      } else if (initialVersionRef.current !== serverVersion) {
        setHasUpdate(true);
        if (data.latestUpdate) {
          setUpdateDetails(data.latestUpdate);
        }
        sound.tap();
      }
    } catch {
      // Ignorar errores puntuales de red
    }
  };

  useEffect(() => {
    // 1. Comprobación inicial inmediata
    checkVersion();

    // 2. Comprobación recurrente ligera cada 30 segundos
    const interval = setInterval(checkVersion, 30000);

    // 3. Comprobación al volver a enfocar la pestaña del navegador
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        checkVersion();
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);
    window.addEventListener('focus', checkVersion);

    // 4. Suscripción Realtime en Supabase a la tabla `app_updates`
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
            setHasUpdate(true);
            setUpdateDetails(upd);
            sound.tap();
          }
        )
        .subscribe();
    }

    return () => {
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
    window.location.reload();
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

  // Si no hay cambios específicos, usar lista por defecto de la versión actual
  if (changeList.length === 0) {
    changeList = [
      'Feed en tiempo real: sincronización instantánea de publicaciones y respuestas vía WebSockets.',
      'Notificaciones push PWA: avisos de clase recibidos en segundo plano.',
      'Panel de administración y control: usuarios reales y seguimiento técnico de incidencias.',
    ];
  }

  // Estado minimizado (Píldora flotante minimalista en la esquina)
  if (isMinimized) {
    return (
      <div className="fixed bottom-4 right-4 z-50 animate-in fade-in slide-in-from-bottom-2 duration-200">
        <button
          type="button"
          onClick={handleReload}
          className="flex items-center gap-2.5 px-3.5 py-2 rounded-full bg-surface/95 backdrop-blur-md text-foreground text-xs font-medium shadow-lg hover:bg-surface-raised active:scale-95 transition-all cursor-pointer border border-border"
          title="Pulsa para aplicar la nueva versión de la web"
        >
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
          </span>
          <span className="font-mono text-[11px] text-foreground-muted">
            {updateDetails?.version || 'Nueva versión'}
          </span>
          <span className="font-semibold text-foreground">Actualizar web</span>
          <RefreshCw className="w-3.5 h-3.5 text-accent animate-spin" />
        </button>
      </div>
    );
  }

  // Modal / Card flotante superior minimalista y funcional
  return (
    <div
      role="alert"
      aria-live="assertive"
      className="fixed top-3 left-3 right-3 sm:left-auto sm:right-6 sm:max-w-md z-50 animate-in slide-in-from-top-3 fade-in duration-200"
    >
      <div className="p-4 rounded-2xl bg-surface/95 backdrop-blur-md border border-border/80 shadow-xl space-y-3 text-foreground">
        {/* Cabecera minimalista */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
            </span>
            <span className="text-[11px] font-mono uppercase tracking-wider px-2 py-0.5 rounded-md bg-surface-raised border border-border/80 text-foreground-muted font-medium">
              {updateDetails?.version || 'Actualización'}
            </span>
            <span className="text-xs font-semibold text-foreground">
              {updateDetails?.title || 'Nueva versión lista'}
            </span>
          </div>

          <button
            type="button"
            onClick={() => {
              sound.tap();
              setIsMinimized(true);
            }}
            className="p-1 rounded-lg text-foreground-subtle hover:text-foreground hover:bg-surface-raised transition-colors cursor-pointer"
            title="Minimizar aviso"
            aria-label="Cerrar aviso"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Descripción concisa y especificación de cambios */}
        <div className="space-y-1.5 text-xs">
          {updateDetails?.description && (
            <p className="text-foreground-muted leading-relaxed font-normal">
              {updateDetails.description}
            </p>
          )}

          <div className="p-2.5 rounded-xl bg-surface-raised/70 border border-border/60 space-y-1.5">
            <span className="text-[10px] font-mono font-semibold uppercase tracking-wider text-foreground-subtle block">
              Cambios destacados:
            </span>
            <ul className="space-y-1">
              {changeList.slice(0, 3).map((change, idx) => (
                <li key={idx} className="flex items-start gap-2 text-[11px] text-foreground-muted leading-snug">
                  <span className="text-accent shrink-0 mt-0.5">•</span>
                  <span>{change}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Acciones */}
        <div className="flex items-center justify-end gap-2 pt-1 border-t border-border/50">
          <button
            type="button"
            onClick={() => {
              sound.tap();
              setIsMinimized(true);
            }}
            className="px-3 py-1.5 rounded-xl text-xs text-foreground-muted hover:text-foreground hover:bg-surface-raised transition-colors cursor-pointer"
          >
            Más tarde
          </button>

          <button
            type="button"
            onClick={handleReload}
            className="px-3.5 py-1.5 rounded-xl bg-foreground text-background text-xs font-medium hover:opacity-90 active:scale-95 transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Actualizar ahora</span>
          </button>
        </div>
      </div>
    </div>
  );
};
