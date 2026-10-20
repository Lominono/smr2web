'use client';

import React, { useState, useRef, useEffect } from 'react';
import { ChatMessage, UserProfile } from '@/lib/types';
import { sound } from '@/lib/audio';
import { Send, MessageSquare, Coins, Trophy, User, LogIn, X } from 'lucide-react';

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
    <div className={`flex flex-col glass-panel border border-white/[0.08] rounded-3xl overflow-hidden shadow-[0_16px_50px_rgba(0,0,0,0.6)] ${
      isDrawer ? 'h-full' : 'h-[600px]'
    }`}>
      {/* Drawer drag indicator on mobile */}
      {isDrawer && (
        <div className="w-12 h-1.5 rounded-full bg-white/20 mx-auto mt-3 mb-1" />
      )}

      {/* Header */}
      <div className="px-4 py-3.5 border-b border-white/[0.06] flex items-center justify-between bg-black/40">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
          <h3 className="text-xs font-semibold text-white tracking-tight font-mono">
            Chat
          </h3>
        </div>

        {onClose && (
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-white/[0.06] transition-colors min-w-[36px] min-h-[36px] flex items-center justify-center cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-6 text-zinc-500 font-mono text-xs">
            <MessageSquare className="w-5 h-5 mb-2 opacity-30 text-zinc-400" />
            <p>Sin mensajes aún</p>
          </div>
        ) : (
          messages.map((msg) => {
            const isMe = currentUser && msg.user_id === currentUser.id;

            if (msg.is_system_win) {
              return (
                <div
                  key={msg.id}
                  className="p-2 rounded-xl bg-amber-500/[0.06] border border-amber-500/20 text-xs font-mono flex items-center justify-between gap-2"
                >
                  <div className="flex items-center gap-2 text-amber-300">
                    <Trophy className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                    <span className="text-[11px] font-medium leading-snug">{msg.text}</span>
                  </div>
                  {msg.win_amount && (
                    <span className="text-[10px] text-amber-400 font-semibold shrink-0">
                      +{msg.win_amount.toLocaleString()}
                    </span>
                  )}
                </div>
              );
            }

            return (
              <div
                key={msg.id}
                className={`flex gap-2 ${isMe ? 'justify-end' : 'justify-start'}`}
              >
                {!isMe && (
                  <div className="w-6 h-6 rounded-full bg-white/[0.06] border border-white/10 flex items-center justify-center shrink-0 self-end mb-0.5 text-zinc-400 text-xs">
                    <User className="w-3 h-3" />
                  </div>
                )}

                <div className={`max-w-[82%] ${isMe ? 'items-end' : 'items-start'} flex flex-col`}>
                  {!isMe && (
                    <div className="flex items-center gap-1.5 mb-0.5 px-1">
                      <span className="text-[11px] font-medium text-zinc-400 font-mono">
                        @{msg.username}
                      </span>
                      {currentUser && (
                        <button
                          onClick={() => onTipUser(msg.username, 50)}
                          title={`Transferir 50 fichas a @${msg.username}`}
                          className="text-[10px] font-mono text-amber-400/80 hover:text-amber-300 hover:underline flex items-center gap-0.5 ml-1"
                        >
                          <Coins className="w-2.5 h-2.5" />
                          <span>50</span>
                        </button>
                      )}
                    </div>
                  )}

                  <div
                    className={`px-3 py-1.5 rounded-2xl text-xs sm:text-sm leading-relaxed ${
                      isMe
                        ? 'bg-zinc-200 text-black font-medium rounded-br-xs'
                        : 'bg-white/[0.06] text-zinc-200 border border-white/[0.06] rounded-bl-xs'
                    }`}
                  >
                    <p className="break-words">{msg.text}</p>
                  </div>

                  <span className="text-[9px] text-zinc-600 font-mono mt-0.5 px-1">
                    {msg.created_at}
                  </span>
                </div>
              </div>
            );
          })
        )}
        <div ref={chatBottomRef} />
      </div>

      {/* Input */}
      {currentUser ? (
        <form
          onSubmit={handleSubmit}
          className={`p-2.5 sm:p-3 bg-black/50 border-t border-white/[0.06] flex items-center gap-2 ${
            isDrawer ? 'pb-[max(0.75rem,env(safe-area-inset-bottom))]' : ''
          }`}
        >
          <input
            type="text"
            placeholder="Escribe un mensaje en el canal..."
            value={text}
            onChange={(e) => setText(e.target.value)}
            className="flex-1 min-h-[42px] px-3.5 py-2 bg-white/[0.04] border border-white/[0.08] rounded-xl text-xs sm:text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-white/20 transition-colors font-sans"
          />
          <button
            type="submit"
            disabled={!text.trim()}
            className="min-h-[42px] min-w-[42px] p-2.5 rounded-xl bg-white hover:bg-zinc-200 disabled:opacity-20 text-black transition-all cursor-pointer shadow-sm shrink-0 active:scale-95 flex items-center justify-center"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      ) : (
        <div
          className={`p-3 bg-black/50 border-t border-white/[0.06] flex items-center justify-between ${
            isDrawer ? 'pb-[max(0.75rem,env(safe-area-inset-bottom))]' : ''
          }`}
        >
          <span className="text-[11px] font-mono text-zinc-500">Inicia sesión para escribir</span>
          <button
            onClick={onOpenAuth}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white hover:bg-zinc-200 text-black text-xs font-mono font-bold transition-all cursor-pointer active:scale-95"
          >
            <LogIn className="w-3.5 h-3.5" />
            <span>Acceder</span>
          </button>
        </div>
      )}
    </div>
  );
};
