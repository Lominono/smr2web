'use client';

import React, { useState } from 'react';
import {
  Lock,
  Mail,
  User,
  ArrowRight,
  AlertCircle,
  Calendar,
  MessageSquare,
  Target,
  TrendingUp,
  Sparkles,
  ShieldCheck,
  CheckCircle2,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { sound } from '@/lib/audio';
import { UserProfile } from '@/lib/types';

interface AuthGateProps {
  onAuthSuccess: (user: UserProfile) => void;
  supabaseConfigured: boolean;
}

export const AuthGate: React.FC<AuthGateProps> = ({
  onAuthSuccess,
  supabaseConfigured,
}) => {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const supabase = createClient();

    if (!supabase) {
      setLoading(false);
      setError('Falta configurar las variables de Supabase en .env.local');
      return;
    }

    try {
      if (mode === 'register') {
        const cleanUsername = username.trim().toLowerCase().replace(/\s+/g, '_');
        if (cleanUsername.length < 3) {
          setError('El nombre de usuario debe tener al menos 3 caracteres');
          setLoading(false);
          sound.broke();
          return;
        }

        const { data, error: signUpError } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: {
            data: {
              username: cleanUsername,
            },
          },
        });

        if (signUpError) {
          setError(signUpError.message);
          sound.broke();
          setLoading(false);
          return;
        }

        if (data.user) {
          // Fallback direct insert into profiles in case trigger has delay
          const profile: UserProfile = {
            id: data.user.id,
            username: cleanUsername,
            email: data.user.email,
            coins: 1000,
            biggest_win: 0,
            created_at: new Date().toISOString(),
          };

          try {
            await supabase.from('profiles').insert([profile]);
          } catch {}

          sound.coinWin();
          onAuthSuccess(profile);
        }
      } else {
        const { data, error: signInError } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });

        if (signInError) {
          setError(
            signInError.message === 'Invalid login credentials'
              ? 'Correo o contraseña incorrectos'
              : signInError.message
          );
          sound.broke();
          setLoading(false);
          return;
        }

        if (data.user) {
          const { data: profileData } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', data.user.id)
            .single();

          const profile: UserProfile = {
            id: data.user.id,
            username: profileData?.username || data.user.email?.split('@')[0] || 'usuario',
            email: data.user.email,
            coins: Number(profileData?.coins ?? 1000),
            biggest_win: Number(profileData?.biggest_win ?? 0),
            created_at: profileData?.created_at,
          };

          sound.coinWin();
          onAuthSuccess(profile);
        }
      }
    } catch (err: any) {
      setError(err?.message || 'Error de conexión');
      sound.broke();
    } finally {
      setLoading(false);
    }
  };

  const handleDemoAccess = () => {
    sound.tap();
    const demoProfile: UserProfile = {
      id: 'demo-guest-' + Math.random().toString(36).substring(2, 7),
      username: 'invitado_smr2',
      email: 'demo@smr2.local',
      coins: 1000,
      biggest_win: 0,
      created_at: new Date().toISOString(),
    };
    onAuthSuccess(demoProfile);
  };

  return (
    <div className="min-h-screen flex flex-col justify-between bg-[#09090b] text-white p-4 sm:p-6 md:p-10 selection:bg-white selection:text-black">
      {/* Top Header */}
      <header className="max-w-6xl w-full mx-auto flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-6 h-6 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center">
            <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
          </div>
          <span className="font-mono font-bold tracking-tight text-sm text-white">
            RECREO
          </span>
          <span className="text-[11px] font-mono text-zinc-500 hidden sm:inline">
            / 2º SMR
          </span>
        </div>

        <div className="flex items-center gap-2 text-xs font-mono text-zinc-400">
          <span className="px-2.5 py-1 rounded-lg bg-white/[0.04] border border-white/[0.08]">
            Sistemas Microinformáticos y Redes
          </span>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="max-w-5xl w-full mx-auto my-auto py-8 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
        {/* Left Column: Value Proposition & Feature Badges */}
        <div className="lg:col-span-6 space-y-6 text-left">
          <div className="space-y-3">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/[0.04] border border-white/[0.08] text-xs font-mono text-zinc-300">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
              <span>Acceso exclusivo para el aula</span>
            </div>

            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight font-mono text-white leading-tight">
              PORTAL DE CLASE & ARCADE
            </h1>

            <p className="text-sm sm:text-base text-zinc-400 font-sans leading-relaxed">
              Inicia sesión con tu cuenta para acceder al horario oficial de SMR2 en directo,
              la agenda de exámenes compartida, el chat en tiempo real y los minijuegos.
            </p>
          </div>

          {/* Grid of 4 Core Pillars */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
            <div className="p-3.5 rounded-2xl bg-white/[0.03] border border-white/[0.06] flex items-start gap-3">
              <div className="p-2 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20 shrink-0">
                <Calendar className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-xs font-bold font-mono text-white">Horario & Recreo</h4>
                <p className="text-[11px] text-zinc-400 font-sans mt-0.5">
                  Detección en vivo de la clase actual y cuenta atrás al recreo.
                </p>
              </div>
            </div>

            <div className="p-3.5 rounded-2xl bg-white/[0.03] border border-white/[0.06] flex items-start gap-3">
              <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shrink-0">
                <MessageSquare className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-xs font-bold font-mono text-white">Chat en Tiempo Real</h4>
                <p className="text-[11px] text-zinc-400 font-sans mt-0.5">
                  Conversación sincronizada por WebSockets con Supabase.
                </p>
              </div>
            </div>

            <div className="p-3.5 rounded-2xl bg-white/[0.03] border border-white/[0.06] flex items-start gap-3">
              <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20 shrink-0">
                <Target className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-xs font-bold font-mono text-white">Slingshot & Crash</h4>
                <p className="text-[11px] text-zinc-400 font-sans mt-0.5">
                  Físicas realistas de servidores y multiplicador exponencial.
                </p>
              </div>
            </div>

            <div className="p-3.5 rounded-2xl bg-white/[0.03] border border-white/[0.06] flex items-start gap-3">
              <div className="p-2 rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20 shrink-0">
                <ShieldCheck className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-xs font-bold font-mono text-white">Base de Datos Real</h4>
                <p className="text-[11px] text-zinc-400 font-sans mt-0.5">
                  Tus fichas y récords guardados de forma segura.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Authentication Card */}
        <div className="lg:col-span-6 w-full max-w-md mx-auto">
          <div className="bg-[#121215] border border-white/[0.1] rounded-3xl p-6 sm:p-8 shadow-[0_16px_50px_rgba(0,0,0,0.7)] backdrop-blur-xl">
            {/* Mode Switcher */}
            <div className="p-1 rounded-2xl bg-black/60 border border-white/[0.08] flex items-center mb-6">
              <button
                type="button"
                onClick={() => {
                  setMode('login');
                  setError(null);
                  sound.tap();
                }}
                className={`flex-1 py-2 text-xs font-mono font-bold rounded-xl transition-all cursor-pointer ${
                  mode === 'login'
                    ? 'bg-zinc-200 text-black shadow-sm'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                Iniciar Sesión
              </button>
              <button
                type="button"
                onClick={() => {
                  setMode('register');
                  setError(null);
                  sound.tap();
                }}
                className={`flex-1 py-2 text-xs font-mono font-bold rounded-xl transition-all cursor-pointer ${
                  mode === 'register'
                    ? 'bg-zinc-200 text-black shadow-sm'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                Crear Cuenta
              </button>
            </div>

            {/* Error Message */}
            {error && (
              <div className="mb-4 p-3 rounded-2xl bg-rose-500/10 border border-rose-500/25 text-xs font-mono text-rose-300 flex items-start gap-2 animate-in fade-in duration-150">
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              {mode === 'register' && (
                <div>
                  <label className="block text-xs font-mono text-zinc-400 mb-1.5">
                    Apodo / Nombre de usuario *
                  </label>
                  <div className="relative">
                    <User className="w-4 h-4 text-zinc-500 absolute left-3.5 top-3" />
                    <input
                      type="text"
                      required
                      placeholder="ej: carlos_smr"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      className="w-full min-h-[44px] pl-10 pr-4 py-2.5 bg-white/[0.04] border border-white/[0.08] rounded-xl text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-white/30 font-mono transition-colors"
                    />
                  </div>
                </div>
              )}

              <div>
                <label className="block text-xs font-mono text-zinc-400 mb-1.5">
                  Correo electrónico *
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-zinc-500 absolute left-3.5 top-3" />
                  <input
                    type="email"
                    required
                    placeholder="alumno@ejemplo.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full min-h-[44px] pl-10 pr-4 py-2.5 bg-white/[0.04] border border-white/[0.08] rounded-xl text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-white/30 font-sans transition-colors"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-mono text-zinc-400 mb-1.5">
                  Contraseña *
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-zinc-500 absolute left-3.5 top-3" />
                  <input
                    type="password"
                    required
                    minLength={6}
                    placeholder="Mínimo 6 caracteres"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full min-h-[44px] pl-10 pr-4 py-2.5 bg-white/[0.04] border border-white/[0.08] rounded-xl text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-white/30 font-sans transition-colors"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full min-h-[48px] mt-2 py-3.5 px-4 rounded-2xl font-mono text-sm font-bold bg-white hover:bg-zinc-200 text-black shadow-lg active:scale-[0.98] transition-all cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50"
              >
                <span>
                  {loading
                    ? 'Verificando credenciales...'
                    : mode === 'login'
                    ? 'Acceder al Aula'
                    : 'Registrarse (+1.000 fichas)'}
                </span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>

            {/* Offline / Demo fallback option */}
            <div className="mt-5 pt-4 border-t border-white/[0.06] text-center">
              <button
                type="button"
                onClick={handleDemoAccess}
                className="text-xs font-mono text-zinc-500 hover:text-zinc-300 transition-colors underline cursor-pointer"
              >
                O entrar en modo prueba / invitado rápido
              </button>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="max-w-6xl w-full mx-auto text-center text-xs text-zinc-600 font-mono pt-4">
        <span>RECREO // SMR2 · Next.js 16 + Supabase Auth & Realtime</span>
      </footer>
    </div>
  );
};
