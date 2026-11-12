'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import {
  X,
  Sparkles,
  Coins,
  Check,
  Lock,
  Shield,
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
  onUpdateCoins: (delta: number) => void;
}

const CATEGORY_LABELS: Record<PetItem['category'], string> = {
  drop: 'Botellón',
  bolsa: 'Bolsa',
  botellon: 'Fiesta',
  exclusive: 'Exclusiva',
};

export const PetShopModal: React.FC<PetShopModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  onOpenAuth,
  onUpdateUser,
  onUpdateCoins,
}) => {
  const [selectedPetId, setSelectedPetId] = useState<string>(PETS_REGISTRY[0].id);
  const [isProcessing, setIsProcessing] = useState(false);
  const [message, setMessage] = useState<{ type: 'error' | 'success'; text: string } | null>(null);

  if (!isOpen) return null;

  const userCoins = currentUser ? Number(currentUser.coins || 0) : 0;
  const unlockedPets = Array.isArray(currentUser?.mascotas_desbloqueadas)
    ? currentUser!.mascotas_desbloqueadas!
    : [];
  const equippedPetId = currentUser?.mascota_equipada;

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
      // SEGURIDAD: la compra pasa SIEMPRE por el servidor, que cobra el
      // precio real y concede la mascota. Nunca se escribe el saldo ni la
      // colección directamente desde el navegador.
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

      onUpdateUser({
        ...currentUser,
        coins: Number(data.coins ?? userCoins - pet.price),
        mascota_equipada: pet.id,
        mascotas_desbloqueadas: Array.isArray(data.mascotasDesbloqueadas)
          ? data.mascotasDesbloqueadas
          : Array.from(new Set([...unlockedPets, pet.id])),
      });
      onUpdateCoins(-pet.price);
      sound.coinWin();

      try {
        confetti({
          particleCount: 90,
          spread: 70,
          origin: { y: 0.55 },
          colors: ['#f59e0b', '#10b981', '#3b82f6'],
        });
      } catch {
        /* el confetti es cosmético */
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

      // SEGURIDAD: el equipado pasa por el servidor (verifica propiedad real).
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-4xl rounded-3xl bg-neutral-950 border border-white/10 shadow-2xl flex flex-col max-h-[90vh] overflow-hidden text-neutral-200">

        {/* ── Cabecera ─────────────────────────────────────────────── */}
        <header className="flex items-center justify-between px-5 sm:px-7 py-4 border-b border-white/10">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-2xl bg-white/[0.06] border border-white/10 flex items-center justify-center text-amber-400 shrink-0">
              <Sparkles className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <h2 className="text-sm font-semibold text-white tracking-tight leading-none">
                Tienda de Mascotas
              </h2>
              <p className="text-[11px] text-neutral-500 mt-1 truncate">
                {ownedCount > 0
                  ? `${ownedCount} de ${PETS_REGISTRY.length} en tu colección`
                  : 'Compañeros exclusivos con habilidades pasivas'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/[0.06] border border-white/10 font-mono text-xs font-semibold text-amber-400">
              <Coins className="w-3.5 h-3.5" />
              <span>{formatCoinsAbbreviated(userCoins)}</span>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl text-neutral-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
              aria-label="Cerrar tienda"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </header>

        {/* ── Avisos ───────────────────────────────────────────────── */}
        {message && (
          <div
            className={`mx-5 sm:mx-7 mt-3 px-3.5 py-2.5 rounded-xl text-xs flex items-center justify-between ${
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
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* ── Contenido: grid + detalle ───────────────────────────── */}
        <div className="flex-1 overflow-y-auto px-5 sm:px-7 py-5 grid grid-cols-1 md:grid-cols-12 gap-5">

          {/* Columna izquierda — catálogo */}
          <div className="md:col-span-5">
            <div className="flex items-baseline justify-between mb-2.5">
              <span className="text-[10px] font-mono uppercase tracking-widest text-neutral-500">
                Catálogo
              </span>
              <span className="text-[10px] font-mono text-neutral-600">
                {PETS_REGISTRY.length} mascotas
              </span>
            </div>

            <div className="grid grid-cols-2 xl:grid-cols-3 md:grid-cols-2 gap-2.5 max-h-[64vh] md:max-h-[62vh] overflow-y-auto pr-1">
              {PETS_REGISTRY.map((pet) => {
                const isSelected = pet.id === selectedPetId;
                const isOwned = unlockedPets.includes(pet.id);
                const isEquipped = equippedPetId === pet.id;

                return (
                  <button
                    key={pet.id}
                    type="button"
                    onClick={() => handleSelectPet(pet.id)}
                    className={`p-2.5 rounded-2xl border text-left transition-all cursor-pointer group ${
                      isSelected
                        ? 'bg-white/[0.08] border-white/25'
                        : 'bg-neutral-900/40 border-white/5 hover:border-white/15 hover:bg-white/[0.04]'
                    }`}
                  >
                    <div className="relative w-full aspect-square mb-2 rounded-xl overflow-hidden bg-black/40 border border-white/[0.06] flex items-center justify-center p-1.5">
                      <Image
                        src={pet.image}
                        alt={pet.name}
                        width={72}
                        height={72}
                        className="object-contain transition-transform duration-200 group-hover:scale-105"
                      />
                      {isEquipped && (
                        <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-emerald-400 ring-2 ring-emerald-400/30" />
                      )}
                    </div>

                    <span className="block text-[11px] font-semibold text-white truncate leading-tight">
                      {pet.name}
                    </span>

                    <div className="mt-1 flex items-center justify-between gap-1">
                      {isEquipped ? (
                        <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-300">
                          Activa
                        </span>
                      ) : isOwned ? (
                        <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-white/[0.08] text-neutral-400">
                          Comprada
                        </span>
                      ) : pet.notForSale ? (
                        <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-purple-500/15 text-purple-300">
                          Exclusiva
                        </span>
                      ) : (
                        <span className={`text-[10px] font-mono ${canAfford ? 'text-amber-400' : 'text-neutral-500'}`}>
                          {formatCoinsAbbreviated(pet.price)}
                        </span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Columna derecha — detalle */}
          <div className="md:col-span-7">
            <div className="flex items-baseline justify-between mb-2.5">
              <span className="text-[10px] font-mono uppercase tracking-widest text-neutral-500">
                Detalle
              </span>
              <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full border ${selectedPet.tierColor || 'border-white/10 text-neutral-400'} bg-white/[0.03]`}>
                {selectedPet.tierBadge}
              </span>
            </div>

            <div className="rounded-2xl bg-neutral-900/50 border border-white/10 p-5 flex flex-col gap-4 max-h-[62vh] md:max-h-[64vh] overflow-y-auto">

              {/* Identidad */}
              <div className="flex items-start gap-4">
                <div className="relative w-20 h-20 rounded-2xl bg-black/50 border border-white/10 p-2 flex items-center justify-center shrink-0">
                  <Image
                    src={selectedPet.image}
                    alt={selectedPet.name}
                    width={72}
                    height={72}
                    className="object-contain"
                  />
                </div>

                <div className="flex-1 min-w-0">
                  <h3 className="text-base font-semibold text-white tracking-tight leading-tight">
                    {selectedPet.name}
                  </h3>
                  <p className="text-xs text-neutral-400 mt-0.5">{selectedPet.subtitle}</p>

                  <div className="mt-2 flex items-center gap-2 flex-wrap">
                    <span className="px-2 py-0.5 rounded-full bg-white/[0.06] border border-white/10 text-[10px] font-mono text-neutral-300">
                      {CATEGORY_LABELS[selectedPet.category]}
                    </span>
                    {!isSelectedOwned && (
                      <span className="inline-flex items-center gap-1 text-[11px] font-mono font-semibold text-amber-400">
                        <Coins className="w-3 h-3" />
                        {selectedPet.price.toLocaleString('es-ES')}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Habilidad / Descripción */}
              <div className="space-y-2.5">
                <div className="flex items-start gap-2">
                  <Shield className="w-3.5 h-3.5 text-amber-400/80 mt-0.5 shrink-0" />
                  <div className="min-w-0">
                    <div className="text-xs font-semibold text-white">{selectedPet.perkName}</div>
                    <p className="text-xs text-neutral-400 leading-relaxed mt-0.5">
                      {selectedPet.perkDescription}
                    </p>
                  </div>
                </div>

                <p className="pl-5 text-[11px] text-neutral-500 leading-relaxed">
                  {selectedPet.description}
                </p>
              </div>

              {/* Acción */}
              <div className="mt-auto pt-1">
                {isSelectedOwned ? (
                  <button
                    type="button"
                    onClick={() => handleToggleEquip(selectedPet)}
                    disabled={isProcessing}
                    className={`w-full py-2.5 rounded-xl font-semibold text-xs transition-all cursor-pointer flex items-center justify-center gap-2 active:scale-[0.98] ${
                      isSelectedEquipped
                        ? 'bg-white/[0.08] text-neutral-200 border border-white/15 hover:border-rose-500/40 hover:text-rose-200'
                        : 'bg-white text-black hover:bg-neutral-200'
                    }`}
                  >
                    {isSelectedEquipped ? (
                      <>
                        <Check className="w-4 h-4 text-emerald-400" />
                        <span>Equipada · desequipar</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4" />
                        <span>Equipar</span>
                      </>
                    )}
                  </button>
                ) : selectedPet.notForSale ? (
                  <button
                    type="button"
                    disabled
                    className="w-full py-2.5 rounded-xl font-semibold text-xs flex items-center justify-center gap-2 bg-purple-500/10 text-purple-300 border border-purple-500/25 cursor-not-allowed"
                  >
                    <Lock className="w-4 h-4" />
                    <span>Exclusiva por compensación (no en venta)</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => handleBuyPet(selectedPet)}
                    disabled={isProcessing || !canAfford}
                    className={`w-full py-2.5 rounded-xl font-semibold text-xs transition-all flex items-center justify-center gap-2 ${
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
                        <span>Adoptar por {selectedPet.price.toLocaleString('es-ES')}</span>
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
