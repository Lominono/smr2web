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
  Zap,
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
      username: 'alumno_smr2',
      email: 'alumno@smr2.local',
      coins: 1000,
      biggest_win: 0,
      created_at: new Date().toISOString(),
    };
    onAuthSuccess(demoProfile);
  };

  return (
    <div className="min-h-screen relative flex flex-col justify-between bg-[#070709] bg-dot-matrix text-white p-4 sm:p-6 md:p-10 selection:bg-white selection:text-black overflow-hidden">
      {/* Ambient Lighting Gradients */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[350px] bg-gradient-to-b from-emerald-500/10 via-blue-500/5 to-transparent blur-3xl pointer-events-none" />
      <div className="absolute -bottom-20 -left-20 w-[400px] h-[400px] bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-20 -right-20 w-[400px] h-[400px] bg-indigo-500/5 rounded-full blur-3xl pointer-events-none" />

      {/* Top Header */}
      <header className="relative z-10 max-w-6xl w-full mx-auto flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center shadow-[0_0_15px_rgba(16,185,129,0.25)]">
            <span className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]"></span>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono font-black tracking-tight text-base text-white">
                RECREO
              </span>
              <span className="text-[10px] font-mono px-1.5 py-0.2 rounded-md bg-white/[0.08] text-zinc-300 border border-white/10 font-bold">
                2º SMR
              </span>
            </div>
            <span className="text-[10px] text-zinc-500 font-mono tracking-wider">
              CENTRO DE CONTROL & ARCADE
            </span>
          </div>
        </div>

        <div className="hidden sm:flex items-center gap-2 text-xs font-mono text-zinc-400">
          <span className="px-3 py-1.5 rounded-xl bg-white/[0.03] border border-white/[0.08]">
            Sistemas Microinformáticos y Redes
          </span>
        </div>
      </header>

      {/* Main Content Showcase */}
      <main className="relative z-10 max-w-5xl w-full mx-auto my-auto py-8 sm:py-12 grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
        {/* Left Column: Value Proposition & Modules */}
        <div className="lg:col-span-6 space-y-6 text-left">
          <div className="space-y-3">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-xs font-mono text-emerald-400">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
              <span>Acceso Exclusivo para el Aula</span>
            </div>

            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight font-mono text-white leading-[1.1]">
              HORARIO EN VIVO & ARCADE PRIVADO
            </h1>

            <p className="text-sm sm:text-base text-zinc-400 font-sans leading-relaxed">
              Consulta el horario lectivo oficial con cuenta atrás al recreo, sincroniza tareas y exámenes con tus compañeros y compite en los simuladores de clase.
            </p>
          </div>

          {/* Features Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
            <div className="p-4 rounded-2xl glass-panel-subtle flex items-start gap-3 hover:border-white/15 transition-all">
              <div className="p-2.5 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20 shrink-0">
                <Calendar className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-xs font-bold font-mono text-white">Horario SMR2</h4>
                <p className="text-[11px] text-zinc-400 font-sans mt-0.5 leading-snug">
                  Detección en tiempo real del módulo en curso (SR, SOR, SI, AW...).
                </p>
              </div>
            </div>

            <div className="p-4 rounded-2xl glass-panel-subtle flex items-start gap-3 hover:border-white/15 transition-all">
              <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shrink-0">
                <MessageSquare className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-xs font-bold font-mono text-white">Chat en Tiempo Real</h4>
                <p className="text-[11px] text-zinc-400 font-sans mt-0.5 leading-snug">
                  Mensajería instantánea por WebSockets y traspaso de fichas.
                </p>
              </div>
            </div>

            <div className="p-4 rounded-2xl glass-panel-subtle flex items-start gap-3 hover:border-white/15 transition-all">
              <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20 shrink-0">
                <Target className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-xs font-bold font-mono text-white">Slingshot de Racks</h4>
                <p className="text-[11px] text-zinc-400 font-sans mt-0.5 leading-snug">
                  Físicas 2D realistas de impacto contra switches, routers y servidores.
                </p>
              </div>
            </div>

            <div className="p-4 rounded-2xl glass-panel-subtle flex items-start gap-3 hover:border-white/15 transition-all">
              <div className="p-2.5 rounded-xl bg-rose-500/10 text-rose-400 border border-rose-500/20 shrink-0">
                <TrendingUp className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-xs font-bold font-mono text-white">Crash Telemetría</h4>
                <p className="text-[11px] text-zinc-400 font-sans mt-0.5 leading-snug">
                  Curva de sobrecalentamiento del servidor y multiplicador en vivo.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Premium Auth Card */}
        <div className="lg:col-span-6 w-full max-w-md mx-auto">
          <div className="glass-panel rounded-3xl p-6 sm:p-8 shadow-[0_20px_50px_rgba(0,0,0,0.8)] border border-white/[0.1]">
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
                    ? 'bg-white text-black shadow-md'
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
                    ? 'bg-white text-black shadow-md'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                Crear Cuenta
              </button>
            </div>

            {/* Error Message */}
            {error && (
              <div className="mb-4 p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/25 text-xs font-mono text-rose-300 flex items-start gap-2.5 animate-in fade-in duration-150">
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              {mode === 'register' && (
                <div>
                  <label className="block text-xs font-mono text-zinc-300 mb-1.5 font-medium">
                    Nombre de usuario *
                  </label>
                  <div className="relative">
                    <User className="w-4 h-4 text-zinc-500 absolute left-3.5 top-3.5" />
                    <input
                      type="text"
                      required
                      placeholder="ej: carlos_smr"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      className="w-full min-h-[46px] pl-10 pr-4 py-2.5 bg-black/40 border border-white/[0.1] rounded-xl text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-emerald-400/50 font-mono transition-colors"
                    />
                  </div>
                </div>
              )}

              <div>
                <label className="block text-xs font-mono text-zinc-300 mb-1.5 font-medium">
                  Correo electrónico *
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-zinc-500 absolute left-3.5 top-3.5" />
                  <input
                    type="email"
                    required
                    placeholder="alumno@ejemplo.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full min-h-[46px] pl-10 pr-4 py-2.5 bg-black/40 border border-white/[0.1] rounded-xl text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-emerald-400/50 font-sans transition-colors"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-mono text-zinc-300 mb-1.5 font-medium">
                  Contraseña *
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-zinc-500 absolute left-3.5 top-3.5" />
                  <input
                    type="password"
                    required
                    minLength={6}
                    placeholder="Mínimo 6 caracteres"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full min-h-[46px] pl-10 pr-4 py-2.5 bg-black/40 border border-white/[0.1] rounded-xl text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-emerald-400/50 font-sans transition-colors"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full min-h-[50px] mt-2 py-3.5 px-4 rounded-2xl font-mono text-sm font-bold bg-white hover:bg-zinc-100 text-black shadow-lg shadow-white/10 active:scale-[0.98] transition-all cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50"
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

            {/* 1-Click Fast Guest Entry */}
            <div className="mt-5 pt-4 border-t border-white/[0.06] text-center">
              <button
                type="button"
                onClick={handleDemoAccess}
                className="w-full py-2.5 px-3 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] text-xs font-mono font-medium text-zinc-300 hover:text-white transition-all cursor-pointer flex items-center justify-center gap-2 active:scale-95"
              >
                <Zap className="w-3.5 h-3.5 text-amber-400" />
                <span>Entrada Rápida / Modo Invitado</span>
              </button>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 max-w-6xl w-full mx-auto text-center text-xs text-zinc-600 font-mono pt-4">
        <span>RECREO // SMR2 · Next.js 16 + Supabase Auth & Realtime</span>
      </footer>
    </div>
  );
};
