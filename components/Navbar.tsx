'use client';

import React from 'react';
import { Terminal, Shield, Wifi, Sparkles, UserCheck, LogIn, Database } from 'lucide-react';
import { Profile } from '@/lib/types';

interface NavbarProps {
  user: Profile | null;
  onOpenAuth: () => void;
  isSupabaseConfigured: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({ user, onOpenAuth, isSupabaseConfigured }) => {
  return (
    <header className="sticky top-0 z-40 border-b border-zinc-800 bg-zinc-950/80 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand / Logo */}
        <div className="flex items-center gap-3">
          <div className="relative p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
            <Terminal className="w-5 h-5" />
            <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
            </span>
          </div>

          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono font-bold tracking-tight text-white text-base sm:text-lg">
                2º SMR <span className="text-emerald-400">//</span> INTRANET
              </span>
              <span className="hidden sm:inline-block px-2 py-0.5 text-[10px] font-mono rounded bg-zinc-800 text-zinc-300 border border-zinc-700">
                192.168.2.0/24
              </span>
            </div>
            <p className="text-[11px] text-zinc-400 hidden sm:block">
              La central de marrones, chuletas y frases célebres
            </p>
          </div>
        </div>

        {/* User status & connection badge */}
        <div className="flex items-center gap-3">
          {!isSupabaseConfigured && (
            <div 
              title="Añade NEXT_PUBLIC_SUPABASE_URL en tu .env.local para guardar en la nube"
              className="hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-mono bg-amber-500/10 text-amber-300 border border-amber-500/30"
            >
              <Database className="w-3.5 h-3.5 text-amber-400" />
              <span>Modo Local / Demo</span>
            </div>
          )}

          {user ? (
            <div className="flex items-center gap-2.5 bg-zinc-900 border border-zinc-800 rounded-full py-1 px-3">
              <img
                src={user.avatar_url || 'https://api.dicebear.com/7.x/bottts/svg?seed=user'}
                alt={user.username}
                className="w-7 h-7 rounded-full bg-zinc-800 border border-zinc-700"
              />
              <div className="flex flex-col text-left">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-medium text-white max-w-[100px] truncate">
                    {user.username}
                  </span>
                  <span className="text-[10px] text-emerald-400 font-mono font-semibold">
                    +{user.karma_points} KP
                  </span>
                </div>
                <span className="text-[10px] text-zinc-400 truncate max-w-[120px]">
                  {user.rank}
                </span>
              </div>
            </div>
          ) : (
            <button
              onClick={onOpenAuth}
              className="flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-medium bg-emerald-500 hover:bg-emerald-400 text-zinc-950 transition-colors shadow-sm font-mono cursor-pointer"
            >
              <LogIn className="w-3.5 h-3.5" />
              <span>Entrar / Mote</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
