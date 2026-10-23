'use client';

import React, { useState, useMemo, useRef } from 'react';
import { LeaderboardEntry, UserProfile } from '@/lib/types';
import {
  Trophy,
  Coins,
  X,
  Search,
  Flame,
  Crown,
  Medal,
  Award,
  ShieldCheck,
  TrendingUp,
  User,
  ArrowDown,
} from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/EmptyState';
import { sound } from '@/lib/audio';

interface LeaderboardModalProps {
  isOpen: boolean;
  onClose: () => void;
  entries: LeaderboardEntry[];
  currentUser?: UserProfile | null;
}

type SortCategory = 'coins' | 'biggest_win' | 'streak';

export const LeaderboardModal: React.FC<LeaderboardModalProps> = ({
  isOpen,
  onClose,
  entries,
  currentUser,
}) => {
  const [activeTab, setActiveTab] = useState<SortCategory>('coins');
  const [searchQuery, setSearchQuery] = useState('');
  const userRowRef = useRef<HTMLDivElement | null>(null);

  const sortedAndFiltered = useMemo(() => {
    let list = [...entries];

    // Sorting
    if (activeTab === 'coins') {
      list.sort((a, b) => (b.coins || 0) - (a.coins || 0));
    } else if (activeTab === 'biggest_win') {
      list.sort((a, b) => (b.biggest_win || 0) - (a.biggest_win || 0));
    } else if (activeTab === 'streak') {
      list.sort((a, b) => (b.streak_count || 1) - (a.streak_count || 1));
    }

    // Search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(
        (item) =>
          item.username.toLowerCase().includes(q) ||
          (item.full_name && item.full_name.toLowerCase().includes(q))
      );
    }

    return list;
  }, [entries, activeTab, searchQuery]);

  // Overall stats
  const stats = useMemo(() => {
    const totalUsers = entries.length;
    const totalCoins = entries.reduce((acc, curr) => acc + (curr.coins || 0), 0);
    const maxWin = entries.reduce(
      (max, curr) => Math.max(max, curr.biggest_win || 0),
      0
    );
    const topPlayer = [...entries].sort((a, b) => (b.coins || 0) - (a.coins || 0))[0];

    return { totalUsers, totalCoins, maxWin, topPlayer };
  }, [entries]);

  // Find user's overall rank in the current tab
  const currentUserRankIndex = useMemo(() => {
    if (!currentUser) return -1;
    return sortedAndFiltered.findIndex((item) => item.id === currentUser.id);
  }, [sortedAndFiltered, currentUser]);

  const scrollToCurrentUser = () => {
    if (userRowRef.current) {
      userRowRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
      sound.tap();
    }
  };

  if (!isOpen) return null;

  const top3 = !searchQuery.trim() && sortedAndFiltered.length >= 3 ? sortedAndFiltered.slice(0, 3) : [];
  const listItems = !searchQuery.trim() && sortedAndFiltered.length >= 3 ? sortedAndFiltered.slice(3) : sortedAndFiltered;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="leaderboard-title"
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-xs pt-[env(safe-area-inset-top,0px)] pb-[env(safe-area-inset-bottom,0px)] animate-in fade-in duration-200"
    >
      <div
        className="fixed inset-0"
        onClick={() => {
          sound.tap();
          onClose();
        }}
        aria-hidden="true"
      />

      <Card className="relative z-10 w-full max-w-xl max-h-[92dvh] overflow-hidden flex flex-col p-0 rounded-t-[24px] sm:rounded-2xl border-border/80 shadow-2xl bg-surface overscroll-contain">
        {/* 1. Modal Header */}
        <div className="px-5 py-4 border-b border-border/60 flex items-start justify-between bg-surface-raised/50">
          <div>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-accent animate-pulse" />
              <h2 id="leaderboard-title" className="text-base font-semibold text-foreground tracking-tight">
                Clasificación de alumnos
              </h2>
            </div>
            <p className="text-xs text-foreground-muted mt-0.5">
              2º SMR · Ranking por fichas, mayor bote y actividad
            </p>
          </div>

          <button
            type="button"
            onClick={() => {
              sound.tap();
              onClose();
            }}
            aria-label="Cerrar clasificación"
            className="w-8 h-8 rounded-lg text-foreground-muted hover:text-foreground hover:bg-surface-raised border border-border/50 flex items-center justify-center transition-colors cursor-pointer active:scale-95 touch-manipulation"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* 2. Global Quick Stats Strip */}
        <div className="grid grid-cols-3 divide-x divide-border/60 border-b border-border/60 bg-surface text-center py-2.5 px-2">
          <div className="px-2">
            <span className="text-[10px] font-mono text-foreground-subtle block">Alumnos</span>
            <span className="text-xs font-semibold font-mono text-foreground">
              {stats.totalUsers} clasificados
            </span>
          </div>
          <div className="px-2">
            <span className="text-[10px] font-mono text-foreground-subtle block">Fichas en juego</span>
            <span className="text-xs font-semibold font-mono text-foreground">
              {stats.totalCoins.toLocaleString('es-ES')}
            </span>
          </div>
          <div className="px-2">
            <span className="text-[10px] font-mono text-foreground-subtle block">Bote récord</span>
            <span className="text-xs font-semibold font-mono text-amber-500">
              {stats.maxWin.toLocaleString('es-ES')}
            </span>
          </div>
        </div>

        {/* 3. Controls Bar: Tabs & Search */}
        <div className="p-3.5 space-y-2.5 border-b border-border/60 bg-surface-raised/30">
          {/* Category Tabs */}
          <div className="flex items-center p-1 rounded-xl bg-surface-raised border border-border/60">
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
                  className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer touch-manipulation active:scale-95 ${
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

          {/* Search Box */}
          <div className="relative flex items-center">
            <Search className="w-3.5 h-3.5 text-foreground-subtle absolute left-3 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar por @usuario o nombre..."
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
        </div>

        {/* 4. Scrollable Ranking Body */}
        <div className="flex-1 overflow-y-auto overscroll-contain p-4 space-y-4">
          {sortedAndFiltered.length === 0 ? (
            <EmptyState
              icon={<User className="w-8 h-8 opacity-40" />}
              title="Sin resultados"
              description={
                searchQuery
                  ? `No se encontró a ningún alumno con "${searchQuery}".`
                  : 'Aún no hay alumnos con estadísticas en la clasificación.'
              }
            />
          ) : (
            <>
              {/* PODIUM: Top 3 (Only when no search is active) */}
              {top3.length === 3 && (
                <div className="pt-2 pb-1">
                  <div className="text-[11px] font-mono text-foreground-subtle text-center mb-3">
                    Podio de honor · Top 3
                  </div>

                  <div className="grid grid-cols-3 gap-2 items-end">
                    {/* 2nd Place (Silver) */}
                    <div
                      className={`flex flex-col items-center p-3 rounded-xl border text-center transition-all ${
                        top3[1].is_current_user
                          ? 'bg-surface-raised border-accent/50'
                          : 'bg-surface-raised/50 border-border/70'
                      }`}
                    >
                      <div className="relative mb-1.5">
                        <div className="w-10 h-10 rounded-full bg-slate-300/20 text-slate-300 border border-slate-300/40 flex items-center justify-center font-mono font-semibold text-xs">
                          {top3[1].username.slice(0, 2).toUpperCase()}
                        </div>
                        <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-slate-300 text-slate-900 flex items-center justify-center text-[10px] font-mono font-bold shadow-xs">
                          2
                        </div>
                      </div>

                      <span className="text-xs font-semibold text-foreground font-mono truncate w-full">
                        @{top3[1].username}
                      </span>
                      {top3[1].full_name && (
                        <span className="text-[10px] text-foreground-subtle truncate w-full">
                          {top3[1].full_name}
                        </span>
                      )}

                      <div className="mt-2 pt-1.5 border-t border-border/50 w-full">
                        <div className="font-mono text-xs font-semibold text-foreground">
                          {activeTab === 'coins'
                            ? top3[1].coins.toLocaleString('es-ES')
                            : activeTab === 'biggest_win'
                            ? top3[1].biggest_win.toLocaleString('es-ES')
                            : `${top3[1].streak_count || 1}d`}
                        </div>
                        <span className="text-[9px] text-foreground-subtle font-mono">
                          {activeTab === 'coins' ? 'fichas' : activeTab === 'biggest_win' ? 'bote' : 'racha'}
                        </span>
                      </div>
                    </div>

                    {/* 1st Place (Gold / Champion) */}
                    <div
                      className={`relative flex flex-col items-center p-3.5 rounded-xl border text-center -mt-2 transition-all ${
                        top3[0].is_current_user
                          ? 'bg-amber-500/10 border-amber-500/50 shadow-sm'
                          : 'bg-surface-raised border-amber-500/30'
                      }`}
                    >
                      <div className="absolute -top-3 left-1/2 -translate-x-1/2 flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500 text-slate-950 font-mono text-[9px] font-bold shadow-xs">
                        <Crown className="w-2.5 h-2.5" />
                        <span>LÍDER</span>
                      </div>

                      <div className="relative mb-2 mt-1">
                        <div className="w-12 h-12 rounded-full bg-amber-500/15 text-amber-500 border-2 border-amber-500/40 flex items-center justify-center font-mono font-bold text-sm">
                          {top3[0].username.slice(0, 2).toUpperCase()}
                        </div>
                        <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-amber-500 text-slate-950 flex items-center justify-center text-[10px] font-mono font-bold shadow-xs">
                          1
                        </div>
                      </div>

                      <span className="text-xs font-bold text-foreground font-mono truncate w-full">
                        @{top3[0].username}
                      </span>
                      {top3[0].full_name && (
                        <span className="text-[10px] text-foreground-subtle truncate w-full">
                          {top3[0].full_name}
                        </span>
                      )}

                      <div className="mt-2 pt-1.5 border-t border-amber-500/20 w-full">
                        <div className="font-mono text-sm font-bold text-amber-500">
                          {activeTab === 'coins'
                            ? top3[0].coins.toLocaleString('es-ES')
                            : activeTab === 'biggest_win'
                            ? top3[0].biggest_win.toLocaleString('es-ES')
                            : `${top3[0].streak_count || 1}d`}
                        </div>
                        <span className="text-[9px] text-foreground-subtle font-mono">
                          {activeTab === 'coins' ? 'fichas' : activeTab === 'biggest_win' ? 'bote' : 'racha'}
                        </span>
                      </div>
                    </div>

                    {/* 3rd Place (Bronze) */}
                    <div
                      className={`flex flex-col items-center p-3 rounded-xl border text-center transition-all ${
                        top3[2].is_current_user
                          ? 'bg-surface-raised border-accent/50'
                          : 'bg-surface-raised/50 border-border/70'
                      }`}
                    >
                      <div className="relative mb-1.5">
                        <div className="w-10 h-10 rounded-full bg-amber-700/20 text-amber-600 border border-amber-700/40 flex items-center justify-center font-mono font-semibold text-xs">
                          {top3[2].username.slice(0, 2).toUpperCase()}
                        </div>
                        <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-amber-700 text-white flex items-center justify-center text-[10px] font-mono font-bold shadow-xs">
                          3
                        </div>
                      </div>

                      <span className="text-xs font-semibold text-foreground font-mono truncate w-full">
                        @{top3[2].username}
                      </span>
                      {top3[2].full_name && (
                        <span className="text-[10px] text-foreground-subtle truncate w-full">
                          {top3[2].full_name}
                        </span>
                      )}

                      <div className="mt-2 pt-1.5 border-t border-border/50 w-full">
                        <div className="font-mono text-xs font-semibold text-foreground">
                          {activeTab === 'coins'
                            ? top3[2].coins.toLocaleString('es-ES')
                            : activeTab === 'biggest_win'
                            ? top3[2].biggest_win.toLocaleString('es-ES')
                            : `${top3[2].streak_count || 1}d`}
                        </div>
                        <span className="text-[9px] text-foreground-subtle font-mono">
                          {activeTab === 'coins' ? 'fichas' : activeTab === 'biggest_win' ? 'bote' : 'racha'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* LIST: 4th Place Onwards (or Full List if Searching) */}
              <div className="space-y-1.5">
                {listItems.map((item, index) => {
                  const actualRank = !searchQuery.trim() && top3.length === 3 ? index + 4 : index + 1;
                  const isUser = item.is_current_user || (currentUser && item.id === currentUser.id);

                  return (
                    <div
                      key={item.id}
                      ref={isUser ? userRowRef : undefined}
                      className={`flex items-center justify-between p-2.5 sm:p-3 rounded-xl border transition-colors ${
                        isUser
                          ? 'bg-surface-raised border-accent/60 shadow-2xs'
                          : 'bg-surface border-border/60 hover:border-border hover:bg-surface-raised/40'
                      }`}
                    >
                      {/* Left: Rank & User details */}
                      <div className="flex items-center gap-3 min-w-0">
                        <div
                          className={`w-7 h-7 rounded-lg flex items-center justify-center font-mono font-semibold text-xs shrink-0 ${
                            isUser
                              ? 'bg-foreground text-background'
                              : 'bg-surface-raised border border-border/70 text-foreground-muted'
                          }`}
                        >
                          {actualRank}
                        </div>

                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="text-xs font-semibold text-foreground font-mono truncate">
                              @{item.username}
                            </span>
                            {item.role === 'admin' && (
                              <Badge variant="accent" size="sm">
                                Admin
                              </Badge>
                            )}
                            {item.role === 'delegado' && (
                              <Badge variant="default" size="sm">
                                Delegado
                              </Badge>
                            )}
                            {isUser && (
                              <span className="px-1.5 py-0.2 rounded text-[10px] font-mono font-bold bg-accent text-accent-foreground">
                                TÚ
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2 text-[11px] text-foreground-subtle">
                            {item.full_name && (
                              <span className="truncate">{item.full_name}</span>
                            )}
                            {item.full_name && <span>·</span>}
                            <span>Mayor bote: {item.biggest_win?.toLocaleString('es-ES') || 0}</span>
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

                      {/* Right: Currency / Stat */}
                      <div className="text-right shrink-0 pl-2">
                        <div className="flex items-center justify-end gap-1 font-mono font-semibold text-xs text-foreground">
                          {activeTab === 'coins' && <Coins className="w-3.5 h-3.5 text-amber-500" />}
                          {activeTab === 'biggest_win' && <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />}
                          {activeTab === 'streak' && <Flame className="w-3.5 h-3.5 text-amber-500" />}
                          <span>
                            {activeTab === 'coins'
                              ? item.coins.toLocaleString('es-ES')
                              : activeTab === 'biggest_win'
                              ? item.biggest_win.toLocaleString('es-ES')
                              : `${item.streak_count || 1} días`}
                          </span>
                        </div>
                        <span className="text-[10px] text-foreground-subtle font-mono">
                          {activeTab === 'coins'
                            ? 'fichas'
                            : activeTab === 'biggest_win'
                            ? 'bote récord'
                            : 'actividad'}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>

        {/* 5. Sticky Bottom User Position Bar (if logged in and ranked) */}
        {currentUser && currentUserRankIndex !== -1 && (
          <div className="px-4 py-3 border-t border-border/70 bg-surface-raised flex items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-6 h-6 rounded-md bg-accent text-accent-foreground font-mono font-bold text-xs flex items-center justify-center shrink-0">
                #{currentUserRankIndex + 1}
              </div>
              <div className="truncate">
                <span className="text-foreground-muted">Tu clasificación: </span>
                <span className="font-semibold text-foreground font-mono">
                  @{currentUser.username}
                </span>
                <span className="text-foreground-subtle">
                  {' '}· {currentUser.coins.toLocaleString('es-ES')} fichas
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={scrollToCurrentUser}
              className="px-2.5 py-1 rounded-lg bg-surface border border-border/80 hover:border-foreground text-foreground-muted hover:text-foreground text-[11px] font-medium flex items-center gap-1 transition-all cursor-pointer shrink-0 active:scale-95"
            >
              <span>Ver mi puesto</span>
              <ArrowDown className="w-3 h-3" />
            </button>
          </div>
        )}
      </Card>
    </div>
  );
};
