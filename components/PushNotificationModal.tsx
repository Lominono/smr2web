'use client';

import React, { useState, useEffect } from 'react';
import {
  Bell,
  BellRing,
  BellOff,
  CheckCircle2,
  Send,
  Smartphone,
  Laptop,
  X,
  Loader2,
} from 'lucide-react';
import { UserProfile } from '@/lib/types';
import {
  subscribeToWebPush,
  sendTestNotification,
  getNotificationPermission,
} from '@/lib/webPushService';
import { sound } from '@/lib/audio';

interface PushNotificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: UserProfile | null;
  onOpenAuth: () => void;
}

export const PushNotificationModal: React.FC<PushNotificationModalProps> = ({
  isOpen,
  onClose,
  currentUser,
}) => {
  const [permission, setPermission] = useState<NotificationPermission | 'unsupported'>('default');
  const [isSubscribing, setIsSubscribing] = useState(false);
  const [isSendingTest, setIsSendingTest] = useState(false);
  const [testSuccess, setTestSuccess] = useState(false);

  // Formulario de emisión de anuncio (para administradores / delegados)
  const [broadcastTitle, setBroadcastTitle] = useState('');
  const [broadcastBody, setBroadcastBody] = useState('');
  const [broadcastTag, setBroadcastTag] = useState<'Aviso' | 'Examen' | 'Urgente'>('Aviso');
  const [isBroadcasting, setIsBroadcasting] = useState(false);
  const [broadcastFeedback, setBroadcastFeedback] = useState<string | null>(null);

  const canBroadcast =
    currentUser?.role === 'admin' ||
    currentUser?.role === 'delegado' ||
    currentUser?.username === 'admin';

  useEffect(() => {
    if (isOpen) {
      setPermission(getNotificationPermission());
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubscribe = async () => {
    sound.tap();
    setIsSubscribing(true);
    try {
      const res = await subscribeToWebPush(currentUser?.id);
      setPermission(res.status);
      if (res.success) {
        sound.coinWin();
      }
    } finally {
      setIsSubscribing(false);
    }
  };

  const handleTestNotification = async () => {
    sound.tap();
    setIsSendingTest(true);
    setTestSuccess(false);
    try {
      const ok = await sendTestNotification();
      setTestSuccess(ok);
      if (ok) sound.tap();
    } finally {
      setIsSendingTest(false);
    }
  };

  const handleBroadcast = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!broadcastTitle.trim() || !broadcastBody.trim() || isBroadcasting) return;

    sound.tap();
    setIsBroadcasting(true);
    setBroadcastFeedback(null);

    try {
      const res = await fetch('/api/notifications/broadcast', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: broadcastTitle.trim(),
          body: broadcastBody.trim(),
          tag: broadcastTag,
          url: '/',
          authorUsername: currentUser?.username || 'Delegado',
        }),
      });

      const data = await res.json();
      if (data.success) {
        sound.coinWin();
        setBroadcastFeedback(data.message || 'Aviso difundido a todos los dispositivos.');
        setBroadcastTitle('');
        setBroadcastBody('');
      } else {
        setBroadcastFeedback(data.error || 'No se pudo emitir el aviso.');
      }
    } catch {
      setBroadcastFeedback('Error de conexión al emitir aviso.');
    } finally {
      setIsBroadcasting(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-in fade-in duration-200"
    >
      <div className="relative w-full max-w-md bg-surface border border-border/80 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Cabecera */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border/60 bg-surface-raised/40">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-surface border border-border/70 flex items-center justify-center text-foreground shrink-0 shadow-xs">
              <Bell className="w-4 h-4 text-foreground-muted" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-foreground tracking-tight">
                Notificaciones push
              </h2>
              <p className="text-[11px] text-foreground-muted font-mono">
                Alertas lectivas · 2º SMR
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              sound.tap();
              onClose();
            }}
            className="w-7 h-7 rounded-lg flex items-center justify-center text-foreground-subtle hover:text-foreground hover:bg-surface-raised cursor-pointer transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Cuerpo */}
        <div className="p-5 space-y-4 overflow-y-auto">
          {/* Tarjeta de estado de suscripción */}
          <div className="p-4 rounded-xl border border-border/70 bg-surface-raised/40 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-medium">
                {permission === 'granted' ? (
                  <>
                    <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                    <span className="text-foreground">Suscripción activa</span>
                  </>
                ) : permission === 'denied' ? (
                  <>
                    <BellOff className="w-4 h-4 text-danger" />
                    <span className="text-foreground">Permisos denegados</span>
                  </>
                ) : (
                  <>
                    <Bell className="w-4 h-4 text-foreground-subtle" />
                    <span className="text-foreground">Sin activar</span>
                  </>
                )}
              </div>

              <span
                className={`text-[10px] font-mono px-2 py-0.5 rounded-full border uppercase font-medium ${
                  permission === 'granted'
                    ? 'border-emerald-500/30 text-emerald-600 dark:text-emerald-400 bg-emerald-500/10'
                    : permission === 'denied'
                    ? 'border-danger/30 text-danger bg-danger/10'
                    : 'border-border text-foreground-subtle bg-surface'
                }`}
              >
                {permission === 'granted'
                  ? 'Activo'
                  : permission === 'denied'
                  ? 'Bloqueado'
                  : 'Pendiente'}
              </span>
            </div>

            <p className="text-xs text-foreground-muted leading-relaxed">
              {permission === 'granted'
                ? 'Este dispositivo recibirá alertas de cambios de horario, avisos del delegado y exámenes aunque la pestaña esté cerrada.'
                : permission === 'denied'
                ? 'Las notificaciones están bloqueadas en los permisos del navegador. Pulsa en el icono del candado en la barra de URL para permitirlas.'
                : 'Activa las notificaciones en este navegador para no perderte convocatorias lectivas o anuncios urgentes del aula.'}
            </p>

            <div className="flex flex-wrap items-center gap-2 pt-1">
              {permission !== 'granted' ? (
                <button
                  type="button"
                  onClick={handleSubscribe}
                  disabled={isSubscribing}
                  className="px-3.5 py-1.5 rounded-xl bg-foreground text-background text-xs font-semibold hover:opacity-90 active:scale-95 transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-40 shadow-xs"
                >
                  {isSubscribing ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <BellRing className="w-3.5 h-3.5" />
                  )}
                  <span>Activar en este dispositivo</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleTestNotification}
                  disabled={isSendingTest}
                  className="px-3 py-1.5 rounded-xl border border-border/80 bg-surface text-foreground text-xs font-medium hover:bg-surface-raised active:scale-95 transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-40"
                >
                  {isSendingTest ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Bell className="w-3.5 h-3.5" />
                  )}
                  <span>Comprobar notificación</span>
                </button>
              )}

              {testSuccess && (
                <span className="text-xs text-emerald-500 font-mono">
                  Prueba enviada
                </span>
              )}
            </div>
          </div>

          {/* Guía de dispositivos */}
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="p-3 rounded-xl border border-border/60 bg-surface-raised/30 flex items-start gap-2.5">
              <Smartphone className="w-4 h-4 text-foreground-subtle shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-foreground text-[11px]">En el teléfono</p>
                <p className="text-[10px] text-foreground-subtle leading-normal mt-0.5">
                  Chrome/Edge en Android o Safari en iPhone (Añadir a pantalla de inicio).
                </p>
              </div>
            </div>
            <div className="p-3 rounded-xl border border-border/60 bg-surface-raised/30 flex items-start gap-2.5">
              <Laptop className="w-4 h-4 text-foreground-subtle shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-foreground text-[11px]">En el ordenador</p>
                <p className="text-[10px] text-foreground-subtle leading-normal mt-0.5">
                  Windows, Mac o Linux mediante cualquier navegador moderno.
                </p>
              </div>
            </div>
          </div>

          {/* Difusión general para Administrador o Delegado */}
          {canBroadcast && (
            <div className="pt-3 border-t border-border/60 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-foreground">
                  Difusión general a la clase
                </span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-surface-raised border border-border/80 text-foreground-muted font-medium uppercase">
                  {currentUser?.role === 'admin' ? 'admin' : 'delegado'}
                </span>
              </div>

              <form onSubmit={handleBroadcast} className="space-y-2">
                <input
                  type="text"
                  value={broadcastTitle}
                  onChange={(e) => setBroadcastTitle(e.target.value)}
                  placeholder="Título del aviso..."
                  className="w-full bg-surface-raised border border-border/70 rounded-xl px-3 py-2 text-xs text-foreground placeholder:text-foreground-subtle outline-none focus:border-accent transition-colors font-sans"
                />

                <textarea
                  rows={2}
                  value={broadcastBody}
                  onChange={(e) => setBroadcastBody(e.target.value)}
                  placeholder="Mensaje que recibirán los alumnos en sus pantallas..."
                  className="w-full bg-surface-raised border border-border/70 rounded-xl px-3 py-2 text-xs text-foreground placeholder:text-foreground-subtle outline-none focus:border-accent transition-colors resize-none leading-relaxed font-sans"
                />

                <div className="flex items-center justify-between gap-2 pt-1">
                  <div className="flex items-center gap-1 font-mono">
                    {(['Aviso', 'Examen', 'Urgente'] as const).map((tag) => (
                      <button
                        key={tag}
                        type="button"
                        onClick={() => setBroadcastTag(tag)}
                        className={`px-2 py-0.5 rounded-lg text-[10px] uppercase transition-colors border cursor-pointer ${
                          broadcastTag === tag
                            ? 'bg-foreground text-background font-semibold border-foreground'
                            : 'bg-surface text-foreground-muted border-border/60 hover:text-foreground'
                        }`}
                      >
                        {tag}
                      </button>
                    ))}
                  </div>

                  <button
                    type="submit"
                    disabled={!broadcastTitle.trim() || !broadcastBody.trim() || isBroadcasting}
                    className="px-3.5 py-1.5 rounded-xl bg-foreground text-background text-xs font-semibold hover:opacity-90 active:scale-95 transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-40 shadow-xs"
                  >
                    {isBroadcasting ? (
                      <Loader2 className="w-3 h-3 animate-spin" />
                    ) : (
                      <Send className="w-3 h-3" />
                    )}
                    <span>Emitir</span>
                  </button>
                </div>

                {broadcastFeedback && (
                  <p className="text-[11px] text-foreground-muted font-mono pt-1">
                    {broadcastFeedback}
                  </p>
                )}
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
