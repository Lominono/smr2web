'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import {
  ShieldAlert,
  ShieldCheck,
  FileText,
  Users,
  Gamepad2,
  Download,
  Search,
  Filter,
  RefreshCw,
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Coins,
  CheckCircle2,
  X,
  AlertTriangle,
  Key,
  Lock,
  AlertCircle,
  Trash2,
  Bell,
  Send,
  Database,
  Terminal,
  ExternalLink,
  Copy,
  Check,
  LogOut,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { EventLogEntry } from '@/lib/russianRoulette';
import { UserProfile, CommunityFeedback, FeedbackStatus } from '@/lib/types';
import { getUserSession, saveUserSession } from '@/lib/authSession';
import { fetchFeedbackList, updateFeedbackAdminStatus, deleteFeedbackItem } from '@/lib/feedbackService';

interface AdminUser {
  id: string;
  username: string;
  email?: string;
  full_name?: string;
  student_number?: string;
  coins: number;
  biggest_win: number;
  games_played: number;
  games_won: number;
  role: string;
  is_banned: boolean;
  ban_reason?: string;
  created_at: string;
}

export default function AdminPage() {
  const [sessionUser, setSessionUser] = useState<UserProfile | null>(null);
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [activeTab, setActiveTab] = useState<'users' | 'broadcast' | 'logs' | 'feedback' | 'setup'>('users');

  // Push Broadcast state
  const [pushTitle, setPushTitle] = useState('');
  const [pushBody, setPushBody] = useState('');
  const [pushTag, setPushTag] = useState<'Aviso' | 'Examen' | 'Urgente' | 'General'>('Aviso');
  const [pushLoading, setPushLoading] = useState(false);
  const [pushResult, setPushResult] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Feedback state
  const [feedbackList, setFeedbackList] = useState<CommunityFeedback[]>([]);
  const [feedbackLoading, setFeedbackLoading] = useState(false);
  const [feedbackFilter, setFeedbackFilter] = useState<'all' | FeedbackStatus>('all');
  const [adminResponseDraft, setAdminResponseDraft] = useState<Record<string, string>>({});
  const [adminStatusDraft, setAdminStatusDraft] = useState<Record<string, FeedbackStatus>>({});

  // Logs state
  const [logs, setLogs] = useState<EventLogEntry[]>([]);
  const [logsLoading, setLogsLoading] = useState(false);
  const [totalLogs, setTotalLogs] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [eventTypeFilter, setEventTypeFilter] = useState<string>('');
  const [searchLogQuery, setSearchLogQuery] = useState('');
  const [selectedLog, setSelectedLog] = useState<EventLogEntry | null>(null);

  // Users state
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [searchUserQuery, setSearchUserQuery] = useState('');
  const [adjustModalUser, setAdjustModalUser] = useState<AdminUser | null>(null);
  const [adjustAmount, setAdjustAmount] = useState<string>('500');
  const [isResettingDb, setIsResettingDb] = useState(false);

  // Claim admin state
  const [accessCodeInput, setAccessCodeInput] = useState('');
  const [claimLoading, setClaimLoading] = useState(false);
  const [claimError, setClaimError] = useState<string | null>(null);
  const [claimSuccess, setClaimSuccess] = useState<string | null>(null);

  // Copied code snippet feedback
  const [copiedScript, setCopiedScript] = useState(false);

  // Verificación estricta en el servidor
  useEffect(() => {
    let isMounted = true;
    async function checkServerAdminAuth() {
      try {
        const res = await fetch('/api/admin/verify');
        const data = await res.json();
        if (isMounted) {
          if (res.ok && data.authorized) {
            setIsAdmin(true);
            setSessionUser(data.user);
          } else {
            setIsAdmin(false);
          }
        }
      } catch {
        if (isMounted) {
          setIsAdmin(false);
        }
      }
    }
    checkServerAdminAuth();
    return () => {
      isMounted = false;
    };
  }, []);

  const handleClaimAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    const code = accessCodeInput.trim();
    if (!code) return;
    setClaimLoading(true);
    setClaimError(null);
    setClaimSuccess(null);
    try {
      const res = await fetch('/api/admin/claim', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setClaimSuccess(data.message || 'Acceso concedido.');
        if (data.user) {
          saveUserSession(data.user);
          setSessionUser(data.user);
        }
        setAccessCodeInput('');
        setIsAdmin(true);
      } else {
        setClaimError(data.error || 'Credenciales de administración incorrectas.');
      }
    } catch (err: any) {
      setClaimError(err?.message || 'Error de conexión.');
    } finally {
      setClaimLoading(false);
    }
  };

  const handleAdminLogout = async () => {
    try {
      await fetch('/api/admin/logout', { method: 'POST' });
    } catch {}
    setIsAdmin(false);
    setSessionUser(null);
  };

  // Fetch logs
  const fetchLogs = useCallback(
    async (p: number = 1) => {
      setLogsLoading(true);
      try {
        const params = new URLSearchParams({
          page: String(p),
          limit: '25',
        });
        if (eventTypeFilter) params.set('eventType', eventTypeFilter);
        if (searchLogQuery.trim()) params.set('search', searchLogQuery.trim());

        const res = await fetch(`/api/admin/logs?${params.toString()}`);
        if (res.ok) {
          const data = await res.json();
          if (data.success) {
            setLogs(data.logs || []);
            setTotalLogs(data.total || 0);
            setPage(data.page || 1);
            setTotalPages(data.totalPages || 1);
          }
        }
      } catch (err) {
        console.error('Error fetching admin logs:', err);
      } finally {
        setLogsLoading(false);
      }
    },
    [eventTypeFilter, searchLogQuery]
  );

  // Fetch users
  const fetchUsers = useCallback(async () => {
    setUsersLoading(true);
    try {
      const res = await fetch('/api/admin/users');
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setUsers(data.users || []);
        }
      }
    } catch (err) {
      console.error('Error fetching users:', err);
    } finally {
      setUsersLoading(false);
    }
  }, []);

  // Fetch feedback
  const fetchFeedback = useCallback(async () => {
    setFeedbackLoading(true);
    try {
      const data = await fetchFeedbackList();
      setFeedbackList(data);
    } finally {
      setFeedbackLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isAdmin) {
      if (activeTab === 'logs') fetchLogs(page);
      if (activeTab === 'users') fetchUsers();
      if (activeTab === 'feedback') fetchFeedback();
    }
  }, [isAdmin, activeTab, fetchLogs, fetchUsers, fetchFeedback, page]);

  // Adjust coins handler
  const handleAdjustCoins = async () => {
    if (!adjustModalUser) return;
    const delta = parseInt(adjustAmount, 10);
    if (isNaN(delta)) return;

    try {
      const res = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'adjust_coins',
          targetUserId: adjustModalUser.id,
          amount: delta,
        }),
      });
      if (res.ok) {
        setAdjustModalUser(null);
        fetchUsers();
        fetchLogs(1);
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Toggle ban handler
  const handleToggleBan = async (u: AdminUser) => {
    const action = u.is_banned ? 'unban' : 'ban';
    const reason = !u.is_banned
      ? prompt('Motivo de la suspensión:') || 'Decisión de administrador'
      : undefined;

    try {
      const res = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action,
          targetUserId: u.id,
          banReason: reason,
        }),
      });
      if (res.ok) {
        fetchUsers();
        fetchLogs(1);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleToggleRole = async (u: AdminUser) => {
    const newRole = u.role === 'admin' ? 'student' : 'admin';
    const ok = confirm(`¿Cambiar el rol de @${u.username} a "${newRole}"?`);
    if (!ok) return;
    try {
      const res = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'set_role', targetUserId: u.id, role: newRole }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        fetchUsers();
      } else {
        alert(data.error || 'Error al cambiar rol');
      }
    } catch (err: any) {
      alert(err?.message || 'Error de conexión');
    }
  };

  const handleDeleteUser = async (u: AdminUser) => {
    const ok = confirm(
      `¿Eliminar permanentemente al usuario @${u.username}?\n\nEsta acción borrará su perfil y no se puede deshacer.`
    );
    if (!ok) return;
    try {
      const res = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'delete_user', targetUserId: u.id }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        alert(`Usuario @${u.username} eliminado correctamente.`);
        fetchUsers();
      } else {
        alert(data.error || 'Error al eliminar usuario');
      }
    } catch (err: any) {
      alert(err?.message || 'Error de conexión');
    }
  };

  // Reset database handler
  const handleResetDatabase = async () => {
    const confirmation = confirm(
      '¿Estás COMPLETAMENTE seguro de reiniciar la base de datos de toda la clase?\n\n' +
        '• Todos los saldos volverán a 1.000 monedas.\n' +
        '• Se reiniciarán las victorias y estadísticas.\n' +
        '• Se vaciará el chat para empezar la nueva temporada.'
    );
    if (!confirmation) return;

    setIsResettingDb(true);
    try {
      const res = await fetch('/api/admin/reset-database', { method: 'POST' });
      const data = await res.json();
      if (res.ok && data.success) {
        alert('Base de datos reiniciada con éxito para toda la clase. Todos vuelven a tener 1.000 monedas.');
        fetchUsers();
        fetchLogs(1);
      } else {
        alert(data.error || 'Error al reiniciar la base de datos.');
      }
    } catch (err: any) {
      alert(err?.message || 'Error de conexión.');
    } finally {
      setIsResettingDb(false);
    }
  };

  // Total wipe handler
  const handleWipeAll = async () => {
    const confirmation = confirm(
      '⚠️ ADVERTENCIA CRÍTICA: ¿Estás seguro de BORRAR TODOS LOS USUARIOS Y DATOS?\n\n' +
        '• Se eliminarán todas las cuentas de usuario, correos y contraseñas.\n' +
        '• Se vaciará todo el historial, posiciones e inversiones.\n' +
        '• Esta acción es irreversible.'
    );
    if (!confirmation) return;

    setIsResettingDb(true);
    try {
      const res = await fetch('/api/admin/reset-database', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ wipeUsers: true }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        alert('Borrado total completado. Todas las cuentas han sido eliminadas.');
        fetchUsers();
        fetchLogs(1);
      } else {
        alert(data.error || 'Error al procesar el borrado total.');
      }
    } catch (err: any) {
      alert(err?.message || 'Error de conexión.');
    } finally {
      setIsResettingDb(false);
    }
  };

  // Push broadcast handler
  const handleSendPushBroadcast = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pushTitle.trim() || !pushBody.trim()) {
      alert('Debes indicar un título y un mensaje para la notificación.');
      return;
    }

    setPushLoading(true);
    setPushResult(null);

    try {
      const res = await fetch('/api/notifications/broadcast', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: pushTitle.trim(),
          body: pushBody.trim(),
          tag: pushTag,
          url: '/',
          authorUsername: sessionUser?.username || 'Admin',
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setPushResult({
          type: 'success',
          message: `Aviso enviado correctamente a ${data.sent} dispositivo(s).`,
        });
        setPushTitle('');
        setPushBody('');
      } else {
        setPushResult({
          type: 'error',
          message: data.error || 'No se pudo enviar la notificación.',
        });
      }
    } catch (err: any) {
      setPushResult({
        type: 'error',
        message: err?.message || 'Error de red al conectar con el servicio de push.',
      });
    } finally {
      setPushLoading(false);
    }
  };

  // Feedback Handlers
  const handleUpdateFeedbackStatus = async (item: CommunityFeedback) => {
    const status = adminStatusDraft[item.id] || item.status;
    const response =
      adminResponseDraft[item.id] !== undefined ? adminResponseDraft[item.id] : item.admin_response;

    try {
      const res = await updateFeedbackAdminStatus({
        feedbackId: item.id,
        status,
        adminResponse: response,
        adminName: sessionUser?.username || 'Delegado',
      });
      if (res.success) {
        alert('Estado actualizado con éxito.');
        fetchFeedback();
      }
    } catch (err: any) {
      alert(err?.message || 'Error al actualizar');
    }
  };

  const handleDeleteFeedback = async (id: string) => {
    if (!confirm('¿Seguro que quieres eliminar esta incidencia?')) return;
    try {
      await deleteFeedbackItem(id);
      fetchFeedback();
    } catch (err: any) {
      alert(err?.message || 'Error al eliminar');
    }
  };

  // Computed summary metrics
  const totalCoinsInCirculation = useMemo(() => {
    return users.reduce((acc, u) => acc + (Number(u.coins) || 0), 0);
  }, [users]);

  const bannedUsersCount = useMemo(() => {
    return users.filter((u) => u.is_banned).length;
  }, [users]);

  const activeIncidentsCount = useMemo(() => {
    return feedbackList.filter((f) => f.status !== 'completed' && f.status !== 'dismissed').length;
  }, [feedbackList]);

  // Filtered users
  const filteredUsers = useMemo(() => {
    const q = searchUserQuery.toLowerCase().trim();
    if (!q) return users;
    return users.filter(
      (u) =>
        u.username.toLowerCase().includes(q) ||
        (u.full_name && u.full_name.toLowerCase().includes(q)) ||
        (u.student_number && u.student_number.toLowerCase().includes(q)) ||
        (u.email && u.email.toLowerCase().includes(q))
    );
  }, [users, searchUserQuery]);

  // Loading state
  if (isAdmin === null) {
    return (
      <div className="min-h-screen bg-background text-foreground flex items-center justify-center font-sans text-xs">
        <div className="flex items-center gap-2.5">
          <RefreshCw className="w-4 h-4 text-accent animate-spin" />
          <span className="text-foreground-muted">Verificando credenciales de administración...</span>
        </div>
      </div>
    );
  }

  // Formulario de autenticación restringida para administradores
  if (isAdmin === false) {
    return (
      <div className="min-h-screen bg-background text-foreground flex flex-col items-center justify-center p-4">
        <Card className="max-w-md w-full p-6 sm:p-7 text-center space-y-5 rounded-2xl border-border/80 shadow-xs bg-surface/90">
          <div className="w-12 h-12 rounded-2xl bg-surface-raised border border-border/80 text-accent flex items-center justify-center mx-auto">
            <Lock className="w-6 h-6" />
          </div>

          <div className="space-y-1.5">
            <Badge variant="outline" className="text-[11px] font-semibold text-accent border-accent/30">
              Acceso Restringido · Solo Administradores
            </Badge>
            <h1 className="text-lg font-semibold tracking-tight text-foreground">Autenticación de Administrador</h1>
            <p className="text-xs text-foreground-muted leading-relaxed">
              Esta sección está estrictamente protegida. Introduce tu contraseña maestra de administrador para verificar tu identidad y desbloquear las herramientas.
            </p>
          </div>

          <form onSubmit={handleClaimAdmin} className="space-y-3.5 pt-1">
            <div className="space-y-1.5 text-left">
              <label className="text-xs font-medium text-foreground-muted">
                Contraseña maestra de administración:
              </label>
              <input
                type="password"
                value={accessCodeInput}
                onChange={(e) => setAccessCodeInput(e.target.value)}
                placeholder="Introduce la contraseña de administrador..."
                className="w-full px-3.5 py-2.5 text-sm rounded-xl bg-background border border-border focus:outline-hidden focus:border-accent focus:ring-1 focus:ring-accent transition-all text-center tracking-wider font-mono"
                autoFocus
                required
              />
            </div>

            {claimError && (
              <div className="p-2.5 rounded-xl bg-danger-subtle border border-danger/20 text-danger text-xs text-left flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{claimError}</span>
              </div>
            )}

            {claimSuccess && (
              <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/25 text-emerald-600 dark:text-emerald-400 text-xs text-left flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{claimSuccess}</span>
              </div>
            )}

            <Button
              type="submit"
              variant="primary"
              className="w-full h-10 rounded-xl font-medium text-xs tracking-wide"
              disabled={claimLoading || !accessCodeInput.trim()}
            >
              {claimLoading ? (
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Key className="w-3.5 h-3.5" />
              )}
              <span>Verificar y Acceder</span>
            </Button>
          </form>

          <div className="pt-2 border-t border-border/60 text-left">
            <p className="text-[11px] text-foreground-subtle leading-relaxed flex items-center gap-1.5">
              <ShieldAlert className="w-3.5 h-3.5 text-amber-500 shrink-0" />
              <span>Los intentos fallidos de acceso no autorizado quedan registrados en la auditoría de seguridad del sistema.</span>
            </p>
          </div>

          <div className="pt-1">
            <Link href="/">
              <Button variant="ghost" size="sm" className="rounded-xl text-xs w-full">
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Volver al portal público</span>
              </Button>
            </Link>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground font-sans antialiased pb-20">
      {/* Top Navbar */}
      <header className="sticky top-0 z-30 border-b border-border/70 bg-surface/85 backdrop-blur-md pt-[env(safe-area-inset-top,0px)]">
        <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link href="/">
              <Button variant="secondary" size="sm" className="h-9 px-3 rounded-xl touch-manipulation">
                <ArrowLeft className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Volver</span>
              </Button>
            </Link>
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-surface-raised border border-border/70 text-accent">
                <ShieldCheck className="w-4 h-4" />
              </span>
              <span className="font-semibold text-sm tracking-tight text-foreground">
                Panel de Administración
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-foreground-muted hidden sm:inline font-mono">
              Admin: <span className="text-accent font-semibold">@{sessionUser?.username || 'admin'}</span>
            </span>
            <a
              href="/api/admin/logs?format=csv"
              download
              className="inline-flex items-center gap-1.5 px-3 h-9 rounded-xl bg-surface-raised border border-border/70 text-foreground hover:bg-surface text-xs font-medium transition-colors cursor-pointer active:scale-95 touch-manipulation"
            >
              <Download className="w-3.5 h-3.5 text-accent" />
              <span className="hidden xs:inline">Exportar CSV</span>
            </a>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleAdminLogout}
              className="h-9 px-3 rounded-xl text-xs text-foreground-muted hover:text-danger hover:bg-danger-subtle cursor-pointer transition-colors"
              title="Cerrar sesión de administrador en este equipo"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden md:inline">Cerrar sesión</span>
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-6 space-y-6">
        {/* Minimalist Metrics Strip */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="p-4 rounded-xl bg-surface border border-border/70 space-y-1">
            <span className="text-[10px] uppercase font-mono tracking-wider text-foreground-subtle block">
              Alumnos Registrados
            </span>
            <div className="text-xl font-bold font-mono text-foreground">{users.length}</div>
            <span className="text-[11px] text-foreground-muted">2º SMR</span>
          </div>

          <div className="p-4 rounded-xl bg-surface border border-border/70 space-y-1">
            <span className="text-[10px] uppercase font-mono tracking-wider text-foreground-subtle block">
              Fichas en Circulación
            </span>
            <div className="text-xl font-bold font-mono text-amber-500 tabular-nums">
              {totalCoinsInCirculation.toLocaleString('es-ES')}
            </div>
            <span className="text-[11px] text-foreground-muted">Economía global</span>
          </div>

          <div className="p-4 rounded-xl bg-surface border border-border/70 space-y-1">
            <span className="text-[10px] uppercase font-mono tracking-wider text-foreground-subtle block">
              Auditoría
            </span>
            <div className="text-xl font-bold font-mono text-accent tabular-nums">{totalLogs}</div>
            <span className="text-[11px] text-foreground-muted">Eventos registrados</span>
          </div>

          <div className="p-4 rounded-xl bg-surface border border-border/70 space-y-1">
            <span className="text-[10px] uppercase font-mono tracking-wider text-foreground-subtle block">
              Incidencias Activas
            </span>
            <div className="text-xl font-bold font-mono text-foreground">{activeIncidentsCount}</div>
            <span className="text-[11px] text-foreground-muted">Pendientes de resolver</span>
          </div>
        </div>

        {/* Navigation Tabs (Apple Segmented Style) */}
        <div className="flex items-center p-1 rounded-xl bg-surface-raised border border-border/70 max-w-full overflow-x-auto gap-1 shadow-2xs scrollbar-none">
          <button
            type="button"
            onClick={() => setActiveTab('users')}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all shrink-0 cursor-pointer ${
              activeTab === 'users'
                ? 'bg-foreground text-background font-semibold shadow-xs'
                : 'text-foreground-muted hover:text-foreground'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>Alumnos ({users.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('broadcast')}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all shrink-0 cursor-pointer ${
              activeTab === 'broadcast'
                ? 'bg-foreground text-background font-semibold shadow-xs'
                : 'text-foreground-muted hover:text-foreground'
            }`}
          >
            <Bell className="w-3.5 h-3.5" />
            <span>Anuncios Push</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('logs')}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all shrink-0 cursor-pointer ${
              activeTab === 'logs'
                ? 'bg-foreground text-background font-semibold shadow-xs'
                : 'text-foreground-muted hover:text-foreground'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Auditoría ({totalLogs})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('feedback')}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all shrink-0 cursor-pointer ${
              activeTab === 'feedback'
                ? 'bg-foreground text-background font-semibold shadow-xs'
                : 'text-foreground-muted hover:text-foreground'
            }`}
          >
            <AlertCircle className="w-3.5 h-3.5" />
            <span>Incidencias ({feedbackList.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('setup')}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all shrink-0 cursor-pointer ${
              activeTab === 'setup'
                ? 'bg-foreground text-background font-semibold shadow-xs'
                : 'text-foreground-muted hover:text-foreground'
            }`}
          >
            <Database className="w-3.5 h-3.5" />
            <span>Configuración Supabase</span>
          </button>
        </div>

        {/* ============================================================== */}
        {/* TAB 1: USERS & BALANCE */}
        {/* ============================================================== */}
        {activeTab === 'users' && (
          <div className="space-y-4">
            <div className="p-3 rounded-xl bg-surface border border-border/70 flex flex-wrap items-center justify-between gap-3">
              <div className="relative flex-1 min-w-[220px]">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-foreground-subtle" />
                <input
                  type="text"
                  value={searchUserQuery}
                  onChange={(e) => setSearchUserQuery(e.target.value)}
                  placeholder="Buscar alumno por @usuario, nombre o NIA..."
                  className="w-full h-9 pl-9 pr-3 rounded-lg bg-surface-raised border border-border/70 text-xs text-foreground placeholder:text-foreground-subtle focus:outline-none focus:ring-1 focus:ring-accent"
                />
              </div>

              <Button
                variant="secondary"
                size="sm"
                className="rounded-lg h-9 text-xs"
                onClick={fetchUsers}
                disabled={usersLoading}
              >
                <RefreshCw className={`w-3.5 h-3.5 ${usersLoading ? 'animate-spin' : ''}`} />
                <span>Actualizar listado</span>
              </Button>
            </div>

            <div className="overflow-x-auto rounded-xl border border-border/70 bg-surface">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-border/70 bg-surface-raised text-foreground-muted font-medium">
                    <th className="py-2.5 px-3">Usuario</th>
                    <th className="py-2.5 px-3">Identificación Oficial</th>
                    <th className="py-2.5 px-3">Rol</th>
                    <th className="py-2.5 px-3">Saldo Fichas</th>
                    <th className="py-2.5 px-3">Partidas (G / J)</th>
                    <th className="py-2.5 px-3">Estado</th>
                    <th className="py-2.5 px-3 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/40">
                  {filteredUsers.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-foreground-subtle">
                        {usersLoading
                          ? 'Cargando listado...'
                          : searchUserQuery
                          ? 'No hay alumnos que coincidan con la búsqueda.'
                          : 'No hay usuarios registrados en la base de datos.'}
                      </td>
                    </tr>
                  ) : (
                    filteredUsers.map((u) => (
                      <tr key={u.id} className="hover:bg-surface-raised/60 transition-colors">
                        <td className="py-2.5 px-3">
                          <div className="font-semibold text-foreground font-mono">@{u.username}</div>
                          <div className="text-[10px] text-foreground-subtle font-mono truncate max-w-[160px]">
                            {u.email || u.id}
                          </div>
                        </td>
                        <td className="py-2.5 px-3">
                          {u.full_name ? (
                            <div>
                              <div className="font-medium text-foreground text-xs">{u.full_name}</div>
                              <div className="text-[10px] text-accent font-mono font-semibold">
                                NIA {u.student_number || 'S/N'}
                              </div>
                            </div>
                          ) : (
                            <span className="text-foreground-subtle text-xs italic">Sin registrar</span>
                          )}
                        </td>
                        <td className="py-2.5 px-3">
                          <Badge variant={u.role === 'admin' ? 'accent' : 'default'} size="sm">
                            {u.role}
                          </Badge>
                        </td>
                        <td className="py-2.5 px-3 font-semibold font-mono text-amber-500 tabular-nums">
                          {u.coins.toLocaleString('es-ES')}
                        </td>
                        <td className="py-2.5 px-3 text-foreground-muted font-mono">
                          {u.games_won} / {u.games_played}
                        </td>
                        <td className="py-2.5 px-3">
                          {u.is_banned ? (
                            <Badge variant="danger" size="sm">
                              Suspendido
                            </Badge>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[11px] text-emerald-400 font-medium">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                              <span>Activo</span>
                            </span>
                          )}
                        </td>
                        <td className="py-2.5 px-3 text-right space-x-1.5 whitespace-nowrap">
                          <Button
                            variant="secondary"
                            size="sm"
                            className="h-7 text-xs rounded-lg"
                            onClick={() => setAdjustModalUser(u)}
                            title="Sumar o restar monedas"
                          >
                            Monedas
                          </Button>
                          <Button
                            variant={u.role === 'admin' ? 'secondary' : 'primary'}
                            size="sm"
                            className="h-7 text-xs rounded-lg"
                            onClick={() => handleToggleRole(u)}
                            title="Alternar entre rol Administrador y Estudiante"
                          >
                            {u.role === 'admin' ? 'Quitar Admin' : 'Hacer Admin'}
                          </Button>
                          <Button
                            variant={u.is_banned ? 'secondary' : 'ghost'}
                            size="sm"
                            className="h-7 text-xs rounded-lg text-amber-500"
                            onClick={() => handleToggleBan(u)}
                          >
                            {u.is_banned ? 'Reactivar' : 'Suspender'}
                          </Button>
                          <Button
                            variant="danger"
                            size="sm"
                            className="h-7 text-xs rounded-lg"
                            onClick={() => handleDeleteUser(u)}
                            title="Eliminar permanentemente este usuario"
                          >
                            Borrar
                          </Button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Zona de Mantenimiento / Reinicio General de Temporada */}
            <div className="p-4 rounded-xl bg-surface border border-border/70 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <h4 className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                  <AlertTriangle className="w-4 h-4 text-amber-500" />
                  <span>Reinicio de Temporada</span>
                </h4>
                <p className="text-xs text-foreground-muted mt-0.5">
                  Restablece a 1.000 monedas a todos los alumnos de la clase y limpia el historial de partidas para iniciar una nueva temporada escolar.
                </p>
              </div>

              <Button
                variant="danger"
                size="sm"
                disabled={isResettingDb}
                onClick={handleResetDatabase}
                className="shrink-0 rounded-xl"
              >
                {isResettingDb ? 'Reiniciando...' : 'Reiniciar temporada'}
              </Button>
            </div>

            {/* Danger Zone 2: Total Wipe */}
            <div className="p-4 rounded-xl border border-danger/40 bg-danger/5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <h4 className="text-xs font-semibold text-danger flex items-center gap-1.5">
                  <Trash2 className="w-4 h-4 text-danger" />
                  <span>Borrado Total y Absoluto (Cuentas y Datos)</span>
                </h4>
                <p className="text-xs text-foreground-muted mt-0.5">
                  Elimina todas las cuentas de usuario, correos, sesiones y vacía por completo la base de datos para comenzar de cero.
                </p>
              </div>

              <Button
                variant="danger"
                size="sm"
                disabled={isResettingDb}
                onClick={handleWipeAll}
                className="shrink-0 rounded-xl bg-danger hover:bg-danger/90 text-white font-medium"
              >
                {isResettingDb ? 'Borrando...' : 'Borrar todo'}
              </Button>
            </div>
          </div>
        )}

        {/* ============================================================== */}
        {/* TAB 2: PUSH BROADCAST ANNOUNCEMENTS */}
        {/* ============================================================== */}
        {activeTab === 'broadcast' && (
          <div className="space-y-4 max-w-2xl">
            <Card className="p-5 rounded-xl border-border/70 bg-surface space-y-4">
              <div>
                <div className="flex items-center gap-2">
                  <Bell className="w-4 h-4 text-accent" />
                  <h3 className="text-sm font-semibold text-foreground">
                    Difusión de Notificaciones Web Push
                  </h3>
                </div>
                <p className="text-xs text-foreground-muted mt-1 leading-relaxed">
                  Envía un anuncio o aviso oficial a todos los dispositivos de la clase suscritos. Los alumnos recibirán la notificación incluso si tienen el navegador cerrado o la pantalla del móvil apagada.
                </p>
              </div>

              <form onSubmit={handleSendPushBroadcast} className="space-y-3.5">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-foreground-muted">
                    Categoría del aviso:
                  </label>
                  <div className="flex gap-2">
                    {(['Aviso', 'Examen', 'Urgente', 'General'] as const).map((tag) => (
                      <button
                        key={tag}
                        type="button"
                        onClick={() => setPushTag(tag)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors cursor-pointer ${
                          pushTag === tag
                            ? 'bg-accent/20 border-accent text-accent font-semibold'
                            : 'bg-surface-raised border-border/70 text-foreground-muted hover:text-foreground'
                        }`}
                      >
                        {tag}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-foreground-muted">
                    Título de la notificación:
                  </label>
                  <input
                    type="text"
                    value={pushTitle}
                    onChange={(e) => setPushTitle(e.target.value)}
                    placeholder="Ej. Cambio de aula para Redes o Examen aplazado"
                    className="w-full h-9 px-3 rounded-lg bg-surface-raised border border-border/70 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-accent"
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-foreground-muted">
                    Mensaje / Contenido:
                  </label>
                  <textarea
                    value={pushBody}
                    onChange={(e) => setPushBody(e.target.value)}
                    placeholder="Escribe el aviso detallado que aparecerá en la pantalla de bloqueo o barra de estado..."
                    rows={3}
                    className="w-full p-3 rounded-lg bg-surface-raised border border-border/70 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-accent resize-none"
                    required
                  />
                </div>

                {pushResult && (
                  <div
                    className={`p-3 rounded-xl border text-xs flex items-start gap-2 ${
                      pushResult.type === 'success'
                        ? 'bg-emerald-500/10 border-emerald-500/25 text-emerald-600 dark:text-emerald-400'
                        : 'bg-danger-subtle border-danger/25 text-danger'
                    }`}
                  >
                    {pushResult.type === 'success' ? (
                      <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
                    ) : (
                      <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                    )}
                    <span>{pushResult.message}</span>
                  </div>
                )}

                <div className="flex justify-end pt-1">
                  <Button
                    type="submit"
                    variant="primary"
                    disabled={pushLoading || !pushTitle.trim() || !pushBody.trim()}
                    className="rounded-xl text-xs h-9 px-4 gap-1.5"
                  >
                    {pushLoading ? (
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Send className="w-3.5 h-3.5" />
                    )}
                    <span>Enviar a toda la clase</span>
                  </Button>
                </div>
              </form>
            </Card>
          </div>
        )}

        {/* ============================================================== */}
        {/* TAB 3: AUDIT LOGS */}
        {/* ============================================================== */}
        {activeTab === 'logs' && (
          <div className="space-y-4">
            <div className="p-3 rounded-xl bg-surface border border-border/70 flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-2.5 flex-1 min-w-[280px]">
                <div className="relative flex-1 min-w-[200px]">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-foreground-subtle" />
                  <input
                    type="text"
                    value={searchLogQuery}
                    onChange={(e) => setSearchLogQuery(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && fetchLogs(1)}
                    placeholder="Buscar por usuario, IP, motivo..."
                    className="w-full h-9 pl-9 pr-3 rounded-lg bg-surface-raised border border-border/70 text-xs text-foreground placeholder:text-foreground-subtle focus:outline-none focus:ring-1 focus:ring-accent"
                  />
                </div>

                <div className="flex items-center gap-1.5 w-full sm:w-auto">
                  <Filter className="w-4 h-4 text-foreground-subtle shrink-0" />
                  <select
                    value={eventTypeFilter}
                    onChange={(e) => {
                      setEventTypeFilter(e.target.value);
                      setPage(1);
                    }}
                    className="w-full sm:w-auto h-9 px-3 rounded-lg bg-surface-raised border border-border/70 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-accent cursor-pointer"
                  >
                    <option value="">Todos los eventos</option>
                    <option value="user_register">Registro de usuario</option>
                    <option value="user_login_success">Inicio de sesión</option>
                    <option value="room_created">Creación de sala</option>
                    <option value="room_joined">Entrada a sala</option>
                    <option value="game_started">Inicio de partida</option>
                    <option value="turn_executed">Disparo / Turno</option>
                    <option value="player_eliminated">Eliminación</option>
                    <option value="game_won">Partida ganada / Bote</option>
                    <option value="balance_adjusted">Ajuste de fichas</option>
                    <option value="user_banned">Suspensión de cuenta</option>
                    <option value="game_timeout">Timeout de turno</option>
                  </select>
                </div>

                <Button
                  variant="secondary"
                  size="sm"
                  className="rounded-lg h-9 text-xs"
                  onClick={() => fetchLogs(1)}
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${logsLoading ? 'animate-spin' : ''}`} />
                  <span>Actualizar</span>
                </Button>
              </div>

              <div className="text-xs text-foreground-subtle font-mono">
                Página {page} de {totalPages}
              </div>
            </div>

            <div className="overflow-x-auto rounded-xl border border-border/70 bg-surface">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-border/70 bg-surface-raised text-foreground-muted font-medium">
                    <th className="py-2.5 px-3">Fecha y Hora</th>
                    <th className="py-2.5 px-3">Tipo de Evento</th>
                    <th className="py-2.5 px-3">Usuario</th>
                    <th className="py-2.5 px-3">Sala / Partida</th>
                    <th className="py-2.5 px-3">IP Origen</th>
                    <th className="py-2.5 px-3">Detalle</th>
                    <th className="py-2.5 px-3 text-right">Acción</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/40">
                  {logs.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-foreground-subtle">
                        {logsLoading ? 'Cargando registros...' : 'No se encontraron eventos coincidentes.'}
                      </td>
                    </tr>
                  ) : (
                    logs.map((log) => {
                      const dateStr = new Date(log.created_at).toLocaleString('es-ES', {
                        day: '2-digit',
                        month: '2-digit',
                        hour: '2-digit',
                        minute: '2-digit',
                        second: '2-digit',
                      });

                      return (
                        <tr key={log.id} className="hover:bg-surface-raised/60 transition-colors">
                          <td className="py-2.5 px-3 text-foreground-muted font-mono whitespace-nowrap">
                            {dateStr}
                          </td>
                          <td className="py-2.5 px-3 whitespace-nowrap">
                            <span className="font-mono text-[11px] font-semibold text-accent">
                              {log.event_type}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 font-mono font-medium text-foreground whitespace-nowrap">
                            {log.username ? `@${log.username}` : <span className="text-foreground-subtle">Anónimo</span>}
                          </td>
                          <td className="py-2.5 px-3 font-mono text-[11px] text-foreground-subtle whitespace-nowrap">
                            {log.room_id || log.game_id || '-'}
                          </td>
                          <td className="py-2.5 px-3 font-mono text-[11px] text-foreground-subtle whitespace-nowrap">
                            {log.ip_address}
                          </td>
                          <td className="py-2.5 px-3 text-foreground-muted max-w-[200px] truncate">
                            {JSON.stringify(log.details)}
                          </td>
                          <td className="py-2.5 px-3 text-right whitespace-nowrap">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 text-xs rounded-lg"
                              onClick={() => setSelectedLog(log)}
                            >
                              Ver JSON
                            </Button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            <div className="flex items-center justify-between pt-2 text-xs">
              <span className="text-foreground-subtle">
                Mostrando {logs.length} de {totalLogs} registros totales
              </span>
              <div className="flex items-center gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  className="rounded-lg h-8"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                  <span>Anterior</span>
                </Button>
                <span className="text-foreground-muted px-2 font-mono">
                  {page} / {totalPages}
                </span>
                <Button
                  variant="secondary"
                  size="sm"
                  className="rounded-lg h-8"
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                >
                  <span>Siguiente</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* ============================================================== */}
        {/* TAB 4: INCIDENCIAS Y REPORTES TÉCNICOS */}
        {/* ============================================================== */}
        {activeTab === 'feedback' && (
          <div className="space-y-4">
            <div className="p-3.5 rounded-xl bg-surface border border-border/70 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-foreground-subtle" />
                <span className="text-xs font-semibold text-foreground">
                  Gestión de incidencias y reportes del aula ({feedbackList.length})
                </span>
              </div>

              <div className="flex items-center gap-2">
                <select
                  value={feedbackFilter}
                  onChange={(e) => setFeedbackFilter(e.target.value as any)}
                  className="h-8 px-2.5 rounded-lg bg-surface-raised border border-border/70 text-xs text-foreground cursor-pointer"
                >
                  <option value="all">Todos los estados</option>
                  <option value="pending">Abiertos</option>
                  <option value="under_review">En revisión</option>
                  <option value="planned">Planificados</option>
                  <option value="completed">Resueltos</option>
                  <option value="dismissed">Descartados</option>
                </select>

                <Button
                  variant="secondary"
                  size="sm"
                  onClick={fetchFeedback}
                  disabled={feedbackLoading}
                  className="h-8 text-xs"
                >
                  <RefreshCw className={`w-3 h-3 ${feedbackLoading ? 'animate-spin' : ''}`} />
                  <span>Actualizar</span>
                </Button>
              </div>
            </div>

            {feedbackLoading ? (
              <div className="py-12 text-center text-xs text-foreground-subtle">
                Cargando incidencias...
              </div>
            ) : feedbackList.filter(
                (f) => feedbackFilter === 'all' || f.status === feedbackFilter
              ).length === 0 ? (
              <div className="p-8 text-center text-foreground-subtle rounded-xl border border-border/70 bg-surface text-xs">
                No hay incidencias registradas con este filtro.
              </div>
            ) : (
              <div className="space-y-3">
                {feedbackList
                  .filter((f) => feedbackFilter === 'all' || f.status === feedbackFilter)
                  .map((item) => (
                    <Card key={item.id} className="p-4 rounded-xl border-border/70 bg-surface space-y-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="space-y-1 min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <Badge
                              variant={
                                item.type === 'report'
                                  ? 'danger'
                                  : item.type === 'idea'
                                  ? 'default'
                                  : 'accent'
                              }
                              size="sm"
                            >
                              {item.type === 'report'
                                ? 'Incidencia'
                                : item.type === 'improvement'
                                ? 'Mejora'
                                : 'Propuesta'}
                            </Badge>
                            <span className="text-[11px] text-foreground-subtle uppercase font-mono">
                              {item.category}
                            </span>
                            <span className="text-[11px] text-foreground-subtle font-mono">
                              · {item.upvotes_count} votos
                            </span>
                          </div>
                          <h4 className="text-sm font-bold text-foreground">{item.title}</h4>
                          <p className="text-xs text-foreground-muted whitespace-pre-wrap">
                            {item.description}
                          </p>
                          <div className="text-[11px] text-foreground-subtle pt-1 font-mono">
                            @{item.author_name} ·{' '}
                            {new Date(item.created_at).toLocaleDateString('es-ES')}
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleDeleteFeedback(item.id)}
                          className="p-1.5 rounded-lg text-foreground-subtle hover:text-danger hover:bg-danger-subtle transition-colors cursor-pointer"
                          title="Eliminar incidencia"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>

                      {/* Admin update bar */}
                      <div className="pt-2.5 border-t border-border/60 flex flex-wrap items-center gap-3">
                        <div className="flex items-center gap-1.5 text-xs">
                          <span className="text-foreground-subtle font-medium text-[11px]">Estado:</span>
                          <select
                            value={adminStatusDraft[item.id] || item.status}
                            onChange={(e) =>
                              setAdminStatusDraft((prev) => ({
                                ...prev,
                                [item.id]: e.target.value as FeedbackStatus,
                              }))
                            }
                            className="h-8 px-2 rounded-lg bg-surface-raised border border-border/70 text-xs text-foreground cursor-pointer"
                          >
                            <option value="pending">Abierto</option>
                            <option value="under_review">En revisión</option>
                            <option value="planned">Planificado</option>
                            <option value="completed">Resuelto</option>
                            <option value="dismissed">Descartado</option>
                          </select>
                        </div>

                        <div className="flex-1 min-w-[200px]">
                          <input
                            type="text"
                            placeholder="Nota técnica de resolución..."
                            value={
                              adminResponseDraft[item.id] !== undefined
                                ? adminResponseDraft[item.id]
                                : item.admin_response || ''
                            }
                            onChange={(e) =>
                              setAdminResponseDraft((prev) => ({
                                ...prev,
                                [item.id]: e.target.value,
                              }))
                            }
                            className="w-full h-8 px-2.5 rounded-lg bg-surface-raised border border-border/70 text-xs text-foreground placeholder:text-foreground-subtle focus:outline-none"
                          />
                        </div>

                        <Button
                          variant="primary"
                          size="sm"
                          onClick={() => handleUpdateFeedbackStatus(item)}
                          className="h-8 text-xs shrink-0"
                        >
                          Guardar resolución
                        </Button>
                      </div>
                    </Card>
                  ))}
              </div>
            )}
          </div>
        )}

        {/* ============================================================== */}
        {/* TAB 5: GUÍA SUPABASE (QUÉ DEBES HACER) */}
        {/* ============================================================== */}
        {activeTab === 'setup' && (
          <div className="space-y-5 max-w-3xl">
            <Card className="p-5 rounded-xl border-border/70 bg-surface space-y-4">
              <div className="flex items-center gap-2">
                <Database className="w-4 h-4 text-accent" />
                <h3 className="text-sm font-semibold text-foreground">
                  Instrucciones para configurar Supabase
                </h3>
              </div>
              <p className="text-xs text-foreground-muted leading-relaxed">
                Para que el feed en tiempo real, las notificaciones web push y las actualizaciones automáticas funcionen correctamente para todos los usuarios, debes ejecutar el script SQL de migración en tu proyecto de Supabase.
              </p>

              <div className="space-y-3 pt-1">
                <div className="p-3.5 rounded-xl bg-surface-raised border border-border/70 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                      <Terminal className="w-3.5 h-3.5 text-accent" />
                      <span>1. Ejecutar Migración SQL</span>
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText(`-- Migración SMR2: Realtime, Push y Anuncios
ALTER TABLE public.chat_messages ADD COLUMN IF NOT EXISTS pinned BOOLEAN DEFAULT false;
ALTER TABLE public.chat_messages ADD COLUMN IF NOT EXISTS reply_to_username TEXT;

CREATE TABLE IF NOT EXISTS public.chat_message_likes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  message_id UUID REFERENCES public.chat_messages(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE(message_id, user_id)
);

CREATE TABLE IF NOT EXISTS public.push_subscriptions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  username TEXT,
  endpoint TEXT UNIQUE NOT NULL,
  p256dh TEXT NOT NULL,
  auth TEXT NOT NULL,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.announcements (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  tag TEXT DEFAULT 'Aviso' NOT NULL,
  url TEXT DEFAULT '/',
  author_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  author_username TEXT NOT NULL DEFAULT 'SMR2',
  sent_to_push BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.app_updates (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  version TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  changes JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.chat_message_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.app_updates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Lectura pública de likes" ON public.chat_message_likes FOR SELECT USING (true);
CREATE POLICY "Insertar likes" ON public.chat_message_likes FOR INSERT WITH CHECK (true);
CREATE POLICY "Eliminar likes" ON public.chat_message_likes FOR DELETE USING (true);
CREATE POLICY "Lectura suscripciones push" ON public.push_subscriptions FOR SELECT USING (true);
CREATE POLICY "Gestión suscripciones push" ON public.push_subscriptions FOR ALL USING (true);
CREATE POLICY "Lectura anuncios" ON public.announcements FOR SELECT USING (true);
CREATE POLICY "Inserción anuncios" ON public.announcements FOR INSERT WITH CHECK (true);
CREATE POLICY "Lectura app_updates" ON public.app_updates FOR SELECT USING (true);

ALTER TABLE public.chat_messages REPLICA IDENTITY FULL;
ALTER TABLE public.chat_message_likes REPLICA IDENTITY FULL;
ALTER TABLE public.announcements REPLICA IDENTITY FULL;
ALTER TABLE public.app_updates REPLICA IDENTITY FULL;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'chat_messages') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_messages;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'chat_message_likes') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_message_likes;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'announcements') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.announcements;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'app_updates') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.app_updates;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'community_feedback') THEN
    IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'community_feedback') THEN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.community_feedback;
    END IF;
  END IF;
END $$;`);
                        setCopiedScript(true);
                        setTimeout(() => setCopiedScript(false), 2000);
                      }}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-medium bg-background border border-border/80 text-foreground hover:bg-surface transition-colors cursor-pointer"
                    >
                      {copiedScript ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                      <span>{copiedScript ? 'Copiado' : 'Copiar SQL'}</span>
                    </button>
                  </div>
                  <p className="text-[11px] text-foreground-muted">
                    Entra en tu panel de <span className="text-foreground font-medium">Supabase &gt; SQL Editor</span>, pega el script que se encuentra en <code className="text-accent font-mono">supabase/feed_and_push_migration.sql</code> y haz clic en <span className="font-semibold text-foreground">Run</span>.
                  </p>
                </div>

                <div className="p-3.5 rounded-xl bg-surface-raised border border-border/70 space-y-2">
                  <span className="text-xs font-semibold text-foreground block">
                    2. Variables de Entorno en Vercel
                  </span>
                  <p className="text-[11px] text-foreground-muted leading-relaxed">
                    Asegúrate de tener configuradas las siguientes variables en los Settings de Vercel (<span className="text-foreground font-medium">Project Settings &gt; Environment Variables</span>):
                  </p>
                  <ul className="text-[11px] font-mono space-y-1 text-foreground-muted">
                    <li>• <span className="text-accent">NEXT_PUBLIC_SUPABASE_URL</span></li>
                    <li>• <span className="text-accent">NEXT_PUBLIC_SUPABASE_ANON_KEY</span></li>
                    <li>• <span className="text-accent">SUPABASE_SERVICE_ROLE_KEY</span></li>
                    <li>• <span className="text-accent">NEXT_PUBLIC_VAPID_PUBLIC_KEY</span></li>
                    <li>• <span className="text-accent">VAPID_PRIVATE_KEY</span></li>
                  </ul>
                </div>
              </div>
            </Card>
          </div>
        )}
      </main>

      {/* Inspect Log Modal */}
      {selectedLog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <Card className="max-w-lg w-full p-5 space-y-4 rounded-2xl border-border/80 shadow-2xl">
            <div className="flex items-center justify-between border-b border-border/70 pb-3">
              <h3 className="font-bold text-sm text-foreground">Detalle del Evento de Auditoría</h3>
              <button
                type="button"
                onClick={() => setSelectedLog(null)}
                className="w-8 h-8 rounded-lg text-foreground-muted hover:text-foreground hover:bg-surface-raised flex items-center justify-center transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="space-y-2 text-xs font-mono">
              <div>
                <span className="text-foreground-subtle">ID Evento:</span> {selectedLog.id}
              </div>
              <div>
                <span className="text-foreground-subtle">Tipo:</span>{' '}
                <span className="text-accent font-bold">{selectedLog.event_type}</span>
              </div>
              <div>
                <span className="text-foreground-subtle">Fecha:</span> {selectedLog.created_at}
              </div>
              <div>
                <span className="text-foreground-subtle">Usuario:</span> @{selectedLog.username} ({selectedLog.user_id})
              </div>
              <div>
                <span className="text-foreground-subtle">IP:</span> {selectedLog.ip_address}
              </div>
              <div>
                <span className="text-foreground-subtle">Navegador:</span> {selectedLog.user_agent}
              </div>
              <div>
                <span className="text-foreground-subtle block mb-1">Carga de Datos (JSON):</span>
                <pre className="p-3 rounded-lg bg-surface-raised border border-border/70 text-foreground font-mono overflow-x-auto text-[11px]">
                  {JSON.stringify(selectedLog.details, null, 2)}
                </pre>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Adjust Coins Modal */}
      {adjustModalUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <Card className="max-w-sm w-full p-5 space-y-4 rounded-2xl border-border/80 shadow-2xl">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-sm text-foreground">
                Ajustar Fichas · @{adjustModalUser.username}
              </h3>
              <button
                type="button"
                onClick={() => setAdjustModalUser(null)}
                className="w-8 h-8 rounded-lg text-foreground-muted hover:text-foreground flex items-center justify-center cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-foreground-muted">
              Saldo actual:{' '}
              <span className="text-amber-500 font-bold font-mono">
                {adjustModalUser.coins.toLocaleString('es-ES')}
              </span>{' '}
              fichas. Introduce un valor positivo para ingresar o negativo para descontar:
            </p>

            <input
              type="number"
              value={adjustAmount}
              onChange={(e) => setAdjustAmount(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-surface-raised border border-border/70 text-sm text-foreground font-mono focus:outline-none focus:ring-1 focus:ring-accent"
            />

            <div className="flex items-center justify-end gap-2 pt-2">
              <Button
                variant="secondary"
                size="sm"
                className="rounded-xl"
                onClick={() => setAdjustModalUser(null)}
              >
                Cancelar
              </Button>
              <Button
                variant="primary"
                size="sm"
                className="rounded-xl"
                onClick={handleAdjustCoins}
              >
                Confirmar Ajuste
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
