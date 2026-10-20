'use client';

import React, { useState } from 'react';
import { Mail, Lock, User, AlertCircle } from 'lucide-react';
import { createClient, isSupabaseConfigured } from '@/lib/supabase/client';
import { sound } from '@/lib/audio';
import { UserProfile } from '@/lib/types';
import {
  saveUserSession,
  registerLocalUser,
  loginLocalUser,
  translateAuthError,
} from '@/lib/authSession';

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

    const hasSupabase = isSupabaseConfigured();
    const supabase = createClient();

    try {
      if (mode === 'register') {
        const cleanUsername = username.trim().toLowerCase().replace(/\s+/g, '_');
        const cleanEmail = email.trim().toLowerCase();

        if (cleanUsername.length < 3) {
          setError('El usuario debe tener al menos 3 caracteres');
          setLoading(false);
          sound.broke();
          return;
        }

        if (hasSupabase && supabase) {
          try {
            const { data, error: signUpError } = await supabase.auth.signUp({
              email: cleanEmail,
              password,
              options: {
                data: {
                  username: cleanUsername,
                },
              },
            });

            if (signUpError) throw signUpError;

            if (data.user) {
              const profile: UserProfile = {
                id: data.user.id,
                username: cleanUsername,
                email: data.user.email || cleanEmail,
                coins: 1000,
                biggest_win: 0,
                streak_count: 1,
                created_at: new Date().toISOString(),
                auth_provider: 'supabase',
              };

              try {
                await supabase.from('profiles').insert([
                  {
                    id: profile.id,
                    username: profile.username,
                    coins: profile.coins,
                    biggest_win: profile.biggest_win,
                    streak_count: 1,
                  },
                ]);
              } catch {}

              saveUserSession(profile, true);
              sound.coinWin();
              onAuthSuccess(profile);
              return;
            }
          } catch (supErr: any) {
            console.warn('Supabase register fallback:', supErr);
          }
        }

        // Local registration fallback
        const localProfile = await registerLocalUser(cleanUsername, cleanEmail, password, true);
        saveUserSession(localProfile, true);
        sound.coinWin();
        onAuthSuccess(localProfile);
      } else {
        const cleanIdentifier = email.trim().toLowerCase();

        if (hasSupabase && supabase && cleanIdentifier.includes('@')) {
          try {
            const { data, error: signInError } = await supabase.auth.signInWithPassword({
              email: cleanIdentifier,
              password,
            });

            if (!signInError && data.user) {
              const { data: profileData } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', data.user.id)
                .single();

              const profile: UserProfile = {
                id: data.user.id,
                username: profileData?.username || data.user.email?.split('@')[0] || cleanIdentifier,
                email: data.user.email,
                coins: Number(profileData?.coins ?? 1000),
                biggest_win: Number(profileData?.biggest_win ?? 0),
                streak_count: profileData?.streak_count ? Number(profileData.streak_count) : 1,
                last_claim_date: profileData?.last_claim_date || undefined,
                created_at: profileData?.created_at,
                auth_provider: 'supabase',
              };

              saveUserSession(profile, true);
              sound.coinWin();
              onAuthSuccess(profile);
              return;
            }
          } catch (supErr: any) {
            console.warn('Supabase login fallback:', supErr);
          }
        }

        // Local login fallback
        const localProfile = await loginLocalUser(cleanIdentifier, password, true);
        saveUserSession(localProfile, true);
        sound.coinWin();
        onAuthSuccess(localProfile);
      }
    } catch (err: any) {
      setError(translateAuthError(err));
      sound.broke();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen relative flex flex-col justify-center items-center bg-[#070709] bg-dot-matrix text-white p-4 selection:bg-white selection:text-black">
      {/* Subtle ambient light */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[300px] bg-emerald-500/5 blur-3xl pointer-events-none" />

      {/* Auth Card */}
      <div className="relative z-10 w-full max-w-sm">
        <div className="glass-panel rounded-3xl p-7 shadow-2xl border border-white/[0.08]">
          {/* Logo with natural PNG transparency */}
          <div className="flex flex-col items-center text-center mb-6">
            <img
              src="/logo.png"
              alt="SMR2"
              className="w-24 h-24 object-contain drop-shadow-[0_8px_20px_rgba(0,0,0,0.6)] mb-2 select-none"
            />
            <h1 className="text-xl font-bold font-mono tracking-tight text-white">
              SMR2
            </h1>
            <p className="text-xs text-zinc-500 font-mono mt-0.5">
              Acceso a la plataforma
            </p>
          </div>

          {/* Mode Switcher */}
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
                {mode === 'login' ? 'Correo o usuario' : 'Correo electrónico'}
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-zinc-500 absolute left-3.5 top-3" />
                <input
                  type={mode === 'login' ? 'text' : 'email'}
                  required
                  placeholder={mode === 'login' ? 'alumno@ejemplo.com o tu usuario' : 'alumno@ejemplo.com'}
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
              className="w-full min-h-[44px] mt-2 py-2.5 px-4 rounded-xl font-mono text-xs font-bold bg-white hover:bg-zinc-200 text-black shadow-md active:scale-[0.98] transition-all cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <span>{loading ? 'Verificando...' : mode === 'login' ? 'Iniciar sesión' : 'Registrarse'}</span>
            </button>
          </form>
        </div>

        <p className="text-center text-[11px] text-zinc-600 font-mono mt-4">
          2º Sistemas Microinformáticos y Redes
        </p>
      </div>
    </div>
  );
};
