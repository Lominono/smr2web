'use client';

import React, { useState, useEffect, useCallback } from 'react';
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
  Bell,
  BellOff,
  Radio,
  Play,
  ListTodo,
  Sun,
  Moon,
  Laptop,
  Plus,
  Trash2,
  Calendar,
} from 'lucide-react';
import { UserProfile } from '@/lib/types';
import { getUserRank } from '@/lib/economy';
import { sound } from '@/lib/audio';
import {
  updateUserProfileSession,
  updateLocalUserPassword,
  getRememberMePreference,
  COOKIE_REMEMBER,
  wipeAllLocalData,
} from '@/lib/authSession';
import { validatePasswordSecurity } from '@/lib/passwordSecurity';
import {
  PersonalTask,
  getPersonalTasks,
  savePersonalTask,
  togglePersonalTask,
  deletePersonalTask,
} from '@/lib/agendaService';
import { SMR2_SUBJECTS } from '@/lib/scheduleData';
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
  notificationsEnabled?: boolean;
  onToggleNotifications?: () => void;
  onOpenPushModal?: () => void;
  onlineCount?: number;
  onOpenWindowsWelcome?: () => void;
  onOpenIsaacTour?: () => void;
}

const AVATAR_COLORS = [
  { id: 'emerald', bg: 'bg-emerald-600', ring: 'ring-emerald-500', label: 'Verde' },
  { id: 'blue', bg: 'bg-blue-600', ring: 'ring-blue-500', label: 'Azul' },
  { id: 'purple', bg: 'bg-purple-600', ring: 'ring-purple-500', label: 'Púrpura' },
  { id: 'amber', bg: 'bg-amber-500', ring: 'ring-amber-500', label: 'Ámbar' },
  { id: 'rose', bg: 'bg-rose-600', ring: 'ring-rose-500', label: 'Rosa' },
  { id: 'cyan', bg: 'bg-cyan-600', ring: 'ring-cyan-500', label: 'Cian' },
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
  notificationsEnabled = true,
  onToggleNotifications,
  onOpenPushModal,
  onlineCount = 1,
  onOpenWindowsWelcome,
  onOpenIsaacTour,
}) => {
  const [activeTab, setActiveTab] = useState<'profile' | 'agenda' | 'stats' | 'preferences' | 'security'>('profile');

  // Theme preference
  const [themePreference, setThemePreference] = useState<'system' | 'dark' | 'light'>('system');

  // Personal agenda state
  const [personalTasks, setPersonalTasks] = useState<PersonalTask[]>([]);
  const [personalFilter, setPersonalFilter] = useState<'all' | 'pending' | 'completed'>('all');
  const [isAddingPersonalTask, setIsAddingPersonalTask] = useState(false);
  const [pTitle, setPTitle] = useState('');
  const [pSubject, setPSubject] = useState('SOR');
  const [pDueDate, setPDueDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [pDueTime, setPDueTime] = useState('');
  const [pPriority, setPPriority] = useState<'high' | 'normal' | 'low'>('normal');
  const [pDesc, setPDesc] = useState('');

  // Profile form
  const [newUsername, setNewUsername] = useState(user?.username || '');
  const [fullName, setFullName] = useState(user?.full_name || '');
  const [studentNumber, setStudentNumber] = useState(user?.student_number || '');
  const [selectedColor, setSelectedColor] = useState(user?.avatar_color || 'emerald');
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileMsg, setProfileMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

  // Security form
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [savingPassword, setSavingPassword] = useState(false);
  const [passwordMsg, setPasswordMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);
  const newPassReport = newPassword.length > 0 ? validatePasswordSecurity(newPassword, user?.username, user?.email) : null;

  // Preferences
  const [rememberMe, setRememberMe] = useState(true);
  const [copiedId, setCopiedId] = useState(false);

  const reloadPersonalTasks = useCallback(() => {
    if (user?.id) {
      setPersonalTasks(getPersonalTasks(user.id));
    }
  }, [user?.id]);

  useEffect(() => {
    if (user) {
      setNewUsername(user.username);
      setFullName(user.full_name || '');
      setStudentNumber(user.student_number || '');
      setSelectedColor(user.avatar_color || 'emerald');
      reloadPersonalTasks();
    }
    try {
      const savedTheme = localStorage.getItem('smr2_theme') as 'system' | 'dark' | 'light' | null;
      if (savedTheme === 'dark' || savedTheme === 'light' || savedTheme === 'system') {
        setThemePreference(savedTheme);
      }
    } catch {}
    setRememberMe(getRememberMePreference());
    setProfileMsg(null);
    setPasswordMsg(null);
  }, [isOpen, user, reloadPersonalTasks]);

  const handleSetTheme = (theme: 'system' | 'dark' | 'light') => {
    setThemePreference(theme);
    try {
      localStorage.setItem('smr2_theme', theme);
      const d = document.documentElement;
      if (theme === 'dark') {
        d.classList.add('dark');
        d.classList.remove('light');
      } else if (theme === 'light') {
        d.classList.add('light');
        d.classList.remove('dark');
      } else {
        d.classList.remove('dark', 'light');
        if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
          d.classList.add('dark');
        } else {
          d.classList.add('light');
        }
      }
    } catch {}
    sound.tap();
  };

  const handleCreatePersonalTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.id || !pTitle.trim()) return;
    savePersonalTask(user.id, {
      title: pTitle.trim(),
      subject: pSubject,
      due_date: pDueDate,
      due_time: pDueTime,
      priority: pPriority,
      description: pDesc.trim(),
    });
    setPTitle('');
    setPDesc('');
    setIsAddingPersonalTask(false);
    reloadPersonalTasks();
    sound.coinWin();
  };

  const handleTogglePersonalTask = (taskId: string) => {
    if (!user?.id) return;
    const updated = togglePersonalTask(user.id, taskId);
    setPersonalTasks(updated);
    sound.tap();
  };

  const handleDeletePersonalTask = (taskId: string) => {
    if (!user?.id) return;
    const updated = deletePersonalTask(user.id, taskId);
    setPersonalTasks(updated);
    sound.tap();
  };

  if (!isOpen || !user) return null;

  const rank = getUserRank(user.coins);
  const totalGames = user.games_played ?? 0;
  const gamesWon = user.games_won ?? 0;
  const winRate = totalGames > 0 ? Math.round((gamesWon / totalGames) * 100) : 0;

  const handleCopyId = () => {
    navigator.clipboard.writeText(user.id);
    setCopiedId(true);
    setTimeout(() => setCopiedId(false), 2000);
    sound.tap();
  };

  const handleTestAudio = () => {
    sound.coinWin();
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileMsg(null);
    const cleanUsername = newUsername.trim().toLowerCase().replace(/\s+/g, '_');
    const cleanName = fullName.trim();
    const cleanNumber = studentNumber.trim().toUpperCase();

    if (cleanUsername.length < 3) {
      setProfileMsg({ type: 'err', text: 'El apodo debe tener al menos 3 caracteres.' });
      return;
    }
    if (!/^[a-z0-9_]+$/.test(cleanUsername)) {
      setProfileMsg({ type: 'err', text: 'Solo letras, números y guiones bajos (_).' });
      return;
    }
    if (cleanName && cleanName.length < 3) {
      setProfileMsg({ type: 'err', text: 'El nombre real debe tener al menos 3 caracteres.' });
      return;
    }

    setSavingProfile(true);

    try {
      const res = await fetch('/api/user/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          newUsername: cleanUsername,
          avatarColor: selectedColor,
          fullName: cleanName || undefined,
          studentNumber: cleanNumber || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'No se pudo actualizar el perfil.');
      }

      const updated = updateUserProfileSession({
        username: cleanUsername,
        avatar_color: selectedColor,
        full_name: cleanName || undefined,
        student_number: cleanNumber || undefined,
      });

      if (updated) {
        onUpdateUser(updated);
      }

      sound.coinWin();
      setProfileMsg({ type: 'ok', text: 'Perfil y datos de estudiante actualizados con éxito.' });
    } catch (err: any) {
      setProfileMsg({ type: 'err', text: err?.message || 'Error al guardar.' });
    } finally {
      setSavingProfile(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordMsg(null);

    const passCheck = validatePasswordSecurity(newPassword, user?.username, user?.email);
    if (!passCheck.valid) {
      setPasswordMsg({
        type: 'err',
        text: passCheck.errors[0] || 'La contraseña debe tener al menos 8 caracteres y combinar mayúsculas, minúsculas y números o símbolos.',
      });
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordMsg({ type: 'err', text: 'Las contraseñas no coinciden.' });
      return;
    }

    setSavingPassword(true);

    try {
      // 1. Try server update
      const res = await fetch('/api/user/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          newPassword,
        }),
      });

      const data = await res.json();

      // 2. Also update local storage account
      if (user.auth_provider === 'local') {
        await updateLocalUserPassword(user.id, newPassword);
      }

      if (!res.ok && user.auth_provider !== 'local') {
        throw new Error(data.error || 'No se pudo cambiar la contraseña.');
      }

      sound.coinWin();
      setPasswordMsg({ type: 'ok', text: 'Contraseña actualizada correctamente.' });
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
      <Card className="max-w-xl w-full p-0 overflow-hidden flex flex-col max-h-[92dvh] rounded-t-[20px] sm:rounded-2xl border-border/80 shadow-2xl bg-surface">
        {/* Modal Header */}
        <div className="p-4 sm:p-5 border-b border-border/70 flex items-center justify-between bg-surface-raised/40">
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 rounded-xl bg-surface-raised border border-border/70 text-accent">
              <Settings className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-semibold text-sm text-foreground">Ajustes del Alumno</h3>
              <p className="text-xs text-foreground-muted font-mono">Personaliza tu perfil, avatar y sistema</p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              onClose();
              sound.tap();
            }}
            aria-label="Cerrar modal"
            className="w-10 h-10 rounded-xl text-foreground-muted hover:text-foreground hover:bg-surface-raised flex items-center justify-center transition-all cursor-pointer active:scale-95 touch-manipulation"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* User Quick Identity Bar */}
        <div className="p-4 bg-surface-raised/70 border-b border-border/70 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="relative shrink-0">
              <div
                className={`w-11 h-11 rounded-xl ${activeColorObj.bg} text-white font-mono font-bold text-base flex items-center justify-center uppercase select-none shadow-xs`}
              >
                {user.username.charAt(0)}
              </div>
              <span className="w-3 h-3 rounded-full bg-emerald-500 border-2 border-surface absolute -bottom-0.5 -right-0.5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="font-semibold text-sm text-foreground font-mono truncate">@{user.username}</span>
                <Badge variant="accent" size="sm">
                  {rank.name}
                </Badge>
                {user.role === 'admin' && (
                  <Badge variant="danger" size="sm">
                    Admin
                  </Badge>
                )}
              </div>
              <div className="flex items-center gap-1.5 text-[11px] text-foreground-subtle font-mono mt-0.5 flex-wrap">
                {user.full_name && (
                  <>
                    <span className="text-foreground font-sans font-medium truncate max-w-[150px]">{user.full_name}</span>
                    <span>•</span>
                  </>
                )}
                {user.student_number && (
                  <>
                    <span className="text-accent font-semibold">NIA {user.student_number}</span>
                    <span>•</span>
                  </>
                )}
                <button
                  type="button"
                  onClick={handleCopyId}
                  className="hover:text-foreground flex items-center gap-1 transition-colors cursor-pointer py-0.5"
                  title="Copiar ID"
                >
                  <span>ID: {user.id.slice(0, 8)}...</span>
                  {copiedId ? <Check className="w-3 h-3 text-success" /> : <Copy className="w-3 h-3" />}
                </button>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-surface border border-border/80 text-xs font-mono font-semibold text-amber-500 shrink-0">
            <Coins className="w-4 h-4" />
            <span>{user.coins.toLocaleString('es-ES')}</span>
          </div>
        </div>

        {/* Tabs Bar */}
        <div className="flex items-center p-1.5 bg-surface border-b border-border/70 gap-1 overflow-x-auto scrollbar-none">
          {[
            { id: 'profile', label: 'Perfil', icon: User },
            {
              id: 'agenda',
              label: 'Mi Agenda',
              icon: ListTodo,
              badge: personalTasks.filter((t) => !t.is_completed).length,
            },
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
                className={`min-h-[42px] px-3.5 py-2 rounded-xl text-xs font-medium flex items-center gap-2 transition-all cursor-pointer shrink-0 active:scale-95 touch-manipulation ${
                  isActive
                    ? 'bg-foreground text-background font-semibold shadow-xs'
                    : 'text-foreground-muted hover:text-foreground hover:bg-surface-raised'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{t.label}</span>
                {typeof t.badge === 'number' && t.badge > 0 && (
                  <span
                    className={`px-1.5 py-0.5 rounded-full text-[10px] font-mono leading-none ${
                      isActive
                        ? 'bg-background text-foreground'
                        : 'bg-accent text-white'
                    }`}
                  >
                    {t.badge}
                  </span>
                )}
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
                placeholder="ej. carlos_smr"
                required
              />

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Input
                  label="Nombre y Apellidos Reales"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="ej. Carlos García Ruiz"
                  maxLength={50}
                />

                <Input
                  label="Nº de Estudiante / NIA"
                  value={studentNumber}
                  onChange={(e) => setStudentNumber(e.target.value)}
                  placeholder="ej. 10482910"
                  maxLength={20}
                />
              </div>

              {/* Avatar Color Picker */}
              <div className="space-y-1.5 pt-1">
                <div className="flex items-center justify-between">
                  <label className="text-xs text-foreground font-semibold">
                    Color del Avatar Personal
                  </label>
                  <span className="text-[11px] text-foreground-subtle font-mono">
                    Seleccionado: {activeColorObj.label}
                  </span>
                </div>
                <div className="grid grid-cols-6 gap-2">
                  {AVATAR_COLORS.map((c) => (
                    <button
                      type="button"
                      key={c.id}
                      onClick={() => {
                        setSelectedColor(c.id);
                        sound.tap();
                      }}
                      className={`min-h-[46px] rounded-xl ${c.bg} flex items-center justify-center transition-all cursor-pointer border active:scale-95 touch-manipulation ${
                        selectedColor === c.id
                          ? 'ring-2 ring-foreground scale-105 border-foreground shadow-sm'
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
                  className={`p-3 rounded-xl text-xs flex items-center gap-2 border ${
                    profileMsg.type === 'ok'
                      ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                      : 'bg-danger-subtle border-danger text-danger'
                  }`}
                >
                  {profileMsg.type === 'ok' ? <Check className="w-4 h-4 shrink-0" /> : <X className="w-4 h-4 shrink-0" />}
                  <span>{profileMsg.text}</span>
                </div>
              )}

              <div className="pt-2 flex justify-end">
                <Button
                  type="submit"
                  variant="primary"
                  size="md"
                  className="rounded-xl"
                  isLoading={savingProfile}
                >
                  Guardar Perfil
                </Button>
              </div>
            </form>
          )}

          {/* TAB: MI AGENDA PERSONAL */}
          {activeTab === 'agenda' && (
            <div className="space-y-4">
              {/* Header with stats */}
              <div className="p-4 rounded-xl bg-surface-raised border border-border/70 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <ListTodo className="w-4 h-4 text-accent" />
                    <h3 className="text-xs font-semibold text-foreground">Agenda Personal Privada</h3>
                  </div>
                  <p className="text-[11px] text-foreground-muted mt-0.5">
                    Tus tareas, repasos y notas que solo tú puedes ver.
                  </p>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  <Badge variant="accent" size="sm">
                    {personalTasks.filter((t) => !t.is_completed).length} pendientes
                  </Badge>
                  <Badge variant="default" size="sm">
                    {personalTasks.filter((t) => t.is_completed).length} completadas
                  </Badge>
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => {
                      setIsAddingPersonalTask(!isAddingPersonalTask);
                      sound.tap();
                    }}
                    className="rounded-lg text-xs"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>{isAddingPersonalTask ? 'Cerrar' : 'Nueva tarea'}</span>
                  </Button>
                </div>
              </div>

              {/* Creation form */}
              {isAddingPersonalTask && (
                <form
                  onSubmit={handleCreatePersonalTask}
                  className="p-4 rounded-xl bg-surface border border-accent/40 space-y-3 animate-in fade-in duration-150 shadow-xs"
                >
                  <div className="flex items-center justify-between border-b border-border/60 pb-2">
                    <span className="text-xs font-semibold text-foreground">
                      Añadir nueva tarea personal
                    </span>
                    <button
                      type="button"
                      onClick={() => setIsAddingPersonalTask(false)}
                      className="text-foreground-subtle hover:text-foreground text-xs cursor-pointer"
                    >
                      Cancelar
                    </button>
                  </div>

                  <Input
                    label="Título de la tarea"
                    value={pTitle}
                    onChange={(e) => setPTitle(e.target.value)}
                    placeholder="ej. Terminar práctica de servicios DNS y DHCP"
                    required
                  />

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                    <div className="space-y-1">
                      <label className="text-xs font-medium text-foreground-muted">
                        Materia / Asignatura
                      </label>
                      <select
                        value={pSubject}
                        onChange={(e) => setPSubject(e.target.value)}
                        className="w-full px-3 py-2 text-xs rounded-xl bg-surface-raised border border-border text-foreground focus:outline-hidden focus:border-accent"
                      >
                        {Object.keys(SMR2_SUBJECTS).map((code) => {
                          if (code === 'RECREO') return null;
                          return (
                            <option key={code} value={code}>
                              {code} — {SMR2_SUBJECTS[code].name}
                            </option>
                          );
                        })}
                        <option value="General">General / Personal</option>
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-medium text-foreground-muted">
                        Fecha límite
                      </label>
                      <input
                        type="date"
                        value={pDueDate}
                        onChange={(e) => setPDueDate(e.target.value)}
                        required
                        className="w-full px-3 py-2 text-xs rounded-xl bg-surface-raised border border-border text-foreground focus:outline-hidden focus:border-accent"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-medium text-foreground-muted">
                        Prioridad
                      </label>
                      <select
                        value={pPriority}
                        onChange={(e) => setPPriority(e.target.value as any)}
                        className="w-full px-3 py-2 text-xs rounded-xl bg-surface-raised border border-border text-foreground focus:outline-hidden focus:border-accent"
                      >
                        <option value="normal">Normal</option>
                        <option value="high">Alta (Urgente)</option>
                        <option value="low">Baja</option>
                      </select>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-medium text-foreground-muted">
                      Notas o descripción (opcional)
                    </label>
                    <textarea
                      value={pDesc}
                      onChange={(e) => setPDesc(e.target.value)}
                      rows={2}
                      placeholder="Comandos, enlaces o detalles a tener en cuenta..."
                      className="w-full px-3 py-2 text-xs rounded-xl bg-surface-raised border border-border text-foreground focus:outline-hidden focus:border-accent resize-none"
                    />
                  </div>

                  <div className="flex justify-end pt-1">
                    <Button type="submit" variant="primary" size="sm" className="rounded-xl">
                      <Plus className="w-3.5 h-3.5" />
                      <span>Guardar en mi agenda</span>
                    </Button>
                  </div>
                </form>
              )}

              {/* Filter tabs */}
              <div className="flex items-center gap-1.5 text-xs">
                {(
                  [
                    { id: 'all', label: 'Todas' },
                    { id: 'pending', label: 'Pendientes' },
                    { id: 'completed', label: 'Completadas' },
                  ] as const
                ).map((f) => (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => {
                      setPersonalFilter(f.id);
                      sound.tap();
                    }}
                    className={`px-3 py-1 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                      personalFilter === f.id
                        ? 'bg-foreground text-background font-semibold shadow-xs'
                        : 'bg-surface-raised text-foreground-muted hover:text-foreground'
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>

              {/* Tasks list */}
              {personalTasks.length === 0 ? (
                <div className="p-8 text-center border border-dashed border-border/80 rounded-2xl space-y-2 bg-surface-raised/20">
                  <ListTodo className="w-8 h-8 text-foreground-subtle mx-auto opacity-40" />
                  <h4 className="text-xs font-semibold text-foreground">
                    Tu agenda personal está vacía
                  </h4>
                  <p className="text-[11px] text-foreground-muted max-w-xs mx-auto">
                    Añade tus tareas individuales, ejercicios pendientes y recordatorios de clase.
                  </p>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => setIsAddingPersonalTask(true)}
                    className="rounded-xl mt-2"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Crear mi primera tarea</span>
                  </Button>
                </div>
              ) : (
                <div className="space-y-2">
                  {personalTasks
                    .filter((t) => {
                      if (personalFilter === 'pending') return !t.is_completed;
                      if (personalFilter === 'completed') return t.is_completed;
                      return true;
                    })
                    .map((task) => (
                      <div
                        key={task.id}
                        className={`p-3 rounded-xl border transition-all flex items-start justify-between gap-3 ${
                          task.is_completed
                            ? 'bg-surface-raised/40 border-border/50 opacity-70'
                            : 'bg-surface border-border hover:border-foreground/20'
                        }`}
                      >
                        <div className="flex items-start gap-3 min-w-0">
                          <button
                            type="button"
                            onClick={() => handleTogglePersonalTask(task.id)}
                            className={`w-5 h-5 mt-0.5 rounded-md border flex items-center justify-center transition-all cursor-pointer shrink-0 ${
                              task.is_completed
                                ? 'bg-emerald-500 border-emerald-500 text-white'
                                : 'border-border-focus hover:border-accent bg-surface-raised'
                            }`}
                            title={task.is_completed ? 'Marcar como pendiente' : 'Marcar como completada'}
                          >
                            {task.is_completed && <Check className="w-3.5 h-3.5 text-white" />}
                          </button>

                          <div className="min-w-0 space-y-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span
                                className={`text-xs font-semibold ${
                                  task.is_completed
                                    ? 'line-through text-foreground-muted'
                                    : 'text-foreground'
                                }`}
                              >
                                {task.title}
                              </span>
                              {task.subject && (
                                <Badge variant="default" size="sm">
                                  {task.subject}
                                </Badge>
                              )}
                              {task.priority === 'high' && (
                                <Badge variant="danger" size="sm">
                                  Urgente
                                </Badge>
                              )}
                            </div>

                            {task.description && (
                              <p className="text-[11px] text-foreground-muted leading-relaxed line-clamp-2">
                                {task.description}
                              </p>
                            )}

                            <div className="flex items-center gap-2 text-[10px] font-mono text-foreground-subtle">
                              <span className="flex items-center gap-1">
                                <Calendar className="w-3 h-3" />
                                <span>{task.due_date}</span>
                              </span>
                              {task.due_time && <span>• {task.due_time}</span>}
                            </div>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleDeletePersonalTask(task.id)}
                          title="Eliminar tarea"
                          className="text-foreground-subtle hover:text-danger p-1 cursor-pointer transition-colors shrink-0"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 2: STATS */}
          {activeTab === 'stats' && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                <div className="p-3.5 rounded-xl bg-surface-raised border border-border/70 space-y-1">
                  <span className="text-[10px] text-foreground-subtle font-mono uppercase">Saldo actual</span>
                  <div className="text-sm font-bold text-accent font-mono">
                    {user.coins.toLocaleString('es-ES')}
                  </div>
                  <span className="text-[11px] text-foreground-subtle">Fichas disponibles</span>
                </div>

                <div className="p-3.5 rounded-xl bg-surface-raised border border-border/70 space-y-1">
                  <span className="text-[10px] text-foreground-subtle font-mono uppercase">Mayor bote</span>
                  <div className="text-sm font-bold text-foreground font-mono">
                    {(user.biggest_win || 0).toLocaleString('es-ES')}
                  </div>
                  <span className="text-[11px] text-foreground-subtle">Récord histórico</span>
                </div>

                <div className="p-3.5 rounded-xl bg-surface-raised border border-border/70 space-y-1">
                  <span className="text-[10px] text-foreground-subtle font-mono uppercase">Porcentaje victorias</span>
                  <div className="text-sm font-bold text-foreground font-mono">
                    {winRate}%
                  </div>
                  <span className="text-[11px] text-foreground-subtle">{gamesWon} de {totalGames} ganadas</span>
                </div>

                <div className="p-3.5 rounded-xl bg-surface-raised border border-border/70 space-y-1">
                  <span className="text-[10px] text-foreground-subtle font-mono uppercase">Racha de asistencia</span>
                  <div className="text-sm font-bold text-accent font-mono flex items-center gap-1">
                    <Flame className="w-3.5 h-3.5 text-amber-500" />
                    <span>{user.streak_count || 1} días</span>
                  </div>
                  <span className="text-[11px] text-foreground-subtle">Reclamos seguidos</span>
                </div>

                <div className="p-3.5 rounded-xl bg-surface-raised border border-border/70 space-y-1">
                  <span className="text-[10px] text-foreground-subtle font-mono uppercase">Rango en clase</span>
                  <div className="text-sm font-bold text-foreground font-mono uppercase">
                    {user.role === 'admin' ? 'Administrador' : user.role === 'delegado' ? 'Delegado' : 'Estudiante'}
                  </div>
                  <span className="text-[11px] text-foreground-subtle">2º SMR 2026/27</span>
                </div>

                <div className="p-3.5 rounded-xl bg-surface-raised border border-border/70 space-y-1">
                  <span className="text-[10px] text-foreground-subtle font-mono uppercase">Fondo de rescate</span>
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onOpenFaucet();
                    }}
                    className="text-xs font-semibold text-accent underline font-mono block text-left cursor-pointer"
                  >
                    Reclamar subsidio
                  </button>
                  <span className="text-[11px] text-foreground-subtle">Recarga gratuita</span>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: PREFERENCES */}
          {activeTab === 'preferences' && (
            <div className="space-y-3">
              {/* Theme Preference: Dark / Light / System */}
              <div className="p-3.5 rounded-xl bg-surface-raised border border-border/70 space-y-2.5">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <Palette className="w-4 h-4 text-accent" />
                    <span className="text-xs font-semibold text-foreground">Tema de la Interfaz</span>
                  </div>
                  <p className="text-[11px] text-foreground-muted">
                    Elige entre modo oscuro, modo claro o sincronización con el sistema.
                  </p>
                </div>

                <div className="grid grid-cols-3 gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => handleSetTheme('light')}
                    className={`min-h-[46px] p-2 rounded-xl border flex flex-col items-center justify-center gap-1 transition-all cursor-pointer active:scale-95 touch-manipulation ${
                      themePreference === 'light'
                        ? 'bg-foreground text-background font-semibold border-foreground shadow-xs'
                        : 'bg-surface text-foreground-muted border-border hover:text-foreground hover:bg-surface-hover'
                    }`}
                  >
                    <Sun className="w-4 h-4 text-amber-500" />
                    <span className="text-xs">Claro</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleSetTheme('dark')}
                    className={`min-h-[46px] p-2 rounded-xl border flex flex-col items-center justify-center gap-1 transition-all cursor-pointer active:scale-95 touch-manipulation ${
                      themePreference === 'dark'
                        ? 'bg-foreground text-background font-semibold border-foreground shadow-xs'
                        : 'bg-surface text-foreground-muted border-border hover:text-foreground hover:bg-surface-hover'
                    }`}
                  >
                    <Moon className="w-4 h-4 text-sky-400" />
                    <span className="text-xs">Oscuro</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleSetTheme('system')}
                    className={`min-h-[46px] p-2 rounded-xl border flex flex-col items-center justify-center gap-1 transition-all cursor-pointer active:scale-95 touch-manipulation ${
                      themePreference === 'system'
                        ? 'bg-foreground text-background font-semibold border-foreground shadow-xs'
                        : 'bg-surface text-foreground-muted border-border hover:text-foreground hover:bg-surface-hover'
                    }`}
                  >
                    <Laptop className="w-4 h-4 text-foreground-subtle" />
                    <span className="text-xs">Sistema</span>
                  </button>
                </div>
              </div>

              {/* Live Presence Status */}
              <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-between gap-3">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-500" />
                    <span className="text-xs font-semibold text-emerald-500">Conexión activa</span>
                  </div>
                  <p className="text-[11px] text-foreground-muted">
                    {onlineCount} {onlineCount === 1 ? 'alumno conectado en directo' : 'alumnos conectados en directo'} en el aula.
                  </p>
                </div>
                <Badge variant="success" size="sm">
                  Activo
                </Badge>
              </div>

              {/* Sound Effects */}
              <div className="p-3.5 rounded-xl bg-surface-raised border border-border/70 flex items-center justify-between gap-3">
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
                    Sonidos de interfaz, victorias y avisos del recreo.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  {soundEnabled && (
                    <button
                      type="button"
                      onClick={handleTestAudio}
                      title="Probar sonido"
                      className="px-2.5 py-1.5 rounded-lg bg-surface border border-border text-[11px] text-foreground-muted hover:text-foreground flex items-center gap-1 cursor-pointer transition-colors"
                    >
                      <Play className="w-3 h-3 text-accent" />
                      <span>Test</span>
                    </button>
                  )}
                  <Button
                    variant="secondary"
                    size="sm"
                    className="rounded-lg"
                    onClick={() => {
                      onToggleSound();
                      sound.tap();
                    }}
                  >
                    {soundEnabled ? 'Activado' : 'Silenciado'}
                  </Button>
                </div>
              </div>

              {/* Notification Alerts */}
              {onToggleNotifications && (
                <div className="p-3.5 rounded-xl bg-surface-raised border border-border/70 flex items-center justify-between gap-3">
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      {notificationsEnabled ? (
                        <Bell className="w-4 h-4 text-accent" />
                      ) : (
                        <BellOff className="w-4 h-4 text-foreground-subtle" />
                      )}
                      <span className="text-xs font-semibold text-foreground">Avisos y Toasts en Vivo</span>
                    </div>
                    <p className="text-[11px] text-foreground-muted">
                      Notificaciones emergentes de victorias, exámenes y chat de clase.
                    </p>
                  </div>

                  <Button
                    variant={notificationsEnabled ? 'primary' : 'secondary'}
                    size="sm"
                    className="rounded-lg"
                    onClick={onToggleNotifications}
                  >
                    {notificationsEnabled ? 'Activados' : 'Desactivados'}
                  </Button>
                </div>
              )}

              {/* Web Push Background Notifications */}
              {onOpenPushModal && (
                <div className="p-3.5 rounded-xl bg-surface-raised border border-border/70 flex items-center justify-between gap-3">
                  <div className="space-y-0.5">
                    <span className="text-xs font-semibold text-foreground">Avisos Web Push (Fuera de la web)</span>
                    <p className="text-[11px] text-foreground-muted">
                      Recibe notificaciones en tu móvil y PC aunque la página esté cerrada.
                    </p>
                  </div>

                  <Button
                    variant="secondary"
                    size="sm"
                    className="rounded-lg text-xs"
                    onClick={() => {
                      sound.tap();
                      onOpenPushModal();
                    }}
                  >
                    Configurar
                  </Button>
                </div>
              )}

              {/* Remember Session */}
              <div className="p-3.5 rounded-xl bg-surface-raised border border-border/70 flex items-center justify-between gap-3">
                <div className="space-y-0.5">
                  <span className="text-xs font-semibold text-foreground">Recordar Sesión Permanente</span>
                  <p className="text-[11px] text-foreground-muted">
                    Mantener tu sesión iniciada de forma automática (365 días).
                  </p>
                </div>

                <Button
                  variant={rememberMe ? 'primary' : 'secondary'}
                  size="sm"
                  className="rounded-lg"
                  onClick={() => handleToggleRemember(!rememberMe)}
                >
                  {rememberMe ? 'Activado' : 'Desactivado'}
                </Button>
              </div>

              {/* Windows Easter Egg */}
              {onOpenWindowsWelcome && (
                <div className="p-3.5 rounded-xl bg-surface-raised border border-border/70 flex items-center justify-between gap-3">
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="text-sm">🖥️</span>
                      <span className="text-xs font-semibold text-foreground">Bienvenida Windows (Easter Egg)</span>
                    </div>
                    <p className="text-[11px] text-foreground-muted">
                      Revivir la pantalla de inicio retro con el sonido clásico de Windows.
                    </p>
                  </div>

                  <Button
                    variant="secondary"
                    size="sm"
                    className="rounded-lg text-xs"
                    onClick={() => {
                      sound.tap();
                      onClose();
                      onOpenWindowsWelcome();
                    }}
                  >
                    Ver inicio
                  </Button>
                </div>
              )}

              {/* PUTOISAAC Assistant Tour */}
              {onOpenIsaacTour && (
                <div className="p-3.5 rounded-xl bg-surface-raised border border-border/70 flex items-center justify-between gap-3">
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="text-sm">💬</span>
                      <span className="text-xs font-semibold text-foreground">Asistente PUTOISAAC</span>
                    </div>
                    <p className="text-[11px] text-foreground-muted">
                      Iniciar el tour guiado por la web y consejos de clase.
                    </p>
                  </div>

                  <Button
                    variant="secondary"
                    size="sm"
                    className="rounded-lg text-xs"
                    onClick={() => {
                      sound.tap();
                      onClose();
                      onOpenIsaacTour();
                    }}
                  >
                    Ver tour
                  </Button>
                </div>
              )}

              {/* Wipe Local Device Data */}
              <div className="p-3.5 rounded-xl bg-danger-subtle border border-danger/25 flex items-center justify-between gap-3">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <Trash2 className="w-4 h-4 text-danger" />
                    <span className="text-xs font-semibold text-danger">Borrar Todo en Este Dispositivo</span>
                  </div>
                  <p className="text-[11px] text-foreground-muted">
                    Elimina todas las sesiones, cuentas guardadas y caché local del navegador.
                  </p>
                </div>

                <Button
                  variant="danger"
                  size="sm"
                  className="rounded-lg text-xs shrink-0"
                  onClick={() => {
                    if (confirm('¿Eliminar todos los datos locales, cuentas y cerrar sesión en este equipo?')) {
                      wipeAllLocalData();
                      window.location.reload();
                    }
                  }}
                >
                  Borrar local
                </Button>
              </div>

              {/* Créditos oficiales */}
              <div className="pt-2 text-center text-[10px] text-foreground-muted font-mono">
                Desarrollado por <span className="text-foreground font-semibold">JuanFe Ospina</span> y <span className="text-foreground font-semibold">David</span> · 2º SMR
              </div>
            </div>
          )}

          {/* TAB 4: SECURITY */}
          {activeTab === 'security' && (
            <div className="space-y-4">
              <form onSubmit={handleChangePassword} className="space-y-3">
                <div className="space-y-1.5">
                  <Input
                    label="Nueva Contraseña"
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Mínimo 8 caracteres"
                    minLength={8}
                    required
                  />

                  {newPassReport && (
                    <div className="p-2.5 rounded-lg bg-surface-raised border border-border/70 space-y-2 animate-in fade-in duration-150">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-foreground-muted">Nivel de seguridad:</span>
                        <span className={`font-semibold ${
                          newPassReport.score <= 1 ? 'text-red-500' :
                          newPassReport.score === 2 ? 'text-amber-500' :
                          newPassReport.score === 3 ? 'text-emerald-500' : 'text-green-500'
                        }`}>
                          {newPassReport.strengthLabel}
                        </span>
                      </div>

                      <div className="grid grid-cols-4 gap-1 h-1.5 w-full">
                        {[1, 2, 3, 4].map((seg) => (
                          <div
                            key={seg}
                            className={`h-full rounded-full transition-all duration-300 ${
                              newPassReport.score >= seg
                                ? newPassReport.score <= 1
                                  ? 'bg-red-500'
                                  : newPassReport.score === 2
                                  ? 'bg-amber-500'
                                  : 'bg-emerald-500'
                                : 'bg-border'
                            }`}
                          />
                        ))}
                      </div>

                      <div className="grid grid-cols-2 gap-x-2 gap-y-1 text-[10px] text-foreground-subtle">
                        <div className={`flex items-center gap-1 ${newPassReport.criteria.minLength ? 'text-emerald-500 font-medium' : ''}`}>
                          <span>{newPassReport.criteria.minLength ? '✓' : '•'}</span>
                          <span>Mín. 8 caracteres</span>
                        </div>
                        <div className={`flex items-center gap-1 ${newPassReport.criteria.hasUppercase && newPassReport.criteria.hasLowercase ? 'text-emerald-500 font-medium' : ''}`}>
                          <span>{newPassReport.criteria.hasUppercase && newPassReport.criteria.hasLowercase ? '✓' : '•'}</span>
                          <span>Mayús. y minús.</span>
                        </div>
                        <div className={`flex items-center gap-1 ${newPassReport.criteria.hasNumber ? 'text-emerald-500 font-medium' : ''}`}>
                          <span>{newPassReport.criteria.hasNumber ? '✓' : '•'}</span>
                          <span>Al menos 1 número</span>
                        </div>
                        <div className={`flex items-center gap-1 ${newPassReport.criteria.hasSpecial ? 'text-emerald-500 font-medium' : ''}`}>
                          <span>{newPassReport.criteria.hasSpecial ? '✓' : '•'}</span>
                          <span>Al menos 1 símbolo</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                <Input
                  label="Confirmar Nueva Contraseña"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Repite la contraseña"
                  minLength={8}
                  required
                />

                {passwordMsg && (
                  <div
                    className={`p-3 rounded-xl text-xs flex items-center gap-2 border ${
                      passwordMsg.type === 'ok'
                        ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                        : 'bg-danger-subtle border-danger text-danger'
                    }`}
                  >
                    {passwordMsg.type === 'ok' ? <Check className="w-4 h-4 shrink-0" /> : <X className="w-4 h-4 shrink-0" />}
                    <span>{passwordMsg.text}</span>
                  </div>
                )}

                <div className="pt-1 flex justify-end">
                  <Button
                    type="submit"
                    variant="primary"
                    size="md"
                    className="rounded-xl"
                    isLoading={savingPassword}
                  >
                    Actualizar Contraseña
                  </Button>
                </div>
              </form>

              {/* Danger Zone: Logout */}
              <div className="pt-4 border-t border-border/70 flex items-center justify-between">
                <div>
                  <span className="text-xs font-semibold text-danger">Cerrar Sesión</span>
                  <p className="text-[11px] text-foreground-subtle">Cierra tu cuenta activa en este navegador.</p>
                </div>

                <Button
                  variant="danger"
                  size="sm"
                  className="rounded-xl"
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
