'use client';

import React, { useState, useMemo, useRef } from 'react';
import { LeaderboardEntry, UserProfile, OnlineUser } from '@/lib/types';
import {
  Coins,
  X,
  Search,
  Flame,
  TrendingUp,
  User,
  ArrowDown,
  RefreshCw,
} from 'lucide-react';
import { sound } from '@/lib/audio';

interface LeaderboardModalProps {
  isOpen: boolean;
  onClose: () => void;
  entries: LeaderboardEntry[];
  currentUser?: UserProfile | null;
  onlineUsers?: OnlineUser[];
  onRefresh?: () => void;
}

type SortCategory = 'coins' | 'biggest_win' | 'streak';

export const LeaderboardModal: React.FC<LeaderboardModalProps> = ({
  isOpen,
  onClose,
  entries,
  currentUser,
  onlineUsers = [],
  onRefresh,
}) => {
  const [activeTab, setActiveTab] = useState<SortCategory>('coins');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterOnlineOnly, setFilterOnlineOnly] = useState(false);
  const userRowRef = useRef<HTMLDivElement | null>(null);

  const onlineUsernamesSet = useMemo(() => {
    return new Set(onlineUsers.map((u) => u.username.toLowerCase()));
  }, [onlineUsers]);

  const sortedAndFiltered = useMemo(() => {
    let list = [...entries];

    if (filterOnlineOnly) {
      list = list.filter((item) => onlineUsernamesSet.has(item.username.toLowerCase()));
    }

    if (activeTab === 'coins') {
      list.sort((a, b) => (b.coins || 0) - (a.coins || 0));
    } else if (activeTab === 'biggest_win') {
      list.sort((a, b) => (b.biggest_win || 0) - (a.biggest_win || 0));
    } else if (activeTab === 'streak') {
      list.sort((a, b) => (b.streak_count || 1) - (a.streak_count || 1));
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(
        (item) =>
          item.username.toLowerCase().includes(q) ||
          (item.full_name && item.full_name.toLowerCase().includes(q)) ||
          (item.student_number && item.student_number.toLowerCase().includes(q))
      );
    }

    return list;
  }, [entries, activeTab, searchQuery, filterOnlineOnly, onlineUsernamesSet]);

  const stats = useMemo(() => {
    const totalUsers = entries.length;
    const totalCoins = entries.reduce((acc, curr) => acc + (curr.coins || 0), 0);
    const maxWin = entries.reduce(
      (max, curr) => Math.max(max, curr.biggest_win || 0),
      0
    );
    return { totalUsers, totalCoins, maxWin };
  }, [entries]);

  const currentUserRankIndex = useMemo(() => {
    if (!currentUser) return -1;
    return sortedAndFiltered.findIndex(
      (item) => item.id === currentUser.id || item.username.toLowerCase() === currentUser.username.toLowerCase()
    );
  }, [sortedAndFiltered, currentUser]);

  const scrollToCurrentUser = () => {
    if (userRowRef.current) {
      userRowRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
      sound.tap();
    }
  };

  if (!isOpen) return null;

  const top3 = !searchQuery.trim() && !filterOnlineOnly && sortedAndFiltered.length >= 3 ? sortedAndFiltered.slice(0, 3) : [];

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="leaderboard-title"
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/75 backdrop-blur-md animate-in fade-in duration-200"
    >
      <div
        className="fixed inset-0"
        onClick={() => {
          sound.tap();
          onClose();
        }}
        aria-hidden="true"
      />

      <div className="relative z-10 w-full max-w-xl max-h-[92dvh] overflow-hidden flex flex-col p-0 rounded-t-3xl sm:rounded-2xl border border-border/80 shadow-2xl bg-surface text-foreground overscroll-contain">
        {/* 1. Cabecera */}
        <div className="px-5 py-4 border-b border-border/60 flex items-center justify-between bg-surface-raised/40">
          <div>
            <div className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-accent" />
              <h2 id="leaderboard-title" className="text-sm font-semibold text-foreground tracking-tight">
                Clasificación de alumnos
              </h2>
              <span className="text-[11px] font-mono text-foreground-muted">
                ({sortedAndFiltered.length})
              </span>
            </div>
            <p className="text-[11px] text-foreground-muted font-mono mt-0.5">
              2º SMR · Aula: Ni puta idea
            </p>
          </div>

          <div className="flex items-center gap-1.5">
            {onRefresh && (
              <button
                type="button"
                onClick={() => {
                  sound.tap();
                  onRefresh();
                }}
                title="Actualizar ranking"
                className="w-7 h-7 rounded-lg text-foreground-muted hover:text-foreground hover:bg-surface-raised border border-border/60 flex items-center justify-center transition-colors cursor-pointer active:scale-95"
              >
                <RefreshCw className="w-3.5 h-3.5" />
              </button>
            )}
            <button
              type="button"
              onClick={() => {
                sound.tap();
                onClose();
              }}
              aria-label="Cerrar clasificación"
              className="w-7 h-7 rounded-lg text-foreground-muted hover:text-foreground hover:bg-surface-raised border border-border/60 flex items-center justify-center transition-colors cursor-pointer active:scale-95"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* 2. Resumen Métrico de Telemetría */}
        <div className="grid grid-cols-3 divide-x divide-border/60 border-b border-border/60 bg-surface text-center py-2 px-2 text-xs">
          <div className="px-2">
            <span className="text-[10px] font-mono text-foreground-subtle block uppercase">Registrados</span>
            <span className="font-mono font-medium text-foreground tabular-nums">
              {stats.totalUsers}
            </span>
          </div>
          <div className="px-2">
            <span className="text-[10px] font-mono text-foreground-subtle block uppercase">Total Fichas</span>
            <span className="font-mono font-medium text-foreground tabular-nums">
              {stats.totalCoins.toLocaleString('es-ES')}
            </span>
          </div>
          <div className="px-2">
            <span className="text-[10px] font-mono text-foreground-subtle block uppercase">Mayor Bote</span>
            <span className="font-mono font-medium text-foreground tabular-nums">
              {stats.maxWin.toLocaleString('es-ES')}
            </span>
          </div>
        </div>

        {/* 3. Selector de Categoría y Búsqueda */}
        <div className="p-3.5 space-y-2.5 border-b border-border/60 bg-surface-raised/30">
          <div className="flex items-center p-1 rounded-xl bg-surface border border-border/60">
            {[
              { id: 'coins', label: 'Fichas', icon: Coins },
              { id: 'biggest_win', label: 'Mayor Bote', icon: TrendingUp },
              { id: 'streak', label: 'Racha diaria', icon: Flame },
            ].map((tab) => {
              const isActive = activeTab === tab.id;
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => {
                    setActiveTab(tab.id as SortCategory);
                    sound.tap();
                  }}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer active:scale-95 font-sans ${
                    isActive
                      ? 'bg-foreground text-background font-semibold shadow-xs'
                      : 'text-foreground-muted hover:text-foreground'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>

          <div className="flex items-center gap-2">
            <div className="relative flex items-center flex-1">
              <Search className="w-3.5 h-3.5 text-foreground-subtle absolute left-3 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar por alumno, NIA o usuario..."
                className="w-full pl-9 pr-8 py-1.5 rounded-xl bg-surface border border-border/70 text-xs text-foreground placeholder:text-foreground-subtle outline-none focus:border-accent transition-colors font-sans"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 text-foreground-subtle hover:text-foreground p-0.5 cursor-pointer"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>

            <button
              type="button"
              onClick={() => {
                sound.tap();
                setFilterOnlineOnly(!filterOnlineOnly);
              }}
              title="Filtrar por alumnos activos"
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-mono font-medium transition-all cursor-pointer shrink-0 active:scale-95 ${
                filterOnlineOnly
                  ? 'bg-emerald-500/15 text-emerald-500 border-emerald-500/40'
                  : 'bg-surface border-border/70 text-foreground-muted hover:text-foreground'
              }`}
            >
              <span className={`w-1.5 h-1.5 rounded-full ${filterOnlineOnly ? 'bg-emerald-500' : 'bg-foreground-subtle'}`} />
              <span className="hidden xs:inline">Conectados</span>
              <span>({onlineUsers.length})</span>
            </button>
          </div>
        </div>

        {/* 4. Lista del Ranking */}
        <div className="flex-1 overflow-y-auto overscroll-contain p-4 space-y-3.5">
          {sortedAndFiltered.length === 0 ? (
            <div className="py-12 text-center text-xs text-foreground-subtle space-y-1">
              <User className="w-6 h-6 mx-auto opacity-40 mb-2" />
              <p className="font-medium text-foreground">Sin resultados</p>
              <p>No se encontraron registros que coincidan con la búsqueda.</p>
            </div>
          ) : (
            <>
              {/* PODIO TOP 3 (Solo en vista normal) */}
              {top3.length === 3 && (
                <div className="pt-1 pb-2">
                  <div className="text-[10px] font-mono uppercase tracking-widest text-foreground-subtle text-center mb-2.5">
                    Podio de honor
                  </div>

                  <div className="grid grid-cols-3 gap-2 items-end">
                    {/* 2º Puesto (Plata) */}
                    <div
                      className={`flex flex-col items-center p-3 rounded-xl border text-center transition-all ${
                        top3[1].is_current_user
                          ? 'bg-surface-raised border-accent/60'
                          : 'bg-surface-raised/40 border-border/70'
                      }`}
                    >
                      <div className="relative mb-2">
                        <div className="w-9 h-9 rounded-full bg-surface border border-border/80 flex items-center justify-center font-mono font-semibold text-xs text-foreground">
                          {top3[1].username.slice(0, 2).toUpperCase()}
                        </div>
                        {onlineUsernamesSet.has(top3[1].username.toLowerCase()) && (
                          <span className="w-2 h-2 rounded-full bg-emerald-500 border border-surface absolute top-0 right-0" />
                        )}
                        <span className="absolute -bottom-1 -right-1 px-1 rounded bg-neutral-800 text-white font-mono text-[9px] font-bold">
                          02
                        </span>
                      </div>

                      <span className="text-xs font-semibold text-foreground font-mono truncate w-full">
                        @{top3[1].username}
                      </span>
                      {top3[1].full_name && (
                        <span className="text-[10px] text-foreground-subtle truncate w-full">
                          {top3[1].full_name}
                        </span>
                      )}

                      <div className="mt-2 pt-1 border-t border-border/50 w-full font-mono text-xs font-bold tabular-nums">
                        {activeTab === 'coins'
                          ? top3[1].coins.toLocaleString('es-ES')
                          : activeTab === 'biggest_win'
                          ? top3[1].biggest_win.toLocaleString('es-ES')
                          : `${top3[1].streak_count || 1}d`}
                      </div>
                    </div>

                    {/* 1º Puesto (Oro / Líder) */}
                    <div
                      className={`relative flex flex-col items-center p-3.5 rounded-xl border text-center -mt-2 transition-all ${
                        top3[0].is_current_user
                          ? 'bg-amber-500/10 border-amber-500/50 shadow-sm'
                          : 'bg-surface-raised border-border/80 shadow-xs'
                      }`}
                    >
                      <div className="relative mb-2">
                        <div className="w-11 h-11 rounded-full bg-amber-500/10 text-amber-500 border border-amber-500/40 flex items-center justify-center font-mono font-bold text-sm">
                          {top3[0].username.slice(0, 2).toUpperCase()}
                        </div>
                        {onlineUsernamesSet.has(top3[0].username.toLowerCase()) && (
                          <span className="w-2 h-2 rounded-full bg-emerald-500 border border-surface absolute top-0 right-0" />
                        )}
                        <span className="absolute -bottom-1 -right-1 px-1 rounded bg-amber-500 text-black font-mono text-[9px] font-extrabold">
                          01
                        </span>
                      </div>

                      <span className="text-xs font-bold text-foreground font-mono truncate w-full">
                        @{top3[0].username}
                      </span>
                      {top3[0].full_name && (
                        <span className="text-[10px] text-foreground-subtle truncate w-full">
                          {top3[0].full_name}
                        </span>
                      )}

                      <div className="mt-2 pt-1 border-t border-border/50 w-full font-mono text-xs font-bold text-amber-500 tabular-nums">
                        {activeTab === 'coins'
                          ? top3[0].coins.toLocaleString('es-ES')
                          : activeTab === 'biggest_win'
                          ? top3[0].biggest_win.toLocaleString('es-ES')
                          : `${top3[0].streak_count || 1}d`}
                      </div>
                    </div>

                    {/* 3º Puesto (Bronce) */}
                    <div
                      className={`flex flex-col items-center p-3 rounded-xl border text-center transition-all ${
                        top3[2].is_current_user
                          ? 'bg-surface-raised border-accent/60'
                          : 'bg-surface-raised/40 border-border/70'
                      }`}
                    >
                      <div className="relative mb-2">
                        <div className="w-9 h-9 rounded-full bg-surface border border-border/80 flex items-center justify-center font-mono font-semibold text-xs text-foreground">
                          {top3[2].username.slice(0, 2).toUpperCase()}
                        </div>
                        {onlineUsernamesSet.has(top3[2].username.toLowerCase()) && (
                          <span className="w-2 h-2 rounded-full bg-emerald-500 border border-surface absolute top-0 right-0" />
                        )}
                        <span className="absolute -bottom-1 -right-1 px-1 rounded bg-neutral-800 text-white font-mono text-[9px] font-bold">
                          03
                        </span>
                      </div>

                      <span className="text-xs font-semibold text-foreground font-mono truncate w-full">
                        @{top3[2].username}
                      </span>
                      {top3[2].full_name && (
                        <span className="text-[10px] text-foreground-subtle truncate w-full">
                          {top3[2].full_name}
                        </span>
                      )}

                      <div className="mt-2 pt-1 border-t border-border/50 w-full font-mono text-xs font-bold tabular-nums">
                        {activeTab === 'coins'
                          ? top3[2].coins.toLocaleString('es-ES')
                          : activeTab === 'biggest_win'
                          ? top3[2].biggest_win.toLocaleString('es-ES')
                          : `${top3[2].streak_count || 1}d`}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* LISTA COMPLETA CONTINUA */}
              <div className="space-y-1.5 pt-1">
                {sortedAndFiltered.map((item, index) => {
                  const actualRank = index + 1;
                  const isTop3 = actualRank <= 3;
                  const isUser = item.is_current_user || (currentUser && item.id === currentUser.id);

                  return (
                    <div
                      key={item.id}
                      ref={isUser ? userRowRef : undefined}
                      className={`flex items-center justify-between p-2.5 rounded-xl border transition-all ${
                        isUser
                          ? 'bg-surface-raised border-accent/70 shadow-xs'
                          : 'bg-surface border-border/60 hover:border-border hover:bg-surface-raised/30'
                      }`}
                    >
                      {/* Izquierda: Índice y datos de usuario */}
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span
                          className={`w-7 h-7 rounded-lg flex items-center justify-center font-mono text-xs font-bold shrink-0 select-none ${
                            isUser
                              ? 'bg-foreground text-background'
                              : isTop3
                              ? 'bg-surface-raised border border-border text-foreground font-extrabold'
                              : 'bg-surface-raised/60 text-foreground-subtle font-normal'
                          }`}
                        >
                          {String(actualRank).padStart(2, '0')}
                        </span>

                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="text-xs font-semibold text-foreground font-mono truncate">
                              @{item.username}
                            </span>

                            {onlineUsernamesSet.has(item.username.toLowerCase()) && (
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" title="En línea" />
                            )}

                            {item.role === 'admin' && (
                              <span className="px-1.5 py-0.2 rounded text-[9px] font-mono uppercase bg-surface-raised border border-border text-foreground-muted">
                                admin
                              </span>
                            )}
                            {item.role === 'delegado' && (
                              <span className="px-1.5 py-0.2 rounded text-[9px] font-mono uppercase bg-surface-raised border border-border text-foreground-muted">
                                delegado
                              </span>
                            )}
                            {isUser && (
                              <span className="px-1 rounded text-[9px] font-mono font-bold bg-accent text-accent-foreground">
                                tú
                              </span>
                            )}
                          </div>

                          <div className="flex items-center gap-1.5 text-[10px] text-foreground-subtle font-mono truncate mt-0.5">
                            {item.full_name && (
                              <span className="truncate text-foreground-muted font-sans font-medium">{item.full_name}</span>
                            )}
                            {item.student_number && (
                              <>
                                <span>·</span>
                                <span>NIA: {item.student_number}</span>
                              </>
                            )}
                            {item.streak_count && item.streak_count > 1 && (
                              <>
                                <span>·</span>
                                <span className="flex items-center gap-0.5 text-amber-500">
                                  <Flame className="w-2.5 h-2.5" />
                                  <span>{item.streak_count}d</span>
                                </span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Derecha: Puntuación métrica */}
                      <div className="flex items-center gap-1.5 pl-2 shrink-0 font-mono text-xs font-bold tabular-nums">
                        <span>{item.coins.toLocaleString('es-ES')}</span>
                        <span className="text-[10px] text-foreground-subtle font-sans font-normal">fichas</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>

        {/* 5. Barra Inferior Fija de "Mi Posición" */}
        {currentUser && currentUserRankIndex !== -1 && (
          <div className="px-4 py-2.5 border-t border-border/70 bg-surface-raised flex items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-2 min-w-0">
              <span className="px-1.5 py-0.5 rounded bg-foreground text-background font-mono font-bold text-[11px] shrink-0">
                #{currentUserRankIndex + 1}
              </span>
              <div className="truncate text-xs">
                <span className="text-foreground-muted">Tu posición: </span>
                <span className="font-semibold text-foreground font-mono">@{currentUser.username}</span>
                <span className="text-foreground-subtle font-mono"> · {currentUser.coins.toLocaleString('es-ES')} fichas</span>
              </div>
            </div>

            <button
              type="button"
              onClick={scrollToCurrentUser}
              className="px-2.5 py-1 rounded-lg bg-surface border border-border/80 hover:border-foreground text-foreground-muted hover:text-foreground text-[11px] font-medium flex items-center gap-1 transition-all cursor-pointer shrink-0 active:scale-95"
            >
              <span>Mi puesto</span>
              <ArrowDown className="w-3 h-3" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
