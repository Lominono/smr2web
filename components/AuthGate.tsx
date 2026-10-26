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
    <div className="min-h-[100dvh] flex flex-col justify-center items-center bg-background text-foreground p-4 sm:p-6 pt-[env(safe-area-inset-top,0px)] pb-[env(safe-area-inset-bottom,0px)]">
      <div className="w-full max-w-sm space-y-6">
        <div className="flex flex-col items-center text-center space-y-2.5">
          <div className="w-14 h-14 flex items-center justify-center shrink-0 mx-auto">
            <Image
              src="/logo.png"
              alt="SMR2 Logo"
              width={56}
              height={56}
              className="w-full h-full object-contain drop-shadow-xs"
              priority
            />
          </div>
          <div className="space-y-1">
            <h1 className="text-xl font-semibold tracking-tight text-foreground">
              Portal 2º SMR
            </h1>
            <p className="text-xs text-foreground-muted leading-relaxed">
              Horario, tareas y avisos del curso
            </p>
          </div>
        </div>

        <div className="p-5 sm:p-6 rounded-2xl border border-border/80 bg-surface shadow-xs">
          <AuthForm onSuccess={onAuthSuccess} />
        </div>

        <p className="text-center text-[11px] text-foreground-subtle tracking-tight font-mono">
          2º Sistemas Microinformáticos y Redes
        </p>
      </div>
    </div>
  );
};
