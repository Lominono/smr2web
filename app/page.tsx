'use client';

import React, { useState, useEffect } from 'react';
import { AppleNavbar } from '@/components/AppleNavbar';
import { AngryCableGame } from '@/components/AngryCableGame';
import { CrashGame } from '@/components/CrashGame';
import { LiveChat } from '@/components/LiveChat';
import { LeaderboardModal } from '@/components/LeaderboardModal';
import { FaucetModal } from '@/components/FaucetModal';
import { AuthModal } from '@/components/AuthModal';
import { UserProfile, ChatMessage, LeaderboardEntry } from '@/lib/types';
import { sound } from '@/lib/audio';
import { createClient } from '@/lib/supabase/client';
import { Zap, TrendingUp, MessageSquare, AlertCircle } from 'lucide-react';

export default function Home() {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [activeGame, setActiveGame] = useState<'angry' | 'crash'>('angry');
  const [isLeaderboardOpen, setIsLeaderboardOpen] = useState(false);
  const [isFaucetOpen, setIsFaucetOpen] = useState(false);
  const [isChatDrawerOpen, setIsChatDrawerOpen] = useState(false);
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [supabaseConfigured, setSupabaseConfigured] = useState(true);

  // Sync sound
  const handleToggleSound = () => {
    const nextState = !soundEnabled;
    setSoundEnabled(nextState);
    sound.enabled = nextState;
  };

  // Fetch user profile from Supabase
  const fetchUserProfile = async (userId: string, email?: string) => {
    const supabase = createClient();
    if (!supabase) return;

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (data) {
        setUser({
          id: data.id,
          username: data.username,
          email,
          coins: Number(data.coins),
          biggest_win: Number(data.biggest_win),
          created_at: data.created_at,
        });
      } else {
        // If profile row doesn't exist yet, create it
        const fallbackUsername = email ? email.split('@')[0] : `user_${userId.slice(0, 5)}`;
        const newProfile = {
          id: userId,
          username: fallbackUsername,
          coins: 1000,
          biggest_win: 0,
        };
        await supabase.from('profiles').insert([newProfile]);
        setUser(newProfile);
      }
    } catch (err) {
      console.warn('Error al cargar perfil:', err);
    }
  };

  // Fetch real chat messages
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

  // Fetch real leaderboard
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

  // Initial load & real-time setup
  useEffect(() => {
    const supabase = createClient();
    if (!supabase) {
      setSupabaseConfigured(false);
      return;
    }

    // Check active session
    supabase.auth.getUser().then(({ data: { user: authUser } }) => {
      if (authUser) {
        fetchUserProfile(authUser.id, authUser.email);
      }
    });

    // Listen to Auth State Changes
    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        fetchUserProfile(session.user.id, session.user.email);
      } else {
        setUser(null);
      }
    });

    // Fetch initial chat & leaderboard
    fetchMessages();
    fetchLeaderboard();

    // Subscribe to Realtime Chat Messages
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

  // Refresh leaderboard when user changes or opens modal
  useEffect(() => {
    if (isLeaderboardOpen) {
      fetchLeaderboard();
    }
  }, [isLeaderboardOpen, user]);

  const handleSignOut = async () => {
    const supabase = createClient();
    if (supabase) {
      await supabase.auth.signOut();
    }
    setUser(null);
  };

  // Update coins in state and persist to Supabase
  const handleUpdateCoins = async (delta: number) => {
    if (!user) {
      setIsAuthOpen(true);
      return;
    }

    const nextCoins = Math.max(0, user.coins + delta);
    const isWin = delta > 0;
    const nextBiggestWin = isWin && delta > user.biggest_win ? delta : user.biggest_win;

    // Optimistic UI update
    setUser((prev) =>
      prev
        ? {
            ...prev,
            coins: nextCoins,
            biggest_win: nextBiggestWin,
          }
        : null
    );

    // Sync to Supabase
    const supabase = createClient();
    if (supabase) {
      await supabase
        .from('profiles')
        .update({ coins: nextCoins, biggest_win: nextBiggestWin })
        .eq('id', user.id);
    }
  };

  // Send message to Supabase chat
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

  // Broadcast big win to chat
  const handleBroadcastWin = async (game: 'angry' | 'crash', multiplier: number, winAmount: number) => {
    if (!user) return;
    const gameLabel = game === 'angry' ? 'Angry Cable' : 'Kernel Crash';

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

  // Tip user coins in Supabase
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

    // Deduct from sender
    await handleUpdateCoins(-amount);

    // Increment receiver
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

    // Insert tip notification in chat
    await supabase.from('chat_messages').insert([
      {
        user_id: user.id,
        username: 'SISTEMA',
        text: `@${user.username} ha transferido ${amount} fichas a @${targetUsername}`,
        is_system_win: true,
        win_amount: amount,
      },
    ]);

    sound.coinWin();
  };

  return (
    <div className="min-h-screen flex flex-col bg-black text-white selection:bg-white selection:text-black">
      {/* Top Bar */}
      <AppleNavbar
        user={user}
        onOpenAuth={() => setIsAuthOpen(true)}
        onSignOut={handleSignOut}
        onOpenFaucet={() => (user ? setIsFaucetOpen(true) : setIsAuthOpen(true))}
        onOpenLeaderboard={() => setIsLeaderboardOpen(true)}
        onToggleChat={() => setIsChatDrawerOpen(!isChatDrawerOpen)}
        isChatOpen={isChatDrawerOpen}
        soundEnabled={soundEnabled}
        onToggleSound={handleToggleSound}
      />

      {/* Main Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-6 space-y-6">
        {/* Warning if Supabase is not configured */}
        {!supabaseConfigured && (
          <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-xs font-mono text-amber-300 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
              <span>Para sincronizar usuarios reales, añade NEXT_PUBLIC_SUPABASE_URL y ANON_KEY en tu .env.local y Vercel.</span>
            </div>
          </div>
        )}

        {/* Game Switcher */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="inline-flex p-1 rounded-2xl bg-white/[0.04] border border-white/[0.08] backdrop-blur-xl">
            <button
              onClick={() => {
                setActiveGame('angry');
                sound.tap();
              }}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold tracking-tight transition-all cursor-pointer ${
                activeGame === 'angry'
                  ? 'bg-white text-black font-bold shadow-md'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              <Zap className="w-4 h-4 text-emerald-500" />
              <span>Angry Cable</span>
            </button>

            <button
              onClick={() => {
                setActiveGame('crash');
                sound.tap();
              }}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold tracking-tight transition-all cursor-pointer ${
                activeGame === 'crash'
                  ? 'bg-white text-black font-bold shadow-md'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              <TrendingUp className="w-4 h-4 text-rose-500" />
              <span>Kernel Crash</span>
            </button>
          </div>

          <div className="text-xs text-zinc-500 font-mono hidden md:block">
            {user ? `Sesión iniciada como @${user.username}` : 'Modo invitado · Inicia sesión para guardar fichas'}
          </div>
        </div>

        {/* 2-Column Responsive Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Game Area */}
          <div className="lg:col-span-8 space-y-4">
            {activeGame === 'angry' ? (
              <AngryCableGame
                userCoins={user ? user.coins : 1000}
                onUpdateCoins={handleUpdateCoins}
                onBroadcastWin={handleBroadcastWin}
              />
            ) : (
              <CrashGame
                userCoins={user ? user.coins : 1000}
                onUpdateCoins={handleUpdateCoins}
                onBroadcastWin={handleBroadcastWin}
              />
            )}
          </div>

          {/* Realtime Chat (Desktop) */}
          <div className="hidden lg:block lg:col-span-4 sticky top-24">
            <LiveChat
              messages={chatMessages}
              currentUser={user}
              onOpenAuth={() => setIsAuthOpen(true)}
              onSendMessage={handleSendMessage}
              onTipUser={handleTipUser}
            />
          </div>
        </div>
      </main>

      {/* Mobile Drawer Chat */}
      {isChatDrawerOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex flex-col bg-black/90 backdrop-blur-md p-4 animate-in fade-in duration-200">
          <div className="flex-1 max-w-lg w-full mx-auto flex flex-col">
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

      {/* Real Leaderboard Modal */}
      <LeaderboardModal
        isOpen={isLeaderboardOpen}
        onClose={() => setIsLeaderboardOpen(false)}
        entries={leaderboard}
      />

      {/* Faucet Modal */}
      <FaucetModal
        isOpen={isFaucetOpen}
        onClose={() => setIsFaucetOpen(false)}
        onClaimCoins={(amount) => handleUpdateCoins(amount)}
      />

      {/* Supabase Auth Modal */}
      <AuthModal
        isOpen={isAuthOpen}
        onClose={() => setIsAuthOpen(false)}
        onAuthSuccess={() => {
          const supabase = createClient();
          if (supabase) {
            supabase.auth.getUser().then(({ data: { user: authUser } }) => {
              if (authUser) fetchUserProfile(authUser.id, authUser.email);
            });
            fetchMessages();
            fetchLeaderboard();
          }
        }}
      />

      {/* Footer */}
      <footer className="border-t border-white/[0.06] bg-black py-6 mt-12 text-center text-xs text-zinc-500 font-mono">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>RECREO // ARCADE & CHAT</span>
          <div className="flex items-center gap-3 text-zinc-400">
            <span>Next.js 16</span>
            <span>·</span>
            <span>Supabase Realtime</span>
            <span>·</span>
            <span>Web Audio</span>
            <span>·</span>
            <span className="text-emerald-400">Despliegue Vercel</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
