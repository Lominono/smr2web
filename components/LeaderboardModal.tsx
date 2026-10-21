'use client';

import React from 'react';
import { LeaderboardEntry } from '@/lib/types';
import { getUserRank } from '@/lib/economy';
import { Trophy, Coins, X, User } from 'lucide-react';

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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-xl animate-in fade-in duration-200">
      <div className="glass-panel border border-white/10 rounded-3xl w-full max-w-lg max-h-[92vh] overflow-hidden flex flex-col shadow-[0_20px_60px_rgba(0,0,0,0.8)]">
        {/* Header */}
        <div className="px-5 sm:px-6 py-4 sm:py-5 border-b border-white/[0.08] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-2xl bg-white/[0.06] text-white border border-white/10 shadow-inner">
              <Trophy className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white tracking-tight font-mono">
                Clasificación
              </h3>
              <p className="text-xs text-zinc-500 font-mono">
                Ranking de 2º SMR
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-zinc-400 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* List */}
        <div className="p-4 sm:p-6 overflow-y-auto max-h-[60vh] space-y-2">
          {sorted.length === 0 ? (
            <div className="py-12 text-center text-zinc-500 font-mono text-xs">
              <User className="w-8 h-8 mx-auto mb-2 opacity-30" />
              <p>No hay jugadores registrados todavía.</p>
            </div>
          ) : (
            sorted.map((item, idx) => {
              const isTop1 = idx === 0;
              const rank = getUserRank(item.coins);

              return (
                <div
                  key={item.id}
                  className={`flex items-center justify-between p-3.5 rounded-2xl border transition-all ${
                    item.is_current_user
                      ? 'bg-white/[0.08] border-white/30'
                      : isTop1
                      ? 'bg-amber-500/10 border-amber-500/30'
                      : 'bg-white/[0.03] border-white/[0.06] hover:border-white/10'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-7 h-7 rounded-full flex items-center justify-center font-mono font-bold text-xs ${
                        isTop1
                          ? 'bg-amber-400 text-black'
                          : 'bg-zinc-800 text-zinc-400'
                      }`}
                    >
                      {idx + 1}
                    </div>

                    <div className="w-8 h-8 rounded-full bg-white/[0.08] border border-white/10 flex items-center justify-center text-zinc-300">
                      <User className="w-4 h-4" />
                    </div>

                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-sm font-bold text-white font-mono">
                          @{item.username}
                        </span>
                        <span
                          className={`text-[9px] font-mono px-1 py-0.2 rounded border font-semibold ${rank.bg} ${rank.color} ${rank.border}`}
                        >
                          {rank.name}
                        </span>
                        {item.is_current_user && (
                          <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-white/20 text-white border border-white/30">
                            TÚ
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] text-zinc-500 font-mono block">
                        Mayor bote: {item.biggest_win?.toLocaleString() || 0} fichas
                      </span>
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="flex items-center justify-end gap-1 font-mono font-bold text-sm text-amber-400">
                      <Coins className="w-3.5 h-3.5" />
                      <span>{item.coins.toLocaleString('es-ES')}</span>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
