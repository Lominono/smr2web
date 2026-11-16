'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowUpRight,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Flame,
  Gamepad2,
  LogIn,
  Plus,
  RotateCcw,
  Sparkles,
  Tv,
  X,
} from 'lucide-react';
import { sound } from '@/lib/audio';
import { UserProfile } from '@/lib/types';

export interface TikTokDockProps {
  user?: UserProfile | null;
  onUpdateUser?: (updated: UserProfile) => void;
}

/**
 * Canales de contenido integrados para el reproductor del dock
 */
const CHANNELS = {
  trending: {
    id: 'trending',
    label: 'Tendencias',
    icon: Flame,
    videos: [
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
    ],
  },
  gaming: {
    id: 'gaming',
    label: 'Gaming & Humor',
    icon: Gamepad2,
    videos: [
      '7690623695894678816',
      '7693532862125018401',
      '7676493596496825622',
      '7688004301213519126',
      '7691332844764908822',
    ],
  },
} as const;

type ChannelKey = keyof typeof CHANNELS;

const TIKTOK_FORYOU_URL = 'https://www.tiktok.com/foryou?lang=es';
const TIKTOK_LOGIN_URL = 'https://www.tiktok.com/login?lang=es';
const RECENT_VIDEOS_KEY = 'smr2:tiktok:recent_videos';

/** Desplazamiento para que la tarjeta del embed oficial ocupe todo el ancho */
const EMBED_GUTTER = 32;

/** Extrae el ID numérico de un vídeo de TikTok desde cualquier enlace o ID directo */
export const extractVideoId = (input: string): string | null => {
  const trimmed = input.trim();
  const match = trimmed.match(/\/video\/(\d{15,24})/i);
  if (match) return match[1];
  if (/^\d{15,24}$/.test(trimmed)) return trimmed;
  return null;
};

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

export const TikTokDock: React.FC<TikTokDockProps> = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [channel, setChannel] = useState<ChannelKey>('trending');
  const [videoIndex, setVideoIndex] = useState(0);

  // Barra de pegado rápido y reproducción directa
  const [pasteUrl, setPasteUrl] = useState('');
  const [recentVideos, setRecentVideos] = useState<string[]>([]);
  const [directVideoId, setDirectVideoId] = useState<string | null>(null);

  const [loaded, setLoaded] = useState(false);
  const [showPasteBar, setShowPasteBar] = useState(false);

  const panelRef = useRef<HTMLElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const desktopTabRef = useRef<HTMLButtonElement>(null);
  const mobileTabRef = useRef<HTMLButtonElement>(null);
  const pasteInputRef = useRef<HTMLInputElement>(null);

  // Cargar historial de vídeos recientes guardados en el dispositivo
  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        const stored = window.localStorage.getItem(RECENT_VIDEOS_KEY);
        if (stored) {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed)) {
            setRecentVideos(parsed.filter((id) => typeof id === 'string' && /^\d{15,24}$/.test(id)));
          }
        }
      } catch {}
    }
  }, []);

  // Lista de vídeos activos según el canal o reproducción directa
  const activeVideoList = useMemo(() => {
    if (directVideoId) {
      return [directVideoId];
    }
    return CHANNELS[channel].videos;
  }, [channel, directVideoId]);

  const currentVideoId = useMemo(() => {
    if (directVideoId) return directVideoId;
    return activeVideoList[videoIndex] || activeVideoList[0] || '7694225844767640865';
  }, [directVideoId, activeVideoList, videoIndex]);

  const currentVideoUrl = useMemo(() => {
    return `https://www.tiktok.com/@tiktok_es/video/${currentVideoId}`;
  }, [currentVideoId]);

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
      if (nextIndex < 0 || nextIndex >= activeVideoList.length || nextIndex === videoIndex) {
        return;
      }
      setVideoIndex(nextIndex);
      setLoaded(false);
      sound.tap();
    },
    [activeVideoList.length, videoIndex]
  );

  /**
   * Abre el Para ti real con la sesión auténtica de TikTok del alumno.
   * En escritorio se abre una ventana flotante vertical tipo móvil (430x880)
   * que deja la partida de El Botellón a la vista. En móvil se abre directamente.
   */
  const openRealTikTokSession = useCallback((mode: 'foryou' | 'login' = 'foryou') => {
    sound.tap();
    const targetUrl = mode === 'login' ? TIKTOK_LOGIN_URL : TIKTOK_FORYOU_URL;
    const isMobile = window.matchMedia('(max-width: 639px)').matches;

    if (isMobile) {
      window.open(targetUrl, '_blank', 'noopener,noreferrer');
      return;
    }

    const width = 430;
    const height = Math.min(880, Math.max(540, window.screen.availHeight - 80));
    const left = Math.max(0, window.screenX + window.innerWidth - width - 420);
    const top = Math.max(0, window.screenY + Math.round((window.innerHeight - height) / 2));

    const popup = window.open(
      targetUrl,
      'smr2-tiktok-foryou',
      `popup=yes,width=${width},height=${height},left=${left},top=${top},noopener`
    );
    if (popup) {
      popup.opener = null;
    }
  }, []);

  /** Reproduce un vídeo pegado al vuelo */
  const handlePlayPastedVideo = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      const vid = extractVideoId(pasteUrl);
      if (!vid) {
        alert('Enlace no válido. Pega una URL de vídeo de TikTok (ej. tiktok.com/@usuario/video/...)');
        return;
      }

      setDirectVideoId(vid);
      setVideoIndex(0);
      setPasteUrl('');
      setShowPasteBar(false);
      setLoaded(false);
      sound.tap();

      // Guardar en recientes
      const updatedRecents = [vid, ...recentVideos.filter((id) => id !== vid)].slice(0, 15);
      setRecentVideos(updatedRecents);
      try {
        window.localStorage.setItem(RECENT_VIDEOS_KEY, JSON.stringify(updatedRecents));
      } catch {}
    },
    [pasteUrl, recentVideos]
  );

  // Manejo de scroll e inert
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
      closeButtonRef.current?.focus();
    });
    return () => window.cancelAnimationFrame(frame);
  }, [isOpen]);

  // Atajos de teclado para pasar de vídeo
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
      if (writing || directVideoId) {
        return;
      }
      if (event.key === 'ArrowDown' || event.key === 'PageDown') {
        event.preventDefault();
        goToVideo(videoIndex + 1);
      } else if (event.key === 'ArrowUp' || event.key === 'PageUp') {
        event.preventDefault();
        goToVideo(videoIndex - 1);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [closePanel, directVideoId, goToVideo, isOpen, videoIndex]);

  return (
    <>
      {/* Botón pestaña lateral fija en escritorio */}
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

      {/* Dock y Reproductor Principal */}
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
          {/* Cabecera Principal con Accesos a Sesión Real */}
          <header className="flex items-center gap-2.5 border-b border-border px-4 py-3 pt-[calc(0.75rem+var(--safe-top))] sm:pt-3 bg-surface">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-foreground text-background">
              <TikTokGlyph className="h-4 w-4" />
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                <h2 className="truncate text-sm font-semibold tracking-tight text-foreground">TikTok</h2>
                <span className="px-1.5 py-0.5 rounded-full bg-accent/10 text-[9px] font-mono text-accent font-semibold">
                  El Botellón
                </span>
              </div>
              <p className="truncate text-[11px] text-foreground-muted">
                {directVideoId ? 'Vídeo personalizado' : CHANNELS[channel].label}
              </p>
            </div>

            {/* BOTÓN 1: Tu Para ti real (Ventana Flotante Companion) */}
            <button
              type="button"
              onClick={() => openRealTikTokSession('foryou')}
              className="flex shrink-0 items-center gap-1.5 rounded-full bg-accent px-3 py-1.5 text-xs font-semibold text-accent-foreground shadow-xs transition-opacity hover:opacity-90 active:scale-95"
              title="Abre tu Para ti real de TikTok en una ventana complementaria móvil a tu lado"
            >
              <span>Para ti</span>
              <ArrowUpRight className="h-3.5 w-3.5" />
            </button>

            {/* BOTÓN 2: Iniciar sesión en TikTok Web */}
            <button
              type="button"
              onClick={() => openRealTikTokSession('login')}
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-border/70 bg-surface-raised text-foreground-muted transition-colors hover:bg-surface-hover hover:text-foreground active:scale-95"
              title="Iniciar sesión en tu cuenta de TikTok en el navegador"
            >
              <LogIn className="h-3.5 w-3.5" />
            </button>

            {/* BOTÓN 3: Cerrar dock */}
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

          {/* Selector de Canales y Herramientas */}
          <div className="flex items-center justify-between border-b border-border bg-surface px-3 py-1.5 gap-1.5 text-[11px]">
            <div className="flex items-center gap-1 overflow-x-auto scrollbar-none">
              {(Object.keys(CHANNELS) as ChannelKey[]).map((cKey) => {
                const ch = CHANNELS[cKey];
                const Icon = ch.icon;
                const isActive = !directVideoId && channel === cKey;
                return (
                  <button
                    key={cKey}
                    type="button"
                    onClick={() => {
                      setDirectVideoId(null);
                      setChannel(cKey);
                      setVideoIndex(0);
                      setLoaded(false);
                      sound.tap();
                    }}
                    className={`py-1 px-2.5 rounded-lg font-medium transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
                      isActive
                        ? 'bg-foreground text-background font-semibold shadow-xs'
                        : 'text-foreground-muted hover:text-foreground hover:bg-surface-hover'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    <span>{ch.label}</span>
                  </button>
                );
              })}

              {directVideoId && (
                <button
                  type="button"
                  onClick={() => {
                    setDirectVideoId(null);
                    setVideoIndex(0);
                    setLoaded(false);
                    sound.tap();
                  }}
                  className="py-1 px-2.5 rounded-lg font-medium transition-all flex items-center gap-1.5 bg-foreground text-background font-semibold shadow-xs"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>Volver a canales</span>
                </button>
              )}
            </div>

            <button
              type="button"
              onClick={() => {
                setShowPasteBar((prev) => !prev);
                sound.tap();
                if (!showPasteBar) {
                  setTimeout(() => pasteInputRef.current?.focus(), 100);
                }
              }}
              className={`flex items-center gap-1 py-1 px-2 rounded-lg transition-colors cursor-pointer text-[10px] font-semibold shrink-0 ${
                showPasteBar ? 'bg-accent text-accent-foreground' : 'text-foreground-muted hover:text-foreground bg-surface-raised'
              }`}
              title="Pegar cualquier enlace de TikTok para verlo"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Pegar vídeo</span>
            </button>
          </div>

          {/* Barra de Pegado Rápido Desplegable */}
          {showPasteBar && (
            <div className="border-b border-border bg-surface-raised/60 p-3 space-y-2 animate-in fade-in duration-150">
              <form onSubmit={handlePlayPastedVideo} className="flex items-center gap-1.5">
                <input
                  ref={pasteInputRef}
                  type="text"
                  value={pasteUrl}
                  onChange={(e) => setPasteUrl(e.target.value)}
                  placeholder="Pega cualquier enlace de TikTok…"
                  className="min-w-0 flex-1 rounded-xl border border-border bg-surface px-3 py-1.5 text-xs text-foreground placeholder:text-foreground-subtle outline-none focus:border-border-focus"
                />
                <button
                  type="submit"
                  disabled={!pasteUrl.trim()}
                  className="px-3.5 py-1.5 rounded-xl bg-accent text-accent-foreground text-xs font-semibold transition-opacity hover:opacity-90 disabled:opacity-40 shrink-0"
                >
                  Ver
                </button>
              </form>

              {recentVideos.length > 0 && (
                <div className="flex items-center gap-1 overflow-x-auto pt-1 scrollbar-none text-[10px] text-foreground-subtle">
                  <span className="shrink-0 font-medium">Recientes:</span>
                  {recentVideos.slice(0, 5).map((vid, idx) => (
                    <button
                      key={vid}
                      type="button"
                      onClick={() => {
                        setDirectVideoId(vid);
                        setLoaded(false);
                        sound.tap();
                      }}
                      className="px-2 py-0.5 rounded-md bg-surface hover:bg-surface-hover text-foreground-muted hover:text-foreground transition-colors shrink-0 font-mono"
                    >
                      Vídeo {idx + 1}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Contenedor del Reproductor Vertical Oficial */}
          <div className="relative min-h-0 flex-1 overflow-hidden bg-black">
            {isOpen && (
              <iframe
                key={`${directVideoId || channel}-${currentVideoId}`}
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
              <TikTokGlyph className="h-8 w-8 text-white/25 animate-pulse" />
              <p className="text-[11px] font-medium text-white/60">Cargando TikTok…</p>
              <a
                href={currentVideoUrl}
                target="_blank"
                rel="noreferrer"
                className="pointer-events-auto mt-1 text-[11px] font-medium text-white/80 underline-offset-4 hover:text-white hover:underline flex items-center gap-1"
              >
                <span>Abrir este vídeo en TikTok</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </div>

          {/* Pie de Navegación y Controles */}
          <footer className="flex items-center justify-between gap-3 border-t border-border px-4 py-2.5 pb-[calc(0.625rem+var(--safe-bottom))] sm:pb-2.5 bg-surface">
            <div className="min-w-0">
              {directVideoId ? (
                <p className="text-[11px] text-foreground-muted font-medium">
                  Reproduciendo vídeo directo
                </p>
              ) : (
                <>
                  <p className="font-mono text-[11px] tabular-nums text-foreground-subtle">
                    <span className="font-medium text-foreground">{String(videoIndex + 1).padStart(2, '0')}</span>
                    <span className="mx-1">/</span>
                    {String(activeVideoList.length).padStart(2, '0')}
                    <span className="ml-2 text-[10px] text-foreground-subtle font-sans">· {CHANNELS[channel].label}</span>
                  </p>
                  <p className="mt-0.5 hidden text-[10px] text-foreground-subtle sm:block">
                    Usa ↑ / ↓ para cambiar de vídeo
                  </p>
                </>
              )}
            </div>

            <div className="flex items-center gap-1.5">
              {!directVideoId && (
                <>
                  <button
                    type="button"
                    onClick={() => goToVideo(videoIndex - 1)}
                    disabled={videoIndex === 0}
                    aria-label="Vídeo anterior"
                    className="flex h-8 w-8 items-center justify-center rounded-full border border-border/70 bg-surface-raised text-foreground-muted transition-colors hover:bg-surface-hover hover:text-foreground active:scale-95 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-surface-raised disabled:hover:text-foreground-muted"
                  >
                    <ChevronUp className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => goToVideo(videoIndex + 1)}
                    disabled={videoIndex === activeVideoList.length - 1}
                    aria-label="Vídeo siguiente"
                    className="flex h-8 w-8 items-center justify-center rounded-full border border-border/70 bg-surface-raised text-foreground-muted transition-colors hover:bg-surface-hover hover:text-foreground active:scale-95 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-surface-raised disabled:hover:text-foreground-muted"
                  >
                    <ChevronDown className="h-4 w-4" />
                  </button>
                </>
              )}

              <a
                href={currentVideoUrl}
                target="_blank"
                rel="noreferrer"
                className="flex h-8 w-8 items-center justify-center rounded-full border border-border/70 bg-surface-raised text-foreground-muted transition-colors hover:bg-surface-hover hover:text-foreground active:scale-95"
                title="Abrir este vídeo en TikTok"
              >
                <ExternalLink className="h-3.5 w-3.5" />
              </a>
            </div>
          </footer>
        </aside>
      </div>
    </>
  );
};
