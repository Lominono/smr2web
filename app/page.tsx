'use client';

import React, { useState, useEffect } from 'react';
import { AppleNavbar } from '@/components/AppleNavbar';
import { AngryCableGame } from '@/components/AngryCableGame';
import { CrashGame } from '@/components/CrashGame';
import { MinesGame } from '@/components/MinesGame';
import { RouletteGame } from '@/components/RouletteGame';
import { RussianRouletteGame } from '@/components/RussianRouletteGame';
import { LiveChat } from '@/components/LiveChat';
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
import { UserProfile, ChatMessage, LeaderboardEntry } from '@/lib/types';
import { sound } from '@/lib/audio';
import { createClient, isSupabaseConfigured } from '@/lib/supabase/client';
import {
  getUserSession,
  saveUserSession,
  clearUserSession,
  updateSessionCoins,
} from '@/lib/authSession';
import { logoutAccount } from '@/lib/authService';
import { Target, TrendingUp, AlertCircle, MessageSquare, Calendar, Cookie, Server, CircleDot } from 'lucide-react';

export default function Home() {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [activeGame, setActiveGame] = useState<'angry' | 'crash' | 'mines' | 'roulette' | 'russian_roulette' | 'calendar'>('calendar');
  const [isLeaderboardOpen, setIsLeaderboardOpen] = useState(false);
  const [isFaucetOpen, setIsFaucetOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isChatDrawerOpen, setIsChatDrawerOpen] = useState(false);
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [isTermsOpen, setIsTermsOpen] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [supabaseConfigured, setSupabaseConfigured] = useState(true);

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
          email: data.email || email,
          coins: Number(data.coins ?? 1000),
          biggest_win: Number(data.biggest_win ?? 0),
          streak_count: data.streak_count ? Number(data.streak_count) : 1,
          last_claim_date: data.last_claim_date || undefined,
          role: data.role || (data.username === 'admin' ? 'admin' : 'student'),
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
                coins: 1000,
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
          coins: 1000,
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

    const { data } = await supabase
      .from('chat_messages')
      .select('*')
      .order('created_at', { ascending: true })
      .limit(60);

    if (data) {
      setChatMessages(
        data.map((m: any) => ({
          ...m,
          created_at: new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        }))
      );
    }
  };

  const fetchLeaderboard = async () => {
    const supabase = createClient();
    if (!supabase) return;

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
      // Running in local/offline mode
      if (!cachedSession) {
        setAuthLoading(false);
      }
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
          // Keep cached session to avoid wiping user on transient token refresh or network hiccup
          setAuthLoading(false);
        }
      })
      .catch(() => {
        // Network/connection issue, keep local cookie session if present
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
    fetchLeaderboard();

    const channel = supabase
      .channel('chat_realtime')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'chat_messages' },
        (payload) => {
          const newMsg = payload.new as any;
          setChatMessages((prev) => [
            ...prev,
            {
              ...newMsg,
              created_at: new Date(newMsg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            },
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

    // 1. Update React state
    setUser((prev) =>
      prev
        ? {
            ...prev,
            coins: nextCoins,
            biggest_win: nextBiggestWin,
          }
        : null
    );

    // 2. Persist in cookies & localStorage
    updateSessionCoins(nextCoins, nextBiggestWin);

    // 3. Update Supabase profiles table if connected and user is supabase-authenticated
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

  const handleClaimCoins = async (amount: number, newStreak?: number) => {
    if (!user) {
      setIsAuthOpen(true);
      return;
    }

    const nextCoins = user.coins + amount;
    const todayStr = new Date().toISOString();
    const nextStreakVal = newStreak !== undefined ? newStreak : user.streak_count ?? 1;

    setUser((prev) =>
      prev
        ? {
            ...prev,
            coins: nextCoins,
            streak_count: nextStreakVal,
            last_claim_date: todayStr,
          }
        : null
    );

    updateSessionCoins(nextCoins, undefined, nextStreakVal, todayStr);

    const supabase = createClient();
    if (supabase && user.auth_provider === 'supabase') {
      try {
        await supabase
          .from('profiles')
          .update({
            coins: nextCoins,
            streak_count: nextStreakVal,
            last_claim_date: todayStr,
          })
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

    const supabase = createClient();
    if (!supabase) return;

    await supabase.from('chat_messages').insert([
      {
        user_id: user.id,
        username: user.username,
        text,
      },
    ]);
  };

  const handleBroadcastWin = async (
    game: 'angry' | 'crash' | 'mines' | 'roulette',
    multiplier: number,
    winAmount: number
  ) => {
    if (!user) return;
    const gameLabel =
      game === 'angry'
        ? 'Slingshot'
        : game === 'crash'
        ? 'Crash'
        : game === 'mines'
        ? 'Minas'
        : 'Ruleta';

    const supabase = createClient();
    if (!supabase) return;

    await supabase.from('chat_messages').insert([
      {
        user_id: user.id,
        username: user.username,
        text: `@${user.username} consiguió un multiplicador de x${multiplier.toFixed(2)} (+${winAmount.toLocaleString()} fichas) en ${gameLabel}`,
        is_system_win: true,
        win_amount: winAmount,
        multiplier,
        game,
      },
    ]);
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

    const supabase = createClient();
    if (!supabase) return;

    await handleUpdateCoins(-amount);

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

    sound.coinWin();
  };

  // 1. Loading splash screen while checking session
  if (authLoading) {
    return (
      <div className="min-h-screen bg-[#070709] bg-dot-matrix flex flex-col items-center justify-center p-4">
        <div className="flex flex-col items-center gap-3 animate-pulse">
          <img
            src="/logo.png"
            alt="SMR2 Logo"
            className="w-16 h-16 object-contain drop-shadow-[0_8px_24px_rgba(0,0,0,0.7)]"
          />
          <span className="text-sm font-semibold tracking-tight text-white font-mono">
            SMR2
          </span>
        </div>
      </div>
    );
  }

  // 2. Mandatory Authentication Gate
  if (!user) {
    return (
      <AuthGate
        onAuthSuccess={(profile) => {
          setUser(profile);
          fetchMessages();
          fetchLeaderboard();
        }}
        supabaseConfigured={supabaseConfigured}
      />
    );
  }

  return (
    <div className="min-h-screen relative flex flex-col bg-[#070709] bg-dot-matrix text-zinc-100 selection:bg-white selection:text-black overflow-x-hidden">
      {/* Top Navbar */}
      <AppleNavbar
        user={user}
        onOpenAuth={() => setIsAuthOpen(true)}
        onSignOut={handleSignOut}
        onOpenFaucet={() => (user ? setIsFaucetOpen(true) : setIsAuthOpen(true))}
        onOpenLeaderboard={() => setIsLeaderboardOpen(true)}
        onOpenSchedule={() => setActiveGame('calendar')}
        isScheduleActive={activeGame === 'calendar'}
        onToggleChat={() => setIsChatDrawerOpen(!isChatDrawerOpen)}
        isChatOpen={isChatDrawerOpen}
        soundEnabled={soundEnabled}
        onToggleSound={handleToggleSound}
        onOpenSettings={() => setIsSettingsOpen(true)}
        activeTab={activeGame}
        onSelectTab={(tab) => setActiveGame(tab)}
      />

      {/* Main Container */}
      <main className="relative z-10 flex-1 max-w-7xl w-full mx-auto px-3 sm:px-6 py-4 sm:py-6 space-y-4 pb-28 lg:pb-8">
        {/* Community Minecraft Project (dismissible) */}
        <MinecraftBanner />

        {/* If in Recreo / Games mode, show sleek game navigation bar */}
        {activeGame !== 'calendar' && (
          <div className="flex items-center justify-between gap-2 p-1.5 rounded-2xl bg-[#0c0e12] border border-white/[0.08]">
            <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none w-full">
              {[
                { id: 'russian_roulette', label: 'Ruleta Rusa', icon: CircleDot, tag: 'Multijugador' },
                { id: 'crash', label: 'Crash', icon: TrendingUp },
                { id: 'mines', label: 'Minas', icon: Server },
                { id: 'angry', label: 'Slingshot', icon: Target },
                { id: 'roulette', label: 'Ruleta', icon: CircleDot },
              ].map((g) => {
                const isActive = activeGame === g.id;
                const IconComponent = g.icon;
                return (
                  <button
                    key={g.id}
                    onClick={() => {
                      setActiveGame(g.id as any);
                      sound.tap();
                    }}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-mono font-medium transition-all cursor-pointer whitespace-nowrap shrink-0 ${
                      isActive
                        ? 'bg-amber-400 text-black font-bold shadow-sm'
                        : 'text-zinc-400 hover:text-white hover:bg-white/[0.04]'
                    }`}
                  >
                    <IconComponent className="w-3.5 h-3.5" />
                    <span>{g.label}</span>
                    {g.tag && (
                      <span
                        className={`text-[9px] px-1.5 py-0.2 rounded font-mono ${
                          isActive
                            ? 'bg-black/20 text-black font-semibold'
                            : 'bg-amber-400/15 text-amber-300'
                        }`}
                      >
                        {g.tag}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Main Workspace: expands to full width when chat is closed */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
          <div
            className={`space-y-4 transition-all duration-200 ${
              isChatDrawerOpen ? 'lg:col-span-8' : 'lg:col-span-12'
            }`}
          >
            {activeGame === 'angry' ? (
              <AngryCableGame
                userCoins={user ? user.coins : 1000}
                onUpdateCoins={handleUpdateCoins}
                onBroadcastWin={handleBroadcastWin}
              />
            ) : activeGame === 'crash' ? (
              <CrashGame
                userCoins={user ? user.coins : 1000}
                onUpdateCoins={handleUpdateCoins}
                onBroadcastWin={handleBroadcastWin}
              />
            ) : activeGame === 'mines' ? (
              <MinesGame
                userCoins={user ? user.coins : 1000}
                onUpdateCoins={handleUpdateCoins}
                onBroadcastWin={handleBroadcastWin}
              />
            ) : activeGame === 'roulette' ? (
              <RouletteGame
                userCoins={user ? user.coins : 1000}
                onUpdateCoins={handleUpdateCoins}
                onBroadcastWin={handleBroadcastWin}
              />
            ) : activeGame === 'russian_roulette' ? (
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
                onPlayRussianRoulette={() => setActiveGame('russian_roulette')}
              />
            )}
          </div>

          {/* Desktop Live Chat (only rendered when chat is open) */}
          {isChatDrawerOpen && (
            <div className="hidden lg:block lg:col-span-4 sticky top-20">
              <LiveChat
                messages={chatMessages}
                currentUser={user}
                onOpenAuth={() => setIsAuthOpen(true)}
                onSendMessage={handleSendMessage}
                onTipUser={handleTipUser}
                onClose={() => setIsChatDrawerOpen(false)}
              />
            </div>
          )}
        </div>
      </main>

      {/* Mobile Bottom Dock */}
      <MobileTabBar
        activeTab={activeGame}
        onSelectTab={(tab) => setActiveGame(tab)}
        isChatOpen={isChatDrawerOpen}
        onToggleChat={() => setIsChatDrawerOpen(!isChatDrawerOpen)}
        onOpenLeaderboard={() => setIsLeaderboardOpen(true)}
        onOpenSettings={() => setIsSettingsOpen(true)}
      />

      {/* Mobile Drawer Chat (Bottom Sheet) */}
      {isChatDrawerOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex flex-col justify-end bg-black/85 backdrop-blur-xl animate-in fade-in duration-150">
          <div className="w-full max-w-lg mx-auto h-[88vh] flex flex-col p-2 sm:p-4">
            <LiveChat
              messages={chatMessages}
              currentUser={user}
              onOpenAuth={() => setIsAuthOpen(true)}
              onSendMessage={handleSendMessage}
              onTipUser={handleTipUser}
              onClose={() => setIsChatDrawerOpen(false)}
              isDrawer={true}
            />
          </div>
        </div>
      )}

      {/* Modals */}
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

      <CookieBanner
        onOpenTerms={() => setIsTermsOpen(true)}
      />

      {/* Footer */}
      <footer className="border-t border-white/[0.06] bg-black/60 py-4 mt-8 mb-16 lg:mb-0 text-center text-[11px] text-zinc-500 font-mono">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <img src="/logo.png" alt="SMR2" className="w-5 h-5 object-contain" />
            <span>SMR2 · 2º Sistemas Microinformáticos y Redes</span>
          </div>

          <div className="flex items-center gap-4 text-zinc-400">
            <button
              type="button"
              onClick={() => {
                setIsTermsOpen(true);
                sound.tap();
              }}
              className="hover:text-amber-400 transition-colors cursor-pointer underline underline-offset-2"
            >
              Normas, Cookies & Contacto legal
            </button>
            <span className="text-zinc-600">Curso 2024–2025</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
