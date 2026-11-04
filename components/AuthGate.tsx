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
    <div className="min-h-[100dvh] flex flex-col justify-center items-center bg-[#09090b] text-neutral-100 p-4 sm:p-6 antialiased select-none">
      {/* Luz ambiental sutil en el fondo */}
      <div className="absolute w-96 h-96 rounded-full bg-neutral-800/15 blur-3xl pointer-events-none -translate-y-12" />

      <div className="w-full max-w-sm space-y-5 relative z-10 animate-in fade-in slide-in-from-bottom-2 duration-400">
        {/* Cabecera con Logo y Título Minimalista */}
        <div className="flex flex-col items-center text-center space-y-2.5">
          <div className="w-11 h-11 rounded-xl bg-neutral-900 border border-neutral-800 p-2 flex items-center justify-center shadow-md">
            <Image
              src="/logo.png"
              alt="SMR2 Logo"
              width={28}
              height={28}
              className="object-contain"
              priority
            />
          </div>
          <div>
            <h1 className="text-lg font-semibold tracking-tight text-white">
              Portal 2º SMR
            </h1>
            <p className="text-xs text-neutral-400 mt-0.5">
              Acceso a horarios, tareas y avisos
            </p>
          </div>
        </div>

        {/* Tarjeta del Formulario Minimalista */}
        <div className="p-5 sm:p-6 rounded-2xl border border-neutral-800/90 bg-neutral-950/80 backdrop-blur-xl shadow-2xl">
          <AuthForm onSuccess={onAuthSuccess} />
        </div>

        {/* Pie de página discreto */}
        <footer className="text-center space-y-1 text-[11px] font-mono text-neutral-500">
          <p>2º Sistemas Microinformáticos y Redes</p>
          <p className="text-neutral-600">Desarrollado por JuanFe y David</p>
        </footer>
      </div>

      {/* Aviso exclusivo para usuarios móviles con disculpas y recomendación PC */}
      <MobileNotice />
    </div>
  );
};

export default AuthGate;
