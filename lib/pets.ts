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
    description: 'Desorientado pero leal. Golpea latas vacías con su garrote en la plaza y de vez en cuando te encuentra pasta tirada por los pasillos.',
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
    id: 'baldi',
    name: 'Baldi a 144p',
    subtitle: 'Profesor de mates de bajo bitrate',
    price: 2_000_000_000, // 2B
    image: '/mascotas/baldi.png',
    description: 'Te juzga con su mirada pixelada mientras chasquea su regla. Si no apruebas redes o no calculas tus tragos, prepárate.',
    perkName: 'Reglazo Educativo',
    perkDescription: 'Dropea entre 500.000 y 1.200.000 monedas espontáneas mientras estudias en la web, y +10% de velocidad al calcular el bote del botellón.',
    category: 'drop',
    tierColor: 'border-green-500/50 text-green-400',
    tierBadge: 'Educación 144p · 2B',
  },
  {
    id: 'kirby',
    name: 'Kirby Fachero',
    subtitle: 'Aspiradora de fiesta oficial',
    price: 5_000_000_000, // 5B
    image: '/mascotas/kirby.jpg',
    description: 'Lleva gafas de sol oscuras porque el futuro del aula es cegador. Se traga la resaca entera sin pestañear y alarga la fiesta.',
    perkName: 'Aspiradora de Bote',
    perkDescription: '+35% de duración del modo "Fiesta Loca" en el Botellón y +12% de bonus permanente al recaudar el bote acumulado.',
    category: 'botellon',
    tierColor: 'border-pink-500/50 text-pink-400',
    tierBadge: 'Fiesta Mítica · 5B',
  },
  {
    id: 'link',
    name: 'Link del Alijo',
    subtitle: 'Héroe de Koholint & Guardián',
    price: 15_000_000_000, // 15B
    image: '/mascotas/link.png',
    description: 'Vino con espada y escudo hyliano directo a vigilar tu alijo. Si la policía municipal aparece, les hace un contraataque de manual.',
    perkName: 'Escudo Hyliano',
    perkDescription: 'Reduce un 60% las pérdidas en caso de inspección policial por alijo desprotegido y reduce a la mitad el coste de blindaje.',
    category: 'botellon',
    tierColor: 'border-sky-500/50 text-sky-400',
    tierBadge: 'Héroe Legendario · 15B',
  },
  {
    id: 'toy_chica',
    name: 'Toy Chica "Let\'s Party!"',
    subtitle: 'Reina animatrónica del After',
    price: 25_000_000_000, // 25B
    image: '/mascotas/toy_chica.png',
    description: 'El clásico trofeo animatrónico de 2º SMR. Su babero lo deja claro: LET\'S PARTY! Te acompaña con halo cosmético dorado en tus posts.',
    perkName: 'Aguinaldo VIP & Aura Dorada',
    perkDescription: 'Halo dorado animado exclusivo en tu perfil y posts. Cada 5-10 min suelta un aguinaldo sorpresa de 2M a 4M de monedas y +20% de producción.',
    category: 'exclusive',
    tierColor: 'border-amber-400 text-amber-300',
    tierBadge: 'Animatrónico VIP · 25B',
  },
  {
    id: 'peter_kirby',
    name: 'Peter Kirby de Quahog',
    subtitle: 'Esfera cómica interdimensional',
    price: 50_000_000_000, // 50B
    image: '/mascotas/peter_kirby.png',
    description: '"Oye Lois, soy una bola 3D de baja resolución en el portal de 2º SMR". Risitas graves y total inmunidad al ridículo.',
    perkName: 'Risa de Quahog & Soborno Fácil',
    perkDescription: 'Reduce a la mitad el coste de fianza para limpiar tu nivel de sospecha policial en el after y dropea entre 1.5M y 4.5M de monedas periódicas.',
    category: 'drop',
    tierColor: 'border-purple-400 text-purple-300',
    tierBadge: 'Meme de Quahog · 50B',
  },
  {
    id: 'austin',
    name: 'Austin Hawaiano',
    subtitle: 'Canguro fiestero de los mares',
    price: 80_000_000_000, // 80B
    image: '/mascotas/austin.png',
    description: '¡En nuestro patio todo es posible! Baila el ukelele con falda hawaiana mientras supervisa que las litronas no se queden calientes.',
    perkName: 'Danza Hawaiana',
    perkDescription: '+50% de duración al modo Fiesta Loca y duplica la producción offline de fichas si tienes el alijo custodiado.',
    category: 'botellon',
    tierColor: 'border-rose-400 text-rose-300',
    tierBadge: 'Backyardigan Épico · 80B',
  },
  {
    id: 'goku_bird',
    name: 'Goku Piolo / Saiyajin Avícola',
    subtitle: 'El guerrero alado del espacio',
    price: 150_000_000_000, // 150B
    image: '/mascotas/goku_bird.png',
    description: 'Entrenó en la cámara del tiempo con pico y plumas. Picotea el mercado bursátil con precisión quirúrgica y canta en los posts.',
    perkName: 'Ki Bursátil & Picotazo Divino',
    perkDescription: '+35% de ganancias en dividendos de la Bolsa del Botellón y reduce un 60% las tasas de corretaje al comprar acciones.',
    category: 'bolsa',
    tierColor: 'border-orange-500 text-orange-400',
    tierBadge: 'Saiyajin Alado · 150B',
  },
  {
    id: 'tung_tung',
    name: 'Tung Tung Tung Sahur',
    subtitle: 'El vigilante nocturno del bate',
    price: 300_000_000_000, // 300B
    image: '/mascotas/tung_tung.png',
    description: '¡TUNG TUNG TUNG SAHUR! Despierta a todo el servidor a base de batazos estruendosos. Ni la patrulla policial se atreve a mirarle a los ojos.',
    perkName: 'Batazo Antirredadas',
    perkDescription: 'Reduce un 50% cualquier pérdida de fichas en redadas desprotegidas y despierta periódicamente al aula con drops de 5M a 12M de monedas.',
    category: 'exclusive',
    tierColor: 'border-yellow-600 text-yellow-400',
    tierBadge: 'Ritual Nocturno · 300B',
  },
  {
    id: 'androide_18',
    name: 'Androide 18 Celestial',
    subtitle: 'Waifu Cibernética de Precio Ridículo',
    price: 1_000_000_000_000, // 1 TRILLÓN (1T)
    image: '/mascotas/androide_18.png',
    description: 'La waifu definitiva del multiverso cibernético. Su precio desafía las leyes económicas de España y Europa. Llevarla en tu perfil es declarar oficialmente que eres el dueño absoluto del servidor y de la clase entera.',
    perkName: 'Energía Ilimitada Número 18',
    perkDescription: 'Aura ciber-dorada cósmica con destellos celestiales en tu perfil, posts y barra superior. +50% permanente a toda la producción del botellón y transferencias espontáneas de 25M a 50M de monedas.',
    category: 'exclusive',
    tierColor: 'border-yellow-300 text-yellow-200 shadow-lg shadow-yellow-500/20',
    tierBadge: 'DIVINIDAD RIDÍCULA · 1 TRILLÓN 🪙',
  },
];

export function getPetById(id?: string | null): PetItem | undefined {
  if (!id) return undefined;
  return PETS_REGISTRY.find((p) => p.id === id);
}

export function formatCoinsAbbreviated(coins: number): string {
  if (coins >= 1_000_000_000_000) {
    const t = coins / 1_000_000_000_000;
    return `${t % 1 === 0 ? t : t.toFixed(1)}T`;
  }
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
