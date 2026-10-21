'use client';

import React from 'react';
import Image from 'next/image';
import { UserProfile } from '@/lib/types';
import { AuthForm } from '@/components/AuthForm';

interface AuthGateProps {
  onAuthSuccess: (user: UserProfile) => void;
  supabaseConfigured: boolean;
}

export const AuthGate: React.FC<AuthGateProps> = ({ onAuthSuccess }) => {
  return (
    <div className="min-h-screen flex flex-col justify-center items-center bg-background text-foreground p-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="flex flex-col items-center text-center space-y-2">
          <Image
            src="/logo.png"
            alt="SMR2 Logo"
            width={48}
            height={48}
            className="w-12 h-12 object-contain"
            priority
          />
          <div>
            <h1 className="text-base font-semibold tracking-tight text-foreground">
              Portal 2º SMR
            </h1>
            <p className="text-xs text-foreground-muted">
              Identifícate para acceder al horario y al feed de clase
            </p>
          </div>
        </div>

        <div className="p-5 rounded-[var(--radius-lg)] border border-border bg-surface shadow-xs">
          <AuthForm onSuccess={onAuthSuccess} />
        </div>

        <p className="text-center text-[11px] text-foreground-subtle font-mono">
          2º Sistemas Microinformáticos y Redes
        </p>
      </div>
    </div>
  );
};
