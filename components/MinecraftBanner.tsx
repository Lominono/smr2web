'use client';

import React, { useState, useEffect } from 'react';
import { Download, ExternalLink, X } from 'lucide-react';
import { sound } from '@/lib/audio';

const MINECRAFT_URL = 'https://nightverixclient.netlify.app/download-alpha';
const STORAGE_KEY = 'smr2_mc_banner_dismissed';

export const MinecraftBanner: React.FC = () => {
  const [dismissed, setDismissed] = useState(true);

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

  if (dismissed) return null;

  return (
    <aside
      aria-label="Servidor comunitario de Minecraft"
      className="rounded-xl bg-surface border border-border/80 px-3.5 py-2.5 transition-all text-xs flex items-center justify-between gap-3 shadow-2xs"
    >
      <div className="flex items-center gap-2.5 min-w-0">
        <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
        <p className="text-foreground truncate font-sans">
          <strong className="font-semibold">Minecraft de clase:</strong> NightVerix Alpha disponible para las pausas.
        </p>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        <a
          href={MINECRAFT_URL}
          target="_blank"
          rel="noopener noreferrer"
          onClick={() => sound.tap()}
          className="text-xs font-medium text-accent hover:underline flex items-center gap-1"
        >
          <Download className="w-3 h-3" />
          <span>Descargar</span>
          <ExternalLink className="w-2.5 h-2.5 opacity-60" />
        </a>

        <button
          type="button"
          onClick={handleDismiss}
          aria-label="Cerrar aviso"
          className="text-foreground-subtle hover:text-foreground p-1 rounded-md transition-colors cursor-pointer"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    </aside>
  );
};
