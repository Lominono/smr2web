'use client';

import React from 'react';
import { LeaderboardEntry } from '@/lib/types';
import { Trophy, Coins, X, User } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';

interface LeaderboardModalProps {
  isOpen: boolean;
  onClose: () => void;
  entries: LeaderboardEntry[];
}

export const LeaderboardModal: React.FC<LeaderboardModalProps> = ({
  isOpen,
  onClose,
  entries,
}) => {
  if (!isOpen) return null;

  const sorted = [...entries].sort((a, b) => b.coins - a.coins);

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-xs pt-[env(safe-area-inset-top,0px)] pb-[env(safe-area-inset-bottom,0px)]">
      <Card className="w-full max-w-lg max-h-[90dvh] overflow-hidden flex flex-col p-0 rounded-t-[20px] sm:rounded-[var(--radius-lg)] border-border shadow-2xl">
        {/* Header */}
        <div className="px-5 py-4 border-b border-border/70 flex items-center justify-between bg-surface-raised/40">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-surface-raised text-amber-500 border border-border/70">
              <Trophy className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-foreground tracking-tight">
                Clasificación general
              </h3>
              <p className="text-xs text-foreground-muted">
                Ranking de alumnos por balance de fichas
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar modal"
            className="w-9 h-9 rounded-lg text-foreground-muted hover:text-foreground hover:bg-surface-raised flex items-center justify-center transition-all cursor-pointer active:scale-95 touch-manipulation"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* List */}
        <div className="p-4 overflow-y-auto max-h-[60dvh] space-y-2">
          {sorted.length === 0 ? (
            <EmptyState
              icon={<User className="w-6 h-6" />}
              title="Sin jugadores registrados"
              description="Aún no hay perfiles registrados en la base de datos."
            />
          ) : (
            sorted.map((item, idx) => {
              const isTop1 = idx === 0;

              return (
                <div
                  key={item.id}
                  className={`flex items-center justify-between p-3 rounded-[var(--radius)] border transition-colors ${
                    item.is_current_user
                      ? 'bg-surface-raised border-accent/40'
                      : isTop1
                      ? 'bg-surface-raised border-border'
                      : 'bg-surface border-border-subtle hover:border-border'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={`w-6 h-6 rounded-[var(--radius-sm)] flex items-center justify-center font-mono font-semibold text-xs shrink-0 ${
                        isTop1
                          ? 'bg-accent text-accent-foreground'
                          : 'bg-surface-raised border border-border text-foreground-muted'
                      }`}
                    >
                      {idx + 1}
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-xs font-semibold text-foreground font-mono truncate">
                          @{item.username}
                        </span>
                        {item.is_current_user && (
                          <Badge variant="accent" size="sm">
                            TÚ
                          </Badge>
                        )}
                      </div>
                      <span className="text-[11px] text-foreground-subtle font-mono block">
                        Mayor bote: {item.biggest_win?.toLocaleString('es-ES') || 0}
                      </span>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <div className="flex items-center justify-end gap-1 font-mono font-semibold text-xs text-accent">
                      <Coins className="w-3.5 h-3.5" />
                      <span>{item.coins.toLocaleString('es-ES')}</span>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </Card>
    </div>
  );
};
