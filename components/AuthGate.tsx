'use client';

import React, { useState, useEffect, useId } from 'react';
import {
  Mail,
  Lock,
  User,
  AlertCircle,
  Eye,
  EyeOff,
  Cookie,
  ArrowRight,
  CheckCircle2,
  Sparkles,
  RefreshCw,
  Inbox,
} from 'lucide-react';
import { sound } from '@/lib/audio';
import { UserProfile } from '@/lib/types';
import {
  loginAccount,
  registerAccount,
  checkUsernameAvailability,
  validateUsername,
} from '@/lib/authService';
import {
  getLastUserIdentifier,
  getRememberMePreference,
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
  const [identifier, setIdentifier] = useState('');
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Email confirmation required state
  const [pendingConfirmation, setPendingConfirmation] = useState<{
    email: string;
    message: string;
  } | null>(null);

  // Real-time username feedback
  const [usernameStatus, setUsernameStatus] = useState<{
    checking: boolean;
    available?: boolean;
    message?: string;
  }>({ checking: false });

  const loginInputId = useId();
  const emailInputId = useId();
  const usernameInputId = useId();
  const passwordInputId = useId();
  const confirmPassInputId = useId();
  const rememberCheckboxId = useId();

  // Load remembered user identifier on mount
  useEffect(() => {
    const lastUser = getLastUserIdentifier();
    if (lastUser) {
      setIdentifier(lastUser);
      if (lastUser.includes('@')) {
        setEmail(lastUser);
      } else {
        setUsername(lastUser);
      }
    }
    setRememberMe(getRememberMePreference());
  }, []);

  // Debounced real-time username availability check on register
  useEffect(() => {
    if (mode !== 'register' || !username.trim()) {
      setUsernameStatus({ checking: false });
      return;
    }

    const clean = username.trim().toLowerCase().replace(/\s+/g, '_');
    const valid = validateUsername(clean);
    if (!valid.valid) {
      setUsernameStatus({ checking: false, available: false, message: valid.error });
      return;
    }

    setUsernameStatus({ checking: true });
    const timer = setTimeout(async () => {
      try {
        const res = await checkUsernameAvailability(clean);
        setUsernameStatus({ checking: false, available: res.available, message: res.message });
      } catch {
        setUsernameStatus({ checking: false });
      }
    }, 400);

    return () => clearTimeout(timer);
  }, [username, mode]);

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

  const passwordsMatch = confirmPassword.length > 0 && password === confirmPassword;
  const passwordsMismatch = confirmPassword.length > 0 && password !== confirmPassword;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (mode === 'register') {
        const result = await registerAccount({
          username,
          email,
          password,
          confirmPassword,
          rememberMe,
        });

        if (result.requiresEmailConfirmation && result.confirmationEmail) {
          sound.coinWin();
          setPendingConfirmation({
            email: result.confirmationEmail,
            message: result.message || 'Por favor, confirma tu correo electrónico.',
          });
          return;
        }

        if (result.user) {
          sound.coinWin();
          onAuthSuccess(result.user);
        }
      } else {
        const result = await loginAccount({
          identifier,
          password,
          rememberMe,
        });

        if (result.user) {
          sound.coinWin();
          onAuthSuccess(result.user);
        }
      }
    } catch (err: any) {
      sound.broke();
      setError(translateAuthError(err));
    } finally {
      setLoading(false);
    }
  };

  // If email confirmation is required, show informative confirmation screen
  if (pendingConfirmation) {
    return (
      <div className="min-h-[100dvh] relative flex flex-col justify-center items-center bg-[#070709] bg-dot-matrix text-white p-3.5 sm:p-4 selection:bg-white selection:text-black">
        <div className="relative z-10 w-full max-w-sm">
          <div className="glass-panel rounded-3xl p-5 sm:p-7 shadow-2xl border border-white/[0.08] text-center">
            <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto mb-4">
              <Inbox className="w-8 h-8 animate-bounce" />
            </div>

            <h2 className="text-lg font-bold font-mono text-white mb-2">
              ¡Revisa tu correo!
            </h2>
            <p className="text-xs text-zinc-400 font-sans leading-relaxed mb-4">
              Hemos enviado un enlace de confirmación a:
              <br />
              <span className="text-white font-mono font-semibold">{pendingConfirmation.email}</span>
            </p>

            <div className="p-3 rounded-2xl bg-white/[0.03] border border-white/[0.08] text-[11px] text-zinc-400 font-mono text-left mb-6 space-y-1">
              <p className="text-zinc-300 font-semibold">Pasos siguientes:</p>
              <p>1. Abre el enlace en tu correo (revisa spam si no lo ves).</p>
              <p>2. Vuelve aquí e inicia sesión con tu usuario y contraseña.</p>
            </div>

            <button
              type="button"
              onClick={() => {
                setPendingConfirmation(null);
                setMode('login');
                setIdentifier(pendingConfirmation.email);
                setError(null);
                sound.tap();
              }}
              className="w-full py-3 px-4 rounded-xl font-mono text-xs font-bold bg-white hover:bg-zinc-200 text-black shadow-md transition-all cursor-pointer flex items-center justify-center gap-2"
            >
              <span>Ir a Iniciar Sesión</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[100dvh] relative flex flex-col justify-center items-center bg-[#070709] bg-dot-matrix text-white p-3.5 sm:p-4 selection:bg-white selection:text-black">
      {/* Auth Card */}
      <div className="relative z-10 w-full max-w-sm">
        <div className="glass-panel rounded-3xl p-5 sm:p-7 shadow-2xl border border-white/[0.08]">
          {/* Logo with natural PNG transparency */}
          <div className="flex flex-col items-center text-center mb-6">
            <img
              src="/logo.png"
              alt="SMR2"
              className="w-20 h-20 object-contain drop-shadow-md mb-2 select-none"
            />
            <h1 className="text-xl font-bold font-mono tracking-tight text-white">
              2º SMR
            </h1>
            <p className="text-xs text-zinc-400 font-sans mt-0.5">
              Horario de clase, tareas y minijuegos de recreo
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
              Iniciar Sesión
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
              Registrarse (1.000 fichas)
            </button>
          </div>

          {/* Error Message with Quick Action */}
          {error && (
            <div className="mb-4 p-3 rounded-2xl bg-rose-500/10 border border-rose-500/25 text-xs font-mono text-rose-300 flex flex-col gap-2 animate-in fade-in">
              <div className="flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
              {error.includes('inicia sesión') && mode === 'register' && (
                <button
                  type="button"
                  onClick={() => {
                    setMode('login');
                    setIdentifier(email || username);
                    setError(null);
                    sound.tap();
                  }}
                  className="self-end text-[11px] font-semibold text-rose-200 hover:text-white underline cursor-pointer"
                >
                  ¿Cambiar a Iniciar Sesión?
                </button>
              )}
              {error.includes('No se encontró ninguna cuenta') && mode === 'login' && (
                <button
                  type="button"
                  onClick={() => {
                    setMode('register');
                    if (identifier.includes('@')) setEmail(identifier);
                    else setUsername(identifier);
                    setError(null);
                    sound.tap();
                  }}
                  className="self-end text-[11px] font-semibold text-rose-200 hover:text-white underline cursor-pointer"
                >
                  ¿Crear cuenta ahora?
                </button>
              )}
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-3.5">
            {mode === 'register' ? (
              <>
                {/* Username Input */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label htmlFor={usernameInputId} className="text-xs font-mono text-zinc-400">
                      Nombre de usuario / Apodo
                    </label>
                    {usernameStatus.checking && (
                      <span className="text-[10px] font-mono text-zinc-500 flex items-center gap-1">
                        <RefreshCw className="w-2.5 h-2.5 animate-spin" />
                        Comprobando...
                      </span>
                    )}
                    {!usernameStatus.checking && usernameStatus.available === true && (
                      <span className="text-[10px] font-mono text-emerald-400 flex items-center gap-1">
                        <CheckCircle2 className="w-2.5 h-2.5" />
                        Disponible
                      </span>
                    )}
                  </div>
                  <div className="relative">
                    <User className="w-4 h-4 text-zinc-500 absolute left-3.5 top-3" />
                    <input
                      id={usernameInputId}
                      name="username"
                      type="text"
                      required
                      autoComplete="username"
                      placeholder="ej: carlos_root"
                      value={username}
                      onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/\s+/g, '_'))}
                      className="w-full min-h-[42px] pl-10 pr-3.5 py-2 bg-black/40 border border-white/[0.08] rounded-xl text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-white/30 font-mono transition-colors"
                    />
                  </div>
                  {usernameStatus.message && usernameStatus.available === false && (
                    <p className="text-[10px] text-rose-400 font-mono mt-1">
                      {usernameStatus.message}
                    </p>
                  )}
                </div>

                {/* Email Input */}
                <div>
                  <label htmlFor={emailInputId} className="block text-xs font-mono text-zinc-400 mb-1">
                    Correo electrónico
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-zinc-500 absolute left-3.5 top-3" />
                    <input
                      id={emailInputId}
                      name="email"
                      type="email"
                      required
                      autoComplete="email"
                      placeholder="alumno@ejemplo.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full min-h-[42px] pl-10 pr-3.5 py-2 bg-black/40 border border-white/[0.08] rounded-xl text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-white/30 font-sans transition-colors"
                    />
                  </div>
                </div>

                {/* Password Input */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label htmlFor={passwordInputId} className="text-xs font-mono text-zinc-400">
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
                      id={passwordInputId}
                      name="new-password"
                      type={showPassword ? 'text' : 'password'}
                      required
                      minLength={6}
                      autoComplete="new-password"
                      placeholder="Mínimo 6 caracteres"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full min-h-[42px] pl-10 pr-10 py-2 bg-black/40 border border-white/[0.08] rounded-xl text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-white/30 font-sans transition-colors"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      aria-label={showPassword ? 'Ocultar contraseña' : 'Ver contraseña'}
                      className="absolute right-3 top-2.5 p-1 text-zinc-500 hover:text-zinc-200 transition-colors cursor-pointer"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>

                  {/* Password strength bar */}
                  {password.length > 0 && (
                    <div className="mt-1.5 flex gap-1 h-1 w-full bg-white/[0.05] rounded-full overflow-hidden">
                      <div
                        className={`h-full transition-all duration-300 ${strengthColor}`}
                        style={{ width: `${(passwordScore / 4) * 100}%` }}
                      />
                    </div>
                  )}
                </div>

                {/* Confirm Password Input */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label htmlFor={confirmPassInputId} className="text-xs font-mono text-zinc-400">
                      Confirmar Contraseña
                    </label>
                    {passwordsMatch && (
                      <span className="text-[10px] font-mono text-emerald-400 flex items-center gap-1">
                        <CheckCircle2 className="w-2.5 h-2.5" />
                        Coinciden
                      </span>
                    )}
                    {passwordsMismatch && (
                      <span className="text-[10px] font-mono text-rose-400">
                        No coinciden
                      </span>
                    )}
                  </div>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-zinc-500 absolute left-3.5 top-3" />
                    <input
                      id={confirmPassInputId}
                      name="confirm-password"
                      type={showConfirmPassword ? 'text' : 'password'}
                      required
                      minLength={6}
                      autoComplete="new-password"
                      placeholder="Repite la contraseña"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className={`w-full min-h-[42px] pl-10 pr-10 py-2 bg-black/40 border rounded-xl text-sm text-white placeholder:text-zinc-600 focus:outline-none font-sans transition-colors ${
                        passwordsMismatch
                          ? 'border-rose-500/50 focus:border-rose-500'
                          : passwordsMatch
                          ? 'border-emerald-500/50 focus:border-emerald-500'
                          : 'border-white/[0.08] focus:border-white/30'
                      }`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      aria-label={showConfirmPassword ? 'Ocultar confirmación' : 'Ver confirmación'}
                      className="absolute right-3 top-2.5 p-1 text-zinc-500 hover:text-zinc-200 transition-colors cursor-pointer"
                    >
                      {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              </>
            ) : (
              <>
                {/* Identifier Input */}
                <div>
                  <label htmlFor={loginInputId} className="block text-xs font-mono text-zinc-400 mb-1">
                    Correo o Nombre de Usuario
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-zinc-500 absolute left-3.5 top-3" />
                    <input
                      id={loginInputId}
                      name="identifier"
                      type="text"
                      required
                      autoComplete="username"
                      placeholder="alumno@ejemplo.com o tu apodo"
                      value={identifier}
                      onChange={(e) => setIdentifier(e.target.value)}
                      className="w-full min-h-[42px] pl-10 pr-3.5 py-2 bg-black/40 border border-white/[0.08] rounded-xl text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-white/30 font-sans transition-colors"
                    />
                  </div>
                </div>

                {/* Password Input */}
                <div>
                  <label htmlFor={passwordInputId} className="block text-xs font-mono text-zinc-400 mb-1">
                    Contraseña
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-zinc-500 absolute left-3.5 top-3" />
                    <input
                      id={passwordInputId}
                      name="current-password"
                      type={showPassword ? 'text' : 'password'}
                      required
                      minLength={6}
                      autoComplete="current-password"
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full min-h-[42px] pl-10 pr-10 py-2 bg-black/40 border border-white/[0.08] rounded-xl text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-white/30 font-sans transition-colors"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      aria-label={showPassword ? 'Ocultar contraseña' : 'Ver contraseña'}
                      className="absolute right-3 top-2.5 p-1 text-zinc-500 hover:text-zinc-200 transition-colors cursor-pointer"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              </>
            )}

            {/* Remember Me via Cookies */}
            <div className="pt-1">
              <label
                htmlFor={rememberCheckboxId}
                className="flex items-center gap-2 text-zinc-400 hover:text-zinc-200 cursor-pointer select-none"
              >
                <input
                  id={rememberCheckboxId}
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="w-4 h-4 rounded border-white/20 bg-white/[0.05] text-white focus:ring-0 cursor-pointer accent-white"
                />
                <span className="flex items-center gap-1 font-mono text-[11px]">
                  <Cookie className="w-3 h-3 text-amber-400/80" />
                  Recordar sesión en este equipo (365 días)
                </span>
              </label>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading || (mode === 'register' && passwordsMismatch)}
              className="w-full min-h-[44px] mt-2 py-2.5 px-4 rounded-xl font-mono text-xs font-bold bg-white hover:bg-zinc-200 text-black shadow-md active:scale-[0.98] transition-all cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Verificando credenciales...</span>
                </>
              ) : mode === 'login' ? (
                <>
                  <span>Iniciar sesión</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </>
              ) : (
                <>
                  <span>Crear cuenta (1.000 fichas)</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </>
              )}
            </button>
          </form>
        </div>

        <p className="text-center text-[11px] text-zinc-500 font-mono mt-4">
          2º Sistemas Microinformáticos y Redes
        </p>
      </div>
    </div>
  );
};
