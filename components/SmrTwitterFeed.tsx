'use client';

import React, { useState, useRef, useEffect } from 'react';
import {
  Send,
  Coins,
  Share2,
  ExternalLink,
  MessageSquare,
  Check,
  Heart,
  CornerDownRight,
  Search,
  X,
  RotateCcw,
  Pin,
  Trash2,
  Bell,
  AlertCircle,
  Code,
  Copy,
  Terminal,
  FolderGit2,
  FileText,
} from 'lucide-react';
import { ChatMessage, UserProfile } from '@/lib/types';
import { Button } from '@/components/ui/Button';
import { sound } from '@/lib/audio';

interface SmrTwitterFeedProps {
  messages: ChatMessage[];
  currentUser: UserProfile | null;
  onOpenAuth: () => void;
  onSendMessage: (text: string, tag?: string, pinned?: boolean) => void;
  onDeleteMessage?: (messageId: string) => void;
  onTipUser: (targetUsername: string, amount: number) => void;
  onToggleLike?: (messageId: string) => void;
  onOpenNotifications?: () => void;
  onOpenFeedback?: () => void;
  isRealtimeConnected?: boolean;
  composerRef?: React.RefObject<HTMLTextAreaElement | null>;
}

type FeedFilterId = 'all' | 'avisos' | 'dudas' | 'recursos' | 'recreo';

interface FeedTabItem {
  id: FeedFilterId;
  label: string;
}

const FEED_TABS: FeedTabItem[] = [
  { id: 'all', label: 'Todo' },
  { id: 'avisos', label: 'Avisos' },
  { id: 'dudas', label: 'Dudas' },
  { id: 'recursos', label: 'Recursos' },
  { id: 'recreo', label: 'Recreo' },
];

const COMPOSER_TAGS = [
  { id: 'General', label: 'general' },
  { id: 'Aviso', label: 'aviso' },
  { id: 'Duda', label: 'duda' },
  { id: 'Examen', label: 'examen' },
  { id: 'Recurso', label: 'recurso' },
  { id: 'Recreo', label: 'recreo' },
] as const;

/**
 * Formato conciso de tiempo relativo
 */
function formatRelativeTime(dateStr: string): string {
  if (!dateStr) return '';
  if (/^\d{1,2}:\d{2}/.test(dateStr) && !dateStr.includes('-') && !dateStr.includes('T')) {
    return dateStr;
  }
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    if (diffMs < 0) return 'ahora';
    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    const diffHr = Math.floor(diffMin / 60);
    const diffDays = Math.floor(diffHr / 24);

    if (diffSec < 45) return 'ahora';
    if (diffMin < 60) return `${diffMin}m`;
    if (diffHr < 24) return `${diffHr}h`;
    if (diffDays === 1) return 'ayer';
    if (diffDays < 7) return `${diffDays}d`;
    return d.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
  } catch {
    return dateStr;
  }
}

export const SmrTwitterFeed: React.FC<SmrTwitterFeedProps> = ({
  messages,
  currentUser,
  onOpenAuth,
  onSendMessage,
  onDeleteMessage,
  onTipUser,
  onToggleLike,
  onOpenNotifications,
  onOpenFeedback,
  isRealtimeConnected = true,
  composerRef: externalComposerRef,
}) => {
  const [activeTab, setActiveTab] = useState<FeedFilterId>('all');
  const [inputText, setInputText] = useState('');
  const [selectedTag, setSelectedTag] = useState<string>('General');
  const [isPinned, setIsPinned] = useState(false);
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isPosting, setIsPosting] = useState(false);
  const [tipSuccessId, setTipSuccessId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [copiedCodeId, setCopiedCodeId] = useState<string | null>(null);
  const [hasNewMessagesAbove, setHasNewMessagesAbove] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const prevCountRef = useRef(messages.length);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const localTextareaRef = useRef<HTMLTextAreaElement | null>(null);
  const textareaRef = externalComposerRef || localTextareaRef;
  const searchInputRef = useRef<HTMLInputElement | null>(null);

  const isStaff =
    currentUser?.role === 'admin' ||
    currentUser?.role === 'delegado' ||
    currentUser?.username === 'admin';

  useEffect(() => {
    if (messages.length > prevCountRef.current) {
      if (typeof window !== 'undefined' && window.scrollY > 300) {
        setHasNewMessagesAbove(true);
      }
    }
    prevCountRef.current = messages.length;
  }, [messages.length]);

  const scrollToTop = () => {
    sound.tap();
    setHasNewMessagesAbove(false);
    containerRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    const el = textareaRef.current;
    if (el) {
      el.style.height = 'auto';
      el.style.height = `${Math.min(220, Math.max(68, el.scrollHeight))}px`;
    }
  }, [inputText, textareaRef]);

  useEffect(() => {
    if (isSearchOpen && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [isSearchOpen]);

  const handlePublish = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const trimmed = inputText.trim();
    if (!trimmed || isPosting) return;

    if (!currentUser) {
      sound.tap();
      onOpenAuth();
      return;
    }

    if (trimmed.length > 320) return;

    setIsPosting(true);

    try {
      let finalMessage = trimmed;
      let postTag: string | undefined = undefined;

      if (selectedTag && selectedTag !== 'General') {
        postTag = selectedTag.toLowerCase();
        if (!finalMessage.includes(`#${selectedTag}`)) {
          finalMessage = `[#${selectedTag}] ${finalMessage}`;
        }
      }

      await onSendMessage(finalMessage, postTag, isPinned);
      setInputText('');
      setReplyingTo(null);
      setSelectedTag('General');
      setIsPinned(false);
      sound.tap();
    } catch (err) {
      console.error('Error al publicar mensaje:', err);
    } finally {
      setIsPosting(false);
    }
  };

  const handleInsertCodeSnippet = () => {
    sound.tap();
    setInputText((prev) => (prev ? `${prev} \`comando\` ` : '`comando` '));
    textareaRef.current?.focus();
  };

  const handleStartReply = (username: string) => {
    sound.tap();
    setReplyingTo(username);
    const prefix = `@${username} `;
    if (!inputText.startsWith(prefix)) {
      setInputText((prev) => (prev ? `${prefix}${prev}` : prefix));
    }
    textareaRef.current?.focus();
    textareaRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  };

  const handleCancelReply = () => {
    sound.tap();
    setReplyingTo(null);
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
    setTimeout(() => setTipSuccessId(null), 2500);
  };

  const handleShare = (msg: ChatMessage) => {
    const textToCopy = `"${msg.text}" — @${msg.username} (2º SMR)`;
    if (navigator.clipboard) {
      navigator.clipboard.writeText(textToCopy);
      sound.tap();
      setCopiedId(msg.id);
      setTimeout(() => setCopiedId(null), 2000);
    }
  };

  const handleCopyCode = (codeText: string, id: string) => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(codeText);
      sound.tap();
      setCopiedCodeId(id);
      setTimeout(() => setCopiedCodeId(null), 2000);
    }
  };

  const handleDelete = async (msgId: string) => {
    if (!onDeleteMessage) return;
    if (!window.confirm('¿Eliminar esta publicación?')) return;
    sound.tap();
    setDeletingId(msgId);
    try {
      await onDeleteMessage(msgId);
    } finally {
      setDeletingId(null);
    }
  };

  const filteredMessages = messages.filter((msg) => {
    const textLower = (msg.text || '').toLowerCase();
    const userLower = (msg.username || '').toLowerCase();
    const tagLower = (msg.tag || '').toLowerCase();

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      const matchesText = textLower.includes(q);
      const matchesUser = userLower.includes(q.replace('@', ''));
      const matchesTag = tagLower.includes(q.replace('#', ''));
      if (!matchesText && !matchesUser && !matchesTag) return false;
    }

    if (activeTab === 'all') return true;

    if (activeTab === 'avisos') {
      return (
        msg.pinned ||
        tagLower === 'aviso' ||
        tagLower === 'examen' ||
        textLower.includes('[#aviso') ||
        textLower.includes('[#examen') ||
        textLower.includes('#aviso') ||
        textLower.includes('#examen') ||
        textLower.includes('examen') ||
        textLower.includes('entrega')
      );
    }

    if (activeTab === 'dudas') {
      return (
        tagLower === 'duda' ||
        textLower.includes('[#duda') ||
        textLower.includes('#duda') ||
        textLower.includes('?') ||
        textLower.includes('duda') ||
        textLower.includes('error') ||
        textLower.includes('fallo') ||
        textLower.includes('packet tracer') ||
        textLower.includes('cisco')
      );
    }

    if (activeTab === 'recursos') {
      return (
        tagLower === 'recurso' ||
        tagLower === 'apuntes' ||
        textLower.includes('[#recurso') ||
        textLower.includes('[#apunte') ||
        textLower.includes('github.com') ||
        textLower.includes('drive.google') ||
        textLower.includes('pdf') ||
        textLower.includes('temario')
      );
    }

    if (activeTab === 'recreo') {
      return (
        msg.is_system_win ||
        tagLower === 'recreo' ||
        textLower.includes('[#recreo') ||
        textLower.includes('ruleta') ||
        textLower.includes('fichas')
      );
    }

    return true;
  });

  const getTabCount = (tabId: FeedFilterId) => {
    if (tabId === 'all') return messages.length;
    return messages.filter((m) => {
      const t = (m.text || '').toLowerCase();
      const tag = (m.tag || '').toLowerCase();
      if (tabId === 'avisos') {
        return m.pinned || tag === 'aviso' || tag === 'examen' || t.includes('#aviso') || t.includes('examen');
      }
      if (tabId === 'dudas') {
        return tag === 'duda' || t.includes('#duda') || t.includes('?');
      }
      if (tabId === 'recursos') {
        return tag === 'recurso' || tag === 'apuntes' || t.includes('github') || t.includes('drive');
      }
      if (tabId === 'recreo') {
        return m.is_system_win || tag === 'recreo' || t.includes('fichas');
      }
      return false;
    }).length;
  };

  const renderFormattedText = (rawText: string, messageTag?: string, msgId?: string) => {
    let cleanText = rawText;
    let extractedTag: string | null = messageTag || null;

    const tagMatch = rawText.match(/^\[#(.*?)\]\s*/);
    if (tagMatch) {
      if (!extractedTag) extractedTag = tagMatch[1];
      cleanText = rawText.replace(tagMatch[0], '');
    }

    const codeBlockMatch = cleanText.match(/```([\s\S]*?)```/);
    let codeBlockContent: string | null = null;
    if (codeBlockMatch) {
      codeBlockContent = codeBlockMatch[1].trim();
      cleanText = cleanText.replace(codeBlockMatch[0], '').trim();
    }

    const words = cleanText.split(/(\s+)/);

    return (
      <div className="space-y-2 min-w-0">
        {extractedTag && extractedTag.toLowerCase() !== 'general' && (
          <div className="flex items-center gap-1">
            <span className="text-[11px] font-mono font-medium px-1.5 py-0.5 rounded bg-surface-raised border border-border text-foreground-muted">
              #{extractedTag}
            </span>
          </div>
        )}

        <div className="text-[14px] sm:text-[13px] text-foreground leading-relaxed break-words [overflow-wrap:anywhere] font-sans max-w-prose">
          {words.map((word, i) => {
            if (word.startsWith('@') && word.length > 1) {
              return (
                <span
                  key={i}
                  onClick={(e) => {
                    e.stopPropagation();
                    setSearchQuery(word);
                    setIsSearchOpen(true);
                  }}
                  className="font-medium text-foreground hover:underline cursor-pointer bg-surface-raised px-1 py-0.5 rounded text-xs"
                >
                  {word}
                </span>
              );
            }

            if (word.startsWith('#') && word.length > 1) {
              return (
                <span
                  key={i}
                  onClick={(e) => {
                    e.stopPropagation();
                    setSearchQuery(word);
                    setIsSearchOpen(true);
                  }}
                  className="text-accent hover:underline cursor-pointer"
                >
                  {word}
                </span>
              );
            }

            if (word.startsWith('`') && word.endsWith('`') && word.length > 2) {
              const cmd = word.slice(1, -1);
              return (
                <code
                  key={i}
                  onClick={(e) => {
                    e.stopPropagation();
                    navigator.clipboard.writeText(cmd);
                    sound.tap();
                  }}
                  title="Copiar comando"
                  className="px-1.5 py-0.5 mx-0.5 rounded bg-surface-raised border border-border font-mono text-xs text-foreground cursor-copy hover:border-foreground/40 transition-colors"
                >
                  {cmd}
                </code>
              );
            }

            if (word.startsWith('http://') || word.startsWith('https://')) {
              const isGithub = word.includes('github.com');
              const isDrive = word.includes('drive.google.com') || word.includes('docs.google.com');

              return (
                <a
                  key={i}
                  href={word}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-accent hover:underline inline-flex items-center gap-1 break-all text-xs bg-surface-raised px-1.5 py-0.5 rounded border border-border/60"
                >
                  {isGithub ? (
                    <FolderGit2 className="w-3 h-3 shrink-0" />
                  ) : isDrive ? (
                    <FileText className="w-3 h-3 shrink-0" />
                  ) : (
                    <ExternalLink className="w-3 h-3 shrink-0" />
                  )}
                  <span>{word.length > 36 ? `${word.slice(0, 33)}...` : word}</span>
                </a>
              );
            }

            return <React.Fragment key={i}>{word}</React.Fragment>;
          })}
        </div>

        {codeBlockContent && (
          <div className="my-2 rounded-lg border border-border bg-surface-raised p-2.5 font-mono text-xs text-foreground relative">
            <div className="flex items-center justify-between pb-1.5 mb-1.5 border-b border-border text-[11px] text-foreground-subtle">
              <span className="flex items-center gap-1.5 font-medium text-foreground">
                <Terminal className="w-3 h-3" />
                <span>Consola / Script</span>
              </span>
              <button
                type="button"
                onClick={() => handleCopyCode(codeBlockContent!, msgId || 'block')}
                className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-surface border border-border text-foreground-muted hover:text-foreground cursor-pointer transition-colors"
              >
                {copiedCodeId === (msgId || 'block') ? (
                  <>
                    <Check className="w-3 h-3 text-emerald-500" />
                    <span>Copiado</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3 h-3" />
                    <span>Copiar</span>
                  </>
                )}
              </button>
            </div>
            <pre className="overflow-x-auto whitespace-pre-wrap leading-relaxed select-all">
              {codeBlockContent}
            </pre>
          </div>
        )}

        {words
          .filter((w) => /^https?:\/\/.*\.(png|jpe?g|gif|webp)(\?.*)?$/i.test(w))
          .slice(0, 1)
          .map((imgUrl, idx) => (
            <div
              key={idx}
              className="mt-2 rounded-lg overflow-hidden border border-border max-h-72 max-w-md bg-surface-raised"
            >
              <img
                src={imgUrl}
                alt="Adjunto"
                loading="lazy"
                className="w-full h-full object-contain cursor-pointer"
                onClick={() => window.open(imgUrl, '_blank')}
              />
            </div>
          ))}
      </div>
    );
  };

  const charCount = inputText.length;
  const isNearLimit = charCount > 280;

  return (
    <div
      ref={containerRef}
      className="relative w-full flex flex-col sm:rounded-xl border-y sm:border border-border bg-surface"
    >
      {/* Botón flotante para saltar a mensajes nuevos */}
      {hasNewMessagesAbove && (
        <div className="sticky top-[calc(6.8rem+env(safe-area-inset-top,0px))] z-30 flex justify-center w-full pointer-events-none -mb-8">
          <button
            type="button"
            onClick={scrollToTop}
            className="pointer-events-auto flex items-center gap-1.5 px-3 py-1 rounded-full bg-foreground text-background text-xs font-medium shadow-md hover:opacity-90 active:scale-95 transition-all cursor-pointer touch-manipulation"
          >
            <span>Nuevos mensajes</span>
          </button>
        </div>
      )}

      {/* 1. Cabecera sobria del Feed */}
      <div className="sticky top-[calc(3.5rem+env(safe-area-inset-top,0px))] z-20 bg-surface/95 backdrop-blur-md border-b border-border">
        <div className="flex items-center justify-between px-3.5 sm:px-4 py-2 sm:py-2.5">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-semibold text-foreground tracking-tight">
              Feed
            </h2>

            <div className="flex items-center gap-1.5 text-[11px] text-foreground-subtle font-mono">
              <span
                className={`w-1.5 h-1.5 rounded-full ${
                  isRealtimeConnected ? 'bg-emerald-500' : 'bg-amber-500'
                }`}
              />
              <span className="hidden xs:inline">{isRealtimeConnected ? 'En directo' : 'Conectando'}</span>
            </div>
          </div>

          <div className="flex items-center gap-1">
            {onOpenFeedback && (
              <button
                type="button"
                onClick={() => {
                  sound.tap();
                  onOpenFeedback();
                }}
                title="Incidencias técnicas"
                aria-label="Incidencias"
                className="w-8 h-8 sm:w-7 sm:h-7 rounded-md flex items-center justify-center text-foreground-subtle hover:text-foreground hover:bg-surface-raised cursor-pointer transition-colors touch-manipulation active:scale-95"
              >
                <AlertCircle className="w-3.5 h-3.5" />
              </button>
            )}

            {onOpenNotifications && (
              <button
                type="button"
                onClick={() => {
                  sound.tap();
                  onOpenNotifications();
                }}
                title="Notificaciones de avisos"
                aria-label="Notificaciones"
                className="w-8 h-8 sm:w-7 sm:h-7 rounded-md flex items-center justify-center text-foreground-subtle hover:text-foreground hover:bg-surface-raised cursor-pointer transition-colors touch-manipulation active:scale-95"
              >
                <Bell className="w-3.5 h-3.5" />
              </button>
            )}

            <button
              type="button"
              onClick={() => {
                sound.tap();
                setIsSearchOpen((prev) => !prev);
              }}
              title="Buscar en el feed"
              aria-label="Buscar"
              className={`w-8 h-8 sm:w-7 sm:h-7 rounded-md flex items-center justify-center transition-colors cursor-pointer touch-manipulation active:scale-95 ${
                isSearchOpen || searchQuery
                  ? 'bg-foreground text-background font-semibold'
                  : 'text-foreground-subtle hover:text-foreground hover:bg-surface-raised'
              }`}
            >
              <Search className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Campo de búsqueda desplegable */}
        {isSearchOpen && (
          <div className="px-3.5 sm:px-4 pb-2.5 pt-0.5 animate-in fade-in duration-100">
            <div className="relative flex items-center">
              <Search className="w-3.5 h-3.5 text-foreground-subtle absolute left-2.5 pointer-events-none" />
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar usuario, comando o tema..."
                className="w-full bg-surface-raised border border-border rounded-md pl-8 pr-8 py-1.5 text-[15px] sm:text-xs text-foreground placeholder:text-foreground-subtle outline-none focus:border-foreground/50 transition-colors"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  aria-label="Limpiar búsqueda"
                  className="absolute right-2 text-foreground-subtle hover:text-foreground p-1 cursor-pointer touch-manipulation"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
          </div>
        )}

        {/* Pestañas de categoría (Estilo minimalista limpio) */}
        <div className="flex items-center gap-1 px-3 sm:px-4 overflow-x-auto scrollbar-none border-t border-border/50">
          {FEED_TABS.map((tab) => {
            const isActive = activeTab === tab.id;
            const count = getTabCount(tab.id);
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => {
                  sound.tap();
                  setActiveTab(tab.id);
                }}
                className={`py-2.5 px-3 min-h-[40px] text-xs font-medium transition-colors cursor-pointer whitespace-nowrap border-b-2 flex items-center gap-1.5 touch-manipulation shrink-0 ${
                  isActive
                    ? 'border-foreground text-foreground font-semibold'
                    : 'border-transparent text-foreground-muted hover:text-foreground'
                }`}
              >
                <span>{tab.label}</span>
                {count > 0 && (
                  <span className="font-mono text-[10px] text-foreground-subtle">
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* 2. Redactor de publicaciones */}
      {!currentUser ? (
        <div
          onClick={() => {
            sound.tap();
            onOpenAuth();
          }}
          className="p-3 sm:p-3.5 border-b border-border bg-surface-raised/30 flex items-center justify-between gap-3 cursor-pointer hover:bg-surface-raised/50 active:bg-surface-raised/60 transition-colors"
        >
          <div className="flex items-center gap-2.5 text-xs text-foreground-muted min-w-0">
            <div className="w-7 h-7 rounded-full bg-surface-raised border border-border flex items-center justify-center text-foreground-subtle shrink-0">
              <MessageSquare className="w-3.5 h-3.5" />
            </div>
            <span className="truncate">Inicia sesión para compartir avisos, dudas o recursos</span>
          </div>
          <span className="text-xs font-medium text-foreground shrink-0 underline underline-offset-2">
            Entrar
          </span>
        </div>
      ) : (
        <div className="p-3 sm:p-3.5 border-b border-border bg-surface-raised/15">
          {replyingTo && (
            <div className="flex items-center justify-between gap-2 mb-2 px-2.5 py-1 rounded-md bg-surface-raised border border-border text-xs text-foreground-muted">
              <div className="flex items-center gap-1.5 min-w-0">
                <CornerDownRight className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate">
                  Respondiendo a <strong className="font-mono text-foreground">@{replyingTo}</strong>
                </span>
              </div>
              <button
                type="button"
                onClick={handleCancelReply}
                title="Cancelar respuesta"
                aria-label="Cancelar respuesta"
                className="w-7 h-7 -mr-1 rounded flex items-center justify-center hover:text-foreground cursor-pointer shrink-0 active:scale-95 touch-manipulation"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          <div className="flex items-start gap-2.5">
            <div className="w-8 h-8 rounded-full sm:rounded-lg bg-surface-raised border border-border flex items-center justify-center font-mono font-semibold text-xs text-foreground uppercase shrink-0 mt-0.5">
              {currentUser.username.charAt(0)}
            </div>

            <div className="flex-1 min-w-0 space-y-2">
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
                  replyingTo
                    ? `Responder a @${replyingTo}...`
                    : 'Publicar un aviso, duda o recurso...'
                }
                rows={2}
                maxLength={320}
                className="w-full bg-transparent text-[15px] sm:text-[13px] text-foreground placeholder:text-foreground-subtle resize-none outline-none leading-relaxed font-sans"
              />

              <div className="flex items-center justify-between gap-2 pt-1 border-t border-border/50">
                {/* Etiquetas tipo chip */}
                <div className="flex items-center gap-1 overflow-x-auto scrollbar-none py-0.5 -mx-0.5 px-0.5 max-w-[55%] sm:max-w-none">
                  {COMPOSER_TAGS.map((t) => {
                    const isSelected = selectedTag === t.id;
                    return (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => {
                          sound.tap();
                          setSelectedTag(t.id);
                        }}
                        className={`px-2 py-0.5 rounded text-[11px] font-mono transition-colors cursor-pointer border shrink-0 touch-manipulation active:scale-95 ${
                          isSelected
                            ? 'bg-foreground text-background border-foreground font-semibold'
                            : 'bg-surface text-foreground-muted border-border hover:text-foreground'
                        }`}
                      >
                        #{t.label}
                      </button>
                    );
                  })}
                </div>

                <div className="flex items-center gap-1 sm:gap-1.5 ml-auto shrink-0">
                  <button
                    type="button"
                    onClick={handleInsertCodeSnippet}
                    title="Insertar comando `...`"
                    className="px-2 py-1 rounded text-xs font-mono text-foreground-muted hover:text-foreground border border-border cursor-pointer transition-colors touch-manipulation active:scale-95"
                  >
                    <Code className="w-3 h-3 inline mr-1" />
                    <span>cmd</span>
                  </button>

                  {isStaff && (
                    <button
                      type="button"
                      onClick={() => {
                        sound.tap();
                        setIsPinned((p) => !p);
                      }}
                      title={isPinned ? 'Desmarcar' : 'Fijar aviso'}
                      className={`px-2 py-1 rounded text-xs font-mono border cursor-pointer transition-colors touch-manipulation active:scale-95 ${
                        isPinned
                          ? 'bg-foreground text-background border-foreground font-semibold'
                          : 'text-foreground-muted hover:text-foreground border-border'
                      }`}
                    >
                      <Pin className="w-3 h-3 inline mr-1" />
                      <span className="hidden xs:inline">Fijar</span>
                    </button>
                  )}

                  <span className={`text-[11px] font-mono text-foreground-subtle px-1 ${isNearLimit ? 'text-amber-500 font-semibold' : ''}`}>
                    {320 - charCount}
                  </span>

                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => handlePublish()}
                    disabled={!inputText.trim() || isPosting || charCount > 320}
                    isLoading={isPosting}
                    className="rounded-md px-3 h-7 text-xs font-medium touch-manipulation active:scale-95"
                  >
                    <Send className="w-3 h-3" />
                    <span>Publicar</span>
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 3. Lista de publicaciones */}
      <div className="divide-y divide-border">
        {filteredMessages.length === 0 ? (
          <div className="p-8 text-center space-y-2">
            <p className="text-xs text-foreground-muted">
              {searchQuery
                ? `No hay resultados para «${searchQuery}».`
                : 'No hay publicaciones en este apartado.'}
            </p>
            {searchQuery && (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('');
                  setActiveTab('all');
                }}
                className="text-xs text-accent hover:underline cursor-pointer"
              >
                Limpiar filtros
              </button>
            )}
          </div>
        ) : (
          filteredMessages.map((msg) => {
            const isMe = currentUser && msg.user_id === currentUser.id;
            const canDelete = isMe || isStaff;
            const isLiked = Boolean(msg.is_liked_by_me);
            const likesCount = Number(msg.likes_count || 0);

            // Evento de recreo
            if (msg.is_system_win) {
              return (
                <div
                  key={msg.id}
                  className="px-3.5 sm:px-4 py-2 bg-surface-raised/30 hover:bg-surface-raised/50 transition-colors flex items-center justify-between gap-2.5 text-xs font-mono text-foreground-muted"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-[10px] uppercase tracking-wider px-1 py-0.5 rounded bg-surface border border-border text-foreground-subtle shrink-0">
                      recreo
                    </span>
                    <span className="truncate text-foreground text-[12px]">{msg.text}</span>
                  </div>

                  <span className="text-[11px] text-foreground-subtle shrink-0">
                    {formatRelativeTime(msg.created_at)}
                  </span>
                </div>
              );
            }

            // Publicación normal
            return (
              <article
                key={msg.id}
                className={`px-3.5 py-3 sm:p-3.5 hover:bg-surface-raised/20 transition-colors ${
                  msg.pinned ? 'bg-surface-raised/40 border-l-2 border-foreground' : ''
                }`}
              >
                <div className="flex items-start gap-2.5 min-w-0">
                  <div className="w-8 h-8 rounded-full sm:rounded-lg bg-surface-raised border border-border flex items-center justify-center font-mono font-semibold text-xs text-foreground uppercase shrink-0 mt-0.5">
                    {msg.username.charAt(0)}
                  </div>

                  <div className="flex-1 min-w-0 space-y-1">
                    {/* Fila de metadatos */}
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5 flex-wrap min-w-0">
                        <span className="font-semibold text-xs text-foreground font-mono truncate max-w-[140px] sm:max-w-none">
                          @{msg.username}
                        </span>

                        {msg.pinned && (
                          <span className="text-[10px] font-mono px-1 py-0.2 rounded border border-border text-foreground-subtle shrink-0">
                            fijado
                          </span>
                        )}

                        {(msg.username === 'admin' ||
                          msg.username.toLowerCase().includes('delegado')) && (
                          <span className="text-[10px] font-mono px-1 py-0.2 rounded bg-surface-raised border border-border text-foreground-muted shrink-0">
                            delegado
                          </span>
                        )}

                        <span className="text-foreground-subtle text-[11px] shrink-0">·</span>

                        <span className="text-[11px] text-foreground-subtle font-mono shrink-0">
                          {formatRelativeTime(msg.created_at)}
                        </span>
                      </div>

                      <div className="flex items-center gap-0.5 shrink-0">
                        {canDelete && onDeleteMessage && (
                          <button
                            type="button"
                            onClick={() => handleDelete(msg.id)}
                            disabled={deletingId === msg.id}
                            title="Eliminar"
                            aria-label="Eliminar"
                            className="p-1.5 rounded text-foreground-subtle hover:text-danger hover:bg-surface-raised cursor-pointer transition-colors touch-manipulation active:scale-95"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={() => handleShare(msg)}
                          title="Copiar texto"
                          aria-label="Copiar"
                          className="p-1.5 rounded text-foreground-subtle hover:text-foreground hover:bg-surface-raised cursor-pointer transition-colors touch-manipulation active:scale-95"
                        >
                          {copiedId === msg.id ? (
                            <Check className="w-3.5 h-3.5 text-emerald-500" />
                          ) : (
                            <Share2 className="w-3.5 h-3.5" />
                          )}
                        </button>
                      </div>
                    </div>

                    {/* Contenido */}
                    <div className="min-w-0">
                      {renderFormattedText(msg.text, msg.tag, msg.id)}
                    </div>

                    {/* Barra de acciones minimalista */}
                    <div className="flex items-center gap-5 sm:gap-6 pt-1.5 text-[11px] font-mono text-foreground-subtle">
                      <button
                        type="button"
                        onClick={() => onToggleLike && onToggleLike(msg.id)}
                        className={`inline-flex items-center gap-1.5 py-1 -my-1 hover:text-rose-500 transition-colors cursor-pointer select-none touch-manipulation active:scale-95 ${
                          isLiked ? 'text-rose-500 font-semibold' : ''
                        }`}
                        title={isLiked ? 'Quitar me gusta' : 'Me gusta'}
                      >
                        <Heart
                          className={`w-3.5 h-3.5 ${
                            isLiked ? 'fill-rose-500 stroke-rose-500' : ''
                          }`}
                        />
                        <span>{likesCount > 0 ? likesCount : ''}</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleStartReply(msg.username)}
                        className="inline-flex items-center gap-1.5 py-1 -my-1 hover:text-foreground transition-colors cursor-pointer select-none touch-manipulation active:scale-95"
                      >
                        <MessageSquare className="w-3.5 h-3.5" />
                        <span>Responder</span>
                      </button>

                      {!isMe && currentUser && (
                        <button
                          type="button"
                          onClick={() => handleTip(msg.id, msg.username)}
                          className="inline-flex items-center gap-1.5 py-1 -my-1 hover:text-amber-500 transition-colors cursor-pointer select-none touch-manipulation active:scale-95"
                        >
                          <Coins className="w-3.5 h-3.5" />
                          <span>
                            {tipSuccessId === msg.id ? 'Enviado' : '50 fichas'}
                          </span>
                        </button>
                      )}
                    </div>
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
