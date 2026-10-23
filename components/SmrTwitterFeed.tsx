'use client';

import React, { useState } from 'react';
import {
  Send,
  Coins,
  Share2,
  ExternalLink,
  MessageSquare,
  ShieldCheck,
  Check,
} from 'lucide-react';
import { ChatMessage, UserProfile } from '@/lib/types';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/EmptyState';
import { sound } from '@/lib/audio';

interface SmrTwitterFeedProps {
  messages: ChatMessage[];
  currentUser: UserProfile | null;
  onOpenAuth: () => void;
  onSendMessage: (text: string) => void;
  onTipUser: (targetUsername: string, amount: number) => void;
  onOpenSchedule?: () => void;
  onOpenTasks?: () => void;
  onOpenRussianRoulette?: () => void;
  composerRef?: React.RefObject<HTMLTextAreaElement | null>;
}

const FEED_TAGS = [
  { id: 'all', label: 'Todos' },
  { id: 'avisos', label: 'Avisos' },
  { id: 'dudas', label: 'Dudas' },
  { id: 'recreo', label: 'Recreo' },
] as const;

export const SmrTwitterFeed: React.FC<SmrTwitterFeedProps> = ({
  messages,
  currentUser,
  onOpenAuth,
  onSendMessage,
  onTipUser,
  composerRef: externalComposerRef,
}) => {
  const [activeFeedTab, setActiveFeedTab] = useState<'all' | 'avisos' | 'dudas' | 'recreo'>('all');
  const [inputText, setInputText] = useState('');
  const [selectedTag, setSelectedTag] = useState<string>('General');
  const [isPosting, setIsPosting] = useState(false);
  const [tipSuccessId, setTipSuccessId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const localTextareaRef = React.useRef<HTMLTextAreaElement | null>(null);
  const textareaRef = externalComposerRef || localTextareaRef;

  const handlePublish = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!inputText.trim() || isPosting) return;

    if (!currentUser) {
      sound.tap();
      onOpenAuth();
      return;
    }

    if (inputText.length > 280) return;

    setIsPosting(true);

    try {
      let finalMessage = inputText.trim();
      if (selectedTag && selectedTag !== 'General') {
        finalMessage = `[#${selectedTag}] ${finalMessage}`;
      }

      await onSendMessage(finalMessage);
      setInputText('');
      sound.tap();
    } catch (err) {
      console.error('Error al publicar mensaje:', err);
    } finally {
      setIsPosting(false);
    }
  };

  const handleTip = (msgId: string, authorUsername: string) => {
    if (!currentUser) {
      sound.tap();
      onOpenAuth();
      return;
    }
    if (currentUser.username === authorUsername) return;
    if (currentUser.coins < 50) {
      alert('Saldo insuficiente para enviar propina (mínimo 50 fichas).');
      return;
    }

    onTipUser(authorUsername, 50);
    sound.coinWin();
    setTipSuccessId(msgId);
    setTimeout(() => setTipSuccessId(null), 2000);
  };

  const handleShare = (msg: ChatMessage) => {
    const textToCopy = `"${msg.text}" — @${msg.username}`;
    if (navigator.clipboard) {
      navigator.clipboard.writeText(textToCopy);
      sound.tap();
      setCopiedId(msg.id);
      setTimeout(() => setCopiedId(null), 2000);
    }
  };

  const filteredMessages = messages.filter((msg) => {
    if (activeFeedTab === 'all') return true;
    const lower = msg.text.toLowerCase();

    if (activeFeedTab === 'avisos') {
      return (
        lower.includes('[#avisoaula]') ||
        lower.includes('[#examen]') ||
        lower.includes('#aviso') ||
        lower.includes('examen') ||
        lower.includes('tarea') ||
        lower.includes('entrega')
      );
    }

    if (activeFeedTab === 'dudas') {
      return (
        lower.includes('[#dudasmr]') ||
        lower.includes('#duda') ||
        lower.includes('?') ||
        lower.includes('duda') ||
        lower.includes('ayuda')
      );
    }

    if (activeFeedTab === 'recreo') {
      return (
        msg.is_system_win ||
        lower.includes('[#recreo]') ||
        lower.includes('ruleta') ||
        lower.includes('fichas')
      );
    }

    return true;
  });

  const renderFormattedText = (rawText: string) => {
    let cleanText = rawText;
    let extractedTag: string | null = null;

    const tagMatch = rawText.match(/^\[#(.*?)\]\s*/);
    if (tagMatch) {
      extractedTag = tagMatch[1];
      cleanText = rawText.replace(tagMatch[0], '');
    }

    const words = cleanText.split(/(\s+)/);

    return (
      <div className="space-y-1">
        {extractedTag && (
          <span className="inline-block text-[10px] font-mono font-medium px-2 py-0.2 rounded bg-surface-raised border border-border/80 text-foreground-muted">
            #{extractedTag}
          </span>
        )}
        <p className="text-[13.5px] text-foreground leading-relaxed break-words font-sans max-w-[75ch]">
          {words.map((word, i) => {
            if (word.startsWith('#') && word.length > 1) {
              return (
                <span key={i} className="text-accent font-medium">
                  {word}
                </span>
              );
            }
            if (word.startsWith('@') && word.length > 1) {
              return (
                <span key={i} className="text-foreground font-semibold font-mono">
                  {word}
                </span>
              );
            }
            if (word.startsWith('http://') || word.startsWith('https://')) {
              return (
                <a
                  key={i}
                  href={word}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-accent underline underline-offset-2 hover:opacity-80 inline-flex items-center gap-0.5"
                >
                  {word.length > 28 ? `${word.slice(0, 25)}...` : word}
                  <ExternalLink className="w-3 h-3 inline" />
                </a>
              );
            }
            return <React.Fragment key={i}>{word}</React.Fragment>;
          })}
        </p>
      </div>
    );
  };

  const charCount = inputText.length;

  return (
    <div className="w-full flex flex-col rounded-xl border border-border/70 min-h-[calc(100dvh-5.5rem)] bg-surface overflow-hidden shadow-2xs">
      {/* 1. Sticky Header and Filter Tabs */}
      <div className="sticky top-14 z-20 bg-surface/90 backdrop-blur-md border-b border-border/60">
        <div className="flex items-center justify-between px-4 sm:px-5 py-3">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-semibold text-foreground tracking-tight">
              Feed de clase
            </h2>
            <span className="text-[10px] font-mono px-1.5 py-0.2 rounded-full bg-surface-raised border border-border text-foreground-muted">
              {messages.length}
            </span>
          </div>
          <span className="text-[11px] text-foreground-subtle hidden sm:inline">
            Avisos, dudas y novedades de 2º SMR
          </span>
        </div>

        {/* Tab row */}
        <div className="px-3 sm:px-5 pb-2.5">
          <div className="flex items-center p-1 rounded-lg bg-surface-raised border border-border/50">
            {FEED_TAGS.map((tab) => {
              const isActive = activeFeedTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => {
                    sound.tap();
                    setActiveFeedTab(tab.id);
                  }}
                  className={`flex-1 py-1 text-xs font-medium text-center rounded-md transition-all cursor-pointer select-none active:scale-95 touch-manipulation ${
                    isActive
                      ? 'bg-foreground text-background font-semibold shadow-2xs'
                      : 'text-foreground-muted hover:text-foreground'
                  }`}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* 2. Minimalist Composer Box */}
      <div className="p-3.5 sm:p-4 border-b border-border/60 bg-surface-raised/20 space-y-2.5">
        <textarea
          ref={textareaRef}
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          onKeyDown={(e) => {
            if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
              handlePublish();
            }
          }}
          placeholder={
            currentUser
              ? `Escribe un aviso o duda para la clase, @${currentUser.username}...`
              : 'Inicia sesión para publicar en el feed...'
          }
          rows={2}
          maxLength={280}
          className="w-full bg-transparent text-sm text-foreground placeholder:text-foreground-subtle resize-none outline-none leading-relaxed font-sans"
        />

        {/* Tag selector chips */}
        <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none pb-0.5">
          {['General', 'AvisoAula', 'Examen', 'DudaSMR', 'Recreo'].map((tag) => {
            const isSelected = selectedTag === tag;
            return (
              <button
                key={tag}
                type="button"
                onClick={() => {
                  sound.tap();
                  setSelectedTag(tag);
                }}
                className={`px-2.5 py-0.5 rounded-md text-xs font-mono transition-all cursor-pointer border active:scale-95 touch-manipulation shrink-0 ${
                  isSelected
                    ? 'bg-foreground text-background font-semibold border-foreground'
                    : 'bg-surface text-foreground-muted border-border hover:text-foreground'
                }`}
              >
                #{tag}
              </button>
            );
          })}
        </div>

        <div className="flex items-center justify-between pt-2 border-t border-border/50">
          <span className="text-[11px] font-mono text-foreground-subtle">
            {280 - charCount} caracteres
          </span>

          <Button
            variant="primary"
            size="sm"
            onClick={() => handlePublish()}
            disabled={!inputText.trim() || isPosting || charCount > 280}
            isLoading={isPosting}
            className="rounded-lg px-3.5 h-8 text-xs font-medium"
          >
            <Send className="w-3.5 h-3.5" />
            <span>Publicar</span>
          </Button>
        </div>
      </div>

      {/* 3. Posts Stream with Smooth Content Visibility */}
      <div className="divide-y divide-border/50">
        {filteredMessages.length === 0 ? (
          <div className="p-10">
            <EmptyState
              icon={<MessageSquare className="w-8 h-8 opacity-40" />}
              title="Aún no hay publicaciones"
              description="Sé el primero en compartir un aviso sobre prácticas, exámenes o el temario."
            />
          </div>
        ) : (
          filteredMessages.map((msg) => {
            const isMe = currentUser && msg.user_id === currentUser.id;

            // System victory message
            if (msg.is_system_win) {
              return (
                <article
                  key={msg.id}
                  className="p-3.5 sm:p-4 bg-surface-raised/20 hover:bg-surface-raised/40 transition-colors content-auto"
                >
                  <div className="flex items-start justify-between gap-3 text-xs">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-surface border border-border text-foreground-muted">
                          Recreo
                        </span>
                        <span className="text-foreground-subtle font-mono text-[11px]">
                          {msg.created_at}
                        </span>
                      </div>
                      <p className="text-xs text-foreground-muted font-sans">
                        {msg.text}
                      </p>
                    </div>

                    {msg.win_amount && (
                      <span className="font-mono text-xs font-semibold text-emerald-500 shrink-0">
                        +{Number(msg.win_amount).toLocaleString('es-ES')}
                      </span>
                    )}
                  </div>
                </article>
              );
            }

            return (
              <article
                key={msg.id}
                className="p-3.5 sm:p-4 hover:bg-surface-raised/25 transition-colors content-auto"
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="w-6 h-6 rounded-md bg-surface-raised border border-border flex items-center justify-center font-mono font-semibold text-[11px] text-foreground uppercase shrink-0">
                        {msg.username.charAt(0)}
                      </div>

                      <span className="font-semibold text-xs text-foreground font-mono truncate">
                        @{msg.username}
                      </span>

                      {(msg.username === 'admin' || msg.username.toLowerCase().includes('delegado')) && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-mono px-1.5 py-0.2 rounded bg-accent/10 text-accent font-medium shrink-0">
                          <ShieldCheck className="w-2.5 h-2.5" />
                          <span>Delegado</span>
                        </span>
                      )}

                      <span className="text-[11px] text-foreground-subtle font-mono shrink-0">
                        {msg.created_at}
                      </span>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      {!isMe && currentUser && (
                        <button
                          type="button"
                          onClick={() => handleTip(msg.id, msg.username)}
                          title={`Enviar 50 fichas a @${msg.username}`}
                          aria-label={`Enviar 50 fichas a @${msg.username}`}
                          className="h-7 px-2 rounded-md bg-surface-raised hover:bg-surface-hover text-foreground flex items-center gap-1 text-[11px] font-mono border border-border/70 active:scale-95 transition-all touch-manipulation cursor-pointer"
                        >
                          <Coins className="w-3 h-3 text-amber-500" />
                          <span>{tipSuccessId === msg.id ? '¡Enviado!' : '50'}</span>
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => handleShare(msg)}
                        title="Copiar texto"
                        aria-label="Copiar texto del mensaje"
                        className="w-7 h-7 rounded-md text-foreground-subtle hover:text-foreground hover:bg-surface-raised flex items-center justify-center cursor-pointer active:scale-95 transition-all touch-manipulation border border-border/70"
                      >
                        {copiedId === msg.id ? (
                          <Check className="w-3 h-3 text-success" />
                        ) : (
                          <Share2 className="w-3 h-3" />
                        )}
                      </button>
                    </div>
                  </div>

                  <div className="pl-8">
                    {renderFormattedText(msg.text)}
                  </div>
                </div>
              </article>
            );
          })
        )}
      </div>
    </div>
  );
};
