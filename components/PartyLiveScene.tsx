'use client';

import React, { useState } from 'react';
import {
  Wine,
  Sparkles,
  Volume2,
  Lock,
  Crown,
  Check,
  Flame,
  Award,
  Users,
  MessageCircle,
} from 'lucide-react';

export interface CharacterItem {
  id: string;
  tierId: string;
  name: string;
  role: string;
  avatarEmoji: string;
  badge: string;
  color: string;
  unlocked: boolean;
  level: number;
  quotes: string[];
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
    name: 'Toni "El Litronero"',
    role: 'Colega de los bancos',
    avatarEmoji: '🍻',
    badge: 'LITRONAS',
    color: '#10B981', // emerald
    quotes: [
      '¡Pasa la litrona fresca, que esto calienta más que la GPU de pruebas!',
      'Un par de tragos y apruebo Redes y Seguridad con la gorra.',
      'Aquí sentado en el banco con los chavales no se piensa en los exámenes.',
      'Dos litronas más y montamos un clúster ad-hoc en los bancos del parque.',
    ],
  },
  {
    id: 'santi_barman',
    tierId: 'hielos',
    name: 'Santi "El Barman"',
    role: 'Guardián del Hielo',
    avatarEmoji: '🧊',
    badge: 'HIELOS',
    color: '#06B6D4', // cyan
    quotes: [
      '¡Tengo hielo para toda la noche, aquí no se calienta ni un trago!',
      'Vaso de 500ml de plástico americano, la verdadera ingeniería del aula.',
      '¿Alguien tiene mechero o le meto al tapón con los dientes?',
      'Calimocho en su proporción óptima: 50% Don Simón, 50% refresco.',
    ],
  },
  {
    id: 'pareja_chupitos',
    tierId: 'chupitos',
    name: 'Los Chupiteros',
    role: 'Ronda de Disparos',
    avatarEmoji: '🎯',
    badge: 'CHUPITOS',
    color: '#F59E0B', // amber
    quotes: [
      '¡Arriba, abajo, al centro y pal aprobado general de 2º SMR!',
      '¡Tequila con limón! El que tire la sal paga la siguiente fianza.',
      '¡Jäger helado directo al pecho, vamos chavales que la noche empieza!',
      'Un chupito por cada módulo que saquemos sin ir a recuperación.',
    ],
  },
  {
    id: 'mesa_mezclas',
    tierId: 'botellas',
    name: 'El Rincón del Ron',
    role: 'Logística de Mezclas',
    avatarEmoji: '🍹',
    badge: 'BOTELLAS',
    color: '#EC4899', // pink
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
    name: 'DJ Aula 35',
    role: 'Sonido y Graves',
    avatarEmoji: '🎧',
    badge: 'ALTAVOZ',
    color: '#8B5CF6', // purple
    quotes: [
      '¡Tirando graves a 140 BPM para los chavales de 2º SMR!',
      '¡Que suba el subidón que este botellón revienta la plaza entera!',
      'Esta sesión va dedicada al recreo de las once en punto.',
      'Reguetón clásico y electrónica sin cortes ni anuncios de Spotify.',
    ],
  },
  {
    id: 'pandilla_fiesta',
    tierId: 'barra_libre',
    name: 'La Pandilla en la Pista',
    role: 'El Desfase Colectivo',
    avatarEmoji: '🎉',
    badge: 'BARRA LIBRE',
    color: '#EAB308', // yellow
    quotes: [
      '¡Hoy no se duerme, que mañana no tenemos guardia de taller!',
      '¡Barra libre hasta que salga el sol por encima del instituto!',
      '¡Estamos en el prime histórico de la clase!',
      '¡Coro en el centro de la pista con los vasos bien arriba!',
    ],
  },
  {
    id: 'portero_vip',
    tierId: 'vip',
    name: 'El Reservado VIP',
    role: 'Control y Bengalas',
    avatarEmoji: '👑',
    badge: 'RESERVADO VIP',
    color: '#F43F5E', // rose
    quotes: [
      'Solo entran alumnos con credencial de administrador o fortuna millonaria.',
      'Bengalas de champán encendidas para los reyes del ranking.',
      'Zona reservada blindada con TLS 1.3 y cordón de terciopelo.',
      'Champán francés helado y copas de cristal para la élite.',
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
    <div className="relative rounded-3xl bg-surface-raised border border-border/80 p-4 sm:p-5 shadow-sm space-y-4 overflow-hidden">
      {/* Fondo ambiental sutil con degradado */}
      <div className="absolute inset-0 bg-gradient-to-b from-accent/5 via-transparent to-transparent pointer-events-none" />

      {/* Cabecera de la Escena */}
      <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-border/50 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-accent/10 text-accent flex items-center justify-center font-bold text-xs border border-accent/20">
            <Users className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-foreground tracking-tight">
                La Plaza en Directo · {zoneName}
              </h3>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 font-semibold border border-emerald-500/20">
                {unlockedCount}/7 Personajes Activos
              </span>
            </div>
            <p className="text-[11px] text-foreground-muted">
              Conforme mejoras tus suministros, se unen nuevos personajes a tu fiesta. ¡Haz clic en ellos!
            </p>
          </div>
        </div>

        <div className="text-[11px] font-mono text-foreground-subtle text-left sm:text-right">
          Toca a un personaje para hablar con él (+10 fichas)
        </div>
      </div>

      {/* Burbuja de Diálogo Activa Emergente */}
      {activeSpeech && (
        <div className="relative z-20 p-3.5 rounded-2xl bg-surface border border-accent/40 shadow-lg flex items-start justify-between gap-3 animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="flex items-start gap-2.5 min-w-0">
            <div className="w-7 h-7 rounded-xl bg-accent/20 text-accent flex items-center justify-center shrink-0 mt-0.5">
              <MessageCircle className="w-3.5 h-3.5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-foreground">{activeSpeech.name}</span>
                <span className="text-[10px] font-mono text-foreground-muted font-normal">
                  ({activeSpeech.tierName})
                </span>
                <span className="text-[10px] font-mono text-emerald-400 font-semibold">+10 fichas</span>
              </div>
              <p className="text-xs text-foreground font-medium mt-0.5 italic">
                &ldquo;{activeSpeech.quote}&rdquo;
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onCloseSpeech}
            className="text-foreground-muted hover:text-foreground p-1 cursor-pointer transition-colors shrink-0"
            title="Cerrar diálogo"
          >
            ✕
          </button>
        </div>
      )}

      {/* Grid de Personajes de la Escena */}
      <div className="relative z-10 grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-2.5">
        {characters.map((char) => {
          const isSpeaking = activeSpeech?.id === char.id;

          if (!char.unlocked) {
            return (
              <div
                key={char.id}
                className="group relative flex flex-col items-center justify-center p-3 rounded-2xl bg-surface/40 border border-border/40 border-dashed text-center space-y-2 opacity-50 hover:opacity-75 transition-opacity"
                title={`Mejora ${char.badge} a Nivel 1 para desbloquear a este personaje`}
              >
                <div className="w-12 h-12 rounded-2xl bg-surface-raised border border-border/40 flex items-center justify-center text-xl grayscale filter">
                  <Lock className="w-4 h-4 text-foreground-subtle" />
                </div>
                <div className="space-y-0.5 w-full">
                  <div className="text-[11px] font-medium text-foreground-subtle truncate">
                    {char.badge}
                  </div>
                  <div className="text-[9px] font-mono text-foreground-subtle">Bloqueado</div>
                </div>
              </div>
            );
          }

          return (
            <button
              key={char.id}
              type="button"
              onClick={() => onCharacterClick(char)}
              className={`group relative flex flex-col items-center justify-center p-3 rounded-2xl bg-surface border transition-all cursor-pointer active:scale-95 text-center space-y-1.5 shadow-2xs hover:shadow-xs hover:border-accent/40 ${
                isSpeaking
                  ? 'border-accent bg-accent/5 ring-2 ring-accent/30'
                  : 'border-border/70 hover:bg-surface-raised'
              }`}
            >
              {/* Indicador de Nivel */}
              <span className="absolute top-1.5 right-1.5 text-[9px] font-mono px-1.5 py-0.2 rounded-full bg-surface-raised text-foreground font-semibold border border-border/60">
                Nv.{char.level}
              </span>

              {/* Avatar con Animación Suave */}
              <div
                className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl shadow-xs transition-transform group-hover:scale-110 group-active:scale-95 duration-200"
                style={{
                  backgroundColor: `${char.color}15`,
                  borderColor: `${char.color}40`,
                  borderWidth: '1px',
                }}
              >
                <span>{char.avatarEmoji}</span>
              </div>

              {/* Nombre y Rol */}
              <div className="space-y-0.5 w-full min-w-0">
                <div className="text-[11px] font-bold text-foreground truncate group-hover:text-accent transition-colors">
                  {char.name.split(' ')[0]}
                </div>
                <div className="text-[9px] font-mono text-foreground-muted truncate">
                  {char.role}
                </div>
              </div>

              {/* Punto de actividad online */}
              <div className="flex items-center gap-1 pt-0.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-[9px] font-mono text-emerald-400 font-medium">En vivo</span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};
