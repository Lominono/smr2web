'use client';

import React from 'react';
import Image from 'next/image';
import { UserProfile } from '@/lib/types';
import { AuthForm } from '@/components/AuthForm';
import { MobileNotice } from '@/components/MobileNotice';

interface AuthGateProps {
  onAuthSuccess: (user: UserProfile) => void;
  supabaseConfigured: boolean;
}

export const AuthGate: React.FC<AuthGateProps> = ({ onAuthSuccess }) => {
  return (
    <div className="min-h-[100dvh] flex flex-col justify-center items-center bg-black text-neutral-100 p-4 sm:p-6 antialiased select-none">
      <div className="w-full max-w-sm space-y-6 relative z-10 animate-in fade-in duration-300">
        {/* Cabecera con Logo y Título Minimalista estilo Apple */}
        <div className="flex flex-col items-center text-center space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-neutral-900 border border-neutral-800/80 p-2.5 flex items-center justify-center shadow-xs">
            <Image
              src="/logo.png"
              alt="SMR2 Logo"
              width={32}
              height={32}
              className="object-contain"
              priority
            />
          </div>
          <div className="space-y-1">
            <h1 className="text-xl font-semibold tracking-tight text-white font-sans">
              2º SMR
            </h1>
            <p className="text-xs text-neutral-400 font-sans">
              Portal académico y avisos de clase
            </p>
          </div>
        </div>

        {/* Tarjeta del Formulario Minimalista */}
        <div className="p-6 rounded-3xl border border-neutral-800/80 bg-neutral-950/70 backdrop-blur-2xl shadow-xl">
          <AuthForm onSuccess={onAuthSuccess} />
        </div>

        {/* Pie de página discreto */}
        <footer className="text-center space-y-1 text-[11px] font-mono text-neutral-500">
          <p>Curso 2026 / 2027 · Aula 35</p>
        </footer>
      </div>

      {/* Aviso exclusivo para usuarios móviles con disculpas y recomendación PC */}
      <MobileNotice />
    </div>
  );
};

export default AuthGate;
