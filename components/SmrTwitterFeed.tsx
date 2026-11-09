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
  ChevronDown,
  ChevronUp,
  Sparkles,
  Crown,
} from 'lucide-react';
import { ChatMessage, UserProfile, ChatComment } from '@/lib/types';
import { sound } from '@/lib/audio';
import { createClient } from '@/lib/supabase/client';
import {
  subscribeToWebPush,
  getNotificationPermission,
  isPushNotificationSupported,
} from '@/lib/webPushService';

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

type FeedFilterId = 'all' | 'avisos' | 'dudas' | 'recursos';

interface FeedTabItem {
  id: FeedFilterId;
  label: string;
  icon?: string;
}

const FEED_TABS: FeedTabItem[] = [
  { id: 'all', label: 'Todo' },
  { id: 'avisos', label: 'Avisos' },
  { id: 'dudas', label: 'Dudas' },
  { id: 'recursos', label: 'Recursos' },
];

const COMPOSER_TAGS = [
  { id: 'General', label: 'general', color: 'border-neutral-700 text-neutral-300' },
  { id: 'Aviso', label: 'aviso', color: 'border-amber-500/50 text-amber-300 bg-amber-500/10' },
  { id: 'Duda', label: 'duda', color: 'border-sky-500/50 text-sky-300 bg-sky-500/10' },
  { id: 'Examen', label: 'examen', color: 'border-rose-500/50 text-rose-300 bg-rose-500/10' },
  { id: 'Recurso', label: 'recurso', color: 'border-emerald-500/50 text-emerald-300 bg-emerald-500/10' },
] as const;

function getAvatarGradient(name: string): string {
  if (!name) return 'from-neutral-700 to-neutral-800';
  const clean = name.toLowerCase().replace('@', '');
  if (clean === 'admin' || clean.includes('delegado')) {
    return 'from-amber-500 via-orange-600 to-amber-700';
  }
  const gradients = [
    'from-indigo-600 via-purple-600 to-blue-700',
    'from-cyan-600 via-teal-600 to-emerald-700',
    'from-rose-600 via-pink-600 to-purple-700',
    'from-emerald-600 via-green-600 to-teal-800',
    'from-violet-600 via-indigo-600 to-purple-800',
    'from-blue-600 via-indigo-700 to-sky-700',
    'from-amber-600 via-orange-600 to-rose-700',
    'from-fuchsia-600 via-pink-600 to-rose-600',
  ];
  let hash = 0;
  for (let i = 0; i < clean.length; i++) {
    hash = clean.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % gradients.length;
  return gradients[index];
}

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
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Estados del sistema interactivo de comentarios
  const [expandedComments, setExpandedComments] = useState<Record<string, boolean>>({});
  const [commentsData, setCommentsData] = useState<Record<string, ChatComment[]>>({});
  const [loadingComments, setLoadingComments] = useState<Record<string, boolean>>({});
  const [commentInputs, setCommentInputs] = useState<Record<string, string>>({});
  const [submittingComment, setSubmittingComment] = useState<Record<string, boolean>>({});
  const [localCommentsCount, setLocalCommentsCount] = useState<Record<string, number>>({});

  // Estados de banner de notificaciones fuera de la web (Web Push)
  const [pushStatus, setPushStatus] = useState<NotificationPermission | 'unsupported'>('default');
  const [showPushBanner, setShowPushBanner] = useState<boolean>(false);
  const [isSubscribingPush, setIsSubscribingPush] = useState<boolean>(false);
  const [pushSuccess, setPushSuccess] = useState<boolean>(false);

  const localTextareaRef = useRef<HTMLTextAreaElement | null>(null);
  const textareaRef = externalComposerRef || localTextareaRef;
  const searchInputRef = useRef<HTMLInputElement | null>(null);

  const isStaff =
    currentUser?.role === 'admin' ||
    currentUser?.role === 'delegado' ||
    currentUser?.username === 'admin';

  // Comprobar estado de notificaciones push para invitar al usuario si no las ha activado
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const perm = getNotificationPermission();
      setPushStatus(perm);
      if (perm === 'default' && isPushNotificationSupported()) {
        const dismissed = localStorage.getItem('smr2_push_banner_dismissed_v2');
        if (!dismissed) {
          setShowPushBanner(true);
        }
      }
    }
  }, []);

  useEffect(() => {
    const el = textareaRef.current;
    if (el) {
      el.style.height = 'auto';
      el.style.height = `${Math.min(220, Math.max(56, el.scrollHeight))}px`;
    }
  }, [inputText, textareaRef]);

  useEffect(() => {
    if (isSearchOpen && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [isSearchOpen]);

  const handleActivatePush = async () => {
    sound.tap();
    setIsSubscribingPush(true);
    try {
      const res = await subscribeToWebPush(currentUser?.id);
      setPushStatus(res.status);
      if (res.success) {
        sound.coinWin();
        setPushSuccess(true);
        setTimeout(() => {
          setShowPushBanner(false);
        }, 2800);
      }
    } finally {
      setIsSubscribingPush(false);
    }
  };

  const handleDismissPushBanner = () => {
    sound.tap();
    setShowPushBanner(false);
    try {
      localStorage.setItem('smr2_push_banner_dismissed_v2', 'true');
    } catch (_) {}
  };

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

      // Si es un aviso o examen emitido por admin/delegado, lanzar difusión Web Push en segundo plano
      if (isStaff && (isPinned || postTag === 'aviso' || postTag === 'examen')) {
        try {
          fetch('/api/notifications/broadcast', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              title: `${postTag === 'examen' ? '📝 Examen 2º SMR' : '📢 Aviso de clase'}: @${currentUser.username}`,
              body: trimmed,
              tag: postTag || 'Aviso',
              url: '/',
              authorUsername: currentUser.username,
            }),
          }).catch(() => {});
        } catch (_) {}
      }

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
  };

  const handleCancelReply = () => {
    sound.tap();
    setReplyingTo(null);
  };

  // Gestión de comentarios interactivos
  const toggleComments = async (messageId: string) => {
    sound.tap();
    const willOpen = !expandedComments[messageId];

    setExpandedComments((prev) => ({
      ...prev,
      [messageId]: willOpen,
    }));

    if (willOpen && !commentsData[messageId]) {
      setLoadingComments((prev) => ({ ...prev, [messageId]: true }));
      try {
        const supabase = createClient();
        if (supabase) {
          const { data, error } = await supabase
            .from('chat_message_comments')
            .select('*')
            .eq('message_id', messageId)
            .order('created_at', { ascending: true });

          if (!error && data) {
            setCommentsData((prev) => ({ ...prev, [messageId]: data }));
            setLocalCommentsCount((prev) => ({ ...prev, [messageId]: data.length }));
          }
        }
      } catch (err) {
        console.warn('Error al cargar comentarios:', err);
      } finally {
        setLoadingComments((prev) => ({ ...prev, [messageId]: false }));
      }
    }
  };

  const handleAddComment = async (messageId: string) => {
    const text = (commentInputs[messageId] || '').trim();
    if (!text || submittingComment[messageId]) return;

    if (!currentUser) {
      sound.tap();
      onOpenAuth();
      return;
    }

    sound.tap();
    setSubmittingComment((prev) => ({ ...prev, [messageId]: true }));

    const tempId = `temp_${Date.now()}`;
    const optimisticComment: ChatComment = {
      id: tempId,
      message_id: messageId,
      user_id: currentUser.id,
      username: currentUser.username,
      text,
      created_at: new Date().toISOString(),
    };

    // Actualización optimista inmediata
    setCommentsData((prev) => ({
      ...prev,
      [messageId]: [...(prev[messageId] || []), optimisticComment],
    }));
    setLocalCommentsCount((prev) => ({
      ...prev,
      [messageId]: (prev[messageId] || 0) + 1,
    }));
    setCommentInputs((prev) => ({ ...prev, [messageId]: '' }));

    try {
      const supabase = createClient();
      if (supabase) {
        const { data, error } = await supabase
          .from('chat_message_comments')
          .insert([
            {
              message_id: messageId,
              user_id: currentUser.id,
              username: currentUser.username,
              text,
            },
          ])
          .select()
          .single();

        if (error) {
          console.warn('Error al guardar comentario en Supabase:', error);
        } else if (data) {
          setCommentsData((prev) => ({
            ...prev,
            [messageId]: (prev[messageId] || []).map((c) =>
              c.id === tempId ? { ...c, id: data.id } : c
            ),
          }));
        }
      }
    } catch (err) {
      console.warn('Error en handleAddComment:', err);
    } finally {
      setSubmittingComment((prev) => ({ ...prev, [messageId]: false }));
    }
  };

  const handleDeleteComment = async (commentId: string, messageId: string) => {
    if (!window.confirm('¿Eliminar este comentario?')) return;
    sound.tap();

    // Actualización optimista
    setCommentsData((prev) => ({
      ...prev,
      [messageId]: (prev[messageId] || []).filter((c) => c.id !== commentId),
    }));
    setLocalCommentsCount((prev) => ({
      ...prev,
      [messageId]: Math.max(0, (prev[messageId] || 1) - 1),
    }));

    try {
      const supabase = createClient();
      if (supabase) {
        await supabase.from('chat_message_comments').delete().eq('id', commentId);
      }
    } catch (err) {
      console.warn('Error al eliminar comentario:', err);
    }
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
        textLower.includes('fallo')
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
      return false;
    }).length;
  };

  const renderTagBadge = (rawTag: string) => {
    const lower = rawTag.toLowerCase();
    if (lower === 'aviso') {
      return (
        <span className="inline-flex items-center gap-1.5 text-[11px] font-mono font-semibold px-2 py-0.5 rounded-lg bg-amber-500/15 border border-amber-500/30 text-amber-300">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse"></span>
          #Aviso
        </span>
      );
    }
    if (lower === 'examen') {
      return (
        <span className="inline-flex items-center gap-1.5 text-[11px] font-mono font-semibold px-2 py-0.5 rounded-lg bg-rose-500/15 border border-rose-500/30 text-rose-300">
          <span className="w-1.5 h-1.5 rounded-full bg-rose-400"></span>
          #Examen
        </span>
      );
    }
    if (lower === 'duda') {
      return (
        <span className="inline-flex items-center gap-1.5 text-[11px] font-mono font-semibold px-2 py-0.5 rounded-lg bg-sky-500/15 border border-sky-500/30 text-sky-300">
          <span className="w-1.5 h-1.5 rounded-full bg-sky-400"></span>
          #Duda
        </span>
      );
    }
    if (lower === 'recurso') {
      return (
        <span className="inline-flex items-center gap-1.5 text-[11px] font-mono font-semibold px-2 py-0.5 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-emerald-300">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
          #Recurso
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 text-[11px] font-mono font-medium px-2 py-0.5 rounded-lg bg-neutral-900 border border-neutral-800 text-neutral-300">
        #{rawTag}
      </span>
    );
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
          <div className="flex items-center gap-1.5">
            {renderTagBadge(extractedTag)}
          </div>
        )}

        <div className="text-[15px] sm:text-[14.5px] text-neutral-200 leading-relaxed break-words [overflow-wrap:anywhere] max-w-prose">
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
                  className="font-semibold text-white hover:underline cursor-pointer bg-neutral-800/80 hover:bg-neutral-700/80 px-1.5 py-0.5 rounded-md text-[13px] transition-colors"
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
          <div className="my-2.5 rounded-xl border border-neutral-800/90 bg-[#0a0a0d] p-3 font-mono text-xs text-neutral-200 relative shadow-inner">
            <div className="flex items-center justify-between pb-2 mb-2 border-b border-neutral-800/80 text-[11px] text-neutral-400">
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
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Copiado</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
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
      </div>
    );
  };

  const charCount = inputText.length;
  const isNearLimit = charCount > 280;

  return (
    <div className="relative w-full flex flex-col sm:rounded-3xl border-y sm:border border-neutral-800/80 bg-[#09090c] text-neutral-200 font-sans shadow-2xl overflow-hidden">
      {/* 1. Cabecera moderna con indicador en directo y controles */}
      <div className="border-b border-neutral-800/80 bg-[#09090c]/95 backdrop-blur-md px-4 sm:px-6 py-4">
        <div className="flex items-center justify-between gap-3 mb-3.5">
          <div className="flex items-center gap-2.5">
            <h2 className="text-base sm:text-lg font-bold text-white tracking-tight flex items-center gap-2">
              <span>Feed de Clase</span>
            </h2>

            <div className="flex items-center gap-1.5 text-[11px] text-neutral-400 font-mono px-2 py-0.5 rounded-full bg-neutral-900 border border-neutral-800">
              <span
                className={`w-1.5 h-1.5 rounded-full ${
                  isRealtimeConnected ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'
                }`}
              />
              <span className="hidden xs:inline">{isRealtimeConnected ? 'En directo' : 'Conectando'}</span>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            {onOpenFeedback && (
              <button
                type="button"
                onClick={() => {
                  sound.tap();
                  onOpenFeedback();
                }}
                title="Incidencias o sugerencias"
                aria-label="Incidencias"
                className="w-8 h-8 rounded-xl flex items-center justify-center text-neutral-400 hover:text-white hover:bg-neutral-900/90 border border-transparent hover:border-neutral-800 cursor-pointer transition-all active:scale-95"
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
                title="Gestión de notificaciones"
                aria-label="Notificaciones"
                className="w-8 h-8 rounded-xl flex items-center justify-center text-neutral-400 hover:text-white hover:bg-neutral-900/90 border border-transparent hover:border-neutral-800 cursor-pointer transition-all active:scale-95 relative"
              >
                <Bell className="w-4 h-4" />
                {pushStatus === 'granted' && (
                  <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-emerald-400 rounded-full" />
                )}
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
              className={`w-8 h-8 rounded-xl flex items-center justify-center transition-all cursor-pointer active:scale-95 ${
                isSearchOpen || searchQuery
                  ? 'bg-white text-black font-semibold shadow-xs'
                  : 'text-neutral-400 hover:text-white hover:bg-neutral-900/90 border border-transparent hover:border-neutral-800'
              }`}
            >
              <Search className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Buscador interactivo */}
        {isSearchOpen && (
          <div className="mb-3.5 animate-in fade-in slide-in-from-top-1 duration-150">
            <div className="relative flex items-center">
              <Search className="w-4 h-4 text-neutral-500 absolute left-3 pointer-events-none" />
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar por usuario, comando o palabra..."
                className="w-full bg-neutral-900 border border-neutral-800 rounded-xl pl-9 pr-9 py-2 text-xs sm:text-sm text-neutral-100 placeholder:text-neutral-500 outline-none focus:border-neutral-500 transition-colors shadow-inner"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  aria-label="Limpiar búsqueda"
                  className="absolute right-2.5 text-neutral-500 hover:text-neutral-200 p-1 cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
        )}

        {/* Pestañas Segmented Control con contadores dinámicos */}
        <div className="flex items-center gap-1.5 p-1 rounded-2xl bg-neutral-950 border border-neutral-800/80 overflow-x-auto scrollbar-none">
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
                className={`min-h-[34px] py-1.5 px-3.5 rounded-xl text-xs font-medium transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 shrink-0 active:scale-95 ${
                  isActive
                    ? 'bg-neutral-800/90 text-white font-semibold shadow-sm border border-neutral-700/60'
                    : 'text-neutral-400 hover:text-neutral-200 hover:bg-neutral-900/40'
                }`}
              >
                <span>{tab.label}</span>
                {count > 0 && (
                  <span
                    className={`font-mono text-[10px] px-1.5 py-0.2 rounded-md ${
                      isActive ? 'bg-neutral-700 text-white' : 'bg-neutral-900 text-neutral-500'
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

      {/* Banner de invitación a Notificaciones Push fuera de la web */}
      {showPushBanner && (
        <div className="mx-4 sm:mx-6 mt-4 p-3.5 sm:p-4 rounded-2xl bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent border border-amber-500/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 animate-in fade-in slide-in-from-top-2 duration-200 shadow-sm">
          <div className="flex items-start gap-3 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0 mt-0.5 border border-amber-500/30">
              <Bell className="w-4 h-4 animate-bounce" />
            </div>
            <div>
              <p className="text-xs font-semibold text-white flex items-center gap-1.5">
                <span>Activa los avisos de clase en tu ordenador</span>
                <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  Web Push
                </span>
              </p>
              <p className="text-[11px] text-neutral-400 leading-relaxed mt-0.5">
                Recibe cambios de aula, fechas de exámenes y avisos importantes aunque cierres la web.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
            {pushSuccess ? (
              <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-emerald-500/20 text-emerald-300 text-xs font-semibold border border-emerald-500/40">
                <Check className="w-3.5 h-3.5 text-emerald-400" />
                <span>¡Avisos activados!</span>
              </span>
            ) : (
              <button
                type="button"
                onClick={handleActivatePush}
                disabled={isSubscribingPush}
                className="px-3.5 py-1.5 rounded-xl bg-white text-black hover:bg-neutral-200 text-xs font-semibold shadow transition-all active:scale-95 cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
              >
                {isSubscribingPush ? (
                  <span className="w-3 h-3 border-2 border-black border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Bell className="w-3.5 h-3.5" />
                )}
                <span>Activar avisos</span>
              </button>
            )}

            <button
              type="button"
              onClick={handleDismissPushBanner}
              className="p-1.5 text-neutral-500 hover:text-white rounded-lg hover:bg-neutral-800 transition-colors"
              title="Cerrar aviso"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

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
            <span className="truncate text-neutral-300">Inicia sesión para publicar avisos, dudas o participar</span>
          </div>
          <span className="text-xs font-semibold text-white px-3.5 py-1.5 rounded-xl bg-neutral-800 border border-neutral-700 hover:bg-neutral-700 transition-colors shrink-0 shadow-xs">
            Entrar
          </span>
        </div>
      ) : (
        <div className="p-4 sm:p-6 border-b border-neutral-800/80 bg-neutral-950/40 space-y-3">
          {replyingTo && (
            <div className="flex items-center justify-between gap-2 px-3 py-1.5 rounded-xl bg-neutral-900/90 border border-neutral-800 text-xs text-neutral-300">
              <div className="flex items-center gap-2 min-w-0">
                <CornerDownRight className="w-3.5 h-3.5 shrink-0 text-neutral-400" />
                <span className="truncate">
                  Mencionando a <strong className="font-mono text-white">@{replyingTo}</strong>
                </span>
              </div>
              <button
                type="button"
                onClick={handleCancelReply}
                title="Cancelar mención"
                aria-label="Cancelar mención"
                className="w-6 h-6 rounded-md flex items-center justify-center text-neutral-400 hover:text-white cursor-pointer shrink-0 active:scale-95"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          <div className="rounded-2xl border border-neutral-800 bg-[#0c0c10] p-3.5 focus-within:border-neutral-600 focus-within:ring-1 focus-within:ring-neutral-600/50 transition-all space-y-3 shadow-inner">
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
                  ? `Mencionar a @${replyingTo}...`
                  : 'Comparte un aviso de clase, duda sobre una práctica o recurso útil...'
              }
              rows={2}
              maxLength={320}
              className="w-full bg-transparent text-[15px] sm:text-[14px] text-neutral-100 placeholder:text-neutral-500 resize-none outline-none leading-relaxed font-sans"
            />

            <div className="flex items-center justify-between gap-2 pt-2 border-t border-neutral-800/70 flex-wrap">
              {/* Chips de categorías */}
              <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none py-0.5">
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
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-mono transition-all cursor-pointer border shrink-0 active:scale-95 ${
                        isSelected
                          ? 'bg-white text-black border-white font-bold shadow-xs'
                          : `bg-neutral-900/60 border-neutral-800 text-neutral-400 hover:text-white hover:border-neutral-700`
                      }`}
                    >
                      #{t.label}
                    </button>
                  );
                })}
              </div>

              <div className="flex items-center gap-2 ml-auto shrink-0">
                <button
                  type="button"
                  onClick={handleInsertCodeSnippet}
                  title="Insertar comando `...`"
                  className="px-2.5 py-1 rounded-lg text-xs font-mono text-neutral-400 hover:text-white border border-neutral-800 bg-neutral-900/60 cursor-pointer transition-colors active:scale-95 flex items-center gap-1"
                >
                  <Code className="w-3.5 h-3.5" />
                  <span className="hidden xs:inline">cmd</span>
                </button>

                {isStaff && (
                  <button
                    type="button"
                    onClick={() => {
                      sound.tap();
                      setIsPinned((p) => !p);
                    }}
                    title={isPinned ? 'Desmarcar' : 'Fijar como aviso oficial'}
                    className={`px-2.5 py-1 rounded-lg text-xs font-mono border cursor-pointer transition-all active:scale-95 flex items-center gap-1 ${
                      isPinned
                        ? 'bg-amber-400 text-black border-amber-400 font-bold shadow-xs'
                        : 'text-neutral-400 hover:text-white border-neutral-800 bg-neutral-900/60'
                    }`}
                  >
                    <Pin className="w-3.5 h-3.5" />
                    <span className="hidden xs:inline">Fijar</span>
                  </button>
                )}

                <span
                  className={`text-[11px] font-mono text-neutral-500 px-1 ${
                    isNearLimit ? 'text-amber-400 font-bold' : ''
                  }`}
                >
                  {320 - charCount}
                </span>

                <button
                  type="button"
                  onClick={() => handlePublish()}
                  disabled={!inputText.trim() || isPosting || charCount > 320}
                  className="min-h-[36px] rounded-xl px-4 py-1.5 bg-white text-black font-semibold text-xs hover:bg-neutral-200 active:scale-95 transition-all shadow-sm cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1.5"
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
      )}

      {/* 3. Lista de publicaciones estilizadas */}
      <div className="divide-y divide-neutral-800/80">
        {filteredMessages.length === 0 ? (
          <div className="p-12 text-center space-y-2.5">
            <div className="w-11 h-11 rounded-2xl bg-neutral-900 border border-neutral-800 flex items-center justify-center mx-auto text-neutral-400 shadow-sm">
              <MessageSquare className="w-5 h-5" />
            </div>
            <p className="text-sm font-semibold text-neutral-200">
              {searchQuery
                ? `No hay publicaciones que coincidan con «${searchQuery}».`
                : 'Tablón de anuncios y consultas disponible.'}
            </p>
            <p className="text-xs text-neutral-500 max-w-sm mx-auto leading-relaxed">
              {searchQuery
                ? 'Prueba buscando con otro término o limpia los filtros.'
                : 'Sé el primero en compartir un aviso, duda de clase o recurso útil.'}
            </p>
            {searchQuery && (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('');
                  setActiveTab('all');
                }}
                className="text-xs text-white underline underline-offset-2 hover:text-neutral-300 cursor-pointer pt-2"
              >
                Limpiar búsqueda
              </button>
            )}
          </div>
        ) : (
          filteredMessages.map((msg) => {
            const isMe = currentUser && msg.user_id === currentUser.id;
            const canDelete = isMe || isStaff;
            const isLiked = Boolean(msg.is_liked_by_me);
            const likesCount = Number(msg.likes_count || 0);
            const commentsCount = localCommentsCount[msg.id] ?? Number(msg.comments_count || 0);
            const isThreadOpen = Boolean(expandedComments[msg.id]);

            return (
              <article
                key={msg.id}
                className={`p-4 sm:p-6 transition-all ${
                  msg.pinned
                    ? 'bg-gradient-to-r from-amber-500/[0.06] via-amber-500/[0.02] to-transparent border-l-4 border-amber-400'
                    : 'hover:bg-neutral-900/30'
                }`}
              >
                {/* Banner superior de aviso fijado */}
                {msg.pinned && (
                  <div className="flex items-center gap-1.5 text-[11px] font-mono text-amber-300 font-semibold mb-3">
                    <Pin className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                    <span>AVISO FIJADO DE CLASE</span>
                  </div>
                )}

                <div className="flex items-start gap-3.5 min-w-0">
                  {/* Avatar con gradiente dinámico */}
                  <button
                    type="button"
                    onClick={() => onInspectUser?.({ id: msg.user_id, username: msg.username })}
                    title={`Ver perfil de @${msg.username}`}
                    className={`w-9 h-9 sm:w-10 sm:h-10 rounded-2xl bg-gradient-to-br ${getAvatarGradient(
                      msg.username
                    )} flex items-center justify-center font-mono font-bold text-xs sm:text-sm text-white uppercase shrink-0 mt-0.5 shadow-md hover:scale-105 active:scale-95 transition-all cursor-pointer`}
                  >
                    {msg.username.charAt(0)}
                  </button>

                  <div className="flex-1 min-w-0 space-y-2">
                    {/* Metadatos de publicación */}
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 flex-wrap min-w-0">
                        <button
                          type="button"
                          onClick={() => onInspectUser?.({ id: msg.user_id, username: msg.username })}
                          title={`Ver perfil de @${msg.username}`}
                          className="font-bold text-xs sm:text-[13px] text-white font-mono truncate max-w-[140px] sm:max-w-none hover:text-neutral-300 hover:underline cursor-pointer text-left"
                        >
                          @{msg.username}
                        </button>

                        {(msg.username === 'admin' ||
                          msg.username.toLowerCase().includes('delegado') ||
                          msg.user_id === 'ed922205-b961-487c-a13b-93b5ab7a5faf') && (
                          <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded-md bg-amber-500/20 border border-amber-500/30 text-amber-300 shrink-0">
                            admin
                          </span>
                        )}

                        {(msg.user_id === 'ed922205-b961-487c-a13b-93b5ab7a5faf' ||
                          (currentUser?.id === msg.user_id &&
                            (currentUser?.banner_estilo ||
                              currentUser?.items_comprados?.includes('banner_vip_13m')))) && (
                          <span
                            title="Propietario del Banner Exclusivo 13M"
                            className="text-[10px] font-mono font-bold px-1.5 py-0.2 rounded-md bg-amber-400/15 border border-amber-400/40 text-amber-300 shrink-0 flex items-center gap-1"
                          >
                            <Crown className="w-3 h-3 text-amber-400" />
                            <span>13M</span>
                          </span>
                        )}

                        <span className="text-neutral-600 text-[11px] shrink-0">·</span>

                        <span className="text-[11px] text-neutral-400 font-mono shrink-0">
                          {formatRelativeTime(msg.created_at)}
                        </span>
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        {canDelete && onDeleteMessage && (
                          <button
                            type="button"
                            onClick={() => handleDelete(msg.id)}
                            disabled={deletingId === msg.id}
                            title="Eliminar publicación"
                            aria-label="Eliminar publicación"
                            className="p-1.5 rounded-lg text-neutral-500 hover:text-red-400 hover:bg-neutral-900 cursor-pointer transition-colors active:scale-95"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={() => handleShare(msg)}
                          title="Copiar texto"
                          aria-label="Compartir publicación"
                          className="p-1.5 rounded-lg text-neutral-500 hover:text-neutral-200 hover:bg-neutral-900 cursor-pointer transition-colors active:scale-95"
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

                    {/* Barra de acciones: Me gusta, Comentarios con hilo interactivo, Propinas */}
                    <div className="flex items-center gap-5 sm:gap-7 pt-2 text-[11px] font-mono text-neutral-400">
                      {/* Botón Me Gusta */}
                      <button
                        type="button"
                        onClick={() => onToggleLike && onToggleLike(msg.id)}
                        className={`inline-flex items-center gap-1.5 py-1 px-1.5 rounded-lg hover:text-rose-400 hover:bg-rose-500/10 transition-all cursor-pointer select-none active:scale-90 ${
                          isLiked ? 'text-rose-400 font-bold bg-rose-500/10' : ''
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

                      {/* Botón Comentarios: Despliega el hilo */}
                      <button
                        type="button"
                        onClick={() => toggleComments(msg.id)}
                        className={`inline-flex items-center gap-1.5 py-1 px-1.5 rounded-lg hover:text-sky-300 hover:bg-sky-500/10 transition-all cursor-pointer select-none active:scale-90 ${
                          isThreadOpen
                            ? 'text-sky-300 font-bold bg-sky-500/10'
                            : commentsCount > 0
                            ? 'text-neutral-300 font-semibold'
                            : ''
                        }`}
                        title="Ver y responder comentarios"
                      >
                        <MessageSquare className="w-4 h-4" />
                        <span>{commentsCount > 0 ? commentsCount : 'Responder'}</span>
                        {isThreadOpen ? (
                          <ChevronUp className="w-3 h-3 text-sky-400" />
                        ) : (
                          <ChevronDown className="w-3 h-3 opacity-60" />
                        )}
                      </button>

                      {/* Botón de propina en fichas */}
                      {!isMe && currentUser && !msg.username.toLowerCase().includes('sistema') && (
                        <button
                          type="button"
                          onClick={() => handleTip(msg.id, msg.username)}
                          title={
                            currentUser.coins < 50
                              ? 'Necesitas al menos 50 fichas para enviar propina'
                              : `Enviar 50 fichas a @${msg.username}`
                          }
                          className={`inline-flex items-center gap-1.5 py-1 px-1.5 rounded-lg transition-all cursor-pointer select-none active:scale-90 ${
                            tipSuccessId === msg.id
                              ? 'text-emerald-400 font-bold bg-emerald-500/10'
                              : tipErrorId === msg.id
                              ? 'text-rose-400 font-bold bg-rose-500/10'
                              : 'text-neutral-400 hover:text-amber-400 hover:bg-amber-500/10'
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

                    {/* 4. HILO INTERACTIVO DE COMENTARIOS */}
                    {isThreadOpen && (
                      <div className="mt-3.5 pt-3.5 border-t border-neutral-800/80 space-y-3 animate-in fade-in slide-in-from-top-1 duration-200">
                        <div className="flex items-center justify-between text-xs text-neutral-400 font-mono">
                          <span className="flex items-center gap-1.5 font-semibold text-neutral-300">
                            <MessageSquare className="w-3.5 h-3.5 text-sky-400" />
                            <span>
                              Comentarios ({(commentsData[msg.id] || []).length})
                            </span>
                          </span>
                          <button
                            type="button"
                            onClick={() => toggleComments(msg.id)}
                            className="text-[11px] text-neutral-500 hover:text-neutral-300 transition-colors cursor-pointer"
                          >
                            Cerrar hilo
                          </button>
                        </div>

                        {/* Listado de comentarios */}
                        {loadingComments[msg.id] ? (
                          <div className="flex items-center gap-2 py-3 text-xs text-neutral-400">
                            <span className="w-3.5 h-3.5 border-2 border-neutral-400 border-t-transparent rounded-full animate-spin" />
                            <span>Cargando respuestas...</span>
                          </div>
                        ) : (commentsData[msg.id] || []).length === 0 ? (
                          <div className="py-2.5 px-3.5 rounded-xl bg-neutral-900/40 border border-neutral-800/80 text-xs text-neutral-400 flex items-center justify-between">
                            <span>Aún no hay respuestas. ¡Sé el primero en responder!</span>
                            <Sparkles className="w-3.5 h-3.5 text-neutral-500" />
                          </div>
                        ) : (
                          <div className="space-y-2 border-l-2 border-neutral-800/90 pl-3">
                            {(commentsData[msg.id] || []).map((comment) => {
                              const isCommentAuthor =
                                currentUser?.id === comment.user_id ||
                                currentUser?.username === comment.username;
                              const canDeleteComment = isCommentAuthor || isStaff;

                              return (
                                <div key={comment.id} className="group flex items-start gap-2.5 py-1 text-xs">
                                  <div
                                    className={`w-6 h-6 rounded-lg bg-gradient-to-br ${getAvatarGradient(
                                      comment.username
                                    )} flex items-center justify-center text-[10px] font-bold text-white uppercase shrink-0 mt-0.5 shadow-xs`}
                                  >
                                    {comment.username.charAt(0)}
                                  </div>

                                  <div className="flex-1 min-w-0 bg-neutral-900/60 hover:bg-neutral-900 border border-neutral-800/80 rounded-xl p-2.5 transition-colors">
                                    <div className="flex items-center justify-between gap-2 mb-1">
                                      <div className="flex items-center gap-1.5 flex-wrap">
                                        <button
                                          type="button"
                                          onClick={() =>
                                            onInspectUser?.({ id: comment.user_id, username: comment.username })
                                          }
                                          className="font-bold text-neutral-200 font-mono text-[11px] hover:underline cursor-pointer"
                                        >
                                          @{comment.username}
                                        </button>
                                        <span className="text-neutral-600 text-[10px]">·</span>
                                        <span className="text-[10px] text-neutral-500 font-mono">
                                          {formatRelativeTime(comment.created_at)}
                                        </span>
                                      </div>

                                      {canDeleteComment && (
                                        <button
                                          type="button"
                                          onClick={() => handleDeleteComment(comment.id, msg.id)}
                                          title="Eliminar comentario"
                                          className="opacity-0 group-hover:opacity-100 p-1 text-neutral-500 hover:text-red-400 transition-opacity cursor-pointer"
                                        >
                                          <Trash2 className="w-3 h-3" />
                                        </button>
                                      )}
                                    </div>

                                    <p className="text-neutral-300 text-xs break-words whitespace-pre-wrap leading-relaxed">
                                      {comment.text}
                                    </p>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}

                        {/* Input rápido para responder directamente */}
                        <div className="pt-1.5 flex items-center gap-2">
                          <input
                            type="text"
                            value={commentInputs[msg.id] || ''}
                            onChange={(e) =>
                              setCommentInputs((prev) => ({ ...prev, [msg.id]: e.target.value }))
                            }
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' && !e.shiftKey) {
                                e.preventDefault();
                                handleAddComment(msg.id);
                              }
                            }}
                            placeholder={
                              currentUser
                                ? `Responder a @${msg.username}...`
                                : 'Inicia sesión para responder...'
                            }
                            maxLength={300}
                            className="flex-1 bg-neutral-900 border border-neutral-800 rounded-xl px-3.5 py-2 text-xs text-neutral-100 placeholder:text-neutral-500 outline-none focus:border-neutral-600 transition-colors shadow-inner"
                          />
                          <button
                            type="button"
                            onClick={() => handleAddComment(msg.id)}
                            disabled={!(commentInputs[msg.id] || '').trim() || submittingComment[msg.id]}
                            className="px-3.5 py-2 rounded-xl bg-white text-black font-semibold text-xs hover:bg-neutral-200 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-all shrink-0 flex items-center gap-1 active:scale-95 shadow-xs"
                          >
                            {submittingComment[msg.id] ? (
                              <span className="w-3 h-3 border-2 border-black border-t-transparent rounded-full animate-spin" />
                            ) : (
                              <Send className="w-3 h-3" />
                            )}
                            <span>Responder</span>
                          </button>
                        </div>
                      </div>
                    )}
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
