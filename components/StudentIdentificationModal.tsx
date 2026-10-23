'use client';

import React, { useState, useEffect } from 'react';
import { ShieldCheck, User, Hash, AlertCircle, CheckCircle2, LogOut } from 'lucide-react';
import { UserProfile } from '@/lib/types';
import { checkStudentNumberAvailability, saveStudentIdentification } from '@/lib/authService';
import { sound } from '@/lib/audio';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';

interface StudentIdentificationModalProps {
  isOpen: boolean;
  user: UserProfile | null;
  onSuccess: (updatedUser: UserProfile) => void;
  onSignOut?: () => void;
}

export const StudentIdentificationModal: React.FC<StudentIdentificationModalProps> = ({
  isOpen,
  user,
  onSuccess,
  onSignOut,
}) => {
  const [fullName, setFullName] = useState(user?.full_name || '');
  const [studentNumber, setStudentNumber] = useState(user?.student_number || '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Live availability check for student number
  const [numberStatus, setNumberStatus] = useState<{
    checking: boolean;
    available?: boolean;
    message?: string;
  }>({ checking: false });

  useEffect(() => {
    if (user?.full_name) setFullName(user.full_name);
    if (user?.student_number) setStudentNumber(user.student_number);
  }, [user]);

  // Debounced check for student number uniqueness
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
    }, 350);

    return () => clearTimeout(timer);
  }, [studentNumber, user?.id]);

  if (!isOpen || !user) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const cleanName = fullName.trim();
    const cleanNumber = studentNumber.trim().toUpperCase();

    if (cleanName.length < 3) {
      setError('Por favor, escribe tu nombre y apellidos reales completos (mínimo 3 caracteres).');
      return;
    }

    if (cleanNumber.length < 2) {
      setError('Por favor, introduce tu número de estudiante o NIA.');
      return;
    }

    if (numberStatus.available === false) {
      setError(numberStatus.message || 'Este número de estudiante ya está en uso por otro alumno.');
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
    numberStatus.available !== false &&
    !numberStatus.checking;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-md bg-surface border border-border/80 rounded-2xl shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 pt-6 pb-4 border-b border-border/60 bg-surface-raised/40">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-accent/10 border border-accent/20 flex items-center justify-center text-accent shrink-0">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-foreground tracking-tight">
                Ficha de identificación de alumno
              </h2>
              <p className="text-xs text-foreground-muted">
                Paso obligatorio para acceder a 2º SMR
              </p>
            </div>
          </div>
        </div>

        {/* Content & Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="p-3 rounded-xl bg-accent-subtle/50 border border-accent/20 text-xs text-foreground-muted leading-relaxed">
            Para mantener el aula organizada y evitar cuentas anónimas o suplantaciones,
            debes vincular tu <strong className="text-foreground">nombre real</strong> y tu{' '}
            <strong className="text-foreground">número de estudiante único</strong>.
          </div>

          {error && (
            <div className="p-3 rounded-xl bg-danger-subtle border border-danger/25 text-xs text-danger flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Campo 1: Nombre real */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-foreground block">
              Nombre y apellidos reales
            </label>
            <div className="relative">
              <User className="w-4 h-4 text-foreground-subtle absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Ej. Alejandro Martínez Gómez"
                className="w-full pl-9 pr-3 py-2 text-sm rounded-xl bg-surface-raised border border-border/70 text-foreground placeholder:text-foreground-subtle focus:outline-none focus:ring-2 focus:ring-accent"
              />
            </div>
            <p className="text-[11px] text-foreground-subtle">
              Visible para el delegado y profesores en la gestión de clase.
            </p>
          </div>

          {/* Campo 2: Número de estudiante (ÚNICO) */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-foreground block">
                Número de estudiante / NIA
              </label>
              {numberStatus.checking && (
                <span className="text-[11px] text-foreground-subtle">Comprobando...</span>
              )}
              {!numberStatus.checking && numberStatus.available === true && studentNumber.trim().length >= 2 && (
                <span className="text-[11px] text-success flex items-center gap-1 font-medium">
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
                className={`w-full pl-9 pr-3 py-2 text-sm font-mono uppercase rounded-xl bg-surface-raised border text-foreground placeholder:text-foreground-subtle focus:outline-none focus:ring-2 ${
                  numberStatus.available === false
                    ? 'border-danger focus:ring-danger'
                    : 'border-border/70 focus:ring-accent'
                }`}
              />
            </div>

            {numberStatus.available === false ? (
              <p className="text-[11px] text-danger font-medium">
                {numberStatus.message || 'Este número ya pertenece a otro estudiante.'}
              </p>
            ) : (
              <p className="text-[11px] text-foreground-subtle">
                Identificador único. Ningún otro usuario puede registrar el mismo número.
              </p>
            )}
          </div>

          <div className="pt-2 space-y-2">
            <Button
              type="submit"
              variant="primary"
              size="lg"
              className="w-full rounded-xl"
              disabled={!isFormValid || loading}
              isLoading={loading}
            >
              Completar identificación y entrar
            </Button>

            {onSignOut && (
              <button
                type="button"
                onClick={onSignOut}
                className="w-full text-center text-xs text-foreground-subtle hover:text-danger py-1 transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Cerrar sesión o cambiar de cuenta</span>
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
};
