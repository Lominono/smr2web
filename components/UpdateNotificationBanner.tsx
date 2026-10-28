'use client';

import React, { useState, useEffect, useRef } from 'react';
import { RefreshCw, ArrowUpRight, X, Sparkles, Check } from 'lucide-react';
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
  const [isLiveDeploy, setIsLiveDeploy] = useState(false);

  // Comprobar la versión del servidor contra la versión capturada al cargar la app
  const checkVersion = async () => {
    try {
      const res = await fetch(`/api/version?t=${Date.now()}`, {
        cache: 'no-store',
      });
      if (!res.ok) return;
      const data = await res.json();
      const serverVersion = data.version || data.commitSha || String(data.serverBootTime);
      const latest = data.latestUpdate;

      // 1. Si la versión cambió mientras la pestaña estaba activa (nuevo despliegue en Vercel)
      if (initialVersionRef.current && initialVersionRef.current !== serverVersion) {
        setIsLiveDeploy(true);
        setHasUpdate(true);
        if (latest) setUpdateDetails(latest);
        sound.tap();
      } else {
        if (!initialVersionRef.current) {
          initialVersionRef.current = serverVersion;
        }

        // 2. Si el usuario aún no ha visto o reconocido la versión actual
        const lastSeen = typeof window !== 'undefined' ? localStorage.getItem('smr2_last_seen_version') : null;
        const currentVersion = latest?.version || '2.6.0';
        if (latest) setUpdateDetails(latest);

        if (lastSeen !== currentVersion) {
          setIsLiveDeploy(false);
          setHasUpdate(true);
        }
      }
    } catch {
      // Ignorar errores puntuales de red
    }
  };

  useEffect(() => {
    // 1. Comprobación inicial inmediata
    checkVersion();

    // 2. Evento personalizado para abrir las novedades bajo demanda
    const handleOpenChangelog = () => {
      setHasUpdate(true);
      setIsMinimized(false);
      checkVersion();
    };
    window.addEventListener('smr2_open_changelog', handleOpenChangelog);

    // 3. Comprobación recurrente ligera cada 45 segundos
    const interval = setInterval(checkVersion, 45000);

    // 4. Comprobación al volver a enfocar la pestaña del navegador
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        checkVersion();
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);
    window.addEventListener('focus', checkVersion);

    // 5. Suscripción Realtime en Supabase a la tabla `app_updates`
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
    const v = updateDetails?.version || '2.6.0';
    try {
      localStorage.setItem('smr2_last_seen_version', v);
    } catch {}
    window.location.reload();
  };

  const handleDismiss = () => {
    sound.tap();
    const v = updateDetails?.version || '2.6.0';
    try {
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

  // Si no hay cambios específicos, usar lista por defecto de la versión actual
  if (changeList.length === 0) {
    changeList = [
      'Feed en tiempo real: los mensajes que publicas se ven al instante para todos los compañeros.',
      'Gráfica interactiva de inversiones con cotizaciones y volumen real de la clase.',
      'Acceso unificado al panel de administración para delegados y profesores.',
    ];
  }

  // Estado minimizado (Píldora flotante minimalista en la esquina)
  if (isMinimized) {
    return (
      <div className="fixed bottom-4 right-4 z-50 animate-in fade-in slide-in-from-bottom-2 duration-200">
        <button
          type="button"
          onClick={() => setIsMinimized(false)}
          className="flex items-center gap-2.5 px-3.5 py-2 rounded-full bg-surface/95 backdrop-blur-md text-foreground text-xs font-medium shadow-lg hover:bg-surface-raised active:scale-95 transition-all cursor-pointer border border-border"
          title="Pulsa para ver novedades de la versión"
        >
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
          </span>
          <span className="font-mono text-[11px] text-foreground-muted">
            {updateDetails?.version || 'v2.6.0'}
          </span>
          <span className="font-semibold text-foreground">
            {isLiveDeploy ? 'Actualizar web' : 'Novedades'}
          </span>
          <Sparkles className="w-3.5 h-3.5 text-accent" />
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
              v{updateDetails?.version || '2.6.0'}
            </span>
            <span className="text-xs font-semibold text-foreground">
              {updateDetails?.title || (isLiveDeploy ? 'Nueva versión lista' : 'Actualización reciente')}
            </span>
          </div>

          <button
            type="button"
            onClick={handleDismiss}
            className="p-1 rounded-lg text-foreground-subtle hover:text-foreground hover:bg-surface-raised transition-colors cursor-pointer"
            title="Cerrar aviso"
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
              {changeList.slice(0, 4).map((change, idx) => (
                <li key={idx} className="flex items-start gap-2 text-[11px] text-foreground-muted leading-snug">
                  <span className="text-accent shrink-0 mt-0.5">•</span>
                  <span>{change}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Acciones */}
        <div className="flex items-center justify-between gap-2 pt-1 border-t border-border/50">
          <button
            type="button"
            onClick={() => {
              sound.tap();
              setIsMinimized(true);
            }}
            className="px-2.5 py-1.5 rounded-xl text-xs text-foreground-subtle hover:text-foreground transition-colors cursor-pointer"
          >
            Minimizar
          </button>

          <div className="flex items-center gap-2">
            {isLiveDeploy ? (
              <>
                <button
                  type="button"
                  onClick={handleDismiss}
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
              </>
            ) : (
              <button
                type="button"
                onClick={handleDismiss}
                className="px-4 py-1.5 rounded-xl bg-foreground text-background text-xs font-medium hover:opacity-90 active:scale-95 transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
              >
                <Check className="w-3.5 h-3.5" />
                <span>Entendido</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
