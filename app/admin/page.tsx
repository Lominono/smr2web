'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  RefreshCw,
  Terminal as TerminalIcon,
  RotateCcw,
  LogOut,
  Flame,
  Check,
  Shield,
  ShieldAlert,
  Users,
  Coins,
  Search,
  Filter,
  Download,
  Edit2,
  Trash2,
  Ban,
  UserCheck,
  Crown,
  Sparkles,
  TrendingDown,
  Bell,
  Radio,
  X,
  Volume2,
  VolumeX,
  Layers,
  ArrowUpDown,
  Lock,
  ChevronRight,
} from 'lucide-react';
import { sound } from '@/lib/audio';

interface TerminalLine {
  text: string;
  type?: 'input' | 'output' | 'error' | 'success' | 'system';
}

interface AdminUser {
  id: string;
  username: string;
  email?: string;
  full_name?: string;
  student_number?: string;
  coins: number;
  biggest_win?: number;
  games_played?: number;
  games_won?: number;
  role: 'student' | 'delegado' | 'admin';
  is_banned: boolean;
  ban_reason?: string;
  created_at: string;
}

export default function AdminPage() {
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [adminUser, setAdminUser] = useState<any>(null);
  const [accountInfo, setAccountInfo] = useState<{
    isAuthenticated: boolean;
    id?: string;
    username?: string;
    role?: string;
    isAdmin?: boolean;
  } | null>(null);
  const [viewMode, setViewMode] = useState<'dashboard' | 'terminal'>('dashboard');

  // Dashboard Data State
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<'all' | 'whales' | 'underdogs' | 'banned' | 'staff'>('all');
  const [sortBy, setSortBy] = useState<'coins' | 'username' | 'created_at'>('coins');
  const [sortAsc, setSortAsc] = useState(false);

  // Active Modals State
  const [editingCoinsUser, setEditingCoinsUser] = useState<AdminUser | null>(null);
  const [coinAdjustmentType, setCoinAdjustmentType] = useState<'add' | 'subtract' | 'set'>('add');
  const [coinAmount, setCoinAmount] = useState<string>('10000');
  const [isSubmittingCoins, setIsSubmittingCoins] = useState(false);

  const [banModalUser, setBanModalUser] = useState<AdminUser | null>(null);
  const [banReasonInput, setBanReasonInput] = useState('');
  const [isSubmittingBan, setIsSubmittingBan] = useState(false);

  const [confirmDeleteUser, setConfirmDeleteUser] = useState<AdminUser | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const [actionSuccessMsg, setActionSuccessMsg] = useState<string | null>(null);
  const [actionErrorMsg, setActionErrorMsg] = useState<string | null>(null);

  // Broadcast & Drip State
  const [isTriggeringDrip, setIsTriggeringDrip] = useState(false);
  const [isBroadcastingUpdate, setIsBroadcastingUpdate] = useState(false);

  // Terminal State (Easter Egg)
  const [terminalHistory, setTerminalHistory] = useState<TerminalLine[]>([
    { text: 'SMR2 HARDENED LINUX 6.6.21-X86_64 (ttyS0)', type: 'system' },
    { text: 'Gateway de Auditoría Forense · Acceso autorizado UID=0 (root)', type: 'system' },
    { text: '============================================================', type: 'system' },
    { text: "Escribe 'help' para comandos o 'users' para volcado rápido.", type: 'output' },
  ]);
  const [currentInput, setCurrentInput] = useState('');
  const [isProcessingCmd, setIsProcessingCmd] = useState(false);
  const terminalEndRef = useRef<HTMLDivElement | null>(null);
  const terminalInputRef = useRef<HTMLInputElement | null>(null);

  // Video State
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [hasExploded, setHasExploded] = useState(false);
  const [isGlitching, setIsGlitching] = useState(false);
  const [crashKey, setCrashKey] = useState(0);

  // Verificación inicial de sesión de administrador
  useEffect(() => {
    let isMounted = true;
    async function checkAuth() {
      try {
        const res = await fetch('/api/admin/verify');
        const data = await res.json();
        if (isMounted) {
          if (data?.account) {
            setAccountInfo(data.account);
          }
          if (res.ok && data.authorized) {
            setIsAdmin(true);
            setAdminUser(data.user);
          } else {
            setIsAdmin(false);
          }
        }
      } catch {
        if (isMounted) setIsAdmin(false);
      }
    }
    checkAuth();
    return () => {
      isMounted = false;
    };
  }, []);

  // Cargar lista de usuarios cuando el admin esté verificado
  const fetchUsers = async () => {
    setIsLoadingUsers(true);
    try {
      const res = await fetch('/api/admin/users');
      const data = await res.json();
      if (res.ok && data.success && Array.isArray(data.users)) {
        setUsers(data.users);
      }
    } catch {
      setActionErrorMsg('No se pudo sincronizar la lista de usuarios con la base de datos.');
    } finally {
      setIsLoadingUsers(false);
    }
  };

  useEffect(() => {
    if (isAdmin) {
      fetchUsers();
    }
  }, [isAdmin]);

  // Limpiar mensajes flash tras 4 segundos
  useEffect(() => {
    if (actionSuccessMsg || actionErrorMsg) {
      const timer = setTimeout(() => {
        setActionSuccessMsg(null);
        setActionErrorMsg(null);
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [actionSuccessMsg, actionErrorMsg]);

  // Terminal scroll
  useEffect(() => {
    if (viewMode === 'terminal') {
      terminalEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [terminalHistory, viewMode]);

  // Métricas globales calculadas
  const metrics = useMemo(() => {
    const totalUsers = users.length;
    const totalCoins = users.reduce((acc, u) => acc + (Number(u.coins) || 0), 0);
    const whales = users.filter((u) => (Number(u.coins) || 0) >= 1000000);
    const banned = users.filter((u) => u.is_banned);
    const staff = users.filter((u) => u.role === 'admin' || u.role === 'delegado');
    return {
      totalUsers,
      totalCoins,
      whalesCount: whales.length,
      bannedCount: banned.length,
      staffCount: staff.length,
    };
  }, [users]);

  // Filtrado y ordenación de usuarios
  const filteredUsers = useMemo(() => {
    const cleanSearch = searchTerm.toLowerCase().trim();
    return users
      .filter((u) => {
        // Búsqueda
        if (cleanSearch) {
          const matchUser = u.username?.toLowerCase().includes(cleanSearch);
          const matchName = u.full_name?.toLowerCase().includes(cleanSearch);
          const matchEmail = u.email?.toLowerCase().includes(cleanSearch);
          const matchNia = u.student_number?.toLowerCase().includes(cleanSearch);
          if (!matchUser && !matchName && !matchEmail && !matchNia) return false;
        }

        // Filtro por categoría
        if (roleFilter === 'whales') return (Number(u.coins) || 0) >= 1000000;
        if (roleFilter === 'underdogs') return (Number(u.coins) || 0) < 25000;
        if (roleFilter === 'banned') return u.is_banned;
        if (roleFilter === 'staff') return u.role === 'admin' || u.role === 'delegado';

        return true;
      })
      .sort((a, b) => {
        let diff = 0;
        if (sortBy === 'coins') diff = (Number(b.coins) || 0) - (Number(a.coins) || 0);
        else if (sortBy === 'username') diff = a.username.localeCompare(b.username);
        else if (sortBy === 'created_at') diff = new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        return sortAsc ? -diff : diff;
      });
  }, [users, searchTerm, roleFilter, sortBy, sortAsc]);

  // Acciones sobre usuarios
  const handleAdjustCoinsSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCoinsUser) return;

    const val = parseInt(coinAmount, 10);
    if (isNaN(val) || val < 0) {
      setActionErrorMsg('Introduce una cantidad válida.');
      return;
    }

    let delta = val;
    if (coinAdjustmentType === 'subtract') delta = -val;
    else if (coinAdjustmentType === 'set') delta = val - (editingCoinsUser.coins || 0);

    setIsSubmittingCoins(true);
    try {
      const res = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'adjust_coins',
          targetUserId: editingCoinsUser.id,
          amount: delta,
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        sound.toastClink();
        setActionSuccessMsg(`Saldo de @${editingCoinsUser.username} actualizado a ${data.newCoins?.toLocaleString()} monedas.`);
        setEditingCoinsUser(null);
        fetchUsers();
      } else {
        setActionErrorMsg(data.error || 'Error al ajustar monedas.');
      }
    } catch {
      setActionErrorMsg('Error de red al actualizar saldo.');
    } finally {
      setIsSubmittingCoins(false);
    }
  };

  const handleToggleBan = async (user: AdminUser) => {
    if (!user.is_banned) {
      setBanModalUser(user);
      setBanReasonInput('');
      return;
    }

    // Si ya está baneado, reactivarlo directamente
    try {
      const res = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'unban',
          targetUserId: user.id,
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        sound.tap();
        setActionSuccessMsg(`Cuenta de @${user.username} reactivada correctamente.`);
        fetchUsers();
      } else {
        setActionErrorMsg(data.error || 'Error al reactivar cuenta.');
      }
    } catch {
      setActionErrorMsg('Error de red al reactivar cuenta.');
    }
  };

  const handleConfirmBanSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!banModalUser) return;

    setIsSubmittingBan(true);
    try {
      const res = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'ban',
          targetUserId: banModalUser.id,
          banReason: banReasonInput.trim() || 'Suspensión administrativa del aula',
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        sound.impact(0.8);
        setActionSuccessMsg(`Usuario @${banModalUser.username} suspendido temporalmente.`);
        setBanModalUser(null);
        fetchUsers();
      } else {
        setActionErrorMsg(data.error || 'Error al suspender usuario.');
      }
    } catch {
      setActionErrorMsg('Error de conexión al suspender usuario.');
    } finally {
      setIsSubmittingBan(false);
    }
  };

  const handleChangeRole = async (user: AdminUser, newRole: 'student' | 'delegado' | 'admin') => {
    if (user.role === newRole) return;
    try {
      const res = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'set_role',
          targetUserId: user.id,
          role: newRole,
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        sound.tap();
        setActionSuccessMsg(`Rol de @${user.username} cambiado a ${newRole.toUpperCase()}.`);
        fetchUsers();
      } else {
        setActionErrorMsg(data.error || 'Error al cambiar rol.');
      }
    } catch {
      setActionErrorMsg('Error de red al cambiar rol.');
    }
  };

  const handleResetBotellon = async (user: AdminUser) => {
    const confirmPrompt = window.confirm(
      `¿Restablecer el progreso de El Botellón de @${user.username}?\n\nSe vaciarán sus suministros, niveles y se reiniciará su saldo a 1.000 monedas.`
    );
    if (!confirmPrompt) return;

    try {
      const res = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'reset_botellon',
          targetUserId: user.id,
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        sound.impact(0.5);
        setActionSuccessMsg(`Botellón de @${user.username} restablecido.`);
        fetchUsers();
      } else {
        setActionErrorMsg(data.error || 'Error al restablecer Botellón.');
      }
    } catch {
      setActionErrorMsg('Error al conectar con el servidor.');
    }
  };

  const handleDeleteUserSubmit = async () => {
    if (!confirmDeleteUser) return;
    setIsDeleting(true);
    try {
      const res = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'delete_user',
          targetUserId: confirmDeleteUser.id,
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        sound.impact(1.2);
        setActionSuccessMsg(`Usuario @${confirmDeleteUser.username} eliminado de forma definitiva.`);
        setConfirmDeleteUser(null);
        fetchUsers();
      } else {
        setActionErrorMsg(data.error || 'Error al eliminar usuario.');
      }
    } catch {
      setActionErrorMsg('Error de red al eliminar usuario.');
    } finally {
      setIsDeleting(false);
    }
  };

  // Goteo Comunista Global
  const handleTriggerCommunistDrip = async () => {
    const confirmDrip = window.confirm(
      '¿Ejecutar ciclo de Goteo Comunista?\n\nSe aplicará una tasa de solidaridad progresiva (1% a 4%) sobre todas las cuentas con más de 100.000 monedas y se transferirá al fondo común de la clase.'
    );
    if (!confirmDrip) return;

    setIsTriggeringDrip(true);
    try {
      const res = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'communist_drip_all' }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        sound.toastClink();
        setActionSuccessMsg(data.message || 'Ciclo de Goteo Comunista ejecutado con éxito.');
        fetchUsers();
      } else {
        setActionErrorMsg(data.error || 'Error al ejecutar Goteo Comunista.');
      }
    } catch {
      setActionErrorMsg('Error de red al aplicar tasa comunista.');
    } finally {
      setIsTriggeringDrip(false);
    }
  };

  // Difundir actualización en vivo a todos los clientes
  const handleBroadcastUpdate = async () => {
    setIsBroadcastingUpdate(true);
    try {
      const res = await fetch('/api/version', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ newVersion: '1.2.0' }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        sound.toastClink();
        setActionSuccessMsg('¡Señal de actualización emitida! Todos los clientes verán el aviso y recargarán limpio.');
      } else {
        setActionErrorMsg(data.error || 'Error al emitir actualización.');
      }
    } catch {
      setActionErrorMsg('Error de red al emitir aviso de versión.');
    } finally {
      setIsBroadcastingUpdate(false);
    }
  };

  // Cerrar sesión root
  const handleAdminLogout = async () => {
    try {
      await fetch('/api/admin/logout', { method: 'POST' });
    } catch {}
    setIsAdmin(false);
  };

  // Terminal Handler (Consola Forense)
  const handleTerminalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const rawCmd = currentInput.trim();
    if (!rawCmd || isProcessingCmd) return;

    setCurrentInput('');
    const newHistory: TerminalLine[] = [
      ...terminalHistory,
      { text: `root@smr2-srv:~# ${rawCmd}`, type: 'input' },
    ];

    const lower = rawCmd.toLowerCase();
    const parts = rawCmd.split(/\s+/);
    const cmd = parts[0]?.toLowerCase();

    if (lower === 'help') {
      newHistory.push(
        { text: 'COMANDOS ROOT DISPONIBLES:', type: 'system' },
        { text: '  users                 - Listar total de alumnos y saldo en consola', type: 'output' },
        { text: '  drip                  - Ejecutar ciclo forzado de Goteo Comunista', type: 'output' },
        { text: '  version               - Consultar versión y timestamp del servidor', type: 'output' },
        { text: '  troll                 - Reproducir vídeo troll y ejecutar colapso', type: 'output' },
        { text: '  clear                 - Limpiar pantalla de consola', type: 'output' },
        { text: '  gui                   - Volver al panel de control gráfico', type: 'success' }
      );
    } else if (lower === 'gui') {
      setViewMode('dashboard');
      return;
    } else if (lower === 'clear' || lower === 'cls') {
      setTerminalHistory([{ text: 'Consola reiniciada.', type: 'system' }]);
      return;
    } else if (lower === 'users') {
      newHistory.push({ text: `Total alumnos registrados: ${users.length}`, type: 'system' });
      users.slice(0, 10).forEach((u) => {
        newHistory.push({
          text: `• @${u.username} (${u.role}) - ${u.coins.toLocaleString()} monedas [${u.is_banned ? 'BANEADO' : 'ACTIVO'}]`,
          type: 'output',
        });
      });
      if (users.length > 10) newHistory.push({ text: `...y ${users.length - 10} alumnos más. Ver panel GUI.`, type: 'output' });
    } else if (lower === 'drip') {
      newHistory.push({ text: '[*] Lanzando recaudación de solidaridad proletaria...', type: 'system' });
      await handleTriggerCommunistDrip();
      newHistory.push({ text: '[+] Goteo comunista procesado.', type: 'success' });
    } else if (lower === 'troll') {
      setViewMode('terminal');
      if (videoRef.current) {
        videoRef.current.currentTime = 0;
        videoRef.current.play().catch(() => {});
      }
    } else {
      newHistory.push({ text: `bash: ${cmd}: orden no encontrada. Escribe 'help' o 'gui'.`, type: 'error' });
    }

    setTerminalHistory(newHistory);
  };

  // Pantalla de carga
  if (isAdmin === null) {
    return (
      <div className="min-h-screen bg-[#09090b] text-neutral-400 flex items-center justify-center font-mono text-xs">
        <div className="flex items-center gap-2.5">
          <RefreshCw className="w-4 h-4 animate-spin text-neutral-300" />
          <span>Verificando permisos de administración...</span>
        </div>
      </div>
    );
  }

  // Pantalla de acceso denegado / Login con PIN de Administrador
  if (!isAdmin) {
    return <AdminLoginGate account={accountInfo} onAuthSuccess={() => setIsAdmin(true)} />;
  }

  // ==============================================================
  // PANTALLA PRINCIPAL: PANEL DE CONTROL DE ADMINISTRADOR
  // ==============================================================
  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 flex flex-col font-sans antialiased selection:bg-neutral-800">
      {/* Toast de notificaciones de acción */}
      {actionSuccessMsg && (
        <div className="fixed top-4 right-4 z-[9999] p-3.5 px-4 rounded-xl bg-emerald-950/90 border border-emerald-500/40 text-emerald-200 text-xs shadow-2xl flex items-center gap-2.5 animate-in slide-in-from-top-3">
          <Check className="w-4 h-4 text-emerald-400 shrink-0" />
          <span className="font-medium">{actionSuccessMsg}</span>
        </div>
      )}
      {actionErrorMsg && (
        <div className="fixed top-4 right-4 z-[9999] p-3.5 px-4 rounded-xl bg-red-950/90 border border-red-500/40 text-red-200 text-xs shadow-2xl flex items-center gap-2.5 animate-in slide-in-from-top-3">
          <ShieldAlert className="w-4 h-4 text-red-400 shrink-0" />
          <span className="font-medium">{actionErrorMsg}</span>
        </div>
      )}

      {/* Header Superior del Panel */}
      <header className="sticky top-0 z-40 bg-neutral-950/90 backdrop-blur-md border-b border-neutral-900 px-4 sm:px-8 py-3.5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link
            href="/"
            className="p-1.5 rounded-lg border border-neutral-800 text-neutral-400 hover:text-white hover:bg-neutral-900 transition-colors cursor-pointer"
            title="Volver al portal"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>

          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-white uppercase tracking-wider font-mono">
                SMR2 · Centro de Control
              </span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-semibold">
                ROOT ACTIVO
              </span>
            </div>
            <p className="text-[11px] text-neutral-500 hidden sm:block">
              Gestión de alumnos, balance económico, goteo comunista y difusión global
            </p>
          </div>
        </div>

        {/* Controles de vista y sesión */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setViewMode(viewMode === 'dashboard' ? 'terminal' : 'dashboard')}
            className={`px-3 py-1.5 rounded-xl text-xs font-mono flex items-center gap-1.5 border transition-all cursor-pointer ${
              viewMode === 'terminal'
                ? 'bg-neutral-800 border-neutral-700 text-white font-semibold'
                : 'border-neutral-800 text-neutral-400 hover:text-white hover:bg-neutral-900'
            }`}
          >
            <TerminalIcon className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">{viewMode === 'terminal' ? 'Modo GUI' : 'Modo Terminal / CTF'}</span>
          </button>

          <button
            type="button"
            onClick={handleAdminLogout}
            className="p-1.5 sm:px-3 sm:py-1.5 rounded-xl border border-red-500/20 text-red-400 hover:bg-red-950/30 text-xs font-medium transition-colors cursor-pointer flex items-center gap-1.5"
            title="Cerrar sesión de administrador"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Salir</span>
          </button>
        </div>
      </header>

      {/* Contenido Principal */}
      <main className="flex-1 p-4 sm:p-8 max-w-7xl w-full mx-auto space-y-6">
        {viewMode === 'terminal' ? (
          /* MODO TERMINAL FORENSE & EASTER EGG */
          <div className="rounded-2xl border border-neutral-900 bg-neutral-950 p-4 sm:p-6 shadow-2xl flex flex-col space-y-3 min-h-[500px]">
            <div className="flex items-center justify-between border-b border-neutral-900 pb-3 text-xs text-neutral-500 font-mono">
              <span>root@smr2-srv (Gateway de Auditoría SMR2)</span>
              <button
                type="button"
                onClick={() => setViewMode('dashboard')}
                className="text-emerald-400 hover:underline cursor-pointer"
              >
                Volver a interfaz gráfica (GUI)
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-1.5 font-mono text-xs leading-relaxed max-h-[60vh]">
              {terminalHistory.map((item, idx) => (
                <div
                  key={idx}
                  className={`${
                    item.type === 'input'
                      ? 'text-white font-bold'
                      : item.type === 'error'
                      ? 'text-red-400'
                      : item.type === 'success'
                      ? 'text-emerald-400'
                      : item.type === 'system'
                      ? 'text-neutral-500'
                      : 'text-neutral-300'
                  }`}
                >
                  {item.text}
                </div>
              ))}
              <div ref={terminalEndRef} />
            </div>

            <form onSubmit={handleTerminalSubmit} className="pt-2 flex items-center gap-2 border-t border-neutral-900 font-mono text-xs">
              <span className="text-emerald-400 font-bold select-none">root@smr2-srv:~#</span>
              <input
                ref={terminalInputRef}
                type="text"
                value={currentInput}
                onChange={(e) => setCurrentInput(e.target.value)}
                placeholder="Escribe 'help', 'users', 'drip', 'gui'..."
                className="flex-1 bg-transparent border-none outline-none text-white placeholder-neutral-700"
                autoFocus
              />
            </form>
          </div>
        ) : (
          /* MODO DASHBOARD COMPLETO */
          <>
            {/* 1. Tarjetas de Métricas Principales */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
              <div className="p-4 rounded-2xl bg-neutral-900/60 border border-neutral-800/80 shadow-xs flex flex-col justify-between">
                <div className="flex items-center justify-between text-neutral-400 text-xs font-mono">
                  <span>Total Alumnos</span>
                  <Users className="w-4 h-4 text-neutral-400" />
                </div>
                <div className="mt-2">
                  <div className="text-2xl sm:text-3xl font-bold font-mono text-white">
                    {metrics.totalUsers}
                  </div>
                  <div className="text-[11px] text-neutral-500 mt-0.5">
                    {metrics.staffCount} delegados / admins
                  </div>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-neutral-900/60 border border-neutral-800/80 shadow-xs flex flex-col justify-between">
                <div className="flex items-center justify-between text-neutral-400 text-xs font-mono">
                  <span>Masa Monetaria</span>
                  <Coins className="w-4 h-4 text-amber-400" />
                </div>
                <div className="mt-2">
                  <div className="text-2xl sm:text-3xl font-bold font-mono text-amber-400 truncate">
                    {metrics.totalCoins.toLocaleString()}
                  </div>
                  <div className="text-[11px] text-neutral-500 mt-0.5">Fichas en circulación</div>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-neutral-900/60 border border-neutral-800/80 shadow-xs flex flex-col justify-between">
                <div className="flex items-center justify-between text-neutral-400 text-xs font-mono">
                  <span>Grandes Fortunas</span>
                  <Crown className="w-4 h-4 text-purple-400" />
                </div>
                <div className="mt-2">
                  <div className="text-2xl sm:text-3xl font-bold font-mono text-purple-300">
                    {metrics.whalesCount}
                  </div>
                  <div className="text-[11px] text-neutral-500 mt-0.5">&gt;1M monedas (Sujetos a tasa)</div>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-neutral-900/60 border border-neutral-800/80 shadow-xs flex flex-col justify-between">
                <div className="flex items-center justify-between text-neutral-400 text-xs font-mono">
                  <span>Suspendidos</span>
                  <Ban className="w-4 h-4 text-red-400" />
                </div>
                <div className="mt-2">
                  <div className="text-2xl sm:text-3xl font-bold font-mono text-red-400">
                    {metrics.bannedCount}
                  </div>
                  <div className="text-[11px] text-neutral-500 mt-0.5">Cuentas con acceso bloqueado</div>
                </div>
              </div>
            </div>

            {/* 2. Barra de Herramientas de Intervención: Goteo Comunista & Actualizaciones */}
            <div className="p-4 sm:p-5 rounded-2xl bg-neutral-900/50 border border-neutral-800/80 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-white uppercase tracking-wider font-mono">
                    Intervención Económica & Comunicaciones
                  </span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20 font-semibold">
                    v1.2.0
                  </span>
                </div>
                <p className="text-xs text-neutral-400">
                  Drena fortunas ociosas de las ballenas hacia la clase o fuerza recarga limpia en todos los ordenadores.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2.5">
                <button
                  type="button"
                  disabled={isTriggeringDrip}
                  onClick={handleTriggerCommunistDrip}
                  className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-red-950/40 text-red-300 border border-red-500/40 hover:bg-red-900/40 transition-colors flex items-center gap-2 cursor-pointer disabled:opacity-50"
                  title="Aplica una tasa progresiva del 1% al 4% sobre las cuentas millonarias para nutrir el fondo de clase"
                >
                  <TrendingDown className="w-4 h-4 text-red-400" />
                  <span>{isTriggeringDrip ? 'Aplicando tasa...' : 'Ejecutar Goteo Comunista'}</span>
                </button>

                <button
                  type="button"
                  disabled={isBroadcastingUpdate}
                  onClick={handleBroadcastUpdate}
                  className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-blue-950/40 text-blue-300 border border-blue-500/40 hover:bg-blue-900/40 transition-colors flex items-center gap-2 cursor-pointer disabled:opacity-50"
                  title="Fuerza un aviso en todas las pestañas abiertas de los alumnos para que actualicen al instante"
                >
                  <Radio className="w-4 h-4 text-blue-400" />
                  <span>{isBroadcastingUpdate ? 'Emitiendo...' : 'Forzar Actualización Global'}</span>
                </button>

                <a
                  href="/api/admin/users?format=csv"
                  download
                  className="px-3.5 py-2 rounded-xl text-xs font-medium border border-neutral-700 bg-neutral-900 hover:bg-neutral-800 text-neutral-200 transition-colors flex items-center gap-2 cursor-pointer"
                  title="Descargar archivo CSV oficial con todos los alumnos, correos y saldos"
                >
                  <Download className="w-4 h-4 text-neutral-400" />
                  <span>Exportar CSV</span>
                </a>
              </div>
            </div>

            {/* 3. Panel de Búsqueda y Filtros de Alumnos */}
            <div className="space-y-3">
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                {/* Buscador */}
                <div className="relative flex-1 max-w-md">
                  <Search className="w-4 h-4 text-neutral-500 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Buscar por usuario, nombre, NIA o email..."
                    className="w-full pl-9 pr-3 py-2 rounded-xl bg-neutral-900/80 border border-neutral-800 text-xs text-white placeholder-neutral-600 focus:outline-none focus:border-neutral-600 transition-colors"
                  />
                  {searchTerm && (
                    <button
                      type="button"
                      onClick={() => setSearchTerm('')}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-neutral-500 hover:text-white"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {/* Filtros por pestaña rápida */}
                <div className="flex items-center gap-1 overflow-x-auto scrollbar-none p-1 rounded-xl bg-neutral-900/60 border border-neutral-800 text-xs">
                  {[
                    { id: 'all', label: `Todos (${users.length})` },
                    { id: 'whales', label: `Ballenas (${metrics.whalesCount})` },
                    { id: 'underdogs', label: 'Novatos (<25k)' },
                    { id: 'banned', label: `Suspendidos (${metrics.bannedCount})` },
                    { id: 'staff', label: `Staff (${metrics.staffCount})` },
                  ].map((filter) => (
                    <button
                      key={filter.id}
                      type="button"
                      onClick={() => setRoleFilter(filter.id as any)}
                      className={`px-3 py-1.5 rounded-lg whitespace-nowrap cursor-pointer transition-all ${
                        roleFilter === filter.id
                          ? 'bg-neutral-800 text-white font-semibold shadow-xs'
                          : 'text-neutral-400 hover:text-neutral-200'
                      }`}
                    >
                      {filter.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* 4. Tabla de Usuarios y Acciones Administrativas */}
              <div className="rounded-2xl border border-neutral-800/80 bg-neutral-900/40 overflow-hidden shadow-xl">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-neutral-900/80 text-neutral-400 font-mono uppercase text-[10px] tracking-wider border-b border-neutral-800">
                      <tr>
                        <th className="py-3 px-4">Alumno</th>
                        <th className="py-3 px-4">NIA / Correo</th>
                        <th
                          className="py-3 px-4 cursor-pointer hover:text-white transition-colors"
                          onClick={() => {
                            if (sortBy === 'coins') setSortAsc(!sortAsc);
                            else {
                              setSortBy('coins');
                              setSortAsc(false);
                            }
                          }}
                        >
                          <div className="flex items-center gap-1.5">
                            <span>Saldo Monedas</span>
                            <ArrowUpDown className="w-3 h-3" />
                          </div>
                        </th>
                        <th className="py-3 px-4">Rol</th>
                        <th className="py-3 px-4">Estado</th>
                        <th className="py-3 px-4 text-right">Acciones</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-900 text-neutral-300">
                      {isLoadingUsers ? (
                        <tr>
                          <td colSpan={6} className="py-12 text-center text-neutral-500 font-mono">
                            <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-neutral-400" />
                            Cargando censo de alumnos desde Supabase...
                          </td>
                        </tr>
                      ) : filteredUsers.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="py-10 text-center text-neutral-500 font-mono">
                            No se encontraron alumnos que coincidan con la búsqueda.
                          </td>
                        </tr>
                      ) : (
                        filteredUsers.map((u) => {
                          const isWhale = (Number(u.coins) || 0) >= 1000000;
                          return (
                            <tr
                              key={u.id}
                              className={`hover:bg-neutral-900/50 transition-colors ${
                                u.is_banned ? 'bg-red-950/10' : ''
                              }`}
                            >
                              {/* Alumno */}
                              <td className="py-3 px-4">
                                <div className="flex items-center gap-2.5">
                                  <div className="w-8 h-8 rounded-xl bg-neutral-800 border border-neutral-700/60 flex items-center justify-center font-bold font-mono text-white text-xs shrink-0">
                                    {u.username.slice(0, 2).toUpperCase()}
                                  </div>
                                  <div className="min-w-0">
                                    <div className="font-semibold text-white flex items-center gap-1.5 truncate">
                                      <span>@{u.username}</span>
                                      {isWhale && (
                                        <span title="Gran Fortuna de clase">
                                          <Crown className="w-3.5 h-3.5 text-purple-400 shrink-0" />
                                        </span>
                                      )}
                                    </div>
                                    <div className="text-[11px] text-neutral-500 truncate">
                                      {u.full_name || 'Nombre no configurado'}
                                    </div>
                                  </div>
                                </div>
                              </td>

                              {/* NIA / Correo */}
                              <td className="py-3 px-4 font-mono text-neutral-400">
                                <div className="truncate text-neutral-300 font-medium">{u.email || '—'}</div>
                                <div className="text-[10px] text-neutral-500">{u.student_number ? `NIA: ${u.student_number}` : 'Sin NIA'}</div>
                              </td>

                              {/* Saldo Monedas */}
                              <td className="py-3 px-4">
                                <div className="flex items-center gap-2">
                                  <span className={`font-mono font-bold ${isWhale ? 'text-purple-300' : 'text-amber-400'}`}>
                                    {(Number(u.coins) || 0).toLocaleString()}
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setEditingCoinsUser(u);
                                      setCoinAmount('10000');
                                      setCoinAdjustmentType('add');
                                    }}
                                    className="p-1 rounded bg-neutral-800 hover:bg-neutral-700 text-neutral-400 hover:text-white transition-colors cursor-pointer"
                                    title="Modificar saldo"
                                  >
                                    <Edit2 className="w-3 h-3" />
                                  </button>
                                </div>
                              </td>

                              {/* Rol */}
                              <td className="py-3 px-4">
                                <select
                                  value={u.role || 'student'}
                                  onChange={(e) => handleChangeRole(u, e.target.value as any)}
                                  className="bg-neutral-900 border border-neutral-800 text-[11px] font-mono rounded-lg px-2 py-1 text-white focus:outline-none focus:border-neutral-600 cursor-pointer"
                                >
                                  <option value="student">student (Alumno)</option>
                                  <option value="delegado">delegado</option>
                                  <option value="admin">admin (Root)</option>
                                </select>
                              </td>

                              {/* Estado */}
                              <td className="py-3 px-4">
                                {u.is_banned ? (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono font-semibold bg-red-500/20 text-red-400 border border-red-500/30">
                                    <Ban className="w-3 h-3" />
                                    <span>Suspendido</span>
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono font-semibold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                                    <Check className="w-3 h-3" />
                                    <span>Activo</span>
                                  </span>
                                )}
                              </td>

                              {/* Acciones */}
                              <td className="py-3 px-4 text-right">
                                <div className="flex items-center justify-end gap-1.5">
                                  {/* Suspender / Reactivar */}
                                  <button
                                    type="button"
                                    onClick={() => handleToggleBan(u)}
                                    className={`p-1.5 rounded-lg border transition-colors cursor-pointer text-xs ${
                                      u.is_banned
                                        ? 'border-emerald-500/30 text-emerald-400 hover:bg-emerald-950/40'
                                        : 'border-neutral-800 text-neutral-400 hover:text-red-400 hover:bg-red-950/20'
                                    }`}
                                    title={u.is_banned ? 'Reactivar cuenta' : 'Suspender acceso'}
                                  >
                                    {u.is_banned ? <UserCheck className="w-3.5 h-3.5" /> : <Ban className="w-3.5 h-3.5" />}
                                  </button>

                                  {/* Restablecer Botellón */}
                                  <button
                                    type="button"
                                    onClick={() => handleResetBotellon(u)}
                                    className="p-1.5 rounded-lg border border-neutral-800 text-neutral-400 hover:text-amber-400 hover:bg-amber-950/20 transition-colors cursor-pointer"
                                    title="Restablecer progreso de El Botellón a valores iniciales"
                                  >
                                    <RotateCcw className="w-3.5 h-3.5" />
                                  </button>

                                  {/* Borrar cuenta */}
                                  <button
                                    type="button"
                                    onClick={() => setConfirmDeleteUser(u)}
                                    className="p-1.5 rounded-lg border border-neutral-800 text-neutral-400 hover:text-red-500 hover:bg-red-950/30 transition-colors cursor-pointer"
                                    title="Eliminar usuario definitivamente"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </>
        )}
      </main>

      {/* Modal 1: Ajuste de Saldo de Monedas */}
      {editingCoinsUser && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in select-none"
        >
          <div className="w-full max-w-sm rounded-2xl bg-neutral-950 border border-neutral-800 p-5 space-y-4 shadow-2xl text-xs">
            <div className="flex items-center justify-between border-b border-neutral-900 pb-2.5">
              <div>
                <h3 className="font-bold text-white text-sm">Modificar Monedas</h3>
                <p className="text-neutral-500 text-[11px]">
                  @{editingCoinsUser.username} (Saldo actual: {(editingCoinsUser.coins || 0).toLocaleString()})
                </p>
              </div>
              <button
                type="button"
                onClick={() => setEditingCoinsUser(null)}
                className="text-neutral-500 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAdjustCoinsSubmit} className="space-y-3">
              <div className="grid grid-cols-3 gap-1.5 p-1 rounded-xl bg-neutral-900 border border-neutral-800 font-medium">
                <button
                  type="button"
                  onClick={() => setCoinAdjustmentType('add')}
                  className={`py-1.5 rounded-lg text-center cursor-pointer ${
                    coinAdjustmentType === 'add' ? 'bg-neutral-800 text-emerald-400 font-bold' : 'text-neutral-400'
                  }`}
                >
                  + Sumar
                </button>
                <button
                  type="button"
                  onClick={() => setCoinAdjustmentType('subtract')}
                  className={`py-1.5 rounded-lg text-center cursor-pointer ${
                    coinAdjustmentType === 'subtract' ? 'bg-neutral-800 text-red-400 font-bold' : 'text-neutral-400'
                  }`}
                >
                  - Restar
                </button>
                <button
                  type="button"
                  onClick={() => setCoinAdjustmentType('set')}
                  className={`py-1.5 rounded-lg text-center cursor-pointer ${
                    coinAdjustmentType === 'set' ? 'bg-neutral-800 text-blue-400 font-bold' : 'text-neutral-400'
                  }`}
                >
                  = Fijar
                </button>
              </div>

              <div>
                <label className="block text-neutral-400 text-[11px] mb-1 font-mono">
                  Cantidad de monedas:
                </label>
                <input
                  type="number"
                  min="0"
                  value={coinAmount}
                  onChange={(e) => setCoinAmount(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-neutral-900 border border-neutral-800 text-white font-mono text-sm focus:outline-none focus:border-neutral-600"
                  autoFocus
                />
              </div>

              {/* Botones de sugerencia rápida */}
              <div className="flex flex-wrap gap-1.5 text-[10px] text-neutral-400">
                {[1000, 10000, 100000, 1000000].map((quick) => (
                  <button
                    key={quick}
                    type="button"
                    onClick={() => setCoinAmount(String(quick))}
                    className="px-2 py-0.5 rounded bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 cursor-pointer font-mono"
                  >
                    +{quick.toLocaleString()}
                  </button>
                ))}
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-neutral-900">
                <button
                  type="button"
                  onClick={() => setEditingCoinsUser(null)}
                  className="px-3 py-1.5 rounded-xl border border-neutral-800 text-neutral-400 hover:text-white cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingCoins}
                  className="px-4 py-1.5 rounded-xl bg-white hover:bg-neutral-200 text-black font-semibold cursor-pointer disabled:opacity-50"
                >
                  {isSubmittingCoins ? 'Guardando...' : 'Aplicar Saldo'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal 2: Suspender Cuenta */}
      {banModalUser && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in select-none"
        >
          <div className="w-full max-w-sm rounded-2xl bg-neutral-950 border border-red-500/40 p-5 space-y-4 shadow-2xl text-xs">
            <div className="flex items-center justify-between border-b border-neutral-900 pb-2.5">
              <div className="flex items-center gap-2 text-red-400 font-bold text-sm">
                <Ban className="w-4 h-4" />
                <span>Suspender @{banModalUser.username}</span>
              </div>
              <button
                type="button"
                onClick={() => setBanModalUser(null)}
                className="text-neutral-500 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleConfirmBanSubmit} className="space-y-3">
              <div>
                <label className="block text-neutral-400 text-[11px] mb-1">
                  Motivo de la suspensión:
                </label>
                <textarea
                  value={banReasonInput}
                  onChange={(e) => setBanReasonInput(e.target.value)}
                  placeholder="Ej: Trampas en el minijuego, uso de macros o comportamiento tóxico..."
                  rows={3}
                  className="w-full px-3 py-2 rounded-xl bg-neutral-900 border border-neutral-800 text-white text-xs focus:outline-none focus:border-neutral-600 resize-none"
                  autoFocus
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-neutral-900">
                <button
                  type="button"
                  onClick={() => setBanModalUser(null)}
                  className="px-3 py-1.5 rounded-xl border border-neutral-800 text-neutral-400 hover:text-white cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingBan}
                  className="px-4 py-1.5 rounded-xl bg-red-600 hover:bg-red-500 text-white font-semibold cursor-pointer disabled:opacity-50"
                >
                  {isSubmittingBan ? 'Suspendiendo...' : 'Confirmar Suspensión'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal 3: Confirmación de Eliminación Definitiva */}
      {confirmDeleteUser && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in select-none"
        >
          <div className="w-full max-w-sm rounded-2xl bg-neutral-950 border border-red-500/60 p-5 space-y-4 shadow-2xl text-xs">
            <div className="flex items-center gap-2 text-red-400 font-bold text-sm">
              <ShieldAlert className="w-4 h-4" />
              <span>¿Eliminar a @{confirmDeleteUser.username}?</span>
            </div>

            <p className="text-neutral-400 leading-relaxed text-[11px]">
              Esta acción es irreversible. Se eliminará el perfil, progreso en El Botellón, eventos y acceso en Supabase Auth de forma permanente.
            </p>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-neutral-900">
              <button
                type="button"
                onClick={() => setConfirmDeleteUser(null)}
                className="px-3 py-1.5 rounded-xl border border-neutral-800 text-neutral-400 hover:text-white cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={isDeleting}
                onClick={handleDeleteUserSubmit}
                className="px-4 py-1.5 rounded-xl bg-red-600 hover:bg-red-500 text-white font-semibold cursor-pointer disabled:opacity-50"
              >
                {isDeleting ? 'Eliminando...' : 'Eliminar Permanentemente'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Componente de seguridad: Gateway de acceso administrativo con doble factor
 * 1. Exige estar autenticado con la cuenta oficial de administrador (@juanfe).
 * 2. Si no es admin, bloquea totalmente la interfaz sin mostrar formulario de contraseña.
 * 3. Si es admin, exige elevar privilegios introduciendo la contraseña de cuenta o clave maestra.
 */
function AdminLoginGate({
  account,
  onAuthSuccess,
}: {
  account: {
    isAuthenticated: boolean;
    id?: string;
    username?: string;
    role?: string;
    isAdmin?: boolean;
  } | null;
  onAuthSuccess: () => void;
}) {
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const clean = password.trim();
    if (!clean || isLoading) return;

    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/claim', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: clean }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        sound.toastClink();
        onAuthSuccess();
      } else {
        setError(data.error || 'Contraseña de administrador incorrecta.');
      }
    } catch {
      setError('Error de comunicación con el gateway de seguridad.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-neutral-950 text-white flex flex-col justify-center items-center p-4 font-mono antialiased">
      <div className="w-full max-w-sm p-6 rounded-2xl bg-neutral-900/80 border border-neutral-800 shadow-2xl space-y-4">
        {/* Encabezado común */}
        <div className="flex items-center justify-between text-xs pb-3 border-b border-neutral-800/80">
          <div className="flex items-center gap-2 text-neutral-400">
            <Lock className="w-4 h-4 text-emerald-400" />
            <span className="font-bold text-white uppercase tracking-wider text-[11px]">SMR2 · Gateway Root</span>
          </div>
          <span className="text-[10px] text-neutral-500 font-mono">Aula 35</span>
        </div>

        {/* CASO 1: Cargando estado de la cuenta */}
        {account === null && (
          <div className="py-8 flex flex-col items-center justify-center gap-2 text-xs text-neutral-500">
            <RefreshCw className="w-4 h-4 animate-spin text-neutral-400" />
            <span>Verificando identidad de sesión...</span>
          </div>
        )}

        {/* CASO 2: Visitante no autenticado en el portal */}
        {account !== null && !account.isAuthenticated && (
          <div className="space-y-4 text-center py-2">
            <div className="w-12 h-12 mx-auto rounded-2xl bg-amber-950/40 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <ShieldAlert className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white">Sesión no iniciada</h2>
              <p className="text-xs text-neutral-400 mt-1 leading-relaxed">
                Para acceder a las herramientas de administración debes iniciar sesión previamente con la cuenta oficial en el portal.
              </p>
            </div>
            <Link
              href="/"
              className="w-full py-2.5 rounded-xl bg-white text-black font-semibold text-xs hover:bg-neutral-200 transition-colors flex items-center justify-center gap-2 cursor-pointer"
            >
              Iniciar Sesión en el Portal
            </Link>
          </div>
        )}

        {/* CASO 3: Usuario autenticado pero NO es administrador (es un alumno o delegado) */}
        {account !== null && account.isAuthenticated && !account.isAdmin && (
          <div className="space-y-4 text-center py-2">
            <div className="w-12 h-12 mx-auto rounded-2xl bg-red-950/40 border border-red-500/30 flex items-center justify-center text-red-400">
              <Ban className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-red-400 uppercase tracking-wider">Acceso Denegado</h2>
              <p className="text-xs text-neutral-300 mt-1.5 leading-relaxed">
                Has iniciado sesión como <span className="text-white font-mono font-bold">@{account.username}</span>, pero este perfil tiene rango de <span className="text-amber-300 font-semibold">{account.role || 'alumno'}</span>.
              </p>
              <p className="text-[11px] text-neutral-500 mt-2 leading-relaxed">
                Este panel está restringido exclusivamente a la cuenta oficial de administración (<span className="text-neutral-400 font-mono">@juanfe</span>). Conocer la clave maestra no otorga acceso a cuentas no autorizadas.
              </p>
            </div>
            <Link
              href="/"
              className="w-full py-2.5 rounded-xl border border-neutral-800 bg-neutral-900 text-neutral-300 hover:text-white hover:bg-neutral-800 transition-colors flex items-center justify-center gap-2 text-xs font-semibold cursor-pointer"
            >
              ← Volver al Portal de Alumnos
            </Link>
          </div>
        )}

        {/* CASO 4: Usuario autenticado y es ADMINISTRADOR oficial (@juanfe) -> Formulario de elevación (SUDO) */}
        {account !== null && account.isAuthenticated && account.isAdmin && (
          <div className="space-y-3.5">
            <div className="p-2.5 rounded-xl bg-emerald-950/30 border border-emerald-500/30 flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
                <Crown className="w-4 h-4" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-[11px] font-bold text-white flex items-center gap-1.5">
                  <span className="truncate">@{account.username}</span>
                  <span className="px-1 py-0.2 rounded text-[9px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-mono">
                    ADMIN
                  </span>
                </div>
                <div className="text-[10px] text-neutral-400">Identidad confirmada en base de datos</div>
              </div>
            </div>

            <p className="text-xs text-neutral-400 leading-relaxed">
              Introduce tu contraseña de cuenta o clave maestra para elevar privilegios y desbloquear las herramientas root.
            </p>

            <form onSubmit={handleSubmit} className="space-y-3">
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Contraseña de administrador..."
                className="w-full px-3 py-2 rounded-xl bg-neutral-950 border border-neutral-800 text-xs text-white placeholder-neutral-600 focus:outline-none focus:border-neutral-600"
                autoFocus
              />

              {error && (
                <div className="p-2.5 rounded-lg bg-red-950/40 border border-red-500/30 text-[11px] text-red-300 leading-relaxed">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={isLoading || !password.trim()}
                className="w-full py-2.5 rounded-xl bg-white text-black font-semibold text-xs hover:bg-neutral-200 transition-colors cursor-pointer disabled:opacity-40"
              >
                {isLoading ? 'Verificando autorización...' : 'Desbloquear Panel Root'}
              </button>
            </form>
          </div>
        )}

        <div className="pt-2 border-t border-neutral-800/80 flex items-center justify-between text-[11px] text-neutral-500">
          <Link href="/" className="hover:text-white transition-colors">
            ← Volver al portal
          </Link>
          <span className="font-mono text-[10px]">Protección Anti-Intrusión</span>
        </div>
      </div>
    </div>
  );
}
