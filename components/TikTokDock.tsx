'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowUpRight,
  ChevronDown,
  ChevronUp,
  ClipboardPaste,
  Film,
  LogIn,
  Plus,
  Sparkles,
  Trash2,
  X,
  ExternalLink,
  Check,
} from 'lucide-react';
import { sound } from '@/lib/audio';
import { UserProfile } from '@/lib/types';
import { updateUserProfileSession, getUserSession } from '@/lib/authSession';

export interface TikTokDockProps {
  user?: UserProfile | null;
  onUpdateUser?: (updated: UserProfile) => void;
}

/**
 * Publicaciones destacadas oficiales de TikTok España para el modo Tendencias.
 */
const TIKTOK_VIDEOS = [
  '7694225844767640865',
  '7693532862125018401',
  '7691332844764908822',
  '7690623695894678816',
  '7690611598993542422',
  '7688004301213519126',
  '7676493596496825622',
  '7673880046846610710',
  '7670117475429731606',
  '7699134470997216545',
] as const;

const TIKTOK_SPAIN_PROFILE_URL = 'https://www.tiktok.com/@tiktok_es';
const TIKTOK_FORYOU_URL = 'https://www.tiktok.com/foryou?lang=es';
const TIKTOK_LOGIN_URL = 'https://www.tiktok.com/login?lang=es';
const HANDLE_STORAGE_KEY = 'smr2:tiktok:handle';
const VIDEOS_STORAGE_KEY = 'smr2:tiktok:custom_videos';
const HANDLE_PATTERN = /^[A-Za-z0-9._]{2,24}$/;

/** Desplazamiento para que la tarjeta del embed oficial ocupe todo el ancho */
const EMBED_GUTTER = 32;

/** Acepta «@usuario», «usuario» o enlace de tiktok.com/@usuario */
export const normalizeHandle = (raw: string): string | null => {
  const fromUrl = raw.match(/tiktok\.com\/@([A-Za-z0-9._]+)/i);
  if (/tiktok\.com/i.test(raw) && !fromUrl) {
    return null;
  }
  const cleaned = (fromUrl ? fromUrl[1] : raw)
    .trim()
    .replace(/^@+/, '')
    .split(/[?#/\s]/)[0];
  return HANDLE_PATTERN.test(cleaned) ? cleaned : null;
};

/** Extrae el ID numérico de un vídeo de TikTok desde cualquier enlace o ID directo */
export const extractVideoId = (input: string): string | null => {
  const trimmed = input.trim();
  const match = trimmed.match(/\/video\/(\d{15,24})/i);
  if (match) return match[1];
  if (/^\d{15,24}$/.test(trimmed)) return trimmed;
  return null;
};

const initialsOf = (handle: string) =>
  handle.replace(/[^A-Za-z0-9]/g, '').slice(0, 2).toUpperCase() || 'T';

const TikTokGlyph: React.FC<{ className?: string }> = ({ className }) => (
  <svg
    viewBox="0 0 24 24"
    fill="currentColor"
    aria-hidden="true"
    className={className}
  >
    <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1Z" />
  </svg>
);

export const TikTokDock: React.FC<TikTokDockProps> = ({ user, onUpdateUser }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [screen, setScreen] = useState<'connect' | 'feed'>('connect');
  const [feedMode, setFeedMode] = useState<'my_videos' | 'trending' | 'quick_view'>('my_videos');

  // Índices de navegación
  const [trendingIndex, setTrendingIndex] = useState(0);
  const [myIndex, setMyIndex] = useState(0);

  // Vídeos personalizados / guardados por el alumno
  const [customVideos, setCustomVideos] = useState<string[]>([]);
  const [newVideoUrl, setNewVideoUrl] = useState('');
  const [videoAddMsg, setVideoAddMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

  // Reproductor rápido directo
  const [quickUrl, setQuickUrl] = useState('');
  const [quickVideoId, setQuickVideoId] = useState<string | null>(null);

  const [loaded, setLoaded] = useState(false);
  const [handle, setHandle] = useState<string | null>(null);
  const [draft, setDraft] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [pasteHint, setPasteHint] = useState<string | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);

  const panelRef = useRef<HTMLElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const desktopTabRef = useRef<HTMLButtonElement>(null);
  const mobileTabRef = useRef<HTMLButtonElement>(null);
  const handleInputRef = useRef<HTMLInputElement>(null);

  // 1. Cargar cuenta y vídeos desde user prop o localStorage
  useEffect(() => {
    let restoredHandle: string | null = null;
    let restoredVideos: string[] = [];

    // Si el usuario en SMR2 tiene tiktok_handle, tiene prioridad
    if (user?.tiktok_handle) {
      restoredHandle = normalizeHandle(user.tiktok_handle);
    }
    if (user?.tiktok_videos && Array.isArray(user.tiktok_videos)) {
      restoredVideos = user.tiktok_videos.filter((id) => /^\d{15,24}$/.test(id));
    }

    // Fallback a localStorage
    if (!restoredHandle && typeof window !== 'undefined') {
      try {
        const stored = window.localStorage.getItem(HANDLE_STORAGE_KEY);
        if (stored) restoredHandle = normalizeHandle(stored);
      } catch {}
    }

    if (restoredVideos.length === 0 && typeof window !== 'undefined') {
      try {
        const raw = window.localStorage.getItem(VIDEOS_STORAGE_KEY);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed)) {
            restoredVideos = parsed.filter((id) => typeof id === 'string' && /^\d{15,24}$/.test(id));
          }
        }
      } catch {}
    }

    if (restoredVideos.length > 0) {
      setCustomVideos(restoredVideos);
    }

    if (restoredHandle) {
      setHandle(restoredHandle);
      setScreen('feed');
      // Si tiene vídeos propios, abrir por defecto en 'my_videos'; de lo contrario, 'trending'
      setFeedMode(restoredVideos.length > 0 ? 'my_videos' : 'trending');
    }
  }, [user?.tiktok_handle, user?.tiktok_videos]);

  // Vídeo actual según el modo
  const currentVideoId = useMemo(() => {
    if (feedMode === 'quick_view') {
      return quickVideoId;
    }
    if (feedMode === 'my_videos') {
      return customVideos[myIndex] || null;
    }
    return TIKTOK_VIDEOS[trendingIndex] || null;
  }, [feedMode, quickVideoId, customVideos, myIndex, trendingIndex]);

  const currentVideoUrl = useMemo(() => {
    if (!currentVideoId) return null;
    if (feedMode === 'trending') {
      return `${TIKTOK_SPAIN_PROFILE_URL}/video/${currentVideoId}`;
    }
    if (handle) {
      return `https://www.tiktok.com/@${handle}/video/${currentVideoId}`;
    }
    return `https://www.tiktok.com/video/${currentVideoId}`;
  }, [currentVideoId, feedMode, handle]);

  const previewHandle = normalizeHandle(draft);

  const focusLauncher = useCallback(() => {
    const desktop = window.matchMedia('(min-width: 1024px)').matches;
    (desktop ? desktopTabRef.current : mobileTabRef.current)?.focus();
  }, []);

  const openPanel = useCallback(() => {
    setLoaded(false);
    setIsOpen(true);
    sound.tap();
  }, []);

  const closePanel = useCallback(() => {
    setIsOpen(false);
    sound.tap();
    window.requestAnimationFrame(focusLauncher);
  }, [focusLauncher]);

  const goToVideo = useCallback(
    (nextIndex: number) => {
      if (feedMode === 'trending') {
        if (nextIndex < 0 || nextIndex >= TIKTOK_VIDEOS.length || nextIndex === trendingIndex) {
          return;
        }
        setTrendingIndex(nextIndex);
        setLoaded(false);
        sound.tap();
      } else if (feedMode === 'my_videos') {
        if (nextIndex < 0 || nextIndex >= customVideos.length || nextIndex === myIndex) {
          return;
        }
        setMyIndex(nextIndex);
        setLoaded(false);
        sound.tap();
      }
    },
    [feedMode, trendingIndex, myIndex, customVideos.length]
  );

  /** Abre el Para ti real con la sesión de TikTok del alumno en ventana companion */
  const openForYou = useCallback(() => {
    sound.tap();
    const isMobile = window.matchMedia('(max-width: 639px)').matches;
    if (isMobile) {
      window.open(TIKTOK_FORYOU_URL, '_blank', 'noopener,noreferrer');
      return;
    }
    const width = 420;
    const height = Math.min(860, Math.max(520, window.screen.availHeight - 120));
    const left = Math.max(0, window.screenX + window.innerWidth - width - 440);
    const top = Math.max(0, window.screenY + Math.round((window.innerHeight - height) / 2));
    const popup = window.open(
      TIKTOK_FORYOU_URL,
      'smr2-tiktok-foryou',
      `popup=yes,width=${width},height=${height},left=${left},top=${top},noopener`
    );
    if (popup) {
      popup.opener = null;
    }
  }, []);

  /** Vincula la cuenta de TikTok y sincroniza con el perfil de SMR2 */
  const connectAccount = useCallback(
    async (event?: React.FormEvent) => {
      event?.preventDefault();
      const normalized = normalizeHandle(draft);
      if (!normalized) {
        setError('Ese usuario no parece válido. Prueba con @tiktok_es o el enlace de tu perfil.');
        handleInputRef.current?.focus();
        return;
      }

      setIsSyncing(true);

      // Guardar en localStorage
      try {
        window.localStorage.setItem(HANDLE_STORAGE_KEY, normalized);
      } catch {}

      // Sincronizar en la nube con el perfil SMR2 si el alumno tiene sesión activa
      const currentSession = user || getUserSession();
      if (currentSession?.id) {
        try {
          await fetch('/api/user/profile', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              userId: currentSession.id,
              tiktokHandle: normalized,
            }),
          });
          const updated = updateUserProfileSession({ tiktok_handle: normalized });
          if (updated && onUpdateUser) {
            onUpdateUser(updated);
          }
        } catch {
          // No bloquea el acceso si la red falla
        }
      }

      setIsSyncing(false);
      setHandle(normalized);
      setDraft('');
      setError(null);
      setPasteHint(null);
      setScreen('feed');
      setFeedMode(customVideos.length > 0 ? 'my_videos' : 'trending');
      setLoaded(false);
      sound.tap();
    },
    [draft, user, onUpdateUser, customVideos.length]
  );

  const pasteProfile = useCallback(async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (!text.trim()) {
        setPasteHint('El portapapeles está vacío. Copia el enlace de tu perfil en TikTok.');
        return;
      }
      setDraft(text.trim());
      setError(null);
      setPasteHint(null);
    } catch {
      setPasteHint('Tu navegador no permite leer el portapapeles: pega con Ctrl+V.');
    }
  }, []);

  const disconnectAccount = useCallback(async () => {
    try {
      window.localStorage.removeItem(HANDLE_STORAGE_KEY);
    } catch {}

    const currentSession = user || getUserSession();
    if (currentSession?.id) {
      try {
        await fetch('/api/user/profile', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: currentSession.id,
            tiktokHandle: null,
          }),
        });
        const updated = updateUserProfileSession({ tiktok_handle: undefined });
        if (updated && onUpdateUser) {
          onUpdateUser(updated);
        }
      } catch {}
    }

    setHandle(null);
    setDraft('');
    setError(null);
    setPasteHint(null);
    setScreen('connect');
    sound.tap();
  }, [user, onUpdateUser]);

  /** Añade un nuevo vídeo personalizado a la lista del alumno */
  const handleAddCustomVideo = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setVideoAddMsg(null);
      const vid = extractVideoId(newVideoUrl);
      if (!vid) {
        setVideoAddMsg({
          type: 'err',
          text: 'Enlace no válido. Pega un enlace de vídeo de TikTok o su ID numérico.',
        });
        return;
      }
      if (customVideos.includes(vid)) {
        setVideoAddMsg({ type: 'err', text: 'Ese vídeo ya está en tu lista de TikTok.' });
        return;
      }

      const nextVideos = [vid, ...customVideos].slice(0, 50);
      setCustomVideos(nextVideos);
      setNewVideoUrl('');
      setMyIndex(0);
      setFeedMode('my_videos');
      setLoaded(false);
      sound.tap();

      try {
        window.localStorage.setItem(VIDEOS_STORAGE_KEY, JSON.stringify(nextVideos));
      } catch {}

      const currentSession = user || getUserSession();
      if (currentSession?.id) {
        try {
          await fetch('/api/user/profile', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              userId: currentSession.id,
              tiktokVideos: nextVideos,
            }),
          });
          const updated = updateUserProfileSession({ tiktok_videos: nextVideos });
          if (updated && onUpdateUser) {
            onUpdateUser(updated);
          }
        } catch {}
      }

      setVideoAddMsg({ type: 'ok', text: '¡Vídeo añadido a tus TikToks!' });
      setTimeout(() => setVideoAddMsg(null), 3000);
    },
    [newVideoUrl, customVideos, user, onUpdateUser]
  );

  /** Elimina un vídeo de la lista personalizada */
  const handleRemoveCustomVideo = useCallback(
    async (videoIdToRemove: string) => {
      const nextVideos = customVideos.filter((id) => id !== videoIdToRemove);
      setCustomVideos(nextVideos);
      if (myIndex >= nextVideos.length) {
        setMyIndex(Math.max(0, nextVideos.length - 1));
      }
      setLoaded(false);
      sound.tap();

      try {
        window.localStorage.setItem(VIDEOS_STORAGE_KEY, JSON.stringify(nextVideos));
      } catch {}

      const currentSession = user || getUserSession();
      if (currentSession?.id) {
        try {
          await fetch('/api/user/profile', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              userId: currentSession.id,
              tiktokVideos: nextVideos,
            }),
          });
          const updated = updateUserProfileSession({ tiktok_videos: nextVideos });
          if (updated && onUpdateUser) {
            onUpdateUser(updated);
          }
        } catch {}
      }
    },
    [customVideos, myIndex, user, onUpdateUser]
  );

  /** Reproductor rápido para ver cualquier vídeo al vuelo */
  const handleQuickPlay = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    const vid = extractVideoId(quickUrl);
    if (!vid) {
      alert('Pega un enlace de vídeo de TikTok válido.');
      return;
    }
    setQuickVideoId(vid);
    setFeedMode('quick_view');
    setLoaded(false);
    sound.tap();
  }, [quickUrl]);

  // Accesibilidad y manejo de inert/scroll
  useEffect(() => {
    const panel = panelRef.current;
    if (!panel) return;
    if (isOpen) {
      panel.removeAttribute('inert');
    } else {
      panel.setAttribute('inert', '');
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const frame = window.requestAnimationFrame(() => {
      if (screen === 'connect') {
        handleInputRef.current?.focus();
      } else {
        closeButtonRef.current?.focus();
      }
    });
    return () => window.cancelAnimationFrame(frame);
  }, [isOpen, screen]);

  // Atajos de teclado
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const writing =
        target?.tagName === 'INPUT' ||
        target?.tagName === 'TEXTAREA' ||
        target?.isContentEditable === true;

      if (event.key === 'Escape') {
        event.preventDefault();
        closePanel();
        return;
      }
      if (writing || screen !== 'feed' || feedMode === 'quick_view') {
        return;
      }
      const currentIndex = feedMode === 'my_videos' ? myIndex : trendingIndex;
      if (event.key === 'ArrowDown' || event.key === 'PageDown') {
        event.preventDefault();
        goToVideo(currentIndex + 1);
      } else if (event.key === 'ArrowUp' || event.key === 'PageUp') {
        event.preventDefault();
        goToVideo(currentIndex - 1);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [closePanel, goToVideo, feedMode, myIndex, trendingIndex, isOpen, screen]);

  return (
    <>
      {/* Botón flotante lateral en escritorio */}
      <button
        ref={desktopTabRef}
        type="button"
        onClick={openPanel}
        aria-label="Abrir TikTok"
        aria-expanded={isOpen}
        aria-controls="tiktok-dock-panel"
        tabIndex={isOpen ? -1 : 0}
        className={`fixed right-0 top-1/2 z-30 hidden -translate-y-1/2 flex-col items-center gap-2 rounded-l-2xl border border-r-0 border-border bg-surface px-2.5 py-3 text-foreground-muted shadow-sm transition-[color,background-color,transform] duration-200 hover:bg-surface-hover hover:text-foreground active:scale-[0.98] lg:flex ${
          isOpen ? 'pointer-events-none opacity-0' : 'opacity-100'
        }`}
      >
        <TikTokGlyph className="h-4 w-4" />
        <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.18em] [writing-mode:vertical-rl]">
          TikTok
        </span>
      </button>

      {/* Botón flotante en móvil */}
      <button
        ref={mobileTabRef}
        type="button"
        onClick={openPanel}
        aria-label="Abrir TikTok"
        aria-expanded={isOpen}
        aria-controls="tiktok-dock-panel"
        tabIndex={isOpen ? -1 : 0}
        className={`fixed bottom-[calc(5rem+var(--safe-bottom))] right-4 z-30 flex items-center gap-2 rounded-full border border-border bg-surface px-3.5 py-2.5 text-xs font-semibold text-foreground shadow-lg transition-[background-color,transform,opacity] duration-200 hover:bg-surface-hover active:scale-95 lg:hidden ${
          isOpen ? 'pointer-events-none opacity-0' : 'opacity-100'
        }`}
      >
        <TikTokGlyph className="h-3.5 w-3.5" />
        <span>TikTok</span>
      </button>

      {/* Modal / Dock lateral */}
      <div className={`fixed inset-0 z-50 ${isOpen ? '' : 'pointer-events-none'}`} aria-hidden={!isOpen}>
        <div
          onClick={closePanel}
          className={`absolute inset-0 bg-black/20 transition-opacity duration-300 motion-reduce:transition-none dark:bg-black/50 ${
            isOpen ? 'opacity-100' : 'opacity-0'
          }`}
          aria-hidden="true"
        />

        <aside
          ref={panelRef}
          id="tiktok-dock-panel"
          role="dialog"
          aria-modal="true"
          aria-label="TikTok"
          aria-hidden={!isOpen}
          className={`absolute inset-y-0 right-0 flex w-full flex-col overflow-hidden border-border bg-surface shadow-2xl transition-transform duration-300 ease-out motion-reduce:transition-none sm:inset-y-3 sm:right-3 sm:w-[430px] sm:rounded-3xl sm:border ${
            isOpen ? 'translate-x-0' : 'translate-x-[calc(100%+1rem)]'
          }`}
        >
          {/* Cabecera Principal */}
          <header className="flex items-center gap-3 border-b border-border px-4 py-3 pt-[calc(0.75rem+var(--safe-top))] sm:pt-3 bg-surface">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-foreground text-background">
              <TikTokGlyph className="h-4 w-4" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                <h2 className="truncate text-sm font-semibold tracking-tight text-foreground">TikTok</h2>
                {handle && (
                  <span className="px-1.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-[9px] font-mono text-emerald-500">
                    Conectado
                  </span>
                )}
              </div>
              <p className="truncate text-[11px] text-foreground-muted">
                {handle ? `@${handle}` : 'Conecta tu cuenta para tus vídeos y Para ti'}
              </p>
            </div>

            {handle && (
              <a
                href={`https://www.tiktok.com/@${handle}`}
                target="_blank"
                rel="noreferrer"
                aria-label={`Abrir el perfil de @${handle} en TikTok`}
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-border/70 bg-surface-raised text-foreground-muted transition-colors hover:bg-surface-hover hover:text-foreground active:scale-95"
                title="Abrir mi perfil en TikTok"
              >
                <ArrowUpRight className="h-3.5 w-3.5" />
              </a>
            )}

            <button
              ref={closeButtonRef}
              type="button"
              onClick={closePanel}
              aria-label="Cerrar TikTok"
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-border/70 bg-surface-raised text-foreground-muted transition-colors hover:bg-surface-hover hover:text-foreground active:scale-95"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </header>

          {screen === 'connect' ? (
            /* ============================================================== */
            /* PANTALLA: INICIO DE SESIÓN Y VINCULACIÓN DE CUENTA             */
            /* ============================================================== */
            <div className="min-h-0 flex-1 overflow-y-auto">
              <div className="flex min-h-full items-center justify-center px-5 py-6">
                <div className="flex w-full max-w-[340px] flex-col items-center gap-4 text-center">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-foreground text-background shadow-sm">
                    <TikTokGlyph className="h-5 w-5" />
                  </div>

                  <div className="space-y-1">
                    <h3 className="text-sm font-semibold tracking-tight text-foreground">
                      {handle ? 'Cambiar cuenta de TikTok' : 'Entra con tu cuenta de TikTok'}
                    </h3>
                    <p className="text-[11px] leading-relaxed text-foreground-muted">
                      Conecta tu cuenta para sincronizar tus vídeos con tu carnet de 2º SMR y abrir tu Para ti personalizado.
                    </p>
                  </div>

                  {/* Paso 1: Iniciar sesión en TikTok */}
                  <div className="w-full rounded-2xl border border-border/80 bg-surface-raised/50 p-3 text-left space-y-2">
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-foreground-subtle font-mono">
                      Paso 1
                    </span>
                    <p className="text-[11px] text-foreground-muted">
                      Abre TikTok para tener tu sesión de alumno activa en el navegador:
                    </p>
                    <a
                      href={TIKTOK_LOGIN_URL}
                      target="_blank"
                      rel="noreferrer"
                      onClick={() => sound.tap()}
                      className="flex w-full items-center justify-center gap-2 rounded-xl bg-accent px-3 py-2 text-xs font-semibold text-accent-foreground transition-opacity hover:opacity-90 active:scale-[0.98]"
                    >
                      <LogIn className="h-3.5 w-3.5" />
                      Iniciar sesión en TikTok
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  </div>

                  {/* Paso 2: Indicar perfil */}
                  <form onSubmit={connectAccount} className="w-full space-y-2.5 text-left">
                    <div className="rounded-2xl border border-border/80 bg-surface-raised/50 p-3 space-y-2">
                      <span className="text-[10px] font-semibold uppercase tracking-wider text-foreground-subtle font-mono">
                        Paso 2
                      </span>
                      <label htmlFor="tiktok-handle" className="block text-[11px] text-foreground-muted">
                        Pega tu @usuario o el enlace a tu perfil:
                      </label>
                      <div className="flex items-center gap-1.5 rounded-xl border border-border bg-surface px-3 py-2 transition-colors focus-within:border-border-focus">
                        <span aria-hidden="true" className="text-xs text-foreground-subtle">
                          @
                        </span>
                        <input
                          id="tiktok-handle"
                          ref={handleInputRef}
                          value={draft}
                          onChange={(event) => {
                            setDraft(event.target.value);
                            if (error) setError(null);
                            if (pasteHint) setPasteHint(null);
                          }}
                          placeholder="tiktok_es o tiktok.com/@tu_perfil"
                          autoComplete="off"
                          autoCapitalize="none"
                          autoCorrect="off"
                          spellCheck={false}
                          aria-invalid={Boolean(error)}
                          aria-describedby={error ? 'tiktok-handle-error' : undefined}
                          className="min-w-0 flex-1 bg-transparent text-xs text-foreground outline-none placeholder:text-foreground-subtle"
                        />
                        <button
                          type="button"
                          onClick={pasteProfile}
                          className="flex shrink-0 items-center gap-1 rounded-lg px-2 py-1 text-[10px] font-medium text-foreground-subtle hover:text-foreground transition-colors bg-surface-raised"
                        >
                          <ClipboardPaste className="h-3 w-3" />
                          Pegar
                        </button>
                      </div>

                      {previewHandle && !error && (
                        <div className="flex items-center gap-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 px-3 py-2 text-[11px] text-emerald-400">
                          <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-500 text-[9px] font-bold text-black">
                            {initialsOf(previewHandle)}
                          </span>
                          <span className="truncate font-medium">
                            Conectarás como <strong>@{previewHandle}</strong>
                          </span>
                        </div>
                      )}

                      {error && (
                        <p id="tiktok-handle-error" role="alert" className="text-[11px] text-danger">
                          {error}
                        </p>
                      )}
                      {pasteHint && (
                        <p role="status" className="text-[11px] text-foreground-muted">
                          {pasteHint}
                        </p>
                      )}
                    </div>

                    <button
                      type="submit"
                      disabled={!draft.trim() || isSyncing}
                      className="w-full rounded-xl bg-accent px-3 py-2.5 text-xs font-semibold text-accent-foreground transition-opacity hover:opacity-90 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      {isSyncing ? 'Sincronizando cuenta…' : 'Guardar y conectar mi cuenta'}
                    </button>
                  </form>

                  <div className="w-full space-y-2 border-t border-border-subtle pt-3">
                    <button
                      type="button"
                      onClick={() => {
                        setError(null);
                        setPasteHint(null);
                        setScreen('feed');
                        setLoaded(false);
                      }}
                      className="text-[11px] font-medium text-foreground-subtle underline-offset-4 transition-colors hover:text-foreground hover:underline"
                    >
                      {handle ? 'Volver a los vídeos' : 'Continuar sin cuenta (Tendencias)'}
                    </button>

                    {handle && (
                      <button
                        type="button"
                        onClick={disconnectAccount}
                        className="block w-full text-[11px] font-medium text-danger/80 underline-offset-4 transition-colors hover:text-danger hover:underline"
                      >
                        Desvincular @{handle} de SMR2
                      </button>
                    )}
                  </div>

                  <p className="text-[10px] leading-relaxed text-foreground-subtle">
                    Nunca solicitamos tu contraseña: solo guardamos tu identificador público y lo sincronizamos con tu ficha de estudiante.
                  </p>
                </div>
              </div>
            </div>
          ) : (
            /* ============================================================== */
            /* PANTALLA: FEED PRINCIPAL, MODOS Y CONTENIDO                   */
            /* ============================================================== */
            <>
              {/* Barra de Perfil Conectado y Acciones */}
              <div className="flex items-center gap-2 border-b border-border bg-surface-raised/60 px-4 py-2">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-foreground text-[10px] font-semibold text-background">
                  {handle ? initialsOf(handle) : '?'}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[11px] font-medium text-foreground">
                    {handle ? `@${handle}` : 'Sin cuenta conectada'}
                  </p>
                  <p className="truncate text-[10px] text-foreground-subtle">
                    {handle ? 'Tu cuenta activa en El Botellón' : 'Conecta tu cuenta'}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={openForYou}
                  className="flex shrink-0 items-center gap-1 rounded-full bg-accent px-2.5 py-1 text-[10px] font-semibold text-accent-foreground transition-opacity hover:opacity-90 active:scale-95"
                  title="Abre tu Para ti real de TikTok en una ventana complementaria móvil"
                >
                  Para ti
                  <ArrowUpRight className="h-3 w-3" />
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setDraft(handle || '');
                    setError(null);
                    setScreen('connect');
                  }}
                  className="shrink-0 rounded-full px-2 py-1 text-[10px] font-medium text-foreground-subtle hover:text-foreground transition-colors bg-surface"
                >
                  {handle ? 'Cuenta' : 'Conectar'}
                </button>
              </div>

              {/* Selector de Pestañas / Modos */}
              <div className="flex items-center border-b border-border bg-surface px-2 py-1 gap-1 text-[11px]">
                <button
                  type="button"
                  onClick={() => {
                    setFeedMode('my_videos');
                    setLoaded(false);
                    sound.tap();
                  }}
                  className={`flex-1 py-1.5 px-2 rounded-lg font-medium transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                    feedMode === 'my_videos'
                      ? 'bg-foreground text-background font-semibold shadow-xs'
                      : 'text-foreground-muted hover:text-foreground hover:bg-surface-hover'
                  }`}
                >
                  <Film className="w-3.5 h-3.5" />
                  <span>Mis TikToks</span>
                  {customVideos.length > 0 && (
                    <span className={`text-[9px] px-1.5 py-0.2 rounded-full ${
                      feedMode === 'my_videos' ? 'bg-background text-foreground' : 'bg-surface-raised text-foreground-muted'
                    }`}>
                      {customVideos.length}
                    </span>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setFeedMode('trending');
                    setLoaded(false);
                    sound.tap();
                  }}
                  className={`flex-1 py-1.5 px-2 rounded-lg font-medium transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                    feedMode === 'trending'
                      ? 'bg-foreground text-background font-semibold shadow-xs'
                      : 'text-foreground-muted hover:text-foreground hover:bg-surface-hover'
                  }`}
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Tendencias</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setFeedMode('quick_view');
                    setLoaded(false);
                    sound.tap();
                  }}
                  className={`py-1.5 px-2.5 rounded-lg font-medium transition-all flex items-center justify-center gap-1 cursor-pointer ${
                    feedMode === 'quick_view'
                      ? 'bg-foreground text-background font-semibold shadow-xs'
                      : 'text-foreground-muted hover:text-foreground hover:bg-surface-hover'
                  }`}
                  title="Pegar y ver cualquier vídeo"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Pegar</span>
                </button>
              </div>

              {/* Sub-barra según modo */}
              {feedMode === 'my_videos' && (
                <div className="border-b border-border bg-surface-raised/40 p-2.5 space-y-2">
                  <form onSubmit={handleAddCustomVideo} className="flex items-center gap-1.5">
                    <input
                      type="text"
                      value={newVideoUrl}
                      onChange={(e) => setNewVideoUrl(e.target.value)}
                      placeholder="Pega un enlace de vídeo de TikTok…"
                      className="min-w-0 flex-1 rounded-xl border border-border bg-surface px-2.5 py-1.5 text-xs text-foreground placeholder:text-foreground-subtle outline-none focus:border-border-focus"
                    />
                    <button
                      type="submit"
                      disabled={!newVideoUrl.trim()}
                      className="px-3 py-1.5 rounded-xl bg-accent text-accent-foreground text-xs font-semibold transition-opacity hover:opacity-90 disabled:opacity-40 shrink-0"
                    >
                      Añadir
                    </button>
                  </form>
                  {videoAddMsg && (
                    <p className={`text-[10px] ${videoAddMsg.type === 'ok' ? 'text-emerald-400' : 'text-danger'}`}>
                      {videoAddMsg.text}
                    </p>
                  )}
                </div>
              )}

              {feedMode === 'quick_view' && (
                <div className="border-b border-border bg-surface-raised/40 p-2.5 space-y-2">
                  <form onSubmit={handleQuickPlay} className="flex items-center gap-1.5">
                    <input
                      type="text"
                      value={quickUrl}
                      onChange={(e) => setQuickUrl(e.target.value)}
                      placeholder="Pega cualquier enlace de TikTok para verlo…"
                      className="min-w-0 flex-1 rounded-xl border border-border bg-surface px-2.5 py-1.5 text-xs text-foreground placeholder:text-foreground-subtle outline-none focus:border-border-focus"
                    />
                    <button
                      type="submit"
                      disabled={!quickUrl.trim()}
                      className="px-3 py-1.5 rounded-xl bg-accent text-accent-foreground text-xs font-semibold transition-opacity hover:opacity-90 disabled:opacity-40 shrink-0"
                    >
                      Ver
                    </button>
                  </form>
                </div>
              )}

              {/* Contenedor del Reproductor Vertical */}
              <div className="relative min-h-0 flex-1 overflow-hidden bg-white">
                {feedMode === 'my_videos' && customVideos.length === 0 ? (
                  <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center bg-surface">
                    <div className="w-12 h-12 rounded-2xl bg-surface-raised flex items-center justify-center mb-3 text-foreground-muted">
                      <Film className="w-6 h-6" />
                    </div>
                    <h4 className="text-sm font-semibold text-foreground mb-1">
                      Tu lista de TikToks está vacía
                    </h4>
                    <p className="text-xs text-foreground-muted leading-relaxed max-w-[280px] mb-4">
                      Pega aquí arriba el enlace de tus propios vídeos o de los TikToks que te gusten para tenerlos guardados y verlos dentro de El Botellón.
                    </p>
                    <button
                      type="button"
                      onClick={() => {
                        setFeedMode('trending');
                        sound.tap();
                      }}
                      className="px-3.5 py-2 rounded-xl bg-accent text-accent-foreground text-xs font-semibold"
                    >
                      Ver Tendencias de TikTok España
                    </button>
                  </div>
                ) : !currentVideoId ? (
                  <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center bg-surface">
                    <p className="text-xs text-foreground-muted">
                      Pega un enlace de vídeo de TikTok en la barra superior para reproducirlo.
                    </p>
                  </div>
                ) : (
                  <>
                    {isOpen && (
                      <iframe
                        key={`${feedMode}-${currentVideoId}`}
                        src={`https://www.tiktok.com/embed/${currentVideoId}?lang=es`}
                        title={`TikTok vídeo ${currentVideoId}`}
                        onLoad={() => setLoaded(true)}
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; fullscreen; gyroscope; picture-in-picture; web-share"
                        allowFullScreen
                        className="absolute border-0"
                        style={{
                          top: `-${EMBED_GUTTER}px`,
                          left: `-${EMBED_GUTTER}px`,
                          width: `calc(100% + ${EMBED_GUTTER * 2}px)`,
                          height: `calc(100% + ${EMBED_GUTTER}px)`,
                        }}
                      />
                    )}

                    {/* Overlay de carga */}
                    <div
                      className={`pointer-events-none absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 bg-black px-6 text-center transition-opacity duration-300 motion-reduce:transition-none ${
                        loaded ? 'invisible opacity-0' : 'visible opacity-100'
                      }`}
                    >
                      <TikTokGlyph className="h-8 w-8 text-white/25" />
                      <p className="text-[11px] font-medium text-white/60">Cargando TikTok…</p>
                      {currentVideoUrl && (
                        <a
                          href={currentVideoUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="pointer-events-auto mt-1 text-[11px] font-medium text-white/80 underline-offset-4 hover:text-white hover:underline"
                        >
                          Abrir este vídeo en TikTok
                        </a>
                      )}
                    </div>
                  </>
                )}
              </div>

              {/* Pie de Navegación y Controles */}
              <footer className="flex items-center justify-between gap-3 border-t border-border px-4 py-2.5 pb-[calc(0.625rem+var(--safe-bottom))] sm:pb-2.5 bg-surface">
                <div className="min-w-0">
                  {feedMode === 'trending' ? (
                    <>
                      <p className="font-mono text-[11px] tabular-nums text-foreground-subtle">
                        <span className="font-medium text-foreground">{String(trendingIndex + 1).padStart(2, '0')}</span>
                        <span className="mx-1">/</span>
                        {String(TIKTOK_VIDEOS.length).padStart(2, '0')}
                        <span className="ml-2 text-[10px] text-foreground-subtle font-sans">· Tendencias España</span>
                      </p>
                      <p className="mt-0.5 hidden text-[10px] text-foreground-subtle sm:block">
                        Usa ↑ / ↓ para cambiar de vídeo
                      </p>
                    </>
                  ) : feedMode === 'my_videos' && customVideos.length > 0 ? (
                    <div className="flex items-center gap-2">
                      <p className="font-mono text-[11px] tabular-nums text-foreground-subtle">
                        <span className="font-medium text-foreground">{String(myIndex + 1).padStart(2, '0')}</span>
                        <span className="mx-1">/</span>
                        {String(customVideos.length).padStart(2, '0')}
                        <span className="ml-2 text-[10px] text-foreground-subtle font-sans">· Mis TikToks</span>
                      </p>
                      <button
                        type="button"
                        onClick={() => currentVideoId && handleRemoveCustomVideo(currentVideoId)}
                        className="p-1 rounded-lg text-danger/70 hover:text-danger hover:bg-danger/10 transition-colors"
                        title="Quitar este vídeo de mis TikToks"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ) : (
                    <p className="text-[10px] text-foreground-subtle">Reproductor directo</p>
                  )}
                </div>

                {feedMode !== 'quick_view' && (
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => goToVideo((feedMode === 'my_videos' ? myIndex : trendingIndex) - 1)}
                      disabled={(feedMode === 'my_videos' ? myIndex : trendingIndex) === 0}
                      aria-label="Vídeo anterior"
                      className="flex h-8 w-8 items-center justify-center rounded-full border border-border/70 bg-surface-raised text-foreground-muted transition-colors hover:bg-surface-hover hover:text-foreground active:scale-95 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-surface-raised disabled:hover:text-foreground-muted"
                    >
                      <ChevronUp className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => goToVideo((feedMode === 'my_videos' ? myIndex : trendingIndex) + 1)}
                      disabled={
                        (feedMode === 'my_videos' ? myIndex : trendingIndex) ===
                        (feedMode === 'my_videos' ? customVideos.length - 1 : TIKTOK_VIDEOS.length - 1)
                      }
                      aria-label="Vídeo siguiente"
                      className="flex h-8 w-8 items-center justify-center rounded-full border border-border/70 bg-surface-raised text-foreground-muted transition-colors hover:bg-surface-hover hover:text-foreground active:scale-95 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-surface-raised disabled:hover:text-foreground-muted"
                    >
                      <ChevronDown className="h-4 w-4" />
                    </button>
                  </div>
                )}
              </footer>
            </>
          )}
        </aside>
      </div>
    </>
  );
};
