'use client';

import React, { useState } from 'react';
import {
  Lock,
  Mail,
  User,
  ArrowRight,
  AlertCircle,
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
          setError('El usuario debe tener al menos 3 caracteres');
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
      id: 'demo-' + Math.random().toString(36).substring(2, 7),
      username: 'invitado',
      email: 'invitado@smr2.local',
      coins: 1000,
      biggest_win: 0,
      created_at: new Date().toISOString(),
    };
    onAuthSuccess(demoProfile);
  };

  return (
    <div className="min-h-screen relative flex flex-col justify-between items-center bg-[#070709] bg-dot-matrix text-white p-4 sm:p-6 selection:bg-white selection:text-black">
      {/* Ambient Lighting Gradients */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-gradient-to-b from-emerald-500/10 via-blue-500/5 to-transparent blur-3xl pointer-events-none" />

      {/* Top Bar */}
      <header className="relative z-10 w-full max-w-sm flex items-center justify-between pt-2">
        <span className="text-xs font-mono text-zinc-500">2º SMR</span>
        <span className="text-xs font-mono text-zinc-600">v2.0</span>
      </header>

      {/* Centered Minimalist Card */}
      <main className="relative z-10 w-full max-w-sm my-auto py-6">
        <div className="glass-panel rounded-3xl p-6 sm:p-7 shadow-2xl border border-white/[0.08]">
          {/* Logo & Title */}
          <div className="flex flex-col items-center text-center mb-6">
            <div className="relative mb-3">
              <img
                src="/logo.png"
                alt="SMR2 Logo"
                className="w-20 h-20 rounded-2xl object-cover border border-white/10 shadow-lg shadow-black/60"
              />
            </div>
            <h1 className="text-xl font-bold font-mono tracking-tight text-white">
              SMR2
            </h1>
            <p className="text-xs text-zinc-500 font-mono mt-0.5">
              Horario y aula de 2º SMR
            </p>
          </div>

          {/* Mode Tabs */}
          <div className="p-1 rounded-2xl bg-black/60 border border-white/[0.08] flex items-center mb-5">
            <button
              type="button"
              onClick={() => {
                setMode('login');
                setError(null);
                sound.tap();
              }}
              className={`flex-1 py-1.5 text-xs font-mono font-medium rounded-xl transition-all cursor-pointer ${
                mode === 'login'
                  ? 'bg-white text-black font-semibold shadow-sm'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              Entrar
            </button>
            <button
              type="button"
              onClick={() => {
                setMode('register');
                setError(null);
                sound.tap();
              }}
              className={`flex-1 py-1.5 text-xs font-mono font-medium rounded-xl transition-all cursor-pointer ${
                mode === 'register'
                  ? 'bg-white text-black font-semibold shadow-sm'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              Registro
            </button>
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-4 p-3 rounded-2xl bg-rose-500/10 border border-rose-500/25 text-xs font-mono text-rose-300 flex items-start gap-2 animate-in fade-in">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-3.5">
            {mode === 'register' && (
              <div>
                <label className="block text-xs font-mono text-zinc-400 mb-1">
                  Usuario
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-zinc-500 absolute left-3.5 top-3" />
                  <input
                    type="text"
                    required
                    placeholder="ej: carlos"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="w-full min-h-[42px] pl-10 pr-3.5 py-2 bg-black/40 border border-white/[0.08] rounded-xl text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-white/30 font-mono transition-colors"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block text-xs font-mono text-zinc-400 mb-1">
                Correo
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-zinc-500 absolute left-3.5 top-3" />
                <input
                  type="email"
                  required
                  placeholder="alumno@ejemplo.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full min-h-[42px] pl-10 pr-3.5 py-2 bg-black/40 border border-white/[0.08] rounded-xl text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-white/30 font-sans transition-colors"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-mono text-zinc-400 mb-1">
                Contraseña
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-zinc-500 absolute left-3.5 top-3" />
                <input
                  type="password"
                  required
                  minLength={6}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full min-h-[42px] pl-10 pr-3.5 py-2 bg-black/40 border border-white/[0.08] rounded-xl text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-white/30 font-sans transition-colors"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full min-h-[46px] mt-2 py-3 px-4 rounded-xl font-mono text-xs font-bold bg-white hover:bg-zinc-200 text-black shadow-md active:scale-[0.98] transition-all cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <span>{loading ? 'Entrando...' : mode === 'login' ? 'Entrar' : 'Crear cuenta'}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </form>

          {/* Quick guest access */}
          <div className="mt-4 pt-3.5 border-t border-white/[0.06] text-center">
            <button
              type="button"
              onClick={handleDemoAccess}
              className="w-full py-2 px-3 rounded-xl bg-white/[0.03] hover:bg-white/[0.06] border border-white/[0.06] text-xs font-mono text-zinc-400 hover:text-white transition-all cursor-pointer flex items-center justify-center gap-1.5 active:scale-95"
            >
              <Zap className="w-3 h-3 text-amber-400" />
              <span>Entrar como invitado</span>
            </button>
          </div>
        </div>
      </main>

      {/* Clean Footer */}
      <footer className="relative z-10 w-full max-w-sm text-center text-[11px] text-zinc-600 font-mono pb-2">
        <span>SMR2 · Curso 2024–2025</span>
      </footer>
    </div>
  );
};
