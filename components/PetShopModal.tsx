'use client';

import React, { useState, useMemo } from 'react';
import Image from 'next/image';
import {
  X,
  Sparkles,
  Coins,
  Check,
  Lock,
  Shield,
  Filter,
  CheckCircle2,
  Zap,
} from 'lucide-react';
import { UserProfile } from '@/lib/types';
import { PETS_REGISTRY, PetItem, formatCoinsAbbreviated } from '@/lib/pets';
import { sound } from '@/lib/audio';
import confetti from 'canvas-confetti';

interface PetShopModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: UserProfile | null;
  onOpenAuth: () => void;
  onUpdateUser: (updated: UserProfile) => void;
  onUpdateCoins?: (delta: number) => void;
}

type ModalCategoryFilter = 'all' | 'exclusive' | 'botellon' | 'bolsa' | 'drop';

const CATEGORY_LABELS: Record<PetItem['category'], string> = {
  drop: 'Drops',
  bolsa: 'Bolsa',
  botellon: 'Botellón',
  exclusive: 'Exclusiva',
};

const FILTER_LABELS: Record<ModalCategoryFilter, string> = {
  all: 'Todas',
  exclusive: 'Exclusivas',
  botellon: 'Botellón',
  bolsa: 'Bolsa',
  drop: 'Drops',
};

export const PetShopModal: React.FC<PetShopModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  onOpenAuth,
  onUpdateUser,
}) => {
  const [selectedPetId, setSelectedPetId] = useState<string>(PETS_REGISTRY[0].id);
  const [categoryFilter, setCategoryFilter] = useState<ModalCategoryFilter>('all');
  const [isProcessing, setIsProcessing] = useState(false);
  const [message, setMessage] = useState<{ type: 'error' | 'success'; text: string } | null>(null);

  const userCoins = currentUser ? Number(currentUser.coins || 0) : 0;
  const unlockedPets = Array.isArray(currentUser?.mascotas_desbloqueadas)
    ? currentUser!.mascotas_desbloqueadas!
    : [];
  const equippedPetId = currentUser?.mascota_equipada;

  const filteredPets = useMemo(() => {
    if (categoryFilter === 'all') return PETS_REGISTRY;
    return PETS_REGISTRY.filter((p) => p.category === categoryFilter);
  }, [categoryFilter]);

  if (!isOpen) return null;

  const selectedPet = PETS_REGISTRY.find((p) => p.id === selectedPetId) || PETS_REGISTRY[0];
  const isSelectedOwned = unlockedPets.includes(selectedPet.id);
  const isSelectedEquipped = equippedPetId === selectedPet.id;
  const canAfford = userCoins >= selectedPet.price;
  const ownedCount = unlockedPets.length;

  const notify = (type: 'error' | 'success', text: string) => setMessage({ type, text });

  const handleSelectPet = (petId: string) => {
    setSelectedPetId(petId);
    setMessage(null);
    sound.tap();
  };

  const handleBuyPet = async (pet: PetItem) => {
    if (!currentUser) {
      sound.tap();
      onOpenAuth();
      return;
    }

    if (pet.notForSale) {
      sound.tap();
      notify('error', `${pet.name} es exclusiva y no se encuentra a la venta.`);
      return;
    }

    if (userCoins < pet.price) {
      sound.broke();
      notify('error', `Te faltan ${(pet.price - userCoins).toLocaleString('es-ES')} monedas para adoptar a ${pet.name}.`);
      return;
    }

    if (!window.confirm(`¿Confirmas la adopción de ${pet.name} por ${formatCoinsAbbreviated(pet.price)} monedas?`)) {
      return;
    }

    setIsProcessing(true);
    setMessage(null);
    sound.tap();

    try {
      const res = await fetch('/api/pets/purchase', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ petId: pet.id }),
      });
      const data = await res.json().catch(() => null);

      if (!res.ok || !data?.success) {
        notify('error', data?.error || 'No se pudo completar la adopción. Inténtalo de nuevo.');
        sound.broke();
        return;
      }

      // Actualizar perfil de forma autoritativa con los datos del servidor (sin restar dos veces)
      const nextUnlocked = Array.isArray(data.mascotasDesbloqueadas)
        ? data.mascotasDesbloqueadas
        : Array.from(new Set([...unlockedPets, pet.id]));

      onUpdateUser({
        ...currentUser,
        coins: Number(data.coins ?? userCoins - pet.price),
        mascota_equipada: pet.id,
        mascotas_desbloqueadas: nextUnlocked,
      });

      sound.coinWin();

      try {
        confetti({
          particleCount: 100,
          spread: 80,
          origin: { y: 0.6 },
          colors: ['#f59e0b', '#10b981', '#3b82f6', '#ec4899'],
        });
      } catch {
        /* Confetti cosmético */
      }

      notify('success', data.message || `¡Has adoptado a ${pet.name}! Ya está equipada en tu perfil.`);
    } catch (err: any) {
      console.error('Error al comprar mascota:', err);
      notify('error', err?.message || 'Error al procesar la compra.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleToggleEquip = async (pet: PetItem) => {
    if (!currentUser) return;

    setIsProcessing(true);
    setMessage(null);
    sound.tap();

    try {
      const nextEquipped = equippedPetId === pet.id ? null : pet.id;

      const res = await fetch('/api/pets/equip', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ petId: nextEquipped }),
      });
      const data = await res.json().catch(() => null);

      if (!res.ok || !data?.success) {
        notify('error', data?.error || 'No se pudo cambiar tu mascota equipada.');
        return;
      }

      onUpdateUser({ ...currentUser, mascota_equipada: nextEquipped ?? undefined });
      notify('success', nextEquipped ? `Has equipado a ${pet.name}.` : 'Has desequipado a tu mascota.');
    } catch (err: any) {
      console.error('Error al cambiar de mascota:', err);
      notify('error', err?.message || 'Error al equipar mascota.');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="pet-shop-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/80 backdrop-blur-md animate-in fade-in duration-200"
    >
      <div
        className="fixed inset-0"
        onClick={onClose}
        aria-hidden="true"
      />

      <div className="relative z-10 w-full max-w-5xl rounded-3xl bg-neutral-950/95 border border-white/10 shadow-2xl flex flex-col max-h-[90vh] sm:max-h-[86vh] overflow-hidden text-neutral-200">
        {/* ── 1. Cabecera Minimalista Apple ──────────────────────────── */}
        <header className="flex items-center justify-between px-5 sm:px-7 py-4 border-b border-white/[0.08] bg-white/[0.02]">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 shrink-0">
              <Sparkles className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h2 id="pet-shop-title" className="text-sm font-semibold text-white tracking-tight leading-none">
                  Tienda de Mascotas
                </h2>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-white/10 text-neutral-300">
                  {ownedCount} / {PETS_REGISTRY.length}
                </span>
              </div>
              <p className="text-[11px] text-neutral-400 mt-1 truncate">
                Compañeros oficiales con presencia en tu perfil, feed y bonificaciones pasivas
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div
              title={`Saldo actual: ${userCoins.toLocaleString('es-ES')} monedas`}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/20 font-mono text-xs font-semibold text-amber-400"
            >
              <Coins className="w-3.5 h-3.5" />
              <span>{formatCoinsAbbreviated(userCoins)}</span>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-full text-neutral-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
              aria-label="Cerrar tienda"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </header>

        {/* ── 2. Filtros por Categoría ───────────────────────────────── */}
        <nav
          aria-label="Categorías de mascotas"
          className="flex items-center gap-2 px-5 sm:px-7 py-2.5 border-b border-white/[0.06] bg-neutral-900/30 overflow-x-auto scrollbar-none"
        >
          <span className="flex items-center gap-1 text-[10px] font-mono uppercase tracking-wider text-neutral-500 mr-1 shrink-0">
            <Filter className="w-3 h-3" />
            <span>Filtrar:</span>
          </span>
          {(['all', 'exclusive', 'botellon', 'bolsa', 'drop'] as ModalCategoryFilter[]).map((cat) => {
            const isActive = categoryFilter === cat;
            return (
              <button
                key={cat}
                type="button"
                onClick={() => {
                  sound.tap();
                  setCategoryFilter(cat);
                }}
                className={`px-3 py-1 rounded-full text-xs font-medium transition-all cursor-pointer whitespace-nowrap ${
                  isActive
                    ? 'bg-white text-black font-semibold shadow-xs'
                    : 'bg-white/[0.05] text-neutral-400 hover:text-white hover:bg-white/[0.08]'
                }`}
              >
                {FILTER_LABELS[cat]}
              </button>
            );
          })}
        </nav>

        {/* ── Avisos y Notificaciones ─────────────────────────────────── */}
        {message && (
          <div
            role="alert"
            className={`mx-5 sm:mx-7 mt-3 px-4 py-2.5 rounded-xl text-xs flex items-center justify-between animate-in fade-in duration-150 ${
              message.type === 'error'
                ? 'bg-rose-500/10 border border-rose-500/25 text-rose-300'
                : 'bg-emerald-500/10 border border-emerald-500/25 text-emerald-300'
            }`}
          >
            <span className="min-w-0 truncate">{message.text}</span>
            <button
              type="button"
              onClick={() => setMessage(null)}
              className="ml-3 shrink-0 opacity-60 hover:opacity-100"
              aria-label="Cerrar aviso"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* ── 3. Cuerpo Principal: Distribución Equilibrada ─────────────── */}
        <div className="flex-1 overflow-y-auto px-5 sm:px-7 py-5 grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Columna Izquierda: Galería de Mascotas (7 de 12) */}
          <div className="lg:col-span-7 flex flex-col min-h-0">
            <div className="flex items-center justify-between mb-3 px-1">
              <span className="text-[11px] font-mono uppercase tracking-wider text-neutral-400 font-medium">
                Catálogo ({filteredPets.length})
              </span>
              <span className="text-[11px] font-mono text-neutral-500">
                Selecciona una para ver detalles
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[60vh] overflow-y-auto pr-1">
              {filteredPets.map((pet) => {
                const isSelected = pet.id === selectedPetId;
                const isOwned = unlockedPets.includes(pet.id);
                const isEquipped = equippedPetId === pet.id;
                const isAffordable = userCoins >= pet.price;

                return (
                  <button
                    key={pet.id}
                    type="button"
                    onClick={() => handleSelectPet(pet.id)}
                    className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer flex items-center gap-3.5 group relative ${
                      isSelected
                        ? 'bg-white/[0.08] border-white/30 ring-1 ring-white/20 shadow-lg'
                        : 'bg-white/[0.02] border-white/5 hover:border-white/15 hover:bg-white/[0.04]'
                    }`}
                  >
                    {/* Contenedor de Imagen */}
                    <div className="relative w-14 h-14 rounded-2xl overflow-hidden bg-black/50 border border-white/10 flex items-center justify-center p-1.5 shrink-0 shadow-inner">
                      <Image
                        src={pet.image}
                        alt={pet.name}
                        width={56}
                        height={56}
                        className="object-contain transition-transform duration-200 group-hover:scale-105"
                      />
                      {isEquipped && (
                        <span className="absolute top-1 right-1 w-2.5 h-2.5 rounded-full bg-emerald-400 ring-2 ring-emerald-400/40" />
                      )}
                    </div>

                    {/* Información */}
                    <div className="flex-1 min-w-0">
                      <span className="block text-xs font-semibold text-white truncate leading-tight group-hover:text-amber-300 transition-colors">
                        {pet.name}
                      </span>
                      <span className="block text-[11px] text-neutral-400 truncate mt-0.5">
                        {pet.subtitle}
                      </span>

                      <div className="mt-2 flex items-center gap-1.5">
                        {isEquipped ? (
                          <span className="text-[10px] font-mono font-medium px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                            Activa
                          </span>
                        ) : isOwned ? (
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-white/10 text-neutral-300">
                            En colección
                          </span>
                        ) : pet.notForSale ? (
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30">
                            Exclusiva
                          </span>
                        ) : (
                          <span
                            className={`text-[11px] font-mono font-semibold ${
                              isAffordable ? 'text-amber-400' : 'text-neutral-500'
                            }`}
                          >
                            {formatCoinsAbbreviated(pet.price)} 🪙
                          </span>
                        )}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Columna Derecha: Tarjeta de Exhibición (Showcase) (5 de 12) */}
          <div className="lg:col-span-5 flex flex-col min-h-0">
            <div className="flex items-center justify-between mb-3 px-1">
              <span className="text-[11px] font-mono uppercase tracking-wider text-neutral-400 font-medium">
                Detalles del Acompañante
              </span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-white/5 border border-white/10 text-neutral-300">
                {CATEGORY_LABELS[selectedPet.category]}
              </span>
            </div>

            <div className="rounded-3xl bg-neutral-900/50 border border-white/10 p-5 flex flex-col gap-4 max-h-[60vh] overflow-y-auto">
              {/* Header Showcase con Iluminación Dinámica */}
              <div className="flex items-center gap-4">
                <div
                  className={`relative w-20 h-20 sm:w-24 sm:h-24 rounded-2xl p-2 flex items-center justify-center shrink-0 shadow-xl border bg-black/60 ${
                    selectedPet.id === 'androide_18'
                      ? 'border-yellow-400/50 ring-2 ring-yellow-400/30 shadow-yellow-500/20'
                      : 'border-white/15'
                  }`}
                >
                  <Image
                    src={selectedPet.image}
                    alt={selectedPet.name}
                    width={88}
                    height={88}
                    className="object-contain max-h-full"
                  />
                  {isSelectedEquipped && (
                    <span className="absolute -bottom-1 -right-1 px-2 py-0.5 rounded-full bg-emerald-500 text-black font-mono text-[9px] font-bold shadow-md">
                      ✓ ACTIVA
                    </span>
                  )}
                </div>

                <div className="flex-1 min-w-0 space-y-1">
                  <div className="inline-block text-[9px] font-mono font-semibold uppercase px-2 py-0.5 rounded-full border border-white/10 bg-white/5 text-neutral-300">
                    {selectedPet.tierBadge}
                  </div>
                  <h3 className="text-sm sm:text-base font-bold text-white tracking-tight leading-snug truncate">
                    {selectedPet.name}
                  </h3>
                  <p className="text-xs text-neutral-400 truncate">{selectedPet.subtitle}</p>

                  {!isSelectedOwned && !selectedPet.notForSale && (
                    <div className="pt-1 flex items-center gap-1.5 text-xs font-mono font-bold text-amber-400">
                      <Coins className="w-3.5 h-3.5" />
                      <span>{selectedPet.price.toLocaleString('es-ES')} monedas</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Habilidad Especial / Pasiva */}
              <div className="p-3.5 rounded-2xl bg-white/[0.03] border border-white/[0.08] space-y-1.5">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-amber-400">
                  <Zap className="w-3.5 h-3.5" />
                  <span>{selectedPet.perkName}</span>
                </div>
                <p className="text-xs text-neutral-300 leading-relaxed">
                  {selectedPet.perkDescription}
                </p>
              </div>

              {/* Descripción / Lore */}
              <p className="text-xs text-neutral-400 leading-relaxed px-1">
                {selectedPet.description}
              </p>

              {/* Previsualización en el Feed y Perfil */}
              <div className="p-3 rounded-2xl bg-black/40 border border-white/5 space-y-2">
                <div className="text-[10px] font-mono uppercase tracking-wider text-neutral-500">
                  Así se ve en tus publicaciones:
                </div>
                <div className="flex items-center gap-2 p-2 rounded-xl bg-neutral-900/80 border border-white/10">
                  <div className="w-6 h-6 rounded-full bg-neutral-800 border border-white/20 flex items-center justify-center font-mono text-[10px] font-bold text-white shrink-0">
                    {currentUser?.username ? currentUser.username.charAt(0).toUpperCase() : 'U'}
                  </div>
                  <span className="text-xs font-medium text-white truncate">
                    @{currentUser?.username || 'tu_usuario'}
                  </span>

                  {/* Insignia cosmética */}
                  <span
                    className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full border text-[10px] font-mono shrink-0 ${
                      selectedPet.id === 'androide_18'
                        ? 'bg-gradient-to-r from-yellow-500/20 via-amber-400/25 to-yellow-300/20 border-yellow-400/80 text-yellow-300 ring-1 ring-yellow-400/50 shadow-xs'
                        : selectedPet.id === 'toy_chica'
                        ? 'bg-amber-400/10 border-amber-400/50 text-amber-300 ring-1 ring-amber-400/30'
                        : 'bg-white/[0.06] border-white/15 text-neutral-300'
                    }`}
                  >
                    <img
                      src={selectedPet.image}
                      alt={selectedPet.name}
                      className="w-3.5 h-3.5 rounded-full object-cover shrink-0"
                    />
                    <span className="font-medium">{selectedPet.name.split(' ')[0]}</span>
                  </span>

                  <span className="text-[10px] text-neutral-500 ml-auto font-mono shrink-0">ahora</span>
                </div>
              </div>

              {/* Botón de Acción Principal */}
              <div className="pt-2 mt-auto">
                {isSelectedOwned ? (
                  <button
                    type="button"
                    onClick={() => handleToggleEquip(selectedPet)}
                    disabled={isProcessing}
                    className={`w-full py-3 rounded-2xl font-bold text-xs transition-all cursor-pointer flex items-center justify-center gap-2 active:scale-[0.98] ${
                      isSelectedEquipped
                        ? 'bg-white/10 text-white border border-white/20 hover:bg-rose-500/15 hover:border-rose-500/30 hover:text-rose-200'
                        : 'bg-white text-black hover:bg-neutral-200 shadow-md'
                    }`}
                  >
                    {isSelectedEquipped ? (
                      <>
                        <Check className="w-4 h-4 text-emerald-400" />
                        <span>Mascota Equipada (Clic para desequipar)</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4" />
                        <span>Equipar esta Mascota</span>
                      </>
                    )}
                  </button>
                ) : selectedPet.notForSale ? (
                  <div className="rounded-2xl border border-purple-500/25 bg-purple-500/10 p-3 text-center space-y-0.5">
                    <div className="flex items-center justify-center gap-1.5 text-xs font-semibold text-purple-300">
                      <Lock className="w-3.5 h-3.5" />
                      <span>Exclusiva por Compensación de Rebirths</span>
                    </div>
                    <p className="text-[11px] text-neutral-400">
                      Entregada únicamente como compensación oficial. No está a la venta.
                    </p>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => handleBuyPet(selectedPet)}
                    disabled={isProcessing || !canAfford}
                    className={`w-full py-3 rounded-2xl font-bold text-xs transition-all flex items-center justify-center gap-2 ${
                      canAfford
                        ? 'bg-amber-400 text-black hover:bg-amber-300 cursor-pointer active:scale-[0.98] shadow-lg shadow-amber-400/20'
                        : 'bg-white/[0.06] text-neutral-500 border border-white/[0.08] cursor-not-allowed'
                    }`}
                  >
                    {isProcessing ? (
                      <span className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
                    ) : canAfford ? (
                      <>
                        <Coins className="w-4 h-4" />
                        <span>Adoptar por {selectedPet.price.toLocaleString('es-ES')} 🪙</span>
                      </>
                    ) : (
                      <>
                        <Lock className="w-4 h-4" />
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
    </div>
  );
};
