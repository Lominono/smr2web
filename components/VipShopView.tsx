'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import {
  ChevronLeft,
  Coins,
  ShoppingBag,
  Crown,
  Terminal,
  Flame,
  Shield,
  Sparkles,
  Image as ImageIcon,
  Check,
  CheckCircle2,
  AlertCircle,
  Wine,
  ArrowRight,
  Lock,
  Sliders,
  Layers,
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
  iconType: 'Crown' | 'Terminal' | 'Flame' | 'Shield' | 'Sparkles' | 'ImageIcon';
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
    iconType: 'Crown',
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
    iconType: 'Terminal',
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
    iconType: 'Terminal',
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
    iconType: 'Flame',
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
    iconType: 'Sparkles',
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
    iconType: 'ImageIcon',
    gradient: 'bg-surface-raised',
    border: 'border-border',
    badge: 'CUSTOM IMAGE',
    textColor: 'text-foreground',
    badgeBg: 'bg-black/60 text-white border-white/20',
    glow: 'shadow-xs',
  },
];

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

  const [selectedStyle, setSelectedStyle] = useState<string>(
    currentUser?.banner_estilo || 'gold_luxury'
  );
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

    if (!window.confirm(`¿Confirmas la compra de ${pet.name} por ${pet.price.toLocaleString('es-ES')} monedas?`)) {
      return;
    }

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
        `Faltan ${(BANNER_PRICE - userCoins).toLocaleString('es-ES')} fichas para adquirir este artículo.`
      );
      return;
    }

    if (
      !window.confirm(
        'Confirmar compra: ¿Deseas adquirir el Banner Personalizado de Perfil por 13.000.000 fichas?'
      )
    ) {
      return;
    }

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

  const renderPresetIcon = (iconType: string) => {
    switch (iconType) {
      case 'Crown':
        return <Crown className="w-4 h-4" />;
      case 'Terminal':
        return <Terminal className="w-4 h-4" />;
      case 'Flame':
        return <Flame className="w-4 h-4" />;
      case 'Shield':
        return <Shield className="w-4 h-4" />;
      case 'Sparkles':
        return <Sparkles className="w-4 h-4" />;
      case 'ImageIcon':
      default:
        return <ImageIcon className="w-4 h-4" />;
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto space-y-6 pb-12 font-sans select-none text-foreground transition-colors">
      {/* 1. Barra de Navegación y Saldo de Fichas */}
      <div className="flex items-center justify-between gap-4">
        <button
          type="button"
          onClick={() => {
            sound.tap();
            onBackToFeed();
          }}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-surface-raised border border-border text-xs text-foreground-muted hover:text-foreground hover:bg-surface-hover cursor-pointer transition-all active:scale-95"
        >
          <ChevronLeft className="w-4 h-4" />
          <span>Volver al Feed</span>
        </button>

        <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-surface-raised border border-border font-mono text-xs shadow-2xs">
          <Coins className="w-3.5 h-3.5 text-foreground-muted" />
          <span className="text-foreground-subtle hidden sm:inline">Saldo:</span>
          <span className="font-semibold text-foreground tabular-nums">
            {userCoins.toLocaleString('es-ES')}
          </span>
          <span className="text-[10px] text-foreground-subtle">fichas</span>
        </div>
      </div>

      {/* 2. Cabecera Minimalista Anti-AI */}
      <div className="rounded-2xl border border-border bg-surface p-6 sm:p-7 shadow-xs space-y-4">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="inline-flex items-center gap-1.5 text-[11px] font-mono uppercase tracking-wider text-foreground-muted">
              <ShoppingBag className="w-3.5 h-3.5" />
              <span>Tienda Oficial · Aula 35</span>
            </div>

            <h1 className="text-xl sm:text-2xl font-semibold tracking-tight text-foreground">
              Catálogo de Personalización
            </h1>

            <p className="text-xs text-foreground-muted max-w-xl leading-relaxed">
              Artículos permanentes para personalizar tu presencia en el portal y tu ficha de estudiante.
            </p>
          </div>

          <button
            type="button"
            onClick={() => {
              sound.tap();
              onNavigateToPartyIdle();
            }}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-surface-raised hover:bg-surface-hover border border-border text-xs font-medium text-foreground-muted hover:text-foreground transition-all cursor-pointer active:scale-95 shrink-0"
          >
            <Wine className="w-3.5 h-3.5 text-foreground-muted" />
            <span>El Botellón</span>
            <ArrowRight className="w-3.5 h-3.5 text-foreground-subtle" />
          </button>
        </div>
      </div>

      {/* 2.5 Selector de Sección: Mascotas Exclusivas vs Banners VIP */}
      <div className="flex items-center gap-2 p-1.5 rounded-2xl bg-surface border border-border">
        <button
          type="button"
          onClick={() => {
            sound.tap();
            setShopTab('mascotas');
          }}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl font-medium text-xs transition-all cursor-pointer ${
            shopTab === 'mascotas'
              ? 'bg-foreground text-background font-semibold shadow-xs'
              : 'text-foreground-muted hover:text-foreground'
          }`}
        >
          <Sparkles className="w-3.5 h-3.5 text-amber-500" />
          <span>Mascotas Exclusivas</span>
          <span className="text-[10px] font-mono px-1.5 py-0.2 rounded-full bg-amber-500/20 text-amber-500 font-bold">
            NUEVO
          </span>
        </button>

        <button
          type="button"
          onClick={() => {
            sound.tap();
            setShopTab('banners');
          }}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl font-medium text-xs transition-all cursor-pointer ${
            shopTab === 'banners'
              ? 'bg-foreground text-background font-semibold shadow-xs'
              : 'text-foreground-muted hover:text-foreground'
          }`}
        >
          <Crown className="w-3.5 h-3.5 text-amber-400" />
          <span>Banners VIP</span>
        </button>
      </div>

      {petSuccessMessage && (
        <div className="p-3.5 rounded-xl bg-success-subtle border border-success/30 text-success text-xs flex items-center justify-between font-medium">
          <span>{petSuccessMessage}</span>
          <button type="button" onClick={() => setPetSuccessMessage(null)} className="text-success opacity-70 hover:opacity-100 cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {errorMessage && (
        <div className="p-3.5 rounded-xl bg-danger-subtle border border-danger/30 text-danger text-xs flex items-center justify-between font-medium">
          <span>{errorMessage}</span>
          <button type="button" onClick={() => setErrorMessage(null)} className="text-danger opacity-70 hover:opacity-100 cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {shopTab === 'mascotas' ? (
        /* ================= VISTA DE MASCOTAS ================= */
        <div className="space-y-6">
          <div className="rounded-2xl border border-border bg-surface p-6 sm:p-7 space-y-6 shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 border-b border-border/80 pb-5">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center gap-1 text-[11px] font-mono px-2 py-0.5 rounded-md bg-surface-raised border border-border text-foreground font-medium">
                    <Sparkles className="w-3 h-3 text-amber-500" />
                    <span>Coleccionables Oficiales</span>
                  </span>
                  <span className="text-[11px] font-mono text-foreground-subtle">
                    Acompañantes 2º SMR
                  </span>
                </div>

                <h2 className="text-lg sm:text-xl font-semibold text-foreground tracking-tight">
                  Mascotas del Aula
                </h2>

                <p className="text-xs text-foreground-muted max-w-xl leading-relaxed">
                  Compañeros legendarios que te acompañan junto a tu perfil y en cada publicación del Feed. Cada uno posee habilidades pasivas reales (ayuda en botellón, ahorro en comisiones de bolsa o recompensas espontáneas).
                </p>
              </div>
            </div>

            {/* Catálogo de Mascotas en Grid Master-Detail */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-5">
              {/* Lista lateral */}
              <div className="md:col-span-5 space-y-2">
                <div className="text-[10px] font-mono uppercase tracking-wider text-foreground-subtle px-1">
                  Catálogo ({PETS_REGISTRY.length})
                </div>

                {PETS_REGISTRY.map((pet) => {
                  const isSelected = pet.id === selectedPetId;
                  const isOwned = unlockedPets.includes(pet.id);
                  const isEquipped = equippedPetId === pet.id;

                  return (
                    <button
                      key={pet.id}
                      type="button"
                      onClick={() => {
                        sound.tap();
                        setSelectedPetId(pet.id);
                      }}
                      className={`w-full text-left p-3 rounded-2xl border transition-all cursor-pointer flex items-center gap-3 ${
                        isSelected
                          ? 'bg-surface-raised border-foreground/30 shadow-xs ring-1 ring-foreground/20'
                          : 'bg-surface border-border hover:bg-surface-raised/40 hover:border-neutral-500'
                      }`}
                    >
                      <div className="relative w-12 h-12 rounded-xl overflow-hidden bg-surface-raised border border-border shrink-0 p-1 flex items-center justify-center">
                        <Image
                          src={pet.image}
                          alt={pet.name}
                          width={44}
                          height={44}
                          className="object-contain"
                        />
                        {isEquipped && (
                          <span className="absolute top-1 right-1 w-2.5 h-2.5 rounded-full bg-emerald-500 border border-surface" />
                        )}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-1">
                          <span className="font-semibold text-xs text-foreground truncate">{pet.name}</span>
                          {isEquipped ? (
                            <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30 shrink-0 font-bold">
                              Equipada
                            </span>
                          ) : isOwned ? (
                            <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-surface-raised text-foreground-muted border border-border shrink-0">
                              En propiedad
                            </span>
                          ) : (
                            <span className="text-[10px] font-mono font-bold text-foreground-muted shrink-0">
                              {formatCoinsAbbreviated(pet.price)}
                            </span>
                          )}
                        </div>

                        <div className="text-[11px] text-foreground-subtle truncate mt-0.5">
                          {pet.subtitle}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Ficha de detalle de la mascota seleccionada */}
              <div className="md:col-span-7 flex flex-col rounded-2xl bg-surface-raised/40 border border-border p-5 space-y-4">
                <div className="flex items-start gap-4">
                  <div className="relative w-24 h-24 sm:w-28 sm:h-28 rounded-2xl bg-surface-raised border border-border p-2 flex items-center justify-center shrink-0">
                    <Image
                      src={selectedPet.image}
                      alt={selectedPet.name}
                      width={100}
                      height={100}
                      className="object-contain max-h-full"
                    />
                    {isSelectedPetEquipped && (
                      <div className="absolute -bottom-2 -right-2 px-2 py-0.5 rounded-full bg-emerald-500 text-black font-mono text-[10px] font-extrabold shadow-xs">
                        ✓ ACTIVA
                      </div>
                    )}
                  </div>

                  <div className="flex-1 min-w-0 space-y-1">
                    <div className="inline-block px-2 py-0.5 rounded-md border text-[10px] font-mono font-medium uppercase bg-surface border-border text-foreground-muted">
                      {selectedPet.tierBadge}
                    </div>
                    <h3 className="text-lg font-bold text-foreground tracking-tight leading-tight">
                      {selectedPet.name}
                    </h3>
                    <p className="text-xs text-foreground-muted">{selectedPet.subtitle}</p>
                    <div className="pt-1 flex items-center gap-1.5 text-xs font-mono font-bold text-foreground-muted">
                      <Coins className="w-3.5 h-3.5" />
                      <span>{selectedPet.price.toLocaleString('es-ES')} monedas</span>
                    </div>
                  </div>
                </div>

                <div className="p-3.5 rounded-xl bg-surface border border-border text-xs text-foreground-muted leading-relaxed">
                  {selectedPet.description}
                </div>

                <div className="p-3.5 rounded-xl bg-surface border border-border space-y-1">
                  <div className="flex items-center gap-2 text-xs font-semibold text-foreground">
                    <Sparkles className="w-3.5 h-3.5 text-accent" />
                    <span>Habilidad: {selectedPet.perkName}</span>
                  </div>
                  <p className="text-xs text-foreground-muted leading-normal">
                    {selectedPet.perkDescription}
                  </p>
                </div>

                <div className="p-3 rounded-xl bg-surface/70 border border-border/80 space-y-1.5">
                  <div className="text-[10px] font-mono uppercase tracking-wider text-foreground-subtle">
                    Previsualización en Perfil y Feed
                  </div>
                  <div className="flex items-center gap-2 p-2 rounded-lg bg-surface-raised border border-border">
                    <div className="w-5 h-5 rounded-full bg-emerald-600 flex items-center justify-center font-mono text-[9px] font-bold text-white shrink-0">
                      {currentUser?.username ? currentUser.username.charAt(0).toUpperCase() : 'U'}
                    </div>
                    <span className="text-xs font-medium text-foreground">
                      @{currentUser?.username || 'tu_usuario'}
                    </span>
                    <span className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded-full bg-surface border border-border text-[10px] font-mono text-foreground-muted">
                      <img
                        src={selectedPet.image}
                        alt={selectedPet.name}
                        className="w-3.5 h-3.5 rounded-full object-cover shrink-0"
                      />
                      <span>{selectedPet.name.split(' ')[0]}</span>
                    </span>
                  </div>
                </div>

                {/* Botón de acción */}
                <div className="pt-2 mt-auto">
                  {isSelectedPetOwned ? (
                    <button
                      type="button"
                      onClick={() => handleToggleEquipPet(selectedPet.id)}
                      disabled={isPetProcessing}
                      className={`w-full py-2.5 rounded-xl font-semibold text-xs transition-all cursor-pointer flex items-center justify-center gap-2 active:scale-95 ${
                        isSelectedPetEquipped
                          ? 'bg-surface-raised text-foreground border border-border hover:bg-danger-subtle hover:border-danger/30 hover:text-danger'
                          : 'bg-accent text-accent-foreground hover:opacity-90'
                      }`}
                    >
                      {isSelectedPetEquipped ? (
                        <>
                          <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                          <span>Equipada (Clic para desequipar)</span>
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-4 h-4" />
                          <span>Equipar Mascota</span>
                        </>
                      )}
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => handleBuyPet(selectedPet)}
                      disabled={isPetProcessing || !canAffordSelectedPet}
                      className={`w-full py-2.5 rounded-xl font-semibold text-xs transition-all flex items-center justify-center gap-2 ${
                        canAffordSelectedPet
                          ? 'bg-accent text-accent-foreground hover:opacity-90 cursor-pointer active:scale-95'
                          : 'bg-surface-raised text-foreground-subtle border border-border cursor-not-allowed opacity-50'
                      }`}
                    >
                      {isPetProcessing ? (
                        <span className="w-3.5 h-3.5 border-2 border-background border-t-transparent rounded-full animate-spin" />
                      ) : canAffordSelectedPet ? (
                        <>
                          <Coins className="w-3.5 h-3.5" />
                          <span>Adquirir por {selectedPet.price.toLocaleString('es-ES')} monedas</span>
                        </>
                      ) : (
                        <>
                          <Lock className="w-3.5 h-3.5" />
                          <span>Faltan {(selectedPet.price - userCoins).toLocaleString('es-ES')} monedas</span>
                        </>
                      )}
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* ================= VISTA DE BANNERS ================= */
      <div className="rounded-2xl border border-border bg-surface p-6 sm:p-7 space-y-6 shadow-xs">
        {/* Cabecera del producto */}
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 border-b border-border/80 pb-5">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1 text-[11px] font-mono px-2 py-0.5 rounded-md bg-surface-raised border border-border text-foreground font-medium">
                <Crown className="w-3 h-3 text-foreground-muted" />
                <span>Edición Limitada</span>
              </span>
              <span className="text-[11px] font-mono text-foreground-subtle">
                Permanente
              </span>
            </div>

            <h2 className="text-lg sm:text-xl font-semibold text-foreground tracking-tight">
              Banner de Perfil Personalizado
            </h2>

            <p className="text-xs text-foreground-muted max-w-xl leading-relaxed">
              Sustituye la cabecera estándar de tu credencial digital y destaca en el portal. Permite seleccionar estilos predefinidos o una imagen propia por URL, título honorífico y eslogan.
            </p>
          </div>

          <div className="flex flex-col items-start sm:items-end shrink-0 font-mono">
            <span className="text-[10px] uppercase text-foreground-subtle tracking-wider">
              Precio fijo
            </span>
            <div className="flex items-center gap-1.5 text-xl sm:text-2xl font-semibold text-foreground tabular-nums">
              <Coins className="w-4 h-4 text-foreground-muted" />
              <span>13.000.000</span>
            </div>
            <span className="text-[11px] text-foreground-subtle">13 Millones de fichas</span>
          </div>
        </div>

        {/* 4. Panel de Propietario vs Panel de Compra */}
        {isOwner ? (
          <div className="space-y-6">
            <div className="flex items-center justify-between p-3 rounded-xl bg-surface-raised border border-border text-xs">
              <div className="flex items-center gap-2 text-foreground font-medium">
                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                <span>Artículo desbloqueado en tu cuenta</span>
              </div>
              <span className="px-2 py-0.5 rounded-md bg-surface border border-border text-[11px] font-mono text-foreground-muted">
                Configuración activa
              </span>
            </div>

            {/* VISTA PREVIA MINIMALISTA ANTI-AI */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs font-mono text-foreground-muted">
                <span className="flex items-center gap-1.5">
                  <Sliders className="w-3.5 h-3.5" />
                  <span>Previsualización de la tarjeta</span>
                </span>
                <span className="text-[11px] text-foreground-subtle">En tiempo real</span>
              </div>

              <div
                className={`relative rounded-xl overflow-hidden border ${currentPreset.border} p-5 sm:p-6 transition-all duration-200 select-text`}
                style={
                  selectedStyle === 'custom_image' && customImageUrl.trim()
                    ? {
                        backgroundImage: `url(${customImageUrl})`,
                        backgroundSize: 'cover',
                        backgroundPosition: 'center',
                      }
                    : undefined
                }
              >
                {/* Capa de fondo si no es imagen */}
                {(selectedStyle !== 'custom_image' || !customImageUrl.trim()) && (
                  <div className={`absolute inset-0 ${currentPreset.gradient} opacity-95`} />
                )}

                {/* Sombra de viñeta para legibilidad tipográfica */}
                <div className="absolute inset-0 bg-black/40 backdrop-blur-[0.5px]" />

                <div className="relative z-10 flex flex-col justify-between min-h-[130px] text-white space-y-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-1.5">
                        <span
                          className={`inline-flex items-center gap-1 text-[10px] font-mono font-medium px-2 py-0.5 rounded border ${currentPreset.badgeBg} uppercase tracking-wider`}
                        >
                          {currentPreset.badge}
                        </span>
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-black/50 text-neutral-300 border border-white/10">
                          13M Tier
                        </span>
                      </div>

                      <h3 className="text-base sm:text-lg font-bold tracking-tight text-white pt-1">
                        {customTitle || 'Título Personalizado'}
                      </h3>
                      <p className="text-xs font-mono text-neutral-300">
                        @{currentUser?.username || 'usuario'} · 2º SMR Aula 35
                      </p>
                    </div>

                    <div className="w-8 h-8 rounded-lg bg-black/50 border border-white/20 p-1.5 flex items-center justify-center shrink-0">
                      <Image
                        src="/logo.png"
                        alt="Logo"
                        width={20}
                        height={20}
                        className="object-contain"
                      />
                    </div>
                  </div>

                  <div className="pt-2.5 border-t border-white/15 flex items-center justify-between gap-3 text-xs text-neutral-300">
                    <p className="italic truncate font-sans max-w-md">
                      «{customQuote || 'Cita de perfil personalizada...'}»
                    </p>
                    <span className="text-[10px] font-mono text-neutral-400 shrink-0">
                      Aula 35
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* SELECTOR DE ESTILOS */}
            <div className="space-y-3 pt-1">
              <label className="text-xs font-mono font-medium text-foreground flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-foreground-muted" />
                <span>1. Estilo de fondo:</span>
              </label>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
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
                      className={`p-3 rounded-xl border text-left transition-all cursor-pointer relative active:scale-98 ${
                        isSelected
                          ? 'border-foreground bg-surface-raised shadow-xs ring-1 ring-foreground/20'
                          : 'border-border bg-surface hover:bg-surface-raised hover:border-border-focus/50'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-1.5 text-xs font-medium text-foreground">
                          {renderPresetIcon(preset.iconType)}
                          <span>{preset.name}</span>
                        </div>
                        {isSelected && (
                          <Check className="w-3.5 h-3.5 text-foreground shrink-0" />
                        )}
                      </div>
                      <p className="text-[11px] text-foreground-muted leading-relaxed line-clamp-2">
                        {preset.desc}
                      </p>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* CAMPO DE URL SI ES IMAGEN EXTERNA */}
            {selectedStyle === 'custom_image' && (
              <div className="p-3.5 rounded-xl bg-surface-raised border border-border space-y-1.5 animate-in fade-in duration-150">
                <label className="text-xs font-mono font-medium text-foreground flex items-center gap-1.5">
                  <ImageIcon className="w-3.5 h-3.5 text-foreground-muted" />
                  <span>URL directa de la imagen (HTTPS):</span>
                </label>
                <input
                  type="url"
                  value={customImageUrl}
                  onChange={(e) => setCustomImageUrl(e.target.value)}
                  placeholder="https://images.unsplash.com/... o enlace directo .png / .jpg"
                  className="w-full bg-surface border border-border rounded-lg px-3 py-2 text-xs text-foreground placeholder:text-foreground-subtle outline-none focus:border-border-focus transition-colors font-mono"
                />
                <span className="text-[10px] text-foreground-subtle block font-mono">
                  Formatos recomendados: JPG, PNG o WebP en relación horizontal.
                </span>
              </div>
            )}

            {/* CAMPOS DE TEXTO */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-1">
              <div className="space-y-1">
                <label className="text-xs font-mono font-medium text-foreground">
                  2. Título o cargo personalizado:
                </label>
                <input
                  type="text"
                  maxLength={35}
                  value={customTitle}
                  onChange={(e) => setCustomTitle(e.target.value)}
                  placeholder="ej. Don Juanfe / Administrador de Redes"
                  className="w-full bg-surface-raised border border-border rounded-xl px-3 py-2 text-xs text-foreground placeholder:text-foreground-subtle outline-none focus:border-border-focus transition-colors"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-mono font-medium text-foreground">
                  3. Frase o cita breve:
                </label>
                <input
                  type="text"
                  maxLength={70}
                  value={customQuote}
                  onChange={(e) => setCustomQuote(e.target.value)}
                  placeholder="ej. Todo bajo control en el Aula 35."
                  className="w-full bg-surface-raised border border-border rounded-xl px-3 py-2 text-xs text-foreground placeholder:text-foreground-subtle outline-none focus:border-border-focus transition-colors"
                />
              </div>
            </div>

            {/* BOTÓN GUARDAR CONFIGURACIÓN */}
            <div className="flex items-center justify-between pt-2 border-t border-border">
              {saveSuccess ? (
                <div className="flex items-center gap-1.5 text-xs text-emerald-500 font-medium font-mono animate-in fade-in">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Configuración guardada correctamente</span>
                </div>
              ) : (
                <span className="text-[11px] text-foreground-subtle font-mono">
                  Visible en tu carnet y para compañeros que consulten tu ficha.
                </span>
              )}

              <button
                type="button"
                onClick={handleSaveCustomization}
                disabled={isSaving}
                className="px-4 py-2 rounded-xl bg-foreground text-background font-medium text-xs hover:opacity-90 transition-all active:scale-95 cursor-pointer disabled:opacity-40 flex items-center gap-1.5 ml-auto shadow-2xs"
              >
                {isSaving ? (
                  <span className="w-3 h-3 border-2 border-background border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Check className="w-3.5 h-3.5" />
                )}
                <span>Guardar cambios</span>
              </button>
            </div>
          </div>
        ) : (
          /* SECCIÓN DE ADQUISICIÓN */
          <div className="space-y-5">
            {/* Barra de progreso limpia y minimalista */}
            <div className="p-4 rounded-xl bg-surface-raised border border-border space-y-2.5">
              <div className="flex items-center justify-between text-xs font-mono">
                <span className="text-foreground-muted">Progreso hacia 13.000.000:</span>
                <span className="font-semibold text-foreground tabular-nums">
                  {progressPercent.toFixed(1)}% ({userCoins.toLocaleString('es-ES')} / 13.000.000)
                </span>
              </div>

              <div className="w-full h-2 rounded-full bg-surface border border-border overflow-hidden">
                <div
                  className="h-full rounded-full bg-foreground transition-all duration-300"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>

              {!canAfford && (
                <div className="flex items-center justify-between pt-0.5 text-[11px] text-foreground-subtle">
                  <span>
                    Faltan {(BANNER_PRICE - userCoins).toLocaleString('es-ES')} fichas.
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      sound.tap();
                      onNavigateToPartyIdle();
                    }}
                    className="text-foreground underline underline-offset-2 hover:opacity-80 cursor-pointer font-medium"
                  >
                    Abrir El Botellón
                  </button>
                </div>
              )}
            </div>

            {/* Muestra de la tarjeta */}
            <div className="space-y-1.5">
              <span className="text-[11px] font-mono text-foreground-subtle">
                Aspecto tras la adquisición:
              </span>
              <div className="rounded-xl border border-border bg-gradient-to-r from-neutral-900 via-amber-950/70 to-neutral-900 p-4 text-white">
                <div className="flex items-start justify-between">
                  <div className="space-y-0.5">
                    <span className="text-[10px] font-mono font-medium px-1.5 py-0.5 rounded bg-black/40 text-amber-200 border border-amber-300/30 uppercase inline-block mb-1">
                      OBSIDIAN GOLD
                    </span>
                    <h3 className="text-sm font-semibold tracking-tight text-white">
                      Magnate del Botellón
                    </h3>
                    <p className="text-[11px] font-mono text-neutral-300">
                      @{currentUser?.username || 'usuario'} · 2º SMR Aula 35
                    </p>
                  </div>
                  <Crown className="w-4 h-4 text-amber-400" />
                </div>
              </div>
            </div>

            {errorMessage && (
              <div className="p-3 rounded-xl bg-danger-subtle border border-danger/30 text-danger text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* Botón de compra minimalista */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2 border-t border-border">
              <span className="text-xs text-foreground-muted font-mono">
                {canAfford
                  ? 'Saldo suficiente para adquirir este artículo.'
                  : `Requiere ${(BANNER_PRICE - userCoins).toLocaleString('es-ES')} fichas adicionales.`}
              </span>

              <button
                type="button"
                onClick={handleBuyBanner}
                disabled={!canAfford || isBuying}
                className={`w-full sm:w-auto px-5 py-2.5 rounded-xl font-medium text-xs transition-all active:scale-95 cursor-pointer flex items-center justify-center gap-2 shadow-xs ${
                  canAfford
                    ? 'bg-foreground text-background hover:opacity-90'
                    : 'bg-surface-raised text-foreground-subtle border border-border cursor-not-allowed opacity-50'
                }`}
              >
                {isBuying ? (
                  <span className="w-3.5 h-3.5 border-2 border-background border-t-transparent rounded-full animate-spin" />
                ) : canAfford ? (
                  <Crown className="w-3.5 h-3.5" />
                ) : (
                  <Lock className="w-3.5 h-3.5" />
                )}
                <span>
                  {canAfford
                    ? 'Adquirir por 13.000.000 fichas'
                    : '13.000.000 fichas requeridas'}
                </span>
              </button>
            </div>
          </div>
        )}
      </div>
      )}
    </div>
  );
};
