'use client';

import React from 'react';
import {
  BottleWine,
  GlassWater,
  Wine,
  CupSoda,
  Radio,
  Flame,
  Crown,
  Lock,
  Volume2,
  Sparkles,
  Zap,
  Activity,
  Layers,
  ArrowUpRight,
  Shield,
  CheckCircle2,
} from 'lucide-react';

export interface CharacterItem {
  id: string;
  tierId: string;
  name: string;
  role: string;
  badge: string;
  color: string;
  unlocked: boolean;
  level: number;
  quotes: string[];
  icon: React.ComponentType<{ className?: string }>;
}

interface PartyLiveSceneProps {
  levels: Record<string, number>;
  zoneName: string;
  onCharacterClick: (char: CharacterItem) => void;
  activeSpeech: {
    id: string;
    name: string;
    quote: string;
    tierName: string;
  } | null;
  onCloseSpeech: () => void;
}

export const PARTY_CHARACTERS_DATA: Omit<CharacterItem, 'unlocked' | 'level'>[] = [
  {
    id: 'toni_litronas',
    tierId: 'litronas',
    name: 'Toni',
    role: 'Colega de los bancos',
    badge: 'LITRONAS',
    color: '#10B981',
    icon: BottleWine,
    quotes: [
      'Pásame la litrona fría, que esto calienta más que la GPU del aula.',
      'Un par de tragos y apruebo Redes y Seguridad sin abrir el libro.',
      'Aquí sentado en el banco se piensa mejor que en cualquier oficina.',
      'Dos litronas más y montamos un clúster ad-hoc en la plaza.',
    ],
  },
  {
    id: 'santi_barman',
    tierId: 'hielos',
    name: 'Santi',
    role: 'Guardián del Hielo',
    badge: 'HIELOS',
    color: '#06B6D4',
    icon: GlassWater,
    quotes: [
      'Tengo cubitos para toda la noche, aquí no se calienta ni una copa.',
      'Vaso de 500ml de plástico, la auténtica ingeniería de aula.',
      '¿Alguien tiene mechero o le meto al tapón con los dientes?',
      'Calimocho en su proporción óptima: 50% vino y 50% refresco.',
    ],
  },
  {
    id: 'pareja_chupitos',
    tierId: 'chupitos',
    name: 'Chupiteros',
    role: 'Ronda de Tequila',
    badge: 'CHUPITOS',
    color: '#F59E0B',
    icon: Zap,
    quotes: [
      '¡Arriba, abajo, al centro y pal aprobado general de 2º SMR!',
      '¡Tequila con limón! El que tire la sal paga la siguiente fianza.',
      '¡Jäger helado directo al pecho, que la noche apenas empieza!',
      'Un chupito por cada módulo que aprobemos en la primera convocatoria.',
    ],
  },
  {
    id: 'mesa_mezclas',
    tierId: 'botellas',
    name: 'El Alijo',
    role: 'Mesa de Mezclas',
    badge: 'BOTELLAS',
    color: '#EC4899',
    icon: CupSoda,
    quotes: [
      'Nevera azul de camping al 100% de capacidad operativa.',
      'Esto sí que es balanceo de carga y alta disponibilidad de cubatas.',
      'Ron añejo con cola y hielo picado. Menú gourmet del botellón.',
      'Barra libre clandestina en proceso de abastecimiento masivo.',
    ],
  },
  {
    id: 'dj_isaac',
    tierId: 'altavoz',
    name: 'DJ Isaac',
    role: 'Sonido y Graves',
    badge: 'ALTAVOZ',
    color: '#8B5CF6',
    icon: Radio,
    quotes: [
      '¡Tirando graves a 140 BPM para los chavales de 2º SMR!',
      '¡Que suba el subidón que este botellón revienta la plaza entera!',
      'Esta sesión va dedicada al recreo de las once en punto.',
      'Reguetón clásico y electrónica sin cortes ni anuncios.',
    ],
  },
  {
    id: 'pandilla_fiesta',
    tierId: 'barra_libre',
    name: 'Pandilla',
    role: 'Pista y Desfase',
    badge: 'BARRA LIBRE',
    color: '#EAB308',
    icon: Flame,
    quotes: [
      '¡Hoy no se duerme, que mañana no tenemos guardia de taller!',
      '¡Barra libre hasta que salga el sol por encima del instituto!',
      '¡Estamos en el prime histórico de toda la clase!',
      '¡Coro en el centro de la plaza con los vasos bien arriba!',
    ],
  },
  {
    id: 'portero_vip',
    tierId: 'vip',
    name: 'Zona VIP',
    role: 'Portero & Champán',
    badge: 'RESERVADO',
    color: '#F43F5E',
    icon: Crown,
    quotes: [
      'Solo entran alumnos con credencial de administrador o fortuna legendaria.',
      'Bengalas de champán encendidas para los reyes del ranking.',
      'Zona reservada blindada con TLS 1.3 y cordón de terciopelo.',
      'Champán francés helado y copas de cristal para la élite de clase.',
    ],
  },
];

export const PartyLiveScene: React.FC<PartyLiveSceneProps> = ({
  levels,
  zoneName,
  onCharacterClick,
  activeSpeech,
  onCloseSpeech,
}) => {
  const characters: CharacterItem[] = PARTY_CHARACTERS_DATA.map((c) => {
    const lvl = levels[c.tierId] || 0;
    return {
      ...c,
      level: lvl,
      unlocked: lvl > 0,
    };
  });

  const unlockedCount = characters.filter((c) => c.unlocked).length;

  return (
    <section
      aria-label="Escena en directo del botellón"
      className="relative rounded-2xl bg-neutral-900/40 dark:bg-neutral-950/60 border border-neutral-300/80 dark:border-neutral-800/80 p-4 sm:p-5 shadow-xs space-y-4 select-none font-sans"
    >
      {/* Cabecera Técnica de la Escena (Estilo Command Deck) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-3 border-b border-neutral-200 dark:border-neutral-800/70">
        <div className="flex items-center gap-2.5">
          <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)] animate-pulse" />
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono font-bold tracking-tight text-neutral-900 dark:text-neutral-100 uppercase">
              PLAZA EN VIVO · {zoneName}
            </span>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-neutral-100 dark:bg-neutral-900 text-neutral-600 dark:text-neutral-400 border border-neutral-300 dark:border-neutral-800 font-semibold">
              {unlockedCount}/7 PRESENTES
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3 text-[11px] text-neutral-500 dark:text-neutral-400 font-mono">
          <span>Haz clic en un personaje para interactuar (+10 fichas)</span>
        </div>
      </div>

      {/* Diálogo emergente con estilo cómic editorial suizo */}
      {activeSpeech && (
        <div
          role="region"
          aria-live="polite"
          className="relative p-3.5 rounded-xl bg-white dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-700 shadow-md flex items-start justify-between gap-3 animate-in fade-in slide-in-from-top-1 duration-150"
        >
          <div className="flex items-start gap-3 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-neutral-100 dark:bg-neutral-800 text-neutral-900 dark:text-white flex items-center justify-center font-bold font-mono text-xs shrink-0 border border-neutral-200 dark:border-neutral-700">
              {activeSpeech.name.slice(0, 2).toUpperCase()}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 font-mono">
                <span className="text-xs font-bold text-neutral-900 dark:text-white">
                  @{activeSpeech.name}
                </span>
                <span className="text-[10px] text-neutral-500">[{activeSpeech.tierName}]</span>
                <span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400">
                  +10 fichas
                </span>
              </div>
              <p className="text-xs text-neutral-700 dark:text-neutral-300 mt-1 leading-relaxed">
                &ldquo;{activeSpeech.quote}&rdquo;
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onCloseSpeech}
            className="text-neutral-400 hover:text-neutral-900 dark:hover:text-white p-1 cursor-pointer transition-colors"
            title="Cerrar diálogo"
          >
            ✕
          </button>
        </div>
      )}

      {/* Cuadrícula de Estaciones de Personajes (Anti-AI Minimalist Stage) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-2">
        {characters.map((char) => {
          const Icon = char.icon;
          const isSpeaking = activeSpeech?.id === char.id;

          if (!char.unlocked) {
            return (
              <div
                key={char.id}
                className="group relative flex flex-col items-center justify-between p-3 rounded-xl bg-neutral-100/50 dark:bg-neutral-900/30 border border-dashed border-neutral-300/80 dark:border-neutral-800 text-center min-h-[120px] opacity-40 transition-opacity hover:opacity-60"
                title={`Mejora ${char.badge} para invitar a este personaje`}
              >
                <div className="w-full flex justify-end">
                  <Lock className="w-3 h-3 text-neutral-400 dark:text-neutral-600" />
                </div>

                <div className="w-9 h-9 rounded-lg bg-neutral-200/50 dark:bg-neutral-800/40 flex items-center justify-center text-neutral-400 dark:text-neutral-600">
                  <Icon className="w-4 h-4" />
                </div>

                <div className="w-full space-y-0.5">
                  <div className="text-[10px] font-mono font-medium text-neutral-400 dark:text-neutral-500 uppercase truncate">
                    {char.name}
                  </div>
                  <div className="text-[9px] font-mono text-neutral-400 dark:text-neutral-600">
                    Bloqueado
                  </div>
                </div>
              </div>
            );
          }

          return (
            <button
              key={char.id}
              type="button"
              onClick={() => onCharacterClick(char)}
              className={`group relative flex flex-col items-center justify-between p-3 rounded-xl border text-center min-h-[120px] transition-all cursor-pointer active:scale-95 touch-manipulation ${
                isSpeaking
                  ? 'bg-neutral-100 dark:bg-neutral-900 border-neutral-900 dark:border-white shadow-xs ring-1 ring-neutral-900 dark:ring-white'
                  : 'bg-white dark:bg-neutral-900/90 border-neutral-200 dark:border-neutral-800 hover:border-neutral-400 dark:hover:border-neutral-700 hover:bg-neutral-50 dark:hover:bg-neutral-800/60 shadow-2xs'
              }`}
            >
              {/* Nivel en formato Tabular Mono */}
              <div className="w-full flex items-center justify-between">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                <span className="text-[9px] font-mono font-bold text-neutral-500 dark:text-neutral-400 px-1 py-0.2 rounded bg-neutral-100 dark:bg-neutral-800">
                  NV.{char.level.toString().padStart(2, '0')}
                </span>
              </div>

              {/* Icono Vectorial con Círculo de Alto Contraste */}
              <div className="w-9 h-9 rounded-lg bg-neutral-100 dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 flex items-center justify-center group-hover:scale-105 transition-transform border border-neutral-200 dark:border-neutral-700/60">
                <Icon className="w-4 h-4" />
              </div>

              {/* Nombre y Especialidad */}
              <div className="w-full space-y-0.5">
                <div className="text-[11px] font-bold text-neutral-900 dark:text-neutral-100 truncate">
                  {char.name}
                </div>
                <div className="text-[9px] font-mono text-neutral-500 truncate leading-tight">
                  {char.role}
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </section>
  );
};
