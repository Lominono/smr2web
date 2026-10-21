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
  { id: 'all', label: 'Todo' },
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
    } catch (err) {
      console.error('Error al publicar mensaje:', err);
    } finally {
      setIsPosting(false);
    }
  };

  const handleTip = (msgId: string, authorUsername: string) => {
    if (!currentUser) {
      onOpenAuth();
      return;
    }
    if (currentUser.username === authorUsername) return;
    if (currentUser.coins < 50) {
      alert('Saldo insuficiente para enviar propina (mínimo 50 fichas).');
      return;
    }

    onTipUser(authorUsername, 50);
    setTipSuccessId(msgId);
    setTimeout(() => setTipSuccessId(null), 2000);
  };

  const handleShare = (msg: ChatMessage) => {
    const textToCopy = `"${msg.text}" — @${msg.username}`;
    if (navigator.clipboard) {
      navigator.clipboard.writeText(textToCopy);
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
      <div className="space-y-1.5">
        {extractedTag && (
          <Badge variant="accent" size="sm">
            #{extractedTag}
          </Badge>
        )}
        <p className="text-sm text-foreground leading-relaxed break-words font-sans">
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
                  className="text-foreground-muted underline hover:text-foreground inline-flex items-center gap-0.5"
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
    <div className="w-full flex flex-col border-x border-border min-h-[calc(100vh-3.5rem)] bg-background">
      {/* Header and Filter Tabs */}
      <div className="sticky top-14 z-20 bg-background/95 backdrop-blur-xs border-b border-border">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-semibold text-foreground tracking-tight">
              Feed de clase
            </h2>
            <Badge variant="default" size="sm">
              {messages.length}
            </Badge>
          </div>
        </div>

        {/* Tab row */}
        <div className="flex items-center border-t border-border px-2">
          {FEED_TAGS.map((tab) => {
            const isActive = activeFeedTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveFeedTab(tab.id)}
                className={`flex-1 py-2 text-xs font-medium text-center border-b-2 transition-colors cursor-pointer select-none ${
                  isActive
                    ? 'border-foreground text-foreground font-semibold'
                    : 'border-transparent text-foreground-subtle hover:text-foreground'
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Composer Box */}
      <div className="p-4 border-b border-border bg-surface">
        <div className="space-y-3">
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
                ? `Escribe una publicación o consulta, @${currentUser.username}...`
                : 'Inicia sesión para publicar en el feed...'
            }
            rows={2}
            maxLength={280}
            className="w-full bg-transparent text-sm text-foreground placeholder:text-foreground-subtle resize-none outline-none leading-relaxed font-sans"
          />

          {/* Tag selector chips */}
          <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none pb-1">
            {['General', 'AvisoAula', 'Examen', 'DudaSMR', 'Recreo'].map((tag) => {
              const isSelected = selectedTag === tag;
              return (
                <button
                  key={tag}
                  type="button"
                  onClick={() => setSelectedTag(tag)}
                  className={`px-2 py-0.5 rounded-[var(--radius-sm)] text-[11px] font-mono transition-colors cursor-pointer border ${
                    isSelected
                      ? 'bg-foreground text-background font-semibold border-foreground'
                      : 'bg-surface-raised text-foreground-muted border-border hover:text-foreground'
                  }`}
                >
                  #{tag}
                </button>
              );
            })}
          </div>

          <div className="flex items-center justify-between pt-2 border-t border-border">
            <span className="text-[11px] font-mono text-foreground-subtle">
              {280 - charCount} caracteres restantes
            </span>

            <Button
              variant="primary"
              size="sm"
              onClick={() => handlePublish()}
              disabled={!inputText.trim() || isPosting || charCount > 280}
              isLoading={isPosting}
            >
              <Send className="w-3.5 h-3.5" />
              <span>Publicar</span>
            </Button>
          </div>
        </div>
      </div>

      {/* Posts Stream */}
      <div className="divide-y divide-border">
        {filteredMessages.length === 0 ? (
          <div className="p-10">
            <EmptyState
              icon={<MessageSquare className="w-8 h-8 opacity-40" />}
              title="Aún no hay publicaciones"
              description="Sé el primero en compartir un aviso sobre prácticas, exámenes o el recreo."
            />
          </div>
        ) : (
          filteredMessages.map((msg) => {
            const isMe = currentUser && msg.user_id === currentUser.id;

            // System victory message
            if (msg.is_system_win) {
              return (
                <article key={msg.id} className="p-4 bg-surface/30">
                  <div className="flex items-start justify-between gap-3 text-xs">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <Badge variant="accent" size="sm">
                          Recreo
                        </Badge>
                        <span className="text-foreground-subtle font-mono text-[11px]">
                          {msg.created_at}
                        </span>
                      </div>
                      <p className="text-sm text-foreground-muted font-sans">
                        {msg.text}
                      </p>
                    </div>

                    {msg.win_amount && (
                      <Badge variant="accent" size="sm">
                        +{Number(msg.win_amount).toLocaleString('es-ES')} fichas
                      </Badge>
                    )}
                  </div>
                </article>
              );
            }

            return (
              <article key={msg.id} className="p-4 hover:bg-surface-raised/40 transition-colors">
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-xs text-foreground font-mono">
                        @{msg.username}
                      </span>

                      {(msg.username === 'admin' || msg.username.toLowerCase().includes('delegado')) && (
                        <Badge variant="accent" size="sm">
                          <ShieldCheck className="w-3 h-3" />
                          <span>Delegado</span>
                        </Badge>
                      )}

                      <span className="text-[11px] text-foreground-subtle font-mono">
                        {msg.created_at}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      {!isMe && currentUser && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleTip(msg.id, msg.username)}
                          title={`Enviar 50 fichas a @${msg.username}`}
                        >
                          <Coins className="w-3 h-3 text-accent" />
                          <span>{tipSuccessId === msg.id ? 'Enviado' : '50'}</span>
                        </Button>
                      )}

                      <button
                        type="button"
                        onClick={() => handleShare(msg)}
                        title="Copiar texto"
                        className="p-1.5 rounded-[var(--radius-sm)] text-foreground-subtle hover:text-foreground hover:bg-surface-raised cursor-pointer"
                      >
                        {copiedId === msg.id ? (
                          <Check className="w-3.5 h-3.5 text-success" />
                        ) : (
                          <Share2 className="w-3.5 h-3.5" />
                        )}
                      </button>
                    </div>
                  </div>

                  {renderFormattedText(msg.text)}
                </div>
              </article>
            );
          })
        )}
      </div>
    </div>
  );
};
