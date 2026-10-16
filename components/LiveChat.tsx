'use client';

import React, { useState, useRef, useEffect } from 'react';
import { ChatMessage, UserProfile } from '@/lib/types';
import { sound } from '@/lib/audio';
import { Send, Coins, Flame, Trophy, Sparkles, Smile, ArrowUpRight, X } from 'lucide-react';

interface LiveChatProps {
  messages: ChatMessage[];
  currentUser: UserProfile;
  onSendMessage: (text: string) => void;
  onTipUser: (targetUsername: string, amount: number) => void;
  onClose?: () => void;
  isDrawer?: boolean;
}

export const LiveChat: React.FC<LiveChatProps> = ({
  messages,
  currentUser,
  onSendMessage,
  onTipUser,
  onClose,
  isDrawer = false,
}) => {
  const [text, setText] = useState('');
  const chatBottomRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim()) return;

    onSendMessage(text.trim());
    sound.tap();
    setText('');
  };

  const handleSendReaction = (emoji: string) => {
    onSendMessage(emoji);
    sound.tap();
  };

  return (
    <div className={`flex flex-col bg-[#0b0c10] border border-white/[0.08] rounded-3xl overflow-hidden shadow-2xl ${
      isDrawer ? 'h-full' : 'h-[640px]'
    }`}>
      {/* Chat Header */}
      <div className="px-5 py-4 border-b border-white/[0.08] flex items-center justify-between bg-black/40 backdrop-blur-md">
        <div className="flex items-center gap-2.5">
          <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse"></div>
          <div>
            <h3 className="text-sm font-bold text-white tracking-tight font-sans">
              EL CHAT DEL FONDO
            </h3>
            <p className="text-[10px] text-zinc-400 font-mono">
              En directo · Apuestas, piques y propinas
            </p>
          </div>
        </div>

        {onClose && (
          <button
            onClick={onClose}
            className="p-1 rounded-xl text-zinc-400 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Messages Feed */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.map((msg) => {
          const isMe = msg.user_id === currentUser.id;

          // Special System Win Message Banner
          if (msg.is_system_win) {
            return (
              <div
                key={msg.id}
                className="my-2 p-2.5 rounded-2xl bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent border border-amber-500/30 text-xs font-mono flex items-center justify-between gap-2 shadow-sm"
              >
                <div className="flex items-center gap-2 text-amber-300">
                  <span className="text-base">🚨</span>
                  <span className="font-semibold">{msg.text}</span>
                </div>
                <span className="text-[10px] text-amber-400/80 font-bold shrink-0">
                  +{msg.win_amount?.toLocaleString()} 🪙
                </span>
              </div>
            );
          }

          return (
            <div
              key={msg.id}
              className={`flex gap-2.5 ${isMe ? 'justify-end' : 'justify-start'}`}
            >
              {!isMe && (
                <img
                  src={msg.avatar_url || 'https://api.dicebear.com/7.x/notionists/svg?seed=anon'}
                  alt={msg.username}
                  className="w-7 h-7 rounded-full bg-zinc-800 border border-white/10 shrink-0 self-end mb-0.5"
                />
              )}

              <div className={`max-w-[78%] ${isMe ? 'items-end' : 'items-start'} flex flex-col`}>
                {!isMe && (
                  <div className="flex items-center gap-1.5 mb-1 px-1">
                    <span className="text-[11px] font-bold text-zinc-300">
                      @{msg.username}
                    </span>
                    <button
                      onClick={() => onTipUser(msg.username, 50)}
                      title={`Dar 50 🪙 de propina a @${msg.username}`}
                      className="text-[10px] font-mono text-amber-400 hover:text-amber-300 hover:underline flex items-center gap-0.5 ml-1"
                    >
                      <span>dar 50🪙</span>
                    </button>
                  </div>
                )}

                <div
                  className={`px-3.5 py-2 rounded-2xl text-xs sm:text-sm leading-relaxed ${
                    isMe
                      ? 'bg-blue-600 text-white rounded-br-xs'
                      : 'bg-white/[0.08] text-zinc-200 border border-white/[0.06] rounded-bl-xs'
                  }`}
                >
                  <p className="break-words">{msg.text}</p>
                </div>

                <span className="text-[10px] text-zinc-500 font-mono mt-0.5 px-1">
                  {msg.created_at}
                </span>
              </div>
            </div>
          );
        })}
        <div ref={chatBottomRef} />
      </div>

      {/* Quick Reactions Bar */}
      <div className="px-4 py-1.5 bg-black/30 border-t border-white/[0.04] flex items-center gap-1.5 overflow-x-auto">
        <span className="text-[10px] font-mono text-zinc-500 mr-1">Reaccionar:</span>
        {['🔥', '💀', '😂', '🪙', '🚀', '👀'].map((emoji) => (
          <button
            key={emoji}
            type="button"
            onClick={() => handleSendReaction(emoji)}
            className="px-2 py-0.5 rounded-lg bg-white/[0.05] hover:bg-white/[0.1] text-xs transition-transform active:scale-125"
          >
            {emoji}
          </button>
        ))}
      </div>

      {/* Message Input */}
      <form onSubmit={handleSubmit} className="p-3 bg-black/50 border-t border-white/[0.08] flex items-center gap-2">
        <input
          type="text"
          placeholder="Escribe en el chat..."
          value={text}
          onChange={(e) => setText(e.target.value)}
          className="flex-1 px-3.5 py-2 bg-white/[0.06] border border-white/[0.08] rounded-xl text-xs sm:text-sm text-white placeholder:text-zinc-500 focus:outline-none focus:border-blue-500 transition-colors"
        />
        <button
          type="submit"
          disabled={!text.trim()}
          className="p-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-40 disabled:hover:bg-blue-600 text-white transition-all cursor-pointer shadow-md shrink-0 active:scale-95"
        >
          <Send className="w-4 h-4" />
        </button>
      </form>
    </div>
  );
};
