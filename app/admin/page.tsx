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
  Coins,
  Ban,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Eye,
  ChevronLeft,
  ChevronRight,
  Sparkles,
} from 'lucide-react';
import { EventLogEntry, EventType } from '@/lib/russianRoulette';
import { UserProfile } from '@/lib/types';
import { getUserSession } from '@/lib/authSession';

interface AdminUser {
  id: string;
  username: string;
  email?: string;
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
      // Check server API to see if user has admin privileges
      fetch('/api/admin/logs?limit=1')
        .then((res) => {
          if (res.ok) {
            setIsAdmin(true);
          } else {
            setIsAdmin(false);
          }
        })
        .catch(() => setIsAdmin(false));
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
      <div className="min-h-screen bg-[#070709] text-white flex items-center justify-center font-mono text-sm">
        <div className="flex items-center gap-3">
          <RefreshCw className="w-5 h-5 text-amber-400 animate-spin" />
          <span>Verificando credenciales de administrador...</span>
        </div>
      </div>
    );
  }

  if (isAdmin === false) {
    return (
      <div className="min-h-screen bg-[#070709] text-white flex flex-col items-center justify-center p-4 font-mono">
        <div className="max-w-md w-full p-6 rounded-2xl bg-white/[0.03] border border-rose-500/30 text-center space-y-4 shadow-2xl">
          <div className="w-14 h-14 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-center justify-center mx-auto">
            <ShieldAlert className="w-8 h-8" />
          </div>
          <h1 className="text-xl font-bold tracking-tight text-white">403 — Acceso Prohibido</h1>
          <p className="text-xs text-zinc-400 leading-relaxed">
            Esta zona está estrictamente restringida a usuarios con el rol{' '}
            <span className="text-rose-400 font-semibold">admin</span> en el servidor. Tu cuenta actual (@
            {sessionUser?.username || 'invitado'}) no cuenta con privilegios de auditoría.
          </p>
          <div className="pt-2">
            <Link
              href="/"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white text-black font-semibold text-xs transition-all hover:bg-zinc-200"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Volver a SMR2</span>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#070709] text-white font-mono antialiased pb-20">
      {/* Top Navbar */}
      <header className="sticky top-0 z-30 border-b border-white/[0.08] bg-[#070709]/90 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="p-1.5 rounded-xl bg-white/[0.05] border border-white/10 hover:bg-white/10 text-zinc-400 hover:text-white transition-all"
              title="Volver a la aplicación"
            >
              <ArrowLeft className="w-4 h-4" />
            </Link>
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400">
                <ShieldCheck className="w-4 h-4" />
              </span>
              <span className="font-bold text-sm tracking-tight">SMR2 / Panel de Auditoría y Control</span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-xs text-zinc-400 hidden sm:inline">
              Admin: <span className="text-amber-400 font-semibold">@{sessionUser?.username || 'delegado'}</span>
            </span>
            <a
              href="/api/admin/logs?format=csv"
              download
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/20 text-xs font-semibold transition-all cursor-pointer active:scale-95"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Exportar CSV</span>
            </a>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="max-w-7xl mx-auto px-4 py-6 space-y-6">
        {/* Navigation Tabs */}
        <div className="flex items-center gap-2 p-1 rounded-2xl bg-white/[0.03] border border-white/[0.08] max-w-fit">
          <button
            onClick={() => setActiveTab('logs')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              activeTab === 'logs'
                ? 'bg-amber-400 text-black shadow-md'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            <FileText className="w-4 h-4" />
            <span>Logs de Auditoría ({totalLogs})</span>
          </button>

          <button
            onClick={() => setActiveTab('users')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              activeTab === 'users'
                ? 'bg-amber-400 text-black shadow-md'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>Usuarios y Balances</span>
          </button>

          <button
            onClick={() => setActiveTab('game')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              activeTab === 'game'
                ? 'bg-amber-400 text-black shadow-md'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            <Gamepad2 className="w-4 h-4" />
            <span>Línea de Tiempo de Partida</span>
          </button>
        </div>

        {/* ============================================================== */}
        {/* TAB 1: AUDIT LOGS TABLE */}
        {/* ============================================================== */}
        {activeTab === 'logs' && (
          <div className="space-y-4">
            {/* Filters Bar */}
            <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/[0.08] flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-2.5 flex-1 min-w-[280px]">
                <div className="relative flex-1 min-w-[180px]">
                  <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && fetchLogs(1)}
                    placeholder="Buscar por usuario, IP, detalle..."
                    className="w-full pl-9 pr-3 py-1.5 rounded-xl bg-black/60 border border-white/10 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-amber-400/50"
                  />
                </div>

                <div className="flex items-center gap-1.5">
                  <Filter className="w-3.5 h-3.5 text-zinc-400" />
                  <select
                    value={eventTypeFilter}
                    onChange={(e) => {
                      setEventTypeFilter(e.target.value);
                      setPage(1);
                    }}
                    className="px-2.5 py-1.5 rounded-xl bg-black/60 border border-white/10 text-xs text-zinc-200 focus:outline-none focus:border-amber-400/50"
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

                <button
                  onClick={() => fetchLogs(1)}
                  className="px-3 py-1.5 rounded-xl bg-white/[0.05] border border-white/10 hover:bg-white/10 text-xs text-zinc-300 flex items-center gap-1.5 transition-all cursor-pointer"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${logsLoading ? 'animate-spin' : ''}`} />
                  <span>Actualizar</span>
                </button>
              </div>

              <div className="text-[11px] text-zinc-500">
                Solo lectura • Registro inmutable • Página {page} de {totalPages}
              </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto rounded-2xl border border-white/[0.08] bg-black/40">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-white/[0.08] bg-white/[0.02] text-zinc-400 font-medium">
                    <th className="py-2.5 px-3">Fecha y Hora</th>
                    <th className="py-2.5 px-3">Tipo de Evento</th>
                    <th className="py-2.5 px-3">Usuario</th>
                    <th className="py-2.5 px-3">Sala / Partida</th>
                    <th className="py-2.5 px-3">IP Origen</th>
                    <th className="py-2.5 px-3">Detalle</th>
                    <th className="py-2.5 px-3 text-right">Acción</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.05]">
                  {logs.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-zinc-500">
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
                        <tr key={log.id} className="hover:bg-white/[0.02] transition-colors">
                          <td className="py-2.5 px-3 text-zinc-400 whitespace-nowrap text-[11px]">
                            {dateStr}
                          </td>
                          <td className="py-2.5 px-3 whitespace-nowrap">
                            <span
                              className={`px-2 py-0.5 rounded-md text-[10px] font-semibold border ${
                                isDischarge
                                  ? 'bg-rose-500/10 text-rose-400 border-rose-500/30'
                                  : isWin
                                  ? 'bg-amber-400/10 text-amber-300 border-amber-400/30'
                                  : isTurn
                                  ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                                  : 'bg-zinc-500/10 text-zinc-300 border-zinc-500/20'
                              }`}
                            >
                              {log.event_type}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-zinc-200 font-semibold">
                            {log.username ? `@${log.username}` : '—'}
                          </td>
                          <td className="py-2.5 px-3 text-zinc-400 font-mono text-[11px]">
                            {log.room_id ? (
                              <button
                                onClick={() => log.game_id && handleFetchGameDetail(log.game_id)}
                                className="hover:text-amber-400 transition-colors text-left"
                                title="Ver detalles de partida"
                              >
                                {log.room_id.slice(0, 8)}...
                              </button>
                            ) : (
                              '—'
                            )}
                          </td>
                          <td className="py-2.5 px-3 text-zinc-500 font-mono text-[11px]">
                            {log.ip_address || '127.0.0.1'}
                          </td>
                          <td className="py-2.5 px-3 text-zinc-400 max-w-xs truncate text-[11px]">
                            {JSON.stringify(log.details)}
                          </td>
                          <td className="py-2.5 px-3 text-right">
                            <button
                              onClick={() => setSelectedLog(log)}
                              className="px-2 py-1 rounded-lg bg-white/[0.05] hover:bg-white/10 text-zinc-300 hover:text-white transition-all text-[11px]"
                            >
                              Inspeccionar
                            </button>
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
              <span className="text-xs text-zinc-500">
                Mostrando {logs.length} de {totalLogs} registros totales
              </span>
              <div className="flex items-center gap-2">
                <button
                  disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  className="px-3 py-1.5 rounded-xl bg-white/[0.05] border border-white/10 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-white/10 text-xs flex items-center gap-1"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                  <span>Anterior</span>
                </button>
                <span className="text-xs text-zinc-400 px-2">
                  {page} / {totalPages}
                </span>
                <button
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  className="px-3 py-1.5 rounded-xl bg-white/[0.05] border border-white/10 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-white/10 text-xs flex items-center gap-1"
                >
                  <span>Siguiente</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
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
              <h2 className="text-sm font-bold text-zinc-300">
                Cuentas de Usuarios ({users.length})
              </h2>
              <button
                onClick={fetchUsers}
                className="px-3 py-1.5 rounded-xl bg-white/[0.05] border border-white/10 hover:bg-white/10 text-xs text-zinc-300 flex items-center gap-1.5"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${usersLoading ? 'animate-spin' : ''}`} />
                <span>Actualizar lista</span>
              </button>
            </div>

            <div className="overflow-x-auto rounded-2xl border border-white/[0.08] bg-black/40">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-white/[0.08] bg-white/[0.02] text-zinc-400 font-medium">
                    <th className="py-2.5 px-3">Usuario</th>
                    <th className="py-2.5 px-3">Rol</th>
                    <th className="py-2.5 px-3">Saldo Fichas</th>
                    <th className="py-2.5 px-3">Partidas (G / J)</th>
                    <th className="py-2.5 px-3">Estado</th>
                    <th className="py-2.5 px-3 text-right">Acciones de Admin</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.05]">
                  {users.map((u) => (
                    <tr key={u.id} className="hover:bg-white/[0.02] transition-colors">
                      <td className="py-2.5 px-3">
                        <div className="font-semibold text-white">@{u.username}</div>
                        <div className="text-[10px] text-zinc-500 font-mono">{u.id}</div>
                      </td>
                      <td className="py-2.5 px-3">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-semibold uppercase ${
                            u.role === 'admin'
                              ? 'bg-amber-400/20 text-amber-300 border border-amber-400/30'
                              : 'bg-zinc-800 text-zinc-400'
                          }`}
                        >
                          {u.role}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 font-semibold text-amber-300">
                        {u.coins.toLocaleString('es-ES')}
                      </td>
                      <td className="py-2.5 px-3 text-zinc-400">
                        {u.games_won} / {u.games_played}
                      </td>
                      <td className="py-2.5 px-3">
                        {u.is_banned ? (
                          <span className="px-2 py-0.5 rounded text-[10px] bg-rose-500/20 text-rose-400 border border-rose-500/30 font-semibold">
                            Suspendido
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded text-[10px] bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-semibold">
                            Activo
                          </span>
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-right space-x-2">
                        <button
                          onClick={() => setAdjustModalUser(u)}
                          className="px-2.5 py-1 rounded-lg bg-amber-400/10 hover:bg-amber-400/20 text-amber-300 border border-amber-400/30 text-[11px] font-semibold transition-all cursor-pointer"
                        >
                          Ajustar Fichas
                        </button>
                        <button
                          onClick={() => handleToggleBan(u)}
                          className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold border transition-all cursor-pointer ${
                            u.is_banned
                              ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30 hover:bg-emerald-500/20'
                              : 'bg-rose-500/10 text-rose-300 border-rose-500/30 hover:bg-rose-500/20'
                          }`}
                        >
                          {u.is_banned ? 'Reactivar' : 'Suspender'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ============================================================== */}
        {/* TAB 3: GAME TIMELINE INSPECTOR */}
        {/* ============================================================== */}
        {activeTab === 'game' && (
          <div className="space-y-4">
            <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/[0.08] flex items-center gap-3">
              <input
                type="text"
                value={gameIdInput}
                onChange={(e) => setGameIdInput(e.target.value)}
                placeholder="Pegar ID de la partida (UUID)..."
                className="flex-1 px-3 py-2 rounded-xl bg-black/60 border border-white/10 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-amber-400"
              />
              <button
                onClick={() => handleFetchGameDetail()}
                className="px-4 py-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-black font-semibold text-xs transition-all cursor-pointer"
              >
                {gameDetailLoading ? 'Buscando...' : 'Reconstruir Partida'}
              </button>
            </div>

            {gameDetail ? (
              <div className="space-y-4 p-5 rounded-2xl bg-white/[0.02] border border-white/[0.08]">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/[0.08] pb-4">
                  <div>
                    <h3 className="text-base font-bold text-white">
                      Partida: {gameDetail.game?.id}
                    </h3>
                    <p className="text-xs text-zinc-400">
                      Estado: <span className="text-amber-400 font-semibold">{gameDetail.game?.status}</span> •
                      Ganador: <span className="text-emerald-400 font-semibold">@{gameDetail.game?.winner_username || 'N/A'}</span>
                    </p>
                  </div>
                  <div className="px-3 py-1.5 rounded-xl bg-white/[0.05] border border-white/10 text-xs text-zinc-300">
                    Recámara con Descarga Secreta:{' '}
                    <span className="text-rose-400 font-bold">#{gameDetail.game?.bullet_chamber}</span>
                  </div>
                </div>

                <div className="space-y-3 pt-2">
                  <h4 className="text-xs font-bold text-zinc-400 uppercase tracking-wider">
                    Secuencia Cronológica de Turnos
                  </h4>

                  {gameDetail.turns && gameDetail.turns.length > 0 ? (
                    <div className="relative pl-6 space-y-4 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-white/10">
                      {gameDetail.turns.map((turn: any, i: number) => {
                        const isDischarge = turn.result === 'discharge' || turn.result === 'timeout';
                        return (
                          <div key={turn.id || i} className="relative flex items-start gap-3">
                            <div
                              className={`absolute -left-6 top-1 w-3.5 h-3.5 rounded-full border-2 ${
                                isDischarge
                                  ? 'bg-rose-500 border-rose-300'
                                  : 'bg-emerald-500 border-emerald-300'
                              }`}
                            />
                            <div className="flex-1 p-3 rounded-xl bg-black/40 border border-white/[0.06] space-y-1">
                              <div className="flex items-center justify-between">
                                <span className="font-semibold text-white">
                                  Paso #{i + 1} — @{turn.player_username}
                                </span>
                                <span className="text-[10px] text-zinc-500 font-mono">
                                  {new Date(turn.created_at).toLocaleTimeString('es-ES')}
                                </span>
                              </div>
                              <p className="text-xs text-zinc-400">
                                Disparó la recámara{' '}
                                <span className="font-bold text-amber-300">#{turn.chamber_index}</span>:
                                {isDischarge ? (
                                  <span className="text-rose-400 font-bold ml-1">
                                    ¡DESCARGA DETECTADA! (Eliminado)
                                  </span>
                                ) : (
                                  <span className="text-emerald-400 font-bold ml-1">
                                    Clic en Blanco (Sobrevivió)
                                  </span>
                                )}
                              </p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="text-xs text-zinc-500 py-4">No hay turnos registrados para esta partida.</p>
                  )}
                </div>
              </div>
            ) : (
              <div className="p-8 text-center text-zinc-500 rounded-2xl border border-white/[0.08] bg-black/30 text-xs">
                Introduce el identificador de una partida o haz clic en cualquier fila de la pestaña de Logs para inspeccionarla en detalle.
              </div>
            )}
          </div>
        )}
      </main>

      {/* Inspect Log Modal */}
      {selectedLog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="max-w-lg w-full p-5 rounded-2xl bg-[#0e0e12] border border-white/20 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <h3 className="font-bold text-sm text-white">Detalle de Auditoría</h3>
              <button
                onClick={() => setSelectedLog(null)}
                className="text-zinc-400 hover:text-white text-xs px-2 py-1 rounded bg-white/5"
              >
                Cerrar
              </button>
            </div>
            <div className="space-y-2 text-xs font-mono">
              <div>
                <span className="text-zinc-500">ID Evento:</span> {selectedLog.id}
              </div>
              <div>
                <span className="text-zinc-500">Tipo:</span>{' '}
                <span className="text-amber-400 font-bold">{selectedLog.event_type}</span>
              </div>
              <div>
                <span className="text-zinc-500">Fecha:</span> {selectedLog.created_at}
              </div>
              <div>
                <span className="text-zinc-500">Usuario:</span> @{selectedLog.username} ({selectedLog.user_id})
              </div>
              <div>
                <span className="text-zinc-500">IP:</span> {selectedLog.ip_address}
              </div>
              <div>
                <span className="text-zinc-500">Navegador:</span> {selectedLog.user_agent}
              </div>
              <div>
                <span className="text-zinc-500 block mb-1">Carga de Datos (JSON):</span>
                <pre className="p-3 rounded-xl bg-black/80 border border-white/10 text-emerald-400 overflow-x-auto text-[11px]">
                  {JSON.stringify(selectedLog.details, null, 2)}
                </pre>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Adjust Coins Modal */}
      {adjustModalUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="max-w-sm w-full p-5 rounded-2xl bg-[#0e0e12] border border-white/20 space-y-4 shadow-2xl">
            <h3 className="font-bold text-sm text-white">
              Ajustar Fichas a @{adjustModalUser.username}
            </h3>
            <p className="text-xs text-zinc-400">
              Saldo actual:{' '}
              <span className="text-amber-300 font-bold">{adjustModalUser.coins}</span> fichas.
              Introduce un valor positivo para ingresar o negativo para retirar:
            </p>
            <input
              type="number"
              value={adjustAmount}
              onChange={(e) => setAdjustAmount(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-black border border-white/10 text-sm text-white font-mono"
            />
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setAdjustModalUser(null)}
                className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-zinc-300 text-xs"
              >
                Cancelar
              </button>
              <button
                onClick={handleAdjustCoins}
                className="px-4 py-1.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-black font-bold text-xs"
              >
                Confirmar Ajuste
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
