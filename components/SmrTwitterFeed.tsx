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
  onInspectUser?: (identifier: { id?: string; username: string }) => void;
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
 * Formato conciso de tiempo relativo estilo Apple
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
  onInspectUser,
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
  const [tipErrorId, setTipErrorId] = useState<string | null>(null);
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
    const cleanAuthor = authorUsername.trim();
    if (currentUser.username === cleanAuthor) return;
    if (cleanAuthor.toLowerCase().includes('sistema') || cleanAuthor.toLowerCase().includes('banca')) {
      return;
    }

    if (currentUser.coins < 50) {
      sound.broke();
      setTipErrorId(msgId);
      setTimeout(() => setTipErrorId(null), 2500);
      return;
    }

    onTipUser(cleanAuthor, 50);
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
      <div className="space-y-2.5 min-w-0 font-sans">
        {extractedTag && extractedTag.toLowerCase() !== 'general' && (
          <div className="flex items-center gap-1">
            <span className="text-[10px] font-mono font-medium px-2 py-0.5 rounded-md bg-neutral-900 border border-neutral-800 text-neutral-400">
              #{extractedTag}
            </span>
          </div>
        )}

        <div className="text-[15px] sm:text-[14px] text-neutral-200 leading-relaxed break-words [overflow-wrap:anywhere] max-w-prose">
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
                  className="font-medium text-white hover:underline cursor-pointer bg-neutral-800/80 px-1.5 py-0.5 rounded-md text-[13px] transition-colors"
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
                  className="text-neutral-400 hover:text-white hover:underline cursor-pointer transition-colors"
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
                  className="px-1.5 py-0.5 mx-0.5 rounded-md bg-neutral-900 border border-neutral-800 font-mono text-xs text-neutral-200 cursor-copy hover:border-neutral-600 transition-colors"
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
                  className="text-neutral-300 hover:text-white underline underline-offset-2 inline-flex items-center gap-1.5 break-all text-xs bg-neutral-900/80 px-2 py-0.5 rounded-lg border border-neutral-800 transition-colors"
                >
                  {isGithub ? (
                    <FolderGit2 className="w-3.5 h-3.5 shrink-0 text-neutral-400" />
                  ) : isDrive ? (
                    <FileText className="w-3.5 h-3.5 shrink-0 text-neutral-400" />
                  ) : (
                    <ExternalLink className="w-3.5 h-3.5 shrink-0 text-neutral-400" />
                  )}
                  <span>{word.length > 36 ? `${word.slice(0, 33)}...` : word}</span>
                </a>
              );
            }

            return <React.Fragment key={i}>{word}</React.Fragment>;
          })}
        </div>

        {codeBlockContent && (
          <div className="my-2.5 rounded-xl border border-neutral-800 bg-[#0c0c0e] p-3 font-mono text-xs text-neutral-200 relative">
            <div className="flex items-center justify-between pb-2 mb-2 border-b border-neutral-800 text-[11px] text-neutral-400">
              <span className="flex items-center gap-1.5 font-medium text-neutral-300">
                <Terminal className="w-3.5 h-3.5 text-neutral-400" />
                <span>Script / Comando</span>
              </span>
              <button
                type="button"
                onClick={() => handleCopyCode(codeBlockContent!, msgId || 'block')}
                className="flex items-center gap-1 px-2 py-1 rounded-md bg-neutral-900 border border-neutral-800 text-neutral-400 hover:text-white cursor-pointer transition-colors"
              >
                {copiedCodeId === (msgId || 'block') ? (
                  <>
                    <Check className="w-3 h-3 text-emerald-400" />
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
            <pre className="overflow-x-auto whitespace-pre-wrap leading-relaxed select-all text-neutral-300">
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
              className="mt-2.5 rounded-xl overflow-hidden border border-neutral-800 max-h-80 max-w-md bg-neutral-900"
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
      className="relative w-full flex flex-col sm:rounded-3xl border-y sm:border border-neutral-800/80 bg-[#09090b] text-neutral-200 font-sans shadow-xl overflow-hidden"
    >
      {/* Botón flotante para mensajes nuevos */}
      {hasNewMessagesAbove && (
        <div className="sticky top-[calc(6.8rem+env(safe-area-inset-top,0px))] z-30 flex justify-center w-full pointer-events-none -mb-8">
          <button
            type="button"
            onClick={scrollToTop}
            className="pointer-events-auto flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-white text-black text-xs font-semibold shadow-lg hover:bg-neutral-200 active:scale-95 transition-all cursor-pointer touch-manipulation"
          >
            <span>Nuevos mensajes</span>
          </button>
        </div>
      )}

      {/* 1. Cabecera sobria del Feed con Segmented Control estilo Apple */}
      <div className="sticky top-[calc(3.5rem+env(safe-area-inset-top,0px))] z-20 bg-[#09090b]/90 backdrop-blur-2xl border-b border-neutral-800/80">
        <div className="flex items-center justify-between px-4 sm:px-5 py-3">
          <div className="flex items-center gap-2.5">
            <h2 className="text-sm font-semibold text-white tracking-tight">
              Feed de Clase
            </h2>

            <div className="flex items-center gap-1.5 text-[11px] text-neutral-400 font-mono">
              <span
                className={`w-1.5 h-1.5 rounded-full ${
                  isRealtimeConnected ? 'bg-emerald-400' : 'bg-amber-400'
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
                className="w-8 h-8 rounded-lg flex items-center justify-center text-neutral-400 hover:text-white hover:bg-neutral-900 cursor-pointer transition-colors touch-manipulation active:scale-95"
              >
                <AlertCircle className="w-4 h-4" />
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
                className="w-8 h-8 rounded-lg flex items-center justify-center text-neutral-400 hover:text-white hover:bg-neutral-900 cursor-pointer transition-colors touch-manipulation active:scale-95"
              >
                <Bell className="w-4 h-4" />
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
              className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors cursor-pointer touch-manipulation active:scale-95 ${
                isSearchOpen || searchQuery
                  ? 'bg-white text-black font-semibold'
                  : 'text-neutral-400 hover:text-white hover:bg-neutral-900'
              }`}
            >
              <Search className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Campo de búsqueda desplegable */}
        {isSearchOpen && (
          <div className="px-4 sm:px-5 pb-3 animate-in fade-in duration-150">
            <div className="relative flex items-center">
              <Search className="w-4 h-4 text-neutral-500 absolute left-3 pointer-events-none" />
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar por usuario, comando o tema..."
                className="w-full bg-neutral-900/90 border border-neutral-800 rounded-xl pl-9 pr-9 py-2 text-sm text-neutral-100 placeholder:text-neutral-500 outline-none focus:border-neutral-500 transition-colors"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  aria-label="Limpiar búsqueda"
                  className="absolute right-2.5 text-neutral-500 hover:text-neutral-200 p-1 cursor-pointer touch-manipulation"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
        )}

        {/* Pestañas Segmented Control estilo iOS */}
        <div className="px-4 sm:px-5 pb-2.5">
          <div className="flex items-center gap-1 p-1 rounded-xl bg-neutral-950/80 border border-neutral-800/80 overflow-x-auto scrollbar-none">
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
                  className={`min-h-[34px] py-1 px-3 rounded-lg text-xs font-medium transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 touch-manipulation shrink-0 ${
                    isActive
                      ? 'bg-neutral-800 text-white font-semibold shadow-xs border border-neutral-700/50'
                      : 'text-neutral-400 hover:text-neutral-200'
                  }`}
                >
                  <span>{tab.label}</span>
                  {count > 0 && (
                    <span className={`font-mono text-[10px] ${isActive ? 'text-neutral-300' : 'text-neutral-500'}`}>
                      {count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* 2. Redactor de publicaciones */}
      {!currentUser ? (
        <div
          onClick={() => {
            sound.tap();
            onOpenAuth();
          }}
          className="p-4 sm:p-5 border-b border-neutral-800/80 bg-neutral-900/20 flex items-center justify-between gap-3 cursor-pointer hover:bg-neutral-900/40 active:bg-neutral-900/50 transition-colors"
        >
          <div className="flex items-center gap-3 text-xs text-neutral-400 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-neutral-900 border border-neutral-800 flex items-center justify-center text-neutral-400 shrink-0">
              <MessageSquare className="w-4 h-4" />
            </div>
            <span className="truncate text-neutral-300">Inicia sesión para compartir avisos, dudas o recursos de clase</span>
          </div>
          <span className="text-xs font-medium text-white px-3 py-1.5 rounded-lg bg-neutral-900 border border-neutral-800 hover:bg-neutral-800 transition-colors shrink-0">
            Entrar
          </span>
        </div>
      ) : (
        <div className="p-4 sm:p-5 border-b border-neutral-800/80 bg-neutral-950/40">
          {replyingTo && (
            <div className="flex items-center justify-between gap-2 mb-3 px-3 py-1.5 rounded-xl bg-neutral-900/80 border border-neutral-800 text-xs text-neutral-300">
              <div className="flex items-center gap-2 min-w-0">
                <CornerDownRight className="w-3.5 h-3.5 shrink-0 text-neutral-400" />
                <span className="truncate">
                  Respondiendo a <strong className="font-mono text-white">@{replyingTo}</strong>
                </span>
              </div>
              <button
                type="button"
                onClick={handleCancelReply}
                title="Cancelar respuesta"
                aria-label="Cancelar respuesta"
                className="w-6 h-6 rounded-md flex items-center justify-center text-neutral-400 hover:text-white cursor-pointer shrink-0 active:scale-95 touch-manipulation"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          <div className="flex items-start gap-3.5">
            <div className="w-9 h-9 rounded-xl bg-neutral-900 border border-neutral-800 flex items-center justify-center font-mono font-semibold text-xs text-white uppercase shrink-0 mt-0.5">
              {currentUser.username.charAt(0)}
            </div>

            <div className="flex-1 min-w-0 space-y-3">
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
                    : 'Publicar aviso, duda o apunte...'
                }
                rows={2}
                maxLength={320}
                className="w-full bg-transparent text-[15px] sm:text-[14px] text-neutral-100 placeholder:text-neutral-500 resize-none outline-none leading-relaxed font-sans"
              />

              <div className="flex items-center justify-between gap-2 pt-2 border-t border-neutral-800/80">
                {/* Etiquetas estilo pills discretas */}
                <div className="flex items-center gap-1 overflow-x-auto scrollbar-none py-0.5 max-w-[55%] sm:max-w-none">
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
                        className={`px-2.5 py-1 rounded-lg text-[11px] font-mono transition-colors cursor-pointer border shrink-0 touch-manipulation active:scale-95 ${
                          isSelected
                            ? 'bg-white text-black border-white font-semibold'
                            : 'bg-neutral-900/60 text-neutral-400 border-neutral-800 hover:text-white hover:border-neutral-700'
                        }`}
                      >
                        #{t.label}
                      </button>
                    );
                  })}
                </div>

                <div className="flex items-center gap-1.5 ml-auto shrink-0">
                  <button
                    type="button"
                    onClick={handleInsertCodeSnippet}
                    title="Insertar comando `...`"
                    className="px-2.5 py-1 rounded-lg text-xs font-mono text-neutral-400 hover:text-white border border-neutral-800 bg-neutral-900/60 cursor-pointer transition-colors touch-manipulation active:scale-95 flex items-center gap-1"
                  >
                    <Code className="w-3.5 h-3.5" />
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
                      className={`px-2.5 py-1 rounded-lg text-xs font-mono border cursor-pointer transition-colors touch-manipulation active:scale-95 flex items-center gap-1 ${
                        isPinned
                          ? 'bg-white text-black border-white font-semibold'
                          : 'text-neutral-400 hover:text-white border-neutral-800 bg-neutral-900/60'
                      }`}
                    >
                      <Pin className="w-3.5 h-3.5" />
                      <span className="hidden xs:inline">Fijar</span>
                    </button>
                  )}

                  <span className={`text-[11px] font-mono text-neutral-500 px-1 ${isNearLimit ? 'text-amber-400 font-semibold' : ''}`}>
                    {320 - charCount}
                  </span>

                  <button
                    type="button"
                    onClick={() => handlePublish()}
                    disabled={!inputText.trim() || isPosting || charCount > 320}
                    className="min-h-[34px] rounded-xl px-3.5 py-1.5 bg-white text-black font-semibold text-xs hover:bg-neutral-200 active:scale-95 transition-all shadow-xs cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed touch-manipulation flex items-center gap-1.5"
                  >
                    {isPosting ? (
                      <span className="w-3 h-3 border-2 border-black border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <Send className="w-3.5 h-3.5" />
                    )}
                    <span>Publicar</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 3. Lista de publicaciones */}
      <div className="divide-y divide-neutral-800/80">
        {filteredMessages.length === 0 ? (
          <div className="p-10 text-center space-y-2.5">
            <p className="text-xs text-neutral-400">
              {searchQuery
                ? `No hay publicaciones que coincidan con «${searchQuery}».`
                : 'No hay publicaciones en esta sección.'}
            </p>
            {searchQuery && (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('');
                  setActiveTab('all');
                }}
                className="text-xs text-white underline underline-offset-2 hover:text-neutral-300 cursor-pointer"
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
                  className="px-4 sm:px-5 py-2.5 bg-neutral-900/30 hover:bg-neutral-900/50 transition-colors flex items-center justify-between gap-3 text-xs font-mono text-neutral-400"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className="text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded-md bg-neutral-900 border border-neutral-800 text-neutral-400 shrink-0">
                      recreo
                    </span>
                    <span className="truncate text-neutral-200 text-[12px]">{msg.text}</span>
                  </div>

                  <span className="text-[11px] text-neutral-500 shrink-0">
                    {formatRelativeTime(msg.created_at)}
                  </span>
                </div>
              );
            }

            // Publicación normal
            return (
              <article
                key={msg.id}
                className={`p-4 sm:p-5 hover:bg-neutral-900/20 transition-colors ${
                  msg.pinned ? 'bg-neutral-900/30 border-l-2 border-white' : ''
                }`}
              >
                <div className="flex items-start gap-3.5 min-w-0">
                  <button
                    type="button"
                    onClick={() => onInspectUser?.({ id: msg.user_id, username: msg.username })}
                    title={`Ver perfil de @${msg.username}`}
                    className="w-9 h-9 rounded-xl bg-neutral-900 border border-neutral-800 flex items-center justify-center font-mono font-semibold text-xs text-neutral-200 uppercase shrink-0 mt-0.5 hover:border-neutral-600 active:scale-95 transition-all cursor-pointer"
                  >
                    {msg.username.charAt(0)}
                  </button>

                  <div className="flex-1 min-w-0 space-y-1.5">
                    {/* Fila de metadatos */}
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 flex-wrap min-w-0">
                        <button
                          type="button"
                          onClick={() => onInspectUser?.({ id: msg.user_id, username: msg.username })}
                          title={`Ver perfil de @${msg.username}`}
                          className="font-semibold text-xs text-white font-mono truncate max-w-[140px] sm:max-w-none hover:text-neutral-300 hover:underline cursor-pointer text-left"
                        >
                          @{msg.username}
                        </button>

                        {msg.pinned && (
                          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded-md border border-neutral-800 text-neutral-400 shrink-0">
                            fijado
                          </span>
                        )}

                        {(msg.username === 'admin' ||
                          msg.username.toLowerCase().includes('delegado')) && (
                          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded-md bg-neutral-900 border border-neutral-800 text-neutral-300 shrink-0">
                            delegado
                          </span>
                        )}

                        <span className="text-neutral-600 text-[11px] shrink-0">·</span>

                        <span className="text-[11px] text-neutral-500 font-mono shrink-0">
                          {formatRelativeTime(msg.created_at)}
                        </span>
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        {canDelete && onDeleteMessage && (
                          <button
                            type="button"
                            onClick={() => handleDelete(msg.id)}
                            disabled={deletingId === msg.id}
                            title="Eliminar"
                            aria-label="Eliminar publicación"
                            className="p-1.5 rounded-lg text-neutral-500 hover:text-red-400 hover:bg-neutral-900 cursor-pointer transition-colors touch-manipulation active:scale-95"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={() => handleShare(msg)}
                          title="Copiar texto"
                          aria-label="Compartir publicación"
                          className="p-1.5 rounded-lg text-neutral-500 hover:text-neutral-200 hover:bg-neutral-900 cursor-pointer transition-colors touch-manipulation active:scale-95"
                        >
                          {copiedId === msg.id ? (
                            <Check className="w-3.5 h-3.5 text-emerald-400" />
                          ) : (
                            <Share2 className="w-3.5 h-3.5" />
                          )}
                        </button>
                      </div>
                    </div>

                    {/* Contenido formateado */}
                    <div className="min-w-0">
                      {renderFormattedText(msg.text, msg.tag, msg.id)}
                    </div>

                    {/* Barra de acciones minimalista */}
                    <div className="flex items-center gap-6 sm:gap-8 pt-2 text-[11px] font-mono text-neutral-400">
                      <button
                        type="button"
                        onClick={() => onToggleLike && onToggleLike(msg.id)}
                        className={`inline-flex items-center gap-1.5 py-1.5 -my-1.5 hover:text-rose-400 transition-colors cursor-pointer select-none touch-manipulation active:scale-90 ${
                          isLiked ? 'text-rose-400 font-semibold' : ''
                        }`}
                        title={isLiked ? 'Quitar me gusta' : 'Me gusta'}
                      >
                        <Heart
                          className={`w-4 h-4 transition-transform ${
                            isLiked ? 'fill-rose-500 stroke-rose-500 scale-110' : ''
                          }`}
                        />
                        <span>{likesCount > 0 ? likesCount : ''}</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleStartReply(msg.username)}
                        className="inline-flex items-center gap-1.5 py-1.5 -my-1.5 hover:text-white transition-colors cursor-pointer select-none touch-manipulation active:scale-90"
                      >
                        <MessageSquare className="w-4 h-4" />
                        <span>Responder</span>
                      </button>

                      {!isMe && currentUser && !msg.username.toLowerCase().includes('sistema') && (
                        <button
                          type="button"
                          onClick={() => handleTip(msg.id, msg.username)}
                          title={
                            currentUser.coins < 50
                              ? 'Necesitas al menos 50 fichas para enviar propina'
                              : `Enviar 50 fichas a @${msg.username}`
                          }
                          className={`inline-flex items-center gap-1.5 py-1.5 -my-1.5 transition-all cursor-pointer select-none touch-manipulation active:scale-90 ${
                            tipSuccessId === msg.id
                              ? 'text-emerald-400 font-medium'
                              : tipErrorId === msg.id
                              ? 'text-rose-400 font-medium'
                              : 'text-neutral-400 hover:text-amber-400'
                          }`}
                        >
                          <Coins className={`w-4 h-4 ${tipSuccessId === msg.id ? 'text-emerald-400' : ''}`} />
                          <span className="font-mono text-[11px]">
                            {tipSuccessId === msg.id
                              ? '+50'
                              : tipErrorId === msg.id
                              ? 'Sin fichas'
                              : '50 fichas'}
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
