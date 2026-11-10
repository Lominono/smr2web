'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import { User, Hash, AlertCircle, CheckCircle2, LogOut, Loader2, ArrowRight } from 'lucide-react';
import { UserProfile } from '@/lib/types';
import { checkStudentNumberAvailability, saveStudentIdentification } from '@/lib/authService';
import { sound } from '@/lib/audio';

interface StudentIdentificationModalProps {
  isOpen: boolean;
  user: UserProfile | null;
  onSuccess: (updatedUser: UserProfile) => void;
  onSignOut?: () => void;
  onSkip?: () => void;
}

export const StudentIdentificationModal: React.FC<StudentIdentificationModalProps> = ({
  isOpen,
  user,
  onSuccess,
  onSignOut,
  onSkip,
}) => {
  const [fullName, setFullName] = useState(user?.full_name || '');
  const [studentNumber, setStudentNumber] = useState(user?.student_number || '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Comprobación en vivo de disponibilidad única del NIA
  const [numberStatus, setNumberStatus] = useState<{
    checking: boolean;
    available?: boolean;
    message?: string;
  }>({ checking: false });

  useEffect(() => {
    if (user?.full_name) setFullName(user.full_name);
    if (user?.student_number) setStudentNumber(user.student_number);
  }, [user]);

  useEffect(() => {
    const clean = studentNumber.trim().toUpperCase();
    if (!clean || clean.length < 2) {
      setNumberStatus({ checking: false });
      return;
    }

    setNumberStatus({ checking: true });
    const timer = setTimeout(async () => {
      try {
        const res = await checkStudentNumberAvailability(clean, user?.id);
        setNumberStatus({ checking: false, available: res.available, message: res.message });
      } catch {
        setNumberStatus({ checking: false });
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [studentNumber, user?.id]);

  if (!isOpen || !user) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const cleanName = fullName.trim();
    const cleanNumber = studentNumber.trim().toUpperCase();

    if (cleanName.length < 3) {
      setError('Por favor, escribe tu nombre y apellidos reales completos.');
      return;
    }

    if (cleanNumber.length < 2) {
      setError('Introduce tu número de estudiante o NIA.');
      return;
    }

    if (numberStatus.available === false) {
      setError(numberStatus.message || 'Este número de estudiante ya está asignado a otro alumno.');
      return;
    }

    setLoading(true);

    try {
      const res = await saveStudentIdentification(user.id, cleanName, cleanNumber);

      if (!res.success || !res.user) {
        throw new Error(res.error || 'No se pudo guardar la identificación.');
      }

      sound.coinWin();
      onSuccess(res.user);
    } catch (err: any) {
      setError(err?.message || 'Error al guardar los datos de estudiante.');
      sound.broke();
    } finally {
      setLoading(false);
    }
  };

  const isFormValid =
    fullName.trim().length >= 3 &&
    studentNumber.trim().length >= 2 &&
    numberStatus.available !== false;

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-in fade-in duration-200"
    >
      <div className="w-full max-w-md bg-surface border border-border/80 rounded-2xl shadow-2xl overflow-hidden flex flex-col">
        {/* Cabecera minimalista y sobria */}
        <div className="px-6 py-5 border-b border-border/60 bg-surface-raised/40">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-surface border border-border/80 p-1.5 flex items-center justify-center shrink-0 shadow-xs">
              <Image
                src="/logo.png"
                alt="SMR2 Logo"
                width={36}
                height={36}
                className="w-full h-full object-contain"
                priority
              />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-foreground tracking-tight">
                Ficha de estudiante
              </h2>
              <p className="text-[11px] text-foreground-muted font-mono">
                2º SMR · Aula: Ni puta idea
              </p>
            </div>
          </div>
        </div>

        {/* Formulario */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="p-3.5 rounded-xl bg-surface-raised/70 border border-border/60 text-xs text-foreground-muted leading-relaxed">
            Para mantener el aula organizada y evitar cuentas duplicadas, registra tu <strong className="text-foreground font-medium">nombre real</strong> y tu <strong className="text-foreground font-medium">NIA o número de estudiante</strong>.
          </div>

          {error && (
            <div className="p-3 rounded-xl bg-danger-subtle border border-danger/25 text-xs text-danger flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Campo 1: Nombre y apellidos reales */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-foreground block">
              Nombre y apellidos completos
            </label>
            <div className="relative">
              <User className="w-4 h-4 text-foreground-subtle absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Ej. Alejandro Martínez Gómez"
                className="w-full pl-9 pr-3.5 py-2 text-xs rounded-xl bg-surface-raised border border-border/70 text-foreground placeholder:text-foreground-subtle focus:outline-none focus:border-accent transition-colors"
              />
            </div>
            <p className="text-[11px] text-foreground-subtle">
              Identifica tus publicaciones en el tablón y debates.
            </p>
          </div>

          {/* Campo 2: Número de estudiante (Único) */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-medium text-foreground block">
                Número de estudiante / NIA
              </label>
              {numberStatus.checking && (
                <span className="text-[10px] font-mono text-foreground-subtle flex items-center gap-1">
                  <Loader2 className="w-3 h-3 animate-spin" />
                  Comprobando...
                </span>
              )}
              {!numberStatus.checking && numberStatus.available === true && studentNumber.trim().length >= 2 && (
                <span className="text-[10px] font-mono text-emerald-500 flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" />
                  Disponible
                </span>
              )}
            </div>

            <div className="relative">
              <Hash className="w-4 h-4 text-foreground-subtle absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                required
                value={studentNumber}
                onChange={(e) => setStudentNumber(e.target.value)}
                placeholder="Ej. 10482910"
                className={`w-full pl-9 pr-3.5 py-2 text-xs font-mono uppercase rounded-xl bg-surface-raised border text-foreground placeholder:text-foreground-subtle focus:outline-none transition-colors ${
                  numberStatus.available === false
                    ? 'border-danger focus:border-danger'
                    : 'border-border/70 focus:border-accent'
                }`}
              />
            </div>

            {numberStatus.available === false ? (
              <p className="text-[11px] text-danger font-mono">
                {numberStatus.message || 'Este número ya pertenece a otro estudiante.'}
              </p>
            ) : (
              <p className="text-[11px] text-foreground-subtle">
                Identificador personal intransferible.
              </p>
            )}
          </div>

          {/* Botones de acción */}
          <div className="pt-2 space-y-2">
            <button
              type="submit"
              disabled={!isFormValid || loading}
              className="w-full py-2.5 px-4 bg-foreground text-background text-xs font-semibold rounded-xl hover:opacity-90 active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed shadow-xs"
            >
              {loading ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Guardando...</span>
                </>
              ) : (
                <>
                  <span>Completar identificación</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </>
              )}
            </button>

            {onSkip && (
              <button
                type="button"
                onClick={onSkip}
                className="w-full text-center text-xs text-foreground-muted hover:text-foreground py-1.5 transition-colors cursor-pointer"
              >
                Completar más tarde
              </button>
            )}

            {onSignOut && (
              <button
                type="button"
                onClick={onSignOut}
                className="w-full text-center text-xs text-foreground-subtle hover:text-danger py-1 transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <LogOut className="w-3 h-3" />
                <span>Cerrar sesión</span>
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
};
