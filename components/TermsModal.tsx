'use client';

import React, { useState } from 'react';
import { X, FileText, Shield, Database, Info, Check } from 'lucide-react';
import { sound } from '@/lib/audio';
import { Button } from '@/components/ui/Button';

interface TermsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const TermsModal: React.FC<TermsModalProps> = ({ isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState<'rules' | 'storage' | 'about'>('rules');

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="terms-title"
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-xs pt-[env(safe-area-inset-top,0px)] pb-[env(safe-area-inset-bottom,0px)] animate-in fade-in duration-150"
    >
      <div
        className="fixed inset-0"
        onClick={() => {
          sound.tap();
          onClose();
        }}
        aria-hidden="true"
      />

      <div
        className="relative z-10 w-full max-w-xl p-0 overflow-hidden flex flex-col max-h-[90dvh] rounded-t-2xl sm:rounded-2xl shadow-xl bg-surface border border-border"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-border flex items-center justify-between bg-surface-raised/40">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-surface border border-border flex items-center justify-center text-foreground shrink-0">
              <FileText className="w-4 h-4 text-accent" />
            </div>
            <div>
              <h2 id="terms-title" className="text-sm font-semibold text-foreground tracking-tight">
                Información y normas de uso
              </h2>
              <p className="text-xs text-foreground-muted">
                2º SMR · Portal lectivo de aula
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              onClose();
              sound.tap();
            }}
            aria-label="Cerrar ventana"
            className="w-8 h-8 rounded-lg text-foreground-muted hover:text-foreground hover:bg-surface-raised border border-border/50 flex items-center justify-center transition-all cursor-pointer active:scale-95 touch-manipulation"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab navigation */}
        <div className="flex items-center gap-1.5 px-4 sm:px-5 pt-2.5 pb-2 border-b border-border bg-surface overflow-x-auto scrollbar-none">
          <button
            type="button"
            onClick={() => {
              setActiveTab('rules');
              sound.tap();
            }}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all cursor-pointer ${
              activeTab === 'rules'
                ? 'bg-foreground text-background font-semibold shadow-2xs'
                : 'text-foreground-muted hover:text-foreground hover:bg-surface-raised'
            }`}
          >
            Normas de clase
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTab('storage');
              sound.tap();
            }}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all cursor-pointer ${
              activeTab === 'storage'
                ? 'bg-foreground text-background font-semibold shadow-2xs'
                : 'text-foreground-muted hover:text-foreground hover:bg-surface-raised'
            }`}
          >
            Almacenamiento
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTab('about');
              sound.tap();
            }}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all cursor-pointer ${
              activeTab === 'about'
                ? 'bg-foreground text-background font-semibold shadow-2xs'
                : 'text-foreground-muted hover:text-foreground hover:bg-surface-raised'
            }`}
          >
            Acerca del portal
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-3.5 text-xs font-sans text-foreground-muted leading-relaxed">
          {activeTab === 'rules' && (
            <div className="space-y-3">
              <div className="p-3.5 rounded-xl bg-surface-raised border border-border/70 space-y-1">
                <h3 className="font-semibold text-foreground text-xs">
                  1. Finalidad y uso académico
                </h3>
                <p>
                  El portal está destinado a la consulta del horario lectivo, recordatorio de entregas y comunicación entre compañeros del curso de 2º de Sistemas Microinformáticos y Redes.
                </p>
              </div>

              <div className="p-3.5 rounded-xl bg-surface-raised border border-border/70 space-y-1">
                <h3 className="font-semibold text-foreground text-xs">
                  2. Convivencia en el feed
                </h3>
                <p>
                  Las publicaciones y comentarios deben mantener un tono constructivo y de respeto hacia todos los alumnos y profesores. No se permite contenido ofensivo ni suplantación de identidad.
                </p>
              </div>

              <div className="p-3.5 rounded-xl bg-surface-raised border border-border/70 space-y-1">
                <h3 className="font-semibold text-foreground text-xs">
                  3. Utilidades de descanso
                </h3>
                <p>
                  Las fichas y minijuegos del recreo son exclusivamente para entretenimiento en las pausas de clase. No representan ningún valor monetario real ni tienen repercusión evaluativa.
                </p>
              </div>
            </div>
          )}

          {activeTab === 'storage' && (
            <div className="space-y-3">
              <p className="text-foreground">
                Los datos almacenados en el navegador se limitan a la gestión operativa de tu cuenta y preferencias:
              </p>

              <div className="space-y-2">
                <div className="p-3 rounded-xl bg-surface-raised border border-border/70 flex items-start justify-between gap-3">
                  <div>
                    <span className="font-mono font-semibold text-foreground text-xs block">smr2_user_session</span>
                    <span className="text-[11px] text-foreground-muted">Identificador y datos básicos del perfil de usuario autenticado.</span>
                  </div>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-surface border border-border text-foreground-subtle shrink-0">
                    Necesaria
                  </span>
                </div>

                <div className="p-3 rounded-xl bg-surface-raised border border-border/70 flex items-start justify-between gap-3">
                  <div>
                    <span className="font-mono font-semibold text-foreground text-xs block">smr2_sound_enabled</span>
                    <span className="text-[11px] text-foreground-muted">Preferencia de efectos de sonido activados o silenciados.</span>
                  </div>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-surface border border-border text-foreground-subtle shrink-0">
                    Ajuste
                  </span>
                </div>

                <div className="p-3 rounded-xl bg-surface-raised border border-border/70 flex items-start justify-between gap-3">
                  <div>
                    <span className="font-mono font-semibold text-foreground text-xs block">smr2_cookie_consent</span>
                    <span className="text-[11px] text-foreground-muted">Registro de confirmación de preferencias de almacenamiento.</span>
                  </div>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-surface border border-border text-foreground-subtle shrink-0">
                    Preferencia
                  </span>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'about' && (
            <div className="p-4 rounded-xl bg-surface-raised border border-border/70 space-y-2.5">
              <h3 className="font-semibold text-foreground text-xs">
                Portal de 2º SMR
              </h3>
              <p>
                Desarrollado para centralizar la información lectiva, horarios, exámenes y comunicación del grupo de segundo curso de Sistemas Microinformáticos y Redes.
              </p>
              <div className="pt-2 text-[11px] text-foreground-subtle border-t border-border flex items-center justify-between font-mono">
                <span>Next.js · React · Supabase</span>
                <span>Curso lectivo</span>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-border bg-surface-raised/30 flex items-center justify-between">
          <span className="text-[11px] text-foreground-subtle font-mono">
            SMR2 · Aula 204
          </span>

          <Button
            variant="primary"
            size="sm"
            onClick={() => {
              onClose();
              sound.tap();
            }}
            className="rounded-lg text-xs h-8 px-4"
          >
            Entendido
          </Button>
        </div>
      </div>
    </div>
  );
};
