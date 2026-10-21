'use client';

import React from 'react';
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 animate-in fade-in duration-150">
      <div className="border border-border rounded-[var(--radius-lg)] w-full max-w-sm bg-surface shadow-md overflow-hidden flex flex-col">
        <div className="px-4 py-3 border-b border-border flex items-center justify-between bg-surface-raised">
          <h2 className="text-xs font-semibold text-foreground">
            Acceso a la cuenta
          </h2>
          <button
            onClick={onClose}
            aria-label="Cerrar modal"
            className="p-1 rounded-[var(--radius-sm)] text-foreground-muted hover:text-foreground hover:bg-surface-hover cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-4">
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
