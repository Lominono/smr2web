'use client';

import React, { useEffect } from 'react';
import {
  Trophy,
  ArrowRight,
  BookOpen,
  CheckCircle2,
  Sparkles,
  ShieldCheck,
  Flame,
  Award,
} from 'lucide-react';
import { sound } from '@/lib/audio';

interface LevelCompletedModalProps {
  isOpen: boolean;
  levelId: number;
  levelTitle: string;
  pointsAwarded: number;
  totalScore: number;
  flagCaptured: string;
  onContinue: () => void;
  onViewSolution: () => void;
}

const ISAAC_CONGRATS: Record<number, string> = {
  1: '¡Milagro! Has sabido leer un comentario en el HTML. No te creas Kevin Mitnick todavía, que el siguiente ya no es para bebés.',
  2: 'Bien hecho. Manipular el DOM lo hace hasta mi primo pequeño, pero al menos ya te ha quedado claro que el frontend nunca es de fiar.',
  3: 'Olé, has trasteado con la cookie. Ahora ya sabes por qué guardar roles en Base64 sin firma criptográfica es una chapuza sideral.',
  4: 'IDOR reventado. Cambiar un numerito en la URL y entrar hasta el despacho de dirección... el fallo clásico de los becarios.',
  5: '¡Inyección SQL completada! Has saltado la autenticación con una simple comilla. Sanitize your inputs, melón.',
  6: 'Fuerza bruta ejecutada con éxito. Poner contraseñas del diccionario debería estar penado en el código penal de SMR2.',
  7: '🏆 ¡HAS COMPLETADO EL LABORATORIO AL 100%! Has encadenado todas las técnicas como un auténtico profesional. Ya puedes vacilarle al profesor de redes.',
};

export const LevelCompletedModal: React.FC<LevelCompletedModalProps> = ({
  isOpen,
  levelId,
  levelTitle,
  pointsAwarded,
  totalScore,
  flagCaptured,
  onContinue,
  onViewSolution,
}) => {
  useEffect(() => {
    if (isOpen) {
      try {
        if (levelId >= 7) {
          sound.jackpot();
        } else {
          sound.coinWin();
        }
      } catch {}
    }
  }, [isOpen, levelId]);

  if (!isOpen) return null;

  const isFinalLevel = levelId >= 7;
  const isaacQuote = ISAAC_CONGRATS[levelId] || '¡Nivel superado! A ver cómo te las apañas en el siguiente.';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200 select-none">
      <div className="relative w-full max-w-lg rounded-2xl border border-emerald-500/40 bg-white dark:bg-neutral-900 shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
        
        {/* Cabecera visual con resplandor */}
        <div className="relative bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 p-6 text-white text-center overflow-hidden">
          {/* Círculos decorativos de fondo */}
          <div className="absolute -top-12 -right-12 w-36 h-36 rounded-full bg-white/10 blur-xl pointer-events-none" />
          <div className="absolute -bottom-8 -left-8 w-28 h-28 rounded-full bg-amber-400/20 blur-lg pointer-events-none" />

          <div className="relative z-10 flex flex-col items-center space-y-2">
            <div className="w-14 h-14 rounded-full bg-white/20 backdrop-blur-md border border-white/40 flex items-center justify-center shadow-inner">
              {isFinalLevel ? (
                <Award className="w-7 h-7 text-amber-300 animate-bounce" />
              ) : (
                <Trophy className="w-7 h-7 text-amber-300 animate-pulse" />
              )}
            </div>

            <span className="font-mono text-xs font-bold uppercase tracking-widest text-emerald-100 bg-white/15 px-3 py-0.5 rounded-full">
              {isFinalLevel ? '¡LABORATORIO COMPLETADO!' : `¡RETO #${levelId} SUPERADO!`}
            </span>

            <h2 className="text-xl sm:text-2xl font-extrabold tracking-tight text-white">
              {levelTitle}
            </h2>

            <div className="flex items-center gap-2 text-xs font-mono font-bold text-emerald-100">
              <span className="bg-emerald-800/60 px-2.5 py-0.5 rounded border border-emerald-400/30">
                +{pointsAwarded} PUNTOS
              </span>
              <span>·</span>
              <span>Marcador: {totalScore} pts</span>
            </div>
          </div>
        </div>

        {/* Contenido del modal */}
        <div className="p-5 sm:p-6 space-y-4 font-sans">
          
          {/* Flag capturada */}
          <div className="p-3 rounded-xl bg-neutral-100 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 space-y-1">
            <span className="text-[10px] uppercase font-mono font-bold text-neutral-400 dark:text-neutral-500 block">
              Bandera Capturada (Flag):
            </span>
            <div className="font-mono text-xs sm:text-sm font-bold text-emerald-600 dark:text-emerald-400 select-all break-all">
              {flagCaptured}
            </div>
          </div>

          {/* Veredicto cómico de PutoIsaac */}
          <div className="flex items-start gap-3 p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-neutral-800 dark:text-neutral-200">
            {/* Mini esfera de Isaac */}
            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-amber-600 to-orange-500 shrink-0 border border-amber-300/80 shadow flex items-center justify-center relative mt-0.5">
              <div className="w-1 h-1 rounded-full bg-neutral-950 absolute top-2 left-2" />
              <div className="w-1 h-1 rounded-full bg-neutral-950 absolute top-2 right-2" />
              <div className="w-2 h-0.5 rounded-full bg-neutral-950 absolute bottom-2" />
            </div>

            <div className="space-y-0.5 text-xs">
              <span className="font-mono font-bold text-amber-700 dark:text-amber-400 block text-[11px]">
                PUTOISAAC dice:
              </span>
              <p className="leading-relaxed italic">
                &quot;{isaacQuote}&quot;
              </p>
            </div>
          </div>

          {/* Botones de acción */}
          <div className="pt-2 flex flex-col sm:flex-row items-center gap-2.5">
            <button
              onClick={onContinue}
              type="button"
              className="w-full sm:flex-1 py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-mono text-xs font-bold flex items-center justify-center gap-2 shadow-md shadow-emerald-600/20 transition-all cursor-pointer active:scale-95"
            >
              <span>{isFinalLevel ? 'Ver balance final' : `Continuar al Nivel ${levelId + 1}`}</span>
              <ArrowRight className="w-4 h-4" />
            </button>

            <button
              onClick={onViewSolution}
              type="button"
              className="w-full sm:w-auto py-2.5 px-3.5 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 font-mono text-xs font-semibold hover:bg-neutral-200 dark:hover:bg-neutral-700 transition-colors cursor-pointer flex items-center justify-center gap-1.5"
            >
              <BookOpen className="w-3.5 h-3.5" />
              <span>Ver mitigación en código</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
