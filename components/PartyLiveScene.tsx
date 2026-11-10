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
      className="relative rounded-3xl bg-white dark:bg-[#1c1c1e] border border-black/[0.06] dark:border-white/[0.08] p-4 sm:p-5 shadow-[0_2px_8px_rgba(0,0,0,0.04)] dark:shadow-[0_2px_8px_rgba(0,0,0,0.25)] space-y-4 select-none font-sans transition-colors"
    >
      {/* Cabecera Técnica de la Escena (Apple Minimalist Studio) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-3 border-b border-black/[0.06] dark:border-white/[0.08]">
        <div className="flex items-center gap-2.5">
          <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.4)]" />
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold tracking-tight text-zinc-900 dark:text-zinc-100 uppercase font-mono">
              PLAZA EN VIVO · {zoneName}
            </span>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 border border-black/[0.05] dark:border-white/[0.06] font-medium">
              {unlockedCount}/7 PRESENTES
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs text-zinc-500 dark:text-zinc-400">
          <span>Toca un personaje para interactuar (+10 fichas)</span>
        </div>
      </div>

      {/* Diálogo emergente con estilo tarjeta iOS */}
      {activeSpeech && (
        <div
          role="region"
          aria-live="polite"
          className="relative p-3.5 rounded-2xl bg-zinc-50 dark:bg-zinc-800/90 border border-black/[0.06] dark:border-white/[0.08] shadow-sm flex items-start justify-between gap-3 animate-in fade-in slide-in-from-top-1 duration-150"
        >
          <div className="flex items-start gap-3 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-white dark:bg-zinc-700 text-zinc-900 dark:text-white flex items-center justify-center font-bold font-mono text-xs shrink-0 border border-black/[0.06] dark:border-white/[0.1] shadow-2xs">
              {activeSpeech.name.slice(0, 2).toUpperCase()}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 font-mono">
                <span className="text-xs font-bold text-zinc-900 dark:text-white">
                  @{activeSpeech.name}
                </span>
                <span className="text-[10px] text-zinc-500 dark:text-zinc-400">[{activeSpeech.tierName}]</span>
                <span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400">
                  +10 fichas
                </span>
              </div>
              <p className="text-xs text-zinc-700 dark:text-zinc-300 mt-1 leading-relaxed">
                &ldquo;{activeSpeech.quote}&rdquo;
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onCloseSpeech}
            className="text-zinc-400 hover:text-zinc-900 dark:hover:text-white p-1 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 cursor-pointer transition-colors"
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
                className="group relative flex flex-col items-center justify-between p-3 rounded-2xl bg-zinc-100/50 dark:bg-zinc-900/30 border border-dashed border-zinc-200 dark:border-zinc-800 text-center min-h-[116px] opacity-40 transition-opacity hover:opacity-60"
                title={`Mejora ${char.badge} para invitar a este personaje`}
              >
                <div className="w-full flex justify-end">
                  <Lock className="w-3 h-3 text-zinc-400 dark:text-zinc-600" />
                </div>

                <div className="w-9 h-9 rounded-xl bg-zinc-200/50 dark:bg-zinc-800/40 flex items-center justify-center text-zinc-400 dark:text-zinc-600">
                  <Icon className="w-4 h-4" />
                </div>

                <div className="w-full space-y-0.5">
                  <div className="text-[10px] font-mono font-medium text-zinc-400 dark:text-zinc-500 uppercase truncate">
                    {char.name}
                  </div>
                  <div className="text-[9px] font-mono text-zinc-400 dark:text-zinc-600">
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
              className={`group relative flex flex-col items-center justify-between p-3 rounded-2xl border text-center min-h-[116px] transition-all cursor-pointer active:scale-[0.96] touch-manipulation ${
                isSpeaking
                  ? 'bg-blue-50/50 dark:bg-blue-950/20 border-[#0071e3] shadow-xs ring-1 ring-[#0071e3]'
                  : 'bg-zinc-50/80 dark:bg-zinc-800/50 border-black/[0.05] dark:border-white/[0.08] hover:border-black/20 dark:hover:border-white/20 hover:bg-zinc-100/80 dark:hover:bg-zinc-800 shadow-2xs'
              }`}
            >
              {/* Nivel en formato Tabular Mono */}
              <div className="w-full flex items-center justify-between">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                <span className="text-[9px] font-mono font-semibold text-zinc-600 dark:text-zinc-300 px-1.5 py-0.5 rounded-full bg-white dark:bg-zinc-700/80 border border-black/[0.04] dark:border-white/[0.08]">
                  NV.{char.level.toString().padStart(2, '0')}
                </span>
              </div>

              {/* Icono Vectorial con Círculo de Alto Contraste */}
              <div className="w-9 h-9 rounded-xl bg-white dark:bg-zinc-700/70 text-zinc-900 dark:text-zinc-100 flex items-center justify-center group-hover:scale-105 transition-transform border border-black/[0.04] dark:border-white/[0.08] shadow-2xs">
                <Icon className="w-4 h-4" />
              </div>

              {/* Nombre y Especialidad */}
              <div className="w-full space-y-0.5">
                <div className="text-[11px] font-semibold text-zinc-900 dark:text-zinc-100 truncate">
                  {char.name}
                </div>
                <div className="text-[9px] font-mono text-zinc-500 dark:text-zinc-400 truncate leading-tight">
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
