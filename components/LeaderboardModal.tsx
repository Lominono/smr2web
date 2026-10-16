'use client';

import React from 'react';
import { LeaderboardEntry } from '@/lib/types';
import { Trophy, Coins, Award, X, Sparkles, TrendingUp } from 'lucide-react';

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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-[#0e0f15] border border-white/10 rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 py-5 border-b border-white/[0.08] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-2xl bg-amber-500/10 text-amber-400 border border-amber-500/20 shadow-inner">
              <Trophy className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white tracking-tight font-sans">
                LOS MILLONARIOS DEL AULA
              </h3>
              <p className="text-xs text-zinc-400">
                Ranking oficial de fortuna y mayores botes conseguidos
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
          {sorted.map((item, idx) => {
            const isTop1 = idx === 0;
            const isTop2 = idx === 1;
            const isTop3 = idx === 2;

            return (
              <div
                key={item.id}
                className={`flex items-center justify-between p-3.5 rounded-2xl border transition-all ${
                  item.is_current_user
                    ? 'bg-blue-500/10 border-blue-500/30'
                    : isTop1
                    ? 'bg-amber-500/10 border-amber-500/30'
                    : 'bg-white/[0.03] border-white/[0.06] hover:border-white/10'
                }`}
              >
                <div className="flex items-center gap-3">
                  {/* Position number / medal */}
                  <div
                    className={`w-7 h-7 rounded-full flex items-center justify-center font-mono font-bold text-xs ${
                      isTop1
                        ? 'bg-amber-400 text-black'
                        : isTop2
                        ? 'bg-zinc-300 text-black'
                        : isTop3
                        ? 'bg-amber-700 text-white'
                        : 'bg-zinc-800 text-zinc-400'
                    }`}
                  >
                    {idx + 1}
                  </div>

                  <img
                    src={item.avatar_url}
                    alt={item.username}
                    className="w-9 h-9 rounded-full bg-zinc-800 border border-white/10"
                  />

                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-sm font-bold text-white">
                        @{item.username}
                      </span>
                      {item.is_current_user && (
                        <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-blue-500/20 text-blue-300 border border-blue-500/40">
                          TÚ
                        </span>
                      )}
                    </div>
                    <span className="text-[11px] text-zinc-400 font-mono block">
                      {item.rank}
                    </span>
                  </div>
                </div>

                <div className="text-right">
                  <div className="flex items-center justify-end gap-1 font-mono text-sm font-bold text-white">
                    <Coins className="w-3.5 h-3.5 text-amber-400" />
                    <span>{item.coins.toLocaleString('es-ES')}</span>
                  </div>
                  <span className="text-[10px] text-zinc-500 font-mono">
                    Mayor bote: +{item.biggest_win.toLocaleString()} 🪙
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-black/40 border-t border-white/[0.08] flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl text-xs font-mono font-bold bg-white/10 hover:bg-white/20 text-white transition-colors"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};
