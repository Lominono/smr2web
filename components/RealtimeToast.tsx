'use client';

import React, { useEffect, useState } from 'react';
import {
  Bell,
  MessageSquare,
  Calendar,
  Trophy,
  RefreshCw,
  Coins,
  X,
} from 'lucide-react';
import { sound } from '@/lib/audio';

export interface RealtimeNotification {
  id: string;
  type: 'chat' | 'calendar' | 'system_update' | 'win' | 'balance';
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
  timestamp?: number;
}

interface RealtimeToastProps {
  notification: RealtimeNotification | null;
  onDismiss: () => void;
}

export const RealtimeToast: React.FC<RealtimeToastProps> = ({
  notification,
  onDismiss,
}) => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (notification) {
      setVisible(true);
      sound.tap();

      const timer = setTimeout(() => {
        setVisible(false);
        setTimeout(onDismiss, 200);
      }, 5000);

      return () => clearTimeout(timer);
    } else {
      setVisible(false);
    }
  }, [notification, onDismiss]);

  if (!notification || !visible) return null;

  const getIcon = () => {
    switch (notification.type) {
      case 'chat':
        return <MessageSquare className="w-3.5 h-3.5 text-accent" />;
      case 'calendar':
        return <Calendar className="w-3.5 h-3.5 text-emerald-500" />;
      case 'win':
        return <Trophy className="w-3.5 h-3.5 text-amber-500" />;
      case 'system_update':
        return <RefreshCw className="w-3.5 h-3.5 text-accent animate-spin" />;
      case 'balance':
        return <Coins className="w-3.5 h-3.5 text-amber-500" />;
      default:
        return <Bell className="w-3.5 h-3.5 text-foreground-muted" />;
    }
  };

  return (
    <aside
      aria-live="polite"
      aria-atomic="true"
      className="fixed top-4 left-3 right-3 sm:left-auto sm:right-6 sm:w-80 z-50 pointer-events-auto select-none animate-in slide-in-from-top-2 fade-in duration-200"
    >
      <div className="p-3 rounded-2xl bg-surface/95 backdrop-blur-xl border border-border/80 shadow-xl flex items-start justify-between gap-2.5 transition-all">
        <div className="flex items-start gap-2.5 min-w-0">
          <div className="w-7 h-7 rounded-lg bg-surface-raised border border-border/60 flex items-center justify-center shrink-0 mt-0.5">
            {getIcon()}
          </div>

          <div className="min-w-0 space-y-0.5">
            <h4 className="text-xs font-semibold text-foreground tracking-tight truncate">
              {notification.title}
            </h4>

            {notification.description && (
              <p className="text-[11px] text-foreground-muted line-clamp-2 leading-relaxed">
                {notification.description}
              </p>
            )}

            {notification.actionLabel && notification.onAction && (
              <button
                type="button"
                onClick={() => {
                  notification.onAction?.();
                  setVisible(false);
                  onDismiss();
                }}
                className="text-[11px] font-medium text-accent hover:underline mt-1 inline-block cursor-pointer"
              >
                {notification.actionLabel}
              </button>
            )}
          </div>
        </div>

        <button
          type="button"
          onClick={() => {
            setVisible(false);
            setTimeout(onDismiss, 200);
          }}
          aria-label="Cerrar notificación"
          className="w-5 h-5 rounded-md text-foreground-subtle hover:text-foreground hover:bg-surface-raised flex items-center justify-center transition-colors cursor-pointer shrink-0"
        >
          <X className="w-3 h-3" />
        </button>
      </div>
    </aside>
  );
};
