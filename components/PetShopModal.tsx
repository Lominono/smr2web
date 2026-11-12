'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import Image from 'next/image';
import { X, Check, Lock } from 'lucide-react';
import { UserProfile } from '@/lib/types';
import { PETS_REGISTRY, PetItem, formatCoinsAbbreviated } from '@/lib/pets';
import { sound } from '@/lib/audio';
import { Button } from '@/components/ui/Button';
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

const CONFETTI_COLORS = ['#0071e3', '#4a9de0', '#9cc4e8'];

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
  const [isConfirming, setIsConfirming] = useState(false);
  const [message, setMessage] = useState<{ type: 'error' | 'success'; text: string } | null>(null);
  const confirmTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

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

  // La confirmación de compra expira sola: el botón vuelve a su estado armado.
  useEffect(() => {
    setIsConfirming(false);
    if (confirmTimer.current) clearTimeout(confirmTimer.current);
  }, [selectedPetId, isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, onClose]);

  const notify = useCallback((type: 'error' | 'success', text: string) => {
    setMessage({ type, text });
  }, []);

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

    // Confirmación en dos toques en lugar de window.confirm: el primer toque
    // arma el botón y el segundo ejecuta. A los 4s se desarma solo.
    if (!isConfirming) {
      setIsConfirming(true);
      sound.tap();
      if (confirmTimer.current) clearTimeout(confirmTimer.current);
      confirmTimer.current = setTimeout(() => setIsConfirming(false), 4000);
      return;
    }
    if (confirmTimer.current) clearTimeout(confirmTimer.current);
    setIsConfirming(false);

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
          particleCount: 80,
          spread: 65,
          origin: { y: 0.55 },
          colors: CONFETTI_COLORS,
        });
      } catch {
        /* el confetti es cosmético */
      }

      notify('success', data.message || `Has adoptado a ${pet.name}. Ya está equipada en tu perfil.`);
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

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-6 bg-black/40 animate-in fade-in duration-200">
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Tienda de mascotas"
        className="relative w-full sm:max-w-4xl rounded-t-3xl sm:rounded-3xl bg-surface border border-border/80 shadow-2xl flex flex-col max-h-[92dvh] sm:max-h-[85vh] overflow-hidden text-foreground animate-in slide-in-from-bottom-4 sm:slide-in-from-bottom-2 duration-200"
      >
        {/* ── Cabecera ─────────────────────────────────────────────────── */}
        <header className="flex items-center justify-between px-5 sm:px-7 py-4 border-b border-border/60 shrink-0">
          <div className="min-w-0">
            <h2 className="text-[15px] font-semibold tracking-tight leading-none">Mascotas</h2>
            <p className="text-xs text-foreground-muted mt-1.5 truncate">
              {ownedCount > 0
                ? `${ownedCount} de ${PETS_REGISTRY.length} en tu colección`
                : 'Compañeros con habilidades pasivas'}
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <span className="font-mono text-xs tabular-nums text-foreground-muted px-2.5 py-1 rounded-[var(--radius-sm)] bg-surface-raised">
              {formatCoinsAbbreviated(userCoins)}
            </span>
            <button
              type="button"
              onClick={onClose}
              className="w-7 h-7 rounded-lg text-foreground-muted hover:text-foreground hover:bg-surface-raised border border-border/60 flex items-center justify-center transition-colors cursor-pointer active:scale-95"
              aria-label="Cerrar tienda"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </header>

        {/* ── Contenido: lista maestra + detalle ───────────────────────── */}
        <div className="flex-1 min-h-0 overflow-y-auto md:overflow-hidden grid grid-cols-1 md:grid-cols-12 md:divide-x md:divide-border/60">
          {/* Columna izquierda — lista */}
          <nav className="md:col-span-5 md:overflow-y-auto pb-2" aria-label="Catálogo de mascotas">
            <div className="flex items-baseline justify-between px-5 sm:px-6 pt-4 pb-2">
              <span className="text-[11px] font-medium uppercase tracking-widest text-foreground-subtle">
                Catálogo
              </span>
              <span className="text-[11px] font-mono tabular-nums text-foreground-subtle">
                {PETS_REGISTRY.length}
              </span>
            </div>

            <ul className="divide-y divide-border/50">
              {PETS_REGISTRY.map((pet) => {
                const isSelected = pet.id === selectedPetId;
                const isOwned = unlockedPets.includes(pet.id);
                const isEquipped = equippedPetId === pet.id;
                const petAffordable = userCoins >= pet.price;

                return (
                  <li key={pet.id}>
                    <button
                      type="button"
                      onClick={() => handleSelectPet(pet.id)}
                      aria-current={isSelected ? 'true' : undefined}
                      className={`w-full flex items-center gap-3 px-5 sm:px-6 py-2.5 text-left transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent/50 ${
                        isSelected ? 'bg-accent text-accent-foreground' : 'hover:bg-surface-hover'
                      }`}
                    >
                      <span
                        className={`w-10 h-10 rounded-[var(--radius-sm)] shrink-0 flex items-center justify-center p-1 ${
                          isSelected ? 'bg-accent-foreground/15' : 'bg-surface-raised'
                        }`}
                      >
                        <Image src={pet.image} alt="" width={32} height={32} className="object-contain" />
                      </span>

                      <span className="flex-1 min-w-0">
                        <span className={`block text-sm font-medium truncate leading-snug ${isSelected ? '' : 'text-foreground'}`}>
                          {pet.name}
                        </span>
                        <span
                          className={`block text-xs truncate mt-0.5 ${
                            isSelected ? 'text-accent-foreground/75' : 'text-foreground-subtle'
                          }`}
                        >
                          {isEquipped
                            ? 'Equipada'
                            : isOwned
                              ? 'En propiedad'
                              : pet.notForSale
                                ? 'Exclusiva'
                                : formatCoinsAbbreviated(pet.price)}
                        </span>
                      </span>

                      {isEquipped ? (
                        <Check
                          className={`w-4 h-4 shrink-0 ${isSelected ? 'text-accent-foreground' : 'text-success'}`}
                          aria-label="Equipada"
                        />
                      ) : !isOwned && !pet.notForSale && !petAffordable ? (
                        <Lock
                          className={`w-3.5 h-3.5 shrink-0 ${isSelected ? 'text-accent-foreground/60' : 'text-foreground-subtle/60'}`}
                          aria-label="Sin saldo suficiente"
                        />
                      ) : null}
                    </button>
                  </li>
                );
              })}
            </ul>
          </nav>

          {/* Columna derecha — detalle */}
          <section
            className="md:col-span-7 p-5 sm:p-7 md:overflow-y-auto flex flex-col"
            aria-label="Detalle de la mascota"
          >
            <div className="flex items-start gap-4 sm:gap-5">
              <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-[var(--radius-lg)] bg-surface-raised border border-border/50 p-3 flex items-center justify-center shrink-0">
                <Image
                  src={selectedPet.image}
                  alt={selectedPet.name}
                  width={88}
                  height={88}
                  className="object-contain"
                />
              </div>

              <div className="flex-1 min-w-0 pt-1">
                <h3 className="text-lg sm:text-[22px] font-semibold tracking-tight leading-tight">
                  {selectedPet.name}
                </h3>
                <p className="text-xs sm:text-sm text-foreground-muted mt-1 leading-snug">
                  {selectedPet.subtitle}
                </p>

                <div className="mt-3 flex items-center gap-2 flex-wrap">
                  <span className="px-2 py-0.5 rounded-full border border-border text-[10px] font-medium text-foreground-muted">
                    {CATEGORY_LABELS[selectedPet.category]}
                  </span>
                  <span className="px-2 py-0.5 rounded-full border border-border text-[10px] font-mono text-foreground-subtle">
                    {selectedPet.tierBadge}
                  </span>
                </div>
              </div>
            </div>

            {/* Habilidad pasiva */}
            <div className="mt-6 rounded-[var(--radius)] border border-border/60 p-4">
              <p className="text-xs font-semibold">{selectedPet.perkName}</p>
              <p className="text-xs text-foreground-muted mt-1.5 leading-relaxed">
                {selectedPet.perkDescription}
              </p>
            </div>

            <p className="mt-4 text-xs sm:text-sm text-foreground-muted leading-relaxed">
              {selectedPet.description}
            </p>

            {/* Aviso contextual */}
            {message && (
              <div
                role="status"
                className={`mt-6 px-3.5 py-2.5 rounded-[var(--radius-sm)] text-xs leading-relaxed flex items-start justify-between gap-3 ${
                  message.type === 'error'
                    ? 'bg-danger-subtle text-danger'
                    : 'bg-success-subtle text-success'
                }`}
              >
                <span className="min-w-0">{message.text}</span>
                <button
                  type="button"
                  onClick={() => setMessage(null)}
                  className="shrink-0 opacity-60 hover:opacity-100 cursor-pointer mt-0.5"
                  aria-label="Descartar aviso"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            {/* Acción */}
            <div className="mt-auto pt-6">
              {isSelectedOwned ? (
                isSelectedEquipped ? (
                  <Button
                    variant="secondary"
                    className="w-full"
                    onClick={() => handleToggleEquip(selectedPet)}
                    disabled={isProcessing}
                  >
                    <Check className="w-4 h-4 text-success" />
                    Equipada · desequipar
                  </Button>
                ) : (
                  <Button
                    variant="accent"
                    className="w-full"
                    onClick={() => handleToggleEquip(selectedPet)}
                    disabled={isProcessing}
                    isLoading={isProcessing}
                  >
                    Equipar
                  </Button>
                )
              ) : selectedPet.notForSale ? (
                <Button variant="secondary" className="w-full" disabled>
                  <Lock className="w-4 h-4" />
                  Compensación exclusiva · no en venta
                </Button>
              ) : (
                <Button
                  variant="accent"
                  className="w-full"
                  onClick={() => handleBuyPet(selectedPet)}
                  disabled={isProcessing || (!canAfford && !isConfirming)}
                  isLoading={isProcessing}
                >
                  {!currentUser ? (
                    'Inicia sesión para adoptar'
                  ) : isConfirming ? (
                    `Confirmar adopción · ${formatCoinsAbbreviated(selectedPet.price)}`
                  ) : canAfford ? (
                    `Adoptar por ${formatCoinsAbbreviated(selectedPet.price)}`
                  ) : (
                    <>
                      <Lock className="w-4 h-4" />
                      Faltan {formatCoinsAbbreviated(selectedPet.price - userCoins)}
                    </>
                  )}
                </Button>
              )}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};
