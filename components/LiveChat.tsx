'use client';

import React, { useState, useRef, useEffect } from 'react';
import { ChatMessage, UserProfile } from '@/lib/types';
import { sound } from '@/lib/audio';
import { Send, MessageSquare, Coins, Trophy, Zap, Shield, User, LogIn, X } from 'lucide-react';

interface LiveChatProps {
  messages: ChatMessage[];
  currentUser: UserProfile | null;
  onOpenAuth: () => void;
  onSendMessage: (text: string) => void;
  onTipUser: (targetUsername: string, amount: number) => void;
  onClose?: () => void;
  isDrawer?: boolean;
}

export const LiveChat: React.FC<LiveChatProps> = ({
  messages,
  currentUser,
  onOpenAuth,
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

    if (!currentUser) {
      onOpenAuth();
      return;
    }

    onSendMessage(text.trim());
    sound.tap();
    setText('');
  };

  return (
    <div className={`flex flex-col bg-[#0b0c10] border border-white/[0.08] rounded-3xl overflow-hidden shadow-2xl ${
      isDrawer ? 'h-full' : 'h-[640px]'
    }`}>
      {/* Header */}
      <div className="px-5 py-4 border-b border-white/[0.08] flex items-center justify-between bg-black/40 backdrop-blur-md">
        <div className="flex items-center gap-2.5">
          <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse"></div>
          <div>
            <h3 className="text-sm font-bold text-white tracking-tight font-mono">
              CHAT GENERAL
            </h3>
            <p className="text-[10px] text-zinc-400 font-mono">
              Conexión en directo con Supabase
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

      {/* Message Feed */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-6 text-zinc-500">
            <MessageSquare className="w-8 h-8 mb-2 opacity-40 text-zinc-400" />
            <p className="text-xs font-mono text-zinc-400">Canal vacío</p>
            <p className="text-[11px] text-zinc-600 mt-1">Escribe el primer mensaje para iniciar la conversación.</p>
          </div>
        ) : (
          messages.map((msg) => {
            const isMe = currentUser && msg.user_id === currentUser.id;

            if (msg.is_system_win) {
              return (
                <div
                  key={msg.id}
                  className="my-2 p-2.5 rounded-2xl bg-amber-500/10 border border-amber-500/25 text-xs font-mono flex items-center justify-between gap-2 shadow-sm"
                >
                  <div className="flex items-center gap-2 text-amber-300">
                    <Trophy className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                    <span className="font-semibold">{msg.text}</span>
                  </div>
                  {msg.win_amount && (
                    <span className="text-[10px] text-amber-400 font-bold shrink-0">
                      +{msg.win_amount.toLocaleString()}
                    </span>
                  )}
                </div>
              );
            }

            return (
              <div
                key={msg.id}
                className={`flex gap-2.5 ${isMe ? 'justify-end' : 'justify-start'}`}
              >
                {!isMe && (
                  <div className="w-7 h-7 rounded-full bg-white/[0.08] border border-white/10 flex items-center justify-center shrink-0 self-end mb-0.5 text-zinc-300">
                    <User className="w-3.5 h-3.5" />
                  </div>
                )}

                <div className={`max-w-[80%] ${isMe ? 'items-end' : 'items-start'} flex flex-col`}>
                  {!isMe && (
                    <div className="flex items-center gap-1.5 mb-1 px-1">
                      <span className="text-[11px] font-bold text-zinc-300 font-mono">
                        @{msg.username}
                      </span>
                      {currentUser && (
                        <button
                          onClick={() => onTipUser(msg.username, 50)}
                          title={`Enviar 50 fichas a @${msg.username}`}
                          className="text-[10px] font-mono text-amber-400 hover:text-amber-300 hover:underline flex items-center gap-0.5 ml-1"
                        >
                          <Coins className="w-2.5 h-2.5" />
                          <span>50</span>
                        </button>
                      )}
                    </div>
                  )}

                  <div
                    className={`px-3.5 py-2 rounded-2xl text-xs sm:text-sm leading-relaxed ${
                      isMe
                        ? 'bg-white text-black font-medium rounded-br-xs'
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
          })
        )}
        <div ref={chatBottomRef} />
      </div>

      {/* Input or Login Prompt */}
      {currentUser ? (
        <form onSubmit={handleSubmit} className="p-3 bg-black/50 border-t border-white/[0.08] flex items-center gap-2">
          <input
            type="text"
            placeholder="Escribe en el chat..."
            value={text}
            onChange={(e) => setText(e.target.value)}
            className="flex-1 px-3.5 py-2 bg-white/[0.04] border border-white/[0.08] rounded-xl text-xs sm:text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-white/30 transition-colors"
          />
          <button
            type="submit"
            disabled={!text.trim()}
            className="p-2.5 rounded-xl bg-white hover:bg-zinc-200 disabled:opacity-30 disabled:hover:bg-white text-black transition-all cursor-pointer shadow-md shrink-0 active:scale-95"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      ) : (
        <div className="p-3 bg-black/50 border-t border-white/[0.08] flex items-center justify-between">
          <span className="text-xs font-mono text-zinc-400">Inicia sesión para enviar mensajes</span>
          <button
            onClick={onOpenAuth}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white hover:bg-zinc-200 text-black text-xs font-mono font-bold transition-all"
          >
            <LogIn className="w-3 h-3" />
            <span>Acceder</span>
          </button>
        </div>
      )}
    </div>
  );
};
