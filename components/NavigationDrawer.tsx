'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  X,
  Calendar,
  Zap,
  TrendingUp,
  Server,
  Target,
  CircleDot,
  Trophy,
  Coins,
  Settings,
  ShieldCheck,
  Volume2,
  VolumeX,
  LogOut,
  Sparkles,
  BookOpen,
  ListTodo,
  ExternalLink,
  ChevronRight,
  Flame,
  CheckCircle2,
  Lock,
} from 'lucide-react';
import { UserProfile } from '@/lib/types';
import { getUserRank } from '@/lib/economy';
import { sound } from '@/lib/audio';
import { getCurrentScheduleStatus } from '@/lib/scheduleData';

interface NavigationDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: UserProfile | null;
  activeView: string;
  onSelectView: (view: string) => void;
  onOpenLeaderboard: () => void;
  onOpenFaucet: () => void;
  onOpenSettings: () => void;
  onOpenTerms: () => void;
  onOpenTasks?: () => void;
  soundEnabled: boolean;
  onToggleSound: () => void;
  onSignOut: () => void;
}

export const NavigationDrawer: React.FC<NavigationDrawerProps> = ({
  isOpen,
  onClose,
  currentUser,
  activeView,
  onSelectView,
  onOpenLeaderboard,
  onOpenFaucet,
  onOpenSettings,
  onOpenTerms,
  soundEnabled,
  onToggleSound,
  onSignOut,
}) => {
  const [liveStatus, setLiveStatus] = useState(() => getCurrentScheduleStatus());

  useEffect(() => {
    if (!isOpen) return;
    const update = () => setLiveStatus(getCurrentScheduleStatus());
    update();
    const interval = setInterval(update, 15000);
    return () => clearInterval(interval);
  }, [isOpen]);

  // Handle ESC key to close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Prevent background scroll when drawer is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const rank = currentUser ? getUserRank(currentUser.coins) : null;

  const avatarColorMap: Record<string, string> = {
    emerald: 'bg-emerald-500 text-white',
    blue: 'bg-blue-600 text-white',
    purple: 'bg-purple-600 text-white',
    amber: 'bg-amber-500 text-black',
    rose: 'bg-rose-600 text-white',
    cyan: 'bg-cyan-500 text-white',
  };
  const avatarClass = currentUser?.avatar_color
    ? avatarColorMap[currentUser.avatar_color] || 'bg-amber-500 text-black'
    : 'bg-amber-500 text-black';

  const handleNavigate = (view: string) => {
    onSelectView(view);
    sound.tap();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex">
      {/* Backdrop */}
      <div
        onClick={onClose}
        className="fixed inset-0 bg-black/80 backdrop-blur-md transition-opacity animate-in fade-in duration-200"
      />

      {/* Drawer Surface (Slide from left) */}
      <div className="relative w-full max-w-sm sm:max-w-md bg-[#090b0e] border-r border-white/10 h-[100dvh] max-h-[100dvh] flex flex-col shadow-2xl z-10 overflow-y-auto scrollbar-none animate-in slide-in-from-left duration-200 overscroll-contain">
        {/* Drawer Header */}
        <div className="sticky top-0 z-20 px-5 py-4 bg-[#090b0e]/95 backdrop-blur-md border-b border-white/[0.08] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <img src="/logo.png" alt="SMR2 Logo" className="w-7 h-7 object-contain" />
            <div className="flex flex-col">
              <span className="text-sm font-bold text-white font-mono leading-none">
                2º SMR · Menú Completo
              </span>
              <span className="text-[10px] text-zinc-400 font-mono mt-0.5">
                Todas las secciones
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-xl bg-white/[0.05] hover:bg-white/10 text-zinc-400 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* User Card Summary */}
        {currentUser && (
          <div className="p-4 mx-4 mt-4 rounded-2xl bg-gradient-to-br from-white/[0.05] to-white/[0.02] border border-white/[0.08] space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div
                  className={`w-11 h-11 rounded-2xl ${avatarClass} flex items-center justify-center font-mono font-bold text-base shadow-sm uppercase`}
                >
                  {currentUser.username.charAt(0)}
                </div>
                <div className="flex flex-col">
                  <div className="flex items-center gap-1.5">
                    <span className="text-sm font-bold text-white font-mono">
                      @{currentUser.username}
                    </span>
                    {(currentUser.role === 'admin' || currentUser.role === 'delegado') && (
                      <span className="px-1.5 py-0.2 rounded bg-amber-400/20 text-amber-300 font-mono text-[9px] font-semibold">
                        Delegado
                      </span>
                    )}
                  </div>
                  {rank && (
                    <span className={`text-[10px] font-mono font-medium ${rank.color}`}>
                      Rango {rank.name}
                    </span>
                  )}
                </div>
              </div>

              {/* Settings shortcut button */}
              <button
                type="button"
                onClick={() => {
                  onOpenSettings();
                  onClose();
                  sound.tap();
                }}
                title="Ajustes de usuario"
                className="p-2 rounded-xl bg-white/[0.05] hover:bg-white/10 text-zinc-300 hover:text-white transition-colors cursor-pointer"
              >
                <Settings className="w-4 h-4" />
              </button>
            </div>

            {/* Coins Balance Pill + Faucet CTA */}
            <div className="flex items-center justify-between p-2.5 rounded-xl bg-black/40 border border-white/[0.06]">
              <div className="flex items-center gap-2">
                <Coins className="w-4 h-4 text-amber-400" />
                <span className="text-xs font-mono font-bold text-amber-300">
                  {currentUser.coins.toLocaleString('es-ES')} fichas
                </span>
              </div>
              <button
                type="button"
                onClick={() => {
                  onOpenFaucet();
                  onClose();
                  sound.tap();
                }}
                className="px-2.5 py-1 rounded-lg bg-amber-400 text-black text-[11px] font-mono font-bold hover:bg-amber-300 transition-transform active:scale-95 cursor-pointer shadow-sm"
              >
                + Reclamar
              </button>
            </div>
          </div>
        )}

        {/* Live Classroom Status Card */}
        <div className="mx-4 mt-3 p-3 rounded-2xl bg-white/[0.03] border border-white/[0.06] flex items-center gap-3">
          <div
            className={`w-2.5 h-2.5 rounded-full shrink-0 ${
              liveStatus.status === 'in_class'
                ? 'bg-emerald-400 animate-pulse ring-4 ring-emerald-500/20'
                : liveStatus.status === 'recreo'
                ? 'bg-amber-400 animate-pulse ring-4 ring-amber-500/20'
                : 'bg-zinc-600'
            }`}
          />
          <div className="flex flex-col min-w-0">
            <span className="text-[11px] font-bold text-zinc-200 font-mono leading-none">
              {liveStatus.status === 'in_class'
                ? 'Clase en Directo'
                : liveStatus.status === 'recreo'
                ? 'Recreo en Curso'
                : 'Horario Escolar SMR2'}
            </span>
            <span className="text-[10px] text-zinc-400 font-mono truncate mt-0.5">
              {liveStatus.message}
            </span>
          </div>
        </div>

        {/* Categorized Navigation Sections */}
        <div className="flex-1 px-4 py-4 space-y-6">
          {/* Main Feed Direct Link */}
          <div>
            <button
              type="button"
              onClick={() => handleNavigate('feed')}
              className={`w-full flex items-center justify-between p-3 rounded-2xl transition-all cursor-pointer border ${
                activeView === 'feed'
                  ? 'bg-white text-black font-bold border-white shadow-md'
                  : 'bg-white/[0.03] text-zinc-200 border-white/[0.06] hover:bg-white/[0.08]'
              }`}
            >
              <div className="flex items-center gap-3">
                <div
                  className={`w-8 h-8 rounded-xl flex items-center justify-center ${
                    activeView === 'feed' ? 'bg-black text-amber-400' : 'bg-white/10 text-white'
                  }`}
                >
                  <Sparkles className="w-4 h-4" />
                </div>
                <div className="flex flex-col text-left">
                  <span className="text-sm font-bold font-mono">Feed de Clase (Twitter)</span>
                  <span
                    className={`text-[10px] font-mono ${
                      activeView === 'feed' ? 'text-zinc-700' : 'text-zinc-400'
                    }`}
                  >
                    Muro central de avisos, dudas y recreo
                  </span>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 opacity-50" />
            </button>
          </div>

          {/* 1. SECCIÓN ACADÉMICA */}
          <div className="space-y-2">
            <span className="px-2 text-[10px] font-mono uppercase tracking-wider text-zinc-400 font-bold">
              Académico & Aula
            </span>
            <div className="space-y-1">
              {/* Horario Semanal */}
              <button
                type="button"
                onClick={() => handleNavigate('calendar')}
                className={`w-full flex items-center justify-between p-2.5 rounded-xl transition-colors cursor-pointer ${
                  activeView === 'calendar'
                    ? 'bg-blue-500/20 text-blue-300 font-semibold border border-blue-500/30'
                    : 'text-zinc-300 hover:text-white hover:bg-white/[0.05]'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="w-7 h-7 rounded-lg bg-blue-500/10 text-blue-400 flex items-center justify-center">
                    <Calendar className="w-4 h-4" />
                  </div>
                  <div className="flex flex-col text-left">
                    <span className="text-xs font-mono font-medium">Horario Semanal Completo</span>
                    <span className="text-[10px] text-zinc-400 font-mono">
                      Cuadrícula interactiva y materias
                    </span>
                  </div>
                </div>
                <ChevronRight className="w-3.5 h-3.5 text-zinc-500" />
              </button>
            </div>
          </div>

          {/* 2. RECREO & JUEGOS MULTIJUGADOR */}
          <div className="space-y-2">
            <span className="px-2 text-[10px] font-mono uppercase tracking-wider text-zinc-400 font-bold">
              Recreo & Juegos
            </span>
            <div className="space-y-1">
              {/* Ruleta Rusa Multijugador */}
              <button
                type="button"
                onClick={() => handleNavigate('russian_roulette')}
                className={`w-full flex items-center justify-between p-2.5 rounded-xl transition-colors cursor-pointer ${
                  activeView === 'russian_roulette'
                    ? 'bg-amber-400 text-black font-bold shadow-sm'
                    : 'text-zinc-300 hover:text-white hover:bg-white/[0.05]'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`w-7 h-7 rounded-lg flex items-center justify-center ${
                      activeView === 'russian_roulette'
                        ? 'bg-black text-amber-400'
                        : 'bg-amber-400/15 text-amber-300'
                    }`}
                  >
                    <Zap className="w-4 h-4" />
                  </div>
                  <div className="flex flex-col text-left">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-mono font-medium">Ruleta Rusa</span>
                      <span className="text-[9px] px-1 rounded bg-amber-400/20 text-amber-300 font-mono">
                        Multiplayer
                      </span>
                    </div>
                    <span
                      className={`text-[10px] font-mono ${
                        activeView === 'russian_roulette' ? 'text-zinc-900' : 'text-zinc-400'
                      }`}
                    >
                      Salas en directo entre compañeros
                    </span>
                  </div>
                </div>
                <ChevronRight className="w-3.5 h-3.5 opacity-50" />
              </button>

              {/* Crash */}
              <button
                type="button"
                onClick={() => handleNavigate('crash')}
                className={`w-full flex items-center justify-between p-2.5 rounded-xl transition-colors cursor-pointer ${
                  activeView === 'crash'
                    ? 'bg-white text-black font-semibold'
                    : 'text-zinc-300 hover:text-white hover:bg-white/[0.05]'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="w-7 h-7 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
                    <TrendingUp className="w-4 h-4" />
                  </div>
                  <span className="text-xs font-mono font-medium">Crash Multiplicador</span>
                </div>
                <ChevronRight className="w-3.5 h-3.5 text-zinc-500" />
              </button>

              {/* Minas */}
              <button
                type="button"
                onClick={() => handleNavigate('mines')}
                className={`w-full flex items-center justify-between p-2.5 rounded-xl transition-colors cursor-pointer ${
                  activeView === 'mines'
                    ? 'bg-white text-black font-semibold'
                    : 'text-zinc-300 hover:text-white hover:bg-white/[0.05]'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="w-7 h-7 rounded-lg bg-purple-500/10 text-purple-400 flex items-center justify-center">
                    <Server className="w-4 h-4" />
                  </div>
                  <span className="text-xs font-mono font-medium">Campo de Minas</span>
                </div>
                <ChevronRight className="w-3.5 h-3.5 text-zinc-500" />
              </button>

              {/* Slingshot */}
              <button
                type="button"
                onClick={() => handleNavigate('angry')}
                className={`w-full flex items-center justify-between p-2.5 rounded-xl transition-colors cursor-pointer ${
                  activeView === 'angry'
                    ? 'bg-white text-black font-semibold'
                    : 'text-zinc-300 hover:text-white hover:bg-white/[0.05]'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="w-7 h-7 rounded-lg bg-rose-500/10 text-rose-400 flex items-center justify-center">
                    <Target className="w-4 h-4" />
                  </div>
                  <span className="text-xs font-mono font-medium">Slingshot Cable UTP</span>
                </div>
                <ChevronRight className="w-3.5 h-3.5 text-zinc-500" />
              </button>

              {/* Ruleta */}
              <button
                type="button"
                onClick={() => handleNavigate('roulette')}
                className={`w-full flex items-center justify-between p-2.5 rounded-xl transition-colors cursor-pointer ${
                  activeView === 'roulette'
                    ? 'bg-white text-black font-semibold'
                    : 'text-zinc-300 hover:text-white hover:bg-white/[0.05]'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="w-7 h-7 rounded-lg bg-yellow-500/10 text-yellow-400 flex items-center justify-center">
                    <CircleDot className="w-4 h-4" />
                  </div>
                  <span className="text-xs font-mono font-medium">Ruleta Clásica</span>
                </div>
                <ChevronRight className="w-3.5 h-3.5 text-zinc-500" />
              </button>
            </div>
          </div>

          {/* 3. COMUNIDAD & RECOMPENSAS */}
          <div className="space-y-2">
            <span className="px-2 text-[10px] font-mono uppercase tracking-wider text-zinc-400 font-bold">
              Comunidad & Clasificación
            </span>
            <div className="space-y-1">
              {/* Ranking Modal Trigger */}
              <button
                type="button"
                onClick={() => {
                  onOpenLeaderboard();
                  onClose();
                  sound.tap();
                }}
                className="w-full flex items-center justify-between p-2.5 rounded-xl text-zinc-300 hover:text-white hover:bg-white/[0.05] transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <div className="w-7 h-7 rounded-lg bg-amber-400/10 text-amber-400 flex items-center justify-center">
                    <Trophy className="w-4 h-4" />
                  </div>
                  <div className="flex flex-col text-left">
                    <span className="text-xs font-mono font-medium">Clasificación Top</span>
                    <span className="text-[10px] text-zinc-400 font-mono">
                      Ranking de compañeros más ricos
                    </span>
                  </div>
                </div>
                <ChevronRight className="w-3.5 h-3.5 text-zinc-500" />
              </button>

              {/* Faucet Diario Trigger */}
              <button
                type="button"
                onClick={() => {
                  onOpenFaucet();
                  onClose();
                  sound.tap();
                }}
                className="w-full flex items-center justify-between p-2.5 rounded-xl text-zinc-300 hover:text-white hover:bg-white/[0.05] transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <div className="w-7 h-7 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
                    <Coins className="w-4 h-4" />
                  </div>
                  <div className="flex flex-col text-left">
                    <span className="text-xs font-mono font-medium">Fondo Diario (Faucet)</span>
                    <span className="text-[10px] text-zinc-400 font-mono">
                      Reclamo cada 24h & Racha
                    </span>
                  </div>
                </div>
                <ChevronRight className="w-3.5 h-3.5 text-zinc-500" />
              </button>
            </div>
          </div>

          {/* 4. CONFIGURACIÓN Y PRIVACIDAD */}
          <div className="space-y-2">
            <span className="px-2 text-[10px] font-mono uppercase tracking-wider text-zinc-400 font-bold">
              Configuración & Cuenta
            </span>
            <div className="space-y-1">
              {/* Sound Toggle */}
              <button
                type="button"
                onClick={() => {
                  onToggleSound();
                  sound.tap();
                }}
                className="w-full flex items-center justify-between p-2.5 rounded-xl text-zinc-300 hover:text-white hover:bg-white/[0.05] transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <div className="w-7 h-7 rounded-lg bg-white/[0.05] text-zinc-300 flex items-center justify-center">
                    {soundEnabled ? (
                      <Volume2 className="w-4 h-4 text-emerald-400" />
                    ) : (
                      <VolumeX className="w-4 h-4 text-zinc-500" />
                    )}
                  </div>
                  <span className="text-xs font-mono font-medium">Efectos de Sonido</span>
                </div>
                <span
                  className={`text-[10px] font-mono px-2 py-0.5 rounded font-bold ${
                    soundEnabled ? 'bg-emerald-500/20 text-emerald-300' : 'bg-white/10 text-zinc-400'
                  }`}
                >
                  {soundEnabled ? 'Activado' : 'Silenciado'}
                </span>
              </button>

              {/* User Settings */}
              <button
                type="button"
                onClick={() => {
                  onOpenSettings();
                  onClose();
                  sound.tap();
                }}
                className="w-full flex items-center justify-between p-2.5 rounded-xl text-zinc-300 hover:text-white hover:bg-white/[0.05] transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <div className="w-7 h-7 rounded-lg bg-white/[0.05] text-zinc-300 flex items-center justify-center">
                    <Settings className="w-4 h-4" />
                  </div>
                  <span className="text-xs font-mono font-medium">Ajustes de Perfil</span>
                </div>
                <ChevronRight className="w-3.5 h-3.5 text-zinc-500" />
              </button>

              {/* Delegado / Admin Link */}
              {currentUser && (currentUser.role === 'admin' || currentUser.role === 'delegado') && (
                <Link
                  href="/admin"
                  onClick={onClose}
                  className="w-full flex items-center justify-between p-2.5 rounded-xl text-amber-300 hover:bg-amber-400/10 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-7 h-7 rounded-lg bg-amber-400/20 text-amber-400 flex items-center justify-center">
                      <ShieldCheck className="w-4 h-4" />
                    </div>
                    <span className="text-xs font-mono font-medium">Panel de Delegado / Admin</span>
                  </div>
                  <ChevronRight className="w-3.5 h-3.5 text-amber-400" />
                </Link>
              )}

              {/* Normas & Cookies */}
              <button
                type="button"
                onClick={() => {
                  onOpenTerms();
                  onClose();
                  sound.tap();
                }}
                className="w-full flex items-center justify-between p-2.5 rounded-xl text-zinc-400 hover:text-white hover:bg-white/[0.05] transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <div className="w-7 h-7 rounded-lg bg-white/[0.05] text-zinc-400 flex items-center justify-center">
                    <BookOpen className="w-4 h-4" />
                  </div>
                  <span className="text-xs font-mono font-medium">Normas & Privacidad</span>
                </div>
                <ChevronRight className="w-3.5 h-3.5 text-zinc-500" />
              </button>
            </div>
          </div>
        </div>

        {/* Drawer Footer with Signout */}
        <div className="p-4 pb-[max(1.5rem,env(safe-area-inset-bottom))] border-t border-white/[0.08] bg-black/40 mt-auto">
          {currentUser && (
            <button
              type="button"
              onClick={() => {
                onSignOut();
                onClose();
                sound.tap();
              }}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-xs font-mono text-rose-400 bg-rose-500/10 hover:bg-rose-500/20 active:scale-98 transition-all cursor-pointer font-semibold min-h-[44px]"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Cerrar sesión (@{currentUser.username})</span>
            </button>
          )}

          <div className="text-center text-[10px] text-zinc-500 font-mono mt-3">
            SMR2 Portal · IES Informática · 2024–2025
          </div>
        </div>
      </div>
    </div>
  );
};
