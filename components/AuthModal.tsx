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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="border border-border/80 rounded-2xl w-full max-w-sm bg-surface shadow-2xl overflow-hidden flex flex-col">
        <div className="px-5 py-3.5 border-b border-border/70 flex items-center justify-between bg-surface-raised/50">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg overflow-hidden bg-white p-0.5 ring-1 ring-border/70 flex items-center justify-center shrink-0">
              <Image
                src="/logo.png"
                alt="SMR2 Logo"
                width={28}
                height={28}
                className="w-full h-full object-contain"
              />
            </div>
            <h2 className="text-xs font-semibold text-foreground tracking-tight">
              Acceso al portal
            </h2>
          </div>
          <button
            onClick={onClose}
            aria-label="Cerrar modal"
            className="w-8 h-8 rounded-lg text-foreground-muted hover:text-foreground hover:bg-surface-hover flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5">
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
