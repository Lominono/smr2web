'use client';

import React, { useState } from 'react';
import { Download, ExternalLink, Sparkles, Copy, Check, Gamepad2, Shield } from 'lucide-react';
import { sound } from '@/lib/audio';

const MINECRAFT_URL = 'https://nightverixclient.netlify.app/download-alpha';

export const MinecraftBanner: React.FC = () => {
  const [copied, setCopied] = useState(false);

  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      navigator.clipboard.writeText(MINECRAFT_URL);
      setCopied(true);
      sound.tap();
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback
    }
  };

  return (
    <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-emerald-950/40 via-zinc-900/90 to-blue-950/30 border border-emerald-500/20 p-4 sm:p-5 shadow-[0_8px_32px_rgba(0,0,0,0.5)]">
      {/* Decorative subtle ambient lights */}
      <div className="absolute -top-12 -right-12 w-36 h-36 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none" />
      <div className="absolute -bottom-10 -left-10 w-32 h-32 bg-blue-500/10 rounded-full blur-2xl pointer-events-none" />

      <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Left column: Info & description */}
        <div className="flex items-start gap-3.5">
          <div className="w-12 h-12 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center shrink-0 shadow-inner text-emerald-400">
            <Gamepad2 className="w-6 h-6 animate-pulse" />
          </div>

          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm font-bold text-white font-mono tracking-tight flex items-center gap-1.5">
                NightVerix Client · Minecraft Alpha
              </span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                Proyecto de Marco Antonio
              </span>
              <span className="hidden sm:inline-flex px-1.5 py-0.2 rounded text-[10px] font-mono bg-white/[0.06] text-zinc-400 border border-white/10">
                vAlpha
              </span>
            </div>

            <p className="text-xs text-zinc-300 font-sans leading-relaxed max-w-2xl">
              Descarga el cliente de Minecraft para jugar con la clase y apoyar el desarrollo de <strong className="text-emerald-400 font-medium">Marco Antonio</strong>. Optimizado para alto rendimiento y cero lag.
            </p>
          </div>
        </div>

        {/* Right column: Actions */}
        <div className="flex items-center gap-2 shrink-0 self-stretch sm:self-auto justify-end">
          <button
            type="button"
            onClick={handleCopy}
            title="Copiar enlace de descarga"
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 text-xs font-mono text-zinc-300 hover:text-white transition-all cursor-pointer active:scale-95"
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
            className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black text-xs font-mono font-bold shadow-[0_0_20px_rgba(16,185,129,0.3)] hover:shadow-[0_0_25px_rgba(16,185,129,0.5)] transition-all cursor-pointer active:scale-95"
          >
            <Download className="w-4 h-4" />
            <span>Descargar Minecraft</span>
            <ExternalLink className="w-3.5 h-3.5 opacity-70" />
          </a>
        </div>
      </div>
    </div>
  );
};
