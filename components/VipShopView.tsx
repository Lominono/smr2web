'use client';

import React, { useRef, useState } from 'react';
import Image from 'next/image';
import {
  ChevronLeft,
  ChevronRight,
  Coins,
  ShoppingBag,
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
  const hasCustomImage = selectedStyle === 'custom_image' && Boolean(imageUrl.trim());

  return (
    <div
      className={`relative min-h-[176px] select-text overflow-hidden rounded-2xl border ${preset.border} transition-all duration-200 sm:min-h-[204px]`}
      style={
        hasCustomImage
          ? {
              backgroundImage: `url(${imageUrl.trim()})`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
            }
          : undefined
      }
      aria-label="Vista previa del banner de perfil"
    >
      {!hasCustomImage && <div className={`absolute inset-0 ${preset.gradient}`} />}
      <div className="absolute inset-0 bg-black/35" />

      <div className="relative z-10 flex min-h-[176px] flex-col justify-between gap-6 p-5 text-white sm:min-h-[204px] sm:p-7">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 space-y-1.5">
            <div className="flex flex-wrap items-center gap-1.5">
              <span
                className={`inline-flex items-center rounded border px-2 py-0.5 font-mono text-[10px] font-medium uppercase tracking-wider ${preset.badgeBg}`}
              >
                {preset.badge}
              </span>
              <span className="rounded border border-white/15 bg-black/50 px-2 py-0.5 font-mono text-[10px] text-neutral-300">
                13M Tier
              </span>
            </div>
            <h3 className="truncate pt-1 text-xl font-semibold tracking-tight text-white sm:text-2xl">
              {title.trim() || 'Tu título honorífico'}
            </h3>
            <p className="truncate font-mono text-xs text-neutral-300">
              @{username || 'usuario'} · 2º SMR Aula 35
            </p>
          </div>

          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-white/20 bg-black/50 p-1.5">
            <Image src="/logo.png" alt="" width={20} height={20} className="object-contain" />
          </div>
        </div>

        <div className="flex items-center justify-between gap-3 border-t border-white/15 pt-3">
          <p className="min-w-0 truncate text-xs italic text-neutral-300">
            «{quote.trim() || 'Tu frase aparecerá aquí'}»
          </p>
          <span className="shrink-0 font-mono text-[10px] text-neutral-400">Aula 35</span>
        </div>
      </div>
    </div>
  );
};

interface ShopNoticeProps {
  tone: 'success' | 'danger';
  message: string;
  onDismiss: () => void;
}

const ShopNotice: React.FC<ShopNoticeProps> = ({ tone, message, onDismiss }) => (
  <div
    className={`flex items-start justify-between gap-3 rounded-xl border px-3.5 py-2.5 text-xs font-medium ${
      tone === 'success'
        ? 'border-success/30 bg-success-subtle text-success'
        : 'border-danger/30 bg-danger-subtle text-danger'
    }`}
  >
    <span className="flex items-start gap-2">
      {tone === 'success' ? (
        <CheckCircle2 className="mt-px h-3.5 w-3.5 shrink-0" />
      ) : (
        <AlertCircle className="mt-px h-3.5 w-3.5 shrink-0" />
      )}
      <span>{message}</span>
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
      // SEGURIDAD: la compra pasa SIEMPRE por el servidor (/api/pets/purchase),
      // que cobra el precio real y concede la mascota. Antes el cliente
      // escribia su propio saldo y mascotas directamente en Supabase.
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
      onUpdateCoins?.(-pet.price);
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

      // SEGURIDAD: equipar pasa por el servidor (verifica la propiedad real).
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
    <div className="w-full max-w-5xl mx-auto pb-16 font-sans select-none text-foreground">
      <div className="flex flex-col gap-8">
        {/* Barra superior */}
        <div className="flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => {
              sound.tap();
              onBackToFeed();
            }}
            className="-ml-1 inline-flex items-center gap-1 rounded-lg px-1 py-2 text-xs text-foreground-muted transition-colors hover:text-foreground cursor-pointer active:opacity-70"
          >
            <ChevronLeft className="w-4 h-4" />
            <span>Volver al Feed</span>
          </button>

          <div className="inline-flex items-center gap-2 rounded-full border border-border bg-surface px-3.5 py-1.5 font-mono text-xs">
            <Coins className="w-3.5 h-3.5 text-foreground-subtle" />
            <span className="font-semibold tabular-nums text-foreground">
              {userCoins.toLocaleString('es-ES')}
            </span>
            <span className="text-foreground-subtle">monedas</span>
          </div>
        </div>

        {/* Cabecera de la tienda */}
        <header className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div className="space-y-2.5">
            <div className="flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-[0.16em] text-foreground-subtle">
              <ShoppingBag className="w-3.5 h-3.5" />
              <span>Tienda Oficial · Aula 35</span>
            </div>
            <h1 className="text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
              Tienda
            </h1>
            <p className="max-w-lg text-sm leading-relaxed text-foreground-muted">
              Mascotas exclusivas y banners de perfil. Objetos permanentes para tu identidad en el portal.
            </p>
          </div>

          <button
            type="button"
            onClick={() => {
              sound.tap();
              onNavigateToPartyIdle();
            }}
            className="group inline-flex items-center gap-2 self-start text-xs font-medium text-foreground-muted transition-colors hover:text-foreground cursor-pointer sm:self-auto"
          >
            <Wine className="w-4 h-4" />
            <span>El Botellón</span>
            <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" />
          </button>
        </header>

        {/* Selector de sección */}
        <div className="flex flex-col gap-4">
          <div
            className="inline-flex self-start rounded-full border border-border bg-surface-raised p-1"
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
              className={`inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-xs font-medium transition-all cursor-pointer ${
                shopTab === 'mascotas'
                  ? 'bg-surface text-foreground shadow-xs dark:bg-surface-hover'
                  : 'text-foreground-muted hover:text-foreground'
              }`}
            >
              <span>Mascotas</span>
              <span className="font-mono text-[10px] text-foreground-subtle">
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
              className={`inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-xs font-medium transition-all cursor-pointer ${
                shopTab === 'banners'
                  ? 'bg-surface text-foreground shadow-xs dark:bg-surface-hover'
                  : 'text-foreground-muted hover:text-foreground'
              }`}
            >
              <span>Banner VIP</span>
              {isOwner && <Check className="w-3 h-3 text-success" />}
            </button>
          </div>
        </div>

        {shopTab === 'mascotas' ? (
          /* ================= MASCOTAS ================= */
          <div className="grid grid-cols-1 items-start gap-8 lg:grid-cols-12 lg:gap-10">
            <section className="lg:col-span-5">
              <div className="mb-3 flex items-baseline justify-between">
                <h2 className="font-mono text-[11px] uppercase tracking-wider text-foreground-subtle">
                  Catálogo
                </h2>
                <span className="font-mono text-[11px] text-foreground-subtle">
                  {PETS_REGISTRY.length} mascotas
                </span>
              </div>

              <div className="overflow-hidden rounded-2xl border border-border bg-surface">
                {PETS_REGISTRY.map((pet) => {
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
                        if (window.matchMedia('(max-width: 1023px)').matches) {
                          window.setTimeout(() => {
                            detailRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                          }, 60);
                        }
                      }}
                      className={`relative flex w-full items-center gap-3 border-b border-border-subtle px-4 py-3.5 text-left transition-colors last:border-b-0 cursor-pointer ${
                        isSelected ? 'bg-accent-subtle' : 'hover:bg-surface-raised'
                      }`}
                    >
                      {isSelected && (
                        <span className="absolute inset-y-3 left-0 w-0.5 rounded-full bg-accent" />
                      )}

                      <div
                        className={`relative flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border p-1 ${
                          isSelected
                            ? 'border-accent/30 bg-surface'
                            : 'border-border bg-surface-raised'
                        }`}
                      >
                        <Image
                          src={pet.image}
                          alt={pet.name}
                          width={40}
                          height={40}
                          className="object-contain"
                        />
                        {isEquipped && (
                          <span className="absolute -right-1 -top-1 h-2.5 w-2.5 rounded-full border-2 border-surface bg-success" />
                        )}
                      </div>

                      <span className="min-w-0 flex-1">
                        <span className="flex items-center gap-1.5 text-sm font-medium text-foreground">
                          <span className="truncate">{pet.name}</span>
                        </span>
                        <span className="mt-0.5 block truncate text-[11px] text-foreground-muted">
                          {pet.subtitle}
                        </span>
                      </span>

                      <span className="shrink-0 text-right">
                        {isEquipped ? (
                          <span className="text-[10px] font-mono font-medium text-success">
                            Equipada
                          </span>
                        ) : isOwned ? (
                          <span className="text-[10px] font-mono text-foreground-subtle">
                            En propiedad
                          </span>
                        ) : (
                          <span className="font-mono text-[11px] font-medium tabular-nums text-foreground-muted">
                            {formatCoinsAbbreviated(pet.price)}
                          </span>
                        )}
                      </span>

                      <ChevronRight
                        className={`h-3.5 w-3.5 shrink-0 ${
                          isSelected ? 'text-accent' : 'text-foreground-subtle'
                        }`}
                      />
                    </button>
                  );
                })}
              </div>

              <p className="mt-3 text-[11px] leading-relaxed text-foreground-subtle">
                Cada mascota incluye una habilidad pasiva y se muestra junto a tu perfil y publicaciones.
              </p>
            </section>

            <section ref={detailRef} className="scroll-mt-24 lg:col-span-7">
              <div className="space-y-6 rounded-2xl border border-border bg-surface p-6 sm:p-8 lg:sticky lg:top-6">
                <div className="flex flex-col gap-5 sm:flex-row sm:items-start">
                  <div className="relative flex h-28 w-28 shrink-0 items-center justify-center rounded-2xl border border-border bg-surface-raised p-2">
                    <Image
                      src={selectedPet.image}
                      alt={selectedPet.name}
                      width={100}
                      height={100}
                      className="max-h-full object-contain"
                    />
                    {isSelectedPetEquipped && (
                      <span className="absolute -bottom-2 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-success px-2 py-0.5 font-mono text-[9px] font-bold text-black">
                        ACTIVA
                      </span>
                    )}
                  </div>

                  <div className="min-w-0 flex-1 space-y-2">
                    <span className="inline-block rounded-md border border-border bg-surface-raised px-2 py-0.5 font-mono text-[10px] font-medium uppercase tracking-wider text-foreground-muted">
                      {selectedPet.tierBadge}
                    </span>
                    <h2 className="text-2xl font-semibold leading-tight tracking-tight text-foreground">
                      {selectedPet.name}
                    </h2>
                    <p className="text-sm text-foreground-muted">{selectedPet.subtitle}</p>
                    <div className="flex items-center gap-1.5 pt-1 font-mono text-sm font-semibold tabular-nums text-foreground">
                      <Coins className="h-3.5 w-3.5 text-foreground-subtle" />
                      <span>{selectedPet.price.toLocaleString('es-ES')}</span>
                      <span className="font-sans text-xs font-normal text-foreground-muted">
                        monedas
                      </span>
                    </div>
                  </div>
                </div>

                <p className="border-t border-border-subtle pt-5 text-sm leading-relaxed text-foreground-muted">
                  {selectedPet.description}
                </p>

                <div className="flex items-start gap-3">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-accent-subtle text-accent">
                    <Sparkles className="h-4 w-4" />
                  </div>
                  <div className="space-y-0.5">
                    <p className="text-xs font-medium text-foreground">
                      Habilidad · {selectedPet.perkName}
                    </p>
                    <p className="text-xs leading-relaxed text-foreground-muted">
                      {selectedPet.perkDescription}
                    </p>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <p className="font-mono text-[10px] uppercase tracking-wider text-foreground-subtle">
                    Vista en tu perfil y en el Feed
                  </p>
                  <div className="flex items-center justify-between gap-3 rounded-xl border border-border-subtle bg-surface-raised/60 px-3.5 py-2.5">
                    <div className="flex min-w-0 items-center gap-2">
                      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-foreground font-mono text-[10px] font-semibold text-background">
                        {currentUser?.username
                          ? currentUser.username.charAt(0).toUpperCase()
                          : 'U'}
                      </span>
                      <span className="truncate text-xs font-medium text-foreground">
                        @{currentUser?.username || 'tu_usuario'}
                      </span>
                      <span className="inline-flex shrink-0 items-center gap-1 rounded-full border border-border bg-surface px-1.5 py-0.5 font-mono text-[10px] text-foreground-muted">
                        <img
                          src={selectedPet.image}
                          alt=""
                          className="h-3.5 w-3.5 shrink-0 rounded-full object-cover"
                        />
                        <span className="max-w-24 truncate">{selectedPet.name.split(' ')[0]}</span>
                      </span>
                    </div>
                    <span className="hidden shrink-0 font-mono text-[10px] uppercase tracking-wider text-foreground-subtle sm:inline">
                      Feed
                    </span>
                  </div>
                </div>

                <div className="space-y-2 border-t border-border-subtle pt-5">
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

                  {isSelectedPetOwned ? (
                    <button
                      type="button"
                      onClick={() => handleToggleEquipPet(selectedPet.id)}
                      disabled={isPetProcessing}
                      className={`inline-flex w-full items-center justify-center gap-2 rounded-xl py-3 text-sm font-medium transition-all active:scale-[0.99] cursor-pointer disabled:cursor-not-allowed disabled:opacity-50 ${
                        isSelectedPetEquipped
                          ? 'border border-border bg-surface text-foreground-muted hover:border-danger/30 hover:text-danger'
                          : 'border border-transparent bg-accent text-accent-foreground hover:bg-accent-hover'
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
                          <span>Equipar mascota</span>
                        </>
                      )}
                    </button>
                  ) : confirmPetId === selectedPet.id ? (
                    <>
                      <button
                        type="button"
                        onClick={() => handleBuyPet(selectedPet)}
                        disabled={isPetProcessing}
                        className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-transparent bg-accent py-3 text-sm font-medium text-accent-foreground transition-all hover:bg-accent-hover active:scale-[0.99] cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
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
                    </>
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
                      className={`inline-flex w-full items-center justify-center gap-2 rounded-xl py-3 text-sm font-medium transition-all active:scale-[0.99] ${
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

                  <p className="text-center text-[11px] text-foreground-subtle">
                    {isSelectedPetOwned
                      ? 'La mascota se muestra junto a tu nombre en todo el portal.'
                      : 'Pago único. Se equipa automáticamente al adoptarla.'}
                  </p>
                </div>
              </div>
            </section>
          </div>
        ) : isOwner ? (
          /* ================= BANNER · PROPIETARIO ================= */
          <div className="space-y-8">
            <div className="flex items-center justify-between gap-4 text-xs">
              <span className="inline-flex items-center gap-1.5 text-foreground-muted">
                <CheckCircle2 className="h-4 w-4 text-success" />
                Banner desbloqueado
              </span>
              <span className="font-mono text-foreground-subtle">Configuración permanente</span>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between font-mono text-[11px] uppercase tracking-wider text-foreground-subtle">
                <span className="inline-flex items-center gap-1.5">
                  <Sliders className="h-3.5 w-3.5" />
                  Vista previa
                </span>
                <span>En directo</span>
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

            <div className="grid grid-cols-1 items-start gap-8 lg:grid-cols-12 lg:gap-10">
              <section className="space-y-3 lg:col-span-7">
                <div className="flex items-baseline justify-between">
                  <h2 className="text-sm font-medium text-foreground">Estilo de fondo</h2>
                  <span className="font-mono text-[11px] text-foreground-subtle">
                    {BANNER_PRESETS.length} opciones
                  </span>
                </div>

                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
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
                        className={`flex items-center gap-3 rounded-xl border p-2.5 text-left transition-all cursor-pointer ${
                          isSelected
                            ? 'border-accent bg-accent-subtle'
                            : 'border-border bg-surface hover:bg-surface-raised'
                        }`}
                      >
                        <span
                          className={`flex h-9 w-12 shrink-0 items-center justify-center rounded-md border ${preset.border} ${preset.gradient}`}
                        >
                          {preset.id === 'custom_image' && (
                            <ImageIcon className="h-3.5 w-3.5 text-foreground-muted" />
                          )}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-xs font-medium text-foreground">
                            {preset.name}
                          </span>
                          <span className="mt-0.5 block truncate text-[10px] text-foreground-subtle">
                            {preset.desc}
                          </span>
                        </span>
                        {isSelected && <Check className="h-3.5 w-3.5 shrink-0 text-accent" />}
                      </button>
                    );
                  })}
                </div>

                {selectedStyle === 'custom_image' && (
                  <div className="space-y-2 rounded-xl border border-border bg-surface p-3.5">
                    <label
                      htmlFor="banner-image-url"
                      className="flex items-center gap-1.5 text-xs font-medium text-foreground"
                    >
                      <ImageIcon className="h-3.5 w-3.5 text-foreground-muted" />
                      <span>URL de la imagen</span>
                    </label>
                    <input
                      id="banner-image-url"
                      type="url"
                      value={customImageUrl}
                      onChange={(e) => setCustomImageUrl(e.target.value)}
                      placeholder="https://…/imagen.jpg"
                      className="w-full rounded-lg border border-border bg-surface-raised px-3 py-2.5 font-mono text-xs text-foreground outline-none transition-colors placeholder:text-foreground-subtle focus:border-border-focus"
                    />
                    <p className="text-[10px] text-foreground-subtle">
                      JPG, PNG o WebP en formato horizontal.
                    </p>
                  </div>
                )}
              </section>

              <section className="space-y-3 lg:col-span-5 lg:sticky lg:top-6">
                <h2 className="text-sm font-medium text-foreground">Textos</h2>

                <div className="space-y-4 rounded-2xl border border-border bg-surface p-5">
                  <div className="space-y-1.5">
                    <div className="flex items-baseline justify-between">
                      <label htmlFor="banner-title" className="text-xs font-medium text-foreground">
                        Título
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
                      className="w-full rounded-lg border border-border bg-surface-raised px-3 py-2.5 text-sm text-foreground outline-none transition-colors placeholder:text-foreground-subtle focus:border-border-focus"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex items-baseline justify-between">
                      <label htmlFor="banner-quote" className="text-xs font-medium text-foreground">
                        Frase
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
                      className="w-full rounded-lg border border-border bg-surface-raised px-3 py-2.5 text-sm text-foreground outline-none transition-colors placeholder:text-foreground-subtle focus:border-border-focus"
                    />
                  </div>
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
                  className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-accent py-3 text-sm font-medium text-accent-foreground transition-all hover:bg-accent-hover active:scale-[0.99] cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isSaving ? (
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-accent-foreground/30 border-t-accent-foreground" />
                  ) : (
                    <Check className="h-4 w-4" />
                  )}
                  <span>Guardar cambios</span>
                </button>

                <div className="flex min-h-5 items-center justify-center gap-1.5 text-xs">
                  {saveSuccess ? (
                    <>
                      <CheckCircle2 className="h-3.5 w-3.5 text-success" />
                      <span className="font-medium text-success">Configuración guardada</span>
                    </>
                  ) : (
                    <span className="text-center text-[11px] text-foreground-subtle">
                      Visible en tu carnet y en tu ficha de estudiante.
                    </span>
                  )}
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

            <div className="grid grid-cols-1 items-start gap-8 lg:grid-cols-12 lg:gap-10">
              <div className="space-y-5 lg:col-span-7">
                <div className="space-y-2">
                  <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-foreground-subtle">
                    Edición limitada · Permanente
                  </p>
                  <h2 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
                    Banner de perfil personalizado
                  </h2>
                  <p className="max-w-xl text-sm leading-relaxed text-foreground-muted">
                    Sustituye la cabecera estándar de tu credencial digital y destaca en el portal.
                    Elige entre estilos predefinidos o una imagen propia, y añade tu título y frase.
                  </p>
                </div>

                <ul className="space-y-3 pt-1">
                  {[
                    'Cabecera personalizada en tu credencial y en cada publicación.',
                    'Seis estilos de fondo o una imagen propia mediante URL.',
                    'Título honorífico y frase editables cuando quieras.',
                  ].map((benefit) => (
                    <li
                      key={benefit}
                      className="flex items-start gap-2.5 text-sm text-foreground-muted"
                    >
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
                      <span>{benefit}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="space-y-5 rounded-2xl border border-border bg-surface p-5 lg:col-span-5 lg:sticky lg:top-6">
                <div className="flex items-baseline justify-between gap-3">
                  <span className="font-mono text-[10px] uppercase tracking-wider text-foreground-subtle">
                    Precio
                  </span>
                  <span className="font-mono text-lg font-semibold tabular-nums text-foreground">
                    {BANNER_PRICE.toLocaleString('es-ES')}
                    <span className="ml-1 font-sans text-xs font-normal text-foreground-muted">
                      monedas
                    </span>
                  </span>
                </div>

                <div className="space-y-2 border-t border-border-subtle pt-4">
                  <div className="flex items-center justify-between text-[11px] text-foreground-muted">
                    <span>Tu progreso</span>
                    <span className="font-mono tabular-nums">
                      {progressPercent.toFixed(1)}%
                    </span>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-surface-raised">
                    <div
                      className="h-full rounded-full bg-foreground transition-all duration-300"
                      style={{ width: `${progressPercent}%` }}
                    />
                  </div>
                  <p className="font-mono text-[10px] tabular-nums text-foreground-subtle">
                    {userCoins.toLocaleString('es-ES')} / {BANNER_PRICE.toLocaleString('es-ES')}
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
                  <div className="space-y-2">
                    <button
                      type="button"
                      onClick={handleBuyBanner}
                      disabled={isBuying}
                      className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-accent py-3 text-sm font-medium text-accent-foreground transition-all hover:bg-accent-hover active:scale-[0.99] cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
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
                    className={`inline-flex w-full items-center justify-center gap-2 rounded-xl py-3 text-sm font-medium transition-all active:scale-[0.99] ${
                      canAfford
                        ? 'cursor-pointer bg-accent text-accent-foreground hover:bg-accent-hover'
                        : 'cursor-not-allowed border border-border bg-surface-raised text-foreground-subtle opacity-60'
                    }`}
                  >
                    {canAfford ? (
                      <>
                        <Crown className="h-4 w-4" />
                        <span>Adquirir banner</span>
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

                <div className="flex items-center justify-between gap-3 text-[11px] text-foreground-subtle">
                  <span>Pago único.</span>
                  <button
                    type="button"
                    onClick={() => {
                      sound.tap();
                      onNavigateToPartyIdle();
                    }}
                    className="inline-flex cursor-pointer items-center gap-1 font-medium text-foreground-muted underline-offset-2 hover:text-foreground hover:underline"
                  >
                    <span>Ganar monedas en El Botellón</span>
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
