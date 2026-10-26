'use client';

import React, { useEffect, useState } from 'react';
import {
  Bell,
  MessageSquare,
  Calendar,
  Trophy,
  RefreshCw,
  X,
  Sparkles,
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
      }, 5500);

      return () => clearTimeout(timer);
    } else {
      setVisible(false);
    }
  }, [notification, onDismiss]);

  if (!notification || !visible) return null;

  const getIcon = () => {
    switch (notification.type) {
      case 'chat':
        return <MessageSquare className="w-4 h-4 text-accent" />;
      case 'calendar':
        return <Calendar className="w-4 h-4 text-emerald-400" />;
      case 'win':
        return <Trophy className="w-4 h-4 text-amber-500" />;
      case 'system_update':
        return <RefreshCw className="w-4 h-4 text-accent animate-spin" />;
      case 'balance':
        return <Sparkles className="w-4 h-4 text-amber-500" />;
      default:
        return <Bell className="w-4 h-4 text-foreground-muted" />;
    }
  };

  return (
    <aside
      aria-live="polite"
      aria-atomic="true"
      className="fixed top-16 right-3 sm:right-6 z-50 max-w-[calc(100vw-1.5rem)] sm:max-w-sm w-full pointer-events-auto select-none animate-in slide-in-from-top-3 fade-in duration-200"
    >
      <div className="p-3 rounded-xl bg-surface/95 backdrop-blur-md border border-border/80 shadow-lg flex items-start justify-between gap-3 transition-all">
        <div className="flex items-start gap-2.5 min-w-0">
          <div className="w-7 h-7 rounded-lg bg-surface-raised border border-border/70 flex items-center justify-center shrink-0 mt-0.5">
            {getIcon()}
          </div>

          <div className="min-w-0 space-y-0.5">
            <div className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-accent shrink-0" />
              <h4 className="text-xs font-semibold text-foreground tracking-tight truncate">
                {notification.title}
              </h4>
            </div>

            {notification.description && (
              <p className="text-[11px] text-foreground-muted line-clamp-2 leading-relaxed font-sans">
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
                className="text-[11px] font-semibold text-accent hover:underline mt-1 inline-block cursor-pointer"
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
          className="w-6 h-6 rounded-md text-foreground-subtle hover:text-foreground hover:bg-surface-raised flex items-center justify-center transition-colors cursor-pointer shrink-0"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    </aside>
  );
};
