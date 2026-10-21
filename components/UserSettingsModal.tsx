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
  Trophy,
  Flame,
  Check,
  Copy,
  Lock,
  LogOut,
  RefreshCw,
  Sparkles,
  HelpCircle,
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
  { id: 'emerald', bg: 'bg-emerald-500', border: 'border-emerald-400', label: 'Verde Terminal' },
  { id: 'blue', bg: 'bg-blue-600', border: 'border-blue-400', label: 'Azul Redes' },
  { id: 'purple', bg: 'bg-purple-600', border: 'border-purple-400', label: 'Púrpura Ciber' },
  { id: 'amber', bg: 'bg-amber-500', border: 'border-amber-400', label: 'Ámbar Root' },
  { id: 'rose', bg: 'bg-rose-600', border: 'border-rose-400', label: 'Rosa Bug' },
  { id: 'cyan', bg: 'bg-cyan-500', border: 'border-cyan-400', label: 'Cian Servidor' },
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
      // Call server API
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

      // Update client session
      const updated = updateUserProfileSession({
        username: clean,
        avatar_color: selectedColor,
      });

      if (updated) {
        onUpdateUser(updated);
      }

      sound.coinWin();
      setProfileMsg({ type: 'ok', text: '¡Perfil actualizado con éxito!' });
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

      // Also update local storage if it's a local account
      if (user.auth_provider === 'local') {
        await updateLocalUserPassword(user.id, newPassword);
      }

      sound.coinWin();
      setPasswordMsg({ type: 'ok', text: '¡Contraseña cambiada con éxito!' });
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-150">
      <div className="max-w-xl w-full rounded-3xl bg-[#0c0d12] border border-white/[0.12] shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Modal Header */}
        <div className="p-4 sm:p-5 border-b border-white/[0.08] flex items-center justify-between bg-black/40">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-white/[0.06] border border-white/10 text-white">
              <Settings className="w-4 h-4 text-amber-400" />
            </div>
            <div>
              <h3 className="font-semibold text-sm text-white font-sans">Ajustes de Usuario</h3>
              <p className="text-[11px] text-zinc-400 font-mono">Personaliza tu cuenta y revisa tus estadísticas</p>
            </div>
          </div>

          <button
            onClick={() => {
              onClose();
              sound.tap();
            }}
            className="p-1.5 rounded-xl text-zinc-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* User Quick Identity Bar */}
        <div className="p-4 bg-white/[0.02] border-b border-white/[0.06] flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div
              className={`w-11 h-11 rounded-2xl ${activeColorObj.bg} text-white font-mono font-bold text-base flex items-center justify-center shadow-md uppercase select-none`}
            >
              {user.username.charAt(0)}
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-sm text-white">@{user.username}</span>
                <span className={`text-[9px] font-mono px-1.5 py-0.2 rounded font-semibold ${rank.bg} ${rank.color} ${rank.border}`}>
                  {rank.name}
                </span>
              </div>
              <div className="flex items-center gap-2 text-[10px] text-zinc-500 font-mono mt-0.5">
                <span>{user.email || 'Cuenta Local SMR2'}</span>
                <span>•</span>
                <button
                  type="button"
                  onClick={handleCopyId}
                  className="hover:text-zinc-300 flex items-center gap-1 transition-colors cursor-pointer"
                  title="Copiar ID de usuario"
                >
                  <span>ID: {user.id.slice(0, 8)}...</span>
                  {copiedId ? <Check className="w-2.5 h-2.5 text-emerald-400" /> : <Copy className="w-2.5 h-2.5" />}
                </button>
              </div>
            </div>
          </div>

          <div className="flex flex-col items-end">
            <div className="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-amber-400/10 border border-amber-400/20 text-xs font-mono font-bold text-amber-300">
              <Coins className="w-3.5 h-3.5 text-amber-400" />
              <span>{user.coins.toLocaleString('es-ES')}</span>
            </div>
          </div>
        </div>

        {/* Tabs Bar */}
        <div className="flex items-center p-1.5 bg-black/50 border-b border-white/[0.06] gap-1 overflow-x-auto scrollbar-none">
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
                onClick={() => {
                  setActiveTab(t.id as any);
                  sound.tap();
                }}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-mono font-medium transition-all shrink-0 cursor-pointer ${
                  isActive
                    ? 'bg-white text-black font-semibold shadow-sm'
                    : 'text-zinc-400 hover:text-white hover:bg-white/[0.04]'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
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
              <div className="space-y-1">
                <label className="text-xs text-zinc-300 font-semibold font-sans">
                  Nombre de Usuario / Apodo en SMR2
                </label>
                <p className="text-[11px] text-zinc-500 font-sans">
                  Es el identificador público con el que tus compañeros te verán en el chat, horario y partidas de Ruleta Rusa.
                </p>
                <div className="relative mt-1">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 font-mono text-xs">@</span>
                  <input
                    type="text"
                    value={newUsername}
                    onChange={(e) => setNewUsername(e.target.value)}
                    maxLength={20}
                    className="w-full pl-7 pr-3 py-2 rounded-xl bg-black border border-white/10 text-xs text-white font-mono focus:outline-none focus:border-amber-400"
                  />
                </div>
              </div>

              {/* Avatar Color Picker */}
              <div className="space-y-1.5 pt-2">
                <label className="text-xs text-zinc-300 font-semibold font-sans">
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
                      className={`h-9 rounded-xl ${c.bg} flex items-center justify-center transition-all cursor-pointer border ${
                        selectedColor === c.id
                          ? 'ring-2 ring-white scale-105 border-white'
                          : 'border-transparent opacity-70 hover:opacity-100'
                      }`}
                      title={c.label}
                    >
                      {selectedColor === c.id && <Check className="w-4 h-4 text-white" />}
                    </button>
                  ))}
                </div>
              </div>

              {profileMsg && (
                <div
                  className={`p-3 rounded-xl text-xs flex items-center gap-2 ${
                    profileMsg.type === 'ok'
                      ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-300'
                      : 'bg-rose-500/10 border border-rose-500/30 text-rose-300'
                  }`}
                >
                  {profileMsg.type === 'ok' ? <Check className="w-4 h-4" /> : <X className="w-4 h-4" />}
                  <span>{profileMsg.text}</span>
                </div>
              )}

              <div className="pt-2 flex justify-end">
                <button
                  type="submit"
                  disabled={savingProfile}
                  className="px-4 py-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-black font-bold text-xs transition-all cursor-pointer active:scale-95 disabled:opacity-50"
                >
                  {savingProfile ? 'Guardando...' : 'Guardar Cambios de Perfil'}
                </button>
              </div>
            </form>
          )}

          {/* TAB 2: STATS */}
          {activeTab === 'stats' && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                <div className="p-3.5 rounded-2xl bg-black/40 border border-white/[0.07] space-y-1">
                  <span className="text-[10px] text-zinc-500 font-mono">SALDO ACTUAL</span>
                  <div className="text-sm font-bold text-amber-300 font-mono">
                    {user.coins.toLocaleString('es-ES')}
                  </div>
                  <span className="text-[10px] text-zinc-500">Fichas virtuales</span>
                </div>

                <div className="p-3.5 rounded-2xl bg-black/40 border border-white/[0.07] space-y-1">
                  <span className="text-[10px] text-zinc-500 font-mono">MAYOR PREMIO</span>
                  <div className="text-sm font-bold text-emerald-400 font-mono">
                    {(user.biggest_win || 0).toLocaleString('es-ES')}
                  </div>
                  <span className="text-[10px] text-zinc-500">Récord de ganancia</span>
                </div>

                <div className="p-3.5 rounded-2xl bg-black/40 border border-white/[0.07] space-y-1">
                  <span className="text-[10px] text-zinc-500 font-mono">WIN RATE</span>
                  <div className="text-sm font-bold text-white font-mono">
                    {winRate}%
                  </div>
                  <span className="text-[10px] text-zinc-500">{gamesWon} de {totalGames} ganadas</span>
                </div>

                <div className="p-3.5 rounded-2xl bg-black/40 border border-white/[0.07] space-y-1">
                  <span className="text-[10px] text-zinc-500 font-mono">RACHA DIARIA</span>
                  <div className="text-sm font-bold text-amber-400 font-mono flex items-center gap-1">
                    <Flame className="w-3.5 h-3.5 fill-amber-400" />
                    <span>{user.streak_count || 1} días</span>
                  </div>
                  <span className="text-[10px] text-zinc-500">Conexiones seguidas</span>
                </div>

                <div className="p-3.5 rounded-2xl bg-black/40 border border-white/[0.07] space-y-1">
                  <span className="text-[10px] text-zinc-500 font-mono">ROL EN CLASE</span>
                  <div className="text-sm font-bold text-white font-mono uppercase">
                    {user.role === 'admin' ? 'Administrador' : user.role === 'delegado' ? 'Delegado' : 'Estudiante'}
                  </div>
                  <span className="text-[10px] text-zinc-500">2º SMR</span>
                </div>

                <div className="p-3.5 rounded-2xl bg-black/40 border border-white/[0.07] space-y-1">
                  <span className="text-[10px] text-zinc-500 font-mono">FONDO DE RESCATE</span>
                  <button
                    onClick={() => {
                      onClose();
                      onOpenFaucet();
                    }}
                    className="text-xs font-bold text-amber-300 underline font-mono block text-left"
                  >
                    Reclamar fichas
                  </button>
                  <span className="text-[10px] text-zinc-500">Subsidio diario</span>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: PREFERENCES */}
          {activeTab === 'preferences' && (
            <div className="space-y-4">
              {/* Sound Toggle */}
              <div className="p-3.5 rounded-2xl bg-black/40 border border-white/[0.07] flex items-center justify-between gap-3">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    {soundEnabled ? (
                      <Volume2 className="w-4 h-4 text-emerald-400" />
                    ) : (
                      <VolumeX className="w-4 h-4 text-zinc-500" />
                    )}
                    <span className="text-xs font-semibold text-white">Efectos de Sonido</span>
                  </div>
                  <p className="text-[11px] text-zinc-500 font-sans">
                    Sonidos de botones, premios en ruleta, gatillo en ruleta rusa y mensajes.
                  </p>
                </div>

                <button
                  onClick={() => {
                    onToggleSound();
                    sound.tap();
                  }}
                  className={`px-3 py-1.5 rounded-xl text-xs font-mono font-bold transition-all cursor-pointer ${
                    soundEnabled
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                      : 'bg-zinc-800 text-zinc-400 border border-white/5'
                  }`}
                >
                  {soundEnabled ? 'Activado' : 'Silenciado'}
                </button>
              </div>

              {/* Remember Me Toggle */}
              <div className="p-3.5 rounded-2xl bg-black/40 border border-white/[0.07] flex items-center justify-between gap-3">
                <div className="space-y-0.5">
                  <span className="text-xs font-semibold text-white">Recordar Sesión Permanente</span>
                  <p className="text-[11px] text-zinc-500 font-sans">
                    Mantener tu cuenta iniciada hasta 365 días en este navegador sin volver a pedir contraseña.
                  </p>
                </div>

                <button
                  onClick={() => handleToggleRemember(!rememberMe)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-mono font-bold transition-all cursor-pointer ${
                    rememberMe
                      ? 'bg-amber-400 text-black shadow-sm'
                      : 'bg-zinc-800 text-zinc-400 border border-white/5'
                  }`}
                >
                  {rememberMe ? 'Sí (365 días)' : 'No (30 días)'}
                </button>
              </div>
            </div>
          )}

          {/* TAB 4: SECURITY */}
          {activeTab === 'security' && (
            <div className="space-y-4">
              <form onSubmit={handleChangePassword} className="space-y-3">
                <div className="space-y-1">
                  <label className="text-xs text-zinc-300 font-semibold font-sans">
                    Nueva Contraseña
                  </label>
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Mínimo 6 caracteres"
                    className="w-full px-3 py-2 rounded-xl bg-black border border-white/10 text-xs text-white font-mono focus:outline-none focus:border-amber-400"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs text-zinc-300 font-semibold font-sans">
                    Confirmar Nueva Contraseña
                  </label>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Repite la contraseña"
                    className="w-full px-3 py-2 rounded-xl bg-black border border-white/10 text-xs text-white font-mono focus:outline-none focus:border-amber-400"
                  />
                </div>

                {passwordMsg && (
                  <div
                    className={`p-3 rounded-xl text-xs flex items-center gap-2 ${
                      passwordMsg.type === 'ok'
                        ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-300'
                        : 'bg-rose-500/10 border border-rose-500/30 text-rose-300'
                    }`}
                  >
                    {passwordMsg.type === 'ok' ? <Check className="w-4 h-4" /> : <X className="w-4 h-4" />}
                    <span>{passwordMsg.text}</span>
                  </div>
                )}

                <div className="pt-1 flex justify-end">
                  <button
                    type="submit"
                    disabled={savingPassword}
                    className="px-4 py-2 rounded-xl bg-white text-black font-semibold text-xs hover:bg-zinc-200 transition-all cursor-pointer active:scale-95 disabled:opacity-50"
                  >
                    {savingPassword ? 'Actualizando...' : 'Cambiar Contraseña'}
                  </button>
                </div>
              </form>

              {/* Danger Zone: Logout */}
              <div className="pt-4 border-t border-white/[0.08] flex items-center justify-between">
                <div>
                  <span className="text-xs font-semibold text-rose-400">Cerrar Sesión</span>
                  <p className="text-[11px] text-zinc-500">Cierra tu cuenta activa en este dispositivo.</p>
                </div>

                <button
                  onClick={() => {
                    onClose();
                    onSignOut();
                  }}
                  className="px-3.5 py-1.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/20 text-xs font-semibold transition-all cursor-pointer active:scale-95 flex items-center gap-1.5"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Salir</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
