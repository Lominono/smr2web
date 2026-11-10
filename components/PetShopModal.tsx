'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import {
  X,
  Sparkles,
  Coins,
  Check,
  CheckCircle2,
  Lock,
  Shield,
  TrendingUp,
  Wine,
  Gift,
  ExternalLink,
} from 'lucide-react';
import { UserProfile } from '@/lib/types';
import { PETS_REGISTRY, PetItem, formatCoinsAbbreviated } from '@/lib/pets';
import { sound } from '@/lib/audio';
import confetti from 'canvas-confetti';
import { createClient } from '@/lib/supabase/client';

interface PetShopModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: UserProfile | null;
  onOpenAuth: () => void;
  onUpdateUser: (updated: UserProfile) => void;
  onUpdateCoins: (delta: number) => void;
}

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
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

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

    setIsProcessing(true);
    setErrorMessage(null);
    setSuccessMessage(null);
    sound.tap();

    try {
      const nextCoins = userCoins - pet.price;
      const nextUnlocked = Array.from(new Set([...unlockedPets, pet.id]));
      const existingItems = Array.isArray(currentUser.items_comprados) ? currentUser.items_comprados : [];
      const nextItems = Array.from(new Set([...existingItems, `pet_${pet.id}`]));

      const supabase = createClient();
      if (supabase && currentUser.id) {
        // Intento directo en Supabase
        const updatePayload: Record<string, any> = {
          coins: nextCoins,
          mascota_equipada: pet.id,
          mascotas_desbloqueadas: nextUnlocked,
          items_comprados: nextItems,
        };

        const { error: sbErr } = await supabase
          .from('profiles')
          .update(updatePayload)
          .eq('id', currentUser.id);

        if (sbErr) {
          console.warn('Note updating profiles table directly, writing to party_farm_data:', sbErr.message);
          // Fallback resiliente a party_farm_data
          const { data: currP } = await supabase
            .from('profiles')
            .select('party_farm_data')
            .eq('id', currentUser.id)
            .maybeSingle();

          const currFarm = (currP?.party_farm_data && typeof currP.party_farm_data === 'object') ? currP.party_farm_data : {};
          await supabase
            .from('profiles')
            .update({
              coins: nextCoins,
              items_comprados: nextItems,
              party_farm_data: {
                ...currFarm,
                mascota_equipada: pet.id,
                mascotas_desbloqueadas: nextUnlocked,
              },
            })
            .eq('id', currentUser.id);
        }

        // Anuncio en el Feed
        try {
          await supabase.from('chat_messages').insert([
            {
              username: 'SMR2',
              text: `🐾 ¡Adopción exclusiva! @${currentUser.username} ha adoptado a ${pet.name} por ${pet.price.toLocaleString('es-ES')} monedas en la Tienda de Mascotas.`,
              tag: 'aviso',
              pinned: false,
            },
          ]);
        } catch (_) {}
      }

      onUpdateCoins(-pet.price);

      const updatedProfile: UserProfile = {
        ...currentUser,
        coins: nextCoins,
        mascota_equipada: pet.id,
        mascotas_desbloqueadas: nextUnlocked,
        items_comprados: nextItems,
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

      setSuccessMessage(`¡Has adoptado a ${pet.name} con éxito! Ha sido equipada en tu perfil.`);
    } catch (err: any) {
      console.error('Error al comprar mascota:', err);
      setErrorMessage(err?.message || 'Error al procesar la compra.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleToggleEquip = async (petId: string) => {
    if (!currentUser) return;

    setIsProcessing(true);
    setErrorMessage(null);
    setSuccessMessage(null);
    sound.tap();

    try {
      const nextEquipped = equippedPetId === petId ? undefined : petId;
      const supabase = createClient();

      if (supabase && currentUser.id) {
        const { error: sbErr } = await supabase
          .from('profiles')
          .update({
            mascota_equipada: nextEquipped || null,
          })
          .eq('id', currentUser.id);

        if (sbErr) {
          // Fallback en party_farm_data
          const { data: currP } = await supabase
            .from('profiles')
            .select('party_farm_data')
            .eq('id', currentUser.id)
            .maybeSingle();

          const currFarm = (currP?.party_farm_data && typeof currP.party_farm_data === 'object') ? currP.party_farm_data : {};
          await supabase
            .from('profiles')
            .update({
              party_farm_data: {
                ...currFarm,
                mascota_equipada: nextEquipped || null,
              },
            })
            .eq('id', currentUser.id);
        }
      }

      const updatedProfile: UserProfile = {
        ...currentUser,
        mascota_equipada: nextEquipped,
      };

      onUpdateUser(updatedProfile);
      setSuccessMessage(nextEquipped ? `Has equipado a ${selectedPet.name}.` : 'Has desequipado a tu mascota.');
    } catch (err: any) {
      console.error('Error al cambiar de mascota:', err);
      setErrorMessage(err?.message || 'Error al equipar mascota.');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-3xl rounded-3xl bg-neutral-950 border border-white/10 shadow-2xl flex flex-col max-h-[92vh] overflow-hidden text-neutral-200">
        {/* Cabecera */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-neutral-900/50">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white tracking-tight flex items-center gap-2">
                Tienda de Mascotas
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-white/10 text-neutral-300">
                  Exclusivas 2º SMR
                </span>
              </h2>
              <p className="text-xs text-neutral-400">
                Compañeros para lucir al lado de tu perfil y en el Feed de clase con habilidades pasivas
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/5 border border-white/10 font-mono text-xs font-semibold text-amber-400">
              <Coins className="w-3.5 h-3.5" />
              <span>{userCoins.toLocaleString('es-ES')}</span>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl text-neutral-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Notificaciones */}
        {errorMessage && (
          <div className="mx-6 mt-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center justify-between">
            <span>{errorMessage}</span>
            <button type="button" onClick={() => setErrorMessage(null)} className="text-rose-400 hover:text-rose-200">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {successMessage && (
          <div className="mx-6 mt-4 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center justify-between">
            <span>{successMessage}</span>
            <button type="button" onClick={() => setSuccessMessage(null)} className="text-emerald-400 hover:text-emerald-200">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Contenido Principal */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 grid grid-cols-1 md:grid-cols-12 gap-5">
          {/* Columna Izquierda: Lista de Mascotas */}
          <div className="md:col-span-5 space-y-2.5">
            <div className="text-[11px] font-mono uppercase tracking-wider text-neutral-500 px-1">
              Catálogo Disponible ({PETS_REGISTRY.length})
            </div>

            <div className="space-y-2">
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
                        ? 'bg-white/10 border-white/30 shadow-md ring-1 ring-white/20'
                        : 'bg-neutral-900/40 border-white/5 hover:bg-white/[0.04] hover:border-white/15'
                    }`}
                  >
                    <div className="relative w-12 h-12 rounded-xl overflow-hidden bg-neutral-900 border border-white/10 shrink-0 p-1 flex items-center justify-center">
                      <Image
                        src={pet.image}
                        alt={pet.name}
                        width={44}
                        height={44}
                        className="object-contain"
                      />
                      {isEquipped && (
                        <span className="absolute top-0.5 right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-400 border border-black" />
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1">
                        <span className="font-semibold text-xs text-white truncate">{pet.name}</span>
                        {isEquipped ? (
                          <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 shrink-0">
                            Equipada
                          </span>
                        ) : isOwned ? (
                          <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-neutral-800 text-neutral-300 border border-white/10 shrink-0">
                            Comprada
                          </span>
                        ) : (
                          <span className="text-[10px] font-mono font-bold text-amber-400 shrink-0">
                            {formatCoinsAbbreviated(pet.price)} 🪙
                          </span>
                        )}
                      </div>

                      <div className="text-[11px] text-neutral-400 truncate mt-0.5">
                        {pet.subtitle}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Columna Derecha: Detalle de Mascota Seleccionada */}
          <div className="md:col-span-7 flex flex-col rounded-3xl bg-neutral-900/50 border border-white/10 p-5 space-y-4">
            {/* Cabecera del detalle */}
            <div className="flex items-start gap-4">
              <div className="relative w-24 h-24 sm:w-28 sm:h-28 rounded-2xl bg-black/60 border border-white/15 p-2 flex items-center justify-center shrink-0 shadow-inner">
                <Image
                  src={selectedPet.image}
                  alt={selectedPet.name}
                  width={100}
                  height={100}
                  className="object-contain max-h-full"
                />
                {isSelectedEquipped && (
                  <div className="absolute -bottom-2 -right-2 px-2 py-0.5 rounded-full bg-emerald-500 text-black font-mono text-[10px] font-bold shadow-md">
                    ✓ ACTIVA
                  </div>
                )}
              </div>

              <div className="flex-1 min-w-0 space-y-1">
                <div className="inline-block px-2 py-0.5 rounded-md border text-[10px] font-mono font-medium uppercase bg-white/5 border-white/10 text-neutral-300">
                  {selectedPet.tierBadge}
                </div>
                <h3 className="text-lg font-bold text-white tracking-tight leading-tight">
                  {selectedPet.name}
                </h3>
                <p className="text-xs text-neutral-400">{selectedPet.subtitle}</p>
                <div className="pt-1 flex items-center gap-1.5 text-xs font-mono font-bold text-amber-400">
                  <Coins className="w-3.5 h-3.5" />
                  <span>{selectedPet.price.toLocaleString('es-ES')} monedas</span>
                </div>
              </div>
            </div>

            {/* Descripción lore */}
            <div className="p-3.5 rounded-2xl bg-black/40 border border-white/5 text-xs text-neutral-300 leading-relaxed">
              {selectedPet.description}
            </div>

            {/* Habilidad pasiva */}
            <div className="p-4 rounded-2xl bg-gradient-to-br from-white/[0.04] to-transparent border border-white/10 space-y-1.5">
              <div className="flex items-center gap-2 text-xs font-bold text-white">
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                <span>Habilidad Pasiva: {selectedPet.perkName}</span>
              </div>
              <p className="text-xs text-neutral-300 leading-normal">
                {selectedPet.perkDescription}
              </p>
            </div>

            {/* Cómo se ve en tu perfil */}
            <div className="p-3 rounded-2xl bg-black/30 border border-white/5 space-y-2">
              <div className="text-[10px] font-mono uppercase tracking-wider text-neutral-500">
                Previsualización en el Feed y Perfil
              </div>
              <div className="flex items-center gap-2 p-2.5 rounded-xl bg-neutral-950 border border-white/10">
                <div className="w-6 h-6 rounded-full bg-emerald-700 flex items-center justify-center font-mono text-[10px] font-bold text-white">
                  {currentUser?.username ? currentUser.username.charAt(0).toUpperCase() : 'U'}
                </div>
                <span className="text-xs font-medium text-white">
                  @{currentUser?.username || 'tu_usuario'}
                </span>
                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-white/10 border border-white/15 text-[10px] font-mono text-neutral-200">
                  <img
                    src={selectedPet.image}
                    alt={selectedPet.name}
                    className="w-3.5 h-3.5 rounded-full object-cover shrink-0"
                  />
                  <span>{selectedPet.name.split(' ')[0]}</span>
                </span>
                <span className="text-[10px] text-neutral-500 ml-auto font-mono">hace 2m</span>
              </div>
            </div>

            {/* Botón de Acción */}
            <div className="pt-2 mt-auto">
              {isSelectedOwned ? (
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleToggleEquip(selectedPet.id)}
                    disabled={isProcessing}
                    className={`flex-1 py-3 rounded-2xl font-bold text-xs transition-all cursor-pointer flex items-center justify-center gap-2 active:scale-95 ${
                      isSelectedEquipped
                        ? 'bg-white/10 text-white border border-white/20 hover:bg-rose-500/20 hover:border-rose-500/40 hover:text-rose-200'
                        : 'bg-white text-black hover:bg-neutral-200'
                    }`}
                  >
                    {isSelectedEquipped ? (
                      <>
                        <Check className="w-4 h-4 text-emerald-400" />
                        <span>Equipada (Clic para desequipar)</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4" />
                        <span>Equipar Mascota</span>
                      </>
                    )}
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => handleBuyPet(selectedPet)}
                  disabled={isProcessing || !canAfford}
                  className={`w-full py-3 rounded-2xl font-bold text-xs transition-all flex items-center justify-center gap-2 ${
                    canAfford
                      ? 'bg-amber-400 text-black hover:bg-amber-300 cursor-pointer active:scale-95 shadow-lg shadow-amber-400/20'
                      : 'bg-white/10 text-neutral-500 border border-white/5 cursor-not-allowed'
                  }`}
                >
                  {isProcessing ? (
                    <span className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
                  ) : canAfford ? (
                    <>
                      <Coins className="w-4 h-4" />
                      <span>Comprar por {selectedPet.price.toLocaleString('es-ES')} 🪙</span>
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
  );
};
