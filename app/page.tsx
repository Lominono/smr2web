'use client';

import React, { useState, useEffect } from 'react';
import { AppleNavbar } from '@/components/AppleNavbar';
import { AngryCableGame } from '@/components/AngryCableGame';
import { CrashGame } from '@/components/CrashGame';
import { LiveChat } from '@/components/LiveChat';
import { LeaderboardModal } from '@/components/LeaderboardModal';
import { FaucetModal } from '@/components/FaucetModal';
import { INITIAL_USER, INITIAL_CHAT, INITIAL_LEADERBOARD } from '@/lib/mock-data';
import { UserProfile, ChatMessage, LeaderboardEntry } from '@/lib/types';
import { sound } from '@/lib/audio';
import { createClient } from '@/lib/supabase/client';
import { Zap, TrendingUp, MessageCircle, Trophy, Sparkles } from 'lucide-react';

export default function Home() {
  const [user, setUser] = useState<UserProfile>(INITIAL_USER);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>(INITIAL_CHAT);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>(INITIAL_LEADERBOARD);
  const [activeGame, setActiveGame] = useState<'angry' | 'crash'>('angry');
  const [isLeaderboardOpen, setIsLeaderboardOpen] = useState(false);
  const [isFaucetOpen, setIsFaucetOpen] = useState(false);
  const [isChatDrawerOpen, setIsChatDrawerOpen] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);

  // Sync sound setting
  const handleToggleSound = () => {
    const nextState = !soundEnabled;
    setSoundEnabled(nextState);
    sound.enabled = nextState;
  };

  // Update user coins & update leaderboard entry
  const handleUpdateCoins = (delta: number) => {
    setUser((prev) => {
      const nextCoins = Math.max(0, prev.coins + delta);
      const isWin = delta > 0;
      const nextBiggestWin = isWin && delta > prev.biggest_win ? delta : prev.biggest_win;

      // Update current user in leaderboard
      setLeaderboard((lPrev) =>
        lPrev.map((entry) =>
          entry.is_current_user
            ? { ...entry, coins: nextCoins, biggest_win: nextBiggestWin }
            : entry
        )
      );

      return {
        ...prev,
        coins: nextCoins,
        net_profit: prev.net_profit + delta,
        biggest_win: nextBiggestWin,
        bankrupt_count: nextCoins === 0 ? prev.bankrupt_count + 1 : prev.bankrupt_count,
      };
    });
  };

  // Send message to chat
  const handleSendMessage = (text: string) => {
    const newMsg: ChatMessage = {
      id: `c-${Date.now()}`,
      user_id: user.id,
      username: user.username,
      avatar_url: user.avatar_url,
      text,
      created_at: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setChatMessages((prev) => [...prev, newMsg]);

    // Send to Supabase if configured
    const supabase = createClient();
    if (supabase) {
      supabase.from('chat_messages').insert([newMsg]).then();
    }
  };

  // Broadcast big win to the classroom chat
  const handleBroadcastWin = (game: 'angry' | 'crash', multiplier: number, winAmount: number) => {
    const gameName = game === 'angry' ? 'Angry Cable' : 'Kernel Crash';
    const broadcastMsg: ChatMessage = {
      id: `sys-${Date.now()}`,
      user_id: 'sys',
      username: 'SISTEMA',
      avatar_url: '',
      text: `🔥 ¡@${user.username} acaba de ganar ${winAmount.toLocaleString()} 🪙 (x${multiplier.toFixed(2)}) en ${gameName}!`,
      created_at: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      is_system_win: true,
      win_amount: winAmount,
      multiplier,
      game,
    };

    setChatMessages((prev) => [...prev, broadcastMsg]);
  };

  // Tip classmate coins
  const handleTipUser = (targetUsername: string, amount: number) => {
    if (user.coins < amount) {
      sound.broke();
      alert('No tienes suficientes monedas para dar esa propina.');
      return;
    }

    handleUpdateCoins(-amount);
    sound.coinWin();

    const tipMsg: ChatMessage = {
      id: `tip-${Date.now()}`,
      user_id: 'sys',
      username: 'SISTEMA',
      avatar_url: '',
      text: `💸 @${user.username} le ha pasado ${amount} 🪙 de propina a @${targetUsername}`,
      created_at: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      is_system_win: true,
      win_amount: amount,
    };

    setChatMessages((prev) => [...prev, tipMsg]);
  };

  return (
    <div className="min-h-screen flex flex-col bg-black text-white selection:bg-emerald-500 selection:text-black">
      {/* Apple Frosted Navbar */}
      <AppleNavbar
        user={user}
        onOpenFaucet={() => setIsFaucetOpen(true)}
        onOpenLeaderboard={() => setIsLeaderboardOpen(true)}
        onToggleChat={() => setIsChatDrawerOpen(!isChatDrawerOpen)}
        isChatOpen={isChatDrawerOpen}
        soundEnabled={soundEnabled}
        onToggleSound={handleToggleSound}
      />

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-6 space-y-6">
        {/* Apple Segmented Game Switcher */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="inline-flex p-1 rounded-2xl bg-white/[0.05] border border-white/[0.08] backdrop-blur-xl">
            <button
              onClick={() => {
                setActiveGame('angry');
                sound.tap();
              }}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold tracking-tight transition-all cursor-pointer ${
                activeGame === 'angry'
                  ? 'bg-white text-black shadow-lg font-bold'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              <Zap className="w-4 h-4 text-emerald-500" />
              <span>Angry Cable (Tirachinas)</span>
            </button>

            <button
              onClick={() => {
                setActiveGame('crash');
                sound.tap();
              }}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold tracking-tight transition-all cursor-pointer ${
                activeGame === 'crash'
                  ? 'bg-white text-black shadow-lg font-bold'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              <TrendingUp className="w-4 h-4 text-rose-500" />
              <span>Kernel Crash (Multiplicador)</span>
            </button>
          </div>

          <div className="text-xs text-zinc-500 font-mono hidden md:block">
            Apuestas 100% ficticias para el recreo · Piques entre amigos
          </div>
        </div>

        {/* 2-Column Responsive Layout: Game + Chat */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left Column: Game Area */}
          <div className="lg:col-span-8 space-y-4">
            {activeGame === 'angry' ? (
              <AngryCableGame
                userCoins={user.coins}
                onUpdateCoins={handleUpdateCoins}
                onBroadcastWin={handleBroadcastWin}
              />
            ) : (
              <CrashGame
                userCoins={user.coins}
                onUpdateCoins={handleUpdateCoins}
                onBroadcastWin={handleBroadcastWin}
              />
            )}
          </div>

          {/* Right Column: Live Chat (Desktop) */}
          <div className="hidden lg:block lg:col-span-4 sticky top-24">
            <LiveChat
              messages={chatMessages}
              currentUser={user}
              onSendMessage={handleSendMessage}
              onTipUser={handleTipUser}
            />
          </div>
        </div>
      </main>

      {/* Mobile Floating / Drawer Chat Modal */}
      {isChatDrawerOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex flex-col bg-black/85 backdrop-blur-md p-4 animate-in fade-in duration-200">
          <div className="flex-1 max-w-lg w-full mx-auto flex flex-col">
            <LiveChat
              messages={chatMessages}
              currentUser={user}
              onSendMessage={handleSendMessage}
              onTipUser={handleTipUser}
              onClose={() => setIsChatDrawerOpen(false)}
              isDrawer={true}
            />
          </div>
        </div>
      )}

      {/* Leaderboard Modal */}
      <LeaderboardModal
        isOpen={isLeaderboardOpen}
        onClose={() => setIsLeaderboardOpen(false)}
        entries={leaderboard}
      />

      {/* Faucet / Beca Modal */}
      <FaucetModal
        isOpen={isFaucetOpen}
        onClose={() => setIsFaucetOpen(false)}
        onClaimCoins={(amount) => handleUpdateCoins(amount)}
      />

      {/* Footer */}
      <footer className="border-t border-white/[0.06] bg-black py-6 mt-12 text-center text-xs text-zinc-500 font-mono">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>RECREO // ARCADE & CHAT DE CLASE</span>
          <div className="flex items-center gap-3 text-zinc-400">
            <span>Next.js 16</span>
            <span>·</span>
            <span>Web Audio API</span>
            <span>·</span>
            <span>HTML5 Physics Canvas</span>
            <span>·</span>
            <span className="text-emerald-400">Listo para Vercel</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
