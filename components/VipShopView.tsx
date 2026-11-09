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
} from 'lucide-react';
import { UserProfile } from '@/lib/types';
import { sound } from '@/lib/audio';
import confetti from 'canvas-confetti';
import { createClient } from '@/lib/supabase/client';

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
}

export const VipShopView: React.FC<VipShopViewProps> = ({
  currentUser,
  onOpenAuth,
  onUpdateUser,
  onNavigateToPartyIdle,
  onBackToFeed,
}) => {
  const userCoins = currentUser ? Number(currentUser.coins || 0) : 0;
  const itemsComprados = Array.isArray(currentUser?.items_comprados)
    ? currentUser!.items_comprados!
    : [];

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
      const nextCoins = userCoins - BANNER_PRICE;
      const nextItems = Array.from(new Set([...itemsComprados, 'banner_vip_13m']));
      const defaultStyle = 'gold_luxury';
      const defaultTitle = customTitle.trim() || 'Magnate del Botellón';
      const defaultQuote = customQuote.trim() || 'Construyendo el aula más rápida del instituto.';

      const supabase = createClient();
      if (supabase && currentUser.id) {
        await supabase
          .from('profiles')
          .update({
            coins: nextCoins,
            items_comprados: nextItems,
            banner_estilo: defaultStyle,
            titulo_personalizado: defaultTitle,
            frase: defaultQuote,
          })
          .eq('id', currentUser.id);

        try {
          await supabase.from('chat_messages').insert([
            {
              username: 'SMR2',
              text: `Aviso oficial: @${currentUser.username} ha adquirido el Banner de Perfil en la Tienda Oficial por 13.000.000 fichas.`,
              tag: 'aviso',
              pinned: false,
            },
          ]);
        } catch (_) {}
      }

      const updatedProfile: UserProfile = {
        ...currentUser,
        coins: nextCoins,
        items_comprados: nextItems,
        banner_estilo: defaultStyle,
        titulo_personalizado: defaultTitle,
        frase: defaultQuote,
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

      const supabase = createClient();
      if (supabase && currentUser.id) {
        await supabase
          .from('profiles')
          .update({
            banner_estilo: finalStyle,
            titulo_personalizado: finalTitle,
            frase: finalQuote,
          })
          .eq('id', currentUser.id);
      }

      const updatedProfile: UserProfile = {
        ...currentUser,
        banner_estilo: finalStyle,
        titulo_personalizado: finalTitle,
        frase: finalQuote,
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

      {/* 3. Ficha de Producto: Banner de Perfil Personalizado */}
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
    </div>
  );
};
