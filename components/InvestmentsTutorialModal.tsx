'use client';

import React, { useState, useEffect } from 'react';
import {
  X,
  TrendingUp,
  Coins,
  ShieldCheck,
  Building2,
  Users,
  ChevronRight,
  ChevronLeft,
  ArrowUpRight,
  Sparkles,
  Clock,
  Wine,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { sound } from '@/lib/audio';

interface InvestmentsTutorialModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const InvestmentsTutorialModal: React.FC<InvestmentsTutorialModalProps> = ({
  isOpen,
  onClose,
}) => {
  const [step, setStep] = useState<number>(0);
  const [dontShowAgain, setDontShowAgain] = useState<boolean>(false);

  useEffect(() => {
    if (isOpen) {
      setStep(0);
    }
  }, [isOpen]);

  const handleClose = () => {
    sound.tap();
    if (dontShowAgain) {
      try {
        localStorage.setItem('botellon_investments_tutorial_seen', 'true');
      } catch (_) {}
    }
    onClose();
  };

  const handleNext = () => {
    sound.tap();
    if (step < 3) {
      setStep((prev) => prev + 1);
    } else {
      handleClose();
    }
  };

  const handlePrev = () => {
    sound.tap();
    if (step > 0) {
      setStep((prev) => prev - 1);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/65 backdrop-blur-xs animate-in fade-in duration-150"
    >
      <div className="fixed inset-0" onClick={handleClose} />

      <div className="relative z-10 w-full max-w-lg rounded-2xl bg-surface border border-border shadow-2xl overflow-hidden p-5 sm:p-6 space-y-4 animate-in zoom-in-95 duration-150">
        {/* Cabecera */}
        <div className="flex items-center justify-between pb-3 border-b border-border/60">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
              <TrendingUp className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-foreground">
                Guía de Inversiones · Paso {step + 1} de 4
              </h3>
              <p className="text-[11px] text-foreground-subtle">
                Aprende cómo funciona el mercado compartido de la clase
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleClose}
            className="w-8 h-8 rounded-xl text-foreground-muted hover:text-foreground hover:bg-surface-raised flex items-center justify-center transition-colors cursor-pointer"
            aria-label="Cerrar tutorial"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Indicadores de progreso (Puntos) */}
        <div className="flex items-center justify-center gap-1.5 pt-1">
          {[0, 1, 2, 3].map((i) => (
            <button
              key={i}
              type="button"
              onClick={() => {
                setStep(i);
                sound.tap();
              }}
              className={`h-1.5 rounded-full transition-all cursor-pointer ${
                step === i
                  ? 'w-6 bg-foreground'
                  : 'w-2 bg-border hover:bg-foreground-muted'
              }`}
              aria-label={`Ir al paso ${i + 1}`}
            />
          ))}
        </div>

        {/* Contenido según el paso */}
        <div className="py-2 min-h-[220px] flex flex-col justify-center text-xs space-y-3">
          {step === 0 && (
            <div className="space-y-3 animate-in fade-in duration-150">
              <div className="w-11 h-11 rounded-2xl bg-surface-raised border border-border flex items-center justify-center text-emerald-500 mx-auto">
                <Users className="w-5 h-5" />
              </div>

              <div className="text-center space-y-1">
                <h4 className="text-sm font-bold text-foreground">
                  1. Un mercado común para toda la clase
                </h4>
                <p className="text-foreground-muted leading-relaxed">
                  A diferencia de un juego solitario, aquí el precio de cada acción se mueve con las decisiones de todos los jugadores en tiempo real.
                </p>
              </div>

              <div className="p-3 rounded-xl bg-surface-raised/60 border border-border space-y-2">
                <div className="flex items-center gap-2 text-foreground">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
                  <span><strong>Más compras colectivas:</strong> La entrada de monedas empuja el precio hacia arriba.</span>
                </div>
                <div className="flex items-center gap-2 text-foreground">
                  <span className="w-2 h-2 rounded-full bg-rose-500 shrink-0" />
                  <span><strong>Más ventas o retiradas:</strong> La salida de dinero hace bajar la cotización.</span>
                </div>
                <div className="flex items-center gap-2 text-foreground-subtle text-[11px]">
                  <span className="w-2 h-2 rounded-full bg-foreground-subtle shrink-0" />
                  <span>El pool de liquidez suaviza las órdenes para que nadie pueda quebrar el mercado.</span>
                </div>
              </div>
            </div>
          )}

          {step === 1 && (
            <div className="space-y-3 animate-in fade-in duration-150">
              <div className="w-11 h-11 rounded-2xl bg-surface-raised border border-border flex items-center justify-center text-amber-500 mx-auto">
                <Building2 className="w-5 h-5" />
              </div>

              <div className="text-center space-y-1">
                <h4 className="text-sm font-bold text-foreground">
                  2. Fondo Botellón vs Empresas Parodia
                </h4>
                <p className="text-foreground-muted leading-relaxed">
                  Puedes diversificar tus monedas en dos tipos de activos:
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div className="p-3 rounded-xl bg-surface-raised/70 border border-border space-y-1">
                  <div className="flex items-center gap-1.5 font-semibold text-foreground">
                    <Wine className="w-3.5 h-3.5 text-emerald-500" />
                    <span>Fondo Botellón ($BTLN)</span>
                  </div>
                  <p className="text-[11px] text-foreground-muted leading-normal">
                    El índice general. Es más estable y seguro porque acumula las comisiones de todas las operaciones de la clase.
                  </p>
                </div>

                <div className="p-3 rounded-xl bg-surface-raised/70 border border-border space-y-1">
                  <div className="flex items-center gap-1.5 font-semibold text-foreground">
                    <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                    <span>Empresas ($ONION, $ARDI...)</span>
                  </div>
                  <p className="text-[11px] text-foreground-muted leading-normal">
                    Acciones de empresas parodia con mayor volatilidad. Ideales para operaciones rápidas buscando multiplicar monedas.
                  </p>
                </div>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-3 animate-in fade-in duration-150">
              <div className="w-11 h-11 rounded-2xl bg-surface-raised border border-border flex items-center justify-center text-blue-500 mx-auto">
                <Coins className="w-5 h-5" />
              </div>

              <div className="text-center space-y-1">
                <h4 className="text-sm font-bold text-foreground">
                  3. Cómo ganar monedas
                </h4>
                <p className="text-foreground-muted leading-relaxed">
                  La mecánica para hacer crecer tu saldo y subir en la clasificación:
                </p>
              </div>

              <div className="p-3.5 rounded-xl bg-surface-raised/70 border border-border space-y-2.5">
                <div className="flex items-start gap-2.5">
                  <div className="w-5 h-5 rounded-full bg-surface border border-border flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5">
                    1
                  </div>
                  <div>
                    <span className="font-semibold text-foreground block">Compra barato</span>
                    <span className="text-[11px] text-foreground-muted">Adquiere acciones cuando la cotización esté en niveles bajos o tras una corrección.</span>
                  </div>
                </div>

                <div className="flex items-start gap-2.5">
                  <div className="w-5 h-5 rounded-full bg-surface border border-border flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5">
                    2
                  </div>
                  <div>
                    <span className="font-semibold text-foreground block">Espera el empuje colectivo</span>
                    <span className="text-[11px] text-foreground-muted">A medida que otros alumnos compran, el valor de tus acciones aumenta en tiempo real.</span>
                  </div>
                </div>

                <div className="flex items-start gap-2.5">
                  <div className="w-5 h-5 rounded-full bg-surface border border-border flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5">
                    3
                  </div>
                  <div>
                    <span className="font-semibold text-foreground block">Vende y cobra</span>
                    <span className="text-[11px] text-foreground-muted">Retira tus participaciones para recibir las monedas netas directamente en tu bolsillo.</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-3 animate-in fade-in duration-150">
              <div className="w-11 h-11 rounded-2xl bg-surface-raised border border-border flex items-center justify-center text-emerald-500 mx-auto">
                <ShieldCheck className="w-5 h-5" />
              </div>

              <div className="text-center space-y-1">
                <h4 className="text-sm font-bold text-foreground">
                  4. Reglas de Mercado Justo
                </h4>
                <p className="text-foreground-muted leading-relaxed">
                  Dos protecciones esenciales para garantizar transparencia y evitar abusos:
                </p>
              </div>

              <div className="space-y-2">
                <div className="p-3 rounded-xl bg-surface-raised/70 border border-border flex items-start gap-2.5">
                  <Clock className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-semibold text-foreground block">Espera de 60 segundos (Cooldown)</span>
                    <span className="text-[11px] text-foreground-muted leading-normal block">
                      Entre cada operación de compra o venta hay 1 minuto de pausa para evitar que scripts automáticos hagan compras y ventas repetitivas.
                    </span>
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-surface-raised/70 border border-border flex items-start gap-2.5">
                  <Coins className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-semibold text-foreground block">Comisión del 2% al retirar</span>
                    <span className="text-[11px] text-foreground-muted leading-normal block">
                      Al vender acciones, se aplica una comisión del 2% que se suma íntegramente al fondo colectivo, recompensando a quienes mantienen su inversión.
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer y navegación */}
        <div className="pt-2 border-t border-border/60 flex flex-col sm:flex-row items-center justify-between gap-3">
          <label className="flex items-center gap-2 text-[11px] text-foreground-subtle cursor-pointer select-none">
            <input
              type="checkbox"
              checked={dontShowAgain}
              onChange={(e) => setDontShowAgain(e.target.checked)}
              className="rounded border-border text-foreground accent-foreground cursor-pointer"
            />
            <span>No volver a mostrar automáticamente</span>
          </label>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            {step > 0 && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handlePrev}
                className="text-xs h-8 gap-1"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
                <span>Anterior</span>
              </Button>
            )}

            <Button
              type="button"
              variant="primary"
              size="sm"
              onClick={handleNext}
              className="text-xs h-8 gap-1"
            >
              <span>{step === 3 ? '¡Entendido, empezar a invertir!' : 'Siguiente'}</span>
              {step < 3 && <ChevronRight className="w-3.5 h-3.5" />}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
