'use client';

import React from 'react';
import Image from 'next/image';
import { X } from 'lucide-react';
import { UserProfile } from '@/lib/types';
import { AuthForm } from '@/components/AuthForm';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAuthSuccess: (user: UserProfile) => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  onAuthSuccess,
}) => {
  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="auth-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-in fade-in duration-200 select-none font-sans"
    >
      <div
        className="fixed inset-0"
        onClick={onClose}
        aria-hidden="true"
      />

      <div className="relative z-10 w-full max-w-sm rounded-3xl border border-neutral-200 dark:border-neutral-800/90 bg-white dark:bg-[#09090b] shadow-2xl overflow-hidden flex flex-col text-neutral-900 dark:text-neutral-100 animate-in zoom-in-95 duration-200">
        {/* Cabecera sutil estilo Apple */}
        <div className="px-6 pt-5 pb-3 border-b border-neutral-200/80 dark:border-neutral-800/70 flex items-center justify-between bg-neutral-50/80 dark:bg-[#09090b]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 p-1.5 flex items-center justify-center shrink-0 shadow-xs">
              <Image
                src="/logo.png"
                alt="SMR2 Logo"
                width={20}
                height={20}
                className="object-contain"
              />
            </div>
            <div>
              <h2
                id="auth-modal-title"
                className="text-sm font-semibold text-neutral-900 dark:text-white tracking-tight"
              >
                2º SMR
              </h2>
              <p className="text-[11px] text-neutral-500 dark:text-neutral-400">
                Acceso al portal oficial
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar modal de autenticación"
            className="w-8 h-8 rounded-full text-neutral-400 hover:text-neutral-900 dark:hover:text-white bg-neutral-100 dark:bg-neutral-900/60 hover:bg-neutral-200 dark:hover:bg-neutral-800 border border-neutral-200 dark:border-neutral-800 flex items-center justify-center transition-colors cursor-pointer touch-manipulation"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Formulario */}
        <div className="p-6">
          <AuthForm
            isModal
            onSuccess={(user) => {
              onAuthSuccess(user);
              onClose();
            }}
            onCancel={onClose}
          />
        </div>
      </div>
    </div>
  );
};

export default AuthModal;
