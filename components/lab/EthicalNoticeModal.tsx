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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in font-sans">
      <div className="max-w-lg w-full bg-neutral-900 border border-neutral-800 rounded-xl p-6 sm:p-8 space-y-6 text-neutral-200 shadow-2xl">
        <div className="flex items-center gap-3 border-b border-neutral-800 pb-4">
          <div className="p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <div>
            <span className="font-mono text-xs uppercase tracking-wider text-amber-400 font-semibold">
              AVISO ÉTICO Y LEGAL OBLIGATORIO
            </span>
            <h2 className="text-lg font-bold text-neutral-100">
              Código de Conducta en Ciberseguridad
            </h2>
          </div>
        </div>

        <div className="space-y-3 text-xs sm:text-sm text-neutral-300 leading-relaxed font-sans">
          <p>
            Bienvenido al <strong>Cyber Lab de SMR2</strong>. Esta plataforma ha sido diseñada exclusivamente con fines <strong>educativos y formativos</strong> en el ámbito de la asignatura de Seguridad Informática.
          </p>

          <div className="p-3 rounded-lg bg-neutral-950 border border-neutral-800 space-y-2 font-mono text-xs">
            <div className="flex items-center gap-2 text-neutral-100 font-bold">
              <Lock className="w-3.5 h-3.5 text-amber-400" />
              <span>REGLAS DE ENGAGEMENT:</span>
            </div>
            <ul className="list-disc list-inside space-y-1 text-neutral-400">
              <li>Todas las vulnerabilidades y datos de este laboratorio son <strong>100% ficticios y simulados</strong> en el navegador.</li>
              <li>Queda estrictamente prohibido utilizar las técnicas aprendidas contra sistemas reales sin autorización previa y por escrito.</li>
              <li>El acceso, alteración o vulneración de sistemas ajenos constituye un delito informático tipificado en el <strong>Código Penal español (artículos 197 bis y ter)</strong>.</li>
            </ul>
          </div>

          <p className="text-xs text-neutral-400">
            Al pulsar en aceptar, confirmas que comprendes la naturaleza didáctica del laboratorio y te comprometes a actuar siempre dentro del marco de la legalidad y la ética profesional.
          </p>
        </div>

        <div className="pt-2">
          <button
            onClick={onAccept}
            type="button"
            className="w-full py-2.5 px-4 bg-emerald-500 hover:bg-emerald-400 text-neutral-950 font-bold font-mono text-xs rounded-lg transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-emerald-500/20"
          >
            <CheckCircle className="w-4 h-4" />
            <span>ACEPTO Y ME COMPROMETO A PRACTICAR CON ÉTICA</span>
          </button>
        </div>
      </div>
    </div>
  );
};
