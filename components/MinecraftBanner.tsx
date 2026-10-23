'use client';

import React, { useState, useEffect } from 'react';
import { Download, ExternalLink, Copy, Check, Gamepad2, X } from 'lucide-react';
import { sound } from '@/lib/audio';
import { Button } from '@/components/ui/Button';

const MINECRAFT_URL = 'https://nightverixclient.netlify.app/download-alpha';
const STORAGE_KEY = 'smr2_mc_banner_dismissed';

export const MinecraftBanner: React.FC = () => {
  const [copied, setCopied] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    try {
      const isDismissed = localStorage.getItem(STORAGE_KEY) === 'true';
      setDismissed(isDismissed);
    } catch {}
  }, []);

  const handleDismiss = () => {
    setDismissed(true);
    sound.tap();
    try {
      localStorage.setItem(STORAGE_KEY, 'true');
    } catch {}
  };

  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      navigator.clipboard.writeText(MINECRAFT_URL);
      setCopied(true);
      sound.tap();
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  };

  if (dismissed) return null;

  return (
    <div className="relative rounded-xl bg-surface border border-border/70 p-3 sm:p-3.5 transition-all shadow-2xs">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
        {/* Info */}
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-lg bg-surface-raised border border-border flex items-center justify-center shrink-0 text-foreground">
            <Gamepad2 className="w-4 h-4 text-accent" />
          </div>

          <div className="min-w-0 space-y-0.5">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-semibold text-foreground tracking-tight">
                Minecraft de clase · NightVerix Alpha
              </span>
            </div>
            <p className="text-[11px] text-foreground-muted truncate">
              Cliente de la comunidad para jugar durante las pausas del curso.
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1.5 w-full sm:w-auto justify-between sm:justify-end shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-border/50">
          <div className="flex items-center gap-1.5">
            <Button
              variant="secondary"
              size="sm"
              onClick={handleCopy}
              title="Copiar enlace"
              className="rounded-lg h-7 text-xs px-2.5"
            >
              {copied ? (
                <>
                  <Check className="w-3 h-3 text-success" />
                  <span>Copiado</span>
                </>
              ) : (
                <>
                  <Copy className="w-3 h-3" />
                  <span>Copiar</span>
                </>
              )}
            </Button>

            <a
              href={MINECRAFT_URL}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => sound.tap()}
              className="inline-flex items-center gap-1 px-3 py-1 rounded-lg bg-foreground text-background text-xs font-medium hover:opacity-90 transition-all cursor-pointer active:scale-95 touch-manipulation h-7"
            >
              <Download className="w-3 h-3" />
              <span>Descargar</span>
              <ExternalLink className="w-2.5 h-2.5 opacity-60" />
            </a>
          </div>

          <button
            type="button"
            onClick={handleDismiss}
            aria-label="Cerrar aviso"
            title="Ocultar aviso"
            className="w-7 h-7 rounded-md text-foreground-subtle hover:text-foreground hover:bg-surface-raised flex items-center justify-center transition-all cursor-pointer active:scale-95 touch-manipulation"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
