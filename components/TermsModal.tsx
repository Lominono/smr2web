'use client';

import React, { useState } from 'react';
import { X, ShieldAlert, FileText, Cookie, Mail } from 'lucide-react';
import { sound } from '@/lib/audio';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';

interface TermsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const TermsModal: React.FC<TermsModalProps> = ({ isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState<'terms' | 'cookies' | 'info'>('terms');

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-xs pt-[env(safe-area-inset-top,0px)] pb-[env(safe-area-inset-bottom,0px)] animate-in fade-in duration-200">
      <Card
        className="w-full max-w-2xl p-0 overflow-hidden flex flex-col max-h-[92dvh] rounded-t-[20px] sm:rounded-[var(--radius-lg)] shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-border flex items-center justify-between bg-surface">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-[var(--radius-sm)] bg-surface-raised border border-border flex items-center justify-center text-accent">
              <FileText className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-foreground font-mono">
                Normativa, Privacidad y Cookies
              </h2>
              <p className="text-xs text-foreground-muted">
                Portal académico de 2º SMR
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              onClose();
              sound.tap();
            }}
            aria-label="Cerrar modal"
            className="w-11 h-11 rounded-lg text-foreground-muted hover:text-foreground hover:bg-surface-raised flex items-center justify-center transition-all cursor-pointer active:scale-95 touch-manipulation"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab navigation */}
        <div className="flex items-center gap-1 px-4 sm:px-5 pt-2 border-b border-border bg-surface">
          <Button
            variant={activeTab === 'terms' ? 'primary' : 'ghost'}
            size="sm"
            onClick={() => {
              setActiveTab('terms');
              sound.tap();
            }}
          >
            Normativa de uso
          </Button>

          <Button
            variant={activeTab === 'cookies' ? 'primary' : 'ghost'}
            size="sm"
            onClick={() => {
              setActiveTab('cookies');
              sound.tap();
            }}
          >
            Cookies y datos
          </Button>

          <Button
            variant={activeTab === 'info' ? 'primary' : 'ghost'}
            size="sm"
            onClick={() => {
              setActiveTab('info');
              sound.tap();
            }}
          >
            Información del proyecto
          </Button>
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-4 text-xs font-sans text-foreground-muted leading-relaxed">
          {activeTab === 'terms' && (
            <div className="space-y-3">
              <div className="p-3.5 rounded-[var(--radius)] bg-surface-raised border border-border space-y-1">
                <h4 className="font-mono font-semibold text-foreground text-xs">
                  1. Finalidad de la plataforma
                </h4>
                <p>
                  Esta herramienta está diseñada para la gestión colaborativa del aula: horario lectivo, avisos del delegado, calendario de exámenes y comunicación entre estudiantes del ciclo formativo de Sistemas Microinformáticos y Redes.
                </p>
              </div>

              <div className="p-3.5 rounded-[var(--radius)] bg-surface-raised border border-border space-y-1">
                <h4 className="font-mono font-semibold text-foreground text-xs">
                  2. Puntuación y fichas virtuales
                </h4>
                <p>
                  Las fichas y mecánicas de minijuegos son exclusivamente un sistema de entretenimiento en pausas lectivas. No tienen valor monetario ni repercusión académica.
                </p>
              </div>

              <div className="p-3.5 rounded-[var(--radius)] bg-surface-raised border border-border space-y-1">
                <h4 className="font-mono font-semibold text-foreground text-xs">
                  3. Calendario y entregas
                </h4>
                <p>
                  Las fechas publicadas en el calendario son gestionadas por los delegados de clase como recordatorio orientativo. La fuente oficial de plazos de entrega es la plataforma del centro educativo.
                </p>
              </div>
            </div>
          )}

          {activeTab === 'cookies' && (
            <div className="space-y-3">
              <p className="text-xs text-foreground">
                Este portal únicamente emplea cookies técnicas y de almacenamiento local necesarias para el correcto funcionamiento de la sesión:
              </p>

              <div className="space-y-2">
                <div className="p-3 rounded-[var(--radius)] bg-surface-raised border border-border flex items-center justify-between">
                  <div>
                    <span className="font-mono font-semibold text-foreground text-xs block">smr2_user_session</span>
                    <span className="text-[11px] text-foreground-subtle">Mantiene la autenticación y el rol de usuario.</span>
                  </div>
                  <Badge variant="default" size="sm">
                    Técnica
                  </Badge>
                </div>

                <div className="p-3 rounded-[var(--radius)] bg-surface-raised border border-border flex items-center justify-between">
                  <div>
                    <span className="font-mono font-semibold text-foreground text-xs block">smr2_sound_enabled</span>
                    <span className="text-[11px] text-foreground-subtle">Guarda la preferencia de silenciado de efectos de audio.</span>
                  </div>
                  <Badge variant="default" size="sm">
                    Preferencia
                  </Badge>
                </div>

                <div className="p-3 rounded-[var(--radius)] bg-surface-raised border border-border flex items-center justify-between">
                  <div>
                    <span className="font-mono font-semibold text-foreground text-xs block">smr2_cookie_consent</span>
                    <span className="text-[11px] text-foreground-subtle">Registra la aceptación del aviso informativo de almacenamiento.</span>
                  </div>
                  <Badge variant="default" size="sm">
                    Técnica
                  </Badge>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'info' && (
            <div className="space-y-3">
              <div className="p-3.5 rounded-[var(--radius)] bg-surface-raised border border-border space-y-2">
                <h4 className="font-mono font-semibold text-foreground text-xs">
                  2º Ciclo Formativo de Grado Medio
                </h4>
                <p>
                  Módulos: Sistemas Operativos en Red (SOR), Seguridad Informática (SI), Servicios en Red (SR) y Aplicaciones Web (AW).
                </p>
                <p className="text-foreground-subtle text-[11px]">
                  Desarrollado con Next.js y Supabase.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 sm:p-5 border-t border-border bg-surface flex items-center justify-between">
          <span className="text-[11px] text-foreground-subtle font-mono">
            Curso 2024–2025
          </span>

          <Button
            variant="primary"
            size="sm"
            onClick={() => {
              onClose();
              sound.tap();
            }}
          >
            Entendido
          </Button>
        </div>
      </Card>
    </div>
  );
};
