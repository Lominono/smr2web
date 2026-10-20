'use client';

import React, { useState, useEffect, useId } from 'react';
import {
  Mail,
  Lock,
  User,
  ArrowRight,
  AlertCircle,
  X,
  Eye,
  EyeOff,
  Cookie,
  CheckCircle2,
  RefreshCw,
  Sparkles,
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
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Email confirmation state
  const [pendingConfirmation, setPendingConfirmation] = useState<{
    email: string;
    message: string;
  } | null>(null);

  // Real-time username check state
  const [usernameStatus, setUsernameStatus] = useState<{
    checking: boolean;
    available?: boolean;
    message?: string;
  }>({ checking: false });

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
        if (lastUser.includes('@')) {
          setEmail(lastUser);
        } else {
          setUsername(lastUser);
        }
      }
      setRememberMe(getRememberMePreference());
      setError(null);
      setPendingConfirmation(null);
    }
  }, [isOpen]);

  // Debounced real-time username availability check on register
  useEffect(() => {
    if (!isOpen || mode !== 'register' || !username.trim()) {
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
  }, [username, mode, isOpen]);

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

  if (!isOpen) return null;

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
          onClose();
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
          onClose();
        }
      }
    } catch (err: any) {
      sound.broke();
      setError(translateAuthError(err));
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
                2º SMR · Guarda tus fichas y progreso
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

        {/* If pending email confirmation */}
        {pendingConfirmation ? (
          <div className="p-6 text-center space-y-4">
            <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto">
              <Inbox className="w-7 h-7 animate-bounce" />
            </div>
            <h4 className="text-base font-bold font-mono text-white">
              ¡Revisa tu correo!
            </h4>
            <p className="text-xs text-zinc-400 font-sans leading-relaxed">
              Hemos enviado un enlace de confirmación a:
              <br />
              <span className="text-white font-mono font-semibold">{pendingConfirmation.email}</span>
            </p>
            <button
              type="button"
              onClick={() => {
                setPendingConfirmation(null);
                setMode('login');
                setIdentifier(pendingConfirmation.email);
                setError(null);
                sound.tap();
              }}
              className="w-full py-2.5 px-4 rounded-xl font-mono text-xs font-bold bg-white hover:bg-zinc-200 text-black shadow-md transition-all cursor-pointer flex items-center justify-center gap-2"
            >
              <span>Ir a Iniciar Sesión</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <>
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
                Registrarse (1.000 fichas)
              </button>
            </div>

            {/* Error Alert with Quick Switch */}
            {error && (
              <div className="mx-6 mt-4 p-3 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-xs font-mono text-rose-300 flex flex-col gap-2">
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
            <form onSubmit={handleSubmit} className="p-6 space-y-3.5">
              {mode === 'register' ? (
                <>
                  {/* Username Input */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label htmlFor={modalUserInput} className="text-xs font-mono text-zinc-400">
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
                        id={modalUserInput}
                        name="username"
                        type="text"
                        required
                        autoComplete="username"
                        placeholder="ej: carlos_root"
                        value={username}
                        onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/\s+/g, '_'))}
                        className="w-full pl-10 pr-4 py-2.5 bg-white/[0.04] border border-white/[0.08] rounded-xl text-xs sm:text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-white/30 font-mono"
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

                  {/* Password Input */}
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
                        className="absolute right-3 top-2.5 p-1 text-zinc-500 hover:text-zinc-200 cursor-pointer"
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

                  {/* Confirm Password Input */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label htmlFor={modalConfirmInput} className="text-xs font-mono text-zinc-400">
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
                        id={modalConfirmInput}
                        name="confirm-password"
                        type={showConfirmPassword ? 'text' : 'password'}
                        required
                        minLength={6}
                        autoComplete="new-password"
                        placeholder="Repite la contraseña"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        className={`w-full pl-10 pr-10 py-2.5 bg-white/[0.04] border rounded-xl text-xs sm:text-sm text-white placeholder:text-zinc-600 focus:outline-none font-sans transition-colors ${
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
                        className="absolute right-3 top-2.5 p-1 text-zinc-500 hover:text-zinc-200 cursor-pointer"
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
                    <label htmlFor={modalLoginInput} className="block text-xs font-mono text-zinc-400 mb-1">
                      Correo o Nombre de Usuario
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
                        className="w-full pl-10 pr-4 py-2.5 bg-white/[0.04] border border-white/[0.08] rounded-xl text-xs sm:text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-white/30 font-sans"
                      />
                    </div>
                  </div>

                  {/* Password Input */}
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
                        className="absolute right-3 top-2.5 p-1 text-zinc-500 hover:text-zinc-200 cursor-pointer"
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

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading || (mode === 'register' && passwordsMismatch)}
                className="w-full mt-2 py-3 rounded-2xl font-mono text-xs sm:text-sm font-bold bg-white hover:bg-zinc-200 text-black transition-all cursor-pointer flex items-center justify-center gap-2 shadow-lg active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Verificando...</span>
                  </>
                ) : mode === 'login' ? (
                  <>
                    <span>Acceder</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                ) : (
                  <>
                    <span>Registrar Cuenta (1.000 fichas)</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
};
