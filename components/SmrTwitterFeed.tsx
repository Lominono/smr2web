'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  Heart,
  Repeat2,
  MessageSquare,
  Share2,
  Coins,
  Send,
  Sparkles,
  Trophy,
  ShieldCheck,
  CheckCircle2,
  Smile,
  Hash,
  X,
  Flame,
  Clock,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  Pin,
  TrendingUp,
  AlertCircle,
  HelpCircle,
  PenSquare,
} from 'lucide-react';
import { ChatMessage, UserProfile } from '@/lib/types';
import { getUserRank } from '@/lib/economy';
import { sound } from '@/lib/audio';

export interface TweetComment {
  id: string;
  postId: string;
  userId: string;
  username: string;
  text: string;
  createdAt: string;
}

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

const POPULAR_EMOJIS = ['⚡', '🚀', '💻', '📚', '🔥', '😂', '🎯', '👑', '☕', '👍', '🧠', '🎉'];

const FEED_TAGS = [
  { id: 'all', label: 'Para ti', icon: Sparkles },
  { id: 'avisos', label: 'Avisos', icon: AlertCircle },
  { id: 'dudas', label: 'Dudas', icon: HelpCircle },
  { id: 'recreo', label: 'Recreo', icon: Trophy },
] as const;

export const SmrTwitterFeed: React.FC<SmrTwitterFeedProps> = ({
  messages,
  currentUser,
  onOpenAuth,
  onSendMessage,
  onTipUser,
  onOpenSchedule,
  onOpenTasks,
  onOpenRussianRoulette,
  composerRef: externalComposerRef,
}) => {
  const [activeFeedTab, setActiveFeedTab] = useState<'all' | 'avisos' | 'dudas' | 'recreo'>('all');
  const [inputText, setInputText] = useState('');
  const [selectedTag, setSelectedTag] = useState<string>('General');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [isPosting, setIsPosting] = useState(false);
  const [tipSuccessId, setTipSuccessId] = useState<string | null>(null);

  // Likes & Reposts in LocalStorage
  const [likedIds, setLikedIds] = useState<Set<string>>(new Set());
  const [likeCounts, setLikeCounts] = useState<Record<string, number>>({});
  const [repostedIds, setRepostedIds] = useState<Set<string>>(new Set());
  const [repostCounts, setRepostCounts] = useState<Record<string, number>>({});

  // Comments
  const [expandedCommentsPostId, setExpandedCommentsPostId] = useState<string | null>(null);
  const [postComments, setPostComments] = useState<Record<string, TweetComment[]>>({});
  const [commentInput, setCommentInput] = useState('');

  // Toast notification for copy/share
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const localTextareaRef = useRef<HTMLTextAreaElement | null>(null);
  const textareaRef = externalComposerRef || localTextareaRef;

  // Load saved likes, reposts and comments on mount
  useEffect(() => {
    try {
      const savedLikes = localStorage.getItem('smr_liked_posts');
      if (savedLikes) {
        setLikedIds(new Set(JSON.parse(savedLikes)));
      }
      const savedLikeCounts = localStorage.getItem('smr_like_counts');
      if (savedLikeCounts) {
        setLikeCounts(JSON.parse(savedLikeCounts));
      }
      const savedReposts = localStorage.getItem('smr_reposted_posts');
      if (savedReposts) {
        setRepostedIds(new Set(JSON.parse(savedReposts)));
      }
      const savedRepostCounts = localStorage.getItem('smr_repost_counts');
      if (savedRepostCounts) {
        setRepostCounts(JSON.parse(savedRepostCounts));
      }
      const savedComments = localStorage.getItem('smr_post_comments');
      if (savedComments) {
        setPostComments(JSON.parse(savedComments));
      }
    } catch {}
  }, []);

  // Helper to show transient toast
  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 2500);
  };

  // Avatar color map
  const avatarColorMap: Record<string, string> = {
    emerald: 'bg-emerald-500 text-white',
    blue: 'bg-blue-600 text-white',
    purple: 'bg-purple-600 text-white',
    amber: 'bg-amber-500 text-white',
    rose: 'bg-rose-600 text-white',
    cyan: 'bg-cyan-500 text-white',
  };

  const getAvatarClass = (username: string) => {
    if (currentUser && currentUser.username === username && currentUser.avatar_color) {
      return avatarColorMap[currentUser.avatar_color] || 'bg-amber-500 text-black';
    }
    const colors = [
      'bg-blue-600 text-white',
      'bg-emerald-600 text-white',
      'bg-purple-600 text-white',
      'bg-amber-500 text-black',
      'bg-rose-600 text-white',
      'bg-cyan-600 text-white',
    ];
    let hash = 0;
    for (let i = 0; i < username.length; i++) {
      hash = username.charCodeAt(i) + ((hash << 5) - hash);
    }
    return colors[Math.abs(hash) % colors.length];
  };

  // Submit tweet
  const handlePublish = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!inputText.trim() || isPosting) return;

    if (!currentUser) {
      onOpenAuth();
      return;
    }

    if (inputText.length > 280) {
      showToast('El mensaje no puede superar 280 caracteres');
      return;
    }

    setIsPosting(true);

    try {
      let finalMessage = inputText.trim();
      if (selectedTag && selectedTag !== 'General') {
        finalMessage = `[#${selectedTag}] ${finalMessage}`;
      }

      await onSendMessage(finalMessage);
      sound.tap();
      setInputText('');
      setShowEmojiPicker(false);
      showToast('¡Publicado en el Feed de 2º SMR!');
    } catch {
      showToast('Error al publicar mensaje');
    } finally {
      setIsPosting(false);
    }
  };

  // Toggle Like
  const handleToggleLike = (msgId: string) => {
    if (!currentUser) {
      onOpenAuth();
      return;
    }

    const nextLiked = new Set(likedIds);
    const currentCount = likeCounts[msgId] || 0;
    let nextCount = currentCount;

    if (nextLiked.has(msgId)) {
      nextLiked.delete(msgId);
      nextCount = Math.max(0, currentCount - 1);
    } else {
      nextLiked.add(msgId);
      nextCount = currentCount + 1;
      sound.coinWin();
    }

    setLikedIds(nextLiked);
    const updatedCounts = { ...likeCounts, [msgId]: nextCount };
    setLikeCounts(updatedCounts);

    try {
      localStorage.setItem('smr_liked_posts', JSON.stringify(Array.from(nextLiked)));
      localStorage.setItem('smr_like_counts', JSON.stringify(updatedCounts));
    } catch {}
  };

  // Toggle Repost
  const handleToggleRepost = (msgId: string) => {
    if (!currentUser) {
      onOpenAuth();
      return;
    }

    const nextReposted = new Set(repostedIds);
    const currentCount = repostCounts[msgId] || 0;
    let nextCount = currentCount;

    if (nextReposted.has(msgId)) {
      nextReposted.delete(msgId);
      nextCount = Math.max(0, currentCount - 1);
    } else {
      nextReposted.add(msgId);
      nextCount = currentCount + 1;
      sound.tap();
      showToast('Has reposteado en tu perfil');
    }

    setRepostedIds(nextReposted);
    const updatedCounts = { ...repostCounts, [msgId]: nextCount };
    setRepostCounts(updatedCounts);

    try {
      localStorage.setItem('smr_reposted_posts', JSON.stringify(Array.from(nextReposted)));
      localStorage.setItem('smr_repost_counts', JSON.stringify(updatedCounts));
    } catch {}
  };

  // Handle Comments
  const handleAddComment = (msgId: string) => {
    if (!commentInput.trim() || !currentUser) {
      if (!currentUser) onOpenAuth();
      return;
    }

    const newComment: TweetComment = {
      id: `comm_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      postId: msgId,
      userId: currentUser.id,
      username: currentUser.username,
      text: commentInput.trim(),
      createdAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    const currentList = postComments[msgId] || [];
    const updatedList = [...currentList, newComment];
    const updatedAll = { ...postComments, [msgId]: updatedList };

    setPostComments(updatedAll);
    setCommentInput('');
    sound.tap();
    showToast('Respuesta añadida');

    try {
      localStorage.setItem('smr_post_comments', JSON.stringify(updatedAll));
    } catch {}
  };

  // Handle Tip
  const handleTip = (msgId: string, authorUsername: string) => {
    if (!currentUser) {
      onOpenAuth();
      return;
    }
    if (currentUser.username === authorUsername) {
      showToast('No puedes enviarte propina a ti mismo');
      return;
    }
    if (currentUser.coins < 50) {
      sound.broke();
      showToast('Saldo insuficiente (mínimo 50 fichas)');
      return;
    }

    onTipUser(authorUsername, 50);
    setTipSuccessId(msgId);
    setTimeout(() => setTipSuccessId(null), 2000);
    showToast(`Enviadas 50 fichas a @${authorUsername}`);
  };

  // Handle Share / Copy
  const handleShare = (msg: ChatMessage) => {
    const textToCopy = `"${msg.text}" - @${msg.username} en SMR2`;
    if (navigator.clipboard) {
      navigator.clipboard.writeText(textToCopy);
      showToast('¡Texto copiado al portapapeles!');
      sound.tap();
    }
  };

  // Filter messages
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
        lower.includes('entrega') ||
        lower.includes('profesor') ||
        lower.includes('horario')
      );
    }

    if (activeFeedTab === 'dudas') {
      return (
        lower.includes('[#dudasmr]') ||
        lower.includes('#duda') ||
        lower.includes('?') ||
        lower.includes('duda') ||
        lower.includes('ayuda') ||
        lower.includes('alguien') ||
        lower.includes('cómo') ||
        lower.includes('como')
      );
    }

    if (activeFeedTab === 'recreo') {
      return (
        msg.is_system_win ||
        lower.includes('[#recreo]') ||
        lower.includes('ruleta') ||
        lower.includes('crash') ||
        lower.includes('minas') ||
        lower.includes('fichas') ||
        lower.includes('ganó')
      );
    }

    return true;
  });

  // Calculate circular progress for 280 chars
  const charCount = inputText.length;
  const charLimit = 280;
  const progressPercent = Math.min(100, (charCount / charLimit) * 100);
  const strokeDashoffset = 100 - progressPercent;

  // Render text with clickable hashtags, mentions, and URLs
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
          <div className="inline-block">
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-mono font-semibold bg-amber-400/10 text-amber-300 border border-amber-400/20">
              <Hash className="w-2.5 h-2.5" />
              {extractedTag}
            </span>
          </div>
        )}
        <p className="text-[13px] sm:text-[14px] leading-relaxed text-zinc-100 break-words font-normal">
          {words.map((word, i) => {
            if (word.startsWith('#') && word.length > 1) {
              return (
                <span key={i} className="text-sky-400 hover:underline cursor-pointer font-medium">
                  {word}
                </span>
              );
            }
            if (word.startsWith('@') && word.length > 1) {
              return (
                <span key={i} className="text-amber-400 hover:underline cursor-pointer font-medium">
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
                  className="text-blue-400 underline underline-offset-2 hover:text-blue-300 inline-flex items-center gap-0.5"
                >
                  {word.length > 30 ? `${word.slice(0, 27)}...` : word}
                  <ExternalLink className="w-2.5 h-2.5 inline" />
                </a>
              );
            }
            return <React.Fragment key={i}>{word}</React.Fragment>;
          })}
        </p>
      </div>
    );
  };

  return (
    <div className="w-full flex flex-col border-x border-white/[0.08] min-h-[calc(100vh-4rem)] bg-black/40">
      {/* Toast feedback */}
      {toastMessage && (
        <div className="fixed top-16 left-1/2 -translate-x-1/2 z-50 bg-white text-black text-xs font-mono font-semibold px-4 py-2 rounded-full shadow-2xl flex items-center gap-2 animate-in fade-in slide-in-from-top-2 duration-150">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Sticky Top Header Tabs (Twitter/X style) */}
      <div className="sticky top-14 z-30 bg-[#070709]/95 backdrop-blur-md border-b border-white/[0.08]">
        <div className="flex items-center justify-between px-3 pt-2">
          <h2 className="text-base font-bold text-white tracking-tight flex items-center gap-2 font-mono">
            <span>Feed 2º SMR</span>
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          </h2>

          <div className="flex items-center gap-2 text-xs font-mono text-zinc-400">
            <span className="hidden sm:inline">IES Informática</span>
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-white/[0.06] text-zinc-300 border border-white/[0.08]">
              {messages.length} posts
            </span>
          </div>
        </div>

        {/* Tab row */}
        <div className="grid grid-cols-4 border-t border-white/[0.06] mt-2">
          {FEED_TAGS.map((tab) => {
            const isActive = activeFeedTab === tab.id;
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => {
                  setActiveFeedTab(tab.id);
                  sound.tap();
                }}
                className={`flex items-center justify-center gap-1.5 py-3 text-xs font-mono font-medium relative transition-colors cursor-pointer select-none ${
                  isActive ? 'text-white font-bold' : 'text-zinc-500 hover:text-zinc-300 hover:bg-white/[0.02]'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-amber-400' : 'text-zinc-500'}`} />
                <span className="truncate">{tab.label}</span>
                {isActive && (
                  <span className="absolute bottom-0 left-4 right-4 h-0.5 bg-amber-400 rounded-full" />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Tweet Composer Box (Top of Timeline) */}
      <div className="p-3.5 sm:p-4 border-b border-white/[0.08] bg-[#0c0e12]/60">
        <div className="flex gap-3">
          {/* User Avatar */}
          <div
            className={`w-9 h-9 sm:w-10 sm:h-10 rounded-full ${
              currentUser ? getAvatarClass(currentUser.username) : 'bg-white/10 text-white'
            } border border-white/10 flex items-center justify-center font-mono font-bold text-sm shrink-0 uppercase shadow-sm`}
          >
            {currentUser ? currentUser.username.charAt(0) : '?'}
          </div>

          {/* Composer Body */}
          <div className="flex-1 flex flex-col space-y-2.5">
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
                  ? `¿Qué está pasando en clase, @${currentUser.username}?`
                  : 'Inicia sesión para publicar en el feed...'
              }
              rows={3}
              maxLength={300}
              className="w-full bg-transparent text-sm sm:text-base text-zinc-100 placeholder-zinc-500 resize-none outline-none font-normal leading-relaxed"
            />

            {/* Tag Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none pb-1">
              {['General', 'AvisoAula', 'Examen', 'DudaSMR', 'Recreo'].map((tag) => {
                const isSelected = selectedTag === tag;
                return (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => {
                      setSelectedTag(tag);
                      sound.tap();
                    }}
                    className={`px-2.5 py-1 rounded-full text-[11px] font-mono transition-all cursor-pointer whitespace-nowrap shrink-0 border ${
                      isSelected
                        ? 'bg-amber-400 text-black font-bold border-amber-400 shadow-sm'
                        : 'bg-white/[0.03] text-zinc-400 border-white/[0.06] hover:text-white hover:bg-white/[0.08]'
                    }`}
                  >
                    #{tag}
                  </button>
                );
              })}
            </div>

            {/* Emoji Quick Picker Dropdown */}
            {showEmojiPicker && (
              <div className="flex items-center gap-1 p-2 rounded-xl bg-black/80 border border-white/10 overflow-x-auto scrollbar-none animate-in fade-in duration-150">
                {POPULAR_EMOJIS.map((emoji) => (
                  <button
                    key={emoji}
                    type="button"
                    onClick={() => {
                      setInputText((prev) => prev + emoji);
                      sound.tap();
                    }}
                    className="w-8 h-8 rounded-lg hover:bg-white/10 flex items-center justify-center text-base cursor-pointer transition-transform hover:scale-110 active:scale-95"
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            )}

            {/* Toolbar & Action */}
            <div className="flex items-center justify-between pt-2 border-t border-white/[0.06]">
              <div className="flex items-center gap-1 text-zinc-400">
                {/* Emoji toggle */}
                <button
                  type="button"
                  onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                  title="Añadir emoji"
                  className={`p-2 rounded-full hover:bg-white/10 transition-colors cursor-pointer ${
                    showEmojiPicker ? 'text-amber-400 bg-white/10' : ''
                  }`}
                >
                  <Smile className="w-4 h-4" />
                </button>

                {/* Tag shortcut */}
                <button
                  type="button"
                  onClick={() => {
                    setInputText((prev) => prev + ' #');
                    textareaRef.current?.focus();
                  }}
                  title="Insertar hashtag"
                  className="p-2 rounded-full hover:bg-white/10 transition-colors cursor-pointer"
                >
                  <Hash className="w-4 h-4" />
                </button>

                <span className="text-[11px] font-mono text-zinc-500 hidden sm:inline ml-2">
                  Ctrl + Enter para publicar
                </span>
              </div>

              {/* Right: Character limit circle + Publish button */}
              <div className="flex items-center gap-3">
                {/* Circular character ring */}
                {charCount > 0 && (
                  <div className="flex items-center gap-1 font-mono text-[11px]">
                    <div className="relative w-5 h-5 flex items-center justify-center">
                      <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
                        <circle
                          cx="18"
                          cy="18"
                          r="15"
                          fill="none"
                          className="stroke-white/10"
                          strokeWidth="3"
                        />
                        <circle
                          cx="18"
                          cy="18"
                          r="15"
                          fill="none"
                          className={`${
                            charCount > 270
                              ? 'stroke-rose-500'
                              : charCount > 230
                              ? 'stroke-amber-400'
                              : 'stroke-emerald-400'
                          } transition-all duration-150`}
                          strokeWidth="3"
                          strokeDasharray="100"
                          strokeDashoffset={strokeDashoffset}
                          strokeLinecap="round"
                        />
                      </svg>
                    </div>
                    <span
                      className={`${
                        charCount > 280
                          ? 'text-rose-400 font-bold'
                          : charCount > 230
                          ? 'text-amber-400'
                          : 'text-zinc-500'
                      }`}
                    >
                      {charLimit - charCount}
                    </span>
                  </div>
                )}

                <button
                  type="button"
                  onClick={() => handlePublish()}
                  disabled={!inputText.trim() || isPosting || charCount > 280}
                  className={`px-4 py-1.5 rounded-full text-xs font-mono font-bold transition-all cursor-pointer flex items-center gap-1.5 shadow-sm ${
                    inputText.trim() && charCount <= 280 && !isPosting
                      ? 'bg-amber-400 text-black hover:bg-amber-300 hover:scale-105 active:scale-95'
                      : 'bg-white/10 text-zinc-500 cursor-not-allowed'
                  }`}
                >
                  <Send className="w-3 h-3" />
                  <span>{isPosting ? 'Publicando...' : 'Publicar'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Feed Stream */}
      <div className="divide-y divide-white/[0.06]">
        {filteredMessages.length === 0 ? (
          <div className="p-12 text-center flex flex-col items-center justify-center space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-white/[0.04] border border-white/10 flex items-center justify-center text-zinc-400">
              <Sparkles className="w-6 h-6 text-amber-400" />
            </div>
            <div className="space-y-1">
              <p className="text-sm font-semibold text-zinc-200 font-mono">No hay publicaciones aquí</p>
              <p className="text-xs text-zinc-500 max-w-sm">
                Sé el primero en compartir un aviso de clase, una duda sobre sistemas o celebrar una victoria.
              </p>
            </div>
          </div>
        ) : (
          filteredMessages.map((msg) => {
            const isMe = currentUser && msg.user_id === currentUser.id;
            const isLiked = likedIds.has(msg.id);
            const totalLikes = (likeCounts[msg.id] || 0) + (isLiked ? 1 : 0);
            const isReposted = repostedIds.has(msg.id);
            const totalReposts = (repostCounts[msg.id] || 0) + (isReposted ? 1 : 0);
            const commentsList = postComments[msg.id] || [];
            const isCommentsExpanded = expandedCommentsPostId === msg.id;

            // System Win Card
            if (msg.is_system_win) {
              return (
                <article
                  key={msg.id}
                  className="p-3.5 sm:p-4 hover:bg-amber-500/[0.03] transition-colors"
                >
                  <div className="p-3 sm:p-3.5 rounded-2xl bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent border border-amber-500/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-xl bg-amber-400/20 border border-amber-400/30 flex items-center justify-center shrink-0 text-amber-300">
                        <Trophy className="w-4 h-4" />
                      </div>
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                          <span className="text-[11px] font-mono font-bold text-amber-300 tracking-wide uppercase">
                            Victoria en Recreo
                          </span>
                          <span className="text-[10px] text-zinc-500 font-mono">· {msg.created_at}</span>
                        </div>
                        <p className="text-xs sm:text-sm text-zinc-200 font-normal leading-relaxed">
                          {msg.text}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                      {msg.multiplier && (
                        <span className="px-2 py-0.5 rounded-lg bg-black/40 border border-amber-400/30 text-amber-300 font-mono font-bold text-xs">
                          x{Number(msg.multiplier).toFixed(2)}
                        </span>
                      )}
                      {msg.win_amount && (
                        <span className="px-2 py-0.5 rounded-lg bg-amber-400 text-black font-mono font-bold text-xs shadow-sm">
                          +{Number(msg.win_amount).toLocaleString()} fichas
                        </span>
                      )}
                    </div>
                  </div>
                </article>
              );
            }

            // Normal Tweet Card
            return (
              <article
                key={msg.id}
                className="p-3.5 sm:p-4 hover:bg-white/[0.02] transition-colors flex gap-3 group"
              >
                {/* Author Avatar */}
                <div
                  className={`w-9 h-9 sm:w-10 sm:h-10 rounded-full ${getAvatarClass(
                    msg.username
                  )} border border-white/10 flex items-center justify-center font-mono font-bold text-xs sm:text-sm shrink-0 uppercase select-none shadow-sm`}
                >
                  {msg.username.charAt(0)}
                </div>

                {/* Tweet Main Content */}
                <div className="flex-1 min-w-0 space-y-1.5">
                  {/* Header: Name, Handle, Badge, Time */}
                  <div className="flex items-center justify-between gap-1">
                    <div className="flex items-center gap-1.5 flex-wrap min-w-0">
                      <span className="font-semibold text-xs sm:text-sm text-white font-mono hover:underline cursor-pointer truncate">
                        @{msg.username}
                      </span>

                      {/* Delegado / Admin Badge */}
                      {(msg.username === 'admin' || msg.username.toLowerCase().includes('delegado')) && (
                        <span
                          title="Delegado de clase"
                          className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded bg-amber-400/20 text-amber-300 text-[10px] font-mono border border-amber-400/30"
                        >
                          <ShieldCheck className="w-2.5 h-2.5" />
                          <span>Delegado</span>
                        </span>
                      )}

                      <span className="text-[11px] text-zinc-500 font-mono">· {msg.created_at}</span>
                    </div>

                    {/* Quick Tip Pill Button */}
                    {!isMe && currentUser && (
                      <button
                        type="button"
                        onClick={() => handleTip(msg.id, msg.username)}
                        title={`Enviar 50 fichas de propina a @${msg.username}`}
                        className={`text-[10px] font-mono px-2 py-0.5 rounded-full border transition-all cursor-pointer flex items-center gap-1 ${
                          tipSuccessId === msg.id
                            ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                            : 'bg-amber-400/10 text-amber-300 border-amber-400/20 hover:bg-amber-400/20 hover:scale-105'
                        }`}
                      >
                        <Coins className="w-2.5 h-2.5 text-amber-400" />
                        <span>{tipSuccessId === msg.id ? '¡Enviado!' : 'Dar 50'}</span>
                      </button>
                    )}
                  </div>

                  {/* Body Text */}
                  {renderFormattedText(msg.text)}

                  {/* Tweet Actions Row (Twitter Style) */}
                  <div className="flex items-center justify-between pt-2 text-zinc-500 w-full max-w-md">
                    {/* Comments Button */}
                    <button
                      type="button"
                      onClick={() => {
                        setExpandedCommentsPostId(isCommentsExpanded ? null : msg.id);
                        sound.tap();
                      }}
                      className={`flex items-center gap-1.5 text-xs font-mono transition-colors cursor-pointer group/btn min-h-[36px] px-1 ${
                        isCommentsExpanded ? 'text-sky-400 font-semibold' : 'hover:text-sky-400'
                      }`}
                    >
                      <div className="p-2 rounded-full group-hover/btn:bg-sky-500/10 transition-colors">
                        <MessageSquare className="w-4 h-4" />
                      </div>
                      <span>{commentsList.length > 0 ? commentsList.length : ''}</span>
                    </button>

                    {/* Repost Button */}
                    <button
                      type="button"
                      onClick={() => handleToggleRepost(msg.id)}
                      className={`flex items-center gap-1.5 text-xs font-mono transition-colors cursor-pointer group/btn min-h-[36px] px-1 ${
                        isReposted ? 'text-emerald-400 font-semibold' : 'hover:text-emerald-400'
                      }`}
                    >
                      <div className="p-2 rounded-full group-hover/btn:bg-emerald-500/10 transition-colors">
                        <Repeat2 className="w-4 h-4" />
                      </div>
                      <span>{totalReposts > 0 ? totalReposts : ''}</span>
                    </button>

                    {/* Like Button */}
                    <button
                      type="button"
                      onClick={() => handleToggleLike(msg.id)}
                      className={`flex items-center gap-1.5 text-xs font-mono transition-colors cursor-pointer group/btn min-h-[36px] px-1 ${
                        isLiked ? 'text-rose-500 font-semibold' : 'hover:text-rose-500'
                      }`}
                    >
                      <div className="p-2 rounded-full group-hover/btn:bg-rose-500/10 transition-colors">
                        <Heart
                          className={`w-4 h-4 transition-transform ${
                            isLiked ? 'fill-rose-500 scale-110' : 'group-hover/btn:scale-110'
                          }`}
                        />
                      </div>
                      <span>{totalLikes > 0 ? totalLikes : ''}</span>
                    </button>

                    {/* Share Button */}
                    <button
                      type="button"
                      onClick={() => handleShare(msg)}
                      title="Compartir o copiar"
                      className="p-2 rounded-full hover:bg-white/10 hover:text-white transition-colors cursor-pointer min-h-[36px] min-w-[36px] flex items-center justify-center"
                    >
                      <Share2 className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Expanded Comments Thread */}
                  {isCommentsExpanded && (
                    <div className="pt-3 border-t border-white/[0.06] space-y-2.5 animate-in fade-in duration-150">
                      {/* Existing comments */}
                      {commentsList.length > 0 && (
                        <div className="space-y-2 pl-2 border-l-2 border-white/10">
                          {commentsList.map((comm) => (
                            <div key={comm.id} className="text-xs space-y-0.5">
                              <div className="flex items-center gap-1.5 text-zinc-400 font-mono">
                                <span className="font-semibold text-zinc-200">@{comm.username}</span>
                                <span>· {comm.createdAt}</span>
                              </div>
                              <p className="text-zinc-300 font-normal">{comm.text}</p>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Add comment box */}
                      <div className="flex items-center gap-2 pt-1">
                        <input
                          type="text"
                          value={commentInput}
                          onChange={(e) => setCommentInput(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleAddComment(msg.id);
                          }}
                          placeholder={`Responder a @${msg.username}...`}
                          className="flex-1 min-h-[38px] bg-white/[0.04] border border-white/10 rounded-xl px-3 py-2 text-sm sm:text-xs text-white placeholder-zinc-500 outline-none focus:border-amber-400/50 font-sans"
                        />
                        <button
                          type="button"
                          onClick={() => handleAddComment(msg.id)}
                          disabled={!commentInput.trim()}
                          className={`min-h-[38px] px-3.5 py-2 rounded-xl text-xs font-mono font-semibold transition-colors cursor-pointer ${
                            commentInput.trim()
                              ? 'bg-amber-400 text-black hover:bg-amber-300 active:scale-95'
                              : 'bg-white/10 text-zinc-500 cursor-not-allowed'
                          }`}
                        >
                          Responder
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </article>
            );
          })
        )}
      </div>
    </div>
  );
};
