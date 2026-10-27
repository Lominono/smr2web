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
  Pin,
  Trash2,
  Bell,
  Code,
  Copy,
  Terminal,
  FolderGit2,
  FileText,
  Calendar,
  HelpCircle,
} from 'lucide-react';
import { ChatMessage, UserProfile } from '@/lib/types';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
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
  isRealtimeConnected?: boolean;
  composerRef?: React.RefObject<HTMLTextAreaElement | null>;
}

type FeedFilterId = 'all' | 'avisos' | 'dudas' | 'recursos' | 'recreo';

interface FeedTabItem {
  id: FeedFilterId;
  label: string;
  icon: React.ReactNode;
}

const FEED_TABS: FeedTabItem[] = [
  { id: 'all', label: 'Todos', icon: <MessageSquare className="w-3.5 h-3.5" /> },
  { id: 'avisos', label: 'Avisos y Fechas', icon: <Calendar className="w-3.5 h-3.5" /> },
  { id: 'dudas', label: 'Dudas técnicas', icon: <HelpCircle className="w-3.5 h-3.5" /> },
  { id: 'recursos', label: 'Apuntes y Recursos', icon: <BookOpen className="w-3.5 h-3.5" /> },
  { id: 'recreo', label: 'Sala de recreo', icon: <Trophy className="w-3.5 h-3.5" /> },
];

const COMPOSER_TAGS = [
  { id: 'General', label: 'General' },
  { id: 'Aviso', label: 'Aviso' },
  { id: 'Duda', label: 'Duda' },
  { id: 'Examen', label: 'Examen' },
  { id: 'Recurso', label: 'Recurso' },
  { id: 'Recreo', label: 'Recreo' },
] as const;

/**
 * Formatea fechas a formato relativo legible en español ("ahora", "hace 5m", "ayer 10:30")
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
  onDeleteMessage,
  onTipUser,
  onToggleLike,
  onOpenNotifications,
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

  // Detección de mensajes nuevos cuando el usuario está scrolleando abajo
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

  // Auto-resize dinámico y suave del área de texto
  useEffect(() => {
    const el = textareaRef.current;
    if (el) {
      el.style.height = 'auto';
      el.style.height = `${Math.min(220, Math.max(68, el.scrollHeight))}px`;
    }
  }, [inputText, textareaRef]);

  // Foco en buscador al abrir
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
    setInputText((prev) => {
      if (!prev) return '`comando_aqui` ';
      return `${prev} \`comando_aqui\` `;
    });
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
    const textToCopy = `"${msg.text}" — @${msg.username} en 2º SMR Portal`;
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
    if (!window.confirm('¿Seguro que quieres eliminar este mensaje del feed?')) return;
    sound.tap();
    setDeletingId(msgId);
    try {
      await onDeleteMessage(msgId);
    } finally {
      setDeletingId(null);
    }
  };

  // Filtrado de mensajes por pestaña y búsqueda
  const filteredMessages = messages.filter((msg) => {
    const textLower = (msg.text || '').toLowerCase();
    const userLower = (msg.username || '').toLowerCase();
    const tagLower = (msg.tag || '').toLowerCase();

    // 1. Filtro de búsqueda textual
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      const matchesText = textLower.includes(q);
      const matchesUser = userLower.includes(q.replace('@', ''));
      const matchesTag = tagLower.includes(q.replace('#', ''));
      if (!matchesText && !matchesUser && !matchesTag) return false;
    }

    // 2. Filtro por sección temática
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
        textLower.includes('error') ||
        textLower.includes('problema') ||
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
        textLower.includes('chuleta') ||
        textLower.includes('temario')
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

  // Conteo dinámico para pestañas
  const getTabCount = (tabId: FeedFilterId) => {
    if (tabId === 'all') return messages.length;
    return messages.filter((m) => {
      const t = (m.text || '').toLowerCase();
      const tag = (m.tag || '').toLowerCase();
      if (tabId === 'avisos') {
        return m.pinned || tag === 'aviso' || tag === 'examen' || t.includes('#aviso') || t.includes('examen');
      }
      if (tabId === 'dudas') {
        return tag === 'duda' || t.includes('#duda') || t.includes('?') || t.includes('ayuda');
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

  // Renderizado enriquecido para comandos, bloques de código, menciones y enlaces
  const renderFormattedText = (rawText: string, messageTag?: string, msgId?: string) => {
    let cleanText = rawText;
    let extractedTag: string | null = messageTag || null;

    const tagMatch = rawText.match(/^\[#(.*?)\]\s*/);
    if (tagMatch) {
      if (!extractedTag) extractedTag = tagMatch[1];
      cleanText = rawText.replace(tagMatch[0], '');
    }

    // Comprobar si contiene bloques de código tipo ```codigo```
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
          <div className="flex items-center gap-1.5 pt-0.5">
            <span className="inline-flex items-center gap-1 text-[11px] font-mono font-medium px-2 py-0.5 rounded-md bg-surface-raised border border-border/80 text-foreground">
              <Tag className="w-2.5 h-2.5 text-accent" />
              <span>#{extractedTag}</span>
            </span>
          </div>
        )}

        <div className="text-[13.5px] text-foreground leading-relaxed break-words break-all sm:break-normal font-sans max-w-prose">
          {words.map((word, i) => {
            // Mención @usuario
            if (word.startsWith('@') && word.length > 1) {
              return (
                <span
                  key={i}
                  onClick={(e) => {
                    e.stopPropagation();
                    setSearchQuery(word);
                    setIsSearchOpen(true);
                  }}
                  className="text-foreground font-semibold font-mono hover:underline cursor-pointer bg-surface-raised px-1 py-0.2 rounded text-[12.5px]"
                  title={`Filtrar publicaciones de ${word}`}
                >
                  {word}
                </span>
              );
            }

            // Etiqueta #hashtag
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
                  title={`Buscar etiqueta ${word}`}
                >
                  {word}
                </span>
              );
            }

            // Comando en línea entre comillas invertidas `comando`
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
                  title="Copiar comando al portapapeles"
                  className="px-1.5 py-0.5 mx-0.5 rounded-md bg-surface-raised border border-border/80 font-mono text-xs text-accent font-semibold cursor-copy hover:border-accent/60 transition-colors"
                >
                  {cmd}
                </code>
              );
            }

            // Enlaces externos con chips temáticos
            if (word.startsWith('http://') || word.startsWith('https://')) {
              const isGithub = word.includes('github.com');
              const isDrive = word.includes('drive.google.com') || word.includes('docs.google.com');

              return (
                <a
                  key={i}
                  href={word}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-accent underline underline-offset-2 hover:opacity-85 inline-flex items-center gap-1 break-all font-medium text-xs bg-accent/5 px-1.5 py-0.5 rounded border border-accent/20"
                >
                  {isGithub ? (
                    <FolderGit2 className="w-3 h-3 shrink-0" />
                  ) : isDrive ? (
                    <FileText className="w-3 h-3 shrink-0" />
                  ) : (
                    <ExternalLink className="w-3 h-3 shrink-0" />
                  )}
                  <span>{word.length > 34 ? `${word.slice(0, 31)}...` : word}</span>
                </a>
              );
            }

            return <React.Fragment key={i}>{word}</React.Fragment>;
          })}
        </div>

        {/* Bloque de comandos / script terminal */}
        {codeBlockContent && (
          <div className="my-2 rounded-xl border border-border/80 bg-surface-raised p-3 font-mono text-xs text-foreground relative group">
            <div className="flex items-center justify-between pb-2 mb-2 border-b border-border/60 text-[11px] text-foreground-subtle">
              <span className="flex items-center gap-1.5 font-semibold text-foreground">
                <Terminal className="w-3.5 h-3.5 text-accent" />
                <span>Terminal / Comando SMR</span>
              </span>
              <button
                type="button"
                onClick={() => handleCopyCode(codeBlockContent!, msgId || 'block')}
                className="flex items-center gap-1 px-2 py-0.5 rounded bg-surface border border-border hover:text-foreground text-foreground-muted cursor-pointer transition-colors"
              >
                {copiedCodeId === (msgId || 'block') ? (
                  <>
                    <Check className="w-3 h-3 text-emerald-400" />
                    <span className="text-emerald-400">Copiado</span>
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

        {/* Previsualización limpia de imagen directa */}
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
  const isNearLimit = charCount > 280;

  return (
    <div
      ref={containerRef}
      className="relative w-full flex flex-col rounded-2xl border border-border/70 bg-surface shadow-2xs overflow-hidden"
    >
      {/* Píldora flotante para saltar a mensajes nuevos recibidos en tiempo real */}
      {hasNewMessagesAbove && (
        <div className="sticky top-28 z-30 flex justify-center w-full pointer-events-none -mb-8">
          <button
            type="button"
            onClick={scrollToTop}
            className="pointer-events-auto flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-foreground text-background font-semibold text-xs shadow-lg hover:opacity-90 active:scale-95 transition-all cursor-pointer animate-in fade-in slide-in-from-top-2 border border-border/60"
          >
            <ArrowUp className="w-3.5 h-3.5" />
            <span>Nuevas publicaciones en directo</span>
          </button>
        </div>
      )}

      {/* 1. Header & Live Indicator */}
      <div className="sticky top-14 z-20 bg-surface/95 backdrop-blur-md border-b border-border/70 transition-colors">
        <div className="flex items-center justify-between px-3.5 sm:px-5 py-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <h2 className="text-sm font-semibold text-foreground tracking-tight">
              Feed de clase 2º SMR
            </h2>

            {/* Live Realtime Status Pill */}
            <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-surface-raised border border-border/70 text-foreground text-[11px] font-sans">
              {isRealtimeConnected ? (
                <>
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                  </span>
                  <span className="font-mono text-emerald-600 dark:text-emerald-400 font-medium">
                    En directo
                  </span>
                </>
              ) : (
                <>
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                  <span className="text-foreground-muted font-mono">Conectando...</span>
                </>
              )}
              <span className="text-foreground-subtle">·</span>
              <span className="text-foreground-muted">{messages.length} posts</span>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            {/* Botón de avisos fuera de la web */}
            {onOpenNotifications && (
              <button
                type="button"
                onClick={() => {
                  sound.tap();
                  onOpenNotifications();
                }}
                title="Notificaciones y avisos fuera de la web"
                aria-label="Abrir notificaciones push"
                className="flex items-center gap-1 px-2.5 py-1 rounded-lg border border-border/70 bg-surface-raised/60 hover:bg-surface-raised text-foreground-muted hover:text-foreground text-xs font-medium cursor-pointer transition-colors"
              >
                <Bell className="w-3.5 h-3.5 text-accent" />
                <span className="hidden sm:inline">Avisos web</span>
              </button>
            )}

            {/* Botón de búsqueda */}
            <button
              type="button"
              onClick={() => {
                sound.tap();
                setIsSearchOpen((prev) => !prev);
              }}
              title="Buscar en el feed"
              aria-label="Buscar publicaciones"
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
                placeholder="Buscar por tema, comando, @alumno o palabra clave..."
                className="w-full bg-surface-raised border border-border/80 rounded-lg pl-8 pr-8 py-1.5 text-xs text-foreground placeholder:text-foreground-subtle outline-none focus:border-accent transition-colors"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  aria-label="Limpiar búsqueda"
                  className="absolute right-2 text-foreground-subtle hover:text-foreground p-0.5 cursor-pointer"
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
                  {tab.icon}
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

      {/* 2. Composer Box */}
      <div className="p-3.5 sm:p-4.5 border-b border-border/60 bg-surface-raised/20">
        {/* Reply Context Banner */}
        {replyingTo && (
          <div className="flex items-center justify-between gap-2 mb-2 px-2.5 py-1 rounded-md bg-accent/10 border border-accent/20 text-xs text-accent">
            <div className="flex items-center gap-1.5 min-w-0">
              <CornerDownRight className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">
                Respondiendo en directo a <strong className="font-mono">@{replyingTo}</strong>
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
          {/* Avatar del usuario actual */}
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
                    ? `Responde a @${replyingTo}...`
                    : `Comparte un aviso, duda de redes, apunte o comando para la clase...`
                  : 'Inicia sesión para participar en el feed de clase...'
              }
              rows={2}
              maxLength={320}
              className="w-full bg-transparent text-sm text-foreground placeholder:text-foreground-subtle resize-none outline-none leading-relaxed font-sans"
            />

            {/* Tag selector chips & Utilities */}
            <div className="flex items-center justify-between gap-2 flex-wrap">
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

              {/* Botones de acción rápida: código y fijado */}
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={handleInsertCodeSnippet}
                  title="Insertar comando o código `...`"
                  className="flex items-center gap-1 px-2 py-1 rounded text-xs font-mono text-foreground-muted hover:text-foreground hover:bg-surface-raised border border-border/70 cursor-pointer transition-colors"
                >
                  <Code className="w-3.5 h-3.5 text-accent" />
                  <span className="hidden sm:inline">Comando</span>
                </button>

                {isStaff && (
                  <button
                    type="button"
                    onClick={() => {
                      sound.tap();
                      setIsPinned((p) => !p);
                    }}
                    title={isPinned ? 'Desmarcar aviso fijado' : 'Fijar como aviso prioritario'}
                    className={`flex items-center gap-1 px-2 py-1 rounded text-xs font-mono border cursor-pointer transition-colors ${
                      isPinned
                        ? 'bg-amber-500/15 border-amber-500/30 text-amber-500 font-semibold'
                        : 'text-foreground-muted hover:text-foreground hover:bg-surface-raised border-border/70'
                    }`}
                  >
                    <Pin className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Fijar</span>
                  </button>
                )}
              </div>
            </div>

            {/* Bottom Bar: Chars, Shortcut & Submit */}
            <div className="flex items-center justify-between pt-2 border-t border-border/40">
              <div className="flex items-center gap-2 text-[11px] font-mono text-foreground-subtle">
                <span className={isNearLimit ? 'text-amber-500 font-semibold' : ''}>
                  {320 - charCount} caracteres
                </span>
                <span className="hidden sm:inline opacity-60">· Ctrl + Enter</span>
              </div>

              <Button
                variant="primary"
                size="sm"
                onClick={() => handlePublish()}
                disabled={!inputText.trim() || isPosting || charCount > 320}
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
                  ? `No encontramos coincidencias para "${searchQuery}". Prueba con otro término.`
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
            const canDelete = isMe || isStaff;
            const isLiked = Boolean(msg.is_liked_by_me);
            const likesCount = Number(msg.likes_count || 0);

            // Anuncio del Sistema / Victoria del recreo
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
                            Recreo SMR
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

            // Publicación normal de alumno / delegado
            return (
              <article
                key={msg.id}
                className={`p-3.5 sm:p-4 hover:bg-surface-raised/25 transition-colors border-b border-border/40 last:border-b-0 min-w-0 ${
                  msg.pinned ? 'bg-amber-500/5 border-l-2 border-l-amber-500' : ''
                }`}
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

                        {msg.pinned && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-mono px-1.5 py-0.2 rounded bg-amber-500/15 text-amber-500 font-semibold shrink-0 border border-amber-500/20">
                            <Pin className="w-2.5 h-2.5" />
                            <span>Fijado</span>
                          </span>
                        )}

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

                      {/* Botones de acción rápida en cabecera */}
                      <div className="flex items-center gap-1 shrink-0">
                        {canDelete && onDeleteMessage && (
                          <button
                            type="button"
                            onClick={() => handleDelete(msg.id)}
                            disabled={deletingId === msg.id}
                            title="Eliminar publicación"
                            aria-label="Eliminar publicación"
                            className="w-7 h-7 rounded-md text-foreground-subtle hover:text-rose-500 hover:bg-rose-500/10 flex items-center justify-center cursor-pointer active:scale-95 transition-all"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={() => handleShare(msg)}
                          title="Copiar texto de la publicación"
                          aria-label="Copiar texto"
                          className="w-7 h-7 rounded-md text-foreground-subtle hover:text-foreground hover:bg-surface-raised flex items-center justify-center cursor-pointer active:scale-95 transition-all"
                        >
                          {copiedId === msg.id ? (
                            <Check className="w-3 h-3 text-emerald-400" />
                          ) : (
                            <Share2 className="w-3 h-3" />
                          )}
                        </button>
                      </div>
                    </div>

                    {/* Cuerpo del mensaje */}
                    <div className="min-w-0">
                      {renderFormattedText(msg.text, msg.tag, msg.id)}
                    </div>

                    {/* Barra de interacción */}
                    <div className="flex items-center gap-4 pt-1.5 mt-1 border-t border-border/30 text-[11px] font-mono text-foreground-subtle">
                      {/* Botón de Me Gusta */}
                      <button
                        type="button"
                        onClick={() => onToggleLike && onToggleLike(msg.id)}
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

                      {/* Botón de Responder */}
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

                      {/* Botón de Propina */}
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
