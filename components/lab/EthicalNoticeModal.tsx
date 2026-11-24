'use client';

import React from 'react';
import { ShieldAlert, CheckCircle, Lock } from 'lucide-react';

interface EthicalNoticeModalProps {
  isOpen: boolean;
  onAccept: () => void;
}

export const EthicalNoticeModal: React.FC<EthicalNoticeModalProps> = ({
  isOpen,
  onAccept,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in font-sans">
      <div className="max-w-lg w-full bg-white dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-800 rounded-2xl p-6 sm:p-8 space-y-6 text-neutral-800 dark:text-neutral-200 shadow-2xl">
        <div className="flex items-center gap-3 border-b border-neutral-200 dark:border-neutral-800 pb-4">
          <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <div>
            <span className="font-mono text-xs uppercase tracking-wider text-amber-600 dark:text-amber-400 font-bold block">
              AVISO ÉTICO Y LEGAL OBLIGATORIO
            </span>
            <h2 className="text-lg font-bold text-neutral-900 dark:text-neutral-100">
              Código de Conducta en Ciberseguridad
            </h2>
          </div>
        </div>

        <div className="space-y-3.5 text-xs sm:text-sm text-neutral-600 dark:text-neutral-300 leading-relaxed font-sans">
          <p>
            Bienvenido al <strong>Cyber Lab de SMR2</strong>. Esta plataforma ha sido diseñada exclusivamente con fines <strong>educativos y formativos</strong> en el ámbito de la asignatura de Seguridad Informática.
          </p>

          <div className="p-3.5 rounded-xl bg-neutral-100 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 space-y-2 font-mono text-xs">
            <div className="flex items-center gap-2 text-neutral-900 dark:text-neutral-100 font-bold">
              <Lock className="w-3.5 h-3.5 text-amber-500" />
              <span>REGLAS DE ENGAGEMENT:</span>
            </div>
            <ul className="list-disc list-inside space-y-1.5 text-neutral-600 dark:text-neutral-400">
              <li>Todas las vulnerabilidades y datos de este laboratorio son <strong>100% ficticios y simulados</strong> en el navegador.</li>
              <li>Queda estrictamente prohibido utilizar las técnicas aprendidas contra sistemas reales sin autorización previa y por escrito.</li>
              <li>El acceso o alteración no autorizada de sistemas informáticos es un delito penado en el <strong>Código Penal español (artículos 197 bis y ter)</strong>.</li>
            </ul>
          </div>

          <p className="text-xs text-neutral-500 dark:text-neutral-400">
            Al pulsar en aceptar, confirmas que comprendes la naturaleza didáctica del laboratorio y te comprometes a actuar siempre dentro del marco de la legalidad y la ética profesional.
          </p>
        </div>

        <div className="pt-2">
          <button
            onClick={onAccept}
            type="button"
            className="w-full py-3 px-4 bg-emerald-600 hover:bg-emerald-500 dark:bg-emerald-500 dark:hover:bg-emerald-400 text-white dark:text-neutral-950 font-bold font-mono text-xs rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer shadow-md"
          >
            <CheckCircle className="w-4 h-4" />
            <span>ACEPTO Y ME COMPROMETO A PRACTICAR CON ÉTICA</span>
          </button>
        </div>
      </div>
    </div>
  );
};
