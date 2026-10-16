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
import { Target, TrendingUp, AlertCircle } from 'lucide-react';

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

  const handleToggleSound = () => {
    const nextState = !soundEnabled;
    setSoundEnabled(nextState);
    sound.enabled = nextState;
  };

  const fetchUserProfile = async (userId: string, email?: string) => {
    const supabase = createClient();
    if (!supabase) return;

    try {
      const { data } = await supabase
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
    const supabase = createClient();
    if (!supabase) {
      setSupabaseConfigured(false);
      return;
    }

    supabase.auth.getUser().then(({ data: { user: authUser } }) => {
      if (authUser) {
        fetchUserProfile(authUser.id, authUser.email);
      }
    });

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        fetchUserProfile(session.user.id, session.user.email);
      } else {
        setUser(null);
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

    const supabase = createClient();
    if (supabase) {
      await supabase
        .from('profiles')
        .update({ coins: nextCoins, biggest_win: nextBiggestWin })
        .eq('id', user.id);
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

  const handleBroadcastWin = async (game: 'angry' | 'crash', multiplier: number, winAmount: number) => {
    if (!user) return;
    const gameLabel = game === 'angry' ? 'Slingshot' : 'Crash';

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

  return (
    <div className="min-h-screen flex flex-col bg-[#09090b] text-zinc-100 selection:bg-white selection:text-black">
      {/* Top Navbar */}
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

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-5 space-y-5">
        {!supabaseConfigured && (
          <div className="p-3.5 rounded-2xl bg-amber-500/[0.08] border border-amber-500/20 text-xs font-mono text-amber-300 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
            <span>Configura NEXT_PUBLIC_SUPABASE_URL y ANON_KEY en tu .env.local para sincronizar la base de datos.</span>
          </div>
        )}

        {/* Tactile Mode Switcher */}
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="inline-flex p-1 rounded-xl bg-black/40 border border-white/[0.08]">
            <button
              onClick={() => {
                setActiveGame('angry');
                sound.tap();
              }}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-mono font-medium transition-all cursor-pointer ${
                activeGame === 'angry'
                  ? 'bg-zinc-200 text-black font-semibold shadow-sm'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              <Target className="w-3.5 h-3.5 text-emerald-500" />
              <span>Slingshot</span>
            </button>

            <button
              onClick={() => {
                setActiveGame('crash');
                sound.tap();
              }}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-mono font-medium transition-all cursor-pointer ${
                activeGame === 'crash'
                  ? 'bg-zinc-200 text-black font-semibold shadow-sm'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              <TrendingUp className="w-3.5 h-3.5 text-rose-500" />
              <span>Crash</span>
            </button>
          </div>

          <div className="text-[11px] text-zinc-500 font-mono hidden md:block">
            {user ? `@${user.username} conectado` : 'Sesión de invitado'}
          </div>
        </div>

        {/* 2-Column Responsive Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
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

          <div className="hidden lg:block lg:col-span-4 sticky top-20">
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
        <div className="fixed inset-0 z-50 lg:hidden flex flex-col bg-black/90 backdrop-blur-md p-4 animate-in fade-in duration-150">
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

      {/* Modals */}
      <LeaderboardModal
        isOpen={isLeaderboardOpen}
        onClose={() => setIsLeaderboardOpen(false)}
        entries={leaderboard}
      />

      <FaucetModal
        isOpen={isFaucetOpen}
        onClose={() => setIsFaucetOpen(false)}
        onClaimCoins={(amount) => handleUpdateCoins(amount)}
      />

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
      <footer className="border-t border-white/[0.06] bg-black py-4 mt-8 text-center text-[11px] text-zinc-500 font-mono">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>RECREO</span>
          <div className="flex items-center gap-3 text-zinc-400">
            <span>Next.js 16</span>
            <span>·</span>
            <span>Supabase Realtime</span>
            <span>·</span>
            <span>Web Audio API</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
