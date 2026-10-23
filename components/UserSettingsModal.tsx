'use client';

import React, { useState, useEffect } from 'react';
import {
  X,
  User,
  Settings,
  Shield,
  Coins,
  Volume2,
  VolumeX,
  Flame,
  Check,
  Copy,
  LogOut,
  BarChart3,
  Palette,
} from 'lucide-react';
import { UserProfile } from '@/lib/types';
import { getUserRank } from '@/lib/economy';
import { sound } from '@/lib/audio';
import {
  updateUserProfileSession,
  updateLocalUserPassword,
  getRememberMePreference,
  COOKIE_REMEMBER,
} from '@/lib/authSession';
import { setCookie } from '@/lib/cookies';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Input } from '@/components/ui/Input';

interface UserSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: UserProfile | null;
  onUpdateUser: (updated: UserProfile) => void;
  onSignOut: () => void;
  onOpenFaucet: () => void;
  soundEnabled: boolean;
  onToggleSound: () => void;
}

const AVATAR_COLORS = [
  { id: 'emerald', bg: 'bg-emerald-600', label: 'Verde' },
  { id: 'blue', bg: 'bg-blue-600', label: 'Azul' },
  { id: 'purple', bg: 'bg-purple-600', label: 'Púrpura' },
  { id: 'amber', bg: 'bg-amber-500', label: 'Ámbar' },
  { id: 'rose', bg: 'bg-rose-600', label: 'Rosa' },
  { id: 'cyan', bg: 'bg-cyan-600', label: 'Cian' },
];

export const UserSettingsModal: React.FC<UserSettingsModalProps> = ({
  isOpen,
  onClose,
  user,
  onUpdateUser,
  onSignOut,
  onOpenFaucet,
  soundEnabled,
  onToggleSound,
}) => {
  const [activeTab, setActiveTab] = useState<'profile' | 'stats' | 'preferences' | 'security'>('profile');

  // Profile form
  const [newUsername, setNewUsername] = useState(user?.username || '');
  const [selectedColor, setSelectedColor] = useState(user?.avatar_color || 'emerald');
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileMsg, setProfileMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

  // Security form
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [savingPassword, setSavingPassword] = useState(false);
  const [passwordMsg, setPasswordMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

  // Preferences
  const [rememberMe, setRememberMe] = useState(true);
  const [copiedId, setCopiedId] = useState(false);

  useEffect(() => {
    if (user) {
      setNewUsername(user.username);
      setSelectedColor(user.avatar_color || 'emerald');
    }
    setRememberMe(getRememberMePreference());
    setProfileMsg(null);
    setPasswordMsg(null);
  }, [isOpen, user]);

  if (!isOpen || !user) return null;

  const rank = getUserRank(user.coins);
  const totalGames = (user.games_played ?? 0);
  const gamesWon = (user.games_won ?? 0);
  const winRate = totalGames > 0 ? Math.round((gamesWon / totalGames) * 100) : 0;

  const handleCopyId = () => {
    navigator.clipboard.writeText(user.id);
    setCopiedId(true);
    setTimeout(() => setCopiedId(false), 2000);
    sound.tap();
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileMsg(null);
    const clean = newUsername.trim().toLowerCase().replace(/\s+/g, '_');

    if (clean.length < 3) {
      setProfileMsg({ type: 'err', text: 'El apodo debe tener al menos 3 caracteres.' });
      return;
    }
    if (!/^[a-z0-9_]+$/.test(clean)) {
      setProfileMsg({ type: 'err', text: 'Solo letras, números y guiones bajos (_).' });
      return;
    }

    setSavingProfile(true);

    try {
      const res = await fetch('/api/user/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          newUsername: clean,
          avatarColor: selectedColor,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'No se pudo actualizar el nombre.');
      }

      const updated = updateUserProfileSession({
        username: clean,
        avatar_color: selectedColor,
      });

      if (updated) {
        onUpdateUser(updated);
      }

      sound.coinWin();
      setProfileMsg({ type: 'ok', text: 'Perfil actualizado con éxito.' });
    } catch (err: any) {
      setProfileMsg({ type: 'err', text: err?.message || 'Error al guardar.' });
    } finally {
      setSavingProfile(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordMsg(null);

    if (newPassword.length < 6) {
      setPasswordMsg({ type: 'err', text: 'La contraseña debe tener mínimo 6 caracteres.' });
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordMsg({ type: 'err', text: 'Las contraseñas no coinciden.' });
      return;
    }

    setSavingPassword(true);

    try {
      const res = await fetch('/api/user/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          newPassword,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'No se pudo cambiar la contraseña.');
      }

      if (user.auth_provider === 'local') {
        await updateLocalUserPassword(user.id, newPassword);
      }

      sound.coinWin();
      setPasswordMsg({ type: 'ok', text: 'Contraseña cambiada con éxito.' });
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      setPasswordMsg({ type: 'err', text: err?.message || 'Error al actualizar.' });
    } finally {
      setSavingPassword(false);
    }
  };

  const handleToggleRemember = (checked: boolean) => {
    setRememberMe(checked);
    setCookie(COOKIE_REMEMBER, checked ? 'true' : 'false', { days: 365 });
    sound.tap();
  };

  const activeColorObj = AVATAR_COLORS.find((c) => c.id === selectedColor) || AVATAR_COLORS[0];

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-xs pt-[env(safe-area-inset-top,0px)] pb-[env(safe-area-inset-bottom,0px)]">
      <Card className="max-w-xl w-full p-0 overflow-hidden flex flex-col max-h-[92dvh] rounded-t-[20px] sm:rounded-[var(--radius-lg)] border-border shadow-2xl">
        {/* Modal Header */}
        <div className="p-4 sm:p-5 border-b border-border flex items-center justify-between bg-surface">
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 rounded-[var(--radius-sm)] bg-surface-raised border border-border text-accent">
              <Settings className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-semibold text-sm text-foreground">Ajustes de Usuario</h3>
              <p className="text-xs text-foreground-muted font-mono">Personaliza tu perfil y preferencias</p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              onClose();
              sound.tap();
            }}
            aria-label="Cerrar modal"
            className="w-11 h-11 rounded-lg text-foreground-muted hover:text-foreground hover:bg-surface-raised flex items-center justify-center transition-all cursor-pointer active:scale-95 touch-manipulation"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* User Quick Identity Bar */}
        <div className="p-4 bg-surface-raised border-b border-border flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div
              className={`w-10 h-10 rounded-[var(--radius-sm)] ${activeColorObj.bg} text-white font-mono font-bold text-sm flex items-center justify-center uppercase select-none`}
            >
              {user.username.charAt(0)}
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-semibold text-sm text-foreground font-mono">@{user.username}</span>
                <Badge variant="accent" size="sm">
                  {rank.name}
                </Badge>
              </div>
              <div className="flex items-center gap-2 text-[11px] text-foreground-subtle font-mono mt-0.5 flex-wrap">
                {user.full_name && (
                  <>
                    <span className="text-foreground font-sans font-medium">{user.full_name}</span>
                    <span>•</span>
                  </>
                )}
                {user.student_number && (
                  <>
                    <span className="text-accent font-semibold">Nº {user.student_number}</span>
                    <span>•</span>
                  </>
                )}
                <span>{user.email || 'Cuenta SMR2'}</span>
                <span>•</span>
                <button
                  type="button"
                  onClick={handleCopyId}
                  className="hover:text-foreground flex items-center gap-1 transition-colors cursor-pointer py-1"
                  title="Copiar ID"
                >
                  <span>ID: {user.id.slice(0, 8)}...</span>
                  {copiedId ? <Check className="w-3 h-3 text-success" /> : <Copy className="w-3 h-3" />}
                </button>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1 px-3 py-1.5 rounded-[var(--radius-sm)] bg-surface border border-border text-xs font-mono font-semibold text-amber-500">
            <Coins className="w-4 h-4" />
            <span>{user.coins.toLocaleString('es-ES')}</span>
          </div>
        </div>

        {/* Tabs Bar */}
        <div className="flex items-center p-1.5 bg-surface border-b border-border gap-1 overflow-x-auto scrollbar-none">
          {[
            { id: 'profile', label: 'Perfil', icon: User },
            { id: 'stats', label: 'Estadísticas', icon: BarChart3 },
            { id: 'preferences', label: 'Preferencias', icon: Palette },
            { id: 'security', label: 'Seguridad', icon: Shield },
          ].map((t) => {
            const Icon = t.icon;
            const isActive = activeTab === t.id;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => {
                  setActiveTab(t.id as any);
                  sound.tap();
                }}
                className={`min-h-[44px] px-3.5 py-2 rounded-[var(--radius-sm)] text-xs font-medium flex items-center gap-2 transition-all cursor-pointer shrink-0 active:scale-95 touch-manipulation ${
                  isActive
                    ? 'bg-foreground text-background font-semibold shadow-xs'
                    : 'text-foreground-muted hover:text-foreground hover:bg-surface-raised'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{t.label}</span>
              </button>
            );
          })}
        </div>

        {/* Tab Body */}
        <div className="p-5 overflow-y-auto space-y-4 flex-1">
          {/* TAB 1: PROFILE */}
          {activeTab === 'profile' && (
            <form onSubmit={handleSaveProfile} className="space-y-4">
              <Input
                label="Nombre de Usuario / Apodo"
                value={newUsername}
                onChange={(e) => setNewUsername(e.target.value)}
                maxLength={20}
                required
              />

              {/* Avatar Color Picker */}
              <div className="space-y-1.5 pt-1">
                <label className="text-xs text-foreground font-medium">
                  Color del Avatar
                </label>
                <div className="grid grid-cols-6 gap-2">
                  {AVATAR_COLORS.map((c) => (
                    <button
                      type="button"
                      key={c.id}
                      onClick={() => {
                        setSelectedColor(c.id);
                        sound.tap();
                      }}
                      className={`min-h-[44px] rounded-[var(--radius-sm)] ${c.bg} flex items-center justify-center transition-all cursor-pointer border active:scale-95 touch-manipulation ${
                        selectedColor === c.id
                          ? 'ring-2 ring-foreground scale-105 border-foreground'
                          : 'border-transparent opacity-80 hover:opacity-100'
                      }`}
                      title={c.label}
                    >
                      {selectedColor === c.id && <Check className="w-5 h-5 text-white" />}
                    </button>
                  ))}
                </div>
              </div>

              {profileMsg && (
                <div
                  className={`p-3 rounded-[var(--radius)] text-xs flex items-center gap-2 border ${
                    profileMsg.type === 'ok'
                      ? 'bg-surface-raised border-border text-success'
                      : 'bg-surface-raised border-danger text-danger'
                  }`}
                >
                  {profileMsg.type === 'ok' ? <Check className="w-4 h-4" /> : <X className="w-4 h-4" />}
                  <span>{profileMsg.text}</span>
                </div>
              )}

              <div className="pt-2 flex justify-end">
                <Button
                  type="submit"
                  variant="primary"
                  size="sm"
                  isLoading={savingProfile}
                >
                  Guardar Perfil
                </Button>
              </div>
            </form>
          )}

          {/* TAB 2: STATS */}
          {activeTab === 'stats' && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                <div className="p-3.5 rounded-[var(--radius)] bg-surface-raised border border-border space-y-1">
                  <span className="text-[10px] text-foreground-subtle font-mono uppercase">Saldo actual</span>
                  <div className="text-sm font-bold text-accent font-mono">
                    {user.coins.toLocaleString('es-ES')}
                  </div>
                  <span className="text-[11px] text-foreground-subtle">Fichas</span>
                </div>

                <div className="p-3.5 rounded-[var(--radius)] bg-surface-raised border border-border space-y-1">
                  <span className="text-[10px] text-foreground-subtle font-mono uppercase">Mayor premio</span>
                  <div className="text-sm font-bold text-foreground font-mono">
                    {(user.biggest_win || 0).toLocaleString('es-ES')}
                  </div>
                  <span className="text-[11px] text-foreground-subtle">Récord</span>
                </div>

                <div className="p-3.5 rounded-[var(--radius)] bg-surface-raised border border-border space-y-1">
                  <span className="text-[10px] text-foreground-subtle font-mono uppercase">Win rate</span>
                  <div className="text-sm font-bold text-foreground font-mono">
                    {winRate}%
                  </div>
                  <span className="text-[11px] text-foreground-subtle">{gamesWon} de {totalGames} ganadas</span>
                </div>

                <div className="p-3.5 rounded-[var(--radius)] bg-surface-raised border border-border space-y-1">
                  <span className="text-[10px] text-foreground-subtle font-mono uppercase">Racha diaria</span>
                  <div className="text-sm font-bold text-accent font-mono flex items-center gap-1">
                    <Flame className="w-3.5 h-3.5" />
                    <span>{user.streak_count || 1} días</span>
                  </div>
                  <span className="text-[11px] text-foreground-subtle">Seguidos</span>
                </div>

                <div className="p-3.5 rounded-[var(--radius)] bg-surface-raised border border-border space-y-1">
                  <span className="text-[10px] text-foreground-subtle font-mono uppercase">Rol</span>
                  <div className="text-sm font-bold text-foreground font-mono uppercase">
                    {user.role === 'admin' ? 'Administrador' : user.role === 'delegado' ? 'Delegado' : 'Estudiante'}
                  </div>
                  <span className="text-[11px] text-foreground-subtle">2º SMR</span>
                </div>

                <div className="p-3.5 rounded-[var(--radius)] bg-surface-raised border border-border space-y-1">
                  <span className="text-[10px] text-foreground-subtle font-mono uppercase">Fondo rescate</span>
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onOpenFaucet();
                    }}
                    className="text-xs font-semibold text-accent underline font-mono block text-left cursor-pointer"
                  >
                    Reclamar fichas
                  </button>
                  <span className="text-[11px] text-foreground-subtle">Subsidio</span>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: PREFERENCES */}
          {activeTab === 'preferences' && (
            <div className="space-y-3">
              <div className="p-3.5 rounded-[var(--radius)] bg-surface-raised border border-border flex items-center justify-between gap-3">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    {soundEnabled ? (
                      <Volume2 className="w-4 h-4 text-accent" />
                    ) : (
                      <VolumeX className="w-4 h-4 text-foreground-subtle" />
                    )}
                    <span className="text-xs font-semibold text-foreground">Efectos de Sonido</span>
                  </div>
                  <p className="text-[11px] text-foreground-muted">
                    Sonidos de interfaz y alertas de juego.
                  </p>
                </div>

                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => {
                    onToggleSound();
                    sound.tap();
                  }}
                >
                  {soundEnabled ? 'Activado' : 'Silenciado'}
                </Button>
              </div>

              <div className="p-3.5 rounded-[var(--radius)] bg-surface-raised border border-border flex items-center justify-between gap-3">
                <div className="space-y-0.5">
                  <span className="text-xs font-semibold text-foreground">Recordar Sesión</span>
                  <p className="text-[11px] text-foreground-muted">
                    Mantener sesión iniciada en este navegador (365 días).
                  </p>
                </div>

                <Button
                  variant={rememberMe ? 'primary' : 'secondary'}
                  size="sm"
                  onClick={() => handleToggleRemember(!rememberMe)}
                >
                  {rememberMe ? 'Activado' : 'Desactivado'}
                </Button>
              </div>
            </div>
          )}

          {/* TAB 4: SECURITY */}
          {activeTab === 'security' && (
            <div className="space-y-4">
              <form onSubmit={handleChangePassword} className="space-y-3">
                <Input
                  label="Nueva Contraseña"
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Mínimo 6 caracteres"
                  required
                />

                <Input
                  label="Confirmar Contraseña"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Repite la contraseña"
                  required
                />

                {passwordMsg && (
                  <div
                    className={`p-3 rounded-[var(--radius)] text-xs flex items-center gap-2 border ${
                      passwordMsg.type === 'ok'
                        ? 'bg-surface-raised border-border text-success'
                        : 'bg-surface-raised border-danger text-danger'
                    }`}
                  >
                    {passwordMsg.type === 'ok' ? <Check className="w-4 h-4" /> : <X className="w-4 h-4" />}
                    <span>{passwordMsg.text}</span>
                  </div>
                )}

                <div className="pt-1 flex justify-end">
                  <Button
                    type="submit"
                    variant="primary"
                    size="sm"
                    isLoading={savingPassword}
                  >
                    Cambiar Contraseña
                  </Button>
                </div>
              </form>

              {/* Danger Zone: Logout */}
              <div className="pt-4 border-t border-border flex items-center justify-between">
                <div>
                  <span className="text-xs font-semibold text-danger">Cerrar Sesión</span>
                  <p className="text-[11px] text-foreground-subtle">Cierra tu cuenta activa en este dispositivo.</p>
                </div>

                <Button
                  variant="danger"
                  size="sm"
                  onClick={() => {
                    onClose();
                    onSignOut();
                  }}
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Salir</span>
                </Button>
              </div>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
};
