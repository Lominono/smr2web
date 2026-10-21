'use client';

import React, { useState, useEffect } from 'react';
import { Download, ExternalLink, Copy, Check, Gamepad2, X } from 'lucide-react';
import { sound } from '@/lib/audio';

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
    <div className="relative rounded-2xl bg-[#0e1217] border border-emerald-500/25 px-4 py-3 sm:px-5 sm:py-3.5 shadow-sm">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        {/* Info */}
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
            <Gamepad2 className="w-5 h-5" />
          </div>

          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs sm:text-sm font-semibold text-white font-sans">
                Cliente Minecraft de la clase
              </span>
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                Por Marco Antonio
              </span>
            </div>
            <p className="text-[11px] text-zinc-400 truncate">
              Descarga NightVerix Alpha para jugar en los descansos con el grupo.
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-end shrink-0 pt-1 sm:pt-0">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleCopy}
              title="Copiar enlace"
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 text-xs font-mono text-zinc-300 hover:text-white transition-colors cursor-pointer"
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-emerald-400">Copiado</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5 text-zinc-400" />
                  <span>Copiar link</span>
                </>
              )}
            </button>

            <a
              href={MINECRAFT_URL}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => sound.tap()}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-black text-xs font-mono font-semibold transition-colors cursor-pointer"
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
            className="p-1.5 rounded-lg text-zinc-500 hover:text-zinc-300 hover:bg-white/[0.06] transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
