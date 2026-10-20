'use client';

import React, { useState, useEffect, useId } from 'react';
import {
  Mail,
  Lock,
  User,
  ArrowRight,
  AlertCircle,
  X,
  ShieldCheck,
  Eye,
  EyeOff,
  Cookie,
  Zap,
} from 'lucide-react';
import { createClient, isSupabaseConfigured } from '@/lib/supabase/client';
import { sound } from '@/lib/audio';
import { UserProfile } from '@/lib/types';
import {
  saveUserSession,
  registerLocalUser,
  loginLocalUser,
  getLastUserIdentifier,
  getRememberMePreference,
  translateAuthError,
} from '@/lib/authSession';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAuthSuccess: (user: UserProfile) => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  onAuthSuccess,
}) => {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [identifier, setIdentifier] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [username, setUsername] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const modalLoginInput = useId();
  const modalEmailInput = useId();
  const modalUserInput = useId();
  const modalPassInput = useId();
  const modalConfirmInput = useId();
  const modalRememberId = useId();

  useEffect(() => {
    if (isOpen) {
      const lastUser = getLastUserIdentifier();
      if (lastUser) {
        setIdentifier(lastUser);
        setEmail(lastUser.includes('@') ? lastUser : '');
        setUsername(!lastUser.includes('@') ? lastUser : '');
      }
      setRememberMe(getRememberMePreference());
      setError(null);
    }
  }, [isOpen]);

  // Compute password strength score (0-4)
  const passwordScore = React.useMemo(() => {
    if (!password) return 0;
    let score = 0;
    if (password.length >= 6) score += 1;
    if (password.length >= 8) score += 1;
    if (/[A-Z]/.test(password) || /[0-9]/.test(password)) score += 1;
    if (/[^A-Za-z0-9]/.test(password) || (/[A-Z]/.test(password) && /[0-9]/.test(password))) score += 1;
    return score;
  }, [password]);

  const strengthLabel = ['', 'Débil', 'Media', 'Buena', 'Excelente'][passwordScore];
  const strengthColor = [
    'bg-zinc-700',
    'bg-rose-500',
    'bg-amber-500',
    'bg-blue-500',
    'bg-emerald-500',
  ][passwordScore];

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const hasSupabase = isSupabaseConfigured();
    const supabase = createClient();

    try {
      if (mode === 'register') {
        const cleanUsername = username.trim().toLowerCase().replace(/\s+/g, '_');
        if (cleanUsername.length < 3) {
          throw new Error('El usuario debe tener al menos 3 caracteres.');
        }
        if (!/^[a-z0-9_]+$/.test(cleanUsername)) {
          throw new Error('El usuario solo puede contener letras, números y guiones bajos.');
        }

        const cleanEmail = email.trim().toLowerCase();
        if (!cleanEmail || !cleanEmail.includes('@') || !cleanEmail.includes('.')) {
          throw new Error('Introduce un correo electrónico válido.');
        }

        if (password.length < 6) {
          throw new Error('La contraseña debe tener al menos 6 caracteres.');
        }

        if (password !== confirmPassword) {
          throw new Error('Las contraseñas no coinciden.');
        }

        // Try Supabase if available
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
                    email: profile.email,
                    coins: profile.coins,
                    biggest_win: profile.biggest_win,
                    streak_count: 1,
                  },
                ]);
              } catch {}

              saveUserSession(profile, rememberMe);
              sound.coinWin();
              onAuthSuccess(profile);
              onClose();
              return;
            }
          } catch (supErr: any) {
            if (supErr?.message?.includes('already registered')) {
              throw supErr;
            }
            console.warn('Supabase sign-up failed in modal, using local fallback:', supErr);
          }
        }

        // Local registration fallback
        const localProfile = await registerLocalUser(cleanUsername, cleanEmail, password, rememberMe);
        sound.coinWin();
        onAuthSuccess(localProfile);
        onClose();
      } else {
        // Login flow
        const cleanIdentifier = identifier.trim();
        if (!cleanIdentifier) {
          throw new Error('Introduce tu correo o nombre de usuario.');
        }
        if (!password) {
          throw new Error('Introduce tu contraseña.');
        }

        // If Supabase is available
        let targetEmail = cleanIdentifier.toLowerCase();
        if (!cleanIdentifier.includes('@') && hasSupabase && supabase) {
          try {
            const { data: pData } = await supabase
              .from('profiles')
              .select('email')
              .eq('username', cleanIdentifier.toLowerCase())
              .maybeSingle();
            if (pData?.email) {
              targetEmail = pData.email;
            }
          } catch {}
        }

        if (hasSupabase && supabase && targetEmail.includes('@')) {
          try {
            const { data, error: signInError } = await supabase.auth.signInWithPassword({
              email: targetEmail,
              password,
            });

            if (signInError) {
              if (!signInError.message.includes('Invalid login credentials')) {
                throw signInError;
              }
            } else if (data.user) {
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

              saveUserSession(profile, rememberMe);
              sound.coinWin();
              onAuthSuccess(profile);
              onClose();
              return;
            }
          } catch (supErr: any) {
            console.warn('Supabase modal sign-in failed:', supErr);
          }
        }

        // Local fallback
        try {
          const localProfile = await loginLocalUser(cleanIdentifier, password, rememberMe);
          sound.coinWin();
          onAuthSuccess(localProfile);
          onClose();
          return;
        } catch (localErr: any) {
          if (hasSupabase && cleanIdentifier.includes('@')) {
            throw new Error('Correo o contraseña incorrectos.');
          } else {
            throw localErr;
          }
        }
      }
    } catch (err: any) {
      setError(translateAuthError(err));
      sound.broke();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xl animate-in fade-in duration-200">
      <div className="glass-panel border border-white/10 rounded-3xl w-full max-w-md shadow-[0_20px_60px_rgba(0,0,0,0.8)] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-white/[0.08] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-white/[0.04] border border-white/10 flex items-center justify-center p-1.5 shrink-0">
              <img
                src="/logo.png"
                alt="SMR2 Logo"
                className="w-full h-full object-contain drop-shadow-[0_4px_10px_rgba(0,0,0,0.6)]"
              />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-white tracking-tight font-sans">
                {mode === 'login' ? 'Iniciar sesión' : 'Crear cuenta'}
              </h3>
              <p className="text-[11px] text-zinc-400 font-mono">
                SMR2 Hub · Tu progreso queda guardado
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            aria-label="Cerrar modal"
            className="p-1.5 rounded-xl text-zinc-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="p-1.5 mx-6 mt-5 rounded-2xl bg-black/50 border border-white/[0.06] flex items-center">
          <button
            type="button"
            onClick={() => {
              setMode('login');
              setError(null);
              sound.tap();
            }}
            className={`flex-1 py-1.5 text-xs font-mono font-semibold rounded-xl transition-all cursor-pointer ${
              mode === 'login'
                ? 'bg-white text-black font-bold shadow-md'
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
            className={`flex-1 py-1.5 text-xs font-mono font-semibold rounded-xl transition-all cursor-pointer ${
              mode === 'register'
                ? 'bg-white text-black font-bold shadow-md'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            Registrarse
          </button>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="mx-6 mt-4 p-3 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-xs font-mono text-rose-300 flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-3.5">
          {mode === 'register' ? (
            <>
              <div>
                <label htmlFor={modalUserInput} className="block text-xs font-mono text-zinc-400 mb-1">
                  Nombre de usuario / Apodo
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-zinc-500 absolute left-3.5 top-3" />
                  <input
                    id={modalUserInput}
                    name="username"
                    type="text"
                    required
                    autoComplete="username"
                    placeholder="ej: carlos_root"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 bg-white/[0.04] border border-white/[0.08] rounded-xl text-xs sm:text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-white/30 font-mono"
                  />
                </div>
              </div>

              <div>
                <label htmlFor={modalEmailInput} className="block text-xs font-mono text-zinc-400 mb-1">
                  Correo electrónico
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-zinc-500 absolute left-3.5 top-3" />
                  <input
                    id={modalEmailInput}
                    name="email"
                    type="email"
                    required
                    autoComplete="email"
                    placeholder="tu@correo.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 bg-white/[0.04] border border-white/[0.08] rounded-xl text-xs sm:text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-white/30 font-sans"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label htmlFor={modalPassInput} className="text-xs font-mono text-zinc-400">
                    Contraseña
                  </label>
                  {password && (
                    <span className="text-[10px] font-mono text-zinc-400">
                      {strengthLabel}
                    </span>
                  )}
                </div>
                <div className="relative">
                  <Lock className="w-4 h-4 text-zinc-500 absolute left-3.5 top-3" />
                  <input
                    id={modalPassInput}
                    name="new-password"
                    type={showPassword ? 'text' : 'password'}
                    required
                    minLength={6}
                    autoComplete="new-password"
                    placeholder="Mínimo 6 caracteres"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-10 pr-10 py-2.5 bg-white/[0.04] border border-white/[0.08] rounded-xl text-xs sm:text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-white/30 font-sans"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    aria-label={showPassword ? 'Ocultar contraseña' : 'Ver contraseña'}
                    className="absolute right-3 top-2.5 p-1 text-zinc-500 hover:text-zinc-200"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {password.length > 0 && (
                  <div className="mt-1.5 flex gap-1 h-1 w-full bg-white/[0.05] rounded-full overflow-hidden">
                    <div
                      className={`h-full transition-all duration-300 ${strengthColor}`}
                      style={{ width: `${(passwordScore / 4) * 100}%` }}
                    />
                  </div>
                )}
              </div>

              <div>
                <label htmlFor={modalConfirmInput} className="block text-xs font-mono text-zinc-400 mb-1">
                  Confirmar Contraseña
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-zinc-500 absolute left-3.5 top-3" />
                  <input
                    id={modalConfirmInput}
                    name="confirm-password"
                    type={showPassword ? 'text' : 'password'}
                    required
                    minLength={6}
                    autoComplete="new-password"
                    placeholder="Repite la contraseña"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 bg-white/[0.04] border border-white/[0.08] rounded-xl text-xs sm:text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-white/30 font-sans"
                  />
                </div>
              </div>
            </>
          ) : (
            <>
              <div>
                <label htmlFor={modalLoginInput} className="block text-xs font-mono text-zinc-400 mb-1">
                  Correo o Usuario
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-zinc-500 absolute left-3.5 top-3" />
                  <input
                    id={modalLoginInput}
                    name="identifier"
                    type="text"
                    required
                    autoComplete="username"
                    placeholder="alumno@ejemplo.com o tu apodo"
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 bg-white/[0.04] border border-white/[0.08] rounded-xl text-xs sm:text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-white/30 font-mono"
                  />
                </div>
              </div>

              <div>
                <label htmlFor={modalPassInput} className="block text-xs font-mono text-zinc-400 mb-1">
                  Contraseña
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-zinc-500 absolute left-3.5 top-3" />
                  <input
                    id={modalPassInput}
                    name="current-password"
                    type={showPassword ? 'text' : 'password'}
                    required
                    minLength={6}
                    autoComplete="current-password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-10 pr-10 py-2.5 bg-white/[0.04] border border-white/[0.08] rounded-xl text-xs sm:text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-white/30 font-sans"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    aria-label={showPassword ? 'Ocultar contraseña' : 'Ver contraseña'}
                    className="absolute right-3 top-2.5 p-1 text-zinc-500 hover:text-zinc-200"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            </>
          )}

          {/* Remember Me Option */}
          <div className="pt-0.5">
            <label
              htmlFor={modalRememberId}
              className="flex items-center gap-2 text-zinc-400 hover:text-zinc-200 cursor-pointer select-none"
            >
              <input
                id={modalRememberId}
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="w-4 h-4 rounded border-white/20 bg-white/[0.05] text-white focus:ring-0 cursor-pointer accent-white"
              />
              <span className="flex items-center gap-1 font-mono text-[11px]">
                <Cookie className="w-3 h-3 text-amber-400/80" />
                Guardar en cookies locales (365 días)
              </span>
            </label>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full mt-2 py-3 rounded-2xl font-mono text-xs sm:text-sm font-bold bg-white hover:bg-zinc-200 text-black transition-all cursor-pointer flex items-center justify-center gap-2 shadow-lg active:scale-95 disabled:opacity-50"
          >
            <span>{loading ? 'Verificando...' : mode === 'login' ? 'Acceder' : 'Registrar Cuenta'}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  );
};
