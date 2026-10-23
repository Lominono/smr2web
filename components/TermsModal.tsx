'use client';

import React, { useState } from 'react';
import { X, ShieldAlert, FileText, Cookie, Info, Flame, AlertTriangle, CheckCircle2 } from 'lucide-react';
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
        className="w-full max-w-2xl p-0 overflow-hidden flex flex-col max-h-[92dvh] rounded-t-[20px] sm:rounded-[var(--radius-lg)] shadow-2xl bg-surface border border-border"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-border flex items-center justify-between bg-surface">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-surface-raised border border-border flex items-center justify-center text-accent">
              <FileText className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-foreground font-mono">
                Normativa Oficial, Cookies y Manifiesto de 2º SMR
              </h2>
              <p className="text-xs text-foreground-muted">
                Leyes internas del aula · Válidas durante todo el curso
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
            className="w-10 h-10 rounded-lg text-foreground-muted hover:text-foreground hover:bg-surface-raised flex items-center justify-center transition-all cursor-pointer active:scale-95 touch-manipulation"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab navigation */}
        <div className="flex items-center gap-1 px-4 sm:px-5 pt-2 border-b border-border bg-surface overflow-x-auto">
          <Button
            variant={activeTab === 'terms' ? 'primary' : 'ghost'}
            size="sm"
            onClick={() => {
              setActiveTab('terms');
              sound.tap();
            }}
          >
            Leyes de Clase & SMR
          </Button>

          <Button
            variant={activeTab === 'cookies' ? 'primary' : 'ghost'}
            size="sm"
            onClick={() => {
              setActiveTab('cookies');
              sound.tap();
            }}
          >
            Cookies y Secretos
          </Button>

          <Button
            variant={activeTab === 'info' ? 'primary' : 'ghost'}
            size="sm"
            onClick={() => {
              setActiveTab('info');
              sound.tap();
            }}
          >
            Acerca del Proyecto
          </Button>
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-4 text-xs font-sans text-foreground-muted leading-relaxed">
          {activeTab === 'terms' && (
            <div className="space-y-3">
              {/* Ley 1: Profesores Fuera */}
              <div className="p-4 rounded-2xl bg-surface-raised border border-border space-y-1.5">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-[10px] font-mono border-red-500/40 text-red-400 bg-red-500/10">
                    ARTÍCULO 1 · PROHIBICIÓN
                  </Badge>
                  <h4 className="font-mono font-bold text-foreground text-xs">
                    Zona 100% libre de profesores
                  </h4>
                </div>
                <p>
                  Esta plataforma está reservada de forma estricta para alumnos matriculados en 2º SMR. Si eres profesor de Sistemas Operativos en Red, Redes Locales o Seguridad Informática: sal de aquí inmediatamente. No hay criterios de evaluación, ni exámenes sorpresa, ni nada que puntuar en Séneca.
                </p>
              </div>

              {/* Ley 2: Cláusula Anti-David */}
              <div className="p-4 rounded-2xl bg-surface-raised border border-border space-y-1.5">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-[10px] font-mono border-amber-500/40 text-amber-400 bg-amber-500/10">
                    ARTÍCULO 2 · PROTOCOLO DAVID
                  </Badge>
                  <h4 className="font-mono font-bold text-foreground text-xs">
                    El incidente de Angry Birds y los tramposos
                  </h4>
                </div>
                <p>
                  Queda terminantemente prohibido utilizar autoclickers en El Botellón, inyectar tramas raras con Wireshark en la Wi-Fi de clase o quejarse al delegado por el cierre indefinido de Angry Birds. David intentó reventar el servidor con cables infinitos y ahora pagamos justos por pecadores.
                </p>
              </div>

              {/* Ley 3: Ruleta Rusa y Responsabilidad */}
              <div className="p-4 rounded-2xl bg-surface-raised border border-border space-y-1.5">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-[10px] font-mono border-border text-foreground-muted bg-surface">
                    ARTÍCULO 3 · APUESTAS
                  </Badge>
                  <h4 className="font-mono font-bold text-foreground text-xs">
                    Responsabilidad moral y ludopatía de recreo
                  </h4>
                </div>
                <p>
                  Apostar todas tus fichas en la Ruleta Rusa cinco minutos antes de entregar una práctica de Sistemas Operativos es bajo tu entera responsabilidad. Perder no convalida asignaturas ni sirve como justificante médico ante jefatura de estudios.
                </p>
              </div>

              {/* Ley 4: Redadas en El Botellón */}
              <div className="p-4 rounded-2xl bg-surface-raised border border-border space-y-1.5">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-[10px] font-mono border-rose-500/40 text-rose-400 bg-rose-500/10">
                    ARTÍCULO 4 · LA POLICÍA
                  </Badge>
                  <h4 className="font-mono font-bold text-foreground text-xs">
                    Multas por quedarse dormido (AFK)
                  </h4>
                </div>
                <p>
                  Si te vas al After Clandestino de fiesta y te salta la patrulla mientras estás en el baño, la policía te requisará el 50% de las fichas del bote sin piedad. El delegado de clase no gestionará recursos administrativos de alzada.
                </p>
              </div>

              {/* Ley 5: La solución universal */}
              <div className="p-4 rounded-2xl bg-surface-raised border border-border space-y-1.5">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-[10px] font-mono border-emerald-500/40 text-emerald-400 bg-emerald-500/10">
                    ARTÍCULO 5 · SOPORTE TÉCNICO
                  </Badge>
                  <h4 className="font-mono font-bold text-foreground text-xs">
                    ¿Has probado a reiniciar?
                  </h4>
                </div>
                <p>
                  Si algo en la web no funciona, no abras un ticket. Pulsa F5, borra la caché o reinicia el router como un buen informático de grado medio.
                </p>
              </div>
            </div>
          )}

          {activeTab === 'cookies' && (
            <div className="space-y-3">
              <p className="text-xs text-foreground">
                Tranquilidad: aquí no vendemos tus datos a nadie. Ni siquiera sabemos cómo se hace. Solo guardamos lo justo en tu navegador:
              </p>

              <div className="space-y-2">
                <div className="p-3.5 rounded-2xl bg-surface-raised border border-border flex items-start justify-between gap-3">
                  <div>
                    <span className="font-mono font-bold text-foreground text-xs block">smr2_user_session</span>
                    <span className="text-[11px] text-foreground-muted">Tu DNI virtual para saber si eres estudiante o si vienes a cotillear sin permiso.</span>
                  </div>
                  <Badge variant="default" size="sm">
                    Imprescindible
                  </Badge>
                </div>

                <div className="p-3.5 rounded-2xl bg-surface-raised border border-border flex items-start justify-between gap-3">
                  <div>
                    <span className="font-mono font-bold text-foreground text-xs block">smr2_sound_enabled</span>
                    <span className="text-[11px] text-foreground-muted">Para que no te suene un trago de litrona a 100dB si el profesor está explicando en la pizarra.</span>
                  </div>
                  <Badge variant="default" size="sm">
                    Sigilo
                  </Badge>
                </div>

                <div className="p-3.5 rounded-2xl bg-surface-raised border border-border flex items-start justify-between gap-3">
                  <div>
                    <span className="font-mono font-bold text-foreground text-xs block">botellon_save_v2</span>
                    <span className="text-[11px] text-foreground-muted">Tu alijo secreto de hielos, chupitos y nivel de resaca acumulada en el parque.</span>
                  </div>
                  <Badge variant="default" size="sm">
                    Farmeo
                  </Badge>
                </div>

                <div className="p-3.5 rounded-2xl bg-surface-raised border border-border flex items-start justify-between gap-3">
                  <div>
                    <span className="font-mono font-bold text-foreground text-xs block">smr2_cookie_consent</span>
                    <span className="text-[11px] text-foreground-muted">Prueba fehaciente de que pulsaste &quot;Aceptar&quot; y te leíste este tostón de texto.</span>
                  </div>
                  <Badge variant="default" size="sm">
                    Legal
                  </Badge>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'info' && (
            <div className="space-y-3">
              <div className="p-4 rounded-2xl bg-surface-raised border border-border space-y-2">
                <h4 className="font-mono font-bold text-foreground text-xs">
                  2º Ciclo Formativo de Grado Medio · SMR
                </h4>
                <p>
                  Portal creado para gestionar el horario de clase, las fechas de exámenes, los avisos del aula y las pausas entre prácticas de montaje, cableado estructurado y servidores Linux.
                </p>
                <div className="pt-2 text-[11px] text-foreground-subtle border-t border-border flex items-center justify-between">
                  <span>Stack: Next.js + React + Supabase</span>
                  <span>Promoción 2024–2026</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 sm:p-5 border-t border-border bg-surface flex items-center justify-between">
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
          >
            Acepto las leyes de clase
          </Button>
        </div>
      </Card>
    </div>
  );
};
