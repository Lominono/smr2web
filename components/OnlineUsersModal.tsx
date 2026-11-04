'use client';

import React from 'react';
import { X, Users, Coins, ShieldCheck } from 'lucide-react';
import { OnlineUser } from '@/lib/types';
import { getViewLabel } from '@/lib/presenceService';
import { Card } from '@/components/ui/Card';
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
  onSelectUser,
}) => {
  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="online-modal-title"
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/70 backdrop-blur-md pt-[env(safe-area-inset-top,0px)] pb-[env(safe-area-inset-bottom,0px)] animate-in fade-in duration-200"
    >
      <div
        className="fixed inset-0"
        onClick={() => {
          sound.tap();
          onClose();
        }}
        aria-hidden="true"
      />

      <Card className="relative z-10 w-full max-w-lg max-h-[88dvh] overflow-hidden flex flex-col p-0 rounded-t-3xl sm:rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 shadow-2xl overscroll-contain">
        {/* Header */}
        <div className="px-5 py-4 border-b border-neutral-200 dark:border-neutral-800 flex items-center justify-between bg-neutral-50/50 dark:bg-neutral-900/40">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700/60 flex items-center justify-center text-neutral-700 dark:text-neutral-300">
              <Users className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <h2 id="online-modal-title" className="text-sm font-semibold text-neutral-900 dark:text-neutral-100 tracking-tight">
                  Alumnos en Directo
                </h2>
              </div>
              <p className="text-[11px] text-neutral-500 font-mono mt-0.5">
                {onlineUsers.length} {onlineUsers.length === 1 ? 'compañero activo' : 'compañeros activos'} · Aula: Ni puta idea
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
            className="w-8 h-8 rounded-lg text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100 hover:bg-neutral-100 dark:hover:bg-neutral-800 flex items-center justify-center transition-colors cursor-pointer active:scale-95 touch-manipulation"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Live List */}
        <div className="p-4 overflow-y-auto space-y-1.5 flex-1 divide-y divide-neutral-100 dark:divide-neutral-900">
          {onlineUsers.map((u) => {
            const bgClass = AVATAR_COLOR_MAP[u.avatar_color || 'emerald'] || 'bg-emerald-600';
            const activityLabel = getViewLabel(u.current_view);

            return (
              <div
                key={u.id}
                onClick={() => onSelectUser?.(u)}
                title={`Ver ficha oficial de @${u.username}`}
                className="pt-2 first:pt-0 flex items-center justify-between gap-3 p-2.5 rounded-xl hover:bg-neutral-50 dark:hover:bg-neutral-900/50 transition-colors cursor-pointer group"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="relative shrink-0">
                    <div
                      className={`w-9 h-9 rounded-xl ${bgClass} text-white font-mono font-semibold text-sm flex items-center justify-center uppercase select-none shadow-xs`}
                    >
                      {u.username.charAt(0)}
                    </div>
                    <span className="w-2 h-2 rounded-full bg-emerald-500 border-2 border-white dark:border-neutral-950 absolute -bottom-0.5 -right-0.5" />
                  </div>

                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="font-mono text-xs font-semibold text-neutral-900 dark:text-neutral-100 truncate">
                        @{u.username}
                      </span>

                      {u.is_current_user && (
                        <span className="text-[10px] px-1.5 py-0.2 rounded-md bg-neutral-200/80 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 font-mono font-medium">
                          Tú
                        </span>
                      )}

                      {u.role === 'admin' ? (
                        <span className="text-[10px] px-1.5 py-0.2 rounded-md bg-red-500/10 text-red-600 dark:text-red-400 font-mono font-medium flex items-center gap-0.5">
                          <ShieldCheck className="w-2.5 h-2.5" />
                          Admin
                        </span>
                      ) : u.role === 'delegado' ? (
                        <span className="text-[10px] px-1.5 py-0.2 rounded-md bg-amber-500/10 text-amber-600 dark:text-amber-400 font-mono font-medium">
                          Delegado
                        </span>
                      ) : null}
                    </div>

                    <div className="flex items-center gap-1.5 text-[11px] text-neutral-500 font-sans truncate mt-0.5">
                      {u.full_name && (
                        <>
                          <span className="font-medium text-neutral-700 dark:text-neutral-300 truncate max-w-[120px]">{u.full_name}</span>
                          <span>·</span>
                        </>
                      )}
                      <span className="text-emerald-600 dark:text-emerald-400 font-mono text-[10px] truncate">{activityLabel}</span>
                    </div>
                  </div>
                </div>

                {u.coins !== undefined && (
                  <div className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-neutral-100 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 text-xs font-mono font-medium text-neutral-900 dark:text-neutral-100 shrink-0">
                    <Coins className="w-3.5 h-3.5 text-amber-500" />
                    <span>{u.coins.toLocaleString('es-ES')}</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Footer info */}
        <div className="px-5 py-3 border-t border-neutral-200 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-900/30 flex items-center justify-between text-xs text-neutral-500">
          <div className="flex items-center gap-1.5 font-mono text-[11px]">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            <span>Sincronización en tiempo real</span>
          </div>
          <button
            type="button"
            onClick={() => {
              sound.tap();
              onClose();
            }}
            className="text-neutral-700 dark:text-neutral-300 hover:text-neutral-900 dark:hover:text-neutral-100 text-xs font-medium cursor-pointer"
          >
            Cerrar
          </button>
        </div>
      </Card>
    </div>
  );
};
