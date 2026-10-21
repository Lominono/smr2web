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
    <div className="relative rounded-[var(--radius)] bg-surface border border-border px-4 py-3">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        {/* Info */}
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-8 h-8 rounded-[var(--radius-sm)] bg-surface-raised border border-border text-accent flex items-center justify-center shrink-0">
            <Gamepad2 className="w-4 h-4" />
          </div>

          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs sm:text-sm font-semibold text-foreground">
                Cliente Minecraft de la clase
              </span>
              <Badge variant="default" size="sm">
                Marco Antonio
              </Badge>
            </div>
            <p className="text-xs text-foreground-muted truncate">
              Descarga NightVerix Alpha para jugar en los descansos con el grupo.
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-end shrink-0">
          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={handleCopy}
              title="Copiar enlace"
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-success" />
                  <span>Copiado</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copiar link</span>
                </>
              )}
            </Button>

            <a
              href={MINECRAFT_URL}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => sound.tap()}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[var(--radius)] bg-accent hover:bg-accent-hover text-accent-foreground text-xs font-medium transition-colors cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Descargar</span>
              <ExternalLink className="w-3 h-3 opacity-70" />
            </a>
          </div>

          <button
            type="button"
            onClick={handleDismiss}
            aria-label="Cerrar aviso"
            title="Ocultar aviso"
            className="p-1.5 rounded-[var(--radius-sm)] text-foreground-subtle hover:text-foreground hover:bg-surface-raised transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
