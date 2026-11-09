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
  Play,
  ListTodo,
  Sun,
  Moon,
  Laptop,
  Plus,
  Trash2,
  Calendar,
  Monitor,
  MessageSquare,
  Lock,
  ArrowUpRight,
  Sparkles,
  Terminal,
  IdCard,
  MonitorDown,
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
  onOpenStudentCard?: () => void;
  onOpenInstall?: () => void;
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
  onOpenStudentCard,
  onOpenInstall,
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
      setProfileMsg({ type: 'err', text: 'El identificador debe tener al menos 3 caracteres.' });
      return;
    }
    if (!/^[a-z0-9_]+$/.test(cleanUsername)) {
      setProfileMsg({ type: 'err', text: 'Solo caracteres alfanuméricos y guion bajo (_).' });
      return;
    }
    if (cleanName && cleanName.length < 3) {
      setProfileMsg({ type: 'err', text: 'El nombre completo debe tener al menos 3 caracteres.' });
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
      setProfileMsg({ type: 'ok', text: 'Perfil sincronizado correctamente.' });
    } catch (err: any) {
      setProfileMsg({ type: 'err', text: err?.message || 'Error al guardar cambios.' });
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
        text: passCheck.errors[0] || 'La contraseña no cumple los requisitos mínimos de entropía.',
      });
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordMsg({ type: 'err', text: 'Las contraseñas ingresadas no coinciden.' });
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

      if (user.auth_provider === 'local') {
        await updateLocalUserPassword(user.id, newPassword);
      }

      if (!res.ok && user.auth_provider !== 'local') {
        throw new Error(data.error || 'No se pudo actualizar la credencial.');
      }

      sound.coinWin();
      setPasswordMsg({ type: 'ok', text: 'Credencial actualizada correctamente.' });
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      setPasswordMsg({ type: 'err', text: err?.message || 'Error al actualizar credencial.' });
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
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/70 backdrop-blur-md pt-[env(safe-area-inset-top,0px)] pb-[env(safe-area-inset-bottom,0px)]">
      <Card className="max-w-xl w-full p-0 overflow-hidden flex flex-col max-h-[92dvh] rounded-t-3xl sm:rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 shadow-2xl">
        {/* Modal Header */}
        <div className="px-5 py-4 border-b border-neutral-200 dark:border-neutral-800/80 flex items-center justify-between bg-neutral-50/50 dark:bg-neutral-900/40">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700/60 flex items-center justify-center text-neutral-700 dark:text-neutral-300">
              <Settings className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-semibold text-sm text-neutral-900 dark:text-neutral-100 tracking-tight">
                Configuración del Alumno
              </h3>
              <p className="text-[11px] text-neutral-500 font-mono tracking-tight">
                2º SMR · Aula: Ni puta idea
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              onClose();
              sound.tap();
            }}
            aria-label="Cerrar modal"
            className="w-8 h-8 rounded-lg text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100 hover:bg-neutral-100 dark:hover:bg-neutral-800/80 flex items-center justify-center transition-colors cursor-pointer active:scale-95 touch-manipulation"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* User Identity Header Card */}
        <div className="px-5 py-3.5 bg-neutral-100/50 dark:bg-neutral-900/30 border-b border-neutral-200 dark:border-neutral-800/70 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="relative shrink-0">
              <div
                className={`w-11 h-11 rounded-xl ${activeColorObj.bg} text-white font-mono font-semibold text-base flex items-center justify-center uppercase select-none shadow-sm ring-1 ring-black/10 dark:ring-white/10`}
              >
                {user.username.charAt(0)}
              </div>
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 border-2 border-white dark:border-neutral-950 absolute -bottom-0.5 -right-0.5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-semibold text-sm text-neutral-900 dark:text-neutral-100 font-mono truncate">
                  @{user.username}
                </span>
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded-md bg-neutral-200/80 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 border border-neutral-300/60 dark:border-neutral-700/60">
                  {rank.name}
                </span>
                {user.role === 'admin' && (
                  <span className="text-[10px] font-mono px-1.5 py-0.5 rounded-md bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20 font-medium">
                    Admin
                  </span>
                )}
              </div>
              <div className="flex items-center gap-1.5 text-[11px] text-neutral-500 font-mono mt-0.5 flex-wrap">
                {user.full_name && (
                  <>
                    <span className="text-neutral-700 dark:text-neutral-300 font-sans font-medium truncate max-w-[140px]">
                      {user.full_name}
                    </span>
                    <span className="text-neutral-300 dark:text-neutral-700">/</span>
                  </>
                )}
                {user.student_number ? (
                  <>
                    <span className="text-neutral-900 dark:text-neutral-200 font-medium">
                      NIA {user.student_number}
                    </span>
                    <span className="text-neutral-300 dark:text-neutral-700">/</span>
                  </>
                ) : null}
                <button
                  type="button"
                  onClick={handleCopyId}
                  className="hover:text-neutral-900 dark:hover:text-neutral-100 flex items-center gap-1 transition-colors cursor-pointer py-0.5"
                  title="Copiar identificador interno"
                >
                  <span>{user.id.slice(0, 8)}</span>
                  {copiedId ? (
                    <Check className="w-3 h-3 text-emerald-500" />
                  ) : (
                    <Copy className="w-2.5 h-2.5 opacity-60" />
                  )}
                </button>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-neutral-200/60 dark:bg-neutral-850 border border-neutral-300/60 dark:border-neutral-800 text-xs font-mono font-medium text-neutral-900 dark:text-neutral-100 shrink-0">
            <Coins className="w-3.5 h-3.5 text-amber-500" />
            <span>{user.coins.toLocaleString('es-ES')}</span>
          </div>
        </div>

        {/* Minimalist Segmented Tabs Bar */}
        <div className="px-5 py-2.5 bg-neutral-50/70 dark:bg-neutral-950 border-b border-neutral-200 dark:border-neutral-800/80 flex items-center gap-1 overflow-x-auto scrollbar-none">
          {[
            { id: 'profile', label: 'Perfil', icon: User },
            {
              id: 'agenda',
              label: 'Agenda',
              icon: ListTodo,
              badge: personalTasks.filter((t) => !t.is_completed).length,
            },
            { id: 'stats', label: 'Estadísticas', icon: BarChart3 },
            { id: 'preferences', label: 'Ajustes', icon: Palette },
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
                className={`min-h-[36px] px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-2 transition-all cursor-pointer shrink-0 active:scale-95 touch-manipulation ${
                  isActive
                    ? 'bg-neutral-900 dark:bg-neutral-100 text-white dark:text-neutral-950 font-semibold shadow-xs'
                    : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100 hover:bg-neutral-150 dark:hover:bg-neutral-900'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{t.label}</span>
                {typeof t.badge === 'number' && t.badge > 0 && (
                  <span
                    className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono leading-none ${
                      isActive
                        ? 'bg-white/20 dark:bg-black/20 text-white dark:text-neutral-950'
                        : 'bg-neutral-200 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300'
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
        <div className="p-5 sm:p-6 overflow-y-auto space-y-4 flex-1">
          {/* TAB 1: PROFILE */}
          {activeTab === 'profile' && (
            <form onSubmit={handleSaveProfile} className="space-y-4">
              {/* Tarjeta de Acceso Directo a Ficha de Estudiante Oficial */}
              {onOpenStudentCard && (
                <div className="p-3.5 rounded-2xl bg-sky-500/10 border border-sky-500/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-sky-500/20 text-sky-400 flex items-center justify-center shrink-0">
                      <IdCard className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="text-xs font-semibold text-neutral-900 dark:text-white">
                        Ficha y Carnet Oficial de Estudiante
                      </h4>
                      <p className="text-[11px] text-neutral-500 dark:text-neutral-400">
                        Check-in de asistencia diaria, puesto en taller (PC) y horario
                      </p>
                    </div>
                  </div>
                  <Button
                    type="button"
                    variant="primary"
                    size="sm"
                    onClick={() => {
                      onClose();
                      onOpenStudentCard();
                    }}
                    className="text-xs rounded-xl bg-sky-500 hover:bg-sky-400 text-neutral-950 font-semibold shrink-0"
                  >
                    Ver Ficha
                  </Button>
                </div>
              )}

              <Input
                label="Identificador de Usuario"
                value={newUsername}
                onChange={(e) => setNewUsername(e.target.value)}
                maxLength={20}
                placeholder="ej. carlos_smr"
                required
              />

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Input
                  label="Nombre y Apellidos"
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
              <div className="space-y-2 pt-1">
                <div className="flex items-center justify-between text-xs">
                  <label className="text-neutral-900 dark:text-neutral-200 font-medium">
                    Tono de Identificador Gráfico
                  </label>
                  <span className="text-[11px] text-neutral-500 font-mono">
                    {activeColorObj.label}
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
                      className={`min-h-[42px] rounded-xl ${c.bg} flex items-center justify-center transition-all cursor-pointer border active:scale-95 touch-manipulation ${
                        selectedColor === c.id
                          ? 'ring-2 ring-neutral-900 dark:ring-neutral-100 scale-102 border-transparent shadow-xs'
                          : 'border-transparent opacity-80 hover:opacity-100'
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
                  className={`p-3 rounded-xl text-xs flex items-center gap-2 border font-mono ${
                    profileMsg.type === 'ok'
                      ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400'
                      : 'bg-red-500/10 border-red-500/20 text-red-600 dark:text-red-400'
                  }`}
                >
                  {profileMsg.type === 'ok' ? (
                    <Check className="w-4 h-4 shrink-0" />
                  ) : (
                    <X className="w-4 h-4 shrink-0" />
                  )}
                  <span>{profileMsg.text}</span>
                </div>
              )}

              <div className="pt-2 flex justify-end">
                <Button
                  type="submit"
                  variant="primary"
                  size="md"
                  className="rounded-xl px-5 text-xs font-semibold"
                  isLoading={savingProfile}
                >
                  Guardar Cambios
                </Button>
              </div>
            </form>
          )}

          {/* TAB: MI AGENDA PERSONAL */}
          {activeTab === 'agenda' && (
            <div className="space-y-4">
              {/* Header with stats */}
              <div className="p-4 rounded-xl bg-neutral-50 dark:bg-neutral-900/40 border border-neutral-200 dark:border-neutral-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <ListTodo className="w-4 h-4 text-neutral-700 dark:text-neutral-300" />
                    <h4 className="text-xs font-semibold text-neutral-900 dark:text-neutral-100">
                      Agenda Personal Privada
                    </h4>
                  </div>
                  <p className="text-[11px] text-neutral-500 mt-0.5">
                    Anotaciones y tareas individuales almacenadas en tu cuenta.
                  </p>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[11px] font-mono px-2 py-0.5 rounded-md bg-neutral-200/70 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300">
                    {personalTasks.filter((t) => !t.is_completed).length} pendientes
                  </span>
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
                  className="p-4 rounded-xl bg-neutral-50/50 dark:bg-neutral-900/20 border border-neutral-300 dark:border-neutral-800 space-y-3 shadow-xs"
                >
                  <div className="flex items-center justify-between border-b border-neutral-200 dark:border-neutral-800 pb-2">
                    <span className="text-xs font-semibold text-neutral-900 dark:text-neutral-100">
                      Nueva anotación
                    </span>
                    <button
                      type="button"
                      onClick={() => setIsAddingPersonalTask(false)}
                      className="text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100 text-xs cursor-pointer"
                    >
                      Cancelar
                    </button>
                  </div>

                  <Input
                    label="Título de la tarea"
                    value={pTitle}
                    onChange={(e) => setPTitle(e.target.value)}
                    placeholder="ej. Práctica de enrutamiento estático en Debian"
                    required
                  />

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                    <div className="space-y-1">
                      <label className="text-xs font-medium text-neutral-600 dark:text-neutral-400">
                        Materia
                      </label>
                      <select
                        value={pSubject}
                        onChange={(e) => setPSubject(e.target.value)}
                        className="w-full px-3 py-2 text-xs rounded-xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 text-neutral-900 dark:text-neutral-100 focus:outline-hidden focus:border-neutral-500"
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
                      <label className="text-xs font-medium text-neutral-600 dark:text-neutral-400">
                        Fecha límite
                      </label>
                      <input
                        type="date"
                        value={pDueDate}
                        onChange={(e) => setPDueDate(e.target.value)}
                        required
                        className="w-full px-3 py-2 text-xs rounded-xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 text-neutral-900 dark:text-neutral-100 focus:outline-hidden focus:border-neutral-500"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-medium text-neutral-600 dark:text-neutral-400">
                        Prioridad
                      </label>
                      <select
                        value={pPriority}
                        onChange={(e) => setPPriority(e.target.value as any)}
                        className="w-full px-3 py-2 text-xs rounded-xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 text-neutral-900 dark:text-neutral-100 focus:outline-hidden focus:border-neutral-500"
                      >
                        <option value="normal">Normal</option>
                        <option value="high">Alta (Urgente)</option>
                        <option value="low">Baja</option>
                      </select>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-medium text-neutral-600 dark:text-neutral-400">
                      Detalles o comandos (opcional)
                    </label>
                    <textarea
                      value={pDesc}
                      onChange={(e) => setPDesc(e.target.value)}
                      rows={2}
                      placeholder="IPs asignadas, comandos o notas de entrega..."
                      className="w-full px-3 py-2 text-xs rounded-xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 text-neutral-900 dark:text-neutral-100 focus:outline-hidden focus:border-neutral-500 resize-none"
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
                        ? 'bg-neutral-900 dark:bg-neutral-100 text-white dark:text-neutral-950 font-semibold shadow-xs'
                        : 'bg-neutral-100 dark:bg-neutral-900 text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-100'
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>

              {/* Tasks list */}
              {personalTasks.length === 0 ? (
                <div className="p-8 text-center border border-dashed border-neutral-200 dark:border-neutral-800 rounded-2xl space-y-2 bg-neutral-50/50 dark:bg-neutral-900/10">
                  <ListTodo className="w-6 h-6 text-neutral-400 mx-auto opacity-50" />
                  <h4 className="text-xs font-semibold text-neutral-900 dark:text-neutral-100">
                    Sin tareas registradas
                  </h4>
                  <p className="text-[11px] text-neutral-500 max-w-xs mx-auto">
                    Organiza tus entregas individuales y fechas de examen aquí.
                  </p>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => setIsAddingPersonalTask(true)}
                    className="rounded-xl mt-2 text-xs"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Crear primera tarea</span>
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
                            ? 'bg-neutral-50/50 dark:bg-neutral-900/20 border-neutral-200 dark:border-neutral-800/60 opacity-60'
                            : 'bg-white dark:bg-neutral-900 border-neutral-200 dark:border-neutral-800 hover:border-neutral-400 dark:hover:border-neutral-700'
                        }`}
                      >
                        <div className="flex items-start gap-3 min-w-0">
                          <button
                            type="button"
                            onClick={() => handleTogglePersonalTask(task.id)}
                            className={`w-4 h-4 mt-0.5 rounded-md border flex items-center justify-center transition-all cursor-pointer shrink-0 ${
                              task.is_completed
                                ? 'bg-emerald-600 border-emerald-600 text-white'
                                : 'border-neutral-300 dark:border-neutral-700 hover:border-neutral-500 bg-neutral-100 dark:bg-neutral-800'
                            }`}
                            title={task.is_completed ? 'Marcar como pendiente' : 'Marcar como completada'}
                          >
                            {task.is_completed && <Check className="w-3 h-3 text-white" />}
                          </button>

                          <div className="min-w-0 space-y-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span
                                className={`text-xs font-semibold ${
                                  task.is_completed
                                    ? 'line-through text-neutral-400 dark:text-neutral-500'
                                    : 'text-neutral-900 dark:text-neutral-100'
                                }`}
                              >
                                {task.title}
                              </span>
                              {task.subject && (
                                <span className="text-[10px] font-mono px-1.5 py-0.2 rounded-md bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 border border-neutral-200 dark:border-neutral-700">
                                  {task.subject}
                                </span>
                              )}
                              {task.priority === 'high' && (
                                <span className="text-[10px] font-mono px-1.5 py-0.2 rounded-md bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20 font-medium">
                                  Urgente
                                </span>
                              )}
                            </div>

                            {task.description && (
                              <p className="text-[11px] text-neutral-500 leading-relaxed line-clamp-2">
                                {task.description}
                              </p>
                            )}

                            <div className="flex items-center gap-2 text-[10px] font-mono text-neutral-400 dark:text-neutral-500">
                              <span className="flex items-center gap-1">
                                <Calendar className="w-3 h-3" />
                                <span>{task.due_date}</span>
                              </span>
                              {task.due_time && <span>· {task.due_time}</span>}
                            </div>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleDeletePersonalTask(task.id)}
                          title="Eliminar tarea"
                          className="text-neutral-400 hover:text-red-600 dark:hover:text-red-400 p-1 cursor-pointer transition-colors shrink-0"
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
                <div className="p-3.5 rounded-xl bg-neutral-50 dark:bg-neutral-900/40 border border-neutral-200 dark:border-neutral-800 space-y-1">
                  <span className="text-[10px] text-neutral-400 dark:text-neutral-500 font-mono uppercase tracking-wider">
                    Saldo
                  </span>
                  <div className="text-base font-semibold text-neutral-900 dark:text-neutral-100 font-mono">
                    {user.coins.toLocaleString('es-ES')}
                  </div>
                  <span className="text-[11px] text-neutral-500">Fichas disponibles</span>
                </div>

                <div className="p-3.5 rounded-xl bg-neutral-50 dark:bg-neutral-900/40 border border-neutral-200 dark:border-neutral-800 space-y-1">
                  <span className="text-[10px] text-neutral-400 dark:text-neutral-500 font-mono uppercase tracking-wider">
                    Mayor premio
                  </span>
                  <div className="text-base font-semibold text-neutral-900 dark:text-neutral-100 font-mono">
                    {(user.biggest_win || 0).toLocaleString('es-ES')}
                  </div>
                  <span className="text-[11px] text-neutral-500">Récord histórico</span>
                </div>

                <div className="p-3.5 rounded-xl bg-neutral-50 dark:bg-neutral-900/40 border border-neutral-200 dark:border-neutral-800 space-y-1">
                  <span className="text-[10px] text-neutral-400 dark:text-neutral-500 font-mono uppercase tracking-wider">
                    Efectividad
                  </span>
                  <div className="text-base font-semibold text-neutral-900 dark:text-neutral-100 font-mono">
                    {winRate}%
                  </div>
                  <span className="text-[11px] text-neutral-500">{gamesWon} de {totalGames} ganadas</span>
                </div>

                <div className="p-3.5 rounded-xl bg-neutral-50 dark:bg-neutral-900/40 border border-neutral-200 dark:border-neutral-800 space-y-1">
                  <span className="text-[10px] text-neutral-400 dark:text-neutral-500 font-mono uppercase tracking-wider">
                    Racha activa
                  </span>
                  <div className="text-base font-semibold text-amber-600 dark:text-amber-400 font-mono flex items-center gap-1.5">
                    <Flame className="w-4 h-4 text-amber-500" />
                    <span>{user.streak_count || 1} días</span>
                  </div>
                  <span className="text-[11px] text-neutral-500">Asistencia continua</span>
                </div>

                <div className="p-3.5 rounded-xl bg-neutral-50 dark:bg-neutral-900/40 border border-neutral-200 dark:border-neutral-800 space-y-1">
                  <span className="text-[10px] text-neutral-400 dark:text-neutral-500 font-mono uppercase tracking-wider">
                    Rol asignado
                  </span>
                  <div className="text-sm font-semibold text-neutral-900 dark:text-neutral-100 font-mono uppercase">
                    {user.role === 'admin' ? 'Administrador' : user.role === 'delegado' ? 'Delegado' : 'Estudiante'}
                  </div>
                  <span className="text-[11px] text-neutral-500">2º SMR</span>
                </div>

                <div className="p-3.5 rounded-xl bg-neutral-50 dark:bg-neutral-900/40 border border-neutral-200 dark:border-neutral-800 space-y-1">
                  <span className="text-[10px] text-neutral-400 dark:text-neutral-500 font-mono uppercase tracking-wider">
                    Fondo de rescate
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onOpenFaucet();
                    }}
                    className="text-xs font-semibold text-neutral-900 dark:text-neutral-100 underline font-mono flex items-center gap-1 cursor-pointer"
                  >
                    <span>Reclamar</span>
                    <ArrowUpRight className="w-3 h-3 opacity-60" />
                  </button>
                  <span className="text-[11px] text-neutral-500">Recarga diaria</span>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: PREFERENCES */}
          {activeTab === 'preferences' && (
            <div className="space-y-3">
              {/* Theme Preference: Dark / Light / System */}
              <div className="p-4 rounded-xl bg-neutral-50 dark:bg-neutral-900/40 border border-neutral-200 dark:border-neutral-800 space-y-3">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <Palette className="w-4 h-4 text-neutral-700 dark:text-neutral-300" />
                    <span className="text-xs font-semibold text-neutral-900 dark:text-neutral-100">
                      Apariencia de la Interfaz
                    </span>
                  </div>
                  <p className="text-[11px] text-neutral-500">
                    Sincronización con el sistema operativo o selector manual.
                  </p>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => handleSetTheme('light')}
                    className={`min-h-[42px] p-2 rounded-xl border flex flex-col items-center justify-center gap-1 transition-all cursor-pointer active:scale-95 touch-manipulation ${
                      themePreference === 'light'
                        ? 'bg-neutral-900 dark:bg-neutral-100 text-white dark:text-neutral-950 font-semibold border-transparent shadow-xs'
                        : 'bg-white dark:bg-neutral-900 text-neutral-600 dark:text-neutral-400 border-neutral-200 dark:border-neutral-800 hover:text-neutral-900 dark:hover:text-neutral-100'
                    }`}
                  >
                    <Sun className="w-3.5 h-3.5 text-amber-500" />
                    <span className="text-xs">Claro</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleSetTheme('dark')}
                    className={`min-h-[42px] p-2 rounded-xl border flex flex-col items-center justify-center gap-1 transition-all cursor-pointer active:scale-95 touch-manipulation ${
                      themePreference === 'dark'
                        ? 'bg-neutral-900 dark:bg-neutral-100 text-white dark:text-neutral-950 font-semibold border-transparent shadow-xs'
                        : 'bg-white dark:bg-neutral-900 text-neutral-600 dark:text-neutral-400 border-neutral-200 dark:border-neutral-800 hover:text-neutral-900 dark:hover:text-neutral-100'
                    }`}
                  >
                    <Moon className="w-3.5 h-3.5 text-sky-400" />
                    <span className="text-xs">Oscuro</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleSetTheme('system')}
                    className={`min-h-[42px] p-2 rounded-xl border flex flex-col items-center justify-center gap-1 transition-all cursor-pointer active:scale-95 touch-manipulation ${
                      themePreference === 'system'
                        ? 'bg-neutral-900 dark:bg-neutral-100 text-white dark:text-neutral-950 font-semibold border-transparent shadow-xs'
                        : 'bg-white dark:bg-neutral-900 text-neutral-600 dark:text-neutral-400 border-neutral-200 dark:border-neutral-800 hover:text-neutral-900 dark:hover:text-neutral-100'
                    }`}
                  >
                    <Laptop className="w-3.5 h-3.5 text-neutral-400" />
                    <span className="text-xs">Sistema</span>
                  </button>
                </div>
              </div>

              {/* Live Presence Status */}
              <div className="p-3.5 rounded-xl bg-neutral-50 dark:bg-neutral-900/40 border border-neutral-200 dark:border-neutral-800 flex items-center justify-between gap-3">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    <span className="text-xs font-semibold text-neutral-900 dark:text-neutral-100">
                      Conexión en Directo
                    </span>
                  </div>
                  <p className="text-[11px] text-neutral-500">
                    {onlineCount} {onlineCount === 1 ? 'alumno conectado en tiempo real' : 'alumnos conectados en tiempo real'}.
                  </p>
                </div>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 font-medium">
                  En línea
                </span>
              </div>

              {/* Sound Effects */}
              <div className="p-3.5 rounded-xl bg-neutral-50 dark:bg-neutral-900/40 border border-neutral-200 dark:border-neutral-800 flex items-center justify-between gap-3">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    {soundEnabled ? (
                      <Volume2 className="w-4 h-4 text-neutral-700 dark:text-neutral-300" />
                    ) : (
                      <VolumeX className="w-4 h-4 text-neutral-400" />
                    )}
                    <span className="text-xs font-semibold text-neutral-900 dark:text-neutral-100">
                      Efectos Acústicos
                    </span>
                  </div>
                  <p className="text-[11px] text-neutral-500">
                    Sonidos de confirmación, victorias y avisos del timbre.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  {soundEnabled && (
                    <button
                      type="button"
                      onClick={handleTestAudio}
                      title="Probar sonido"
                      className="px-2.5 py-1.5 rounded-lg bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-[11px] text-neutral-600 dark:text-neutral-300 hover:text-neutral-900 dark:hover:text-neutral-100 flex items-center gap-1 cursor-pointer transition-colors"
                    >
                      <Play className="w-3 h-3 text-neutral-500" />
                      <span>Test</span>
                    </button>
                  )}
                  <Button
                    variant="secondary"
                    size="sm"
                    className="rounded-lg text-xs"
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
                <div className="p-3.5 rounded-xl bg-neutral-50 dark:bg-neutral-900/40 border border-neutral-200 dark:border-neutral-800 flex items-center justify-between gap-3">
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      {notificationsEnabled ? (
                        <Bell className="w-4 h-4 text-neutral-700 dark:text-neutral-300" />
                      ) : (
                        <BellOff className="w-4 h-4 text-neutral-400" />
                      )}
                      <span className="text-xs font-semibold text-neutral-900 dark:text-neutral-100">
                        Avisos y Toasts en Pantalla
                      </span>
                    </div>
                    <p className="text-[11px] text-neutral-500">
                      Notificaciones instantáneas de eventos y cambios en el aula.
                    </p>
                  </div>

                  <Button
                    variant={notificationsEnabled ? 'primary' : 'secondary'}
                    size="sm"
                    className="rounded-lg text-xs"
                    onClick={onToggleNotifications}
                  >
                    {notificationsEnabled ? 'Activadas' : 'Desactivadas'}
                  </Button>
                </div>
              )}

              {/* Web Push Background Notifications */}
              {onOpenPushModal && (
                <div className="p-3.5 rounded-xl bg-neutral-50 dark:bg-neutral-900/40 border border-neutral-200 dark:border-neutral-800 flex items-center justify-between gap-3">
                  <div className="space-y-0.5">
                    <span className="text-xs font-semibold text-neutral-900 dark:text-neutral-100">
                      Notificaciones Web Push
                    </span>
                    <p className="text-[11px] text-neutral-500">
                      Recepción de alertas en segundo plano cuando la web no está abierta.
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
              <div className="p-3.5 rounded-xl bg-neutral-50 dark:bg-neutral-900/40 border border-neutral-200 dark:border-neutral-800 flex items-center justify-between gap-3">
                <div className="space-y-0.5">
                  <span className="text-xs font-semibold text-neutral-900 dark:text-neutral-100">
                    Mantener Sesión Activa
                  </span>
                  <p className="text-[11px] text-neutral-500">
                    Conserva la autenticación del usuario en este navegador (365 días).
                  </p>
                </div>

                <Button
                  variant={rememberMe ? 'primary' : 'secondary'}
                  size="sm"
                  className="rounded-lg text-xs"
                  onClick={() => handleToggleRemember(!rememberMe)}
                >
                  {rememberMe ? 'Activada' : 'Desactivada'}
                </Button>
              </div>

              {/* Desktop App Installation */}
              {onOpenInstall && (
                <div className="p-3.5 rounded-xl bg-neutral-50 dark:bg-neutral-900/40 border border-neutral-200 dark:border-neutral-800 flex items-center justify-between gap-3">
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <MonitorDown className="w-4 h-4 text-sky-500" />
                      <span className="text-xs font-semibold text-neutral-900 dark:text-neutral-100">
                        Aplicación de Escritorio
                      </span>
                      <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-sky-500/10 text-sky-600 dark:text-sky-400 border border-sky-500/20 font-semibold">
                        PC / Mac
                      </span>
                    </div>
                    <p className="text-[11px] text-neutral-500">
                      Instala SMR2 como aplicación nativa en Windows, macOS o Linux sin barras del navegador.
                    </p>
                  </div>

                  <Button
                    variant="secondary"
                    size="sm"
                    className="rounded-lg text-xs"
                    onClick={() => {
                      sound.tap();
                      onOpenInstall();
                    }}
                  >
                    Instalar
                  </Button>
                </div>
              )}

              {/* Windows Easter Egg */}
              {onOpenWindowsWelcome && (
                <div className="p-3.5 rounded-xl bg-neutral-50 dark:bg-neutral-900/40 border border-neutral-200 dark:border-neutral-800 flex items-center justify-between gap-3">
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <Monitor className="w-4 h-4 text-neutral-600 dark:text-neutral-400" />
                      <span className="text-xs font-semibold text-neutral-900 dark:text-neutral-100">
                        Pantalla de Inicio Windows
                      </span>
                    </div>
                    <p className="text-[11px] text-neutral-500">
                      Arranque nostálgico con sintonía de bienvenida.
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
                    Reproducir
                  </Button>
                </div>
              )}

              {/* Novedades y Versiones */}
              <div className="p-3.5 rounded-xl bg-neutral-50 dark:bg-neutral-900/40 border border-neutral-200 dark:border-neutral-800 flex items-center justify-between gap-3">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-emerald-500" />
                    <span className="text-xs font-semibold text-neutral-900 dark:text-neutral-100">
                      Novedades y Versiones
                    </span>
                    <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-surface-raised text-foreground font-semibold border border-border">
                      v2.9.0
                    </span>
                  </div>
                  <p className="text-[11px] text-neutral-500">
                    Consulta el historial verídico de cambios y actualizaciones de la web.
                  </p>
                </div>

                <Button
                  variant="secondary"
                  size="sm"
                  className="rounded-lg text-xs"
                  onClick={() => {
                    sound.tap();
                    onClose();
                    window.dispatchEvent(new CustomEvent('smr2_open_changelog'));
                  }}
                >
                  Ver notas
                </Button>
              </div>

              {/* PUTOISAAC Assistant Tour */}
              {onOpenIsaacTour && (
                <div className="p-3.5 rounded-xl bg-neutral-50 dark:bg-neutral-900/40 border border-neutral-200 dark:border-neutral-800 flex items-center justify-between gap-3">
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <MessageSquare className="w-4 h-4 text-neutral-600 dark:text-neutral-400" />
                      <span className="text-xs font-semibold text-neutral-900 dark:text-neutral-100">
                        Guía de Clase PUTOISAAC
                      </span>
                    </div>
                    <p className="text-[11px] text-neutral-500">
                      Recorrido interactivo por las funciones principales de la plataforma.
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
                    Abrir guía
                  </Button>
                </div>
              )}

              {/* Wipe Local Device Data */}
              <div className="p-3.5 rounded-xl bg-red-500/5 dark:bg-red-500/10 border border-red-500/20 flex items-center justify-between gap-3">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <Trash2 className="w-4 h-4 text-red-600 dark:text-red-400" />
                    <span className="text-xs font-semibold text-red-600 dark:text-red-400">
                      Restablecer Datos Locales
                    </span>
                  </div>
                  <p className="text-[11px] text-neutral-500">
                    Borra la caché, credenciales locales y sesiones guardadas en este dispositivo.
                  </p>
                </div>

                <Button
                  variant="danger"
                  size="sm"
                  className="rounded-lg text-xs shrink-0"
                  onClick={() => {
                    if (confirm('¿Restablecer datos locales, caché y cerrar sesiones en este navegador?')) {
                      wipeAllLocalData();
                      window.location.reload();
                    }
                  }}
                >
                  Restablecer
                </Button>
              </div>

              {/* Créditos oficiales */}
              <div className="pt-3 text-center text-[10px] text-neutral-400 dark:text-neutral-600 font-mono">
                Desarrollado por <span className="text-neutral-700 dark:text-neutral-300 font-medium">JuanFe Ospina</span> y <span className="text-neutral-700 dark:text-neutral-300 font-medium">David</span> · 2º SMR
              </div>
            </div>
          )}

          {/* TAB 4: SECURITY */}
          {activeTab === 'security' && (
            <div className="space-y-4">
              <form onSubmit={handleChangePassword} className="space-y-3">
                <div className="space-y-2">
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
                    <div className="p-3 rounded-xl bg-neutral-50 dark:bg-neutral-900/40 border border-neutral-200 dark:border-neutral-800 space-y-2">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-neutral-500 font-mono">Entropía:</span>
                        <span
                          className={`font-semibold font-mono ${
                            newPassReport.score <= 1
                              ? 'text-red-500'
                              : newPassReport.score === 2
                              ? 'text-amber-500'
                              : 'text-emerald-500'
                          }`}
                        >
                          {newPassReport.strengthLabel}
                        </span>
                      </div>

                      <div className="grid grid-cols-4 gap-1 h-1 w-full">
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
                                : 'bg-neutral-200 dark:bg-neutral-800'
                            }`}
                          />
                        ))}
                      </div>

                      <div className="grid grid-cols-2 gap-x-2 gap-y-1 text-[10px] text-neutral-500 font-mono">
                        <div
                          className={`flex items-center gap-1.5 ${
                            newPassReport.criteria.minLength ? 'text-emerald-600 dark:text-emerald-400 font-medium' : ''
                          }`}
                        >
                          <span>{newPassReport.criteria.minLength ? '✓' : '—'}</span>
                          <span>Mín. 8 caracteres</span>
                        </div>
                        <div
                          className={`flex items-center gap-1.5 ${
                            newPassReport.criteria.hasUppercase && newPassReport.criteria.hasLowercase
                              ? 'text-emerald-600 dark:text-emerald-400 font-medium'
                              : ''
                          }`}
                        >
                          <span>{newPassReport.criteria.hasUppercase && newPassReport.criteria.hasLowercase ? '✓' : '—'}</span>
                          <span>Mayús. y minús.</span>
                        </div>
                        <div
                          className={`flex items-center gap-1.5 ${
                            newPassReport.criteria.hasNumber ? 'text-emerald-600 dark:text-emerald-400 font-medium' : ''
                          }`}
                        >
                          <span>{newPassReport.criteria.hasNumber ? '✓' : '—'}</span>
                          <span>Al menos 1 dígito</span>
                        </div>
                        <div
                          className={`flex items-center gap-1.5 ${
                            newPassReport.criteria.hasSpecial ? 'text-emerald-600 dark:text-emerald-400 font-medium' : ''
                          }`}
                        >
                          <span>{newPassReport.criteria.hasSpecial ? '✓' : '—'}</span>
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
                    className={`p-3 rounded-xl text-xs flex items-center gap-2 border font-mono ${
                      passwordMsg.type === 'ok'
                        ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400'
                        : 'bg-red-500/10 border-red-500/20 text-red-600 dark:text-red-400'
                    }`}
                  >
                    {passwordMsg.type === 'ok' ? (
                      <Check className="w-4 h-4 shrink-0" />
                    ) : (
                      <X className="w-4 h-4 shrink-0" />
                    )}
                    <span>{passwordMsg.text}</span>
                  </div>
                )}

                <div className="pt-2 flex justify-end">
                  <Button
                    type="submit"
                    variant="primary"
                    size="md"
                    className="rounded-xl px-5 text-xs font-semibold"
                    isLoading={savingPassword}
                  >
                    Actualizar Credencial
                  </Button>
                </div>
              </form>

              {/* Danger Zone: Logout */}
              <div className="pt-4 border-t border-neutral-200 dark:border-neutral-800/80 flex items-center justify-between">
                <div>
                  <span className="text-xs font-semibold text-red-600 dark:text-red-400">
                    Cerrar Sesión Activa
                  </span>
                  <p className="text-[11px] text-neutral-500">
                    Finaliza la sesión del alumno en este navegador.
                  </p>
                </div>

                <Button
                  variant="danger"
                  size="sm"
                  className="rounded-xl text-xs"
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
