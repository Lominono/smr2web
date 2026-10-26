'use client';

import React, { useState, useEffect, useCallback } from 'react';
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
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { EventLogEntry } from '@/lib/russianRoulette';
import { UserProfile } from '@/lib/types';
import { getUserSession } from '@/lib/authSession';

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
  const [activeTab, setActiveTab] = useState<'logs' | 'users' | 'game'>('logs');

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

  // Game detail state
  const [gameIdInput, setGameIdInput] = useState('');
  const [gameDetail, setGameDetail] = useState<any | null>(null);
  const [gameDetailLoading, setGameDetailLoading] = useState(false);

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

  // Full Database Reset handler (Nueva Temporada)
  const [isResettingDb, setIsResettingDb] = useState(false);
  const handleResetDatabase = async () => {
    const confirmation = window.prompt(
      '¿Estás seguro de que quieres REINICIAR LA BASE DE DATOS DE TODOS LOS ALUMNOS?\n\n' +
      'Esto restablecerá el saldo de todos a 1.000 monedas, vaciará el chat y reiniciará el ranking de la clase.\n\n' +
      'Escribe "REINICIAR" para confirmar:'
    );

    if (confirmation !== 'REINICIAR') {
      return;
    }

    setIsResettingDb(true);
    try {
      const res = await fetch('/api/admin/reset-database', { method: 'POST' });
      const data = await res.json();
      if (res.ok && data.success) {
        alert('¡Base de datos reiniciada con éxito para toda la clase! Todos vuelven a tener 1.000 monedas.');
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

  if (isAdmin === null) {
    return (
      <div className="min-h-screen bg-background text-foreground flex items-center justify-center font-mono text-sm">
        <div className="flex items-center gap-3">
          <RefreshCw className="w-4 h-4 text-accent animate-spin" />
          <span>Verificando credenciales de administrador...</span>
        </div>
      </div>
    );
  }

  if (isAdmin === false) {
    return (
      <div className="min-h-screen bg-background text-foreground flex flex-col items-center justify-center p-4">
        <Card className="max-w-md w-full p-6 text-center space-y-4 rounded-2xl border-border/80 shadow-xs">
          <div className="w-12 h-12 rounded-2xl bg-danger-subtle border border-danger/25 text-danger flex items-center justify-center mx-auto">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <div className="space-y-1">
            <h1 className="text-base font-semibold tracking-tight text-foreground">Acceso Restringido · Solo Delegados</h1>
            <p className="text-xs text-danger font-medium">
              Los profesores y personas ajenas al alumnado no están permitidos en esta plataforma.
            </p>
          </div>
          <p className="text-xs text-foreground-muted leading-relaxed">
            Esta zona está reservada estrictamente a la delegación de alumnos de 2º SMR.
            Tu cuenta (@{sessionUser?.username || 'invitado'}) no tiene permisos de delegado.
          </p>
          <div className="pt-2">
            <Link href="/">
              <Button variant="primary" size="sm" className="rounded-xl">
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
    <div className="min-h-screen bg-background text-foreground font-mono antialiased pb-20">
      {/* Top Navbar */}
      <header className="sticky top-0 z-30 border-b border-border bg-surface/90 backdrop-blur-md pt-[env(safe-area-inset-top,0px)]">
        <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link href="/">
              <Button variant="secondary" size="sm" className="min-h-[40px] px-3 touch-manipulation">
                <ArrowLeft className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Volver</span>
              </Button>
            </Link>
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-[var(--radius-sm)] bg-surface-raised border border-border text-accent">
                <ShieldCheck className="w-4 h-4" />
              </span>
              <span className="font-semibold text-sm tracking-tight">Panel de Auditoría</span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-xs text-foreground-muted hidden sm:inline">
              Admin: <span className="text-accent font-semibold">@{sessionUser?.username || 'delegado'}</span>
            </span>
            <a
              href="/api/admin/logs?format=csv"
              download
              className="inline-flex items-center gap-1.5 px-3 min-h-[40px] rounded-[var(--radius)] bg-surface-raised border border-border text-foreground hover:bg-surface text-xs font-medium transition-colors cursor-pointer active:scale-95 touch-manipulation"
            >
              <Download className="w-3.5 h-3.5 text-accent" />
              <span className="hidden xs:inline">Exportar CSV</span>
            </a>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="max-w-7xl mx-auto px-4 py-6 space-y-6">
        {/* Navigation Tabs */}
        <div className="flex items-center gap-1.5 p-1 rounded-[var(--radius)] bg-surface border border-border max-w-fit">
          <Button
            variant={activeTab === 'logs' ? 'primary' : 'ghost'}
            size="sm"
            onClick={() => setActiveTab('logs')}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Logs ({totalLogs})</span>
          </Button>

          <Button
            variant={activeTab === 'users' ? 'primary' : 'ghost'}
            size="sm"
            onClick={() => setActiveTab('users')}
          >
            <Users className="w-3.5 h-3.5" />
            <span>Usuarios</span>
          </Button>

          <Button
            variant={activeTab === 'game' ? 'primary' : 'ghost'}
            size="sm"
            onClick={() => setActiveTab('game')}
          >
            <Gamepad2 className="w-3.5 h-3.5" />
            <span>Inspección de Partida</span>
          </Button>
        </div>

        {/* ============================================================== */}
        {/* TAB 1: AUDIT LOGS TABLE */}
        {/* ============================================================== */}
        {activeTab === 'logs' && (
          <div className="space-y-4">
            {/* Filters Bar */}
            <div className="p-3 rounded-[var(--radius)] bg-surface border border-border flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-2.5 flex-1 min-w-[280px]">
                <div className="relative flex-1 min-w-[180px]">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-foreground-subtle" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && fetchLogs(1)}
                    placeholder="Buscar por usuario, IP, detalle..."
                    className="w-full min-h-[44px] pl-9 pr-3 py-2 rounded-xl bg-surface-raised border border-border text-base sm:text-xs text-foreground placeholder:text-foreground-subtle focus:outline-none focus:border-border-focus"
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
                    className="w-full sm:w-auto min-h-[44px] px-3 py-2 rounded-[var(--radius)] bg-surface-raised border border-border text-base sm:text-xs text-foreground focus:outline-none focus:border-border-focus"
                  >
                    <option value="">Todos los eventos</option>
                    <option value="user_register">Registro de usuario</option>
                    <option value="user_login_success">Inicio de sesión OK</option>
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
                  onClick={() => fetchLogs(1)}
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${logsLoading ? 'animate-spin' : ''}`} />
                  <span>Actualizar</span>
                </Button>
              </div>

              <div className="text-xs text-foreground-subtle">
                Página {page} de {totalPages}
              </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto rounded-[var(--radius)] border border-border bg-surface">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-border bg-surface-raised text-foreground-muted font-medium">
                    <th className="py-2.5 px-3">Fecha y Hora</th>
                    <th className="py-2.5 px-3">Tipo de Evento</th>
                    <th className="py-2.5 px-3">Usuario</th>
                    <th className="py-2.5 px-3">Sala / Partida</th>
                    <th className="py-2.5 px-3">IP Origen</th>
                    <th className="py-2.5 px-3">Detalle</th>
                    <th className="py-2.5 px-3 text-right">Acción</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-subtle">
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
                        <tr key={log.id} className="hover:bg-surface-raised transition-colors">
                          <td className="py-2.5 px-3 text-foreground-muted whitespace-nowrap text-[11px]">
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
                          <td className="py-2.5 px-3 text-foreground font-semibold">
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
                          <td className="py-2.5 px-3 text-foreground-muted max-w-xs truncate text-[11px]">
                            {JSON.stringify(log.details)}
                          </td>
                          <td className="py-2.5 px-3 text-right">
                            <Button
                              variant="ghost"
                              size="sm"
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
            <div className="flex items-center justify-between pt-2">
              <span className="text-xs text-foreground-subtle">
                Mostrando {logs.length} de {totalLogs} registros totales
              </span>
              <div className="flex items-center gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                  <span>Anterior</span>
                </Button>
                <span className="text-xs text-foreground-muted px-2">
                  {page} / {totalPages}
                </span>
                <Button
                  variant="secondary"
                  size="sm"
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
                Cuentas de Usuarios ({users.length})
              </h2>
              <Button
                variant="secondary"
                size="sm"
                onClick={fetchUsers}
              >
                <RefreshCw className={`w-3.5 h-3.5 ${usersLoading ? 'animate-spin' : ''}`} />
                <span>Actualizar</span>
              </Button>
            </div>

            <div className="overflow-x-auto rounded-[var(--radius)] border border-border bg-surface">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-border bg-surface-raised text-foreground-muted font-medium">
                    <th className="py-2.5 px-3">Usuario</th>
                    <th className="py-2.5 px-3">Identificación (Nombre / Nº)</th>
                    <th className="py-2.5 px-3">Rol</th>
                    <th className="py-2.5 px-3">Saldo Fichas</th>
                    <th className="py-2.5 px-3">Partidas (G / J)</th>
                    <th className="py-2.5 px-3">Estado</th>
                    <th className="py-2.5 px-3 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-subtle">
                  {users.map((u) => (
                    <tr key={u.id} className="hover:bg-surface-raised transition-colors">
                      <td className="py-2.5 px-3">
                        <div className="font-semibold text-foreground">@{u.username}</div>
                        <div className="text-[10px] text-foreground-subtle font-mono">{u.email || u.id}</div>
                      </td>
                      <td className="py-2.5 px-3">
                        {u.full_name ? (
                          <div>
                            <div className="font-medium text-foreground text-xs">{u.full_name}</div>
                            <div className="text-[10px] text-accent font-mono font-semibold">
                              Nº {u.student_number || 'S/N'}
                            </div>
                          </div>
                        ) : (
                          <span className="text-foreground-subtle text-xs italic">Pendiente</span>
                        )}
                      </td>
                      <td className="py-2.5 px-3">
                        <Badge variant={u.role === 'admin' ? 'accent' : 'default'} size="sm">
                          {u.role}
                        </Badge>
                      </td>
                      <td className="py-2.5 px-3 font-semibold text-accent">
                        {u.coins.toLocaleString('es-ES')}
                      </td>
                      <td className="py-2.5 px-3 text-foreground-muted">
                        {u.games_won} / {u.games_played}
                      </td>
                      <td className="py-2.5 px-3">
                        {u.is_banned ? (
                          <Badge variant="danger" size="sm">Suspendido</Badge>
                        ) : (
                          <Badge variant="default" size="sm">Activo</Badge>
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-right space-x-2">
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => setAdjustModalUser(u)}
                        >
                          Ajustar
                        </Button>
                        <Button
                          variant={u.is_banned ? 'secondary' : 'danger'}
                          size="sm"
                          onClick={() => handleToggleBan(u)}
                        >
                          {u.is_banned ? 'Reactivar' : 'Suspender'}
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Zona de Mantenimiento / Reinicio General de Temporada */}
            <div className="p-4 rounded-2xl bg-red-950/20 border border-red-500/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <h4 className="text-xs font-bold font-mono text-red-300 flex items-center gap-1.5">
                  <ShieldAlert className="w-4 h-4 text-red-400" />
                  <span>Reinicio Total de la Base de Datos (Nueva Temporada)</span>
                </h4>
                <p className="text-xs text-foreground-muted mt-0.5">
                  Restablece a 1.000 monedas el saldo de todos los alumnos de la clase, vacía el chat y limpia las partidas para empezar una nueva competición.
                </p>
              </div>

              <Button
                variant="danger"
                size="sm"
                disabled={isResettingDb}
                onClick={handleResetDatabase}
                className="shrink-0"
              >
                {isResettingDb ? 'Reiniciando...' : 'Reiniciar base de datos de todos'}
              </Button>
            </div>
          </div>
        )}

        {/* ============================================================== */}
        {/* TAB 3: GAME TIMELINE INSPECTOR */}
        {/* ============================================================== */}
        {activeTab === 'game' && (
          <div className="space-y-4">
            <div className="p-3 rounded-[var(--radius)] bg-surface border border-border flex items-center gap-3">
              <input
                type="text"
                value={gameIdInput}
                onChange={(e) => setGameIdInput(e.target.value)}
                placeholder="Pegar ID de la partida (UUID)..."
                className="flex-1 px-3 py-1.5 rounded-[var(--radius)] bg-background border border-border text-xs text-foreground placeholder-foreground-subtle focus:outline-none focus:border-accent"
              />
              <Button
                variant="primary"
                size="sm"
                onClick={() => handleFetchGameDetail()}
              >
                {gameDetailLoading ? 'Buscando...' : 'Reconstruir Partida'}
              </Button>
            </div>

            {gameDetail ? (
              <Card className="space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-4">
                  <div>
                    <h3 className="text-sm font-bold text-foreground">
                      Partida: {gameDetail.game?.id}
                    </h3>
                    <p className="text-xs text-foreground-muted">
                      Estado: <span className="text-accent font-semibold">{gameDetail.game?.status}</span> •
                      Ganador: <span className="text-foreground font-semibold">@{gameDetail.game?.winner_username || 'N/A'}</span>
                    </p>
                  </div>
                  <div className="px-3 py-1.5 rounded-[var(--radius)] bg-surface-raised border border-border text-xs text-foreground-muted">
                    Recámara con Descarga:{' '}
                    <span className="text-danger font-bold">#{gameDetail.game?.bullet_chamber}</span>
                  </div>
                </div>

                <div className="space-y-3 pt-2">
                  <h4 className="text-xs font-semibold text-foreground-muted uppercase tracking-wider font-mono">
                    Secuencia Cronológica de Turnos
                  </h4>

                  {gameDetail.turns && gameDetail.turns.length > 0 ? (
                    <div className="relative pl-6 space-y-4 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-border">
                      {gameDetail.turns.map((turn: any, i: number) => {
                        const isDischarge = turn.result === 'discharge' || turn.result === 'timeout';
                        return (
                          <div key={turn.id || i} className="relative flex items-start gap-3">
                            <div
                              className={`absolute -left-6 top-1 w-3.5 h-3.5 rounded-full border-2 ${
                                isDischarge
                                  ? 'bg-danger border-danger'
                                  : 'bg-accent border-accent'
                              }`}
                            />
                            <div className="flex-1 p-3 rounded-[var(--radius)] bg-surface-raised border border-border space-y-1">
                              <div className="flex items-center justify-between">
                                <span className="font-semibold text-foreground text-xs">
                                  Paso #{i + 1} — @{turn.player_username}
                                </span>
                                <span className="text-[10px] text-foreground-subtle font-mono">
                                  {new Date(turn.created_at).toLocaleTimeString('es-ES')}
                                </span>
                              </div>
                              <p className="text-xs text-foreground-muted">
                                Recámara{' '}
                                <span className="font-bold text-accent">#{turn.chamber_index}</span>:
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
              <div className="p-8 text-center text-foreground-subtle rounded-[var(--radius)] border border-border bg-surface text-xs">
                Introduce el identificador de una partida o selecciona una fila de logs para inspeccionarla.
              </div>
            )}
          </div>
        )}
      </main>

      {/* Inspect Log Modal */}
      {selectedLog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <Card className="max-w-lg w-full p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h3 className="font-bold text-sm text-foreground">Detalle de Auditoría</h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedLog(null)}
              >
                Cerrar
              </Button>
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
                <pre className="p-3 rounded-[var(--radius)] bg-surface-raised border border-border text-foreground font-mono overflow-x-auto text-[11px]">
                  {JSON.stringify(selectedLog.details, null, 2)}
                </pre>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Adjust Coins Modal */}
      {adjustModalUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <Card className="max-w-sm w-full p-5 space-y-4">
            <h3 className="font-bold text-sm text-foreground">
              Ajustar Fichas a @{adjustModalUser.username}
            </h3>
            <p className="text-xs text-foreground-muted">
              Saldo actual:{' '}
              <span className="text-accent font-bold">{adjustModalUser.coins}</span> fichas.
              Introduce un valor positivo para ingresar o negativo para retirar:
            </p>
            <input
              type="number"
              value={adjustAmount}
              onChange={(e) => setAdjustAmount(e.target.value)}
              className="w-full px-3 py-2 rounded-[var(--radius)] bg-background border border-border text-sm text-foreground font-mono focus:outline-none focus:border-accent"
            />
            <div className="flex items-center justify-end gap-2 pt-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setAdjustModalUser(null)}
              >
                Cancelar
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={handleAdjustCoins}
              >
                Confirmar
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
