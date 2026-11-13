'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Send,
  Share2,
  ExternalLink,
  MessageSquare,
  Check,
  Heart,
  Search,
  X,
  Pin,
  Trash2,
  Bell,
  AlertCircle,
  Copy,
  Terminal,
  FolderGit2,
  FileText,
  Crown,
  RotateCw,
  Reply,
  AtSign,
} from 'lucide-react';
import { ChatMessage, UserProfile, ChatComment } from '@/lib/types';
import { sound } from '@/lib/audio';
import { createClient } from '@/lib/supabase/client';
import { isUUID } from '@/lib/uuid';
import {
  subscribeToWebPush,
  getNotificationPermission,
  isPushNotificationSupported,
} from '@/lib/webPushService';
import { getPetById } from '@/lib/pets';

export interface SmrTwitterFeedProps {
  messages: ChatMessage[];
  currentUser: UserProfile | null;
  onOpenAuth: () => void;
  onSendMessage: (text: string, tag?: string, pinned?: boolean) => void;
  onDeleteMessage?: (messageId: string) => void;
  onToggleLike?: (messageId: string) => void;
  onOpenNotifications?: () => void;
  onOpenFeedback?: () => void;
  onInspectUser?: (identifier: { id?: string; username: string }) => void;
  isRealtimeConnected?: boolean;
  composerRef?: React.RefObject<HTMLTextAreaElement | null>;
  onRefresh?: () => Promise<void> | void;
  userPetsMap?: Record<string, string>;
}

type FeedFilterId = 'all' | 'avisos' | 'dudas' | 'recursos';

interface FeedTabItem {
  id: FeedFilterId;
  label: string;
}

const FEED_TABS: FeedTabItem[] = [
  { id: 'all', label: 'Todo' },
  { id: 'avisos', label: 'Avisos' },
  { id: 'dudas', label: 'Dudas' },
  { id: 'recursos', label: 'Recursos' },
];

const COMPOSER_TAGS = [
  { id: 'General', label: 'general' },
  { id: 'Aviso', label: 'aviso' },
  { id: 'Duda', label: 'duda' },
  { id: 'Examen', label: 'examen' },
  { id: 'Recurso', label: 'recurso' },
] as const;

function getAvatarColor(name: string): string {
  if (!name) return 'bg-foreground/10 text-foreground-muted';
  const clean = name.toLowerCase().replace('@', '');
  if (clean === 'admin' || clean.includes('delegado')) {
    return 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30';
  }
  const colors = [
    'bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 border border-indigo-500/20',
    'bg-sky-500/15 text-sky-700 dark:text-sky-300 border border-sky-500/20',
    'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20',
    'bg-purple-500/15 text-purple-700 dark:text-purple-300 border border-purple-500/20',
    'bg-rose-500/15 text-rose-700 dark:text-rose-300 border border-rose-500/20',
    'bg-teal-500/15 text-teal-700 dark:text-teal-300 border border-teal-500/20',
  ];
  let hash = 0;
  for (let i = 0; i < clean.length; i++) {
    hash = clean.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % colors.length;
  return colors[index];
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
  onToggleLike,
  onOpenNotifications,
  onOpenFeedback,
  onInspectUser,
  isRealtimeConnected = true,
  composerRef: externalComposerRef,
  onRefresh,
  userPetsMap = {},
}) => {
  const [activeTab, setActiveTab] = useState<FeedFilterId>('all');

  const resolveUserPet = (userId?: string, username?: string, directPetId?: string) => {
    if (directPetId) return getPetById(directPetId);
    if (currentUser && (userId === currentUser.id || username?.toLowerCase() === currentUser.username?.toLowerCase())) {
      if (currentUser.mascota_equipada) return getPetById(currentUser.mascota_equipada);
    }
    if (username && userPetsMap[username.toLowerCase()]) {
      return getPetById(userPetsMap[username.toLowerCase()]);
    }
    if (userId && userPetsMap[userId]) {
      return getPetById(userPetsMap[userId]);
    }
    return undefined;
  };
  const [inputText, setInputText] = useState('');
  const [selectedTag, setSelectedTag] = useState<string>('General');
  const [isPinned, setIsPinned] = useState(false);
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isPosting, setIsPosting] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [copiedCodeId, setCopiedCodeId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Comentarios interactivos
  const [expandedComments, setExpandedComments] = useState<Record<string, boolean>>({});
  const [commentsData, setCommentsData] = useState<Record<string, ChatComment[]>>({});
  const [loadingComments, setLoadingComments] = useState<Record<string, boolean>>({});
  const [commentInputs, setCommentInputs] = useState<Record<string, string>>({});
  const [submittingComment, setSubmittingComment] = useState<Record<string, boolean>>({});
  const [localCommentsCount, setLocalCommentsCount] = useState<Record<string, number>>({});

  // Banner Web Push
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
      el.style.height = `${Math.min(180, Math.max(48, el.scrollHeight))}px`;
    }
  }, [inputText, textareaRef]);

  useEffect(() => {
    if (isSearchOpen && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [isSearchOpen]);

  // Sincronización en tiempo real con Supabase
  useEffect(() => {
    const supabase = createClient();
    if (!supabase) return;

    const channel = supabase
      .channel('feed_comments_minimal_sync')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'chat_message_comments' },
        (payload) => {
          const incoming = payload.new as ChatComment;
          if (!incoming || !incoming.message_id) return;

          setCommentsData((prev) => {
            const list = prev[incoming.message_id];
            if (!list) return prev;
            if (
              list.some(
                (c) =>
                  c.id === incoming.id ||
                  (c.id.startsWith('temp_') &&
                    c.text === incoming.text &&
                    c.username === incoming.username)
              )
            ) {
              return {
                ...prev,
                [incoming.message_id]: list.map((c) =>
                  c.text === incoming.text && c.username === incoming.username ? incoming : c
                ),
              };
            }
            return {
              ...prev,
              [incoming.message_id]: [...list, incoming],
            };
          });

          setLocalCommentsCount((prev) => ({
            ...prev,
            [incoming.message_id]: (prev[incoming.message_id] ?? 0) + 1,
          }));
        }
      )
      .on(
        'postgres_changes',
        { event: 'DELETE', schema: 'public', table: 'chat_message_comments' },
        (payload) => {
          const oldComment = payload.old as any;
          if (!oldComment?.id) return;

          setCommentsData((prev) => {
            const updated: Record<string, ChatComment[]> = {};
            for (const msgId in prev) {
              updated[msgId] = prev[msgId].filter((c) => c.id !== oldComment.id);
            }
            return updated;
          });
        }
      )
      .subscribe();

    let bc: BroadcastChannel | null = null;
    try {
      bc = new BroadcastChannel('smr2_comments_channel');
      bc.onmessage = (ev) => {
        if (ev.data?.type === 'NEW_COMMENT' && ev.data.comment) {
          const incoming = ev.data.comment as ChatComment;
          setCommentsData((prev) => {
            const list = prev[incoming.message_id];
            if (!list) return prev;
            if (list.some((c) => c.id === incoming.id)) return prev;
            return {
              ...prev,
              [incoming.message_id]: [...list, incoming],
            };
          });
          setLocalCommentsCount((prev) => ({
            ...prev,
            [incoming.message_id]: (prev[incoming.message_id] ?? 0) + 1,
          }));
        }
      };
    } catch (_) {}

    return () => {
      try {
        supabase.removeChannel(channel);
        bc?.close();
      } catch (_) {}
    };
  }, []);

  const handleManualRefresh = async () => {
    if (isRefreshing) return;
    sound.tap();
    setIsRefreshing(true);
    try {
      if (onRefresh) {
        await onRefresh();
      }
    } finally {
      setTimeout(() => setIsRefreshing(false), 500);
    }
  };

  const handleActivatePush = async () => {
    sound.tap();
    setIsSubscribingPush(true);
    try {
      const res = await subscribeToWebPush(currentUser?.id);
      setPushStatus(res.status);
      if (res.success) {
        sound.coinWin();
        setPushSuccess(true);
        setTimeout(() => setShowPushBanner(false), 2400);
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

      if (isStaff && (isPinned || postTag === 'aviso' || postTag === 'examen')) {
        try {
          fetch('/api/notifications/broadcast', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              title: `${postTag === 'examen' ? '📝 Examen 2º SMR' : '📢 Aviso'}: @${currentUser.username}`,
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

  const handleInsertMention = () => {
    sound.tap();
    setInputText((prev) => (prev ? `${prev} @` : '@'));
    textareaRef.current?.focus();
  };

  const handleStartReply = useCallback(
    (username: string) => {
      sound.tap();
      const cleanUsername = username.replace(/^@/, '').trim();
      setReplyingTo(cleanUsername);
      const prefix = `@${cleanUsername} `;
      setInputText((prev) => {
        if (!prev) return prefix;
        if (prev.startsWith(prefix)) return prev;
        return `${prefix}${prev}`;
      });

      if (textareaRef.current) {
        textareaRef.current.focus();
        textareaRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    },
    [textareaRef]
  );

  const handleCancelReply = () => {
    sound.tap();
    setReplyingTo(null);
  };

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
        const dbUserId = isUUID(currentUser.id) ? currentUser.id : null;

        const commentPayload: Record<string, any> = {
          message_id: messageId,
          username: currentUser.username,
          text,
        };
        if (dbUserId) commentPayload.user_id = dbUserId;

        let { data, error } = await supabase
          .from('chat_message_comments')
          .insert([commentPayload])
          .select()
          .single();

        if (error && commentPayload.user_id) {
          delete commentPayload.user_id;
          const retry = await supabase
            .from('chat_message_comments')
            .insert([commentPayload])
            .select()
            .single();
          data = retry.data;
          error = retry.error;
        }

        if (data) {
          setCommentsData((prev) => ({
            ...prev,
            [messageId]: (prev[messageId] || []).map((c) =>
              c.id === tempId ? { ...c, id: data.id } : c
            ),
          }));

          try {
            const bc = new BroadcastChannel('smr2_comments_channel');
            bc.postMessage({ type: 'NEW_COMMENT', comment: data });
            bc.close();
          } catch (_) {}
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

  const handleShare = (msg: ChatMessage) => {
    const textToCopy = `"${msg.text}" — @${msg.username} (2º SMR)`;
    if (navigator.clipboard) {
      navigator.clipboard.writeText(textToCopy);
      sound.tap();
      setCopiedId(msg.id);
      setTimeout(() => setCopiedId(null), 1800);
    }
  };

  const handleCopyCode = (codeText: string, id: string) => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(codeText);
      sound.tap();
      setCopiedCodeId(id);
      setTimeout(() => setCopiedCodeId(null), 1800);
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
        return (
          m.pinned ||
          tag === 'aviso' ||
          tag === 'examen' ||
          t.includes('#aviso') ||
          t.includes('examen')
        );
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
    const map: Record<string, { dot: string; text: string; bg: string }> = {
      aviso: { dot: 'bg-amber-400', text: 'text-amber-700 dark:text-amber-300', bg: 'bg-amber-400/10' },
      examen: { dot: 'bg-rose-400', text: 'text-rose-700 dark:text-rose-300', bg: 'bg-rose-400/10' },
      duda: { dot: 'bg-sky-400', text: 'text-sky-700 dark:text-sky-300', bg: 'bg-sky-400/10' },
      recurso: { dot: 'bg-emerald-400', text: 'text-emerald-700 dark:text-emerald-300', bg: 'bg-emerald-400/10' },
    };
    const style = map[lower] || {
      dot: 'bg-foreground-subtle',
      text: 'text-foreground-subtle',
      bg: 'bg-surface-raised',
    };

    return (
      <span
        className={`inline-flex items-center gap-1.5 text-[10.5px] font-mono px-2 py-0.5 rounded-md ${style.bg} ${style.text}`}
      >
        <span className={`w-1.5 h-1.5 rounded-full ${style.dot}`} />
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
      <div className="space-y-2 min-w-0 font-sans">
        {extractedTag && extractedTag.toLowerCase() !== 'general' && (
          <div className="flex items-center gap-1.5 pt-0.5">
            {renderTagBadge(extractedTag)}
          </div>
        )}

        <div className="text-[14px] text-foreground leading-relaxed break-words [overflow-wrap:anywhere] max-w-prose selection:bg-accent/20">
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
                  className="font-medium text-accent hover:underline cursor-pointer bg-accent-subtle hover:bg-accent/15 px-1 py-0.2 rounded text-[13px] transition-colors"
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
                  className="text-foreground-subtle hover:text-foreground cursor-pointer transition-colors"
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
                  className="px-1.5 py-0.5 mx-0.5 rounded bg-surface-raised border border-border/50 font-mono text-[11.5px] text-foreground cursor-copy hover:bg-surface-hover transition-colors"
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
                  className="text-accent hover:opacity-80 underline underline-offset-4 inline-flex items-center gap-1.5 break-all text-xs bg-accent-subtle px-2 py-0.5 rounded-md hover:bg-accent/15 transition-colors"
                >
                  {isGithub ? (
                    <FolderGit2 className="w-3.5 h-3.5 shrink-0 text-accent/70" />
                  ) : isDrive ? (
                    <FileText className="w-3.5 h-3.5 shrink-0 text-accent/70" />
                  ) : (
                    <ExternalLink className="w-3.5 h-3.5 shrink-0 text-accent/70" />
                  )}
                  <span>{word.length > 34 ? `${word.slice(0, 31)}...` : word}</span>
                </a>
              );
            }

            return <React.Fragment key={i}>{word}</React.Fragment>;
          })}
        </div>

        {codeBlockContent && (
          <div className="my-2 rounded-xl bg-surface-raised border border-border/60 p-3 font-mono text-xs text-foreground relative">
            <div className="flex items-center justify-between pb-2 mb-2 border-b border-border/60 text-[11px] text-foreground-subtle">
              <span className="flex items-center gap-1.5 font-medium text-foreground-muted">
                <Terminal className="w-3.5 h-3.5 text-foreground-subtle" />
                <span>Script / Comando</span>
              </span>
              <button
                type="button"
                onClick={() => handleCopyCode(codeBlockContent!, msgId || 'block')}
                className="flex items-center gap-1 px-2 py-0.5 rounded text-foreground-muted hover:text-foreground hover:bg-surface-hover cursor-pointer transition-colors"
              >
                {copiedCodeId === (msgId || 'block') ? (
                  <>
                    <Check className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                    <span className="text-emerald-600 dark:text-emerald-400 text-[10px]">Copiado</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3 h-3" />
                    <span className="text-[10px]">Copiar</span>
                  </>
                )}
              </button>
            </div>
            <pre className="overflow-x-auto whitespace-pre-wrap leading-relaxed select-all text-foreground">
              {codeBlockContent}
            </pre>
          </div>
        )}
      </div>
    );
  };

  const charCount = inputText.length;
  const isNearLimit = charCount > 280;
  const isOverLimit = charCount > 320;

  return (
    <div className="mx-3 flex w-auto flex-col gap-3 font-sans text-foreground sm:mx-0 sm:gap-4">
      {/* 1. Cabecera editorial */}
      <header className="space-y-3 px-0.5 pt-1">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
              <h2 className="text-[17px] font-semibold leading-tight tracking-tight text-foreground sm:text-lg">
                Feed de clase
              </h2>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-border/70 bg-surface px-2 py-0.5 font-mono text-[10px] leading-none text-foreground-muted">
                <span
                  className={`h-1.5 w-1.5 rounded-full ${
                    isRealtimeConnected ? 'bg-success' : 'bg-amber-500'
                  }`}
                />
                {isRealtimeConnected ? 'En vivo' : 'Conectando'}
              </span>
            </div>
            <p className="mt-1 text-[11px] leading-snug text-foreground-subtle sm:text-xs">
              Avisos, dudas y recursos del grupo.
            </p>
          </div>

          {/* Acciones discretas */}
          <div className="flex shrink-0 items-center gap-0.5 -mr-1.5">
            <button
              type="button"
              onClick={handleManualRefresh}
              disabled={isRefreshing}
              title="Actualizar feed"
              className="p-1.5 rounded-lg text-foreground-muted hover:text-foreground hover:bg-surface-hover transition-colors cursor-pointer disabled:opacity-50"
            >
              <RotateCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-foreground' : ''}`} />
            </button>

            <button
              type="button"
              onClick={() => {
                sound.tap();
                setIsSearchOpen((prev) => !prev);
              }}
              title="Buscar"
              className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                isSearchOpen || searchQuery
                  ? 'text-foreground bg-foreground/[0.08]'
                  : 'text-foreground-muted hover:text-foreground hover:bg-surface-hover'
              }`}
            >
              <Search className="w-3.5 h-3.5" />
            </button>

            {onOpenNotifications && (
              <button
                type="button"
                onClick={() => {
                  sound.tap();
                  onOpenNotifications();
                }}
                title="Notificaciones"
                className="p-1.5 rounded-lg text-foreground-muted hover:text-foreground hover:bg-surface-hover transition-colors cursor-pointer relative"
              >
                <Bell className="w-3.5 h-3.5" />
                {pushStatus === 'granted' && (
                  <span className="absolute top-1.5 right-1.5 w-1 h-1 bg-emerald-400 rounded-full" />
                )}
              </button>
            )}

            {onOpenFeedback && (
              <button
                type="button"
                onClick={() => {
                  sound.tap();
                  onOpenFeedback();
                }}
                title="Sugerencias"
                className="p-1.5 rounded-lg text-foreground-muted hover:text-foreground hover:bg-surface-hover transition-colors cursor-pointer"
              >
                <AlertCircle className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Buscador integrado */}
        {isSearchOpen && (
          <div className="animate-in fade-in duration-150">
            <div className="relative flex items-center">
              <Search className="pointer-events-none absolute left-3 h-3.5 w-3.5 text-foreground-subtle" />
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar por @usuario, palabra o tag..."
                className="w-full rounded-[var(--radius-sm)] border border-border/70 bg-surface py-2 pl-8 pr-8 text-xs text-foreground outline-none transition-colors placeholder:text-foreground-subtle focus:border-accent/50"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 p-0.5 text-foreground-subtle hover:text-foreground cursor-pointer"
                >
                  <X className="h-3 w-3" />
                </button>
              )}
            </div>
          </div>
        )}

        {/* Filtros editoriales */}
        <div className="flex items-center gap-0.5 overflow-x-auto border-b border-border/70 scrollbar-none">
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
                aria-pressed={isActive}
                className={`relative flex min-h-[38px] shrink-0 items-center gap-1.5 whitespace-nowrap px-2.5 text-xs transition-colors cursor-pointer ${
                  isActive
                    ? 'font-medium text-foreground'
                    : 'text-foreground-muted hover:text-foreground'
                }`}
              >
                <span>{tab.label}</span>
                {count > 0 && (
                  <span
                    className={`font-mono text-[10px] ${
                      isActive ? 'text-foreground-muted' : 'text-foreground-subtle'
                    }`}
                  >
                    {count}
                  </span>
                )}
                {isActive && (
                  <span className="absolute inset-x-2 bottom-0 h-[2px] rounded-full bg-accent" />
                )}
              </button>
            );
          })}
        </div>
      </header>

      {/* Banner Web Push sutil */}
      {showPushBanner && (
        <div className="flex items-center justify-between gap-3 rounded-xl border border-border/70 bg-surface px-3.5 py-2.5 text-xs animate-in fade-in duration-200">
          <div className="flex items-center gap-2.5 min-w-0">
            <Bell className="w-3.5 h-3.5 text-amber-500 dark:text-amber-400 shrink-0" />
            <span className="truncate text-foreground-muted">
              Activa los avisos de clase en tu ordenador
            </span>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            {pushSuccess ? (
              <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-1">
                <Check className="w-3 h-3" />
                Activado
              </span>
            ) : (
              <button
                type="button"
                onClick={handleActivatePush}
                disabled={isSubscribingPush}
                className="px-2.5 py-1 rounded-lg bg-accent text-accent-foreground hover:opacity-90 text-[11px] font-medium transition-colors cursor-pointer disabled:opacity-50"
              >
                Activar
              </button>
            )}
            <button
              type="button"
              onClick={handleDismissPushBanner}
              className="p-1 text-foreground-subtle hover:text-foreground rounded-md"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        </div>
      )}

      {/* 2. Redactor */}
      {!currentUser ? (
        <div
          onClick={() => {
            sound.tap();
            onOpenAuth();
          }}
          className="flex cursor-pointer items-center justify-between gap-3 rounded-2xl border border-border/70 bg-surface px-4 py-3.5 transition-colors hover:bg-surface-raised/40 sm:px-5"
        >
          <div className="flex min-w-0 items-center gap-3 text-xs text-foreground-muted">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-surface-raised text-foreground-subtle">
              <MessageSquare className="h-3.5 w-3.5" />
            </div>
            <span className="truncate">Inicia sesión para publicar avisos o dudas</span>
          </div>
          <span className="shrink-0 rounded-[var(--radius-sm)] bg-accent-subtle px-2.5 py-1 text-[11px] font-medium text-accent">
            Entrar
          </span>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-border/70 bg-surface">
          <div className="space-y-3 px-4 py-3.5 sm:px-5 sm:py-4">
            {/* Mención activa */}
            {replyingTo && (
              <div className="flex items-center justify-between gap-2 text-xs text-foreground-muted animate-in fade-in duration-150">
                <span className="flex min-w-0 items-center gap-1.5 truncate">
                  <Reply className="h-3 w-3 shrink-0 text-accent" />
                  <span className="truncate">
                    Respondiendo a <strong className="font-mono text-foreground">@{replyingTo}</strong>
                  </span>
                </span>
                <button
                  type="button"
                  onClick={handleCancelReply}
                  className="p-0.5 text-foreground-subtle hover:text-foreground cursor-pointer"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            )}

            <div className="flex items-start gap-3">
              <div
                className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[11px] font-bold uppercase ${getAvatarColor(
                  currentUser.username
                )}`}
              >
                {currentUser.username.charAt(0)}
              </div>

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
                    ? `Escribe tu respuesta a @${replyingTo}...`
                    : 'Comparte un aviso, duda de clase o recurso...'
                }
                rows={2}
                maxLength={320}
                className="min-w-0 flex-1 resize-none bg-transparent font-sans text-[13px] leading-relaxed text-foreground outline-none placeholder:text-foreground-subtle sm:text-sm"
              />
            </div>

            {/* Herramientas y publicar */}
            <div className="flex flex-col gap-2 border-t border-border/60 pt-2.5 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-1 overflow-x-auto py-0.5 scrollbar-none">
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
                      className={`shrink-0 rounded-md px-2 py-0.5 font-mono text-[11px] transition-colors cursor-pointer ${
                        isSelected
                          ? 'bg-accent-subtle font-medium text-accent'
                          : 'text-foreground-muted hover:bg-surface-hover hover:text-foreground'
                      }`}
                    >
                      #{t.label}
                    </button>
                  );
                })}
              </div>

              <div className="flex shrink-0 items-center gap-1.5 self-end sm:ml-auto sm:self-auto">
                <button
                  type="button"
                  onClick={handleInsertCodeSnippet}
                  title="Comando `...`"
                  className="rounded-lg p-1.5 text-foreground-muted transition-colors hover:bg-surface-hover hover:text-foreground cursor-pointer"
                >
                  <Terminal className="h-4 w-4" />
                </button>

                <button
                  type="button"
                  onClick={handleInsertMention}
                  title="Mencionar @"
                  className="rounded-lg p-1.5 text-foreground-muted transition-colors hover:bg-surface-hover hover:text-foreground cursor-pointer"
                >
                  <AtSign className="h-4 w-4" />
                </button>

                {isStaff && (
                  <button
                    type="button"
                    onClick={() => {
                      sound.tap();
                      setIsPinned((p) => !p);
                    }}
                    title={isPinned ? 'Desmarcar aviso' : 'Fijar aviso'}
                    className={`rounded-lg p-1.5 transition-colors cursor-pointer ${
                      isPinned
                        ? 'bg-amber-400/10 text-amber-600 dark:text-amber-400'
                        : 'text-foreground-muted hover:bg-surface-hover hover:text-foreground'
                    }`}
                  >
                    <Pin className="h-4 w-4" />
                  </button>
                )}

                <span
                  className={`px-1 font-mono text-[10px] ${
                    isOverLimit
                      ? 'font-bold text-danger'
                      : isNearLimit
                      ? 'text-amber-600 dark:text-amber-400'
                      : 'text-foreground-subtle'
                  }`}
                >
                  {320 - charCount}
                </span>

                <button
                  type="button"
                  onClick={() => handlePublish()}
                  disabled={!inputText.trim() || isPosting || isOverLimit}
                  className="flex items-center gap-1.5 rounded-[var(--radius-sm)] bg-accent px-3 py-1.5 text-xs font-medium text-accent-foreground transition-all hover:opacity-90 active:scale-95 disabled:cursor-not-allowed disabled:opacity-30 cursor-pointer"
                >
                  {isPosting ? (
                    <span className="h-3 w-3 animate-spin rounded-full border-2 border-current border-t-transparent" />
                  ) : (
                    <Send className="h-3 w-3" />
                  )}
                  <span>Publicar</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 3. Cronología */}
      <section className="overflow-hidden rounded-2xl border border-border/70 bg-surface">
        <div className="flex items-center justify-between border-b border-border/60 px-4 py-2.5 sm:px-5">
          <div className="flex items-center gap-2">
            <h3 className="text-[12px] font-semibold tracking-tight text-foreground">
              Publicaciones
            </h3>
            <span className="rounded-md bg-surface-raised px-1.5 py-0.5 font-mono text-[10px] text-foreground-subtle">
              {filteredMessages.length}
            </span>
          </div>
          <span className="hidden font-mono text-[10px] text-foreground-subtle sm:inline">
            Vista · {FEED_TABS.find((tab) => tab.id === activeTab)?.label}
          </span>
        </div>

        <div className="divide-y divide-border/60">
        {filteredMessages.length === 0 ? (
          <div className="p-12 text-center space-y-2">
            <p className="text-xs text-foreground-subtle">
              {searchQuery
                ? `Sin resultados para «${searchQuery}».`
                : 'No hay mensajes en este canal todavía.'}
            </p>
            {searchQuery && (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('');
                  setActiveTab('all');
                }}
                className="text-xs text-accent underline hover:opacity-80 cursor-pointer"
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
            const authorPet = resolveUserPet(msg.user_id, msg.username, msg.mascota_equipada);
            const isAdminMsg =
              msg.username === 'admin' ||
              msg.username.toLowerCase().includes('delegado') ||
              msg.user_id === 'ed922205-b961-487c-a13b-93b5ab7a5faf';
            const isVipMsg =
              msg.user_id === 'ed922205-b961-487c-a13b-93b5ab7a5faf' ||
              (currentUser?.id === msg.user_id &&
                (currentUser?.banner_estilo ||
                  currentUser?.items_comprados?.includes('banner_vip_13m')));

            return (
              <article
                key={msg.id}
                className={`group px-4 py-4 transition-colors sm:px-5 sm:py-5 ${
                  msg.pinned ? 'bg-amber-500/[0.04] dark:bg-amber-400/[0.03]' : 'hover:bg-surface-hover/40'
                }`}
              >
                {/* Indicador de aviso fijado sutil */}
                {msg.pinned && (
                  <div className="flex items-center gap-1.5 text-[10.5px] font-mono text-amber-700 dark:text-amber-400 font-medium mb-2.5">
                    <Pin className="w-3 h-3 fill-amber-600/80 text-amber-600 dark:fill-amber-400/80 dark:text-amber-400" />
                    <span>Aviso fijado</span>
                  </div>
                )}

                <div className="flex items-start gap-3 min-w-0">
                  {/* Avatar minimalista */}
                  <button
                    type="button"
                    onClick={() => onInspectUser?.({ id: msg.user_id, username: msg.username })}
                    title={`Ver perfil de @${msg.username}`}
                    className={`w-9 h-9 rounded-full ${getAvatarColor(
                      msg.username
                    )} flex items-center justify-center font-mono font-bold text-xs uppercase shrink-0 hover:opacity-85 transition-opacity cursor-pointer`}
                  >
                    {msg.username.charAt(0)}
                  </button>

                  <div className="flex-1 min-w-0 space-y-2">
                    {/* Header del post: línea 1 autor + hora, línea 2 insignias */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0 space-y-0.5">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <button
                            type="button"
                            onClick={() => onInspectUser?.({ id: msg.user_id, username: msg.username })}
                            title={`Ver perfil de @${msg.username}`}
                            className="font-medium text-[13px] text-foreground hover:underline cursor-pointer truncate"
                          >
                            @{msg.username}
                          </button>

                          <span className="text-foreground-subtle/60 text-[10px] shrink-0">·</span>
                          <span className="text-[11px] text-foreground-subtle font-mono shrink-0">
                            {formatRelativeTime(msg.created_at)}
                          </span>
                        </div>

                        {(authorPet || isAdminMsg || isVipMsg) && (
                          <div className="flex items-center gap-1.5 flex-wrap">
                            {authorPet && (
                              <span
                                title={`Mascota Oficial: ${authorPet.name} · ${authorPet.perkName} (${authorPet.perkDescription})`}
                                className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full border text-[10px] font-mono transition-all cursor-help ${
                                  authorPet.id === 'androide_18'
                                    ? 'bg-gradient-to-r from-yellow-500/20 via-amber-400/25 to-yellow-300/20 border-yellow-400/80 text-yellow-700 dark:text-yellow-300 ring-2 ring-yellow-400/50 shadow-md shadow-yellow-500/30'
                                    : authorPet.id === 'tung_tung'
                                    ? 'bg-amber-600/15 border-amber-600/50 text-amber-700 dark:text-amber-300 ring-1 ring-amber-600/30'
                                    : authorPet.id === 'toy_chica'
                                    ? 'bg-amber-400/10 border-amber-400/50 text-amber-700 dark:text-amber-300 ring-1 ring-amber-400/30 shadow-xs'
                                    : 'bg-surface-raised border-border/60 text-foreground-muted'
                                }`}
                              >
                                <img
                                  src={authorPet.image}
                                  alt={authorPet.name}
                                  className="w-3.5 h-3.5 rounded-full object-cover shrink-0"
                                />
                                <span className="hidden xs:inline font-medium">{authorPet.name.split(' ')[0]}</span>
                              </span>
                            )}

                            {isAdminMsg && (
                              <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-amber-400/10 text-amber-700 dark:text-amber-400">
                                admin
                              </span>
                            )}

                            {isVipMsg && (
                              <span
                                title="VIP 13M"
                                className="text-[10px] font-mono px-1 py-0.2 rounded text-amber-700 dark:text-amber-300 flex items-center gap-0.5"
                              >
                                <Crown className="w-2.5 h-2.5" />
                                <span>13M</span>
                              </span>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Acciones superiores ghost */}
                      <div className="flex items-center gap-0.5 opacity-90 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity shrink-0">
                        <button
                          type="button"
                          onClick={() => handleStartReply(msg.username)}
                          title="Responder"
                          className="p-1 rounded text-foreground-muted hover:text-foreground hover:bg-surface-hover transition-colors cursor-pointer"
                        >
                          <Reply className="w-3 h-3" />
                        </button>

                        <button
                          type="button"
                          onClick={() => handleShare(msg)}
                          title="Copiar texto"
                          className="p-1 rounded text-foreground-muted hover:text-foreground hover:bg-surface-hover transition-colors cursor-pointer"
                        >
                          {copiedId === msg.id ? (
                            <Check className="w-3 h-3 text-emerald-400" />
                          ) : (
                            <Share2 className="w-3 h-3" />
                          )}
                        </button>

                        {canDelete && onDeleteMessage && (
                          <button
                            type="button"
                            onClick={() => handleDelete(msg.id)}
                            disabled={deletingId === msg.id}
                            title="Eliminar"
                            className="p-1 rounded text-foreground-muted hover:text-danger hover:bg-rose-500/10 transition-colors cursor-pointer"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Texto formateado */}
                    <div className="min-w-0">
                      {renderFormattedText(msg.text, msg.tag, msg.id)}
                    </div>

                    {/* Acciones del post */}
                    <div className="flex items-center gap-3 pt-1.5 text-xs text-foreground-muted sm:gap-4">
                      {/* Comentarios */}
                      <button
                        type="button"
                        onClick={() => toggleComments(msg.id)}
                        className={`-ml-1.5 inline-flex select-none items-center gap-1.5 rounded-lg px-1.5 py-1 transition-colors cursor-pointer active:scale-95 ${
                          isThreadOpen
                            ? 'font-medium text-accent'
                            : 'text-foreground-muted hover:bg-surface-hover hover:text-foreground'
                        }`}
                        title="Respuestas"
                      >
                        <MessageSquare className="h-3.5 w-3.5" />
                        {commentsCount > 0 && (
                          <span className="font-mono text-[11px]">{commentsCount}</span>
                        )}
                      </button>

                      {/* Me Gusta */}
                      <button
                        type="button"
                        onClick={() => onToggleLike && onToggleLike(msg.id)}
                        className={`inline-flex select-none items-center gap-1.5 rounded-lg px-1.5 py-1 transition-colors cursor-pointer active:scale-95 ${
                          isLiked
                            ? 'font-medium text-rose-600 dark:text-rose-400'
                            : 'text-foreground-muted hover:bg-rose-500/10 hover:text-rose-600 dark:hover:text-rose-400'
                        }`}
                        title={isLiked ? 'Quitar me gusta' : 'Me gusta'}
                      >
                        <Heart
                          className={`h-3.5 w-3.5 transition-transform ${
                            isLiked ? 'scale-105 fill-rose-500 stroke-rose-500' : ''
                          }`}
                        />
                        {likesCount > 0 && (
                          <span className="font-mono text-[11px]">{likesCount}</span>
                        )}
                      </button>
                    </div>

                    {/* 4. Hilo de comentarios minimalista */}
                    {isThreadOpen && (
                      <div className="mt-3 pt-3 border-t border-border/60 space-y-2.5 animate-in fade-in duration-150">
                        {loadingComments[msg.id] ? (
                          <div className="py-2 text-xs text-foreground-subtle flex items-center gap-2">
                            <span className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin" />
                            <span>Cargando respuestas...</span>
                          </div>
                        ) : (commentsData[msg.id] || []).length === 0 ? (
                          <p className="text-xs text-foreground-subtle py-1">
                            Aún no hay respuestas. Sé el primero en responder.
                          </p>
                        ) : (
                          <div className="space-y-3">
                            {(commentsData[msg.id] || []).map((comment) => {
                              const isCommentAuthor =
                                currentUser?.id === comment.user_id ||
                                currentUser?.username === comment.username;
                              const canDeleteComment = isCommentAuthor || isStaff;

                              return (
                                <div key={comment.id} className="group/c flex items-start gap-2.5 text-xs">
                                  <div
                                    className={`w-6 h-6 rounded-full ${getAvatarColor(
                                      comment.username
                                    )} flex items-center justify-center text-[9px] font-bold uppercase shrink-0 mt-0.5`}
                                  >
                                    {comment.username.charAt(0)}
                                  </div>

                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center justify-between gap-2">
                                      <div className="flex items-center gap-1.5">
                                        <button
                                          type="button"
                                          onClick={() =>
                                            onInspectUser?.({
                                              id: comment.user_id,
                                              username: comment.username,
                                            })
                                          }
                                          className="font-medium text-foreground hover:underline"
                                        >
                                          @{comment.username}
                                        </button>
                                        {(() => {
                                          const cPet = resolveUserPet(comment.user_id, comment.username, comment.mascota_equipada);
                                          if (!cPet) return null;
                                          return (
                                            <img
                                              src={cPet.image}
                                              alt={cPet.name}
                                              title={`Mascota: ${cPet.name}`}
                                              className="w-3.5 h-3.5 rounded-full object-cover shrink-0"
                                            />
                                          );
                                        })()}
                                        <span className="text-foreground-subtle/60 text-[10px]">·</span>
                                        <span className="text-[10px] text-foreground-subtle font-mono">
                                          {formatRelativeTime(comment.created_at)}
                                        </span>
                                      </div>

                                      {canDeleteComment && (
                                        <button
                                          type="button"
                                          onClick={() => handleDeleteComment(comment.id, msg.id)}
                                          className="text-foreground-subtle hover:text-danger p-0.5 opacity-80 sm:opacity-0 sm:group-hover/c:opacity-100 transition-opacity"
                                        >
                                          <Trash2 className="w-2.5 h-2.5" />
                                        </button>
                                      )}
                                    </div>
                                    <p className="text-foreground text-xs mt-0.5 leading-relaxed">
                                      {comment.text}
                                    </p>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}

                        {/* Responder */}
                        <div className="flex items-center gap-2 pt-1">
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
                            className="min-w-0 flex-1 rounded-[var(--radius-sm)] border border-border/70 bg-surface-raised px-3 py-1.5 text-xs text-foreground outline-none transition-colors placeholder:text-foreground-subtle focus:border-accent/50"
                          />
                          <button
                            type="button"
                            onClick={() => handleAddComment(msg.id)}
                            disabled={
                              !(commentInputs[msg.id] || '').trim() ||
                              submittingComment[msg.id]
                            }
                            className="rounded-[var(--radius-sm)] bg-accent p-1.5 text-accent-foreground transition-all hover:opacity-90 active:scale-95 disabled:cursor-not-allowed disabled:opacity-30 cursor-pointer"
                          >
                            <Send className="h-3 w-3" />
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
      </section>
    </div>
  );
};
