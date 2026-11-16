'use client';

import React, { useRef, useState, useMemo } from 'react';
import Image from 'next/image';
import {
  ChevronLeft,
  Coins,
  Crown,
  Sparkles,
  Image as ImageIcon,
  Check,
  CheckCircle2,
  AlertCircle,
  Wine,
  ArrowRight,
  Lock,
  Sliders,
  X,
  Award,
  Filter,
} from 'lucide-react';
import { UserProfile } from '@/lib/types';
import { sound } from '@/lib/audio';
import confetti from 'canvas-confetti';
import { PETS_REGISTRY, PetItem, formatCoinsAbbreviated } from '@/lib/pets';

export const BANNER_PRICE = 13_000_000;

export interface BannerPreset {
  id: string;
  name: string;
  desc: string;
  gradient: string;
  border: string;
  badge: string;
  textColor: string;
  badgeBg: string;
  glow: string;
}

export const BANNER_PRESETS: BannerPreset[] = [
  {
    id: 'gold_luxury',
    name: 'Obsidian & Oro',
    desc: 'Negro obsidiana con destellos dorados y heráldica nobiliaria.',
    gradient: 'bg-gradient-to-r from-neutral-900 via-amber-950/70 to-neutral-900',
    border: 'border-amber-500/40',
    badge: 'OBSIDIAN GOLD',
    textColor: 'text-amber-200',
    badgeBg: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
    glow: 'shadow-xs',
  },
  {
    id: 'cyberpunk_neon',
    name: 'Linear Cyber',
    desc: 'Grafito industrial con acentos cian e índigo de alta precisión.',
    gradient: 'bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900',
    border: 'border-cyan-500/40',
    badge: 'LINEAR CYBER',
    textColor: 'text-cyan-200',
    badgeBg: 'bg-cyan-500/15 text-cyan-300 border-cyan-500/30',
    glow: 'shadow-xs',
  },
  {
    id: 'matrix_terminal',
    name: 'Terminal Root',
    desc: 'Consola monocromática con tipografía de sistema y verde esmeralda.',
    gradient: 'bg-gradient-to-r from-neutral-950 via-emerald-950/60 to-neutral-950',
    border: 'border-emerald-500/40',
    badge: 'ROOT SYSTEM',
    textColor: 'text-emerald-300',
    badgeBg: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
    glow: 'shadow-xs',
  },
  {
    id: 'sunset_synth',
    name: 'Terracotta Sunset',
    desc: 'Degradado cálido crepuscular con toques de cobre y bermellón.',
    gradient: 'bg-gradient-to-r from-stone-900 via-rose-950/70 to-stone-900',
    border: 'border-rose-500/40',
    badge: 'TERRACOTTA',
    textColor: 'text-rose-200',
    badgeBg: 'bg-rose-500/15 text-rose-300 border-rose-500/30',
    glow: 'shadow-xs',
  },
  {
    id: 'amethyst_galaxy',
    name: 'Cosmic Iris',
    desc: 'Violeta profundo y noche estelar de contraste equilibrado.',
    gradient: 'bg-gradient-to-r from-zinc-950 via-purple-950/60 to-zinc-950',
    border: 'border-purple-500/40',
    badge: 'COSMIC IRIS',
    textColor: 'text-purple-200',
    badgeBg: 'bg-purple-500/15 text-purple-300 border-purple-500/30',
    glow: 'shadow-xs',
  },
  {
    id: 'custom_image',
    name: 'Imagen Externa (URL)',
    desc: 'Fondo personalizado mediante enlace HTTPS directo (PNG, JPG, WebP).',
    gradient: 'bg-surface-raised',
    border: 'border-border',
    badge: 'CUSTOM IMAGE',
    textColor: 'text-foreground',
    badgeBg: 'bg-black/60 text-white border-white/20',
    glow: 'shadow-xs',
  },
];

interface BannerPreviewCardProps {
  preset: BannerPreset;
  selectedStyle: string;
  imageUrl: string;
  title: string;
  quote: string;
  username?: string;
}

const BannerPreviewCard: React.FC<BannerPreviewCardProps> = ({
  preset,
  selectedStyle,
  imageUrl,
  title,
  quote,
  username,
}) => {
  const isCustomImage = selectedStyle === 'custom_image' && imageUrl.trim();

  return (
    <div
      className={`relative w-full overflow-hidden rounded-2xl border transition-all ${preset.border} ${preset.glow}`}
      style={
        isCustomImage
          ? {
              backgroundImage: `url(${imageUrl})`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
            }
          : undefined
      }
    >
      {!isCustomImage && (
        <div className={`absolute inset-0 ${preset.gradient}`} />
      )}
      <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/45 to-black/20 backdrop-blur-[0.5px]" />

      <div className="relative z-10 flex flex-col justify-between p-5 sm:p-7 min-h-[170px] sm:min-h-[190px]">
        <div className="flex items-center justify-between gap-3">
          <span
            className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 font-mono text-[10px] font-semibold tracking-wider uppercase backdrop-blur-md ${preset.badgeBg}`}
          >
            <Crown className="w-3 h-3" />
            {preset.badge}
          </span>
          <span className="font-mono text-[10px] uppercase tracking-widest text-white/50">
            Vista Previa
          </span>
        </div>

        <div className="space-y-1.5 mt-auto">
          <div className="flex items-baseline gap-2">
            <span className="font-mono text-xs text-white/70">
              @{username || 'usuario'}
            </span>
            <span className="text-[11px] text-white/40">·</span>
            <h3 className={`text-base sm:text-lg font-bold tracking-tight ${preset.textColor}`}>
              {title || 'Magnate del Botellón'}
            </h3>
          </div>
          {quote ? (
            <p className="line-clamp-2 text-xs italic text-white/80 max-w-2xl leading-relaxed">
              &ldquo;{quote}&rdquo;
            </p>
          ) : (
            <p className="text-xs text-white/40 italic">
              Sin frase célebre configurada.
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

const ShopNotice: React.FC<{
  tone: 'danger' | 'success';
  message: string;
  onDismiss: () => void;
}> = ({ tone, message, onDismiss }) => (
  <div
    role="status"
    className={`flex items-center justify-between gap-3 rounded-xl border px-3.5 py-2.5 text-xs transition-all animate-in fade-in ${
      tone === 'danger'
        ? 'border-danger/30 bg-danger-subtle text-danger'
        : 'border-success/30 bg-success-subtle text-success'
    }`}
  >
    <span className="flex items-center gap-2">
      {tone === 'success' ? (
        <CheckCircle2 className="h-4 w-4 shrink-0" />
      ) : (
        <AlertCircle className="h-4 w-4 shrink-0" />
      )}
      <span className="font-medium">{message}</span>
    </span>
    <button
      type="button"
      onClick={onDismiss}
      className="cursor-pointer opacity-70 transition-opacity hover:opacity-100"
      aria-label="Cerrar aviso"
    >
      <X className="h-3.5 w-3.5" />
    </button>
  </div>
);

type PetCategoryFilter = 'all' | 'exclusive' | 'botellon' | 'bolsa' | 'drop';

const CATEGORY_NAMES: Record<PetCategoryFilter, string> = {
  all: 'Todas',
  exclusive: 'Exclusivas',
  botellon: 'Botellón',
  bolsa: 'Bolsa',
  drop: 'Drops',
};

interface VipShopViewProps {
  currentUser: UserProfile | null;
  onOpenAuth: () => void;
  onUpdateUser: (updated: UserProfile) => void;
  onNavigateToPartyIdle: () => void;
  onBackToFeed: () => void;
  onUpdateCoins?: (delta: number) => void;
}

export const VipShopView: React.FC<VipShopViewProps> = ({
  currentUser,
  onOpenAuth,
  onUpdateUser,
  onNavigateToPartyIdle,
  onBackToFeed,
  onUpdateCoins,
}) => {
  const userCoins = currentUser ? Number(currentUser.coins || 0) : 0;
  const itemsComprados = Array.isArray(currentUser?.items_comprados)
    ? currentUser!.items_comprados!
    : [];

  const [shopTab, setShopTab] = useState<'mascotas' | 'banners'>('mascotas');
  const [categoryFilter, setCategoryFilter] = useState<PetCategoryFilter>('all');
  const [selectedPetId, setSelectedPetId] = useState<string>(PETS_REGISTRY[0].id);
  const [isPetProcessing, setIsPetProcessing] = useState(false);
  const [petSuccessMessage, setPetSuccessMessage] = useState<string | null>(null);
  const [confirmPetId, setConfirmPetId] = useState<string | null>(null);
  const [confirmBanner, setConfirmBanner] = useState(false);
  const detailRef = useRef<HTMLDivElement | null>(null);

  const unlockedPets = Array.isArray(currentUser?.mascotas_desbloqueadas)
    ? currentUser!.mascotas_desbloqueadas!
    : [];
  const equippedPetId = currentUser?.mascota_equipada;

  const filteredPets = useMemo(() => {
    if (categoryFilter === 'all') return PETS_REGISTRY;
    return PETS_REGISTRY.filter((p) => p.category === categoryFilter);
  }, [categoryFilter]);

  const selectedPet = PETS_REGISTRY.find((p) => p.id === selectedPetId) || PETS_REGISTRY[0];
  const isSelectedPetOwned = unlockedPets.includes(selectedPet.id);
  const isSelectedPetEquipped = equippedPetId === selectedPet.id;
  const canAffordSelectedPet = userCoins >= selectedPet.price;

  const isOwner =
    itemsComprados.includes('banner_vip_13m') ||
    Boolean(currentUser?.banner_estilo && currentUser.banner_estilo !== 'cuadricula') ||
    currentUser?.role === 'admin';

  const [selectedStyle, setSelectedStyle] = useState<string>(() => {
    const style = currentUser?.banner_estilo;
    if (!style) return 'gold_luxury';
    return style.startsWith('http') ? 'custom_image' : style;
  });
  const [customTitle, setCustomTitle] = useState<string>(
    currentUser?.titulo_personalizado || 'Magnate del Botellón'
  );
  const [customQuote, setCustomQuote] = useState<string>(
    currentUser?.frase || 'Construyendo el aula más rápida del instituto.'
  );
  const [customImageUrl, setCustomImageUrl] = useState<string>(
    currentUser?.banner_estilo?.startsWith('http') ? currentUser.banner_estilo : ''
  );

  const [isBuying, setIsBuying] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const canAfford = userCoins >= BANNER_PRICE;
  const progressPercent = Math.min(100, Math.max(0, (userCoins / BANNER_PRICE) * 100));

  const currentPreset =
    BANNER_PRESETS.find((p) => p.id === selectedStyle) || BANNER_PRESETS[0];

  const handleBuyPet = async (pet: PetItem) => {
    if (!currentUser) {
      sound.tap();
      onOpenAuth();
      return;
    }

    if (pet.notForSale) {
      sound.tap();
      setErrorMessage(`${pet.name} es una mascota exclusiva que no está disponible para compra directa.`);
      return;
    }

    if (userCoins < pet.price) {
      sound.broke();
      setErrorMessage(`Te faltan ${(pet.price - userCoins).toLocaleString('es-ES')} monedas para adoptar a ${pet.name}.`);
      return;
    }

    setConfirmPetId(null);
    setIsPetProcessing(true);
    setErrorMessage(null);
    setPetSuccessMessage(null);
    sound.tap();

    try {
      const res = await fetch('/api/pets/purchase', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ petId: pet.id }),
      });
      const data = await res.json().catch(() => null);

      if (!res.ok || !data?.success) {
        setErrorMessage(data?.error || 'No se pudo completar la compra. Inténtalo de nuevo.');
        sound.broke();
        return;
      }

      const updatedProfile: UserProfile = {
        ...currentUser,
        coins: Number(data.coins ?? userCoins - pet.price),
        mascota_equipada: pet.id,
        mascotas_desbloqueadas: Array.isArray(data.mascotasDesbloqueadas)
          ? data.mascotasDesbloqueadas
          : Array.from(new Set([...unlockedPets, pet.id])),
        items_comprados: Array.from(new Set([...itemsComprados, `pet_${pet.id}`])),
      };

      onUpdateUser(updatedProfile);
      sound.coinWin();

      try {
        confetti({
          particleCount: 120,
          spread: 80,
          origin: { y: 0.6 },
          colors: ['#f59e0b', '#10b981', '#3b82f6', '#ec4899'],
        });
      } catch (_) {}

      setPetSuccessMessage(data.message || `¡Has adoptado a ${pet.name} con éxito!`);
    } catch (err: any) {
      console.error('Error al comprar mascota:', err);
      setErrorMessage(err?.message || 'Error al procesar la compra.');
    } finally {
      setIsPetProcessing(false);
    }
  };

  const handleToggleEquipPet = async (petId: string) => {
    if (!currentUser) return;

    setIsPetProcessing(true);
    setErrorMessage(null);
    setPetSuccessMessage(null);
    sound.tap();

    try {
      const nextEquipped = equippedPetId === petId ? null : petId;

      const res = await fetch('/api/pets/equip', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ petId: nextEquipped }),
      });
      const data = await res.json().catch(() => null);

      if (!res.ok || !data?.success) {
        setErrorMessage(data?.error || 'No se pudo cambiar tu mascota equipada.');
        return;
      }

      const updatedProfile: UserProfile = {
        ...currentUser,
        mascota_equipada: nextEquipped ?? undefined,
      };

      onUpdateUser(updatedProfile);
      setPetSuccessMessage(nextEquipped ? `Has equipado a ${selectedPet.name}.` : 'Has desequipado a tu mascota.');
    } catch (err: any) {
      console.error('Error al cambiar de mascota:', err);
      setErrorMessage(err?.message || 'Error al equipar mascota.');
    } finally {
      setIsPetProcessing(false);
    }
  };

  const handleBuyBanner = async () => {
    if (!currentUser) {
      sound.tap();
      onOpenAuth();
      return;
    }

    if (!canAfford) {
      sound.broke();
      setErrorMessage(
        `Faltan ${(BANNER_PRICE - userCoins).toLocaleString('es-ES')} monedas para adquirir este artículo.`
      );
      return;
    }

    setConfirmBanner(false);
    setIsBuying(true);
    setErrorMessage(null);
    sound.tap();

    try {
      const defaultStyle = 'gold_luxury';
      const defaultTitle = customTitle.trim() || 'Magnate del Botellón';
      const defaultQuote = customQuote.trim() || 'Construyendo el aula más rápida del instituto.';

      const res = await fetch('/api/shop/banner', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'buy',
          bannerStyle: defaultStyle,
          customTitle: defaultTitle,
          customQuote: defaultQuote,
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json?.success) {
        throw new Error(json?.error || 'No se pudo completar la compra del Banner VIP.');
      }

      const updatedProfile: UserProfile = {
        ...currentUser,
        coins: typeof json.coins === 'number' ? json.coins : Math.max(0, userCoins - BANNER_PRICE),
        items_comprados: Array.isArray(json.items_comprados)
          ? json.items_comprados
          : Array.from(new Set([...itemsComprados, 'banner_vip_13m'])),
        banner_estilo: json.banner_estilo || defaultStyle,
        titulo_personalizado: json.titulo_personalizado || defaultTitle,
        frase: json.frase ?? defaultQuote,
      };

      onUpdateUser(updatedProfile);
      sound.coinWin();

      try {
        confetti({
          particleCount: 100,
          spread: 70,
          origin: { y: 0.6 },
          colors: ['#0071e3', '#f59e0b', '#10b981'],
        });
      } catch (_) {}
    } catch (err: any) {
      console.error('Error al comprar banner:', err);
      setErrorMessage(err?.message || 'Error al procesar la transacción.');
    } finally {
      setIsBuying(false);
    }
  };

  const handleSaveCustomization = async () => {
    if (!currentUser) return;
    setIsSaving(true);
    setSaveSuccess(false);
    setErrorMessage(null);
    sound.tap();

    try {
      const finalStyle =
        selectedStyle === 'custom_image' && customImageUrl.trim()
          ? customImageUrl.trim()
          : selectedStyle;

      const finalTitle = customTitle.trim() || 'Magnate del Botellón';
      const finalQuote = customQuote.trim();

      const res = await fetch('/api/shop/banner', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'customize',
          bannerStyle: finalStyle,
          customTitle: finalTitle,
          customQuote: finalQuote,
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json?.success) {
        throw new Error(json?.error || 'Error al guardar la configuración.');
      }

      const updatedProfile: UserProfile = {
        ...currentUser,
        banner_estilo: json.banner_estilo || finalStyle,
        titulo_personalizado: json.titulo_personalizado || finalTitle,
        frase: json.frase ?? finalQuote,
      };

      onUpdateUser(updatedProfile);
      sound.coinWin();
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err: any) {
      console.error('Error guardando personalización:', err);
      setErrorMessage(err?.message || 'Error al guardar la configuración.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="w-full max-w-6xl mx-auto pb-20 font-sans select-none text-foreground">
      <div className="flex flex-col gap-6">
        {/* Barra superior con navegación y saldo */}
        <div className="flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => {
              sound.tap();
              onBackToFeed();
            }}
            className="inline-flex items-center gap-1.5 rounded-full border border-border/80 bg-surface px-3 py-1.5 text-xs font-medium text-foreground-muted transition-all hover:bg-surface-raised hover:text-foreground cursor-pointer active:scale-95"
          >
            <ChevronLeft className="w-4 h-4" />
            <span>Volver al Feed</span>
          </button>

          <div className="inline-flex items-center gap-2 rounded-full border border-amber-500/25 bg-amber-500/10 px-4 py-1.5 font-mono text-xs shadow-xs">
            <Coins className="w-3.5 h-3.5 text-amber-500" />
            <span className="font-semibold tabular-nums text-foreground">
              {userCoins.toLocaleString('es-ES')}
            </span>
            <span className="text-foreground-subtle hidden sm:inline">monedas</span>
          </div>
        </div>

        {/* Cabecera elegante y minimalista */}
        <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between border-b border-border/60 pb-6">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-wider text-foreground-subtle">
              <span>Aula 35</span>
              <span>·</span>
              <span>2º SMR</span>
              <span>·</span>
              <span className="text-accent font-semibold">Exclusivos & Mascotas</span>
            </div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
              Tienda
            </h1>
            <p className="max-w-xl text-sm leading-relaxed text-foreground-muted">
              Compañeros coleccionables con pasivas de juego y personalización permanente de tu credencial digital.
            </p>
          </div>

          <button
            type="button"
            onClick={() => {
              sound.tap();
              onNavigateToPartyIdle();
            }}
            className="group inline-flex items-center gap-2 self-start rounded-full border border-border/80 bg-surface px-4 py-2 text-xs font-medium text-foreground-muted transition-all hover:border-accent/40 hover:bg-surface-raised hover:text-foreground cursor-pointer sm:self-auto shadow-xs active:scale-95"
          >
            <Wine className="w-4 h-4 text-accent" />
            <span>El Botellón</span>
            <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" />
          </button>
        </header>

        {/* Pestañas principales */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div
            className="inline-flex self-start rounded-2xl border border-border bg-surface-raised p-1 shadow-xs"
            role="tablist"
            aria-label="Secciones de la tienda"
          >
            <button
              type="button"
              role="tab"
              aria-selected={shopTab === 'mascotas'}
              onClick={() => {
                sound.tap();
                setShopTab('mascotas');
                setConfirmBanner(false);
                setErrorMessage(null);
                setPetSuccessMessage(null);
              }}
              className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-medium transition-all cursor-pointer ${
                shopTab === 'mascotas'
                  ? 'bg-surface text-foreground shadow-sm font-semibold'
                  : 'text-foreground-muted hover:text-foreground'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              <span>Mascotas</span>
              <span className="rounded-full bg-surface-raised px-2 py-0.5 font-mono text-[10px] text-foreground-subtle border border-border/50">
                {PETS_REGISTRY.length}
              </span>
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={shopTab === 'banners'}
              onClick={() => {
                sound.tap();
                setShopTab('banners');
                setConfirmPetId(null);
                setErrorMessage(null);
                setPetSuccessMessage(null);
              }}
              className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-medium transition-all cursor-pointer ${
                shopTab === 'banners'
                  ? 'bg-surface text-foreground shadow-sm font-semibold'
                  : 'text-foreground-muted hover:text-foreground'
              }`}
            >
              <Crown className="w-3.5 h-3.5 text-accent" />
              <span>Banner VIP</span>
              {isOwner && (
                <span className="flex h-2 w-2 rounded-full bg-success ring-2 ring-success/30" />
              )}
            </button>
          </div>

          {shopTab === 'mascotas' && (
            <div className="flex items-center gap-2 font-mono text-xs text-foreground-subtle">
              <Award className="w-4 h-4 text-foreground-muted" />
              <span>
                Colección: <strong className="text-foreground">{unlockedPets.length}</strong>/{PETS_REGISTRY.length}
              </span>
            </div>
          )}
        </div>

        {shopTab === 'mascotas' ? (
          /* ================= CATÁLOGO DE MASCOTAS ================= */
          <div className="space-y-6">
            {/* Filtros de Categoría */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
              <span className="flex items-center gap-1 text-[11px] font-mono uppercase tracking-wider text-foreground-subtle mr-2 shrink-0">
                <Filter className="w-3 h-3" />
                <span>Filtrar:</span>
              </span>
              {(['all', 'exclusive', 'botellon', 'bolsa', 'drop'] as PetCategoryFilter[]).map((cat) => {
                const isActive = categoryFilter === cat;
                const count = cat === 'all'
                  ? PETS_REGISTRY.length
                  : PETS_REGISTRY.filter((p) => p.category === cat).length;

                return (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => {
                      sound.tap();
                      setCategoryFilter(cat);
                    }}
                    className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium transition-all cursor-pointer whitespace-nowrap ${
                      isActive
                        ? 'bg-foreground text-background shadow-xs'
                        : 'border border-border/80 bg-surface text-foreground-muted hover:bg-surface-raised hover:text-foreground'
                    }`}
                  >
                    <span>{CATEGORY_NAMES[cat]}</span>
                    <span className={`font-mono text-[10px] ${isActive ? 'opacity-80' : 'text-foreground-subtle'}`}>
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Layout distribuido: Grid visual de tarjetas (7 cols) + Inspector Detalle (5 cols) */}
            <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-12 lg:gap-8">
              {/* Grid de mascotas */}
              <section className="lg:col-span-7">
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {filteredPets.map((pet) => {
                    const isSelected = pet.id === selectedPet.id;
                    const isOwned = unlockedPets.includes(pet.id);
                    const isEquipped = equippedPetId === pet.id;

                    return (
                      <button
                        key={pet.id}
                        type="button"
                        aria-current={isSelected ? 'true' : undefined}
                        onClick={() => {
                          sound.tap();
                          setSelectedPetId(pet.id);
                          setConfirmPetId(null);
                          setErrorMessage(null);
                          setPetSuccessMessage(null);
                          if (typeof window !== 'undefined' && window.matchMedia('(max-width: 1023px)').matches) {
                            window.setTimeout(() => {
                              detailRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                            }, 60);
                          }
                        }}
                        className={`group relative flex flex-col justify-between overflow-hidden rounded-2xl border p-3 text-left transition-all cursor-pointer ${
                          isSelected
                            ? 'border-accent bg-accent-subtle/25 shadow-sm ring-2 ring-accent/30'
                            : 'border-border/80 bg-surface hover:border-border-focus hover:bg-surface-raised/70'
                        }`}
                      >
                        {/* Estado / Badge superior */}
                        <div className="flex items-center justify-between gap-1 w-full mb-2">
                          <span className="font-mono text-[9px] uppercase tracking-wider text-foreground-subtle truncate max-w-[70px]">
                            {CATEGORY_NAMES[pet.category]}
                          </span>
                          {isEquipped ? (
                            <span className="inline-flex items-center gap-1 rounded-full bg-success/15 border border-success/30 px-2 py-0.5 font-mono text-[9px] font-semibold text-success">
                              <span className="h-1.5 w-1.5 rounded-full bg-success animate-pulse" />
                              Activa
                            </span>
                          ) : isOwned ? (
                            <span className="inline-flex items-center gap-1 rounded-full bg-surface-raised border border-border px-1.5 py-0.5 font-mono text-[9px] text-foreground-muted">
                              <Check className="w-2.5 h-2.5" />
                              Obtenida
                            </span>
                          ) : pet.notForSale ? (
                            <span className="inline-flex items-center gap-1 rounded-full bg-purple-500/15 border border-purple-500/30 px-2 py-0.5 font-mono text-[9px] font-medium text-purple-400">
                              Exclusiva
                            </span>
                          ) : (
                            <span className={`inline-flex items-center gap-0.5 font-mono text-[10px] font-semibold tabular-nums ${
                              userCoins >= pet.price ? 'text-amber-500' : 'text-foreground-subtle'
                            }`}>
                              <Coins className="w-2.5 h-2.5" />
                              {formatCoinsAbbreviated(pet.price)}
                            </span>
                          )}
                        </div>

                        {/* Visual de la mascota */}
                        <div className="relative aspect-square w-full rounded-xl bg-surface-raised/80 border border-border/50 flex items-center justify-center p-2 mb-2.5 overflow-hidden group-hover:scale-[1.02] transition-transform duration-200">
                          <Image
                            src={pet.image}
                            alt={pet.name}
                            width={88}
                            height={88}
                            className="max-h-full max-w-full object-contain drop-shadow-xs"
                          />
                        </div>

                        {/* Nombre y subtítulo */}
                        <div className="min-w-0 w-full">
                          <h3 className="truncate text-xs font-semibold text-foreground leading-snug">
                            {pet.name}
                          </h3>
                          <p className="truncate text-[10px] text-foreground-muted mt-0.5">
                            {pet.perkName}
                          </p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </section>

              {/* Inspector de detalle sticky */}
              <section ref={detailRef} className="scroll-mt-24 lg:col-span-5 lg:sticky lg:top-6">
                <div className="space-y-5 rounded-3xl border border-border/80 bg-surface p-5 sm:p-6 shadow-xs">
                  {/* Tarjeta Visual de Presentación */}
                  <div className="relative flex flex-col items-center justify-center rounded-2xl bg-gradient-to-b from-surface-raised to-surface border border-border/60 p-6 text-center overflow-hidden">
                    <div className="absolute top-3 left-3">
                      <span className="rounded-full border border-border bg-surface px-2.5 py-1 font-mono text-[10px] font-semibold uppercase tracking-wider text-foreground-muted shadow-xs">
                        {selectedPet.tierBadge}
                      </span>
                    </div>

                    {isSelectedPetEquipped && (
                      <div className="absolute top-3 right-3">
                        <span className="inline-flex items-center gap-1 rounded-full bg-success/15 border border-success/30 px-2.5 py-1 font-mono text-[10px] font-bold text-success shadow-xs">
                          <Check className="w-3 h-3" />
                          ACTIVA
                        </span>
                      </div>
                    )}

                    <div className="relative my-3 flex h-32 w-32 items-center justify-center">
                      <div className="absolute inset-0 rounded-full bg-accent/5 blur-xl pointer-events-none" />
                      <Image
                        src={selectedPet.image}
                        alt={selectedPet.name}
                        width={120}
                        height={120}
                        className="max-h-full max-w-full object-contain relative z-10 drop-shadow-md"
                      />
                    </div>

                    <h2 className="text-xl font-bold tracking-tight text-foreground">
                      {selectedPet.name}
                    </h2>
                    <p className="text-xs text-foreground-muted mt-0.5 max-w-xs">
                      {selectedPet.subtitle}
                    </p>

                    <div className="mt-3 inline-flex items-center gap-1.5 rounded-full border border-border/80 bg-surface px-3 py-1 font-mono text-xs font-semibold tabular-nums text-foreground">
                      {selectedPet.notForSale ? (
                        <span className="text-purple-400 font-sans text-xs">Exclusiva (No en venta)</span>
                      ) : (
                        <>
                          <Coins className="h-3.5 w-3.5 text-amber-500" />
                          <span>{selectedPet.price.toLocaleString('es-ES')}</span>
                          <span className="font-sans text-[11px] font-normal text-foreground-subtle">
                            monedas
                          </span>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Descripción */}
                  <p className="text-xs leading-relaxed text-foreground-muted px-1">
                    {selectedPet.description}
                  </p>

                  {/* Tarjeta de Habilidad Pasiva */}
                  <div className="rounded-2xl border border-border/70 bg-surface-raised/60 p-4 space-y-1.5">
                    <div className="flex items-center gap-2 text-foreground font-semibold text-xs">
                      <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-amber-500/15 text-amber-500">
                        <Sparkles className="h-3.5 w-3.5" />
                      </div>
                      <span>Habilidad Pasiva: {selectedPet.perkName}</span>
                    </div>
                    <p className="text-xs leading-relaxed text-foreground-muted pl-8">
                      {selectedPet.perkDescription}
                    </p>
                  </div>

                  {/* Vista en el Feed */}
                  <div className="space-y-1.5 px-1">
                    <p className="font-mono text-[10px] uppercase tracking-wider text-foreground-subtle">
                      Vista previa en publicaciones
                    </p>
                    <div className="flex items-center justify-between gap-3 rounded-xl border border-border/60 bg-surface-raised/40 px-3.5 py-2">
                      <div className="flex min-w-0 items-center gap-2">
                        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-foreground font-mono text-[10px] font-bold text-background">
                          {currentUser?.username
                            ? currentUser.username.charAt(0).toUpperCase()
                            : 'U'}
                        </span>
                        <span className="truncate text-xs font-medium text-foreground">
                          @{currentUser?.username || 'tu_usuario'}
                        </span>
                        <span className="inline-flex shrink-0 items-center gap-1 rounded-full border border-border/80 bg-surface px-1.5 py-0.5 font-mono text-[10px] text-foreground-muted shadow-2xs">
                          <img
                            src={selectedPet.image}
                            alt=""
                            className="h-3.5 w-3.5 shrink-0 rounded-full object-cover"
                          />
                          <span className="max-w-24 truncate">{selectedPet.name.split(' ')[0]}</span>
                        </span>
                      </div>
                      <span className="font-mono text-[10px] uppercase tracking-wider text-foreground-subtle">
                        Feed
                      </span>
                    </div>
                  </div>

                  {/* Avisos */}
                  {errorMessage && (
                    <ShopNotice
                      tone="danger"
                      message={errorMessage}
                      onDismiss={() => setErrorMessage(null)}
                    />
                  )}
                  {petSuccessMessage && (
                    <ShopNotice
                      tone="success"
                      message={petSuccessMessage}
                      onDismiss={() => setPetSuccessMessage(null)}
                    />
                  )}

                  {/* Zona de Acciones */}
                  <div className="pt-2 border-t border-border/60 space-y-2">
                    {selectedPet.notForSale && !isSelectedPetOwned ? (
                      <div className="rounded-2xl border border-purple-500/30 bg-purple-500/10 p-3.5 text-center space-y-1">
                        <p className="text-xs font-semibold text-purple-300">
                          Recompensa Exclusiva de Rebirths
                        </p>
                        <p className="text-[11px] text-foreground-muted leading-relaxed">
                          Esta mascota se entregó automáticamente a los usuarios cuyos Afters fueron reajustados para balancear el juego. No está en venta libre.
                        </p>
                      </div>
                    ) : isSelectedPetOwned ? (
                      <button
                        type="button"
                        onClick={() => handleToggleEquipPet(selectedPet.id)}
                        disabled={isPetProcessing}
                        className={`inline-flex w-full items-center justify-center gap-2 rounded-2xl py-3 text-xs font-semibold transition-all active:scale-[0.99] cursor-pointer disabled:cursor-not-allowed disabled:opacity-50 shadow-xs ${
                          isSelectedPetEquipped
                            ? 'border border-border bg-surface text-foreground-muted hover:border-danger/40 hover:text-danger hover:bg-danger/5'
                            : 'border border-transparent bg-foreground text-background hover:opacity-90'
                        }`}
                      >
                        {isPetProcessing ? (
                          <span className="h-4 w-4 animate-spin rounded-full border-2 border-current/30 border-t-current" />
                        ) : isSelectedPetEquipped ? (
                          <>
                            <Check className="h-4 w-4" />
                            <span>Desequipar mascota</span>
                          </>
                        ) : (
                          <>
                            <Sparkles className="h-4 w-4" />
                            <span>Equipar en tu perfil</span>
                          </>
                        )}
                      </button>
                    ) : confirmPetId === selectedPet.id ? (
                      <div className="space-y-2 animate-in fade-in">
                        <button
                          type="button"
                          onClick={() => handleBuyPet(selectedPet)}
                          disabled={isPetProcessing}
                          className="inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-transparent bg-accent py-3 text-xs font-semibold text-accent-foreground transition-all hover:bg-accent-hover active:scale-[0.99] cursor-pointer disabled:cursor-not-allowed disabled:opacity-50 shadow-xs"
                        >
                          {isPetProcessing ? (
                            <span className="h-4 w-4 animate-spin rounded-full border-2 border-accent-foreground/30 border-t-accent-foreground" />
                          ) : (
                            <Coins className="h-4 w-4" />
                          )}
                          <span>
                            Confirmar compra · {selectedPet.price.toLocaleString('es-ES')} monedas
                          </span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setConfirmPetId(null)}
                          className="w-full cursor-pointer py-1 text-center text-xs text-foreground-muted transition-colors hover:text-foreground"
                        >
                          Cancelar
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => {
                          if (!currentUser) {
                            sound.tap();
                            onOpenAuth();
                            return;
                          }
                          if (!canAffordSelectedPet) {
                            sound.broke();
                            setErrorMessage(
                              `Te faltan ${(
                                selectedPet.price - userCoins
                              ).toLocaleString('es-ES')} monedas para adoptar a ${selectedPet.name}.`
                            );
                            return;
                          }
                          sound.tap();
                          setErrorMessage(null);
                          setConfirmPetId(selectedPet.id);
                        }}
                        disabled={isPetProcessing || !canAffordSelectedPet}
                        className={`inline-flex w-full items-center justify-center gap-2 rounded-2xl py-3 text-xs font-semibold transition-all active:scale-[0.99] shadow-xs ${
                          canAffordSelectedPet
                            ? 'cursor-pointer border border-transparent bg-accent text-accent-foreground hover:bg-accent-hover'
                            : 'cursor-not-allowed border border-border bg-surface-raised text-foreground-subtle opacity-60'
                        }`}
                      >
                        {canAffordSelectedPet ? (
                          <>
                            <Coins className="h-4 w-4" />
                            <span>
                              Adquirir por {selectedPet.price.toLocaleString('es-ES')} monedas
                            </span>
                          </>
                        ) : (
                          <>
                            <Lock className="h-4 w-4" />
                            <span>
                              Faltan {(selectedPet.price - userCoins).toLocaleString('es-ES')} monedas
                            </span>
                          </>
                        )}
                      </button>
                    )}

                    <p className="text-center text-[11px] text-foreground-subtle pt-1">
                      {isSelectedPetOwned
                        ? 'Tu mascota equipada te acompaña en todo el portal.'
                        : 'Pago único. Se añade permanentemente a tu colección.'}
                    </p>
                  </div>
                </div>
              </section>
            </div>
          </div>
        ) : isOwner ? (
          /* ================= BANNER · PROPIETARIO ================= */
          <div className="space-y-8">
            <div className="flex items-center justify-between gap-4 text-xs">
              <span className="inline-flex items-center gap-1.5 text-foreground font-medium">
                <CheckCircle2 className="h-4 w-4 text-success" />
                Banner VIP Desbloqueado
              </span>
              <span className="font-mono text-foreground-subtle">Configuración en tiempo real</span>
            </div>

            {/* Vista previa en directo */}
            <div className="space-y-2">
              <div className="flex items-center justify-between font-mono text-[11px] uppercase tracking-wider text-foreground-subtle">
                <span className="inline-flex items-center gap-1.5">
                  <Sliders className="h-3.5 w-3.5" />
                  Vista previa de tu credencial
                </span>
                <span>En vivo</span>
              </div>
              <BannerPreviewCard
                preset={currentPreset}
                selectedStyle={selectedStyle}
                imageUrl={customImageUrl}
                title={customTitle}
                quote={customQuote}
                username={currentUser?.username}
              />
            </div>

            {/* Distribución equilibrada en 2 columnas: Estilos (6) y Textos (6) */}
            <div className="grid grid-cols-1 items-start gap-8 lg:grid-cols-12 lg:gap-8">
              {/* Columna Izquierda: Selección de Fondo */}
              <section className="space-y-4 lg:col-span-6">
                <div className="flex items-baseline justify-between border-b border-border/60 pb-2">
                  <h2 className="text-sm font-semibold text-foreground">Estilo de Fondo</h2>
                  <span className="font-mono text-[11px] text-foreground-subtle">
                    {BANNER_PRESETS.length} variantes
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {BANNER_PRESETS.map((preset) => {
                    const isSelected = selectedStyle === preset.id;
                    return (
                      <button
                        key={preset.id}
                        type="button"
                        onClick={() => {
                          sound.tap();
                          setSelectedStyle(preset.id);
                        }}
                        className={`flex items-center gap-3 rounded-2xl border p-3 text-left transition-all cursor-pointer ${
                          isSelected
                            ? 'border-accent bg-accent-subtle/25 shadow-xs ring-2 ring-accent/30'
                            : 'border-border/80 bg-surface hover:bg-surface-raised'
                        }`}
                      >
                        <span
                          className={`flex h-10 w-12 shrink-0 items-center justify-center rounded-xl border ${preset.border} ${preset.gradient} shadow-2xs`}
                        >
                          {preset.id === 'custom_image' && (
                            <ImageIcon className="h-4 w-4 text-foreground-muted" />
                          )}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-xs font-semibold text-foreground">
                            {preset.name}
                          </span>
                          <span className="mt-0.5 block truncate text-[10px] text-foreground-subtle">
                            {preset.desc}
                          </span>
                        </span>
                        {isSelected && <Check className="h-4 w-4 shrink-0 text-accent" />}
                      </button>
                    );
                  })}
                </div>

                {selectedStyle === 'custom_image' && (
                  <div className="space-y-2 rounded-2xl border border-border/80 bg-surface p-4 shadow-xs">
                    <label
                      htmlFor="banner-image-url"
                      className="flex items-center gap-1.5 text-xs font-medium text-foreground"
                    >
                      <ImageIcon className="h-3.5 w-3.5 text-accent" />
                      <span>URL directa de la imagen</span>
                    </label>
                    <input
                      id="banner-image-url"
                      type="url"
                      value={customImageUrl}
                      onChange={(e) => setCustomImageUrl(e.target.value)}
                      placeholder="https://i.imgur.com/...jpg"
                      className="w-full rounded-xl border border-border bg-surface-raised px-3.5 py-2.5 font-mono text-xs text-foreground outline-none transition-colors placeholder:text-foreground-subtle focus:border-border-focus"
                    />
                    <p className="text-[11px] text-foreground-subtle leading-relaxed">
                      Formatos recomendados: JPG, PNG o WebP de orientación horizontal (16:9).
                    </p>
                  </div>
                )}
              </section>

              {/* Columna Derecha: Textos y Botón Guardar */}
              <section className="space-y-4 lg:col-span-6 lg:sticky lg:top-6">
                <div className="flex items-baseline justify-between border-b border-border/60 pb-2">
                  <h2 className="text-sm font-semibold text-foreground">Textos de la Credencial</h2>
                  <span className="font-mono text-[11px] text-foreground-subtle">
                    Personalizables
                  </span>
                </div>

                <div className="space-y-4 rounded-3xl border border-border/80 bg-surface p-5 sm:p-6 shadow-xs">
                  <div className="space-y-1.5">
                    <div className="flex items-baseline justify-between">
                      <label htmlFor="banner-title" className="text-xs font-medium text-foreground">
                        Título de honor
                      </label>
                      <span className="font-mono text-[10px] text-foreground-subtle">
                        {customTitle.length}/35
                      </span>
                    </div>
                    <input
                      id="banner-title"
                      type="text"
                      maxLength={35}
                      value={customTitle}
                      onChange={(e) => setCustomTitle(e.target.value)}
                      placeholder="Magnate del Botellón"
                      className="w-full rounded-xl border border-border bg-surface-raised px-3.5 py-2.5 text-xs text-foreground outline-none transition-colors placeholder:text-foreground-subtle focus:border-border-focus"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex items-baseline justify-between">
                      <label htmlFor="banner-quote" className="text-xs font-medium text-foreground">
                        Frase célebre
                      </label>
                      <span className="font-mono text-[10px] text-foreground-subtle">
                        {customQuote.length}/70
                      </span>
                    </div>
                    <input
                      id="banner-quote"
                      type="text"
                      maxLength={70}
                      value={customQuote}
                      onChange={(e) => setCustomQuote(e.target.value)}
                      placeholder="Construyendo el aula más rápida del instituto."
                      className="w-full rounded-xl border border-border bg-surface-raised px-3.5 py-2.5 text-xs text-foreground outline-none transition-colors placeholder:text-foreground-subtle focus:border-border-focus"
                    />
                  </div>

                  {errorMessage && (
                    <ShopNotice
                      tone="danger"
                      message={errorMessage}
                      onDismiss={() => setErrorMessage(null)}
                    />
                  )}

                  <button
                    type="button"
                    onClick={handleSaveCustomization}
                    disabled={isSaving}
                    className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-accent py-3 text-xs font-semibold text-accent-foreground transition-all hover:bg-accent-hover active:scale-[0.99] cursor-pointer disabled:cursor-not-allowed disabled:opacity-50 shadow-xs mt-2"
                  >
                    {isSaving ? (
                      <span className="h-4 w-4 animate-spin rounded-full border-2 border-accent-foreground/30 border-t-accent-foreground" />
                    ) : (
                      <Check className="h-4 w-4" />
                    )}
                    <span>Guardar configuración</span>
                  </button>

                  <div className="flex min-h-5 items-center justify-center gap-1.5 text-xs pt-1">
                    {saveSuccess ? (
                      <>
                        <CheckCircle2 className="h-3.5 w-3.5 text-success" />
                        <span className="font-medium text-success text-[11px]">Cambios guardados con éxito</span>
                      </>
                    ) : (
                      <span className="text-center text-[11px] text-foreground-subtle">
                        Visible en tu credencial y ficha pública de estudiante.
                      </span>
                    )}
                  </div>
                </div>
              </section>
            </div>
          </div>
        ) : (
          /* ================= BANNER · COMPRA ================= */
          <div className="space-y-8">
            <BannerPreviewCard
              preset={BANNER_PRESETS[0]}
              selectedStyle={BANNER_PRESETS[0].id}
              imageUrl=""
              title={customTitle || 'Magnate del Botellón'}
              quote={customQuote || 'Construyendo el aula más rápida del instituto.'}
              username={currentUser?.username}
            />

            <div className="grid grid-cols-1 items-start gap-8 lg:grid-cols-12 lg:gap-8">
              <div className="space-y-5 lg:col-span-7">
                <div className="space-y-2">
                  <p className="font-mono text-[11px] uppercase tracking-wider text-accent font-semibold">
                    Coleccionable Permanente
                  </p>
                  <h2 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
                    Banner de Perfil VIP
                  </h2>
                  <p className="max-w-xl text-sm leading-relaxed text-foreground-muted">
                    Sustituye la cabecera estándar de tu credencial de estudiante por un diseño exclusivo.
                    Podrás personalizar el fondo con estilos degradados u obras externas, y redactar tu propio título y lema.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                  {[
                    'Cabecera personalizada en tu credencial y carnet.',
                    'Seis estilos predefinidos o imagen externa vía URL.',
                    'Título nobiliario y frase célebre editables.',
                    'Insignia VIP dorada permanente.',
                  ].map((benefit) => (
                    <div
                      key={benefit}
                      className="flex items-start gap-2.5 rounded-2xl border border-border/80 bg-surface p-3 text-xs text-foreground-muted"
                    >
                      <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-accent" />
                      <span>{benefit}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-5 rounded-3xl border border-border/80 bg-surface p-6 lg:col-span-5 lg:sticky lg:top-6 shadow-xs">
                <div className="flex items-baseline justify-between gap-3">
                  <span className="font-mono text-[11px] uppercase tracking-wider text-foreground-subtle">
                    Precio Único
                  </span>
                  <span className="font-mono text-lg font-bold tabular-nums text-foreground">
                    {BANNER_PRICE.toLocaleString('es-ES')}
                    <span className="ml-1 font-sans text-xs font-normal text-foreground-muted">
                      monedas
                    </span>
                  </span>
                </div>

                <div className="space-y-2 border-t border-border/60 pt-4">
                  <div className="flex items-center justify-between text-[11px] text-foreground-muted">
                    <span>Progreso de ahorro</span>
                    <span className="font-mono font-semibold tabular-nums">
                      {progressPercent.toFixed(1)}%
                    </span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-surface-raised">
                    <div
                      className="h-full rounded-full bg-accent transition-all duration-300"
                      style={{ width: `${progressPercent}%` }}
                    />
                  </div>
                  <p className="font-mono text-[10px] tabular-nums text-foreground-subtle">
                    {userCoins.toLocaleString('es-ES')} / {BANNER_PRICE.toLocaleString('es-ES')} monedas
                  </p>
                </div>

                {errorMessage && (
                  <ShopNotice
                    tone="danger"
                    message={errorMessage}
                    onDismiss={() => setErrorMessage(null)}
                  />
                )}

                {confirmBanner ? (
                  <div className="space-y-2 animate-in fade-in">
                    <button
                      type="button"
                      onClick={handleBuyBanner}
                      disabled={isBuying}
                      className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-accent py-3 text-xs font-semibold text-accent-foreground transition-all hover:bg-accent-hover active:scale-[0.99] cursor-pointer disabled:cursor-not-allowed disabled:opacity-50 shadow-xs"
                    >
                      {isBuying ? (
                        <span className="h-4 w-4 animate-spin rounded-full border-2 border-accent-foreground/30 border-t-accent-foreground" />
                      ) : (
                        <Crown className="h-4 w-4" />
                      )}
                      <span>
                        Confirmar compra · {BANNER_PRICE.toLocaleString('es-ES')} monedas
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmBanner(false)}
                      className="w-full cursor-pointer py-1 text-center text-xs text-foreground-muted transition-colors hover:text-foreground"
                    >
                      Cancelar
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      if (!canAfford) {
                        sound.broke();
                        return;
                      }
                      sound.tap();
                      setConfirmBanner(true);
                    }}
                    disabled={!canAfford || isBuying}
                    className={`inline-flex w-full items-center justify-center gap-2 rounded-2xl py-3 text-xs font-semibold transition-all active:scale-[0.99] shadow-xs ${
                      canAfford
                        ? 'cursor-pointer bg-accent text-accent-foreground hover:bg-accent-hover'
                        : 'cursor-not-allowed border border-border bg-surface-raised text-foreground-subtle opacity-60'
                    }`}
                  >
                    {canAfford ? (
                      <>
                        <Crown className="h-4 w-4" />
                        <span>Adquirir Banner VIP</span>
                      </>
                    ) : (
                      <>
                        <Lock className="h-4 w-4" />
                        <span>
                          Faltan {(BANNER_PRICE - userCoins).toLocaleString('es-ES')} monedas
                        </span>
                      </>
                    )}
                  </button>
                )}

                <div className="flex items-center justify-between gap-3 text-[11px] text-foreground-subtle pt-1">
                  <span>Pago único y permanente.</span>
                  <button
                    type="button"
                    onClick={() => {
                      sound.tap();
                      onNavigateToPartyIdle();
                    }}
                    className="inline-flex cursor-pointer items-center gap-1 font-medium text-foreground-muted underline-offset-2 hover:text-foreground hover:underline"
                  >
                    <span>Ganar en El Botellón</span>
                    <ArrowRight className="h-3 w-3" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
