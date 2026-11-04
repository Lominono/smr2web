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
import { LaunchCountdownBanner } from '@/components/LaunchCountdownBanner';
import { LaunchCountdownGate, TARGET_LAUNCH_TIMESTAMP } from '@/components/LaunchCountdownGate';
import { LaunchDevToolbar, DevLaunchState } from '@/components/LaunchDevToolbar';
import { PRELAUNCH_STORAGE_KEY } from '@/lib/prelaunchConstants';
import { TermsModal } from '@/components/TermsModal';
import { MobileNotice } from '@/components/MobileNotice';
import { CookieBanner } from '@/components/CookieBanner';
import { UpdateNotificationBanner } from '@/components/UpdateNotificationBanner';
import { UserSettingsModal } from '@/components/UserSettingsModal';
import { WindowsWelcomeModal } from '@/components/WindowsWelcomeModal';
import { PutoIsaacTour } from '@/components/PutoIsaacTour';
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
  checkAndEnforceSystemWipe,
} from '@/lib/authSession';
import { logoutAccount } from '@/lib/authService';
import { isUUID } from '@/lib/uuid';
import { isTableAvailable, markTableMissing, isTableMissingError } from '@/lib/dbCapabilities';
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
  const [isWindowsWelcomeOpen, setIsWindowsWelcomeOpen] = useState(false);
  const [isIsaacTourOpen, setIsIsaacTourOpen] = useState(false);
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
  const [isSiteUnlocked, setIsSiteUnlocked] = useState(false);
  const [isTourActive, setIsTourActive] = useState(false);

  // Estados de control para desarrolladores (Debug y ajustes de diseño)
  const [isAdmin, setIsAdmin] = useState(false);
  const [devLaunchState, setDevLaunchState] = useState<DevLaunchState | null>(null);
  const [devSpeedMultiplier, setDevSpeedMultiplier] = useState(1);
  const [devWelcomeKey, setDevWelcomeKey] = useState(0);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const storedToken = localStorage.getItem(PRELAUNCH_STORAGE_KEY);
      if (storedToken && storedToken.includes('.') && storedToken.length > 20) {
        setIsAdmin(true);
      }
    }
  }, []);

  useEffect(() => {
    if (user?.role === 'admin') {
      setIsAdmin(true);
    }
  }, [user?.role]);

  useEffect(() => {
    // Los previews forzados por URL son exclusivos para administradores autorizados
    if (isAdmin && typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const preview = params.get('preview');
      if (preview === 'welcome') setDevLaunchState('welcome');
      else if (preview === 'loading') setDevLaunchState('loading');
      else if (preview === 'countdown') setDevLaunchState('countdown');
      else if (preview === 'auth') setDevLaunchState('auth');
    }
  }, [isAdmin]);

  const handleLockAdmin = () => {
    setIsAdmin(false);
    setDevLaunchState(null);
    try {
      localStorage.removeItem(PRELAUNCH_STORAGE_KEY);
      localStorage.removeItem('smr2_launch_welcome_seen');
      localStorage.removeItem('smr2_prelaunch_bypass');
    } catch {}
  };

  useEffect(() => {
    try {
      const tourDone = localStorage.getItem('smr2_putoisaac_tour_done') === 'true';
      if (!tourDone) {
        setIsTourActive(true);
      }
    } catch {}

    const handleTourCompleted = () => setIsTourActive(false);
    window.addEventListener('smr2_tour_completed', handleTourCompleted);
    return () => window.removeEventListener('smr2_tour_completed', handleTourCompleted);
  }, []);

  const handleIsaacSelectTab = useCallback((tab: 'chat' | 'investments' | 'schedule' | 'russian_roulette') => {
    if (tab === 'investments') setActiveView('party_idle');
    else if (tab === 'chat') setActiveView('feed');
    else if (tab === 'schedule') setActiveView('calendar');
    else if (tab === 'russian_roulette') setActiveView('russian_roulette');
  }, []);

  // Real-time presence hook (tracks active user view and aggregates online classmates)
  const { onlineUsers, onlineCount } = useRealtimePresence(user, activeView);

  // Easter Egg secreto - Disparador forense restringido para los más observadores y técnicos
  const secretTapCountRef = useRef(0);
  const secretTapTimerRef = useRef<NodeJS.Timeout | null>(null);

  const handleSecretTrigger = useCallback(() => {
    secretTapCountRef.current += 1;
    if (secretTapTimerRef.current) clearTimeout(secretTapTimerRef.current);
    if (secretTapCountRef.current >= 9) {
      secretTapCountRef.current = 0;
      const code = window.prompt('[GATEWAY KERNEL ttyS0 - AUTH REQUIRED]\nIntroduzca comando o token criptográfico de enlace:');
      if (
        code &&
        (code.trim().toLowerCase() === 'ssh root@aula35' ||
          code.trim().toLowerCase() === 'davidgay')
      ) {
        try { sound.tap(); } catch {}
        window.location.href = '/admin';
      }
      return;
    }
    secretTapTimerRef.current = setTimeout(() => {
      secretTapCountRef.current = 0;
    }, 2000);
  }, []);

  // Atajos de terminal encubiertos ('ssh root@aula35', 'sudo su -' o Ctrl+Alt+Shift+A) y telemetra crptica
  useEffect(() => {
    let keyBuffer = '';
    const handleKeyDown = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName?.toLowerCase();
      if (tag === 'input' || tag === 'textarea' || (e.target as HTMLElement)?.isContentEditable) {
        return;
      }
      if (e.ctrlKey && e.altKey && e.shiftKey && e.key.toLowerCase() === 'a') {
        e.preventDefault();
        try { sound.tap(); } catch {}
        window.location.href = '/admin';
        return;
      }
      keyBuffer = (keyBuffer + e.key.toLowerCase()).slice(-20);
      if (keyBuffer.endsWith('ssh root@aula35') || keyBuffer.endsWith('sudo su -')) {
        try { sound.tap(); } catch {}
        window.location.href = '/admin';
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    console.log(
      '%c[kernel]%c eth0: 192.168.35.1/24 up. SMR2 diagnostic sub-system armed. Diagnostic shell ttyS0 status: LISTEN.',
      'color: #10b981; font-weight: bold; font-family: monospace;',
      'color: #52525b; font-family: monospace;'
    );

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  const composerRef = useRef<HTMLTextAreaElement | null>(null);
  const userRef = useRef<UserProfile | null>(user);
  const notificationsEnabledRef = useRef(notificationsEnabled);
  const globalChannelRef = useRef<any>(null);

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
    if (!userId || !isUUID(userId)) return;
    const supabase = createClient();
    if (!supabase) return;

    try {
      const { data } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      if (data) {
        const rawUsername = data.username || (data.nombre ? String(data.nombre).toLowerCase().replace(/\s+/g, '_') : `user_${data.id?.slice(0, 5)}`);
        const profile: UserProfile = {
          id: data.id,
          username: rawUsername,
          full_name: data.full_name || data.nombre || undefined,
          student_number: data.student_number || undefined,
          email: data.email || email,
          coins: Number(data.coins ?? data.puntos_total ?? 1000),
          biggest_win: Number(data.biggest_win ?? 0),
          streak_count: Number(data.streak_count ?? data.racha_actual ?? 1),
          last_claim_date: data.last_claim_date || undefined,
          last_spin_date: data.last_spin_date || undefined,
          last_rescue_date: data.last_rescue_date || undefined,
          role:
            data.rol === 'admin' || data.role === 'admin'
              ? 'admin'
              : data.rol === 'delegado' || data.role === 'delegado'
              ? 'delegado'
              : 'student',
          avatar_color: data.avatar_color || data.color_acento || 'emerald',
          games_played: Number(data.games_played ?? 0),
          games_won: Number(data.games_won ?? 0),
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
        const role: 'admin' | 'delegado' | 'student' = 'student';

        try {
          await supabase.from('profiles').upsert(
            [
              {
                id: userId,
                username: fallbackUsername,
                email: email || null,
                coins: 1000,
                puntos_total: 1000,
                full_name: fallbackUsername,
                nombre: fallbackUsername,
                biggest_win: 0,
                streak_count: 1,
                racha_actual: 1,
                role: 'student',
                rol: 'alumno',
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
          } else {
            const { data: legacyLikes } = await supabase
              .from('message_likes')
              .select('message_id')
              .eq('user_id', activeUserId);
            if (legacyLikes) {
              legacyLikes.forEach((row: any) => myLikedMessageIds.add(row.message_id));
            }
          }
        } catch {}
      }

      // 1. Intentar consultar chat_messages si está disponible
      if (isTableAvailable('chat_messages')) {
        const { data, error } = await supabase
          .from('chat_messages')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(80);

        if (error) {
          if (isTableMissingError(error)) {
            markTableMissing('chat_messages');
          }
        } else if (data && data.length > 0) {
          setChatMessages(
            data.map((m: any) => ({
              ...m,
              likes_count: Number(m.likes_count || 0),
              is_liked_by_me: myLikedMessageIds.has(m.id),
              created_at: m.created_at,
            }))
          );
          return;
        }
      }

      // 2. Si chat_messages no está disponible (404), consultar tabla 'messages'
      if (isTableAvailable('messages')) {
        try {
          const { data: legacyMessages, error: legacyErr } = await supabase
            .from('messages')
            .select(`
              id,
              user_id,
              texto,
              created_at,
              likes_count,
              fijado,
              canal,
              reply_to_nombre,
              profiles!messages_user_id_fkey ( id, username, nombre )
            `)
            .order('created_at', { ascending: false })
            .limit(80);

          if (legacyErr && isTableMissingError(legacyErr)) {
            markTableMissing('messages');
          } else if (legacyMessages && legacyMessages.length > 0) {
            setChatMessages(
              legacyMessages.map((m: any) => {
                // Si el mensaje fue vinculado a la cuenta del sistema (00000000...) o perfil genérico, recuperar el nombre original guardado en reply_to_nombre
                const authorUsername =
                  m.user_id === '00000000-0000-4000-a000-000000000000'
                    ? (m.reply_to_nombre || 'SMR2')
                    : (m.profiles?.username && m.profiles.username !== 'banca_sistema'
                        ? m.profiles.username
                        : (m.reply_to_nombre || m.profiles?.nombre || 'alumno'));

                return {
                  id: m.id,
                  user_id: m.user_id,
                  username: authorUsername,
                  text: m.texto,
                  tag: m.canal === 'general' ? undefined : m.canal,
                  pinned: Boolean(m.fijado),
                  likes_count: Number(m.likes_count || 0),
                  is_liked_by_me: myLikedMessageIds.has(m.id),
                  created_at: m.created_at,
                };
              })
            );
          }
        } catch (_) {
          markTableMissing('messages');
        }
      }
    } catch (err) {
      console.warn('Error fetching messages:', err);
    }
  };

  const fetchCalendarEvents = async () => {
    const supabase = createClient();
    if (supabase && isTableAvailable('calendar_events')) {
      try {
        const { data, error } = await supabase
          .from('calendar_events')
          .select('*')
          .order('event_date', { ascending: true })
          .limit(6);

        if (error) {
          if (isTableMissingError(error)) {
            markTableMissing('calendar_events');
          }
        } else if (data && data.length > 0) {
          setCalendarEvents(data);
          try {
            localStorage.setItem('smr2_calendar_events', JSON.stringify(data));
          } catch {}
          return;
        }
      } catch (err) {
        markTableMissing('calendar_events');
      }
    }

    // Fallback a localStorage o eventos predeterminados
    try {
      const cached = localStorage.getItem('smr2_calendar_events');
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setCalendarEvents(parsed);
          return;
        }
      }

      const defaultEvents: CalendarEvent[] = [
        {
          id: 'def_1',
          title: 'Práctica Servidor DNS BIND9',
          event_date: '2026-11-04',
          event_type: 'homework',
          subject: 'SR',
          description: 'Configuración de zona directa e inversa en Linux Server.',
          created_at: new Date().toISOString(),
        },
        {
          id: 'def_2',
          title: 'Examen Active Directory y GPO',
          event_date: '2026-11-12',
          event_type: 'exam',
          subject: 'SOR',
          description: 'Controladores de dominio, unidades organizativas y directivas.',
          created_at: new Date().toISOString(),
        },
        {
          id: 'def_3',
          title: 'Entrega Proyecto Web MariaDB',
          event_date: '2026-11-19',
          event_type: 'homework',
          subject: 'AW',
          description: 'Instalación LAMP, base de datos MariaDB y despliegue.',
          created_at: new Date().toISOString(),
        },
      ];
      setCalendarEvents(defaultEvents);
      localStorage.setItem('smr2_calendar_events', JSON.stringify(defaultEvents));
    } catch {}
  };

  const fetchLeaderboard = useCallback(async () => {
    const entriesMap = new Map<string, LeaderboardEntry>();
    const activeUser = userRef.current;

    // 1. Consultar perfiles de Supabase de manera tolerante al esquema
    const supabase = createClient();
    if (supabase) {
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('*');

        if (!error && data && data.length > 0) {
          data.forEach((p: any) => {
            const rawUsername = (p.username || (p.nombre ? String(p.nombre).toLowerCase().replace(/\s+/g, '_') : `user_${p.id?.slice(0, 5)}`)).trim();
            const coinsVal = Number(p.coins ?? p.puntos_total ?? 1000);
            entriesMap.set(rawUsername.toLowerCase(), {
              id: p.id,
              username: rawUsername,
              full_name: p.full_name || p.nombre || undefined,
              coins: coinsVal,
              biggest_win: Number(p.biggest_win ?? 0),
              streak_count: Number(p.streak_count ?? p.racha_actual ?? 1),
              avatar_color: p.avatar_color || p.color_acento || 'emerald',
              role:
                p.rol === 'admin' || p.role === 'admin'
                  ? 'admin'
                  : p.rol === 'delegado' || p.role === 'delegado'
                  ? 'delegado'
                  : 'student',
              is_current_user: activeUser ? (p.id === activeUser.id || rawUsername.toLowerCase() === activeUser.username.toLowerCase()) : false,
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
    // Comprobar estado de salida oficial (9 de noviembre a las 8:35 AM)
    const isLaunched = Date.now() >= TARGET_LAUNCH_TIMESTAMP;
    
    // Verificación criptográfica segura para acceso anticipado de administradores
    let hasValidToken = false;
    if (typeof window !== 'undefined') {
      try {
        localStorage.removeItem('smr2_prelaunch_bypass'); // Invalida cualquier bypass inseguro anterior
        const storedToken = localStorage.getItem(PRELAUNCH_STORAGE_KEY);
        if (storedToken && storedToken.includes('.') && storedToken.length > 20) {
          hasValidToken = true;
        }
      } catch {}
    }
    setIsSiteUnlocked(isLaunched || hasValidToken);

    // 0. Forzar reseteo absoluto de datos locales si la época de reinicio no se ha aplicado
    const wasWiped = checkAndEnforceSystemWipe();
    if (wasWiped) {
      try {
        const sb = createClient();
        if (sb) sb.auth.signOut().catch(() => {});
      } catch {}
    }

    // 1. Synchronously read local cookie session first for instant resume without flashing
    const cachedSession = wasWiped ? null : getUserSession();
    if (cachedSession) {
      setUser(cachedSession);
      setAuthLoading(false);

      if (typeof window !== 'undefined') {
        const dismissed = localStorage.getItem('smr2_windows_welcome_dismissed');
        if (dismissed !== 'true') {
          setIsWindowsWelcomeOpen(true);
        } else {
          // Solo iniciar el tour automticamente si el alumno NO tiene pendiente identificarse
          const needsId = Boolean(
            cachedSession &&
            cachedSession.role !== 'admin' &&
            cachedSession.username !== 'admin' &&
            (!cachedSession.full_name || !cachedSession.student_number)
          );
          if (!needsId) {
            const tourDone = localStorage.getItem('smr2_putoisaac_tour_done') === 'true';
            if (!tourDone) {
              setTimeout(() => setIsIsaacTourOpen(true), 900);
            }
          }
        }
      }
    } else {
      setUser(null);
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
    const channel = supabase.channel('portal_global_realtime');
    globalChannelRef.current = channel;

    // Escucha local instantánea entre pestañas
    let chatBc: BroadcastChannel | null = null;
    try {
      chatBc = new BroadcastChannel('smr2_chat_realtime_channel');
      chatBc.onmessage = (ev) => {
        if (ev.data?.type === 'NEW_CHAT_MESSAGE' && ev.data.message) {
          const incoming = ev.data.message as ChatMessage;
          setChatMessages((prev) => {
            if (prev.some((m) => m.id === incoming.id)) return prev;
            return [incoming, ...prev];
          });
        }
      };
    } catch (_) {}

    channel
      .on('broadcast', { event: 'new_chat_message' }, (payload: any) => {
        if (payload?.payload) {
          const incoming = payload.payload as ChatMessage;
          setChatMessages((prev) => {
            if (prev.some((m) => m.id === incoming.id)) return prev;
            return [incoming, ...prev];
          });

          if (notificationsEnabledRef.current && userRef.current && incoming.user_id !== userRef.current.id) {
            setRealtimeNotification({
              id: String(Date.now()),
              type: 'chat',
              title: incoming.pinned ? `Aviso fijado: @${incoming.username}` : `@${incoming.username}`,
              description: incoming.text.replace(/^\[#.*?\]\s*/, ''),
              actionLabel: 'Ver',
              onAction: () => setActiveView('feed'),
            });
          }
        }
      })
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
        { event: 'INSERT', schema: 'public', table: 'messages' },
        (payload) => {
          const newMsg = payload.new as any;
          setChatMessages((prev) => {
            if (prev.some((m) => m.id === newMsg.id)) return prev;

            const formatted: ChatMessage = {
              id: newMsg.id,
              user_id: newMsg.user_id,
              username: newMsg.reply_to_nombre || 'alumno',
              text: newMsg.texto,
              tag: newMsg.canal === 'general' ? undefined : newMsg.canal,
              pinned: Boolean(newMsg.fijado),
              likes_count: Number(newMsg.likes_count || 0),
              created_at: newMsg.created_at,
            };

            const optIndex = prev.findIndex(
              (m) =>
                m.id.startsWith('opt_') &&
                m.text === newMsg.texto
            );

            if (optIndex !== -1) {
              const copy = [...prev];
              copy[optIndex] = formatted;
              return copy;
            }

            return [formatted, ...prev];
          });
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
              title: ann.title || 'Comunicado oficial',
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
          if (updated && (updated.username || updated.nombre)) {
            setLeaderboard((prev) => {
              const active = userRef.current;
              const uKey = String(updated.username || updated.nombre).toLowerCase().replace(/\s+/g, '_');
              const idx = prev.findIndex(
                (e) => e.id === updated.id || e.username.toLowerCase() === uKey
              );
              const isCurrent = active
                ? (updated.id === active.id || uKey === active.username.toLowerCase())
                : false;
              const coinsVal = Number(updated.coins ?? updated.puntos_total ?? 0);
              const finalCoins = isCurrent && active
                ? Math.max(coinsVal, active.coins)
                : coinsVal;

              let nextList: LeaderboardEntry[];
              if (idx !== -1) {
                nextList = [...prev];
                nextList[idx] = {
                  ...nextList[idx],
                  coins: finalCoins,
                  biggest_win: Number(updated.biggest_win ?? nextList[idx].biggest_win),
                  streak_count: Number(updated.streak_count ?? updated.racha_actual ?? nextList[idx].streak_count ?? 1),
                  avatar_color: updated.avatar_color || updated.color_acento || nextList[idx].avatar_color,
                  role: updated.role || updated.rol || nextList[idx].role,
                  is_current_user: isCurrent,
                };
              } else {
                nextList = [
                  ...prev,
                  {
                    id: updated.id,
                    username: uKey,
                    full_name: updated.full_name || updated.nombre || undefined,
                    coins: finalCoins,
                    biggest_win: Number(updated.biggest_win ?? 0),
                    streak_count: Number(updated.streak_count ?? updated.racha_actual ?? 1),
                    avatar_color: updated.avatar_color || updated.color_acento || undefined,
                    role: updated.role || updated.rol || undefined,
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
      try {
        if (chatBc) chatBc.close();
      } catch (_) {}
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
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages' },
        (payload) => {
          const newMsg = payload.new as any;
          setChatMessages((prev) => {
            if (prev.some((m) => m.id === newMsg.id)) return prev;

            const formatted: ChatMessage = {
              id: newMsg.id,
              user_id: newMsg.user_id,
              username: newMsg.reply_to_nombre || 'alumno',
              text: newMsg.texto,
              tag: newMsg.canal === 'general' ? undefined : newMsg.canal,
              pinned: Boolean(newMsg.fijado),
              likes_count: Number(newMsg.likes_count || 0),
              created_at: newMsg.created_at,
            };

            const optIndex = prev.findIndex(
              (m) =>
                m.id.startsWith('opt_') &&
                m.text === newMsg.texto
            );

            if (optIndex !== -1) {
              const copy = [...prev];
              copy[optIndex] = formatted;
              return copy;
            }

            return [formatted, ...prev];
          });
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
    if (supabase && isUUID(user.id)) {
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
    if (supabase && isUUID(user.id)) {
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
      const dbUserId = isUUID(user.id) ? user.id : null;
      let data: any = null;
      let error: any = null;

      // Asegurar que el perfil del usuario existe en Supabase para evitar violación de foreign key en messages
      if (dbUserId && user.username) {
        try {
          await supabase.from('profiles').upsert(
            {
              id: dbUserId,
              username: user.username,
              nombre: user.username,
              role: user.role || 'student',
            },
            { onConflict: 'id' }
          );
        } catch (_) {}
      }

      if (isTableAvailable('chat_messages')) {
        const payload: Record<string, any> = {
          username: user.username,
          text,
        };
        if (dbUserId) payload.user_id = dbUserId;
        if (tag) payload.tag = tag;
        if (pinned) payload.pinned = true;

        const res = await supabase.from('chat_messages').insert([payload]).select().single();
        data = res.data;
        error = res.error;

        // Si falla porque no existen columnas tag o pinned en la tabla remota, reintentar sin ellas
        if (error && (tag || pinned)) {
          const simplePayload: Record<string, any> = {
            username: user.username,
            text,
          };
          if (dbUserId) simplePayload.user_id = dbUserId;
          const retry = await supabase.from('chat_messages').insert([simplePayload]).select().single();
          if (retry.data && !retry.error) {
            data = retry.data;
            error = null;
          }
        }

        if (error && isTableMissingError(error)) {
          markTableMissing('chat_messages');
        }
      }

      // Si chat_messages no existe en la base remota (404), insertar en la tabla existente 'messages' si está disponible
      if ((error || !isTableAvailable('chat_messages')) && isTableAvailable('messages')) {
        try {
          const targetUserId = dbUserId || '00000000-0000-4000-a000-000000000000';
          const msgPayload: Record<string, any> = {
            user_id: targetUserId,
            canal: tag ? tag.toLowerCase() : 'general',
            texto: text,
            fijado: Boolean(pinned),
            reply_to_nombre: user.username,
          };
          let legacyInsert = await supabase
            .from('messages')
            .insert([msgPayload])
            .select('id, user_id, canal, texto, created_at, likes_count, reply_to_nombre')
            .single();

          // Si falla por foreign key (usuario local no presente en auth.users/profiles), reintentar con cuenta de sistema asegurando autoría en reply_to_nombre
          if (legacyInsert.error && targetUserId !== '00000000-0000-4000-a000-000000000000') {
            msgPayload.user_id = '00000000-0000-4000-a000-000000000000';
            msgPayload.reply_to_nombre = user.username;
            legacyInsert = await supabase
              .from('messages')
              .insert([msgPayload])
              .select('id, user_id, canal, texto, created_at, likes_count, reply_to_nombre')
              .single();
          }

          if (legacyInsert.data && !legacyInsert.error) {
            data = {
              id: legacyInsert.data.id,
              created_at: legacyInsert.data.created_at,
              likes_count: legacyInsert.data.likes_count || 0,
              username: user.username,
              text,
            };
            error = null;
          } else if (legacyInsert.error && isTableMissingError(legacyInsert.error)) {
            markTableMissing('messages');
          }
        } catch (_) {
          markTableMissing('messages');
        }
      }

      if (error) {
        console.warn('Mensaje publicado en modo local/sesión activa:', error);
        // Mantener el mensaje en la vista y difundir a clientes conectados
        try {
          globalChannelRef.current?.send({
            type: 'broadcast',
            event: 'new_chat_message',
            payload: optimisticMsg,
          });
        } catch (_) {}
        try {
          const bc = new BroadcastChannel('smr2_chat_realtime_channel');
          bc.postMessage({ type: 'NEW_CHAT_MESSAGE', message: optimisticMsg });
          bc.close();
        } catch (_) {}
        return;
      }

      if (data) {
        const confirmedMsg: ChatMessage = {
          ...optimisticMsg,
          id: data.id,
          created_at: data.created_at,
          likes_count: Number(data.likes_count || 0),
        };

        setChatMessages((prev) =>
          prev.map((m) => (m.id === optimisticId ? confirmedMsg : m))
        );

        // Difusión WebSocket instantánea a todos los clientes conectados
        try {
          globalChannelRef.current?.send({
            type: 'broadcast',
            event: 'new_chat_message',
            payload: confirmedMsg,
          });
        } catch (_) {}

        // Difusión entre pestañas locales
        try {
          const bc = new BroadcastChannel('smr2_chat_realtime_channel');
          bc.postMessage({ type: 'NEW_CHAT_MESSAGE', message: confirmedMsg });
          bc.close();
        } catch (_) {}
      }
    } catch (err: any) {
      console.warn('Error general al enviar mensaje:', err);
      setChatMessages((prev) => prev.filter((m) => m.id !== optimisticId));
    }
  };

  const handleDeleteMessage = async (messageId: string) => {
    sound.tap();
    setChatMessages((prev) => prev.filter((m) => m.id !== messageId));

    const supabase = createClient();
    if (!supabase) return;

    try {
      const { error } = await supabase.from('chat_messages').delete().eq('id', messageId);
      if (error) {
        await supabase.from('messages').delete().eq('id', messageId);
      }
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
      const { error } = await supabase.from('chat_messages').insert([
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
      if (error) {
        await supabase.from('messages').insert([
          {
            user_id: user.id,
            canal: 'recreo',
            texto: winText,
            reply_to_nombre: user.username,
          },
        ]);
      }
    } catch {}
  };

  const handleTipUser = async (targetUsername: string, amount: number) => {
    if (!user) {
      setIsAuthOpen(true);
      return;
    }

    if (user.coins < amount) {
      sound.broke();
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

      if (receiver && isUUID(receiver.id)) {
        await supabase
          .from('profiles')
          .update({ coins: Number(receiver.coins || 0) + amount })
          .eq('id', receiver.id);
      }

      const tipText = `🪙 @${user.username} ha enviado una propina de ${amount} fichas a @${targetUsername}`;

      if (isTableAvailable('messages')) {
        try {
          await supabase.from('messages').insert([
            {
              user_id: '00000000-0000-4000-a000-000000000000',
              canal: 'recreo',
              texto: tipText,
              reply_to_nombre: 'SMR2',
            },
          ]);
        } catch (_) {}
      }

      if (isTableAvailable('chat_messages')) {
        try {
          await supabase.from('chat_messages').insert([
            {
              user_id: user.id && isUUID(user.id) ? user.id : null,
              username: 'SISTEMA',
              text: tipText,
              is_system_win: true,
              win_amount: amount,
            },
          ]);
        } catch (_) {}
      }

      // Difundir en tiempo real a todas las pestañas conectadas
      try {
        const bc = new BroadcastChannel('smr2_chat_realtime_channel');
        bc.postMessage({
          type: 'NEW_CHAT_MESSAGE',
          message: {
            id: `tip_${Date.now()}`,
            user_id: '00000000-0000-4000-a000-000000000000',
            username: 'SMR2',
            text: tipText,
            tag: 'recreo',
            created_at: new Date().toISOString(),
          },
        });
        bc.close();
      } catch (_) {}
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
      const { error: msgErr } = await supabase
        .from('chat_messages')
        .update({ likes_count: nextCount })
        .eq('id', messageId);

      if (msgErr) {
        await supabase
          .from('messages')
          .update({ likes_count: nextCount })
          .eq('id', messageId);
      }

      if (user) {
        if (willBeLiked) {
          const { error: likeErr } = await supabase.from('chat_message_likes').upsert(
            [
              {
                message_id: messageId,
                user_id: user.id,
              },
            ],
            { onConflict: 'message_id,user_id' }
          );

          if (likeErr) {
            await supabase.from('message_likes').upsert(
              [
                {
                  message_id: messageId,
                  user_id: user.id,
                },
              ],
              { onConflict: 'message_id,user_id' }
            );
          }
        } else {
          const { error: delErr } = await supabase
            .from('chat_message_likes')
            .delete()
            .eq('message_id', messageId)
            .eq('user_id', user.id);

          if (delErr) {
            await supabase
              .from('message_likes')
              .delete()
              .eq('message_id', messageId)
              .eq('user_id', user.id);
          }
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

  const currentEffectiveState: DevLaunchState =
    devLaunchState ?? (!isSiteUnlocked ? 'countdown' : !user ? 'auth' : 'app');

  // Web cerrada con cuenta regresiva en GRANDE, bienvenida o carga épica Mac
  if (currentEffectiveState === 'countdown' || currentEffectiveState === 'welcome' || currentEffectiveState === 'loading') {
    return (
      <>
        <LaunchCountdownGate
          key={devWelcomeKey}
          forceWelcome={currentEffectiveState === 'welcome'}
          forceLoading={currentEffectiveState === 'loading'}
          speedMultiplier={devSpeedMultiplier}
          onUnlock={() => {
            setIsSiteUnlocked(true);
            if (devLaunchState) {
              setDevLaunchState('auth');
            }
          }}
        />
        <LaunchDevToolbar
          isAdmin={isAdmin}
          onAdminAuthSuccess={() => setIsAdmin(true)}
          onLockAdmin={handleLockAdmin}
          currentState={currentEffectiveState}
          onSetState={setDevLaunchState}
          onTestCountdown={(secs) => {
            setDevLaunchState('countdown');
            setTimeout(() => {
              if (typeof window !== 'undefined' && (window as any).smr2?.testCountdown) {
                (window as any).smr2.testCountdown(secs);
              }
            }, 60);
          }}
          onReplayWelcome={() => {
            setDevLaunchState('welcome');
            setDevWelcomeKey((k) => k + 1);
            setTimeout(() => {
              if (typeof window !== 'undefined' && (window as any).smr2?.replayWelcome) {
                (window as any).smr2.replayWelcome();
              }
            }, 60);
          }}
          speedMultiplier={devSpeedMultiplier}
          onSetSpeed={setDevSpeedMultiplier}
        />
      </>
    );
  }

  // Mandatory Auth Gate (acceso a registro e inicio de sesión tras la salida oficial)
  if (currentEffectiveState === 'auth' || !user) {
    return (
      <>
        <AuthGate
          onAuthSuccess={(profile) => {
            setUser(profile);
            fetchMessages();
            fetchLeaderboard();
            fetchCalendarEvents();
            setIsWindowsWelcomeOpen(true);
            if (devLaunchState) {
              setDevLaunchState('app');
            }
          }}
          supabaseConfigured={supabaseConfigured}
        />
        <LaunchDevToolbar
          isAdmin={isAdmin}
          onAdminAuthSuccess={() => setIsAdmin(true)}
          onLockAdmin={handleLockAdmin}
          currentState={currentEffectiveState}
          onSetState={setDevLaunchState}
          onTestCountdown={(secs) => {
            setDevLaunchState('countdown');
            setTimeout(() => {
              if (typeof window !== 'undefined' && (window as any).smr2?.testCountdown) {
                (window as any).smr2.testCountdown(secs);
              }
            }, 60);
          }}
          onReplayWelcome={() => {
            setDevLaunchState('welcome');
            setDevWelcomeKey((k) => k + 1);
            setTimeout(() => {
              if (typeof window !== 'undefined' && (window as any).smr2?.replayWelcome) {
                (window as any).smr2.replayWelcome();
              }
            }, 60);
          }}
          speedMultiplier={devSpeedMultiplier}
          onSetSpeed={setDevSpeedMultiplier}
        />
      </>
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
          <div className="max-w-7xl mx-auto w-full px-0 sm:px-6 lg:px-8 pt-0 sm:pt-4">
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
              <div className="col-span-1 lg:col-span-6 w-full min-w-0 space-y-2 sm:space-y-3.5">
                {/* Salida Oficial de la Web: Cuenta Regresiva */}
                <LaunchCountdownBanner />

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
                  onOpenFeedback={() => setIsFeedbackOpen(true)}
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
          setIsWindowsWelcomeOpen(true);
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
        onOpenWindowsWelcome={() => setIsWindowsWelcomeOpen(true)}
        onOpenIsaacTour={() => setIsIsaacTourOpen(true)}
      />

      <WindowsWelcomeModal
        isOpen={isWindowsWelcomeOpen}
        user={user}
        onClose={() => {
          setIsWindowsWelcomeOpen(false);
          const needsId = Boolean(
            user &&
            user.role !== 'admin' &&
            user.username !== 'admin' &&
            !dismissedIdentification &&
            (!user.full_name || !user.student_number)
          );
          if (!needsId) {
            try {
              const tourDone = localStorage.getItem('smr2_putoisaac_tour_done') === 'true';
              if (!tourDone) {
                setTimeout(() => setIsIsaacTourOpen(true), 400);
              }
            } catch {}
          }
        }}
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
          !isWindowsWelcomeOpen &&
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
          try {
            const tourDone = localStorage.getItem('smr2_putoisaac_tour_done') === 'true';
            if (!tourDone) {
              setTimeout(() => setIsIsaacTourOpen(true), 600);
            }
          } catch {}
        }}
        onSignOut={handleSignOut}
        onSkip={() => {
          setDismissedIdentification(true);
          try {
            const tourDone = localStorage.getItem('smr2_putoisaac_tour_done') === 'true';
            if (!tourDone) {
              setTimeout(() => setIsIsaacTourOpen(true), 600);
            }
          } catch {}
        }}
      />

      <CookieBanner
        onOpenTerms={() => setIsTermsOpen(true)}
        isBlocked={isTourActive || isIsaacTourOpen}
      />

      {/* Actualizaciones del sistema en vivo (sincronizadas secuencialmente tras el tour) */}
      <UpdateNotificationBanner isBlocked={isTourActive || isIsaacTourOpen} />

      {/* 8. Live Realtime Notification Banner */}
      {!isTourActive && !isIsaacTourOpen && (
        <RealtimeToast
          notification={realtimeNotification}
          onDismiss={() => setRealtimeNotification(null)}
        />
      )}

      {/* 9. PUTOISAAC interactive ball mascot and tour */}
      <PutoIsaacTour
        isOpenControlled={isIsaacTourOpen}
        onCloseControlled={() => setIsIsaacTourOpen(false)}
        onSelectTab={handleIsaacSelectTab}
        onOpenLeaderboard={() => setIsLeaderboardOpen(true)}
        onOpenFaucet={() => setIsFaucetOpen(true)}
        onTourStateChange={setIsTourActive}
        currentTab={activeView}
        currentUser={user}
      />

      {/* 9. Footer */}
      <footer className="border-t border-border/70 bg-surface/80 py-6 mt-10 mb-16 lg:mb-0 text-center text-xs text-foreground-muted">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <div
              className="w-6 h-6 flex items-center justify-center shrink-0 select-none"
            >
              <img src="/logo.png" alt="SMR2" className="w-full h-full object-contain drop-shadow-xs" />
            </div>
            <span className="font-medium text-foreground tracking-tight">SMR2 · 2º Sistemas Microinformáticos y Redes</span>
          </div>

          <div
            className="text-center sm:text-right space-y-0.5 select-none"
          >
            <p className="text-xs text-foreground">
              Desarrollado y creado por <strong className="text-amber-500 font-semibold">JuanFe Ospina</strong> y <strong className="text-amber-500 font-semibold">David</strong>
            </p>
            <p className="text-[11px] text-foreground-subtle font-mono">
              Portal oficial de la clase · Curso lectivo
            </p>
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
            <span
              onClick={handleSecretTrigger}
              className="hover:text-foreground transition-colors cursor-pointer select-none"
              title="Aula 35"
            >
              Aula 35
            </span>
          </div>
        </div>
      </footer>
      {/* Developer Debug & Design Toolbar */}
      <LaunchDevToolbar
        isAdmin={isAdmin}
        onAdminAuthSuccess={() => setIsAdmin(true)}
        onLockAdmin={handleLockAdmin}
        currentState={currentEffectiveState}
        onSetState={setDevLaunchState}
        onTestCountdown={(secs) => {
          setDevLaunchState('countdown');
          setTimeout(() => {
            if (typeof window !== 'undefined' && (window as any).smr2?.testCountdown) {
              (window as any).smr2.testCountdown(secs);
            }
          }, 60);
        }}
        onReplayWelcome={() => {
          setDevLaunchState('welcome');
          setDevWelcomeKey((k) => k + 1);
          setTimeout(() => {
            if (typeof window !== 'undefined' && (window as any).smr2?.replayWelcome) {
              (window as any).smr2.replayWelcome();
            }
          }, 60);
        }}
        speedMultiplier={devSpeedMultiplier}
        onSetSpeed={setDevSpeedMultiplier}
      />
      {/* Aviso exclusivo para usuarios móviles */}
      <MobileNotice />
    </div>
  );
}
