'use client';

import React, { useState } from 'react';
import { X, ShieldAlert, Mail, Copy, Check, FileText, AlertCircle, Sparkles, Cookie, Heart } from 'lucide-react';
import { sound } from '@/lib/audio';

interface TermsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const JOKE_EMAIL = 'franciscofranquito@gmail.com';

export const TermsModal: React.FC<TermsModalProps> = ({ isOpen, onClose }) => {
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<'terms' | 'cookies' | 'contact'>('terms');

  if (!isOpen) return null;

  const handleCopyEmail = () => {
    try {
      navigator.clipboard.writeText(JOKE_EMAIL);
      setCopied(true);
      sound.tap();
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div
        className="relative w-full max-w-2xl bg-[#0c0c12] border border-white/10 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 sm:p-6 border-b border-white/[0.08] flex items-center justify-between bg-white/[0.02]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold font-mono text-white flex items-center gap-2">
                Términos, Condiciones y Cookies
              </h2>
              <p className="text-xs text-zinc-400 font-sans">
                Normativa oficial de cachondeo y convivencia de 2º SMR
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              onClose();
              sound.tap();
            }}
            className="w-8 h-8 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 flex items-center justify-center text-zinc-400 hover:text-white transition-all cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab navigation */}
        <div className="flex items-center gap-2 px-4 sm:px-6 pt-3 border-b border-white/[0.06] bg-black/30">
          <button
            type="button"
            onClick={() => {
              setActiveTab('terms');
              sound.tap();
            }}
            className={`pb-2.5 px-2 text-xs font-mono font-medium transition-all border-b-2 cursor-pointer ${
              activeTab === 'terms'
                ? 'border-amber-400 text-amber-300 font-bold'
                : 'border-transparent text-zinc-400 hover:text-white'
            }`}
          >
            1. Normas & Apuestas
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTab('cookies');
              sound.tap();
            }}
            className={`pb-2.5 px-2 text-xs font-mono font-medium transition-all border-b-2 cursor-pointer ${
              activeTab === 'cookies'
                ? 'border-amber-400 text-amber-300 font-bold'
                : 'border-transparent text-zinc-400 hover:text-white'
            }`}
          >
            2. Política de Cookies
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTab('contact');
              sound.tap();
            }}
            className={`pb-2.5 px-2 text-xs font-mono font-medium transition-all border-b-2 cursor-pointer ${
              activeTab === 'contact'
                ? 'border-amber-400 text-amber-300 font-bold'
                : 'border-transparent text-zinc-400 hover:text-white'
            }`}
          >
            3. Contacto & Reclamaciones
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-4 text-xs sm:text-sm font-sans text-zinc-300 leading-relaxed">
          {activeTab === 'terms' && (
            <div className="space-y-4 animate-in fade-in duration-150">
              <div className="p-3.5 rounded-2xl bg-amber-500/[0.08] border border-amber-500/20 text-amber-300 flex items-start gap-3">
                <ShieldAlert className="w-5 h-5 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <span className="font-mono font-bold block">Aviso Legal Estudiantil</span>
                  <p className="text-xs text-amber-200/90 font-sans">
                    Esta web es una plataforma privada creada exclusivamente por y para los alumnos de 2º SMR. Queda terminantemente prohibido el acceso a profesores, inspectores educativos o soplones.
                  </p>
                </div>
              </div>

              <div className="space-y-3">
                <div className="p-3.5 rounded-2xl bg-white/[0.02] border border-white/[0.06] space-y-1">
                  <h4 className="font-mono font-bold text-white text-xs sm:text-sm flex items-center gap-1.5">
                    🪙 Cláusula 1: Moneda 100% Virtual (Cachondeo)
                  </h4>
                  <p className="text-xs text-zinc-400">
                    Las fichas y monedas son exclusivamente simuladas para pasar el rato en los recreos y clases aburridas. No equivalen a euros reales, ni a décimas en el examen de Redes, ni a convalidar las FCTs. No aceptamos Bizums ni reclamaciones financieras.
                  </p>
                </div>

                <div className="p-3.5 rounded-2xl bg-white/[0.02] border border-white/[0.06] space-y-1">
                  <h4 className="font-mono font-bold text-white text-xs sm:text-sm flex items-center gap-1.5">
                    🎰 Cláusula 2: Quiebra en Crash y Slingshot
                  </h4>
                  <p className="text-xs text-zinc-400">
                    Si te crees lobo de Wall Street y metes todo tu saldo en un x50 del tirachinas y lo pierdes todo, no vengas llorando al grupo de WhatsApp. Usa el <strong>Fondo de Rescate diario</strong> (botón + en el menú) y aprende a gestionar el riesgo.
                  </p>
                </div>

                <div className="p-3.5 rounded-2xl bg-white/[0.02] border border-white/[0.06] space-y-1">
                  <h4 className="font-mono font-bold text-white text-xs sm:text-sm flex items-center gap-1.5">
                    📅 Cláusula 3: Responsabilidad en Entregas y Horario
                  </h4>
                  <p className="text-xs text-zinc-400">
                    Las fechas de exámenes y prácticas publicadas en la agenda son orientativas y cargadas por el delegado. Si entregas la práctica de Active Directory un minuto después del cierre en Moodle y te cae un cero, no es culpa del servidor de esta web.
                  </p>
                </div>

                <div className="p-3.5 rounded-2xl bg-white/[0.02] border border-white/[0.06] space-y-1">
                  <h4 className="font-mono font-bold text-white text-xs sm:text-sm flex items-center gap-1.5">
                    🎮 Cláusula 4: Vicios a Minecraft
                  </h4>
                  <p className="text-xs text-zinc-400">
                    Se recomienda a todo el alumnado instalar el cliente NightVerix para apoyar el proyecto de Marco Antonio y organizar partidas multijugador dignas.
                  </p>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'cookies' && (
            <div className="space-y-4 animate-in fade-in duration-150">
              <div className="p-3.5 rounded-2xl bg-blue-500/[0.08] border border-blue-500/20 text-blue-300 flex items-start gap-3">
                <Cookie className="w-5 h-5 shrink-0 mt-0.5 text-amber-400" />
                <div className="space-y-1">
                  <span className="font-mono font-bold block">Política de Almacenamiento Local y Cookies</span>
                  <p className="text-xs text-blue-200/90 font-sans">
                    Solo utilizamos almacenamiento técnico esencial. No rastreamos tus datos, ni te ponemos anuncios de zapatillas, ni vendemos nada a terceros.
                  </p>
                </div>
              </div>

              <div className="space-y-2.5">
                <div className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.06] flex items-center justify-between">
                  <div>
                    <span className="font-mono font-bold text-white text-xs block">smr2_user_session</span>
                    <span className="text-[11px] text-zinc-400">Guarda tu usuario, rol y balance durante 365 días en tu navegador.</span>
                  </div>
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                    Esencial
                  </span>
                </div>

                <div className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.06] flex items-center justify-between">
                  <div>
                    <span className="font-mono font-bold text-white text-xs block">smr2_sound_enabled</span>
                    <span className="text-[11px] text-zinc-400">Guarda si tienes silenciados los efectos de audio para no asustar en clase.</span>
                  </div>
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                    Preferencia
                  </span>
                </div>

                <div className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.06] flex items-center justify-between">
                  <div>
                    <span className="font-mono font-bold text-white text-xs block">smr2_cookie_consent</span>
                    <span className="text-[11px] text-zinc-400">Registra que has aceptado estas condiciones para no darte la chapa otra vez.</span>
                  </div>
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                    Esencial
                  </span>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'contact' && (
            <div className="space-y-4 animate-in fade-in duration-150">
              <div className="p-4 rounded-2xl bg-gradient-to-br from-white/[0.04] to-white/[0.01] border border-white/10 space-y-3">
                <div className="flex items-center gap-2.5">
                  <Mail className="w-5 h-5 text-amber-400" />
                  <h4 className="font-mono font-bold text-white text-sm">
                    Departamento de Quejas y Asuntos Académicos
                  </h4>
                </div>

                <p className="text-xs text-zinc-300 leading-relaxed">
                  Para quejas formales, solicitudes de indemnización en bocadillos de tortilla del recreo, peticiones de clemencia ante suspensos inminentes o dudas sobre la web, ponte en contacto con nuestro representante legal:
                </p>

                <div className="p-3 rounded-xl bg-black/60 border border-white/10 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2 overflow-hidden">
                    <span className="text-xs sm:text-sm font-mono font-bold text-amber-300 truncate select-all">
                      {JOKE_EMAIL}
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={handleCopyEmail}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white text-xs font-mono transition-all cursor-pointer active:scale-95 shrink-0"
                  >
                    {copied ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                        <span className="text-emerald-400">Copiado</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5 text-zinc-300" />
                        <span>Copiar correo</span>
                      </>
                    )}
                  </button>
                </div>

                <p className="text-[11px] text-zinc-500 italic">
                  * Nota: El buzón puede o no ser respondido antes de que termine el curso 2024–2025.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 sm:p-5 border-t border-white/[0.08] bg-white/[0.02] flex items-center justify-between">
          <span className="text-[11px] text-zinc-500 font-mono">
            SMR2 · Departamento Legal Informal
          </span>

          <button
            onClick={() => {
              onClose();
              sound.tap();
            }}
            className="px-5 py-2 rounded-xl bg-white hover:bg-zinc-200 text-black text-xs font-mono font-bold transition-all shadow cursor-pointer active:scale-95"
          >
            Entendido y Acepto
          </button>
        </div>
      </div>
    </div>
  );
};
