'use client';

import React, { useState, useEffect } from 'react';
import { Navbar } from '@/components/Navbar';
import { ScheduleWidget } from '@/components/ScheduleWidget';
import { DeadlinesTab } from '@/components/DeadlinesTab';
import { CheatsheetsTab } from '@/components/CheatsheetsTab';
import { QuotesTab } from '@/components/QuotesTab';
import { SwitchRouletteTab } from '@/components/SwitchRouletteTab';
import { WallTab } from '@/components/WallTab';
import { AuthModal } from '@/components/AuthModal';
import {
  INITIAL_USER,
  INITIAL_DEADLINES,
  INITIAL_RESOURCES,
  INITIAL_QUOTES,
  INITIAL_WALL,
} from '@/lib/mock-data';
import { Deadline, Resource, Quote, WallMessage, Profile } from '@/lib/types';
import { Flame, Terminal, MessageSquareQuote, Dices, Radio, Sparkles, ExternalLink, Heart } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

export default function Home() {
  const [activeTab, setActiveTab] = useState<'marrones' | 'chuletas' | 'quotes' | 'ruleta' | 'muro'>('marrones');
  const [user, setUser] = useState<Profile | null>(INITIAL_USER);
  const [deadlines, setDeadlines] = useState<Deadline[]>(INITIAL_DEADLINES);
  const [resources, setResources] = useState<Resource[]>(INITIAL_RESOURCES);
  const [quotes, setQuotes] = useState<Quote[]>(INITIAL_QUOTES);
  const [wall, setWall] = useState<WallMessage[]>(INITIAL_WALL);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isSupabaseConfigured, setIsSupabaseConfigured] = useState(false);

  // Check Supabase connection on mount
  useEffect(() => {
    const supabase = createClient();
    if (supabase) {
      setIsSupabaseConfigured(true);
      // Try to load dynamic data from Supabase if tables exist
      const fetchData = async () => {
        try {
          const { data: dbDeadlines } = await supabase.from('deadlines').select('*').order('due_date', { ascending: true });
          if (dbDeadlines && dbDeadlines.length > 0) setDeadlines(dbDeadlines);

          const { data: dbResources } = await supabase.from('resources').select('*').order('upvotes', { ascending: false });
          if (dbResources && dbResources.length > 0) setResources(dbResources);

          const { data: dbQuotes } = await supabase.from('quotes').select('*').order('upvotes', { ascending: false });
          if (dbQuotes && dbQuotes.length > 0) setQuotes(dbQuotes);

          const { data: dbWall } = await supabase.from('wall_messages').select('*').order('created_at', { ascending: false });
          if (dbWall && dbWall.length > 0) setWall(dbWall);
        } catch (err) {
          console.warn('Error fetching Supabase data, using default local data:', err);
        }
      };
      fetchData();
    }
  }, []);

  // Handlers for state updates
  const handleAddDeadline = (newDeadline: Omit<Deadline, 'id'>) => {
    const item: Deadline = {
      ...newDeadline,
      id: `d-${Date.now()}`,
    };
    setDeadlines((prev) => [item, ...prev]);

    // Persist to Supabase if available
    const supabase = createClient();
    if (supabase) {
      supabase.from('deadlines').insert([item]).then();
    }
  };

  const handleAddResource = (newRes: Omit<Resource, 'id'>) => {
    const item: Resource = {
      ...newRes,
      id: `r-${Date.now()}`,
    };
    setResources((prev) => [item, ...prev]);

    const supabase = createClient();
    if (supabase) {
      supabase.from('resources').insert([item]).then();
    }
  };

  const handleUpvoteResource = (id: string) => {
    setResources((prev) =>
      prev.map((r) => (r.id === id ? { ...r, upvotes: r.upvotes + 1 } : r))
    );

    const supabase = createClient();
    if (supabase) {
      supabase.rpc('increment_resource_upvote', { resource_row_id: id }).then();
    }
  };

  const handleAddQuote = (newQuote: Omit<Quote, 'id'>) => {
    const item: Quote = {
      ...newQuote,
      id: `q-${Date.now()}`,
    };
    setQuotes((prev) => [item, ...prev]);

    const supabase = createClient();
    if (supabase) {
      supabase.from('quotes').insert([item]).then();
    }
  };

  const handleUpvoteQuote = (id: string) => {
    setQuotes((prev) =>
      prev.map((q) => (q.id === id ? { ...q, upvotes: q.upvotes + 1 } : q))
    );

    const supabase = createClient();
    if (supabase) {
      supabase.rpc('increment_quote_upvote', { quote_row_id: id }).then();
    }
  };

  const handleAddWallMessage = (newMsg: Omit<WallMessage, 'id'>) => {
    const item: WallMessage = {
      ...newMsg,
      id: `w-${Date.now()}`,
    };
    setWall((prev) => [item, ...prev]);

    const supabase = createClient();
    if (supabase) {
      supabase.from('wall_messages').insert([item]).then();
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#090d16] text-slate-100 selection:bg-emerald-500 selection:text-black">
      {/* Top navigation */}
      <Navbar
        user={user}
        onOpenAuth={() => setIsAuthModalOpen(true)}
        isSupabaseConfigured={isSupabaseConfigured}
      />

      {/* Main container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* Real-time schedule ticker */}
        <ScheduleWidget />

        {/* Navigation Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-2 border-b border-zinc-800">
          <button
            onClick={() => setActiveTab('marrones')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-mono text-xs sm:text-sm font-bold transition-all shrink-0 cursor-pointer ${
              activeTab === 'marrones'
                ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40 shadow-sm'
                : 'bg-zinc-900/60 text-zinc-400 hover:text-white hover:bg-zinc-800/80 border border-transparent'
            }`}
          >
            <Flame className="w-4 h-4 text-rose-400" />
            <span>Marrones & Exámenes</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-rose-500/30 text-rose-200">
              {deadlines.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('chuletas')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-mono text-xs sm:text-sm font-bold transition-all shrink-0 cursor-pointer ${
              activeTab === 'chuletas'
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-sm'
                : 'bg-zinc-900/60 text-zinc-400 hover:text-white hover:bg-zinc-800/80 border border-transparent'
            }`}
          >
            <Terminal className="w-4 h-4 text-emerald-400" />
            <span>Chuletas & Scripts</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-emerald-500/30 text-emerald-200">
              {resources.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('quotes')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-mono text-xs sm:text-sm font-bold transition-all shrink-0 cursor-pointer ${
              activeTab === 'quotes'
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-sm'
                : 'bg-zinc-900/60 text-zinc-400 hover:text-white hover:bg-zinc-800/80 border border-transparent'
            }`}
          >
            <MessageSquareQuote className="w-4 h-4 text-amber-400" />
            <span>Frases Célebres</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-amber-500/30 text-amber-200">
              {quotes.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('ruleta')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-mono text-xs sm:text-sm font-bold transition-all shrink-0 cursor-pointer ${
              activeTab === 'ruleta'
                ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40 shadow-sm'
                : 'bg-zinc-900/60 text-zinc-400 hover:text-white hover:bg-zinc-800/80 border border-transparent'
            }`}
          >
            <Dices className="w-4 h-4 text-purple-400" />
            <span>Ruleta del Switch</span>
          </button>

          <button
            onClick={() => setActiveTab('muro')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-mono text-xs sm:text-sm font-bold transition-all shrink-0 cursor-pointer ${
              activeTab === 'muro'
                ? 'bg-sky-500/20 text-sky-300 border border-sky-500/40 shadow-sm'
                : 'bg-zinc-900/60 text-zinc-400 hover:text-white hover:bg-zinc-800/80 border border-transparent'
            }`}
          >
            <Radio className="w-4 h-4 text-sky-400" />
            <span>El Ping de Clase</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-sky-500/30 text-sky-200">
              {wall.length}
            </span>
          </button>
        </div>

        {/* Tab content */}
        <div className="py-2">
          {activeTab === 'marrones' && (
            <DeadlinesTab
              deadlines={deadlines}
              onAddDeadline={handleAddDeadline}
              currentUsername={user?.username}
            />
          )}

          {activeTab === 'chuletas' && (
            <CheatsheetsTab
              resources={resources}
              onAddResource={handleAddResource}
              onUpvoteResource={handleUpvoteResource}
              currentUsername={user?.username}
            />
          )}

          {activeTab === 'quotes' && (
            <QuotesTab
              quotes={quotes}
              onAddQuote={handleAddQuote}
              onUpvoteQuote={handleUpvoteQuote}
              currentUsername={user?.username}
            />
          )}

          {activeTab === 'ruleta' && <SwitchRouletteTab />}

          {activeTab === 'muro' && (
            <WallTab
              messages={wall}
              onAddMessage={handleAddWallMessage}
              currentUsername={user?.username}
              currentUserRank={user?.rank}
            />
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-zinc-800/80 bg-zinc-950/60 py-6 mt-12 text-center text-xs text-zinc-500 font-mono">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p>
            Portal de 2º SMR · Diseñado para sobrevivir a las prácticas de servidores y redes.
          </p>
          <div className="flex items-center gap-4 text-zinc-400">
            <span>Next.js 16</span>
            <span>·</span>
            <span>Tailwind CSS</span>
            <span>·</span>
            <span>Supabase</span>
            <span>·</span>
            <span className="text-emerald-400 font-semibold">Listo para Vercel</span>
          </div>
        </div>
      </footer>

      {/* Auth / Profile Modal */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        currentUser={user}
        onSetCustomUser={setUser}
        isSupabaseConfigured={isSupabaseConfigured}
      />
    </div>
  );
}
