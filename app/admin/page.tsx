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
  Lightbulb,
  Trash2,
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
  const [activeTab, setActiveTab] = useState<'logs' | 'users' | 'game' | 'feedback'>('logs');

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
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedLog, setSelectedLog] = useState<EventLogEntry | null>(null);

  // Users state
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [adjustModalUser, setAdjustModalUser] = useState<AdminUser | null>(null);
  const [adjustAmount, setAdjustAmount] = useState<string>('500');
  const [isResettingDb, setIsResettingDb] = useState(false);

  // Game detail state
  const [gameIdInput, setGameIdInput] = useState('');
  const [gameDetail, setGameDetail] = useState<any | null>(null);
  const [gameDetailLoading, setGameDetailLoading] = useState(false);

  // Claim admin state
  const [accessCodeInput, setAccessCodeInput] = useState('');
  const [claimLoading, setClaimLoading] = useState(false);
  const [claimError, setClaimError] = useState<string | null>(null);
  const [claimSuccess, setClaimSuccess] = useState<string | null>(null);

  // Check auth
  useEffect(() => {
    const user = getUserSession();
    setSessionUser(user);
    if (user && (user.role === 'admin' || user.role === 'delegado')) {
      setIsAdmin(true);
    } else {
      setIsAdmin(false);
    }
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
        setClaimSuccess(data.message || '¡Acceso de delegado concedido!');
        if (data.user) {
          saveUserSession(data.user);
          setSessionUser(data.user);
        }
        setIsAdmin(true);
      } else {
        setClaimError(data.error || 'Código incorrecto. Verifica la clave.');
      }
    } catch (err: any) {
      setClaimError(err?.message || 'Error de conexión.');
    } finally {
      setClaimLoading(false);
    }
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
        if (searchQuery.trim()) params.set('search', searchQuery.trim());

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
    [eventTypeFilter, searchQuery]
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

  useEffect(() => {
    if (isAdmin) {
      if (activeTab === 'logs') fetchLogs(page);
      if (activeTab === 'users') fetchUsers();
    }
  }, [isAdmin, activeTab, fetchLogs, fetchUsers, page]);

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
    const reason = !u.is_banned ? prompt('Motivo de la suspensión:') || 'Decisión de administrador' : undefined;

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

  // Feedback Handlers
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
      fetchFeedback();
    }
  }, [isAdmin, fetchFeedback]);

  const handleUpdateFeedbackStatus = async (item: CommunityFeedback) => {
    const status = adminStatusDraft[item.id] || item.status;
    const response = adminResponseDraft[item.id] !== undefined ? adminResponseDraft[item.id] : item.admin_response;

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
    if (!confirm('¿Seguro que quieres eliminar esta aportación?')) return;
    try {
      await deleteFeedbackItem(id);
      fetchFeedback();
    } catch (err: any) {
      alert(err?.message || 'Error al eliminar');
    }
  };

  // Fetch game timeline detail
  const handleFetchGameDetail = async (idToFetch?: string) => {
    const id = idToFetch || gameIdInput.trim();
    if (!id) return;
    setGameDetailLoading(true);
    try {
      const res = await fetch(`/api/admin/game/${id}`);
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setGameDetail(data);
          setActiveTab('game');
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setGameDetailLoading(false);
    }
  };

  // Computed summary metrics
  const totalCoinsInCirculation = useMemo(() => {
    return users.reduce((acc, u) => acc + (Number(u.coins) || 0), 0);
  }, [users]);

  const bannedUsersCount = useMemo(() => {
    return users.filter((u) => u.is_banned).length;
  }, [users]);

  if (isAdmin === null) {
    return (
      <div className="min-h-screen bg-background text-foreground flex items-center justify-center font-sans text-sm">
        <div className="flex items-center gap-3">
          <RefreshCw className="w-4 h-4 text-accent animate-spin" />
          <span className="text-foreground-muted">Verificando credenciales de administrador...</span>
        </div>
      </div>
    );
  }

  if (isAdmin === false) {
    return (
      <div className="min-h-screen bg-background text-foreground flex flex-col items-center justify-center p-4">
        <Card className="max-w-md w-full p-6 sm:p-7 text-center space-y-5 rounded-2xl border-border/80 shadow-xs bg-surface/90">
          <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-500 flex items-center justify-center mx-auto">
            <Lock className="w-6 h-6" />
          </div>

          <div className="space-y-1.5">
            <Badge variant="outline" className="text-[11px] font-semibold text-amber-500 border-amber-500/30">
              Solo Administradores de 2º SMR
            </Badge>
            <h1 className="text-lg font-semibold tracking-tight text-foreground">Acceso de Administración</h1>
            <p className="text-xs text-foreground-muted leading-relaxed">
              Introduce la clave oficial de administración (<code className="text-accent font-semibold">2026papu</code>) para acceder al panel de control.
            </p>
          </div>

          <form onSubmit={handleClaimAdmin} className="space-y-3.5 pt-1">
            <div className="space-y-1.5 text-left">
              <label className="text-xs font-medium text-foreground-muted">
                Clave de administrador:
              </label>
              <div className="relative">
                <input
                  type="password"
                  value={accessCodeInput}
                  onChange={(e) => setAccessCodeInput(e.target.value)}
                  placeholder="Introduce la clave 2026papu..."
                  className="w-full px-3.5 py-2.5 text-sm rounded-xl bg-background border border-border focus:outline-hidden focus:border-accent focus:ring-1 focus:ring-accent transition-all text-center tracking-wider font-mono"
                  autoFocus
                />
              </div>
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
              <span>Acceder al Panel Admin</span>
            </Button>
          </form>

          <div className="pt-2 border-t border-border/60 text-left space-y-2">
            <p className="text-[11px] text-foreground-muted font-mono leading-relaxed">
              <span className="font-semibold text-foreground">Clave oficial:</span> <code className="bg-surface-active px-1.5 py-0.5 rounded text-[11px] text-accent select-all">2026papu</code>
            </p>
          </div>

          <div className="pt-1">
            <Link href="/">
              <Button variant="ghost" size="sm" className="rounded-xl text-xs w-full">
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Volver al portal</span>
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
              <span className="font-semibold text-sm tracking-tight text-foreground">Panel de Control SMR2</span>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <span className="text-xs text-foreground-muted hidden sm:inline font-mono">
              Admin: <span className="text-accent font-semibold">@{sessionUser?.username || 'delegado'}</span>
            </span>
            <a
              href="/api/admin/logs?format=csv"
              download
              className="inline-flex items-center gap-1.5 px-3 h-9 rounded-xl bg-surface-raised border border-border/70 text-foreground hover:bg-surface text-xs font-medium transition-colors cursor-pointer active:scale-95 touch-manipulation"
            >
              <Download className="w-3.5 h-3.5 text-accent" />
              <span className="hidden xs:inline">Exportar CSV</span>
            </a>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="max-w-7xl mx-auto px-4 py-6 space-y-6">
        {/* Minimalist Metrics Strip */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="p-4 rounded-xl bg-surface border border-border/70 space-y-1">
            <span className="text-[10px] uppercase font-mono tracking-wider text-foreground-subtle block">Alumnos Registrados</span>
            <div className="text-xl font-bold font-mono text-foreground">{users.length}</div>
            <span className="text-[11px] text-foreground-muted">2º SMR</span>
          </div>

          <div className="p-4 rounded-xl bg-surface border border-border/70 space-y-1">
            <span className="text-[10px] uppercase font-mono tracking-wider text-foreground-subtle block">Fichas en Circulación</span>
            <div className="text-xl font-bold font-mono text-amber-500 tabular-nums">
              {totalCoinsInCirculation.toLocaleString('es-ES')}
            </div>
            <span className="text-[11px] text-foreground-muted">Economía total</span>
          </div>

          <div className="p-4 rounded-xl bg-surface border border-border/70 space-y-1">
            <span className="text-[10px] uppercase font-mono tracking-wider text-foreground-subtle block">Registros de Auditoría</span>
            <div className="text-xl font-bold font-mono text-accent tabular-nums">{totalLogs}</div>
            <span className="text-[11px] text-foreground-muted">Eventos guardados</span>
          </div>

          <div className="p-4 rounded-xl bg-surface border border-border/70 space-y-1">
            <span className="text-[10px] uppercase font-mono tracking-wider text-foreground-subtle block">Cuentas Suspendidas</span>
            <div className="text-xl font-bold font-mono text-foreground">{bannedUsersCount}</div>
            <span className="text-[11px] text-foreground-muted">Por infracciones</span>
          </div>
        </div>

        {/* Minimalist Navigation Tabs (Apple Segmented Style) */}
        <div className="flex items-center p-1 rounded-xl bg-surface-raised border border-border/70 max-w-fit gap-1 shadow-2xs">
          <button
            type="button"
            onClick={() => setActiveTab('logs')}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
              activeTab === 'logs'
                ? 'bg-foreground text-background font-semibold shadow-xs'
                : 'text-foreground-muted hover:text-foreground'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Auditoría de Eventos ({totalLogs})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('users')}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
              activeTab === 'users'
                ? 'bg-foreground text-background font-semibold shadow-xs'
                : 'text-foreground-muted hover:text-foreground'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>Alumnos y Fichas ({users.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('game')}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
              activeTab === 'game'
                ? 'bg-foreground text-background font-semibold shadow-xs'
                : 'text-foreground-muted hover:text-foreground'
            }`}
          >
            <Gamepad2 className="w-3.5 h-3.5" />
            <span>Inspección de Partida</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('feedback')}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
              activeTab === 'feedback'
                ? 'bg-foreground text-background font-semibold shadow-xs'
                : 'text-foreground-muted hover:text-foreground'
            }`}
          >
            <Lightbulb className="w-3.5 h-3.5 text-amber-500" />
            <span>Ideas y Reportes ({feedbackList.length})</span>
          </button>
        </div>

        {/* ============================================================== */}
        {/* TAB 1: AUDIT LOGS TABLE */}
        {/* ============================================================== */}
        {activeTab === 'logs' && (
          <div className="space-y-4">
            {/* Filters Bar */}
            <div className="p-3 rounded-xl bg-surface border border-border/70 flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-2.5 flex-1 min-w-[280px]">
                <div className="relative flex-1 min-w-[200px]">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-foreground-subtle" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
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

            {/* Table */}
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

                      const isDischarge = log.event_type === 'player_eliminated';
                      const isWin = log.event_type === 'game_won';
                      const isTurn = log.event_type === 'turn_executed';

                      return (
                        <tr key={log.id} className="hover:bg-surface-raised/60 transition-colors">
                          <td className="py-2.5 px-3 text-foreground-muted whitespace-nowrap text-[11px] font-mono">
                            {dateStr}
                          </td>
                          <td className="py-2.5 px-3 whitespace-nowrap">
                            <Badge
                              variant={
                                isDischarge
                                  ? 'danger'
                                  : isWin
                                  ? 'accent'
                                  : isTurn
                                  ? 'default'
                                  : 'default'
                              }
                              size="sm"
                            >
                              {log.event_type}
                            </Badge>
                          </td>
                          <td className="py-2.5 px-3 text-foreground font-semibold font-mono">
                            {log.username ? `@${log.username}` : '—'}
                          </td>
                          <td className="py-2.5 px-3 text-foreground-muted font-mono text-[11px]">
                            {log.room_id ? (
                              <button
                                onClick={() => log.game_id && handleFetchGameDetail(log.game_id)}
                                className="hover:text-accent transition-colors text-left cursor-pointer"
                                title="Ver detalles de partida"
                              >
                                {log.room_id.slice(0, 8)}...
                              </button>
                            ) : (
                              '—'
                            )}
                          </td>
                          <td className="py-2.5 px-3 text-foreground-subtle font-mono text-[11px]">
                            {log.ip_address || '127.0.0.1'}
                          </td>
                          <td className="py-2.5 px-3 text-foreground-muted max-w-xs truncate text-[11px] font-mono">
                            {JSON.stringify(log.details)}
                          </td>
                          <td className="py-2.5 px-3 text-right">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 text-xs"
                              onClick={() => setSelectedLog(log)}
                            >
                              Inspeccionar
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
        {/* TAB 2: USERS & BALANCE MANAGEMENT */}
        {/* ============================================================== */}
        {activeTab === 'users' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-foreground">
                Listado Oficial de Alumnos ({users.length})
              </h2>
              <Button
                variant="secondary"
                size="sm"
                className="rounded-lg h-8"
                onClick={fetchUsers}
              >
                <RefreshCw className={`w-3.5 h-3.5 ${usersLoading ? 'animate-spin' : ''}`} />
                <span>Actualizar</span>
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
                  {users.map((u) => (
                    <tr key={u.id} className="hover:bg-surface-raised/60 transition-colors">
                      <td className="py-2.5 px-3">
                        <div className="font-semibold text-foreground font-mono">@{u.username}</div>
                        <div className="text-[10px] text-foreground-subtle font-mono truncate max-w-[160px]">{u.email || u.id}</div>
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
                          <Badge variant="danger" size="sm">Suspendido</Badge>
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
                  ))}
                </tbody>
              </table>
            </div>

            {/* Zona de Mantenimiento / Reinicio General de Temporada */}
            <div className="p-4 rounded-xl bg-surface border border-border/70 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <h4 className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                  <AlertTriangle className="w-4 h-4 text-amber-500" />
                  <span>Reinicio Total de Temporada</span>
                </h4>
                <p className="text-xs text-foreground-muted mt-0.5">
                  Restablece a 1.000 monedas a todos los alumnos de la clase, limpia el chat y las partidas para iniciar una nueva temporada.
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
          </div>
        )}

        {/* ============================================================== */}
        {/* TAB 3: GAME TIMELINE INSPECTOR */}
        {/* ============================================================== */}
        {activeTab === 'game' && (
          <div className="space-y-4">
            <div className="p-3 rounded-xl bg-surface border border-border/70 flex items-center gap-3">
              <input
                type="text"
                value={gameIdInput}
                onChange={(e) => setGameIdInput(e.target.value)}
                placeholder="Pegar ID de la partida (UUID)..."
                className="flex-1 h-9 px-3 rounded-lg bg-surface-raised border border-border/70 text-xs text-foreground font-mono placeholder:text-foreground-subtle focus:outline-none focus:ring-1 focus:ring-accent"
              />
              <Button
                variant="primary"
                size="sm"
                className="h-9 rounded-lg"
                onClick={() => handleFetchGameDetail()}
              >
                {gameDetailLoading ? 'Buscando...' : 'Inspeccionar'}
              </Button>
            </div>

            {gameDetail ? (
              <Card className="space-y-4 p-5 rounded-xl border-border/70">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/70 pb-4">
                  <div>
                    <h3 className="text-sm font-bold text-foreground font-mono">
                      Partida: {gameDetail.game?.id}
                    </h3>
                    <p className="text-xs text-foreground-muted mt-0.5">
                      Estado: <span className="text-accent font-semibold">{gameDetail.game?.status}</span> •
                      Ganador: <span className="text-foreground font-semibold font-mono">@{gameDetail.game?.winner_username || 'N/A'}</span>
                    </p>
                  </div>
                  <div className="px-3 py-1.5 rounded-lg bg-surface-raised border border-border/70 text-xs text-foreground-muted font-mono">
                    Recámara con Descarga:{' '}
                    <span className="text-danger font-bold">#{gameDetail.game?.bullet_chamber}</span>
                  </div>
                </div>

                <div className="space-y-3 pt-2">
                  <h4 className="text-xs font-semibold text-foreground-muted uppercase tracking-wider font-mono">
                    Secuencia Cronológica de Turnos
                  </h4>

                  {gameDetail.turns && gameDetail.turns.length > 0 ? (
                    <div className="relative pl-6 space-y-4 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-border/70">
                      {gameDetail.turns.map((turn: any, i: number) => {
                        const isDischarge = turn.result === 'discharge' || turn.result === 'timeout';
                        return (
                          <div key={turn.id || i} className="relative flex items-start gap-3">
                            <div
                              className={`absolute -left-6 top-1 w-3 h-3 rounded-full border-2 ${
                                isDischarge
                                  ? 'bg-danger border-danger'
                                  : 'bg-accent border-accent'
                              }`}
                            />
                            <div className="flex-1 p-3 rounded-lg bg-surface-raised border border-border/70 space-y-1">
                              <div className="flex items-center justify-between">
                                <span className="font-semibold text-foreground text-xs font-mono">
                                  Paso #{i + 1} — @{turn.player_username}
                                </span>
                                <span className="text-[10px] text-foreground-subtle font-mono">
                                  {new Date(turn.created_at).toLocaleTimeString('es-ES')}
                                </span>
                              </div>
                              <p className="text-xs text-foreground-muted">
                                Recámara{' '}
                                <span className="font-bold text-accent font-mono">#{turn.chamber_index}</span>:
                                {isDischarge ? (
                                  <span className="text-danger font-bold ml-1">
                                    Descarga (Eliminado)
                                  </span>
                                ) : (
                                  <span className="text-foreground font-bold ml-1">
                                    En Blanco (Sobrevivió)
                                  </span>
                                )}
                              </p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="text-xs text-foreground-subtle py-4">No hay turnos registrados para esta partida.</p>
                  )}
                </div>
              </Card>
            ) : (
              <div className="p-8 text-center text-foreground-subtle rounded-xl border border-border/70 bg-surface text-xs">
                Introduce el identificador de una partida o selecciona una fila de logs para inspeccionarla.
              </div>
            )}
          </div>
        )}

        {/* ============================================================== */}
        {/* TAB 4: IDEAS Y REPORTES COMUNITARIOS */}
        {/* ============================================================== */}
        {activeTab === 'feedback' && (
          <div className="space-y-4">
            <div className="p-3.5 rounded-xl bg-surface border border-border/70 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Lightbulb className="w-4 h-4 text-amber-500" />
                <span className="text-xs font-semibold text-foreground">
                  Gestión de ideas, sugerencias y fallos reportados
                </span>
              </div>

              <div className="flex items-center gap-2">
                <select
                  value={feedbackFilter}
                  onChange={(e) => setFeedbackFilter(e.target.value as any)}
                  className="h-8 px-2.5 rounded-lg bg-surface-raised border border-border/70 text-xs text-foreground"
                >
                  <option value="all">Todos los estados</option>
                  <option value="pending">Pendientes</option>
                  <option value="under_review">En revisión</option>
                  <option value="planned">Planificados</option>
                  <option value="completed">Implementados</option>
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
                Cargando ideas y reportes...
              </div>
            ) : feedbackList.filter(f => feedbackFilter === 'all' || f.status === feedbackFilter).length === 0 ? (
              <div className="p-8 text-center text-foreground-subtle rounded-xl border border-border/70 bg-surface text-xs">
                No hay aportaciones registradas con este filtro.
              </div>
            ) : (
              <div className="space-y-3">
                {feedbackList
                  .filter(f => feedbackFilter === 'all' || f.status === feedbackFilter)
                  .map((item) => (
                    <Card key={item.id} className="p-4 rounded-xl border-border/70 bg-surface space-y-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="space-y-1 min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <Badge variant={item.type === 'report' ? 'danger' : item.type === 'idea' ? 'accent' : 'default'} size="sm">
                              {item.type === 'report' ? 'Reporte' : item.type === 'idea' ? 'Idea' : 'Mejora'}
                            </Badge>
                            <span className="text-[11px] text-foreground-subtle uppercase font-mono">
                              {item.category}
                            </span>
                            <span className="text-[11px] text-foreground-subtle font-mono">
                              · {item.upvotes_count} votos
                            </span>
                          </div>
                          <h4 className="text-sm font-bold text-foreground">{item.title}</h4>
                          <p className="text-xs text-foreground-muted whitespace-pre-wrap">{item.description}</p>
                          <div className="text-[11px] text-foreground-subtle pt-1">
                            Enviado por <span className="font-semibold text-foreground">@{item.author_name}</span> el {new Date(item.created_at).toLocaleDateString('es-ES')}
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleDeleteFeedback(item.id)}
                          className="p-1.5 rounded-lg text-foreground-subtle hover:text-danger hover:bg-danger-subtle transition-colors cursor-pointer"
                          title="Eliminar reporte"
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
                            onChange={(e) => setAdminStatusDraft(prev => ({ ...prev, [item.id]: e.target.value as FeedbackStatus }))}
                            className="h-8 px-2 rounded-lg bg-surface-raised border border-border/70 text-xs text-foreground"
                          >
                            <option value="pending">Pendiente</option>
                            <option value="under_review">En revisión</option>
                            <option value="planned">Planificado</option>
                            <option value="completed">Implementado</option>
                            <option value="dismissed">Descartado</option>
                          </select>
                        </div>

                        <div className="flex-1 min-w-[200px]">
                          <input
                            type="text"
                            placeholder="Respuesta oficial pública visible para todos los alumnos..."
                            value={adminResponseDraft[item.id] !== undefined ? adminResponseDraft[item.id] : item.admin_response || ''}
                            onChange={(e) => setAdminResponseDraft(prev => ({ ...prev, [item.id]: e.target.value }))}
                            className="w-full h-8 px-2.5 rounded-lg bg-surface-raised border border-border/70 text-xs text-foreground placeholder:text-foreground-subtle focus:outline-none"
                          />
                        </div>

                        <Button
                          variant="primary"
                          size="sm"
                          onClick={() => handleUpdateFeedbackStatus(item)}
                          className="h-8 text-xs shrink-0"
                        >
                          Guardar respuesta
                        </Button>
                      </div>
                    </Card>
                  ))}
              </div>
            )}
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
              <span className="text-amber-500 font-bold font-mono">{adjustModalUser.coins.toLocaleString('es-ES')}</span> fichas.
              Introduce un valor positivo para ingresar o negativo para descontar:
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
