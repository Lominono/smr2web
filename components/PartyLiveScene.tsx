'use client';

import React, { useState } from 'react';
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
  ChevronDown,
  ChevronUp,
  X,
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
  zoneColor?: string;
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
  zoneColor,
  onCharacterClick,
  activeSpeech,
  onCloseSpeech,
}) => {
  const [isCollapsed, setIsCollapsed] = useState<boolean>(false);

  const characters: CharacterItem[] = PARTY_CHARACTERS_DATA.map((c) => {
    const lvl = levels[c.tierId] || 0;
    return {
      ...c,
      level: lvl,
      unlocked: lvl > 0,
    };
  });

  const unlockedCount = characters.filter((c) => c.unlocked).length;
  const activeChar = activeSpeech ? PARTY_CHARACTERS_DATA.find((c) => c.id === activeSpeech.id) : null;

  return (
    <section
      aria-label="Escena en directo del botellón"
      className="relative rounded-2xl bg-surface border border-border p-3.5 sm:p-4 shadow-xs space-y-3 select-none font-sans transition-colors"
    >
      {/* Cabecera Técnica de la Escena (Estilo Apple Compact Strip) */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <div
            className="w-2 h-2 rounded-full shrink-0 shadow-2xs transition-colors"
            style={{ backgroundColor: zoneColor || '#10B981' }}
          />
          <div className="flex items-center gap-2 truncate">
            <span className="text-xs font-semibold tracking-tight text-foreground uppercase font-mono truncate">
              {zoneName}
            </span>
            <span className="text-[10px] font-mono px-1.5 py-0.2 rounded-full bg-surface-raised text-foreground-muted border border-border/60/60 font-medium shrink-0">
              {unlockedCount}/7 en la plaza
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <span className="hidden sm:inline text-[11px] text-foreground-subtle">
            Toca un personaje (+10 fichas)
          </span>
          <button
            type="button"
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="flex items-center gap-1 text-[11px] font-medium text-foreground-muted hover:text-foreground transition-colors cursor-pointer px-2 py-0.5 rounded-lg hover:bg-surface-hover"
          >
            <span>{isCollapsed ? 'Mostrar' : 'Plegar'}</span>
            {isCollapsed ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronUp className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* Diálogo emergente con estilo tarjeta iOS */}
      {activeSpeech && (
        <div
          role="region"
          aria-live="polite"
          className="relative p-3 rounded-xl bg-surface-raised border border-border/60 shadow-xs flex items-start justify-between gap-3 animate-in fade-in slide-in-from-top-1 duration-150"
        >
          <div className="flex items-start gap-2.5 min-w-0">
            <div
              className="w-8 h-8 rounded-lg bg-surface-raised font-bold font-mono text-[11px] shrink-0 border border-border/60 shadow-2xs flex items-center justify-center transition-colors"
              style={{ color: activeChar?.color || '#0071e3' }}
            >
              {activeSpeech.name.slice(0, 2).toUpperCase()}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 font-mono">
                <span className="text-xs font-bold text-foreground">
                  @{activeSpeech.name}
                </span>
                <span
                  className="text-[10px] font-semibold"
                  style={{ color: activeChar?.color }}
                >
                  [{activeSpeech.tierName}]
                </span>
                <span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400">
                  +10 fichas
                </span>
              </div>
              <p className="text-xs text-foreground-muted mt-0.5 leading-relaxed">
                &ldquo;{activeSpeech.quote}&rdquo;
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onCloseSpeech}
            className="text-foreground-subtle hover:text-foreground p-1 rounded-md hover:bg-surface-hover cursor-pointer transition-colors"
            title="Cerrar diálogo"
            aria-label="Cerrar diálogo"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Cuadrícula compacta de personajes */}
      {!isCollapsed && (
        <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-1.5 pt-0.5">
          {characters.map((char) => {
            const Icon = char.icon;
            const isSpeaking = activeSpeech?.id === char.id;

            if (!char.unlocked) {
              return (
                <div
                  key={char.id}
                  className="group relative flex flex-col items-center justify-between p-2 rounded-xl bg-surface-raised/40 border border-dashed border-border text-center min-h-[76px] opacity-40 transition-opacity hover:opacity-60"
                  title={`Mejora ${char.badge} para invitar a este personaje`}
                >
                  <div className="w-full flex justify-end">
                    <Lock className="w-2.5 h-2.5 text-foreground-subtle" />
                  </div>

                  <div className="w-7 h-7 rounded-lg bg-surface-hover/60 flex items-center justify-center text-foreground-subtle">
                    <Icon className="w-3.5 h-3.5" />
                  </div>

                  <div className="w-full">
                    <div className="text-[10px] font-mono font-medium text-foreground-subtle uppercase truncate">
                      {char.name}
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
                style={isSpeaking ? { borderColor: char.color } : undefined}
                className={`group relative flex flex-col items-center justify-between p-2 rounded-xl border text-center min-h-[76px] transition-all cursor-pointer active:scale-[0.96] touch-manipulation ${
                  isSpeaking
                    ? 'bg-surface-raised shadow-xs ring-1 ring-border'
                    : 'bg-surface hover:bg-surface-hover border-border/60 hover:border-foreground/20'
                }`}
              >
                {/* Nivel en formato Tabular Mono */}
                <div className="w-full flex items-center justify-between">
                  <span
                    className="w-1.5 h-1.5 rounded-full shadow-2xs"
                    style={{ backgroundColor: char.color }}
                  />
                  <span className="text-[9px] font-mono font-semibold text-foreground-muted px-1 py-0.2 rounded bg-surface-raised border border-border/60">
                    nv.{char.level}
                  </span>
                </div>

                {/* Icono Vectorial */}
                <div
                  className="w-7 h-7 rounded-lg bg-surface-raised flex items-center justify-center group-hover:scale-105 transition-transform border border-border/60 shadow-2xs"
                  style={{ color: char.color }}
                >
                  <Icon className="w-3.5 h-3.5" />
                </div>

                {/* Nombre */}
                <div className="w-full">
                  <div className="text-[11px] font-semibold text-foreground truncate">
                    {char.name}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </section>
  );
};
