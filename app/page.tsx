'use client';

import React, { useState, useEffect, useRef } from 'react';
import { AppleNavbar } from '@/components/AppleNavbar';
import { SmrTwitterFeed } from '@/components/SmrTwitterFeed';
import { NavigationDrawer } from '@/components/NavigationDrawer';
import { DesktopSidebar } from '@/components/DesktopSidebar';
import { DesktopWidgets } from '@/components/DesktopWidgets';
import { AngryCableGame } from '@/components/AngryCableGame';
import { CrashGame } from '@/components/CrashGame';
import { MinesGame } from '@/components/MinesGame';
import { RouletteGame } from '@/components/RouletteGame';
import { RussianRouletteGame } from '@/components/RussianRouletteGame';
import { LeaderboardModal } from '@/components/LeaderboardModal';
import { FaucetModal } from '@/components/FaucetModal';
import { AuthModal } from '@/components/AuthModal';
import { AuthGate } from '@/components/AuthGate';
import { ScheduleCalendarView } from '@/components/ScheduleCalendarView';
import { MobileTabBar } from '@/components/MobileTabBar';
import { MinecraftBanner } from '@/components/MinecraftBanner';
import { TermsModal } from '@/components/TermsModal';
import { CookieBanner } from '@/components/CookieBanner';
import { UserSettingsModal } from '@/components/UserSettingsModal';
import { StudentIdentificationModal } from '@/components/StudentIdentificationModal';
import { UserProfile, ChatMessage, LeaderboardEntry, CalendarEvent } from '@/lib/types';
import { sound } from '@/lib/audio';
import { createClient, isSupabaseConfigured } from '@/lib/supabase/client';
import {
  getUserSession,
  saveUserSession,
  clearUserSession,
  updateSessionCoins,
} from '@/lib/authSession';
import { logoutAccount } from '@/lib/authService';
import {
  ArrowLeft,
  PenSquare,
  CircleDot,
  TrendingUp,
  Server,
  Target,
  Zap,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';

type ViewMode = 'feed' | 'calendar' | 'russian_roulette' | 'crash' | 'mines' | 'angry' | 'roulette';

export default function Home() {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [calendarEvents, setCalendarEvents] = useState<CalendarEvent[]>([]);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [activeView, setActiveView] = useState<ViewMode>('feed');

  // Modals & Drawers
  const [isNavDrawerOpen, setIsNavDrawerOpen] = useState(false);
  const [isLeaderboardOpen, setIsLeaderboardOpen] = useState(false);
  const [isFaucetOpen, setIsFaucetOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [isTermsOpen, setIsTermsOpen] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [supabaseConfigured, setSupabaseConfigured] = useState(true);

  const composerRef = useRef<HTMLTextAreaElement | null>(null);

  // Load sound preference on mount
  useEffect(() => {
    try {
      const savedAudio = localStorage.getItem('smr2_sound_enabled');
      if (savedAudio !== null) {
        const isEnabled = savedAudio === 'true';
        setSoundEnabled(isEnabled);
        sound.enabled = isEnabled;
      }
    } catch {}
  }, []);

  const handleToggleSound = () => {
    const nextState = !soundEnabled;
    setSoundEnabled(nextState);
    sound.enabled = nextState;
    try {
      localStorage.setItem('smr2_sound_enabled', String(nextState));
    } catch {}
  };

  const fetchUserProfile = async (userId: string, email?: string) => {
    const supabase = createClient();
    if (!supabase) return;

    try {
      const { data } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      if (data) {
        const profile: UserProfile = {
          id: data.id,
          username: data.username,
          full_name: data.full_name || undefined,
          student_number: data.student_number || undefined,
          email: data.email || email,
          coins: Number(data.coins ?? 200),
          biggest_win: Number(data.biggest_win ?? 0),
          streak_count: data.streak_count ? Number(data.streak_count) : 1,
          last_claim_date: data.last_claim_date || undefined,
          role: data.role || (data.username === 'admin' ? 'admin' : 'student'),
          avatar_color: data.avatar_color,
          created_at: data.created_at,
          auth_provider: 'supabase',
        };
        setUser(profile);
        saveUserSession(profile, true);
      } else {
        const fallbackUsername = (email ? email.split('@')[0] : `user_${userId.slice(0, 5)}`)
          .toLowerCase()
          .replace(/[^a-z0-9_]/g, '_');
        const role = fallbackUsername === 'admin' ? 'admin' : 'student';

        try {
          await supabase.from('profiles').upsert(
            [
              {
                id: userId,
                username: fallbackUsername,
                email: email || null,
                coins: 200,
                biggest_win: 0,
                streak_count: 1,
                role,
              },
            ],
            { onConflict: 'id' }
          );
        } catch {}

        const newProfile: UserProfile = {
          id: userId,
          username: fallbackUsername,
          email,
          coins: 200,
          biggest_win: 0,
          streak_count: 1,
          role,
          auth_provider: 'supabase',
        };
        setUser(newProfile);
        saveUserSession(newProfile, true);
      }
    } catch (err) {
      console.warn('Error al cargar perfil:', err);
    }
  };

  const fetchMessages = async () => {
    const supabase = createClient();
    if (!supabase) return;

    try {
      const { data } = await supabase
        .from('chat_messages')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(60);

      if (data) {
        setChatMessages(
          data.map((m: any) => ({
            ...m,
            created_at: new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          }))
        );
      }
    } catch (err) {
      console.warn('Error fetching messages:', err);
    }
  };

  const fetchCalendarEvents = async () => {
    const supabase = createClient();
    if (!supabase) return;

    try {
      const { data } = await supabase
        .from('calendar_events')
        .select('*')
        .order('event_date', { ascending: true })
        .limit(6);

      if (data) {
        setCalendarEvents(data);
      }
    } catch (err) {
      console.warn('Error fetching calendar events:', err);
    }
  };

  const fetchLeaderboard = async () => {
    const supabase = createClient();
    if (!supabase) return;

    try {
      const { data } = await supabase
        .from('profiles')
        .select('id, username, coins, biggest_win')
        .order('coins', { ascending: false })
        .limit(20);

      if (data) {
        setLeaderboard(
          data.map((p: any) => ({
            id: p.id,
            username: p.username,
            coins: Number(p.coins),
            biggest_win: Number(p.biggest_win),
            is_current_user: user ? p.id === user.id : false,
          }))
        );
      }
    } catch (err) {
      console.warn('Error fetching leaderboard:', err);
    }
  };

  useEffect(() => {
    // 1. Synchronously read local cookie session first for instant resume without flashing
    const cachedSession = getUserSession();
    if (cachedSession) {
      setUser(cachedSession);
      setAuthLoading(false);
    }

    const isConfigured = isSupabaseConfigured();
    setSupabaseConfigured(isConfigured);

    if (!isConfigured) {
      if (!cachedSession) setAuthLoading(false);
      return;
    }

    const supabase = createClient();
    if (!supabase) {
      if (!cachedSession) setAuthLoading(false);
      return;
    }

    supabase.auth
      .getUser()
      .then(({ data: { user: authUser } }) => {
        if (authUser) {
          fetchUserProfile(authUser.id, authUser.email).finally(() => setAuthLoading(false));
        } else {
          setAuthLoading(false);
        }
      })
      .catch(() => {
        setAuthLoading(false);
      });

    const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session?.user) {
        await fetchUserProfile(session.user.id, session.user.email);
        setAuthLoading(false);
      } else if (event === 'SIGNED_OUT') {
        setUser(null);
        clearUserSession();
        setAuthLoading(false);
      }
    });

    fetchMessages();
    fetchCalendarEvents();
    fetchLeaderboard();

    // Realtime chat subscription
    const channel = supabase
      .channel('chat_feed_realtime')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'chat_messages' },
        (payload) => {
          const newMsg = payload.new as any;
          setChatMessages((prev) => [
            {
              ...newMsg,
              created_at: new Date(newMsg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            },
            ...prev,
          ]);
        }
      )
      .subscribe();

    return () => {
      authListener.subscription.unsubscribe();
      supabase.removeChannel(channel);
    };
  }, []);

  // Realtime subscription for current user's coins balance
  useEffect(() => {
    if (!user) return;
    const supabase = createClient();
    if (!supabase) return;

    const profileChannel = supabase
      .channel(`profile_realtime_${user.id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'profiles',
          filter: `id=eq.${user.id}`,
        },
        (payload) => {
          const updated = payload.new as any;
          if (updated) {
            setUser((prev) => {
              if (!prev) return null;
              const nextCoins = Number(updated.coins);
              const nextBiggest = Number(updated.biggest_win);
              updateSessionCoins(nextCoins, nextBiggest);
              return {
                ...prev,
                coins: nextCoins,
                biggest_win: nextBiggest,
              };
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(profileChannel);
    };
  }, [user?.id]);

  useEffect(() => {
    if (isLeaderboardOpen) {
      fetchLeaderboard();
    }
  }, [isLeaderboardOpen, user]);

  const handleSignOut = async () => {
    if (user) {
      try {
        fetch('/api/auth/log', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            eventType: 'user_logout',
            userId: user.id,
            username: user.username,
          }),
        }).catch(() => {});
      } catch {}
    }
    await logoutAccount();
    setUser(null);
  };

  const handleUpdateCoins = async (delta: number) => {
    if (!user) {
      setIsAuthOpen(true);
      return;
    }

    const nextCoins = Math.max(0, user.coins + delta);
    const isWin = delta > 0;
    const nextBiggestWin = isWin && delta > user.biggest_win ? delta : user.biggest_win;

    setUser((prev) =>
      prev
        ? {
            ...prev,
            coins: nextCoins,
            biggest_win: nextBiggestWin,
          }
        : null
    );

    updateSessionCoins(nextCoins, nextBiggestWin);

    const supabase = createClient();
    if (supabase && user.auth_provider === 'supabase') {
      try {
        await supabase
          .from('profiles')
          .update({ coins: nextCoins, biggest_win: nextBiggestWin })
          .eq('id', user.id);
      } catch (err) {
        console.warn('Could not sync coins to Supabase:', err);
      }
    }
  };

  const handleClaimCoins = async (
    amount: number,
    newStreak?: number,
    claimType?: 'daily' | 'spin' | 'rescue'
  ) => {
    if (!user) {
      setIsAuthOpen(true);
      return;
    }

    const nextCoins = user.coins + amount;
    const nowIso = new Date().toISOString();
    const nextStreakVal =
      claimType === 'daily' && newStreak !== undefined ? newStreak : user.streak_count ?? 1;
    const nextClaimDate = claimType === 'daily' ? nowIso : user.last_claim_date;
    const nextSpinDate = claimType === 'spin' ? nowIso : user.last_spin_date;
    const nextRescueDate = claimType === 'rescue' ? nowIso : user.last_rescue_date;

    setUser((prev) =>
      prev
        ? {
            ...prev,
            coins: nextCoins,
            streak_count: nextStreakVal,
            last_claim_date: nextClaimDate,
            last_spin_date: nextSpinDate,
            last_rescue_date: nextRescueDate,
          }
        : null
    );

    updateSessionCoins(
      nextCoins,
      undefined,
      nextStreakVal,
      nextClaimDate,
      nextSpinDate,
      nextRescueDate
    );

    const supabase = createClient();
    if (supabase && user.auth_provider === 'supabase') {
      try {
        const updatePayload: Record<string, any> = { coins: nextCoins };
        if (claimType === 'daily') {
          updatePayload.streak_count = nextStreakVal;
          updatePayload.last_claim_date = nowIso;
        }
        await supabase
          .from('profiles')
          .update(updatePayload)
          .eq('id', user.id);
      } catch (err) {
        console.warn('Could not sync streak/coins to Supabase:', err);
      }
    }
  };

  const handleSendMessage = async (text: string) => {
    if (!user) {
      setIsAuthOpen(true);
      return;
    }

    const optimisticMsg: ChatMessage = {
      id: `opt_${Date.now()}`,
      user_id: user.id,
      username: user.username,
      text,
      created_at: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };
    setChatMessages((prev) => [optimisticMsg, ...prev]);

    const supabase = createClient();
    if (!supabase) return;

    try {
      await supabase.from('chat_messages').insert([
        {
          user_id: user.id,
          username: user.username,
          text,
        },
      ]);
    } catch (err) {
      console.warn('Error inserting message to Supabase:', err);
    }
  };

  const handleBroadcastWin = async (
    game: 'angry' | 'crash' | 'mines' | 'roulette',
    multiplier: number,
    winAmount: number
  ) => {
    if (!user) return;
    const gameLabel =
      game === 'angry'
        ? 'Slingshot Cable'
        : game === 'crash'
        ? 'Crash'
        : game === 'mines'
        ? 'Minas'
        : 'Ruleta Clásica';

    const winText = `@${user.username} consiguió un multiplicador de x${multiplier.toFixed(2)} (+${winAmount.toLocaleString()} fichas) en ${gameLabel}`;

    const optimisticWin: ChatMessage = {
      id: `win_${Date.now()}`,
      user_id: user.id,
      username: user.username,
      text: winText,
      is_system_win: true,
      win_amount: winAmount,
      multiplier,
      game,
      created_at: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };
    setChatMessages((prev) => [optimisticWin, ...prev]);

    const supabase = createClient();
    if (!supabase) return;

    try {
      await supabase.from('chat_messages').insert([
        {
          user_id: user.id,
          username: user.username,
          text: winText,
          is_system_win: true,
          win_amount: winAmount,
          multiplier,
          game,
        },
      ]);
    } catch {}
  };

  const handleTipUser = async (targetUsername: string, amount: number) => {
    if (!user) {
      setIsAuthOpen(true);
      return;
    }

    if (user.coins < amount) {
      sound.broke();
      alert('Saldo insuficiente para enviar propina.');
      return;
    }

    await handleUpdateCoins(-amount);

    const supabase = createClient();
    if (!supabase) return;

    try {
      const { data: receiver } = await supabase
        .from('profiles')
        .select('id, coins')
        .eq('username', targetUsername)
        .single();

      if (receiver) {
        await supabase
          .from('profiles')
          .update({ coins: Number(receiver.coins) + amount })
          .eq('id', receiver.id);
      }

      await supabase.from('chat_messages').insert([
        {
          user_id: user.id,
          username: 'SISTEMA',
          text: `@${user.username} transfirió ${amount} fichas a @${targetUsername}`,
          is_system_win: true,
          win_amount: amount,
        },
      ]);
    } catch {}

    sound.coinWin();
  };

  // Loading splash screen
  if (authLoading) {
    return (
      <div className="min-h-[100dvh] bg-background flex flex-col items-center justify-center p-4">
        <div className="flex flex-col items-center gap-3.5 animate-in fade-in duration-300">
          <div className="w-16 h-16 rounded-2xl overflow-hidden bg-white p-1 ring-1 ring-border/80 shadow-md flex items-center justify-center">
            <img
              src="/logo.png"
              alt="SMR2 Logo"
              className="w-full h-full object-contain"
            />
          </div>
          <span className="text-xs font-semibold tracking-wider uppercase text-foreground-muted font-mono">
            SMR2
          </span>
        </div>
      </div>
    );
  }

  // Mandatory Auth Gate
  if (!user) {
    return (
      <AuthGate
        onAuthSuccess={(profile) => {
          setUser(profile);
          fetchMessages();
          fetchLeaderboard();
          fetchCalendarEvents();
        }}
        supabaseConfigured={supabaseConfigured}
      />
    );
  }

  return (
    <div className="min-h-screen relative flex flex-col bg-background text-foreground selection:bg-accent selection:text-accent-foreground overflow-x-hidden">
      {/* 1. Top Navbar */}
      <AppleNavbar
        user={user}
        onOpenAuth={() => setIsAuthOpen(true)}
        onSignOut={handleSignOut}
        onOpenFaucet={() => setIsFaucetOpen(true)}
        onOpenLeaderboard={() => setIsLeaderboardOpen(true)}
        onOpenSchedule={() => setActiveView('calendar')}
        isScheduleActive={activeView === 'calendar'}
        soundEnabled={soundEnabled}
        onToggleSound={handleToggleSound}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onOpenDrawer={() => setIsNavDrawerOpen(true)}
        activeTab={activeView}
        onSelectTab={(tab) => setActiveView(tab as ViewMode)}
      />

      {/* 2. Main Workspace Layout */}
      <main className="relative z-10 flex-1 w-full pb-24 lg:pb-12">
        {/* VIEW 1: TWITTER FEED (Hero Experience) */}
        {activeView === 'feed' ? (
          <div className="max-w-7xl mx-auto w-full px-3 sm:px-6 lg:px-8 pt-4">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              {/* Left Sidebar Rail (Desktop) */}
              <div className="hidden lg:block lg:col-span-3">
                <DesktopSidebar
                  currentUser={user}
                  activeView={activeView}
                  onSelectView={(v) => setActiveView(v as ViewMode)}
                  onOpenDrawer={() => setIsNavDrawerOpen(true)}
                  onOpenLeaderboard={() => setIsLeaderboardOpen(true)}
                  onOpenFaucet={() => setIsFaucetOpen(true)}
                  onOpenSettings={() => setIsSettingsOpen(true)}
                  onSignOut={handleSignOut}
                  onOpenAuth={() => setIsAuthOpen(true)}
                  onFocusComposer={() => {
                    composerRef.current?.focus();
                    composerRef.current?.scrollIntoView({ behavior: 'smooth' });
                  }}
                />
              </div>

              {/* Center Feed Column (Twitter Timeline) */}
              <div className="col-span-1 lg:col-span-6 w-full min-w-0 space-y-3.5">
                {/* Community Minecraft Project (Aligned with center column) */}
                <MinecraftBanner />

                <SmrTwitterFeed
                  messages={chatMessages}
                  currentUser={user}
                  onOpenAuth={() => setIsAuthOpen(true)}
                  onSendMessage={handleSendMessage}
                  onTipUser={handleTipUser}
                  onOpenSchedule={() => setActiveView('calendar')}
                  onOpenRussianRoulette={() => setActiveView('russian_roulette')}
                  composerRef={composerRef}
                />
              </div>

              {/* Right Sidebar Widgets (Desktop) */}
              <div className="hidden lg:block lg:col-span-3 sticky top-18 space-y-4">
                <DesktopWidgets
                  currentUser={user}
                  events={calendarEvents}
                  leaderboard={leaderboard}
                  onOpenSchedule={() => setActiveView('calendar')}
                  onOpenLeaderboard={() => setIsLeaderboardOpen(true)}
                  onOpenFaucet={() => setIsFaucetOpen(true)}
                  onOpenRussianRoulette={() => setActiveView('russian_roulette')}
                />
              </div>
            </div>
          </div>
        ) : (
          /* VIEW 2: HORARIO O JUEGOS */
          <div className="max-w-7xl mx-auto w-full px-3 sm:px-6 lg:px-8 pt-4 space-y-4">
            {/* Apple-style Top Bar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 sm:p-3.5 rounded-2xl bg-surface border border-border/70 shadow-xs">
              <div className="flex items-center gap-3">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => {
                    setActiveView('feed');
                    sound.tap();
                  }}
                  className="shrink-0 rounded-xl"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Volver al feed</span>
                </Button>

                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-foreground tracking-tight">
                    {activeView === 'calendar'
                      ? 'Horario lectivo y entregas'
                      : activeView === 'russian_roulette'
                      ? 'Ruleta Rusa'
                      : 'Recreo Arcade'}
                  </span>
                  <span className="text-[11px] text-foreground-subtle hidden sm:inline">
                    · 2º SMR
                  </span>
                </div>
              </div>

              {/* Segmented Game Switcher Bar */}
              {activeView !== 'calendar' && (
                <div className="flex items-center p-1 rounded-full bg-surface-raised border border-border/60 overflow-x-auto scrollbar-none gap-0.5">
                  {[
                    { id: 'russian_roulette', label: 'Ruleta Rusa', icon: Zap },
                    { id: 'crash', label: 'Crash', icon: TrendingUp },
                    { id: 'mines', label: 'Minas', icon: Server },
                    { id: 'angry', label: 'Slingshot', icon: Target },
                    { id: 'roulette', label: 'Ruleta', icon: CircleDot },
                  ].map((g) => {
                    const isActive = activeView === g.id;
                    const IconComponent = g.icon;
                    return (
                      <button
                        key={g.id}
                        type="button"
                        onClick={() => {
                          setActiveView(g.id as ViewMode);
                          sound.tap();
                        }}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all cursor-pointer whitespace-nowrap shrink-0 active:scale-95 touch-manipulation ${
                          isActive
                            ? 'bg-foreground text-background font-semibold shadow-xs'
                            : 'text-foreground-muted hover:text-foreground'
                        }`}
                      >
                        <IconComponent className="w-3.5 h-3.5" />
                        <span>{g.label}</span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Active Component */}
            <div className="animate-in fade-in duration-150">
              {activeView === 'angry' ? (
                <AngryCableGame
                  userCoins={user ? user.coins : 200}
                  onUpdateCoins={handleUpdateCoins}
                  onBroadcastWin={handleBroadcastWin}
                />
              ) : activeView === 'crash' ? (
                <CrashGame
                  userCoins={user ? user.coins : 200}
                  onUpdateCoins={handleUpdateCoins}
                  onBroadcastWin={handleBroadcastWin}
                />
              ) : activeView === 'mines' ? (
                <MinesGame
                  userCoins={user ? user.coins : 200}
                  onUpdateCoins={handleUpdateCoins}
                  onBroadcastWin={handleBroadcastWin}
                />
              ) : activeView === 'roulette' ? (
                <RouletteGame
                  userCoins={user ? user.coins : 200}
                  onUpdateCoins={handleUpdateCoins}
                  onBroadcastWin={handleBroadcastWin}
                />
              ) : activeView === 'russian_roulette' ? (
                <RussianRouletteGame
                  user={user}
                  onOpenAuth={() => setIsAuthOpen(true)}
                  onUpdateCoins={handleUpdateCoins}
                />
              ) : (
                <ScheduleCalendarView
                  currentUser={user}
                  onOpenAuth={() => setIsAuthOpen(true)}
                  onBroadcastToChat={handleSendMessage}
                  onPlayRussianRoulette={() => setActiveView('russian_roulette')}
                />
              )}
            </div>
          </div>
        )}
      </main>

      {/* 3. Floating Action Button (FAB) on Mobile for Instant Tweet Compose */}
      {activeView === 'feed' && (
        <button
          type="button"
          onClick={() => {
            composerRef.current?.focus();
            composerRef.current?.scrollIntoView({ behavior: 'smooth' });
            sound.tap();
          }}
          aria-label="Publicar en el feed"
          className="lg:hidden fixed right-4 bottom-[calc(4.75rem+env(safe-area-inset-bottom,0px))] z-30 w-13 h-13 min-w-[52px] min-h-[52px] rounded-full bg-accent hover:opacity-95 text-accent-foreground flex items-center justify-center border border-border shadow-lg cursor-pointer active:scale-95 transition-all touch-manipulation"
        >
          <PenSquare className="w-5 h-5" />
        </button>
      )}

      {/* 4. Mobile Bottom Tab Bar */}
      <MobileTabBar
        activeTab={activeView}
        onSelectTab={(tab) => setActiveView(tab as ViewMode)}
        onOpenDrawer={() => setIsNavDrawerOpen(true)}
        onOpenLeaderboard={() => setIsLeaderboardOpen(true)}
      />

      {/* 5. The 3-Line Menu Drawer ("demas cosas esten desplegadas si presionas el boton de tres lineas") */}
      <NavigationDrawer
        isOpen={isNavDrawerOpen}
        onClose={() => setIsNavDrawerOpen(false)}
        currentUser={user}
        activeView={activeView}
        onSelectView={(v) => setActiveView(v as ViewMode)}
        onOpenLeaderboard={() => setIsLeaderboardOpen(true)}
        onOpenFaucet={() => setIsFaucetOpen(true)}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onOpenTerms={() => setIsTermsOpen(true)}
        soundEnabled={soundEnabled}
        onToggleSound={handleToggleSound}
        onSignOut={handleSignOut}
      />

      {/* 6. Modals */}
      <LeaderboardModal
        isOpen={isLeaderboardOpen}
        onClose={() => setIsLeaderboardOpen(false)}
        entries={leaderboard}
      />

      <FaucetModal
        isOpen={isFaucetOpen}
        onClose={() => setIsFaucetOpen(false)}
        currentUser={user}
        onClaimCoins={handleClaimCoins}
      />

      <AuthModal
        isOpen={isAuthOpen}
        onClose={() => setIsAuthOpen(false)}
        onAuthSuccess={(newProfile) => {
          setUser(newProfile);
          fetchMessages();
          fetchLeaderboard();
          fetchCalendarEvents();
        }}
      />

      <UserSettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        user={user}
        onUpdateUser={(updated) => setUser(updated)}
        onSignOut={handleSignOut}
        onOpenFaucet={() => setIsFaucetOpen(true)}
        soundEnabled={soundEnabled}
        onToggleSound={handleToggleSound}
      />

      <TermsModal
        isOpen={isTermsOpen}
        onClose={() => setIsTermsOpen(false)}
      />

      {/* 7. Student Identification Onboarding Gate (Required: Real Name & Unique Student Number) */}
      <StudentIdentificationModal
        isOpen={Boolean(user && (!user.full_name || !user.student_number))}
        user={user}
        onSuccess={(updated) => {
          setUser(updated);
        }}
        onSignOut={handleSignOut}
      />

      <CookieBanner
        onOpenTerms={() => setIsTermsOpen(true)}
      />

      {/* 7. Footer */}
      <footer className="border-t border-border/70 bg-surface/80 py-5 mt-10 mb-16 lg:mb-0 text-center text-xs text-foreground-muted">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-6 h-6 rounded-lg overflow-hidden bg-white p-0.5 ring-1 ring-border/70 flex items-center justify-center shrink-0">
              <img src="/logo.png" alt="SMR2" className="w-full h-full object-contain" />
            </div>
            <span className="font-medium text-foreground tracking-tight">SMR2 · 2º Sistemas Microinformáticos y Redes</span>
          </div>

          <div className="flex items-center gap-4 text-foreground-subtle text-[11px]">
            <button
              type="button"
              onClick={() => {
                setIsTermsOpen(true);
                sound.tap();
              }}
              className="hover:text-foreground transition-colors cursor-pointer"
            >
              Normas, Cookies y Contacto
            </button>
            <span>Curso lectivo</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
