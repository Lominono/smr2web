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
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';

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
        const result = await registerAccount({
          username,
          email,
          password,
          confirmPassword,
          rememberMe,
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
    <div className="space-y-4">
      {/* Mode Switcher */}
      <div className="grid grid-cols-2 p-1.5 rounded-[var(--radius)] bg-surface-raised border border-border">
        <button
          type="button"
          onClick={() => {
            setMode('login');
            setError(null);
          }}
          className={`min-h-[44px] text-xs sm:text-xs font-semibold rounded-[var(--radius-sm)] transition-all cursor-pointer flex items-center justify-center active:scale-95 touch-manipulation ${
            mode === 'login'
              ? 'bg-foreground text-background shadow-xs'
              : 'text-foreground-muted hover:text-foreground'
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
          className={`min-h-[44px] text-xs sm:text-xs font-semibold rounded-[var(--radius-sm)] transition-all cursor-pointer flex items-center justify-center active:scale-95 touch-manipulation ${
            mode === 'register'
              ? 'bg-foreground text-background shadow-xs'
              : 'text-foreground-muted hover:text-foreground'
          }`}
        >
          Registrarse
        </button>
      </div>

      {error && (
        <div className="p-3.5 rounded-[var(--radius)] bg-danger-subtle border border-danger/25 text-xs text-danger flex items-start gap-2.5">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {mode === 'register' && !error && (
        <div className="p-3 rounded-[var(--radius)] bg-surface-raised border border-border/80 flex items-center gap-2.5 text-xs text-foreground-muted">
          <span className="text-base shrink-0">🪙</span>
          <p className="leading-snug">
            Bono de bienvenida: <strong className="text-foreground font-semibold">1.000 monedas</strong> añadidas a tu cuenta al registrarte.
          </p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-3.5">
        {mode === 'register' ? (
          <>
            <div>
              <Input
                label="Usuario"
                required
                autoComplete="username"
                autoCapitalize="none"
                spellCheck={false}
                placeholder="ej: usuario_smr"
                value={username}
                onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/\s+/g, '_'))}
                leftIcon={<User className="w-4 h-4" />}
                rightElement={
                  usernameStatus.available === true ? (
                    <span className="text-[10px] text-success font-mono flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Disponible
                    </span>
                  ) : undefined
                }
              />
              {usernameStatus.message && usernameStatus.available === false && (
                <p className="text-[11px] text-danger font-mono mt-1">
                  {usernameStatus.message}
                </p>
              )}
            </div>

            <Input
              label="Correo electrónico"
              type="email"
              required
              autoComplete="email"
              inputMode="email"
              autoCapitalize="none"
              spellCheck={false}
              placeholder="alumno@ejemplo.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              leftIcon={<Mail className="w-4 h-4" />}
            />

            <div className="space-y-1.5">
              <Input
                label="Contraseña"
                type={showPassword ? 'text' : 'password'}
                required
                minLength={8}
                autoComplete="new-password"
                placeholder="Mínimo 8 caracteres"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                leftIcon={<Lock className="w-4 h-4" />}
                rightElement={
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="w-10 h-10 flex items-center justify-center text-foreground-subtle hover:text-foreground active:scale-90 touch-manipulation cursor-pointer"
                    title={showPassword ? 'Ocultar' : 'Mostrar'}
                    aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                }
              />

              {/* Indicador de seguridad de contraseña */}
              {passReport && (
                <div className="p-2.5 rounded-lg bg-surface-raised border border-border/70 space-y-2 animate-in fade-in duration-150">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-foreground-muted">Nivel de seguridad:</span>
                    <span className={`font-semibold ${
                      passReport.score <= 1 ? 'text-red-500' :
                      passReport.score === 2 ? 'text-amber-500' :
                      passReport.score === 3 ? 'text-emerald-500' : 'text-green-500'
                    }`}>
                      {passReport.strengthLabel}
                    </span>
                  </div>

                  {/* 4 Barras de seguridad */}
                  <div className="grid grid-cols-4 gap-1 h-1.5 w-full">
                    {[1, 2, 3, 4].map((seg) => (
                      <div
                        key={seg}
                        className={`h-full rounded-full transition-all duration-300 ${
                          passReport.score >= seg
                            ? passReport.score <= 1
                              ? 'bg-red-500'
                              : passReport.score === 2
                              ? 'bg-amber-500'
                              : 'bg-emerald-500'
                            : 'bg-border'
                        }`}
                      />
                    ))}
                  </div>

                  {/* Requisitos de seguridad */}
                  <div className="grid grid-cols-2 gap-x-2 gap-y-1 text-[10px] text-foreground-subtle">
                    <div className={`flex items-center gap-1 ${passReport.criteria.minLength ? 'text-emerald-500 font-medium' : ''}`}>
                      <span>{passReport.criteria.minLength ? '✓' : '•'}</span>
                      <span>Mín. 8 caracteres</span>
                    </div>
                    <div className={`flex items-center gap-1 ${passReport.criteria.hasUppercase && passReport.criteria.hasLowercase ? 'text-emerald-500 font-medium' : ''}`}>
                      <span>{passReport.criteria.hasUppercase && passReport.criteria.hasLowercase ? '✓' : '•'}</span>
                      <span>Mayús. y minús.</span>
                    </div>
                    <div className={`flex items-center gap-1 ${passReport.criteria.hasNumber ? 'text-emerald-500 font-medium' : ''}`}>
                      <span>{passReport.criteria.hasNumber ? '✓' : '•'}</span>
                      <span>Al menos 1 número</span>
                    </div>
                    <div className={`flex items-center gap-1 ${passReport.criteria.hasSpecial ? 'text-emerald-500 font-medium' : ''}`}>
                      <span>{passReport.criteria.hasSpecial ? '✓' : '•'}</span>
                      <span>Al menos 1 símbolo</span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <Input
              label="Confirmar contraseña"
              type={showPassword ? 'text' : 'password'}
              required
              minLength={8}
              autoComplete="new-password"
              placeholder="Repite la contraseña"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              error={passwordsMismatch ? 'Las contraseñas no coinciden' : undefined}
              leftIcon={<Lock className="w-4 h-4" />}
            />
          </>
        ) : (
          <>
            <Input
              label="Correo o usuario"
              required
              autoComplete="username"
              autoCapitalize="none"
              spellCheck={false}
              placeholder="alumno@ejemplo.com o tu usuario"
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              leftIcon={<Mail className="w-4 h-4" />}
            />

            <Input
              label="Contraseña"
              type={showPassword ? 'text' : 'password'}
              required
              minLength={6}
              autoComplete="current-password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              leftIcon={<Lock className="w-4 h-4" />}
              rightElement={
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="w-10 h-10 flex items-center justify-center text-foreground-subtle hover:text-foreground active:scale-90 touch-manipulation cursor-pointer"
                  title={showPassword ? 'Ocultar' : 'Mostrar'}
                  aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              }
            />
          </>
        )}

        <div className="pt-1">
          <label
            htmlFor={rememberCheckboxId}
            className="min-h-[44px] flex items-center gap-2.5 text-xs text-foreground-muted hover:text-foreground cursor-pointer select-none touch-manipulation py-1"
          >
            <input
              id={rememberCheckboxId}
              type="checkbox"
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
              className="w-4 h-4 rounded-[var(--radius-sm)] border-border bg-surface text-foreground accent-accent cursor-pointer"
            />
            <span>Recordar sesión en este equipo</span>
          </label>
        </div>

        <div className="pt-2 flex items-center gap-2">
          {onCancel && (
            <Button
              type="button"
              variant="secondary"
              size="lg"
              className="flex-1"
              onClick={onCancel}
            >
              Cancelar
            </Button>
          )}

          <Button
            type="submit"
            variant="primary"
            size="lg"
            className={onCancel ? 'flex-1' : 'w-full'}
            isLoading={loading}
            disabled={mode === 'register' && (passwordsMismatch || (passReport !== null && !passReport.valid))}
          >
            {mode === 'login' ? 'Acceder' : 'Crear cuenta'}
          </Button>
        </div>
      </form>
    </div>
  );
};
