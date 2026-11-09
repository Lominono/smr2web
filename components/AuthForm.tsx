'use client';

import React, { useState, useEffect, useId } from 'react';
import { Mail, Lock, User, AlertCircle, Eye, EyeOff, CheckCircle2 } from 'lucide-react';
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
import { validatePasswordSecurity } from '@/lib/passwordSecurity';
import { TermsModal } from '@/components/TermsModal';

interface AuthFormProps {
  onSuccess: (user: UserProfile) => void;
  onCancel?: () => void;
  isModal?: boolean;
}

export const AuthForm: React.FC<AuthFormProps> = ({
  onSuccess,
  onCancel,
  isModal = false,
}) => {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [identifier, setIdentifier] = useState('');
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [showTermsModal, setShowTermsModal] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Debounced username availability
  const [usernameStatus, setUsernameStatus] = useState<{
    checking: boolean;
    available?: boolean;
    message?: string;
  }>({ checking: false });

  const rememberCheckboxId = useId();

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
    }, 350);

    return () => clearTimeout(timer);
  }, [username, mode]);

  const passwordsMatch = confirmPassword.length > 0 && password === confirmPassword;
  const passwordsMismatch = confirmPassword.length > 0 && password !== confirmPassword;
  const passReport = mode === 'register' && password.length > 0
    ? validatePasswordSecurity(password, username, email)
    : null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (mode === 'register') {
        if (!acceptedTerms) {
          setError('Debes leer y aceptar el Aviso Legal, Condiciones y Política de Privacidad para poder registrarte.');
          setLoading(false);
          return;
        }

        const result = await registerAccount({
          username,
          email,
          password,
          confirmPassword,
          rememberMe,
          acceptedTerms: true,
        });

        if (result.user) {
          onSuccess(result.user);
        }
      } else {
        const result = await loginAccount({
          identifier,
          password,
          rememberMe,
        });

        if (result.user) {
          onSuccess(result.user);
        }
      }
    } catch (err: any) {
      setError(translateAuthError(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-5 select-none font-sans">
      {/* Selector de modo estilo iOS Segmented Control de alto contraste */}
      <div className="grid grid-cols-2 p-1 rounded-2xl bg-neutral-200/80 dark:bg-neutral-900/90 border border-neutral-300/80 dark:border-neutral-800/80 text-xs font-medium">
        <button
          type="button"
          onClick={() => {
            setMode('login');
            setError(null);
          }}
          className={`min-h-[38px] py-2 px-3 rounded-xl text-xs transition-all cursor-pointer flex items-center justify-center touch-manipulation ${
            mode === 'login'
              ? 'bg-white dark:bg-neutral-800 text-neutral-950 dark:text-white shadow-sm border border-neutral-300/70 dark:border-neutral-700/50 font-semibold'
              : 'text-neutral-600 hover:text-neutral-950 dark:text-neutral-400 dark:hover:text-white font-medium'
          }`}
        >
          Iniciar sesión
        </button>
        <button
          type="button"
          onClick={() => {
            setMode('register');
            setError(null);
          }}
          className={`min-h-[38px] py-2 px-3 rounded-xl text-xs transition-all cursor-pointer flex items-center justify-center touch-manipulation ${
            mode === 'register'
              ? 'bg-white dark:bg-neutral-800 text-neutral-950 dark:text-white shadow-sm border border-neutral-300/70 dark:border-neutral-700/50 font-semibold'
              : 'text-neutral-600 hover:text-neutral-950 dark:text-neutral-400 dark:hover:text-white font-medium'
          }`}
        >
          Registrarse
        </button>
      </div>

      {error && (
        <div className="p-3 rounded-2xl bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/40 text-xs text-red-800 dark:text-red-300 flex items-start gap-2.5 animate-in fade-in duration-200">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-600 dark:text-red-400" />
          <span className="leading-relaxed">{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        {mode === 'register' ? (
          <>
            {/* Campo Usuario */}
            <div className="space-y-1.5">
              <label className="block text-xs font-medium text-neutral-700 dark:text-neutral-300">
                Nombre de usuario
              </label>
              <div className="relative flex items-center">
                <span className="absolute left-3.5 text-neutral-400 dark:text-neutral-500 pointer-events-none flex items-center justify-center">
                  <User className="w-4 h-4" />
                </span>
                <input
                  type="text"
                  required
                  autoComplete="username"
                  autoCapitalize="none"
                  spellCheck={false}
                  placeholder="ej: usuario_smr"
                  value={username}
                  onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/\s+/g, '_'))}
                  className="w-full min-h-[44px] pl-10 pr-24 py-2.5 rounded-xl bg-white dark:bg-neutral-900/70 border border-neutral-300 dark:border-neutral-800 text-sm text-neutral-900 dark:text-neutral-100 placeholder:text-neutral-400 dark:placeholder:text-neutral-500 transition-colors focus:outline-none focus:border-neutral-900 dark:focus:border-neutral-400 focus:bg-white dark:focus:bg-neutral-900 touch-manipulation"
                />
                {usernameStatus.available === true && (
                  <div className="absolute right-3 flex items-center gap-1 text-[11px] font-mono text-emerald-600 dark:text-emerald-400">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Disponible</span>
                  </div>
                )}
              </div>
              {usernameStatus.message && usernameStatus.available === false && (
                <p className="text-[11px] text-red-600 dark:text-red-400 font-mono mt-1">
                  {usernameStatus.message}
                </p>
              )}
            </div>

            {/* Campo Email */}
            <div className="space-y-1.5">
              <label className="block text-xs font-medium text-neutral-700 dark:text-neutral-300">
                Correo electrónico
              </label>
              <div className="relative flex items-center">
                <span className="absolute left-3.5 text-neutral-400 dark:text-neutral-500 pointer-events-none flex items-center justify-center">
                  <Mail className="w-4 h-4" />
                </span>
                <input
                  type="email"
                  required
                  autoComplete="email"
                  inputMode="email"
                  autoCapitalize="none"
                  spellCheck={false}
                  placeholder="alumno@ejemplo.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full min-h-[44px] pl-10 pr-3.5 py-2.5 rounded-xl bg-white dark:bg-neutral-900/70 border border-neutral-300 dark:border-neutral-800 text-sm text-neutral-900 dark:text-neutral-100 placeholder:text-neutral-400 dark:placeholder:text-neutral-500 transition-colors focus:outline-none focus:border-neutral-900 dark:focus:border-neutral-400 focus:bg-white dark:focus:bg-neutral-900 touch-manipulation"
                />
              </div>
            </div>

            {/* Campo Contraseña */}
            <div className="space-y-1.5">
              <label className="block text-xs font-medium text-neutral-700 dark:text-neutral-300">
                Contraseña
              </label>
              <div className="relative flex items-center">
                <span className="absolute left-3.5 text-neutral-400 dark:text-neutral-500 pointer-events-none flex items-center justify-center">
                  <Lock className="w-4 h-4" />
                </span>
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  minLength={8}
                  autoComplete="new-password"
                  placeholder="Mínimo 8 caracteres"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full min-h-[44px] pl-10 pr-11 py-2.5 rounded-xl bg-white dark:bg-neutral-900/70 border border-neutral-300 dark:border-neutral-800 text-sm text-neutral-900 dark:text-neutral-100 placeholder:text-neutral-400 dark:placeholder:text-neutral-500 transition-colors focus:outline-none focus:border-neutral-900 dark:focus:border-neutral-400 focus:bg-white dark:focus:bg-neutral-900 touch-manipulation"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-1 w-10 h-10 flex items-center justify-center text-neutral-400 hover:text-neutral-700 dark:text-neutral-500 dark:hover:text-neutral-200 active:scale-95 touch-manipulation cursor-pointer"
                  title={showPassword ? 'Ocultar' : 'Mostrar'}
                  aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>

              {/* Indicador de seguridad sobrio estilo Apple */}
              {passReport && (
                <div className="p-3 rounded-xl bg-neutral-100 dark:bg-neutral-900/90 border border-neutral-200 dark:border-neutral-800/80 space-y-2 animate-in fade-in duration-150">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-neutral-500 dark:text-neutral-400">Seguridad:</span>
                    <span className={`font-medium ${
                      passReport.score <= 1 ? 'text-red-600 dark:text-red-400' :
                      passReport.score === 2 ? 'text-amber-600 dark:text-amber-400' :
                      passReport.score === 3 ? 'text-emerald-600 dark:text-emerald-400' : 'text-emerald-600 dark:text-emerald-300 font-semibold'
                    }`}>
                      {passReport.strengthLabel}
                    </span>
                  </div>

                  {/* 4 Barras horizontales limpias */}
                  <div className="grid grid-cols-4 gap-1.5 h-1 w-full">
                    {[1, 2, 3, 4].map((seg) => (
                      <div
                        key={seg}
                        className={`h-full rounded-full transition-all duration-300 ${
                          passReport.score >= seg
                            ? passReport.score <= 1
                              ? 'bg-red-500 dark:bg-red-400'
                              : passReport.score === 2
                              ? 'bg-amber-500 dark:bg-amber-400'
                              : 'bg-emerald-500 dark:bg-emerald-400'
                            : 'bg-neutral-300 dark:bg-neutral-800'
                        }`}
                      />
                    ))}
                  </div>

                  <div className="grid grid-cols-2 gap-x-2 gap-y-1 text-[10px] text-neutral-500 dark:text-neutral-400 pt-0.5">
                    <div className={`flex items-center gap-1 ${passReport.criteria.minLength ? 'text-emerald-600 dark:text-emerald-400 font-medium' : ''}`}>
                      <span>{passReport.criteria.minLength ? '✓' : '•'}</span>
                      <span>Mín. 8 caracteres</span>
                    </div>
                    <div className={`flex items-center gap-1 ${passReport.criteria.hasUppercase && passReport.criteria.hasLowercase ? 'text-emerald-600 dark:text-emerald-400 font-medium' : ''}`}>
                      <span>{passReport.criteria.hasUppercase && passReport.criteria.hasLowercase ? '✓' : '•'}</span>
                      <span>Mayús. y minús.</span>
                    </div>
                    <div className={`flex items-center gap-1 ${passReport.criteria.hasNumber ? 'text-emerald-600 dark:text-emerald-400 font-medium' : ''}`}>
                      <span>{passReport.criteria.hasNumber ? '✓' : '•'}</span>
                      <span>Al menos 1 número</span>
                    </div>
                    <div className={`flex items-center gap-1 ${passReport.criteria.hasSpecial ? 'text-emerald-600 dark:text-emerald-400 font-medium' : ''}`}>
                      <span>{passReport.criteria.hasSpecial ? '✓' : '•'}</span>
                      <span>Al menos 1 símbolo</span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Campo Confirmar Contraseña */}
            <div className="space-y-1.5">
              <label className="block text-xs font-medium text-neutral-700 dark:text-neutral-300">
                Confirmar contraseña
              </label>
              <div className="relative flex items-center">
                <span className="absolute left-3.5 text-neutral-400 dark:text-neutral-500 pointer-events-none flex items-center justify-center">
                  <Lock className="w-4 h-4" />
                </span>
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  minLength={8}
                  autoComplete="new-password"
                  placeholder="Repite la contraseña"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className={`w-full min-h-[44px] pl-10 pr-3.5 py-2.5 rounded-xl bg-white dark:bg-neutral-900/70 border text-sm text-neutral-900 dark:text-neutral-100 placeholder:text-neutral-400 dark:placeholder:text-neutral-500 transition-colors focus:outline-none focus:bg-white dark:focus:bg-neutral-900 touch-manipulation ${
                    passwordsMismatch
                      ? 'border-red-500 focus:border-red-500'
                      : 'border-neutral-300 dark:border-neutral-800 focus:border-neutral-900 dark:focus:border-neutral-400'
                  }`}
                />
              </div>
              {passwordsMismatch && (
                <p className="text-[11px] text-red-600 dark:text-red-400 font-medium">
                  Las contraseñas no coinciden
                </p>
              )}
            </div>
          </>
        ) : (
          <>
            {/* Campo Correo o Usuario */}
            <div className="space-y-1.5">
              <label className="block text-xs font-medium text-neutral-700 dark:text-neutral-300">
                Correo electrónico o usuario
              </label>
              <div className="relative flex items-center">
                <span className="absolute left-3.5 text-neutral-400 dark:text-neutral-500 pointer-events-none flex items-center justify-center">
                  <Mail className="w-4 h-4" />
                </span>
                <input
                  type="text"
                  required
                  autoComplete="username"
                  autoCapitalize="none"
                  spellCheck={false}
                  placeholder="alumno@ejemplo.com o tu usuario"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  className="w-full min-h-[44px] pl-10 pr-3.5 py-2.5 rounded-xl bg-white dark:bg-neutral-900/70 border border-neutral-300 dark:border-neutral-800 text-sm text-neutral-900 dark:text-neutral-100 placeholder:text-neutral-400 dark:placeholder:text-neutral-500 transition-colors focus:outline-none focus:border-neutral-900 dark:focus:border-neutral-400 focus:bg-white dark:focus:bg-neutral-900 touch-manipulation"
                />
              </div>
            </div>

            {/* Campo Contraseña */}
            <div className="space-y-1.5">
              <label className="block text-xs font-medium text-neutral-700 dark:text-neutral-300">
                Contraseña
              </label>
              <div className="relative flex items-center">
                <span className="absolute left-3.5 text-neutral-400 dark:text-neutral-500 pointer-events-none flex items-center justify-center">
                  <Lock className="w-4 h-4" />
                </span>
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  minLength={6}
                  autoComplete="current-password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full min-h-[44px] pl-10 pr-11 py-2.5 rounded-xl bg-white dark:bg-neutral-900/70 border border-neutral-300 dark:border-neutral-800 text-sm text-neutral-900 dark:text-neutral-100 placeholder:text-neutral-400 dark:placeholder:text-neutral-500 transition-colors focus:outline-none focus:border-neutral-900 dark:focus:border-neutral-400 focus:bg-white dark:focus:bg-neutral-900 touch-manipulation"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-1 w-10 h-10 flex items-center justify-center text-neutral-400 hover:text-neutral-700 dark:text-neutral-500 dark:hover:text-neutral-200 active:scale-95 touch-manipulation cursor-pointer"
                  title={showPassword ? 'Ocultar' : 'Mostrar'}
                  aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
          </>
        )}

        {/* Checkbox Recordar Sesión */}
        <div className="pt-1">
          <label
            htmlFor={rememberCheckboxId}
            className="min-h-[44px] flex items-center gap-2.5 text-xs text-neutral-600 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-200 cursor-pointer select-none touch-manipulation py-1"
          >
            <input
              id={rememberCheckboxId}
              type="checkbox"
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
              className="w-4 h-4 rounded-md border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white accent-neutral-900 dark:accent-white cursor-pointer"
            />
            <span>Recordar sesión para siempre en este equipo</span>
          </label>
        </div>

        {/* Aceptación Legal para Registro */}
        {mode === 'register' && (
          <div className="pt-1">
            <div className="p-3.5 rounded-2xl bg-neutral-100 dark:bg-neutral-900/60 border border-neutral-200 dark:border-neutral-800/80">
              <label className="flex items-start gap-3 text-xs text-neutral-600 dark:text-neutral-400 cursor-pointer select-none">
                <input
                  type="checkbox"
                  required
                  checked={acceptedTerms}
                  onChange={(e) => setAcceptedTerms(e.target.checked)}
                  className="mt-0.5 w-4 h-4 rounded-md border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white accent-neutral-900 dark:accent-white cursor-pointer shrink-0"
                />
                <span className="leading-relaxed">
                  He leído y acepto el{' '}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowTermsModal(true);
                    }}
                    className="text-neutral-900 dark:text-white font-medium underline underline-offset-2 hover:text-neutral-700 dark:hover:text-neutral-300 cursor-pointer inline transition-colors"
                  >
                    Aviso Legal, Condiciones y Privacidad
                  </button>
                  . Declaro expresamente ser mayor de 14 años.
                </span>
              </label>
            </div>
          </div>
        )}

        {/* Botones de Acción estilo Apple con alto contraste */}
        <div className="pt-2 flex items-center gap-2.5">
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="flex-1 min-h-[44px] py-2.5 px-4 rounded-xl border border-neutral-300 dark:border-neutral-800 bg-white dark:bg-neutral-900/80 hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-700 dark:text-neutral-300 hover:text-neutral-950 dark:hover:text-white text-xs font-medium transition-all active:scale-[0.98] cursor-pointer touch-manipulation"
            >
              Cancelar
            </button>
          )}

          <button
            type="submit"
            disabled={
              loading ||
              (mode === 'register' &&
                (!acceptedTerms || passwordsMismatch || (passReport !== null && !passReport.valid)))
            }
            className="flex-1 min-h-[44px] py-2.5 px-4 rounded-xl bg-neutral-900 hover:bg-black text-white dark:bg-white dark:hover:bg-neutral-200 dark:text-neutral-950 font-semibold text-xs transition-all active:scale-[0.98] cursor-pointer shadow-md disabled:opacity-40 disabled:cursor-not-allowed touch-manipulation flex items-center justify-center gap-2"
          >
            {loading && (
              <span className="w-3.5 h-3.5 border-2 border-white dark:border-neutral-950 border-t-transparent rounded-full animate-spin" />
            )}
            <span>{mode === 'login' ? 'Acceder al portal' : 'Crear cuenta'}</span>
          </button>
        </div>
      </form>

      {/* Modal de Términos y Condiciones Legales con Portal global */}
      <TermsModal
        isOpen={showTermsModal}
        onClose={() => setShowTermsModal(false)}
        onAccept={() => setAcceptedTerms(true)}
        showAcceptButton={true}
      />
    </div>
  );
};
