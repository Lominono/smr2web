'use client';

import React, { useState, useEffect } from 'react';
import { Download, ExternalLink, Copy, Check, Gamepad2, X } from 'lucide-react';
import { sound } from '@/lib/audio';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';

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
    <div className="relative rounded-2xl bg-surface border border-border/70 p-3.5 sm:p-4 shadow-xs transition-all">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        {/* Info */}
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-9 h-9 rounded-xl bg-surface-raised border border-border/70 text-foreground flex items-center justify-center shrink-0">
            <Gamepad2 className="w-4 h-4 text-accent" />
          </div>

          <div className="min-w-0 space-y-0.5">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs sm:text-sm font-semibold text-foreground tracking-tight">
                Cliente de Minecraft de clase
              </span>
              <Badge variant="default" size="sm">
                Comunidad 2º SMR
              </Badge>
            </div>
            <p className="text-xs text-foreground-muted truncate">
              Descarga NightVerix Alpha para jugar durante las pausas del curso.
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-end shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-border/50">
          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={handleCopy}
              title="Copiar enlace"
              className="rounded-xl"
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-success" />
                  <span>Copiado</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copiar enlace</span>
                </>
              )}
            </Button>

            <a
              href={MINECRAFT_URL}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => sound.tap()}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-foreground text-background text-xs font-semibold hover:opacity-90 transition-all cursor-pointer active:scale-95 touch-manipulation"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Descargar</span>
              <ExternalLink className="w-3 h-3 opacity-60" />
            </a>
          </div>

          <button
            type="button"
            onClick={handleDismiss}
            aria-label="Cerrar aviso"
            title="Ocultar aviso"
            className="w-8 h-8 rounded-lg text-foreground-subtle hover:text-foreground hover:bg-surface-raised flex items-center justify-center transition-all cursor-pointer active:scale-95 touch-manipulation"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
