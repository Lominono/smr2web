'use client';

import React, { useState, useEffect, useRef } from 'react';
import { RefreshCw, Sparkles, X, AlertCircle } from 'lucide-react';
import { sound } from '@/lib/audio';
import { createClient } from '@/lib/supabase/client';

export const UpdateNotificationBanner: React.FC = () => {
  const initialVersionRef = useRef<string | null>(null);
  const [hasUpdate, setHasUpdate] = useState(false);
  const [updateDetails, setUpdateDetails] = useState<{ title?: string; description?: string; version?: string } | null>(null);
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
            const upd = payload.new as any;
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

  // Estado minimizado (Píldora flotante para no molestar)
  if (isMinimized) {
    return (
      <div className="fixed top-3 right-3 sm:right-6 z-50 animate-in fade-in slide-in-from-top-2 duration-200">
        <button
          type="button"
          onClick={handleReload}
          className="flex items-center gap-2 px-3.5 py-2 rounded-full bg-foreground text-background font-semibold text-xs shadow-xl hover:opacity-90 active:scale-95 transition-all cursor-pointer border border-border"
          title="Pulsa para aplicar la nueva versión de la web"
        >
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping shrink-0" />
          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
          <span>Actualización disponible · Reiniciar</span>
        </button>
      </div>
    );
  }

  // Estado completo (Banner prominente estilo Apple / Linear con aviso claro)
  return (
    <div
      role="alert"
      aria-live="assertive"
      className="fixed top-2 sm:top-4 left-3 right-3 sm:left-1/2 sm:-translate-x-1/2 sm:max-w-xl z-50 animate-in slide-in-from-top-4 fade-in duration-300 select-none"
    >
      <div className="p-3.5 sm:p-4 rounded-2xl bg-surface/95 backdrop-blur-xl border border-accent/40 shadow-2xl shadow-accent/15 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-foreground">
        <div className="flex items-start gap-3 min-w-0">
          <div className="w-9 h-9 rounded-xl bg-accent/15 border border-accent/30 text-accent flex items-center justify-center shrink-0 mt-0.5">
            <RefreshCw className="w-4 h-4 animate-spin text-accent" />
          </div>

          <div className="space-y-0.5 min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-accent/20 text-accent border border-accent/30">
                {updateDetails?.title || 'Nueva Actualización'}
              </span>
              <span className="text-[11px] text-foreground-muted font-mono hidden sm:inline">
                SMR2 Web
              </span>
            </div>
            <p className="text-xs text-foreground font-medium leading-snug">
              {updateDetails?.description ||
                'Hay cambios y mejoras recién desplegados en el portal. Reinicia para sincronizar la web.'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto shrink-0 justify-end pt-1 sm:pt-0 border-t sm:border-t-0 border-border/60">
          <button
            type="button"
            onClick={() => {
              sound.tap();
              setIsMinimized(true);
            }}
            className="px-2.5 py-1.5 rounded-lg text-xs text-foreground-muted hover:text-foreground hover:bg-surface-raised transition-colors cursor-pointer"
          >
            Más tarde
          </button>

          <button
            type="button"
            onClick={handleReload}
            className="flex-1 sm:flex-initial px-3.5 py-1.5 rounded-xl bg-foreground text-background text-xs font-semibold hover:opacity-90 active:scale-95 transition-all shadow-sm flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Reiniciar ahora</span>
          </button>
        </div>
      </div>
    </div>
  );
};
