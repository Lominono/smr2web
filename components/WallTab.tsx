'use client';

import React, { useState } from 'react';
import { WallMessage, WallTag } from '@/lib/types';
import { MessageSquare, Send, Sparkles, AlertTriangle, HelpCircle, Laugh, Radio, Shield } from 'lucide-react';
import confetti from 'canvas-confetti';

interface WallTabProps {
  messages: WallMessage[];
  onAddMessage: (newMsg: Omit<WallMessage, 'id'>) => void;
  currentUsername?: string;
  currentUserRank?: string;
}

export const WallTab: React.FC<WallTabProps> = ({
  messages,
  onAddMessage,
  currentUsername = 'chaval_smr',
  currentUserRank = 'Admin de DHCP',
}) => {
  const [selectedTag, setSelectedTag] = useState<string>('ALL');
  const [content, setContent] = useState('');
  const [tag, setTag] = useState<WallTag>('aviso');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) return;

    onAddMessage({
      author_name: currentUsername,
      author_rank: currentUserRank,
      content: content.trim(),
      tag,
      created_at: 'Ahora mismo',
    });

    setContent('');

    confetti({
      particleCount: 30,
      spread: 40,
      origin: { y: 0.8 },
    });
  };

  const tagConfig: Record<WallTag, { label: string; color: string; border: string; bg: string; icon: any }> = {
    aviso: {
      label: 'Aviso',
      color: 'text-emerald-400',
      border: 'border-emerald-500/30',
      bg: 'bg-emerald-500/10',
      icon: Radio,
    },
    duda: {
      label: 'Duda',
      color: 'text-amber-400',
      border: 'border-amber-500/30',
      bg: 'bg-amber-500/10',
      icon: HelpCircle,
    },
    meme: {
      label: 'Meme',
      color: 'text-purple-400',
      border: 'border-purple-500/30',
      bg: 'bg-purple-500/10',
      icon: Laugh,
    },
    queja: {
      label: 'Drama / Queja',
      color: 'text-rose-400',
      border: 'border-rose-500/30',
      bg: 'bg-rose-500/10',
      icon: AlertTriangle,
    },
  };

  const filteredMessages = messages.filter((m) => {
    if (selectedTag === 'ALL') return true;
    return m.tag === selectedTag;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-zinc-800">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight flex items-center gap-2">
            <Radio className="w-6 h-6 text-emerald-400" />
            El Ping de Clase (Muro de Avisos)
          </h2>
          <p className="text-xs sm:text-sm text-zinc-400 mt-1">
            Tablón rápido para avisar si el profe no viene, preguntar dudas de última hora o quejarse de la práctica.
          </p>
        </div>
      </div>

      {/* Post Box */}
      <div className="bg-zinc-900/90 border border-zinc-800 rounded-2xl p-4 sm:p-5 shadow-lg">
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-mono text-zinc-400">
              Escribiendo como <strong className="text-emerald-400 font-bold">@{currentUsername}</strong> ({currentUserRank})
            </span>

            {/* Tag selector */}
            <div className="flex items-center gap-1">
              {(['aviso', 'duda', 'meme', 'queja'] as WallTag[]).map((t) => {
                const conf = tagConfig[t];
                const isSelected = tag === t;
                return (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setTag(t)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-mono transition-colors ${
                      isSelected
                        ? `${conf.bg} ${conf.color} ${conf.border} border font-bold`
                        : 'text-zinc-500 hover:text-zinc-300'
                    }`}
                  >
                    #{conf.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex gap-2">
            <textarea
              rows={2}
              required
              placeholder="¿Qué pasa en clase? Suelta el ping aquí..."
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="flex-1 px-3.5 py-2.5 bg-zinc-950 border border-zinc-800 rounded-xl text-xs sm:text-sm text-zinc-200 placeholder:text-zinc-500 focus:outline-none focus:border-emerald-500"
            />
            <button
              type="submit"
              className="px-4 rounded-xl font-mono text-xs font-bold bg-emerald-500 hover:bg-emerald-400 text-zinc-950 transition-colors flex items-center justify-center gap-1.5 shadow-md shrink-0 cursor-pointer"
            >
              <Send className="w-4 h-4" />
              <span className="hidden sm:inline">Enviar Ping</span>
            </button>
          </div>
        </form>
      </div>

      {/* Filter tags */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
        <button
          onClick={() => setSelectedTag('ALL')}
          className={`px-3 py-1.5 rounded-lg font-mono font-medium transition-colors shrink-0 ${
            selectedTag === 'ALL'
              ? 'bg-zinc-100 text-zinc-900 font-bold'
              : 'bg-zinc-800/80 text-zinc-400 hover:text-white'
          }`}
        >
          Todos los pings ({messages.length})
        </button>
        {(['aviso', 'duda', 'meme', 'queja'] as WallTag[]).map((t) => {
          const conf = tagConfig[t];
          const isSelected = selectedTag === t;
          return (
            <button
              key={t}
              onClick={() => setSelectedTag(t)}
              className={`px-3 py-1.5 rounded-lg font-mono transition-colors shrink-0 flex items-center gap-1.5 ${
                isSelected
                  ? `${conf.bg} ${conf.border} ${conf.color} border font-bold`
                  : 'bg-zinc-800/60 text-zinc-400 hover:text-white border border-transparent'
              }`}
            >
              <span>#{conf.label}</span>
            </button>
          );
        })}
      </div>

      {/* Message Feed */}
      <div className="space-y-3">
        {filteredMessages.map((msg) => {
          const conf = tagConfig[msg.tag] || tagConfig.aviso;
          const TagIcon = conf.icon;

          return (
            <div
              key={msg.id}
              className="bg-zinc-900/80 border border-zinc-800/80 hover:border-zinc-700/80 rounded-2xl p-4 transition-all"
            >
              <div className="flex items-center justify-between gap-2 mb-2">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-xs sm:text-sm text-white">
                    @{msg.author_name}
                  </span>
                  {msg.author_rank && (
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-zinc-800 text-zinc-400 border border-zinc-700/50">
                      {msg.author_rank}
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <span
                    className={`text-[10px] font-mono px-2 py-0.5 rounded border flex items-center gap-1 ${conf.bg} ${conf.border} ${conf.color}`}
                  >
                    <TagIcon className="w-3 h-3" />
                    #{conf.label}
                  </span>
                  <span className="text-[11px] text-zinc-500 font-mono">{msg.created_at}</span>
                </div>
              </div>

              <p className="text-xs sm:text-sm text-zinc-200 leading-relaxed whitespace-pre-line">
                {msg.content}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
};
