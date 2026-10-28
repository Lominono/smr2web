'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
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
import { PartyIdleGame } from '@/components/PartyIdleGame';
import { FarmhandGame } from '@/components/FarmhandGame';
import { LeaderboardModal } from '@/components/LeaderboardModal';
import { FaucetModal } from '@/components/FaucetModal';
import { AuthModal } from '@/components/AuthModal';
import { AuthGate } from '@/components/AuthGate';
import { ScheduleCalendarView } from '@/components/ScheduleCalendarView';
import { MobileTabBar } from '@/components/MobileTabBar';
import { MinecraftBanner } from '@/components/MinecraftBanner';
import { TermsModal } from '@/components/TermsModal';
import { CookieBanner } from '@/components/CookieBanner';
import { UpdateNotificationBanner } from '@/components/UpdateNotificationBanner';
import { UserSettingsModal } from '@/components/UserSettingsModal';
import { StudentIdentificationModal } from '@/components/StudentIdentificationModal';
import { OnlineUsersModal } from '@/components/OnlineUsersModal';
import { PushNotificationModal } from '@/components/PushNotificationModal';
import { FeedbackModal } from '@/components/FeedbackModal';
import { RealtimeToast, RealtimeNotification } from '@/components/RealtimeToast';
import { UserProfile, ChatMessage, LeaderboardEntry, CalendarEvent } from '@/lib/types';
import { useRealtimePresence } from '@/lib/presenceService';
import { registerServiceWorker } from '@/lib/webPushService';
import { sound } from '@/lib/audio';
import { createClient, isSupabaseConfigured } from '@/lib/supabase/client';
import {
  getUserSession,
  saveUserSession,
  clearUserSession,
  updateSessionCoins,
  getLocalAccountsList,
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
  Wine,
  Sprout,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';

type ViewMode =
  | 'feed'
  | 'calendar'
  | 'russian_roulette'
  | 'crash'
  | 'mines'
  | 'angry'
  | 'roulette'
  | 'party_idle'
  | 'farmhand';

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
  const [isOnlineUsersOpen, setIsOnlineUsersOpen] = useState(false);
  const [isPushModalOpen, setIsPushModalOpen] = useState(false);
  const [isFeedbackOpen, setIsFeedbackOpen] = useState(false);
  const [isRealtimeConnected, setIsRealtimeConnected] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [dismissedIdentification, setDismissedIdentification] = useState(false);
  const [supabaseConfigured, setSupabaseConfigured] = useState(true);
  const [realtimeNotification, setRealtimeNotification] = useState<RealtimeNotification | null>(null);

  // Real-time presence hook (tracks active user view and aggregates online classmates)
  const { onlineUsers, onlineCount } = useRealtimePresence(user, activeView);

  const composerRef = useRef<HTMLTextAreaElement | null>(null);
  const userRef = useRef<UserProfile | null>(user);
  const notificationsEnabledRef = useRef(notificationsEnabled);

  useEffect(() => {
    userRef.current = user;
  }, [user]);

  useEffect(() => {
    notificationsEnabledRef.current = notificationsEnabled;
  }, [notificationsEnabled]);

  // Load sound and notification preferences on mount
  useEffect(() => {
    try {
      const savedAudio = localStorage.getItem('smr2_sound_enabled');
      if (savedAudio !== null) {
        const isEnabled = savedAudio === 'true';
        setSoundEnabled(isEnabled);
        sound.enabled = isEnabled;
      }
      const savedNotifs = localStorage.getItem('smr2_notifications_enabled');
      if (savedNotifs !== null) {
        setNotificationsEnabled(savedNotifs === 'true');
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

  const handleToggleNotifications = () => {
    const nextState = !notificationsEnabled;
    setNotificationsEnabled(nextState);
    try {
      localStorage.setItem('smr2_notifications_enabled', String(nextState));
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
          coins: Number(data.coins ?? 1000),
          biggest_win: Number(data.biggest_win ?? 0),
          streak_count: data.streak_count ? Number(data.streak_count) : 1,
          last_claim_date: data.last_claim_date || undefined,
          last_spin_date: data.last_spin_date || undefined,
          last_rescue_date: data.last_rescue_date || undefined,
          role: data.role || (data.username === 'admin' ? 'admin' : 'student'),
          avatar_color: data.avatar_color || 'emerald',
          games_played: data.games_played ? Number(data.games_played) : 0,
          games_won: data.games_won ? Number(data.games_won) : 0,
          sound_enabled: soundEnabled,
          notifications_enabled: notificationsEnabled,
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
          avatar_color: 'emerald',
          games_played: 0,
          games_won: 0,
          sound_enabled: soundEnabled,
          notifications_enabled: notificationsEnabled,
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
        .limit(80);

      if (data) {
        // Consultar los likes del usuario activo para persistir is_liked_by_me
        const activeUserId = userRef.current?.id;
        const myLikedMessageIds = new Set<string>();

        if (activeUserId) {
          try {
            const { data: likesData } = await supabase
              .from('chat_message_likes')
              .select('message_id')
              .eq('user_id', activeUserId);

            if (likesData) {
              likesData.forEach((row: any) => myLikedMessageIds.add(row.message_id));
            }
          } catch {}
        }

        setChatMessages(
          data.map((m: any) => ({
            ...m,
            likes_count: Number(m.likes_count || 0),
            is_liked_by_me: myLikedMessageIds.has(m.id),
            created_at: m.created_at,
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

  const fetchLeaderboard = useCallback(async () => {
    const entriesMap = new Map<string, LeaderboardEntry>();
    const activeUser = userRef.current;

    // 1. Consultar perfiles oficiales de Supabase
    const supabase = createClient();
    if (supabase) {
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('id, username, full_name, coins, biggest_win, streak_count, avatar_color, role')
          .order('coins', { ascending: false });

        if (!error && data && data.length > 0) {
          data.forEach((p: any) => {
            entriesMap.set(p.username.toLowerCase(), {
              id: p.id,
              username: p.username,
              full_name: p.full_name || undefined,
              coins: Number(p.coins ?? 0),
              biggest_win: Number(p.biggest_win ?? 0),
              streak_count: p.streak_count ? Number(p.streak_count) : 1,
              avatar_color: p.avatar_color || undefined,
              role: p.role || undefined,
              is_current_user: activeUser ? (p.id === activeUser.id || p.username.toLowerCase() === activeUser.username.toLowerCase()) : false,
            });
          });
        }
      } catch (err) {
        console.warn('Error fetching leaderboard from Supabase:', err);
      }
    }

    // 2. Si la consulta directa devolvió solo al usuario actual o falló por políticas RLS en Supabase,
    // consultar el endpoint autorizado del servidor para garantizar que aparezcan todos los alumnos
    try {
      const res = await fetch('/api/leaderboard', { cache: 'no-store' });
      if (res.ok) {
        const json = await res.json();
        if (json.success && Array.isArray(json.leaderboard)) {
          json.leaderboard.forEach((p: LeaderboardEntry) => {
            const key = p.username.toLowerCase();
            const existing = entriesMap.get(key);
            if (!existing) {
              entriesMap.set(key, {
                ...p,
                is_current_user: activeUser ? (p.id === activeUser.id || key === activeUser.username.toLowerCase()) : false,
              });
            } else {
              // Mantener el saldo más alto o actualizado
              entriesMap.set(key, {
                ...existing,
                coins: Math.max(existing.coins, Number(p.coins ?? 0)),
                biggest_win: Math.max(existing.biggest_win, Number(p.biggest_win ?? 0)),
              });
            }
          });
        }
      }
    } catch (apiErr) {
      console.warn('Error fetching /api/leaderboard:', apiErr);
    }

    // 2. Incluir cuentas locales para que el ranking funcione siempre (online y offline)
    try {
      const localAccounts = getLocalAccountsList();
      localAccounts.forEach((loc) => {
        const key = loc.username.toLowerCase();
        if (!entriesMap.has(key)) {
          entriesMap.set(key, {
            id: loc.id,
            username: loc.username,
            full_name: loc.full_name,
            coins: Number(loc.coins ?? 1000),
            biggest_win: Number(loc.biggest_win ?? 0),
            streak_count: Number(loc.streak_count ?? 1),
            role: loc.role,
            is_current_user: activeUser ? (loc.id === activeUser.id || key === activeUser.username.toLowerCase()) : false,
          });
        }
      });
    } catch {}

    // 3. Asegurar que el usuario activo esté presente con sus monedas exactas en tiempo real
    if (activeUser) {
      const userKey = activeUser.username.toLowerCase();
      const existing = entriesMap.get(userKey);
      entriesMap.set(userKey, {
        id: activeUser.id,
        username: activeUser.username,
        full_name: activeUser.full_name || existing?.full_name,
        coins: activeUser.coins,
        biggest_win: Math.max(activeUser.biggest_win, existing?.biggest_win || 0),
        streak_count: activeUser.streak_count || existing?.streak_count || 1,
        avatar_color: activeUser.avatar_color || existing?.avatar_color,
        role: activeUser.role || existing?.role,
        is_current_user: true,
      });
    }

    // 4. Ordenar estrictamente por monedas DESC, mayor bote DESC y racha DESC
    const sorted = Array.from(entriesMap.values()).sort((a, b) => {
      if ((b.coins ?? 0) !== (a.coins ?? 0)) {
        return (b.coins ?? 0) - (a.coins ?? 0);
      }
      if ((b.biggest_win ?? 0) !== (a.biggest_win ?? 0)) {
        return (b.biggest_win ?? 0) - (a.biggest_win ?? 0);
      }
      return (b.streak_count ?? 1) - (a.streak_count ?? 1);
    });

    setLeaderboard(sorted);
  }, []);

  const fetchLeaderboardRef = useRef(fetchLeaderboard);
  useEffect(() => {
    fetchLeaderboardRef.current = fetchLeaderboard;
  }, [fetchLeaderboard]);

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

    // Multi-table Realtime subscription: Chat, Calendar, System Updates and Profiles
    const channel = supabase
      .channel('portal_global_realtime')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'chat_messages' },
        (payload) => {
          const newMsg = payload.new as any;
          setChatMessages((prev) => {
            if (prev.some((m) => m.id === newMsg.id)) return prev;

            const formatted: ChatMessage = {
              ...newMsg,
              likes_count: Number(newMsg.likes_count || 0),
              created_at: newMsg.created_at,
            };

            // Si hay un mensaje optimista del mismo usuario con el mismo texto, reemplazarlo
            const optIndex = prev.findIndex(
              (m) =>
                (m.id.startsWith('opt_') || m.id.startsWith('win_')) &&
                m.user_id === newMsg.user_id &&
                m.text === newMsg.text
            );

            if (optIndex !== -1) {
              const copy = [...prev];
              copy[optIndex] = {
                ...copy[optIndex],
                ...formatted,
              };
              return copy;
            }

            return [formatted, ...prev];
          });

          // Trigger realtime toast notification if message is from a classmate
          if (notificationsEnabledRef.current && userRef.current && newMsg.user_id !== userRef.current.id) {
            if (newMsg.is_system_win) {
              setRealtimeNotification({
                id: String(Date.now()),
                type: 'win',
                title: 'Recreo',
                description: `@${newMsg.username}: +${Number(newMsg.win_amount || 0).toLocaleString('es-ES')} fichas`,
                actionLabel: 'Ver',
                onAction: () => setActiveView('feed'),
              });
            } else {
              setRealtimeNotification({
                id: String(Date.now()),
                type: 'chat',
                title: newMsg.pinned ? `Aviso fijado: @${newMsg.username}` : `@${newMsg.username}`,
                description: newMsg.text.replace(/^\[#.*?\]\s*/, ''),
                actionLabel: 'Ver',
                onAction: () => setActiveView('feed'),
              });
            }
          }
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'chat_messages' },
        (payload) => {
          const updatedMsg = payload.new as any;
          if (updatedMsg?.id) {
            setChatMessages((prev) =>
              prev.map((msg) =>
                msg.id === updatedMsg.id
                  ? {
                      ...msg,
                      ...updatedMsg,
                      likes_count: Number(updatedMsg.likes_count || 0),
                      is_liked_by_me: msg.is_liked_by_me,
                    }
                  : msg
              )
            );
          }
        }
      )
      .on(
        'postgres_changes',
        { event: 'DELETE', schema: 'public', table: 'chat_messages' },
        (payload) => {
          const oldMsg = payload.old as any;
          if (oldMsg?.id) {
            setChatMessages((prev) => prev.filter((m) => m.id !== oldMsg.id));
          } else {
            fetchMessages();
          }
        }
      )
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'announcements' },
        (payload) => {
          const ann = payload.new as any;
          if (notificationsEnabledRef.current && ann) {
            setRealtimeNotification({
              id: String(Date.now()),
              type: 'system_update',
              title: ann.title || '📢 Comunicado oficial',
              description: ann.body || 'Nuevo aviso de clase emitido.',
              actionLabel: 'Ver feed',
              onAction: () => setActiveView('feed'),
            });
          }
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'calendar_events' },
        (payload) => {
          fetchCalendarEvents();
          if (notificationsEnabledRef.current) {
            const ev = (payload.new || payload.old) as any;
            setRealtimeNotification({
              id: String(Date.now()),
              type: 'calendar',
              title: 'Agenda de clase actualizada',
              description: ev?.title
                ? `Evento: ${ev.title} (${ev.subject || ''})`
                : 'Se han actualizado fechas o tareas en directo.',
              actionLabel: 'Ver horario',
              onAction: () => setActiveView('calendar'),
            });
          }
        }
      )
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'app_updates' },
        (payload) => {
          const upd = payload.new as any;
          setRealtimeNotification({
            id: String(Date.now()),
            type: 'system_update',
            title: upd.title || 'Actualización en tiempo real',
            description: upd.description || `Nueva versión ${upd.version || ''} disponible.`,
            actionLabel: 'Recargar',
            onAction: () => window.location.reload(),
          });
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'profiles' },
        (payload) => {
          const updated = payload.new as any;
          if (updated && updated.username) {
            setLeaderboard((prev) => {
              const active = userRef.current;
              const uKey = String(updated.username).toLowerCase();
              const idx = prev.findIndex(
                (e) => e.id === updated.id || e.username.toLowerCase() === uKey
              );
              const isCurrent = active
                ? (updated.id === active.id || uKey === active.username.toLowerCase())
                : false;
              const finalCoins = isCurrent && active
                ? Math.max(Number(updated.coins ?? 0), active.coins)
                : Number(updated.coins ?? 0);

              let nextList: LeaderboardEntry[];
              if (idx !== -1) {
                nextList = [...prev];
                nextList[idx] = {
                  ...nextList[idx],
                  coins: finalCoins,
                  biggest_win: Number(updated.biggest_win ?? nextList[idx].biggest_win),
                  streak_count: Number(updated.streak_count ?? nextList[idx].streak_count ?? 1),
                  avatar_color: updated.avatar_color || nextList[idx].avatar_color,
                  role: updated.role || nextList[idx].role,
                  is_current_user: isCurrent,
                };
              } else {
                nextList = [
                  ...prev,
                  {
                    id: updated.id,
                    username: updated.username,
                    full_name: updated.full_name || undefined,
                    coins: finalCoins,
                    biggest_win: Number(updated.biggest_win ?? 0),
                    streak_count: Number(updated.streak_count ?? 1),
                    avatar_color: updated.avatar_color || undefined,
                    role: updated.role || undefined,
                    is_current_user: isCurrent,
                  },
                ];
              }

              return nextList.sort((a, b) => {
                if ((b.coins ?? 0) !== (a.coins ?? 0)) return (b.coins ?? 0) - (a.coins ?? 0);
                if ((b.biggest_win ?? 0) !== (a.biggest_win ?? 0)) return (b.biggest_win ?? 0) - (a.biggest_win ?? 0);
                return (b.streak_count ?? 1) - (a.streak_count ?? 1);
              });
            });
          }

          fetchLeaderboardRef.current?.();
        }
      )
      .subscribe((status) => {
        setIsRealtimeConnected(status === 'SUBSCRIBED');
      });

    return () => {
      authListener.subscription.unsubscribe();
      supabase.removeChannel(channel);
      setIsRealtimeConnected(false);
    };
  }, []);

  // Registrar Service Worker para notificaciones push en segundo plano
  useEffect(() => {
    registerServiceWorker();
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

  const handleUpdateCoins = async (rawDelta: number) => {
    if (!user) {
      setIsAuthOpen(true);
      return;
    }

    // Transacción monetaria: permitir cobros íntegros de botes y cosechas legítimas (sin truncar a 25.000)
    const delta = isNaN(rawDelta) ? 0 : Math.round(rawDelta);

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

    // Actualizar clasificación en memoria de forma instantánea
    setLeaderboard((prev) => {
      const idx = prev.findIndex((entry) => entry.id === user.id || entry.username.toLowerCase() === user.username.toLowerCase());
      let updated: LeaderboardEntry[];
      if (idx !== -1) {
        updated = [...prev];
        updated[idx] = {
          ...updated[idx],
          coins: nextCoins,
          biggest_win: nextBiggestWin,
          is_current_user: true,
        };
      } else {
        updated = [
          ...prev,
          {
            id: user.id,
            username: user.username,
            full_name: user.full_name,
            coins: nextCoins,
            biggest_win: nextBiggestWin,
            streak_count: user.streak_count || 1,
            role: user.role,
            is_current_user: true,
          },
        ];
      }
      return updated.sort((a, b) => (b.coins ?? 0) - (a.coins ?? 0));
    });

    const supabase = createClient();
    if (supabase) {
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

    // Actualizar clasificación en memoria de forma instantánea
    setLeaderboard((prev) => {
      const idx = prev.findIndex((entry) => entry.id === user.id || entry.username.toLowerCase() === user.username.toLowerCase());
      if (idx !== -1) {
        const updated = [...prev];
        updated[idx] = {
          ...updated[idx],
          coins: nextCoins,
          streak_count: nextStreakVal,
          is_current_user: true,
        };
        return updated.sort((a, b) => (b.coins ?? 0) - (a.coins ?? 0));
      }
      return prev;
    });

    const supabase = createClient();
    if (supabase) {
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

  const handleSendMessage = async (text: string, tag?: string, pinned?: boolean) => {
    if (!user) {
      setIsAuthOpen(true);
      return;
    }

    const optimisticId = `opt_${Date.now()}`;
    const optimisticMsg: ChatMessage = {
      id: optimisticId,
      user_id: user.id,
      username: user.username,
      text,
      tag: tag || undefined,
      pinned: Boolean(pinned),
      likes_count: 0,
      is_liked_by_me: false,
      created_at: new Date().toISOString(),
    };
    setChatMessages((prev) => [optimisticMsg, ...prev]);

    const supabase = createClient();
    if (!supabase) return;

    try {
      const payload: Record<string, any> = {
        user_id: user.id,
        username: user.username,
        text,
      };
      if (tag) payload.tag = tag;
      if (pinned) payload.pinned = true;

      const { data, error } = await supabase.from('chat_messages').insert([payload]).select().single();
      if (!error && data) {
        setChatMessages((prev) =>
          prev.map((m) => (m.id === optimisticId ? { ...m, id: data.id, created_at: data.created_at } : m))
        );
      }
    } catch (err) {
      console.warn('Error inserting message to Supabase:', err);
    }
  };

  const handleDeleteMessage = async (messageId: string) => {
    sound.tap();
    setChatMessages((prev) => prev.filter((m) => m.id !== messageId));

    const supabase = createClient();
    if (!supabase) return;

    try {
      await supabase.from('chat_messages').delete().eq('id', messageId);
    } catch (err) {
      console.warn('Error deleting message from Supabase:', err);
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

  const handleToggleLike = async (messageId: string) => {
    sound.tap();

    let nextCount = 0;
    let willBeLiked = false;

    setChatMessages((prev) =>
      prev.map((msg) => {
        if (msg.id === messageId) {
          willBeLiked = !msg.is_liked_by_me;
          nextCount = Math.max(0, (msg.likes_count || 0) + (willBeLiked ? 1 : -1));
          return {
            ...msg,
            is_liked_by_me: willBeLiked,
            likes_count: nextCount,
          };
        }
        return msg;
      })
    );

    const supabase = createClient();
    if (!supabase) return;

    try {
      await supabase
        .from('chat_messages')
        .update({ likes_count: nextCount })
        .eq('id', messageId);

      if (user) {
        if (willBeLiked) {
          await supabase.from('chat_message_likes').upsert(
            [
              {
                message_id: messageId,
                user_id: user.id,
              },
            ],
            { onConflict: 'message_id,user_id' }
          );
        } else {
          await supabase
            .from('chat_message_likes')
            .delete()
            .eq('message_id', messageId)
            .eq('user_id', user.id);
        }
      }
    } catch (err) {
      console.warn('Error updating message likes:', err);
    }
  };

  // Loading splash screen
  if (authLoading) {
    return (
      <div className="min-h-[100dvh] bg-background flex flex-col items-center justify-center p-4">
        <div className="flex flex-col items-center gap-3.5 animate-in fade-in duration-300">
          <div className="w-16 h-16 flex items-center justify-center">
            <img
              src="/logo.png"
              alt="SMR2 Logo"
              className="w-full h-full object-contain drop-shadow-xs"
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
        onlineCount={onlineCount}
        onOpenOnlineUsers={() => setIsOnlineUsersOpen(true)}
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
                  onOpenFeedback={() => setIsFeedbackOpen(true)}
                  onlineCount={onlineCount}
                  onOpenOnlineUsers={() => setIsOnlineUsersOpen(true)}
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
                  onDeleteMessage={handleDeleteMessage}
                  onTipUser={handleTipUser}
                  onToggleLike={handleToggleLike}
                  onOpenNotifications={() => setIsPushModalOpen(true)}
                  isRealtimeConnected={isRealtimeConnected}
                  composerRef={composerRef}
                />
              </div>

              {/* Right Sidebar Widgets (Desktop) */}
              <div className="hidden lg:block lg:col-span-3 sticky top-16 max-h-[calc(100dvh-4.5rem)] overflow-y-auto overscroll-contain scrollbar-none pr-0.5">
                <DesktopWidgets
                  currentUser={user}
                  events={calendarEvents}
                  leaderboard={leaderboard}
                  onlineUsers={onlineUsers}
                  onOpenOnlineUsers={() => setIsOnlineUsersOpen(true)}
                  onOpenSchedule={() => setActiveView('calendar')}
                  onOpenLeaderboard={() => setIsLeaderboardOpen(true)}
                  onOpenFaucet={() => setIsFaucetOpen(true)}
                  onOpenRussianRoulette={() => setActiveView('russian_roulette')}
                  onOpenPartyIdle={() => setActiveView('party_idle')}
                  onOpenFarmhand={() => setActiveView('farmhand')}
                  onUpdateCoins={handleUpdateCoins}
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
                <div className="flex items-center p-1 rounded-full bg-surface-raised border border-border/70 overflow-x-auto scrollbar-none gap-0.5">
                  {[
                    { id: 'farmhand', label: 'El Huerto', icon: Sprout },
                    { id: 'party_idle', label: 'El Botellón', icon: Wine },
                    { id: 'russian_roulette', label: 'Ruleta Rusa', icon: Zap },
                    { id: 'crash', label: 'Crash', icon: TrendingUp },
                    { id: 'mines', label: 'Minas', icon: Server },
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
              {activeView === 'farmhand' ? (
                <FarmhandGame
                  userCoins={user ? user.coins : 200}
                  userId={user?.id}
                  onUpdateCoins={handleUpdateCoins}
                  onNavigateGame={(g) => setActiveView(g as ViewMode)}
                />
              ) : activeView === 'party_idle' ? (
                <PartyIdleGame
                  userCoins={user ? user.coins : 200}
                  userId={user?.id}
                  username={user?.username}
                  onUpdateCoins={handleUpdateCoins}
                  onNavigateGame={(g) => setActiveView(g as ViewMode)}
                  onRequireAuth={() => setIsAuthOpen(true)}
                  onBroadcastWin={handleBroadcastWin}
                />
              ) : activeView === 'angry' ? (
                <AngryCableGame
                  userCoins={user ? user.coins : 200}
                  onUpdateCoins={handleUpdateCoins}
                  onNavigateGame={(g) => setActiveView(g as ViewMode)}
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

      {/* 5. The 3-Line Menu Drawer */}
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
        onOpenNotifications={() => setIsPushModalOpen(true)}
        onOpenFeedback={() => setIsFeedbackOpen(true)}
        soundEnabled={soundEnabled}
        onToggleSound={handleToggleSound}
        onSignOut={handleSignOut}
        onlineCount={onlineCount}
        onOpenOnlineUsers={() => setIsOnlineUsersOpen(true)}
      />

      {/* 6. Modals */}
      <LeaderboardModal
        isOpen={isLeaderboardOpen}
        onClose={() => setIsLeaderboardOpen(false)}
        entries={leaderboard}
        currentUser={user}
        onlineUsers={onlineUsers}
        onRefresh={fetchLeaderboard}
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
        onUpdateUser={(updated) => {
          setUser(updated);
          fetchLeaderboard();
        }}
        onSignOut={handleSignOut}
        onOpenFaucet={() => setIsFaucetOpen(true)}
        soundEnabled={soundEnabled}
        onToggleSound={handleToggleSound}
        notificationsEnabled={notificationsEnabled}
        onToggleNotifications={handleToggleNotifications}
        onOpenPushModal={() => setIsPushModalOpen(true)}
        onlineCount={onlineCount}
      />

      <OnlineUsersModal
        isOpen={isOnlineUsersOpen}
        onClose={() => setIsOnlineUsersOpen(false)}
        onlineUsers={onlineUsers}
      />

      <TermsModal
        isOpen={isTermsOpen}
        onClose={() => setIsTermsOpen(false)}
      />

      <PushNotificationModal
        isOpen={isPushModalOpen}
        onClose={() => setIsPushModalOpen(false)}
        currentUser={user}
        onOpenAuth={() => setIsAuthOpen(true)}
      />

      <FeedbackModal
        isOpen={isFeedbackOpen}
        onClose={() => setIsFeedbackOpen(false)}
        currentUser={user}
        onOpenAuth={() => setIsAuthOpen(true)}
      />

      {/* 7. Student Identification Onboarding Gate (Required: Real Name & Unique Student Number) */}
      <StudentIdentificationModal
        isOpen={Boolean(
          user &&
          user.role !== 'admin' &&
          user.username !== 'admin' &&
          !dismissedIdentification &&
          (!user.full_name || !user.student_number)
        )}
        user={user}
        onSuccess={(updated) => {
          setUser(updated);
          fetchLeaderboard();
        }}
        onSignOut={handleSignOut}
        onSkip={() => setDismissedIdentification(true)}
      />

      <CookieBanner
        onOpenTerms={() => setIsTermsOpen(true)}
      />

      {/* Actualizaciones del sistema en vivo */}
      <UpdateNotificationBanner />

      {/* 8. Live Realtime Notification Banner */}
      <RealtimeToast
        notification={realtimeNotification}
        onDismiss={() => setRealtimeNotification(null)}
      />

      {/* 9. Footer */}
      <footer className="border-t border-border/70 bg-surface/80 py-5 mt-10 mb-16 lg:mb-0 text-center text-xs text-foreground-muted">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-6 h-6 flex items-center justify-center shrink-0">
              <img src="/logo.png" alt="SMR2" className="w-full h-full object-contain drop-shadow-xs" />
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
              Normas y Privacidad
            </button>
            <span>Curso lectivo</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
