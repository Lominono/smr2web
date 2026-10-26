'use client';

import React from 'react';
import { X, Users, Sparkles, Coins, ShieldCheck, Zap } from 'lucide-react';
import { OnlineUser } from '@/lib/types';
import { getViewLabel } from '@/lib/presenceService';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { sound } from '@/lib/audio';

interface OnlineUsersModalProps {
  isOpen: boolean;
  onClose: () => void;
  onlineUsers: OnlineUser[];
  onSelectUser?: (user: OnlineUser) => void;
}

const AVATAR_COLOR_MAP: Record<string, string> = {
  emerald: 'bg-emerald-600',
  blue: 'bg-blue-600',
  purple: 'bg-purple-600',
  amber: 'bg-amber-500',
  rose: 'bg-rose-600',
  cyan: 'bg-cyan-600',
};

export const OnlineUsersModal: React.FC<OnlineUsersModalProps> = ({
  isOpen,
  onClose,
  onlineUsers,
}) => {
  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="online-modal-title"
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

      <Card className="relative z-10 w-full max-w-lg max-h-[88dvh] overflow-hidden flex flex-col p-0 rounded-t-[24px] sm:rounded-2xl border-border/80 shadow-2xl bg-surface overscroll-contain">
        {/* Header */}
        <div className="px-5 py-4 border-b border-border/60 flex items-center justify-between bg-surface-raised/50">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <Users className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <h2 id="online-modal-title" className="text-sm font-semibold text-foreground tracking-tight">
                  Alumnos Conectados en Tiempo Real
                </h2>
              </div>
              <p className="text-xs text-foreground-muted font-mono mt-0.5">
                {onlineUsers.length} {onlineUsers.length === 1 ? 'compañero activo' : 'compañeros activos'} en directo
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              sound.tap();
              onClose();
            }}
            aria-label="Cerrar ventana"
            className="w-8 h-8 rounded-lg text-foreground-muted hover:text-foreground hover:bg-surface-raised border border-border/50 flex items-center justify-center transition-colors cursor-pointer active:scale-95 touch-manipulation"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Live List */}
        <div className="p-4 overflow-y-auto space-y-2 flex-1 divide-y divide-border/40">
          {onlineUsers.map((u) => {
            const bgClass = AVATAR_COLOR_MAP[u.avatar_color || 'emerald'] || 'bg-emerald-600';
            const activityLabel = getViewLabel(u.current_view);

            return (
              <div
                key={u.id}
                className="pt-2 first:pt-0 flex items-center justify-between gap-3 p-2.5 rounded-xl hover:bg-surface-raised/60 transition-colors"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="relative shrink-0">
                    <div
                      className={`w-10 h-10 rounded-xl ${bgClass} text-white font-mono font-bold text-sm flex items-center justify-center uppercase shadow-2xs select-none`}
                    >
                      {u.username.charAt(0)}
                    </div>
                    <span className="w-3 h-3 rounded-full bg-emerald-500 border-2 border-surface absolute -bottom-0.5 -right-0.5 animate-pulse" />
                  </div>

                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="font-mono text-sm font-semibold text-foreground truncate">
                        @{u.username}
                      </span>

                      {u.is_current_user && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-accent/15 text-accent font-mono font-semibold">
                          Tú
                        </span>
                      )}

                      {u.role === 'admin' ? (
                        <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-red-500/15 text-red-400 font-mono font-semibold flex items-center gap-0.5">
                          <ShieldCheck className="w-2.5 h-2.5" />
                          Admin
                        </span>
                      ) : u.role === 'delegado' ? (
                        <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-amber-500/15 text-amber-400 font-mono font-semibold">
                          Delegado
                        </span>
                      ) : null}
                    </div>

                    <div className="flex items-center gap-1.5 text-xs text-foreground-muted font-sans truncate mt-0.5">
                      {u.full_name && (
                        <>
                          <span className="font-medium text-foreground">{u.full_name}</span>
                          <span>·</span>
                        </>
                      )}
                      <span className="text-emerald-400 font-medium truncate">{activityLabel}</span>
                    </div>
                  </div>
                </div>

                {u.coins !== undefined && (
                  <div className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-surface border border-border/60 text-xs font-mono font-semibold text-amber-500 shrink-0">
                    <Coins className="w-3.5 h-3.5" />
                    <span>{u.coins.toLocaleString('es-ES')}</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Footer info */}
        <div className="px-5 py-3 border-t border-border/60 bg-surface-raised/30 flex items-center justify-between text-xs text-foreground-subtle">
          <div className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            <span>Actualización en tiempo real vía Supabase Realtime</span>
          </div>
          <button
            type="button"
            onClick={() => {
              sound.tap();
              onClose();
            }}
            className="text-foreground hover:underline font-medium cursor-pointer"
          >
            Cerrar
          </button>
        </div>
      </Card>
    </div>
  );
};
