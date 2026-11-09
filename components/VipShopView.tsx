'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import {
  ShoppingBag,
  Crown,
  Sparkles,
  Coins,
  Check,
  Wine,
  ArrowRight,
  Palette,
  Image as ImageIcon,
  Flame,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  ChevronLeft,
} from 'lucide-react';
import { UserProfile } from '@/lib/types';
import { sound } from '@/lib/audio';
import confetti from 'canvas-confetti';
import { createClient } from '@/lib/supabase/client';

export const BANNER_PRICE = 13_000_000; // 13 Millones de fichas

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
    name: 'Oro Puro & Diamante VIP',
    desc: 'Efecto de oro brillante reflectante con corona nobiliaria y destellos.',
    gradient: 'bg-gradient-to-r from-amber-600 via-yellow-400 to-amber-700',
    border: 'border-amber-400/80',
    badge: '👑 ORO VIP',
    textColor: 'text-amber-950',
    badgeBg: 'bg-black/30 text-amber-200 border-amber-300/40',
    glow: 'shadow-[0_0_30px_rgba(251,191,36,0.3)]',
  },
  {
    id: 'cyberpunk_neon',
    name: 'Cyberpunk Neón Aula 35',
    desc: 'Resplandor cian, magenta y violeta retrofuturista de alta tensión.',
    gradient: 'bg-gradient-to-r from-cyan-500 via-purple-600 to-pink-500',
    border: 'border-pink-500/80',
    badge: '⚡ CYBERPUNK',
    textColor: 'text-white',
    badgeBg: 'bg-black/40 text-cyan-300 border-cyan-400/40',
    glow: 'shadow-[0_0_30px_rgba(236,72,153,0.3)]',
  },
  {
    id: 'matrix_terminal',
    name: 'Matrix Terminal Hacker',
    desc: 'Estilo terminal root de consola Linux con verde fósforo.',
    gradient: 'bg-gradient-to-r from-black via-emerald-950 to-black',
    border: 'border-emerald-500/80',
    badge: '💻 ROOT 0x00',
    textColor: 'text-emerald-300',
    badgeBg: 'bg-emerald-950/80 text-emerald-300 border-emerald-500/50',
    glow: 'shadow-[0_0_30px_rgba(16,185,129,0.3)]',
  },
  {
    id: 'sunset_synth',
    name: 'Atardecer Synthwave 80s',
    desc: 'Púrpura retro, magenta eléctrico y sol naranja de California.',
    gradient: 'bg-gradient-to-r from-purple-900 via-rose-600 to-amber-500',
    border: 'border-rose-400/80',
    badge: '🌅 SYNTHWAVE',
    textColor: 'text-white',
    badgeBg: 'bg-black/40 text-rose-200 border-rose-400/40',
    glow: 'shadow-[0_0_30px_rgba(244,63,94,0.3)]',
  },
  {
    id: 'amethyst_galaxy',
    name: 'Amatista Cósmica',
    desc: 'Nebulosa púrpura profunda con partículas estelares brillantes.',
    gradient: 'bg-gradient-to-r from-indigo-950 via-purple-800 to-violet-900',
    border: 'border-purple-400/80',
    badge: '🔮 CÓSMICO',
    textColor: 'text-purple-100',
    badgeBg: 'bg-black/40 text-purple-300 border-purple-400/40',
    glow: 'shadow-[0_0_30px_rgba(168,85,247,0.3)]',
  },
  {
    id: 'custom_image',
    name: 'Imagen Personalizada por URL',
    desc: 'Introduce cualquier enlace directo de imagen (HTTPS) como fondo.',
    gradient: 'bg-neutral-900',
    border: 'border-neutral-500',
    badge: '🖼️ CUSTOM URL',
    textColor: 'text-white',
    badgeBg: 'bg-black/60 text-neutral-200 border-neutral-400/40',
    glow: 'shadow-[0_0_30px_rgba(255,255,255,0.15)]',
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

  // Estados del editor de personalización
  const [selectedStyle, setSelectedStyle] = useState<string>(
    currentUser?.banner_estilo || 'gold_luxury'
  );
  const [customTitle, setCustomTitle] = useState<string>(
    currentUser?.titulo_personalizado || '👑 Magnate del Botellón'
  );
  const [customQuote, setCustomQuote] = useState<string>(
    currentUser?.frase || 'El dinero no da la felicidad, pero compra este banner.'
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
        `Te faltan ${(BANNER_PRICE - userCoins).toLocaleString('es-ES')} monedas. ¡Ve al Botellón a farmear!`
      );
      return;
    }

    if (
      !window.confirm(
        '¿Deseas gastar 13.000.000 de monedas para comprar el Banner de Perfil Legendario Personalizable?'
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
      const defaultTitle = customTitle.trim() || '👑 Magnate del Botellón';
      const defaultQuote = customQuote.trim() || 'El dinero no da la felicidad, pero compra este banner.';

      // Actualizar en Supabase
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

        // Publicar anuncio en el feed de la clase sobre la compra millonaria
        try {
          await supabase.from('chat_messages').insert([
            {
              username: 'SMR2',
              text: `👑 ¡ATENCIÓN AULA 35! @${currentUser.username} acaba de comprar el legendario BANNER DE PERFIL PERSONALIZADO por 13.000.000 de monedas. ¡Hay un nuevo magnate en la clase!`,
              tag: 'aviso',
              pinned: false,
            },
          ]);
        } catch (_) {}
      }

      // Actualizar usuario en cliente
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

      // Confeti de celebración
      try {
        confetti({
          particleCount: 150,
          spread: 90,
          origin: { y: 0.6 },
          colors: ['#f59e0b', '#ec4899', '#06b6d4', '#10b981', '#8b5cf6'],
        });
      } catch (_) {}
    } catch (err: any) {
      console.error('Error al comprar banner:', err);
      setErrorMessage(err?.message || 'Error al procesar la compra.');
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

      const finalTitle = customTitle.trim() || '👑 Magnate del Botellón';
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
      setErrorMessage(err?.message || 'No se pudieron guardar los cambios.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto space-y-6 pb-12 font-sans select-none">
      {/* Botón Volver y Cabecera de la Tienda */}
      <div className="flex items-center justify-between gap-4">
        <button
          type="button"
          onClick={() => {
            sound.tap();
            onBackToFeed();
          }}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-neutral-900 border border-neutral-800 text-xs text-neutral-300 hover:text-white hover:bg-neutral-800 cursor-pointer transition-all active:scale-95"
        >
          <ChevronLeft className="w-4 h-4" />
          <span>Volver al Feed</span>
        </button>

        {/* Saldo de fichas */}
        <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-2xl bg-neutral-900/90 border border-neutral-800 shadow-sm font-mono text-xs">
          <Coins className="w-4 h-4 text-amber-400" />
          <span className="text-neutral-400">Tus Fichas:</span>
          <span className="font-bold text-white text-sm">
            {userCoins.toLocaleString('es-ES')}
          </span>
        </div>
      </div>

      {/* Hero Banner de la Tienda */}
      <div className="relative rounded-3xl overflow-hidden border border-amber-500/30 bg-gradient-to-br from-neutral-950 via-[#121008] to-neutral-950 p-6 sm:p-8 shadow-2xl">
        <div className="absolute top-0 right-0 w-80 h-80 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-lg">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/20 border border-amber-500/30 text-amber-300 text-xs font-mono font-semibold">
              <Crown className="w-3.5 h-3.5 text-amber-400" />
              <span>BOUTIQUE DE LUJO · AULA 35</span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight flex items-center gap-2.5">
              <span>Tienda Exclusiva SMR2</span>
              <Sparkles className="w-6 h-6 text-amber-400 animate-pulse" />
            </h1>

            <p className="text-xs sm:text-sm text-neutral-400 leading-relaxed">
              El lugar donde los magnates del Botellón gastan sus millones en artículos de
              estatus legendario. Personaliza tu presencia oficial en el instituto.
            </p>
          </div>

          <button
            type="button"
            onClick={() => {
              sound.tap();
              onNavigateToPartyIdle();
            }}
            className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-neutral-900 hover:bg-neutral-800 border border-neutral-700/80 text-xs font-semibold text-neutral-200 transition-all cursor-pointer active:scale-95 shadow-md shrink-0"
          >
            <Wine className="w-4 h-4 text-rose-400" />
            <div className="text-left">
              <span className="block text-[10px] text-neutral-400 uppercase font-mono">
                ¿Necesitas dinero?
              </span>
              <span>Farmear en el Botellón</span>
            </div>
            <ArrowRight className="w-3.5 h-3.5 ml-1 text-neutral-400" />
          </button>
        </div>
      </div>

      {/* Producto Estrella: Banner de Perfil Personalizado */}
      <div className="rounded-3xl border border-neutral-800 bg-[#0c0c10] p-6 sm:p-8 space-y-6 shadow-xl relative overflow-hidden">
        {/* Cabecera del producto */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-neutral-800/80 pb-5">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-mono px-2.5 py-0.5 rounded-md bg-amber-500/15 border border-amber-500/30 text-amber-300 font-bold">
                👑 OBJETO LEGENDARIO
              </span>
              <span className="text-[11px] font-mono px-2 py-0.5 rounded-md bg-neutral-800 text-neutral-400">
                EDICIÓN PERMANENTE
              </span>
            </div>

            <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight flex items-center gap-2">
              <span>Banner de Perfil Personalizado</span>
            </h2>

            <p className="text-xs text-neutral-400 max-w-xl leading-relaxed">
              Aparece en la cabecera de tu Ficha Oficial de Estudiante y destaca en todo el
              portal. Puedes personalizar el fondo con temas neón, oro, synthwave o tu propia imagen,
              más tu título y eslogan nobiliario.
            </p>
          </div>

          <div className="flex flex-col items-start sm:items-end shrink-0">
            <span className="text-[11px] font-mono text-neutral-500 uppercase">Precio oficial</span>
            <span className="text-2xl sm:text-3xl font-extrabold text-amber-400 font-mono tracking-tight flex items-center gap-1.5">
              <span>13.000.000</span>
              <span className="text-base text-amber-500">🪙</span>
            </span>
            <span className="text-[11px] text-neutral-500 font-mono">13 Millones de fichas</span>
          </div>
        </div>

        {/* Estado del usuario: Propietario vs No Propietario */}
        {isOwner ? (
          <div className="space-y-6">
            <div className="flex items-center justify-between p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-semibold">
              <div className="flex items-center gap-2">
                <Crown className="w-4 h-4 text-amber-400" />
                <span>¡Ya posees este artículo! Personaliza tu banner a continuación:</span>
              </div>
              <span className="px-2 py-0.5 rounded-full bg-amber-400/20 text-[10px] font-mono">
                PROPIETARIO VIP
              </span>
            </div>

            {/* VISTA PREVIA EN TIEMPO REAL */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs font-mono text-neutral-400">
                <span className="flex items-center gap-1.5">
                  <Palette className="w-3.5 h-3.5 text-neutral-400" />
                  <span>Vista previa de tu Ficha Oficial</span>
                </span>
                <span className="text-[11px] text-neutral-500">Actualización en vivo</span>
              </div>

              {/* Contenedor del banner simulado */}
              <div
                className={`relative rounded-2xl overflow-hidden border ${currentPreset.border} ${currentPreset.glow} p-5 sm:p-6 transition-all duration-300`}
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
                {/* Fondo con gradiente si no es imagen */}
                {(selectedStyle !== 'custom_image' || !customImageUrl.trim()) && (
                  <div className={`absolute inset-0 ${currentPreset.gradient} opacity-95`} />
                )}

                {/* Sombra de superposición para legibilidad */}
                <div className="absolute inset-0 bg-black/40 backdrop-blur-[1px]" />

                <div className="relative z-10 flex flex-col justify-between min-h-[140px] text-white">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <span
                        className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-md border ${currentPreset.badgeBg} uppercase tracking-wider inline-block mb-1`}
                      >
                        {currentPreset.badge}
                      </span>
                      <h3 className="text-lg sm:text-xl font-black tracking-tight drop-shadow-md">
                        {customTitle || 'Título Personalizado'}
                      </h3>
                      <p className="text-xs font-mono text-neutral-300">
                        @{currentUser?.username || 'tu_usuario'} · 2º SMR Aula 35
                      </p>
                    </div>

                    <div className="w-10 h-10 rounded-xl bg-black/50 border border-white/20 p-2 flex items-center justify-center shrink-0 shadow-lg">
                      <Image
                        src="/logo.png"
                        alt="Logo"
                        width={28}
                        height={28}
                        className="object-contain"
                      />
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-white/20 flex items-center justify-between gap-3">
                    <p className="text-xs text-neutral-200 italic font-sans max-w-md truncate">
                      «{customQuote || 'Tu eslogan o frase aquí...'}»
                    </p>
                    <span className="text-[10px] font-mono bg-black/50 px-2 py-0.5 rounded text-amber-300 border border-amber-400/30 shrink-0">
                      13M VIP
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* SELECTOR DE ESTILOS */}
            <div className="space-y-3 pt-2">
              <label className="text-xs font-semibold text-neutral-300 flex items-center gap-1.5 font-mono">
                <Palette className="w-3.5 h-3.5 text-amber-400" />
                <span>1. Elige tu estilo visual exclusivo:</span>
              </label>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
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
                      className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer relative overflow-hidden group active:scale-95 ${
                        isSelected
                          ? `${preset.border} bg-neutral-900/90 shadow-md ring-2 ring-amber-400/50`
                          : 'border-neutral-800 bg-neutral-900/40 hover:bg-neutral-900 hover:border-neutral-700'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="font-bold text-xs text-white tracking-tight">
                          {preset.name}
                        </span>
                        {isSelected && (
                          <span className="w-4 h-4 rounded-full bg-amber-400 text-black flex items-center justify-center">
                            <Check className="w-3 h-3 stroke-[3]" />
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-neutral-400 leading-snug line-clamp-2">
                        {preset.desc}
                      </p>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* ENTRADA DE IMAGEN PERSONALIZADA (SI SE SELECCIONA CUSTOM_IMAGE) */}
            {selectedStyle === 'custom_image' && (
              <div className="p-4 rounded-2xl bg-neutral-900 border border-neutral-800 space-y-2 animate-in fade-in duration-200">
                <label className="text-xs font-mono font-medium text-neutral-300 flex items-center gap-1.5">
                  <ImageIcon className="w-3.5 h-3.5 text-sky-400" />
                  <span>URL directa de la imagen (HTTPS):</span>
                </label>
                <input
                  type="url"
                  value={customImageUrl}
                  onChange={(e) => setCustomImageUrl(e.target.value)}
                  placeholder="https://ejemplo.com/tu-fondo-favorito.jpg"
                  className="w-full bg-neutral-950 border border-neutral-700 rounded-xl px-3.5 py-2 text-xs text-white placeholder:text-neutral-500 outline-none focus:border-amber-400 transition-colors font-mono"
                />
                <p className="text-[10px] text-neutral-500">
                  Usa enlaces directos que terminen en .jpg, .png o .webp (p. ej. Imgur, Unsplash).
                </p>
              </div>
            )}

            {/* CAMPOS DE TEXTO PERSONALIZADO */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
              <div className="space-y-1.5">
                <label className="text-xs font-mono font-medium text-neutral-300">
                  2. Título o cargo personalizado (máx. 35 letras):
                </label>
                <input
                  type="text"
                  maxLength={35}
                  value={customTitle}
                  onChange={(e) => setCustomTitle(e.target.value)}
                  placeholder="ej. Don Juanfe / Máster de Redes"
                  className="w-full bg-neutral-900 border border-neutral-800 rounded-xl px-3.5 py-2 text-xs text-white placeholder:text-neutral-500 outline-none focus:border-amber-400 transition-colors"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-mono font-medium text-neutral-300">
                  3. Frase o eslogan nobiliario (máx. 70 letras):
                </label>
                <input
                  type="text"
                  maxLength={70}
                  value={customQuote}
                  onChange={(e) => setCustomQuote(e.target.value)}
                  placeholder="ej. El ping más bajo del instituto."
                  className="w-full bg-neutral-900 border border-neutral-800 rounded-xl px-3.5 py-2 text-xs text-white placeholder:text-neutral-500 outline-none focus:border-amber-400 transition-colors"
                />
              </div>
            </div>

            {/* BOTÓN GUARDAR PERSONALIZACIÓN */}
            <div className="flex items-center justify-between pt-2 border-t border-neutral-800/80">
              {saveSuccess ? (
                <div className="flex items-center gap-1.5 text-xs text-emerald-400 font-semibold font-mono animate-in fade-in">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>¡Banner guardado y activo en tu ficha!</span>
                </div>
              ) : (
                <span className="text-[11px] text-neutral-500 font-mono">
                  Los cambios son inmediatos y visibles para toda la clase.
                </span>
              )}

              <button
                type="button"
                onClick={handleSaveCustomization}
                disabled={isSaving}
                className="px-5 py-2.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-black font-bold text-xs transition-all active:scale-95 cursor-pointer disabled:opacity-50 shadow-md flex items-center gap-1.5 ml-auto"
              >
                {isSaving ? (
                  <span className="w-3.5 h-3.5 border-2 border-black border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Check className="w-4 h-4 stroke-[2.5]" />
                )}
                <span>Guardar Personalización</span>
              </button>
            </div>
          </div>
        ) : (
          /* SECCIÓN DE COMPRA (CUANDO NO LO TIENE) */
          <div className="space-y-6">
            {/* Barra de progreso hacia los 13 Millones */}
            <div className="p-4 rounded-2xl bg-neutral-900/60 border border-neutral-800 space-y-2">
              <div className="flex items-center justify-between text-xs font-mono">
                <span className="text-neutral-400">Progreso hacia los 13M:</span>
                <span className="font-bold text-amber-400">
                  {progressPercent.toFixed(1)}% ({userCoins.toLocaleString('es-ES')} / 13.000.000)
                </span>
              </div>

              <div className="w-full h-3 rounded-full bg-neutral-950 border border-neutral-800 overflow-hidden p-0.5">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-amber-600 via-amber-400 to-yellow-300 transition-all duration-500 shadow-sm"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>

              {!canAfford && (
                <p className="text-[11px] text-neutral-400 pt-1 leading-relaxed">
                  💡 ¿Te faltan monedas? Consigue millones rápidamente invirtiendo en el juego del{' '}
                  <button
                    type="button"
                    onClick={() => {
                      sound.tap();
                      onNavigateToPartyIdle();
                    }}
                    className="text-amber-400 underline underline-offset-2 hover:text-amber-300 cursor-pointer font-semibold"
                  >
                    Botellón
                  </button>
                  .
                </p>
              )}
            </div>

            {/* Vista previa de muestra */}
            <div className="space-y-1.5 opacity-90">
              <span className="text-[11px] font-mono text-neutral-400">
                Así se verá cuando lo desbloquees:
              </span>
              <div className="rounded-2xl border border-amber-400/80 bg-gradient-to-r from-amber-600 via-yellow-400 to-amber-700 p-5 shadow-[0_0_25px_rgba(251,191,36,0.25)] relative overflow-hidden text-amber-950">
                <div className="relative z-10 flex items-start justify-between">
                  <div>
                    <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-md bg-black/30 text-amber-200 border border-amber-300/40 uppercase tracking-wider inline-block mb-1">
                      👑 ORO VIP
                    </span>
                    <h3 className="text-lg font-black tracking-tight text-black">
                      👑 Magnate del Botellón
                    </h3>
                    <p className="text-xs font-mono text-amber-900 font-bold">
                      @{currentUser?.username || 'tu_usuario'} · 2º SMR Aula 35
                    </p>
                  </div>
                  <div className="w-9 h-9 rounded-xl bg-black/40 border border-black/30 p-2 flex items-center justify-center">
                    <Crown className="w-5 h-5 text-amber-300" />
                  </div>
                </div>
              </div>
            </div>

            {/* Feedback de error si lo hay */}
            {errorMessage && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* Botón de compra */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-2 border-t border-neutral-800">
              <div className="text-xs text-neutral-400 font-mono">
                {canAfford ? (
                  <span className="text-emerald-400 font-semibold flex items-center gap-1.5">
                    <Check className="w-4 h-4" />
                    <span>¡Tienes saldo suficiente para comprar este estatus legendario!</span>
                  </span>
                ) : (
                  <span>
                    Te faltan{' '}
                    <strong className="text-white font-bold">
                      {(BANNER_PRICE - userCoins).toLocaleString('es-ES')}
                    </strong>{' '}
                    fichas para adquirirlo.
                  </span>
                )}
              </div>

              <button
                type="button"
                onClick={handleBuyBanner}
                disabled={!canAfford || isBuying}
                className={`w-full sm:w-auto px-6 py-3 rounded-2xl font-extrabold text-xs transition-all active:scale-95 cursor-pointer shadow-lg flex items-center justify-center gap-2 ${
                  canAfford
                    ? 'bg-gradient-to-r from-amber-400 via-yellow-300 to-amber-500 text-black hover:brightness-110 shadow-amber-500/20'
                    : 'bg-neutral-800 text-neutral-500 cursor-not-allowed border border-neutral-700/50'
                }`}
              >
                {isBuying ? (
                  <span className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Crown className="w-4 h-4" />
                )}
                <span>
                  {canAfford ? 'Comprar por 13.000.000 🪙' : '13.000.000 🪙 Requeridos'}
                </span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
