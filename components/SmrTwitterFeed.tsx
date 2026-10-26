'use client';

import React, { useState, useRef, useEffect } from 'react';
import {
  Send,
  Coins,
  Share2,
  ExternalLink,
  MessageSquare,
  ShieldCheck,
  Check,
  Heart,
  Trophy,
  Tag,
  CornerDownRight,
  Search,
  X,
  Sparkles,
  RotateCcw,
  BookOpen,
  ArrowUp,
} from 'lucide-react';
import { ChatMessage, UserProfile } from '@/lib/types';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { sound } from '@/lib/audio';

interface SmrTwitterFeedProps {
  messages: ChatMessage[];
  currentUser: UserProfile | null;
  onOpenAuth: () => void;
  onSendMessage: (text: string, tag?: string) => void;
  onTipUser: (targetUsername: string, amount: number) => void;
  onToggleLike?: (messageId: string) => void;
  onOpenSchedule?: () => void;
  onOpenTasks?: () => void;
  onOpenRussianRoulette?: () => void;
  composerRef?: React.RefObject<HTMLTextAreaElement | null>;
}

type FeedFilterId = 'all' | 'avisos' | 'dudas' | 'apuntes' | 'recreo';

interface FeedTabItem {
  id: FeedFilterId;
  label: string;
  icon?: React.ReactNode;
}

const FEED_TABS: FeedTabItem[] = [
  { id: 'all', label: 'Todos' },
  { id: 'avisos', label: 'Avisos' },
  { id: 'dudas', label: 'Dudas' },
  { id: 'apuntes', label: 'Apuntes' },
  { id: 'recreo', label: 'Recreo' },
];

const COMPOSER_TAGS = [
  { id: 'General', label: 'General' },
  { id: 'Aviso', label: 'Aviso', color: 'sky' },
  { id: 'Duda', label: 'Duda', color: 'violet' },
  { id: 'Examen', label: 'Examen', color: 'amber' },
  { id: 'Apuntes', label: 'Apuntes', color: 'emerald' },
  { id: 'Recreo', label: 'Recreo', color: 'yellow' },
] as const;

/**
 * Format timestamp into human-readable relative time (e.g. "ahora", "hace 5m", "ayer 10:30")
 */
function formatRelativeTime(dateStr: string): string {
  if (!dateStr) return '';
  // Legacy time strings like "13:45"
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
    if (diffMin < 60) return `hace ${diffMin}m`;
    if (diffHr < 24) return `hace ${diffHr}h`;
    if (diffDays === 1) {
      return `ayer ${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    }
    if (diffDays < 7) return `hace ${diffDays}d`;
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
  onTipUser,
  onToggleLike,
  composerRef: externalComposerRef,
}) => {
  const [activeTab, setActiveTab] = useState<FeedFilterId>('all');
  const [inputText, setInputText] = useState('');
  const [selectedTag, setSelectedTag] = useState<string>('General');
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isPosting, setIsPosting] = useState(false);
  const [tipSuccessId, setTipSuccessId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [hasNewMessagesAbove, setHasNewMessagesAbove] = useState(false);

  const prevCountRef = useRef(messages.length);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const localTextareaRef = useRef<HTMLTextAreaElement | null>(null);
  const textareaRef = externalComposerRef || localTextareaRef;
  const searchInputRef = useRef<HTMLInputElement | null>(null);

  // Detect when new messages arrive while user is scrolled down
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

  // Auto-resize textarea smoothly
  useEffect(() => {
    const el = textareaRef.current;
    if (el) {
      el.style.height = 'auto';
      el.style.height = `${Math.min(180, Math.max(64, el.scrollHeight))}px`;
    }
  }, [inputText, textareaRef]);

  // Focus search input when opened
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

    if (trimmed.length > 280) return;

    setIsPosting(true);

    try {
      let finalMessage = trimmed;
      let postTag: string | undefined = undefined;

      if (selectedTag && selectedTag !== 'General') {
        postTag = selectedTag.toLowerCase();
        // If not already in text, prepend hashtag indicator for visibility
        if (!finalMessage.includes(`#${selectedTag}`)) {
          finalMessage = `[#${selectedTag}] ${finalMessage}`;
        }
      }

      await onSendMessage(finalMessage, postTag);
      setInputText('');
      setReplyingTo(null);
      setSelectedTag('General');
      sound.tap();
    } catch (err) {
      console.error('Error al publicar mensaje:', err);
    } finally {
      setIsPosting(false);
    }
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
    const textToCopy = `"${msg.text}" — @${msg.username} en 2º SMR Portal`;
    if (navigator.clipboard) {
      navigator.clipboard.writeText(textToCopy);
      sound.tap();
      setCopiedId(msg.id);
      setTimeout(() => setCopiedId(null), 2000);
    }
  };

  const handleLike = (msgId: string) => {
    if (onToggleLike) {
      onToggleLike(msgId);
    }
  };

  // Filter messages based on active tab and search query
  const filteredMessages = messages.filter((msg) => {
    const textLower = msg.text.toLowerCase();
    const userLower = msg.username.toLowerCase();
    const tagLower = (msg.tag || '').toLowerCase();

    // 1. Search filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      const matchesText = textLower.includes(q);
      const matchesUser = userLower.includes(q.replace('@', ''));
      const matchesTag = tagLower.includes(q.replace('#', ''));
      if (!matchesText && !matchesUser && !matchesTag) return false;
    }

    // 2. Tab category filter
    if (activeTab === 'all') return true;

    if (activeTab === 'avisos') {
      return (
        tagLower === 'aviso' ||
        tagLower === 'examen' ||
        textLower.includes('[#aviso') ||
        textLower.includes('[#examen') ||
        textLower.includes('#aviso') ||
        textLower.includes('#examen') ||
        textLower.includes('examen') ||
        textLower.includes('entrega') ||
        textLower.includes('recordatorio')
      );
    }

    if (activeTab === 'dudas') {
      return (
        tagLower === 'duda' ||
        textLower.includes('[#duda') ||
        textLower.includes('#duda') ||
        textLower.includes('?') ||
        textLower.includes('duda') ||
        textLower.includes('ayuda') ||
        textLower.includes('problema')
      );
    }

    if (activeTab === 'apuntes') {
      return (
        tagLower === 'apuntes' ||
        textLower.includes('[#apunte') ||
        textLower.includes('#apunte') ||
        textLower.includes('apunte') ||
        textLower.includes('tema') ||
        textLower.includes('github') ||
        textLower.includes('pdf') ||
        textLower.includes('drive')
      );
    }

    if (activeTab === 'recreo') {
      return (
        msg.is_system_win ||
        tagLower === 'recreo' ||
        textLower.includes('[#recreo') ||
        textLower.includes('ruleta') ||
        textLower.includes('fichas') ||
        textLower.includes('victoria')
      );
    }

    return true;
  });

  // Calculate counts for tab indicators
  const getTabCount = (tabId: FeedFilterId) => {
    if (tabId === 'all') return messages.length;
    return messages.filter((m) => {
      const t = m.text.toLowerCase();
      const tag = (m.tag || '').toLowerCase();
      if (tabId === 'avisos') {
        return tag === 'aviso' || tag === 'examen' || t.includes('#aviso') || t.includes('examen');
      }
      if (tabId === 'dudas') {
        return tag === 'duda' || t.includes('#duda') || t.includes('?');
      }
      if (tabId === 'apuntes') {
        return tag === 'apuntes' || t.includes('#apunte') || t.includes('drive');
      }
      if (tabId === 'recreo') {
        return m.is_system_win || tag === 'recreo' || t.includes('fichas');
      }
      return false;
    }).length;
  };

  // Helper to render text with clickable links, tags, and @mentions
  const renderFormattedText = (rawText: string, messageTag?: string) => {
    let cleanText = rawText;
    let extractedTag: string | null = messageTag || null;

    const tagMatch = rawText.match(/^\[#(.*?)\]\s*/);
    if (tagMatch) {
      if (!extractedTag) extractedTag = tagMatch[1];
      cleanText = rawText.replace(tagMatch[0], '');
    }

    const words = cleanText.split(/(\s+)/);

    return (
      <div className="space-y-2 min-w-0">
        {extractedTag && extractedTag.toLowerCase() !== 'general' && (
          <div className="flex items-center gap-1.5 pt-0.5">
            <span className="inline-flex items-center gap-1 text-[11px] font-mono font-medium px-2 py-0.5 rounded-md bg-surface-raised border border-border/80 text-foreground">
              <Tag className="w-2.5 h-2.5 text-accent" />
              <span>#{extractedTag}</span>
            </span>
          </div>
        )}
        <p className="text-[13.5px] text-foreground leading-relaxed break-words break-all sm:break-normal font-sans max-w-prose">
          {words.map((word, i) => {
            if (word.startsWith('#') && word.length > 1) {
              return (
                <span
                  key={i}
                  onClick={(e) => {
                    e.stopPropagation();
                    setSearchQuery(word);
                    setIsSearchOpen(true);
                  }}
                  className="text-accent font-medium hover:underline cursor-pointer"
                  title={`Filtrar por ${word}`}
                >
                  {word}
                </span>
              );
            }
            if (word.startsWith('@') && word.length > 1) {
              return (
                <span
                  key={i}
                  onClick={(e) => {
                    e.stopPropagation();
                    setSearchQuery(word);
                    setIsSearchOpen(true);
                  }}
                  className="text-foreground font-semibold font-mono hover:underline cursor-pointer"
                  title={`Ver publicaciones de ${word}`}
                >
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
                  className="text-accent underline underline-offset-2 hover:opacity-80 inline-flex items-center gap-0.5 break-all"
                >
                  {word.length > 32 ? `${word.slice(0, 29)}...` : word}
                  <ExternalLink className="w-3 h-3 inline shrink-0" />
                </a>
              );
            }
            return <React.Fragment key={i}>{word}</React.Fragment>;
          })}
        </p>

        {/* Previsualización limpia si el mensaje incluye enlace directo a imagen */}
        {words
          .filter((w) => /^https?:\/\/.*\.(png|jpe?g|gif|webp)(\?.*)?$/i.test(w))
          .slice(0, 1)
          .map((imgUrl, idx) => (
            <div
              key={idx}
              className="mt-2 rounded-xl overflow-hidden border border-border/80 max-h-72 max-w-md bg-surface-raised"
            >
              <img
                src={imgUrl}
                alt="Imagen adjunta en la publicación"
                loading="lazy"
                className="w-full h-full object-contain rounded-xl hover:opacity-95 transition-opacity cursor-pointer"
                onClick={() => window.open(imgUrl, '_blank')}
              />
            </div>
          ))}
      </div>
    );
  };

  const charCount = inputText.length;
  const isNearLimit = charCount > 240;

  return (
    <div ref={containerRef} className="relative w-full flex flex-col rounded-2xl border border-border/70 bg-surface shadow-2xs">
      {/* Píldora flotante cuando llegan nuevos mensajes mientras se hace scroll */}
      {hasNewMessagesAbove && (
        <div className="sticky top-28 z-30 flex justify-center w-full pointer-events-none -mb-8">
          <button
            type="button"
            onClick={scrollToTop}
            className="pointer-events-auto flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-foreground text-background font-semibold text-xs shadow-lg hover:opacity-90 active:scale-95 transition-all cursor-pointer animate-in fade-in slide-in-from-top-2 border border-border/60"
          >
            <ArrowUp className="w-3.5 h-3.5" />
            <span>Nuevas publicaciones</span>
          </button>
        </div>
      )}

      {/* 1. Header & Segmented Navigation */}
      <div className="sticky top-14 z-20 bg-surface/95 backdrop-blur-md rounded-t-2xl border-b border-border/70 transition-colors">
        {/* Main Title Row */}
        <div className="flex items-center justify-between px-3.5 sm:px-5 py-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <h2 className="text-sm font-semibold text-foreground tracking-tight">
              Feed de clase
            </h2>
            <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-surface-raised border border-border/70 text-foreground-muted text-[11px] font-sans">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              <span>{messages.length} publicaciones</span>
            </div>
          </div>

          <div className="flex items-center gap-1 shrink-0">
            <button
              type="button"
              onClick={() => {
                sound.tap();
                setIsSearchOpen((prev) => !prev);
              }}
              title="Buscar en el feed"
              aria-label="Buscar mensajes"
              className={`w-8 h-8 rounded-lg border flex items-center justify-center transition-all cursor-pointer ${
                isSearchOpen || searchQuery
                  ? 'bg-foreground text-background border-foreground font-semibold'
                  : 'bg-surface-raised/50 hover:bg-surface-raised border-border/70 text-foreground-muted hover:text-foreground'
              }`}
            >
              <Search className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Expandable Search Input */}
        {isSearchOpen && (
          <div className="px-3.5 sm:px-5 pb-2.5 pt-0.5 animate-in fade-in slide-in-from-top-1 duration-150">
            <div className="relative flex items-center">
              <Search className="w-3.5 h-3.5 text-foreground-subtle absolute left-2.5 pointer-events-none" />
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar por palabra, @usuario o tema..."
                className="w-full bg-surface-raised border border-border/80 rounded-lg pl-8 pr-8 py-1.5 text-xs text-foreground placeholder:text-foreground-subtle outline-none focus:border-accent/70 transition-colors"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  aria-label="Limpiar búsqueda"
                  className="absolute right-2 text-foreground-subtle hover:text-foreground p-0.5"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
        )}

        {/* Category Tabs Row */}
        <div className="px-3 sm:px-5 pb-2.5">
          <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none py-0.5">
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
                  className={`px-3 py-1 rounded-lg text-xs font-medium transition-all cursor-pointer select-none active:scale-95 touch-manipulation whitespace-nowrap shrink-0 flex items-center gap-1.5 ${
                    isActive
                      ? 'bg-foreground text-background font-semibold shadow-2xs'
                      : 'text-foreground-muted hover:text-foreground hover:bg-surface-raised'
                  }`}
                >
                  <span>{tab.label}</span>
                  {count > 0 && (
                    <span
                      className={`text-[10px] font-mono px-1 py-0.2 rounded ${
                        isActive
                          ? 'bg-background/20 text-background'
                          : 'bg-surface-raised border border-border/60 text-foreground-subtle'
                      }`}
                    >
                      {count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* 2. Composer Box (Linear/Twitter minimalist aesthetics) */}
      <div className="p-3.5 sm:p-4.5 border-b border-border/60 bg-surface-raised/20">
        {/* Reply Context Banner */}
        {replyingTo && (
          <div className="flex items-center justify-between gap-2 mb-2 px-2.5 py-1 rounded-md bg-accent/10 border border-accent/20 text-xs text-accent">
            <div className="flex items-center gap-1.5 min-w-0">
              <CornerDownRight className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">
                Respondiendo a <strong className="font-mono">@{replyingTo}</strong>
              </span>
            </div>
            <button
              type="button"
              onClick={handleCancelReply}
              title="Cancelar respuesta"
              aria-label="Cancelar respuesta"
              className="p-0.5 hover:opacity-80 cursor-pointer shrink-0"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        )}

        <div className="flex items-start gap-3">
          {/* Current User Avatar */}
          <div className="w-8 h-8 rounded-full bg-surface-raised border border-border/80 flex items-center justify-center font-mono font-semibold text-xs text-foreground uppercase shrink-0 mt-0.5">
            {currentUser ? currentUser.username.charAt(0) : '?'}
          </div>

          <div className="flex-1 min-w-0 space-y-2.5">
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
                  ? replyingTo
                    ? `Escribe tu respuesta para @${replyingTo}...`
                    : `Comparte un aviso, duda o apunte para la clase...`
                  : 'Inicia sesión para participar en el feed de clase...'
              }
              rows={2}
              maxLength={280}
              className="w-full bg-transparent text-sm text-foreground placeholder:text-foreground-subtle resize-none outline-none leading-relaxed font-sans"
            />

            {/* Tag selector chips */}
            <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none pb-0.5 pt-0.5">
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
                    className={`px-2.5 py-0.5 rounded-md text-xs font-mono transition-all cursor-pointer border active:scale-95 touch-manipulation shrink-0 ${
                      isSelected
                        ? 'bg-foreground text-background font-semibold border-foreground'
                        : 'bg-surface text-foreground-muted border-border/70 hover:text-foreground hover:border-border'
                    }`}
                  >
                    #{t.label}
                  </button>
                );
              })}
            </div>

            {/* Bottom Bar: Chars, Shortcut & Submit */}
            <div className="flex items-center justify-between pt-2 border-t border-border/40">
              <div className="flex items-center gap-2 text-[11px] font-mono text-foreground-subtle">
                <span className={isNearLimit ? 'text-amber-500 font-semibold' : ''}>
                  {280 - charCount} caracteres
                </span>
                <span className="hidden sm:inline opacity-60">· Ctrl + Enter</span>
              </div>

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
        </div>
      </div>

      {/* 3. Messages Stream */}
      <div className="divide-y divide-border/40">
        {filteredMessages.length === 0 ? (
          <div className="p-8 sm:p-12">
            <EmptyState
              icon={<MessageSquare className="w-8 h-8 opacity-40" />}
              title={
                searchQuery
                  ? 'No hay resultados para tu búsqueda'
                  : 'Aún no hay publicaciones en esta sección'
              }
              description={
                searchQuery
                  ? `No encontramos coincidencias para "${searchQuery}". Prueba con otra palabra clave.`
                  : 'Sé el primero en compartir un aviso sobre prácticas, exámenes o dudas del temario.'
              }
              action={
                searchQuery ? (
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => {
                      setSearchQuery('');
                      setActiveTab('all');
                    }}
                    className="mt-3 text-xs"
                  >
                    <RotateCcw className="w-3 h-3" />
                    <span>Ver todas las publicaciones</span>
                  </Button>
                ) : undefined
              }
            />
          </div>
        ) : (
          filteredMessages.map((msg) => {
            const isMe = currentUser && msg.user_id === currentUser.id;
            const isLiked = Boolean(msg.is_liked_by_me);
            const likesCount = Number(msg.likes_count || 0);

            // System Victory Announcement
            if (msg.is_system_win) {
              return (
                <article
                  key={msg.id}
                  className="p-3.5 sm:p-4 bg-surface-raised/20 hover:bg-surface-raised/35 transition-colors border-b border-border/40 last:border-b-0 min-w-0"
                >
                  <div className="flex items-start justify-between gap-3 text-xs">
                    <div className="flex items-start gap-2.5 min-w-0 flex-1">
                      <div className="w-7 h-7 rounded-lg bg-surface border border-border/70 flex items-center justify-center text-amber-500 shrink-0 mt-0.5">
                        <Trophy className="w-3.5 h-3.5" />
                      </div>
                      <div className="space-y-0.5 min-w-0 flex-1">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-surface border border-border text-foreground-muted">
                            Victoria recreo
                          </span>
                          <span className="text-foreground-subtle font-mono text-[11px]">
                            {formatRelativeTime(msg.created_at)}
                          </span>
                        </div>
                        <p className="text-xs text-foreground font-sans break-words">
                          {msg.text}
                        </p>
                      </div>
                    </div>

                    {msg.win_amount && (
                      <span className="font-mono text-xs font-semibold text-emerald-400 shrink-0 pl-2">
                        +{Number(msg.win_amount).toLocaleString('es-ES')} fichas
                      </span>
                    )}
                  </div>
                </article>
              );
            }

            // Normal Student / Classmate Post
            return (
              <article
                key={msg.id}
                className="p-3.5 sm:p-4 hover:bg-surface-raised/20 transition-colors border-b border-border/40 last:border-b-0 min-w-0"
              >
                <div className="flex items-start gap-3 min-w-0">
                  {/* User Avatar */}
                  <div className="w-8 h-8 rounded-full bg-surface-raised border border-border/80 flex items-center justify-center font-mono font-semibold text-xs text-foreground uppercase shrink-0 mt-0.5">
                    {msg.username.charAt(0)}
                  </div>

                  <div className="flex-1 min-w-0 space-y-1.5">
                    {/* Header info */}
                    <div className="flex items-center justify-between gap-2 min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap min-w-0">
                        <span className="font-semibold text-xs text-foreground font-mono truncate max-w-[140px] sm:max-w-[200px]">
                          @{msg.username}
                        </span>

                        {(msg.username === 'admin' ||
                          msg.username.toLowerCase().includes('delegado')) && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-mono px-1.5 py-0.2 rounded bg-accent/10 text-accent font-medium shrink-0">
                            <ShieldCheck className="w-2.5 h-2.5" />
                            <span>Delegado</span>
                          </span>
                        )}

                        <span className="text-foreground-subtle text-[11px]">·</span>

                        <span className="text-[11px] text-foreground-subtle font-mono shrink-0">
                          {formatRelativeTime(msg.created_at)}
                        </span>
                      </div>

                      {/* Share Quick Action */}
                      <button
                        type="button"
                        onClick={() => handleShare(msg)}
                        title="Copiar texto de la publicación"
                        aria-label="Copiar texto"
                        className="w-7 h-7 rounded-md text-foreground-subtle hover:text-foreground hover:bg-surface-raised flex items-center justify-center cursor-pointer active:scale-95 transition-all shrink-0"
                      >
                        {copiedId === msg.id ? (
                          <Check className="w-3 h-3 text-emerald-400" />
                        ) : (
                          <Share2 className="w-3 h-3" />
                        )}
                      </button>
                    </div>

                    {/* Message Body */}
                    <div className="min-w-0">
                      {renderFormattedText(msg.text, msg.tag)}
                    </div>

                    {/* Actions Toolbar */}
                    <div className="flex items-center gap-4 pt-1.5 mt-1 border-t border-border/30 text-[11px] font-mono text-foreground-subtle">
                      {/* Like Button */}
                      <button
                        type="button"
                        onClick={() => handleLike(msg.id)}
                        className={`inline-flex items-center gap-1 hover:text-rose-500 transition-colors cursor-pointer select-none active:scale-95 touch-manipulation ${
                          isLiked ? 'text-rose-500 font-semibold' : ''
                        }`}
                        title={isLiked ? 'Ya no me gusta' : 'Me gusta'}
                        aria-label="Dar me gusta"
                      >
                        <Heart
                          className={`w-3.5 h-3.5 transition-transform ${
                            isLiked ? 'fill-rose-500 stroke-rose-500 scale-110' : ''
                          }`}
                        />
                        <span>{likesCount > 0 ? likesCount : ''}</span>
                      </button>

                      {/* Reply Button */}
                      <button
                        type="button"
                        onClick={() => handleStartReply(msg.username)}
                        title={`Responder a @${msg.username}`}
                        aria-label={`Responder a @${msg.username}`}
                        className="inline-flex items-center gap-1 hover:text-foreground transition-colors cursor-pointer select-none active:scale-95 touch-manipulation"
                      >
                        <MessageSquare className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">Responder</span>
                      </button>

                      {/* Tip Button */}
                      {!isMe && currentUser && (
                        <button
                          type="button"
                          onClick={() => handleTip(msg.id, msg.username)}
                          title={`Enviar 50 fichas a @${msg.username}`}
                          aria-label={`Enviar propina a @${msg.username}`}
                          className="inline-flex items-center gap-1 hover:text-amber-500 transition-colors cursor-pointer select-none active:scale-95 touch-manipulation"
                        >
                          <Coins className="w-3.5 h-3.5 text-amber-500" />
                          <span>
                            {tipSuccessId === msg.id ? '¡+50 enviadas!' : 'Propina'}
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
