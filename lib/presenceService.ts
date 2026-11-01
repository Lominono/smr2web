import { useEffect, useState, useRef, useCallback } from 'react';
import { UserProfile, OnlineUser } from '@/lib/types';
import { createClient, isSupabaseConfigured } from '@/lib/supabase/client';

const STORAGE_PRESENCE_KEY = 'smr2_presence_cache_v1';
const BROADCAST_CHANNEL_NAME = 'smr2_presence_channel';
const HEARTBEAT_INTERVAL_MS = 8000;
const STALE_TIMEOUT_MS = 24000;

export function getViewLabel(view?: string): string {
  switch (view) {
    case 'feed':
      return 'En el Feed 💬';
    case 'calendar':
      return 'Viendo Horario 📅';
    case 'party_idle':
      return 'En El Botellón 🍷';
    case 'farmhand':
      return 'En El Huerto 🌱';
    case 'russian_roulette':
      return 'En Ruleta Rusa ⚡';
    case 'crash':
      return 'En Arcade Crash 🚀';
    case 'mines':
      return 'En Buscaminas 💣';
    case 'angry':
      return 'En Angry Cable 🔌';
    case 'roulette':
      return 'En la Ruleta 🎰';
    default:
      return 'Navegando por el aula 🎒';
  }
}

/**
 * Reads local cached presences from localStorage
 */
function readLocalPresences(): Record<string, OnlineUser> {
  if (typeof window === 'undefined') return {};
  try {
    const raw = localStorage.getItem(STORAGE_PRESENCE_KEY);
    if (!raw) return {};
    const parsed: Record<string, OnlineUser> = JSON.parse(raw);
    const now = Date.now();
    // Prune stale presences
    const fresh: Record<string, OnlineUser> = {};
    for (const [id, user] of Object.entries(parsed)) {
      if (now - user.last_ping < STALE_TIMEOUT_MS) {
        fresh[id] = user;
      }
    }
    return fresh;
  } catch {
    return {};
  }
}

function writeLocalPresences(presences: Record<string, OnlineUser>): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_PRESENCE_KEY, JSON.stringify(presences));
  } catch {}
}

/**
 * Unified Realtime Presence Hook
 * Automatically handles Supabase Realtime Presence + BroadcastChannel + LocalStorage fallback
 */
export function useRealtimePresence(user: UserProfile | null, activeView: string = 'feed') {
  const [onlineUsers, setOnlineUsers] = useState<OnlineUser[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const userRef = useRef<UserProfile | null>(user);
  const activeViewRef = useRef<string>(activeView);
  const channelRef = useRef<any>(null);
  const broadcastRef = useRef<BroadcastChannel | null>(null);

  useEffect(() => {
    userRef.current = user;
  }, [user]);

  useEffect(() => {
    activeViewRef.current = activeView;
  }, [activeView]);

  // Compute online list from local and remote states
  const refreshList = useCallback((activeUser: UserProfile | null) => {
    const localMap = readLocalPresences();
    const list = Object.values(localMap);

    if (activeUser) {
      const idx = list.findIndex(
        (u) => u.id === activeUser.id || u.username.toLowerCase() === activeUser.username.toLowerCase()
      );
      const me: OnlineUser = {
        id: activeUser.id,
        username: activeUser.username,
        full_name: activeUser.full_name,
        student_number: activeUser.student_number,
        avatar_color: activeUser.avatar_color || 'emerald',
        role: activeUser.role || 'student',
        coins: activeUser.coins,
        current_view: activeViewRef.current,
        online_at: new Date().toISOString(),
        last_ping: Date.now(),
        is_current_user: true,
      };

      if (idx !== -1) {
        list[idx] = me;
      } else {
        list.unshift(me);
      }
    }

    // Sort: current user first, then by role, then by coins
    const sorted = list
      .map((u) => ({
        ...u,
        is_current_user: Boolean(activeUser && (u.id === activeUser.id || u.username.toLowerCase() === activeUser.username.toLowerCase())),
      }))
      .sort((a, b) => {
        if (a.is_current_user) return -1;
        if (b.is_current_user) return 1;
        if (a.role === 'admin' && b.role !== 'admin') return -1;
        if (b.role === 'admin' && a.role !== 'admin') return 1;
        return (b.coins ?? 0) - (a.coins ?? 0);
      });

    setOnlineUsers(sorted);
  }, []);

  // Set up BroadcastChannel (tab/window communication)
  useEffect(() => {
    if (typeof window === 'undefined') return;

    let bc: BroadcastChannel | null = null;
    try {
      bc = new BroadcastChannel(BROADCAST_CHANNEL_NAME);
      broadcastRef.current = bc;

      bc.onmessage = (event) => {
        const data = event.data;
        if (!data || !data.type) return;

        if (data.type === 'PING' && data.payload) {
          const map = readLocalPresences();
          map[data.payload.id] = data.payload;
          writeLocalPresences(map);
          refreshList(userRef.current);
        } else if (data.type === 'LEAVE' && data.userId) {
          const map = readLocalPresences();
          delete map[data.userId];
          writeLocalPresences(map);
          refreshList(userRef.current);
        }
      };
    } catch {
      // BroadcastChannel unsupported
    }

    return () => {
      if (bc) {
        bc.close();
      }
    };
  }, [refreshList]);

  // Main presence lifecycle & Supabase integration
  useEffect(() => {
    if (!user) {
      setIsConnected(false);
      setOnlineUsers([]);
      return;
    }

    const presencePayload: OnlineUser = {
      id: user.id,
      username: user.username,
      full_name: user.full_name,
      student_number: user.student_number,
      avatar_color: user.avatar_color || 'emerald',
      role: user.role || 'student',
      coins: user.coins,
      current_view: activeView,
      online_at: new Date().toISOString(),
      last_ping: Date.now(),
      is_current_user: true,
    };

    // 1. Save and broadcast locally
    const map = readLocalPresences();
    map[user.id] = presencePayload;
    writeLocalPresences(map);
    refreshList(user);

    if (broadcastRef.current) {
      try {
        broadcastRef.current.postMessage({ type: 'PING', payload: presencePayload });
      } catch {}
    }

    // 2. Supabase Realtime Presence
    const hasSupabase = isSupabaseConfigured();
    const supabase = createClient();

    if (hasSupabase && supabase) {
      const channel = supabase.channel('smr2_presence_global', {
        config: {
          presence: {
            key: user.id,
          },
        },
      });

      channelRef.current = channel;

      channel
        .on('presence', { event: 'sync' }, () => {
          setIsConnected(true);
          const state = channel.presenceState();
          const remoteUsersMap = readLocalPresences();

          for (const key of Object.keys(state)) {
            const presences = state[key] as any[];
            if (presences && presences.length > 0) {
              const latest = presences[presences.length - 1];
              if (latest && latest.id) {
                remoteUsersMap[latest.id] = {
                  id: latest.id,
                  username: latest.username || 'alumno',
                  full_name: latest.full_name,
                  student_number: latest.student_number,
                  avatar_color: latest.avatar_color || 'emerald',
                  role: latest.role || 'student',
                  coins: Number(latest.coins ?? 1000),
                  current_view: latest.current_view || 'feed',
                  online_at: latest.online_at || new Date().toISOString(),
                  last_ping: Date.now(),
                };
              }
            }
          }

          writeLocalPresences(remoteUsersMap);
          refreshList(userRef.current);
        })
        .on('presence', { event: 'join' }, ({ newPresences }: { newPresences: any[] }) => {
          const remoteMap = readLocalPresences();
          newPresences.forEach((p) => {
            if (p.id) {
              remoteMap[p.id] = {
                id: p.id,
                username: p.username || 'alumno',
                full_name: p.full_name,
                student_number: p.student_number,
                avatar_color: p.avatar_color || 'emerald',
                role: p.role || 'student',
                coins: Number(p.coins ?? 1000),
                current_view: p.current_view || 'feed',
                online_at: p.online_at || new Date().toISOString(),
                last_ping: Date.now(),
              };
            }
          });
          writeLocalPresences(remoteMap);
          refreshList(userRef.current);
        })
        .on('presence', { event: 'leave' }, ({ leftPresences }: { leftPresences: any[] }) => {
          const remoteMap = readLocalPresences();
          leftPresences.forEach((p) => {
            if (p.id) delete remoteMap[p.id];
          });
          writeLocalPresences(remoteMap);
          refreshList(userRef.current);
        })
        .subscribe(async (status: string) => {
          if (status === 'SUBSCRIBED') {
            setIsConnected(true);
            await channel.track(presencePayload);
          }
        });
    } else {
      setIsConnected(true);
    }

    // 3. Heartbeat interval
    const heartbeat = setInterval(() => {
      const current = userRef.current;
      if (!current) return;

      const pingPayload: OnlineUser = {
        id: current.id,
        username: current.username,
        full_name: current.full_name,
        student_number: current.student_number,
        avatar_color: current.avatar_color || 'emerald',
        role: current.role || 'student',
        coins: current.coins,
        current_view: activeViewRef.current,
        online_at: new Date().toISOString(),
        last_ping: Date.now(),
        is_current_user: true,
      };

      const localMap = readLocalPresences();
      localMap[current.id] = pingPayload;
      writeLocalPresences(localMap);
      refreshList(current);

      if (broadcastRef.current) {
        try {
          broadcastRef.current.postMessage({ type: 'PING', payload: pingPayload });
        } catch {}
      }

      if (channelRef.current && hasSupabase) {
        try {
          channelRef.current.track(pingPayload);
        } catch {}
      }
    }, HEARTBEAT_INTERVAL_MS);

    // 4. Window beforeunload cleanup
    const handleUnload = () => {
      if (user) {
        const localMap = readLocalPresences();
        delete localMap[user.id];
        writeLocalPresences(localMap);

        if (broadcastRef.current) {
          try {
            broadcastRef.current.postMessage({ type: 'LEAVE', userId: user.id });
          } catch {}
        }

        if (channelRef.current) {
          try {
            channelRef.current.untrack();
          } catch {}
        }
      }
    };

    window.addEventListener('beforeunload', handleUnload);

    return () => {
      clearInterval(heartbeat);
      window.removeEventListener('beforeunload', handleUnload);
      handleUnload();

      if (channelRef.current && supabase) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [user?.id, activeView, refreshList]);

  return {
    onlineUsers,
    onlineCount: onlineUsers.length,
    isConnected,
  };
}
