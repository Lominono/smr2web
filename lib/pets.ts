export interface PetItem {
  id: string;
  name: string;
  subtitle: string;
  price: number;
  image: string;
  description: string;
  perkName: string;
  perkDescription: string;
  category: 'drop' | 'bolsa' | 'botellon' | 'exclusive';
  tierColor: string;
  tierBadge: string;
}

export const PETS_REGISTRY: PetItem[] = [
  {
    id: 'spongegar',
    name: 'Spongegar Primitivo',
    subtitle: 'El ancestro del botellón',
    price: 50_000_000, // 50M
    image: '/mascotas/spongegar.png',
    description: 'Desorientado pero leal. Golpea latas de refresco vacías con su garrote en la plaza y de vez en cuando te encuentra pasta tirada por los pasillos.',
    perkName: 'Rebusca en la Basura',
    perkDescription: 'Probabilidad de encontrar entre 75.000 y 350.000 monedas mientras tienes la app abierta. Además, otorga +5% de fichas en cada trago manual.',
    category: 'drop',
    tierColor: 'border-amber-600/50 text-amber-500',
    tierBadge: 'Meme Ancestral · 50M',
  },
  {
    id: 'thinking_butt',
    name: 'Pensador Descarado',
    subtitle: 'Filósofo de las altas finanzas',
    price: 500_000_000, // 500M
    image: '/mascotas/thinking_butt.png',
    description: 'Reflexiona con sobriedad sobre las velas bursátiles y el despropósito de gastar medio billón en una foto con trasero.',
    perkName: 'Visión Bursátil & Rebaja',
    perkDescription: 'Reduce un 50% las comisiones de compra/venta en la Bolsa del Botellón (Botellón Investments) y amplifica las ganancias por dividendo.',
    category: 'bolsa',
    tierColor: 'border-emerald-500/50 text-emerald-400',
    tierBadge: 'Inversor Épico · 500M',
  },
  {
    id: 'kirby',
    name: 'Kirby Fachero',
    subtitle: 'Aspiradora de fiesta oficial',
    price: 2_500_000_000, // 2.5B
    image: '/mascotas/kirby.jpg',
    description: 'Lleva gafas de sol oscuras porque el futuro del aula es cegador. Se traga la resaca entera sin pestañear y alarga la fiesta.',
    perkName: 'Aspiradora de Bote',
    perkDescription: '+35% de duración del modo "Fiesta Loca" en el Botellón y +12% de bonus permanente al recaudar el bote acumulado.',
    category: 'botellon',
    tierColor: 'border-pink-500/50 text-pink-400',
    tierBadge: 'Fiesta Mítica · 2.5B',
  },
  {
    id: 'link',
    name: 'Link del Alijo',
    subtitle: 'Héroe de Koholint & Guardián',
    price: 10_000_000_000, // 10B
    image: '/mascotas/link.png',
    description: 'Vino con espada y escudo hyliano directo a vigilar tu alijo. Si la policía municipal aparece, les hace un contraataque de manual.',
    perkName: 'Escudo Hyliano',
    perkDescription: 'Reduce un 60% las pérdidas en caso de inspección policial por alijo desprotegido y reduce a la mitad el coste de blindaje.',
    category: 'botellon',
    tierColor: 'border-sky-500/50 text-sky-400',
    tierBadge: 'Héroe Legendario · 10B',
  },
  {
    id: 'toy_chica',
    name: 'Toy Chica "Let\'s Party!"',
    subtitle: 'Reina animatrónica del After',
    price: 25_000_000_000, // 25B
    image: '/mascotas/toy_chica.png',
    description: 'El trofeo definitivo de 2º SMR. Su babero lo deja claro: LET\'S PARTY! Te acompaña con halo cosmético dorado en tus posts y aguinaldos sorpresa.',
    perkName: 'Aguinaldo VIP & Aura Dorada',
    perkDescription: 'Halo dorado animado exclusivo en tu perfil y posts. Cada 10-15 min suelta un aguinaldo sorpresa de 2M a 6M de monedas y +20% a la producción del botellón.',
    category: 'exclusive',
    tierColor: 'border-amber-400 text-amber-300',
    tierBadge: 'Supremo Exclusivo · 25B',
  },
];

export function getPetById(id?: string | null): PetItem | undefined {
  if (!id) return undefined;
  return PETS_REGISTRY.find((p) => p.id === id);
}

export function formatCoinsAbbreviated(coins: number): string {
  if (coins >= 1_000_000_000) {
    const b = coins / 1_000_000_000;
    return `${b % 1 === 0 ? b : b.toFixed(1)}B`;
  }
  if (coins >= 1_000_000) {
    const m = coins / 1_000_000;
    return `${m % 1 === 0 ? m : m.toFixed(1)}M`;
  }
  if (coins >= 1_000) {
    const k = coins / 1_000;
    return `${k % 1 === 0 ? k : k.toFixed(1)}k`;
  }
  return coins.toLocaleString('es-ES');
}
