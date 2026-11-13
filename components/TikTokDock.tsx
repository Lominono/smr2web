'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ArrowUpRight, BadgeCheck, ChevronDown, ChevronUp, X } from 'lucide-react';
import { sound } from '@/lib/audio';

/**
 * TikTok no publica un embed del feed «Para ti». Para mantener el contenido
 * dentro de la web usamos su página de embed oficial con una selección de
 * publicaciones de la cuenta oficial de TikTok España. Cada tarjeta es un post
 * real y enlaza a TikTok para verlo completo.
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

const TIKTOK_PROFILE_URL = 'https://www.tiktok.com/@tiktok_es';

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

export const TikTokDock: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [index, setIndex] = useState(0);
  const [loaded, setLoaded] = useState(false);

  const panelRef = useRef<HTMLElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const desktopTabRef = useRef<HTMLButtonElement>(null);
  const mobileTabRef = useRef<HTMLButtonElement>(null);

  const currentVideo = TIKTOK_VIDEOS[index];
  const currentVideoUrl = `${TIKTOK_PROFILE_URL}/video/${currentVideo}`;

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
      if (nextIndex < 0 || nextIndex >= TIKTOK_VIDEOS.length || nextIndex === index) {
        return;
      }
      setIndex(nextIndex);
      setLoaded(false);
      sound.tap();
    },
    [index]
  );

  useEffect(() => {
    const panel = panelRef.current;
    if (!panel) {
      return;
    }
    if (isOpen) {
      panel.removeAttribute('inert');
    } else {
      panel.setAttribute('inert', '');
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const frame = window.requestAnimationFrame(() => closeButtonRef.current?.focus());
    return () => {
      document.body.style.overflow = previousOverflow;
      window.cancelAnimationFrame(frame);
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        closePanel();
      } else if (event.key === 'ArrowDown' || event.key === 'PageDown') {
        event.preventDefault();
        goToVideo(index + 1);
      } else if (event.key === 'ArrowUp' || event.key === 'PageUp') {
        event.preventDefault();
        goToVideo(index - 1);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [closePanel, goToVideo, index, isOpen]);

  return (
    <>
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
          className={`absolute inset-y-0 right-0 flex w-full flex-col overflow-hidden border-border bg-surface shadow-2xl transition-transform duration-300 ease-out motion-reduce:transition-none sm:inset-y-3 sm:right-3 sm:w-[400px] sm:rounded-3xl sm:border ${
            isOpen ? 'translate-x-0' : 'translate-x-[calc(100%+1rem)]'
          }`}
        >
          <header className="flex items-center gap-3 border-b border-border px-4 py-3 pt-[calc(0.75rem+var(--safe-top))] sm:pt-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-foreground text-background">
              <TikTokGlyph className="h-4 w-4" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                <h2 className="truncate text-sm font-semibold tracking-tight text-foreground">TikTok</h2>
                <BadgeCheck className="h-3.5 w-3.5 shrink-0 text-accent" aria-label="Cuenta oficial" />
              </div>
              <p className="truncate text-[11px] text-foreground-muted">@tiktok_es · TikTok España</p>
            </div>
            <a
              href={TIKTOK_PROFILE_URL}
              target="_blank"
              rel="noreferrer"
              aria-label="Abrir el perfil de TikTok en una pestaña nueva"
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-border/70 bg-surface-raised text-foreground-muted transition-colors hover:bg-surface-hover hover:text-foreground active:scale-95"
            >
              <ArrowUpRight className="h-3.5 w-3.5" />
            </a>
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

          <div className="relative min-h-0 flex-1 overflow-hidden bg-black">
            {isOpen && (
              <iframe
                key={currentVideo}
                src={`https://www.tiktok.com/embed/${currentVideo}?lang=es`}
                title={`TikTok oficial de @tiktok_es · vídeo ${index + 1} de ${TIKTOK_VIDEOS.length}`}
                onLoad={() => setLoaded(true)}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; fullscreen; gyroscope; picture-in-picture; web-share"
                allowFullScreen
                className="absolute inset-0 h-full w-full border-0"
              />
            )}

            <div
              className={`pointer-events-none absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 bg-black px-6 text-center transition-opacity duration-300 motion-reduce:transition-none ${
                loaded ? 'invisible opacity-0' : 'visible opacity-100'
              }`}
            >
              <TikTokGlyph className="h-8 w-8 text-white/25" />
              <p className="text-[11px] font-medium text-white/60">Cargando TikTok…</p>
              <a
                href={currentVideoUrl}
                target="_blank"
                rel="noreferrer"
                className="pointer-events-auto mt-1 text-[11px] font-medium text-white/80 underline-offset-4 hover:text-white hover:underline"
              >
                Abrir este vídeo en TikTok
              </a>
            </div>
          </div>

          <footer className="flex items-center justify-between gap-3 border-t border-border px-4 py-2.5 pb-[calc(0.625rem+var(--safe-bottom))] sm:pb-2.5">
            <div className="min-w-0">
              <p className="font-mono text-[11px] tabular-nums text-foreground-subtle">
                <span className="font-medium text-foreground">{String(index + 1).padStart(2, '0')}</span>
                <span className="mx-1">/</span>
                {String(TIKTOK_VIDEOS.length).padStart(2, '0')}
              </p>
              <p className="mt-0.5 hidden text-[10px] text-foreground-subtle sm:block">
                Usa las flechas para cambiar de vídeo
              </p>
            </div>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => goToVideo(index - 1)}
                disabled={index === 0}
                aria-label="Vídeo anterior"
                className="flex h-8 w-8 items-center justify-center rounded-full border border-border/70 bg-surface-raised text-foreground-muted transition-colors hover:bg-surface-hover hover:text-foreground active:scale-95 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-surface-raised disabled:hover:text-foreground-muted"
              >
                <ChevronUp className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => goToVideo(index + 1)}
                disabled={index === TIKTOK_VIDEOS.length - 1}
                aria-label="Vídeo siguiente"
                className="flex h-8 w-8 items-center justify-center rounded-full border border-border/70 bg-surface-raised text-foreground-muted transition-colors hover:bg-surface-hover hover:text-foreground active:scale-95 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-surface-raised disabled:hover:text-foreground-muted"
              >
                <ChevronDown className="h-4 w-4" />
              </button>
            </div>
          </footer>
        </aside>
      </div>
    </>
  );
};
