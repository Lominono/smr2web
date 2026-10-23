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
      <div className="w-full max-w-sm space-y-7">
        <div className="flex flex-col items-center text-center space-y-3">
          <div className="w-16 h-16 flex items-center justify-center shrink-0 mx-auto">
            <Image
              src="/logo.png"
              alt="SMR2 Logo"
              width={64}
              height={64}
              className="w-full h-full object-contain drop-shadow-sm"
              priority
            />
          </div>
          <div className="space-y-1">
            <h1 className="text-xl font-semibold tracking-tight text-foreground">
              Portal 2º SMR
            </h1>
            <p className="text-xs text-foreground-muted leading-relaxed">
              Plataforma exclusiva para estudiantes de 2º SMR.
            </p>
            <div className="inline-flex items-center px-2 py-0.5 rounded-full bg-danger-subtle text-danger text-[10px] font-medium border border-danger/20">
              Solo estudiantes · Profesores no permitidos
            </div>
          </div>
        </div>

        <div className="p-6 rounded-2xl border border-border/70 bg-surface shadow-xs">
          <AuthForm onSuccess={onAuthSuccess} />
        </div>

        <p className="text-center text-[11px] text-foreground-subtle tracking-tight">
          2º Sistemas Microinformáticos y Redes · Curso lectivo
        </p>
      </div>
    </div>
  );
};
