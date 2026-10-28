'use client';

import React, { useState, useEffect } from 'react';
import {
  Bell,
  BellRing,
  BellOff,
  CheckCircle2,
  AlertTriangle,
  Send,
  Smartphone,
  Laptop,
  X,
  Volume2,
} from 'lucide-react';
import { UserProfile } from '@/lib/types';
import { Button } from '@/components/ui/Button';
import {
  subscribeToWebPush,
  sendTestNotification,
  getNotificationPermission,
  isPushNotificationSupported,
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
  onOpenAuth,
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
        setBroadcastFeedback(data.message || 'Anuncio enviado correctamente a todos los alumnos.');
        setBroadcastTitle('');
        setBroadcastBody('');
      } else {
        setBroadcastFeedback(data.error || 'No se pudo enviar el anuncio.');
      }
    } catch {
      setBroadcastFeedback('Error de conexión al emitir anuncio.');
    } finally {
      setIsBroadcasting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg bg-surface border border-border/80 rounded-2xl shadow-xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border/70">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-surface-raised border border-border flex items-center justify-center text-foreground">
              <Bell className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-foreground">Notificaciones push</h2>
              <p className="text-[11px] text-foreground-subtle">
                Avisos y fechas clave en móvil y ordenador
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              sound.tap();
              onClose();
            }}
            className="w-7 h-7 rounded-md flex items-center justify-center text-foreground-subtle hover:text-foreground hover:bg-surface-raised cursor-pointer transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content body */}
        <div className="p-5 space-y-4 overflow-y-auto">
          {/* Status Box */}
          <div className="p-3.5 rounded-lg border border-border bg-surface-raised/30 space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-medium">
                {permission === 'granted' ? (
                  <>
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                    <span className="text-foreground">Notificaciones activadas</span>
                  </>
                ) : permission === 'denied' ? (
                  <>
                    <BellOff className="w-3.5 h-3.5 text-danger" />
                    <span className="text-foreground">Bloqueadas en navegador</span>
                  </>
                ) : (
                  <>
                    <Bell className="w-3.5 h-3.5 text-foreground-subtle" />
                    <span className="text-foreground">Permiso pendiente</span>
                  </>
                )}
              </div>

              <span
                className={`text-[10px] font-mono px-1.5 py-0.5 rounded border uppercase font-medium ${
                  permission === 'granted'
                    ? 'border-emerald-500/30 text-emerald-600 dark:text-emerald-400'
                    : permission === 'denied'
                    ? 'border-danger/30 text-danger'
                    : 'border-border text-foreground-subtle'
                }`}
              >
                {permission === 'granted'
                  ? 'Activo'
                  : permission === 'denied'
                  ? 'Bloqueado'
                  : 'Inactivo'}
              </span>
            </div>

            <p className="text-xs text-foreground-muted leading-relaxed">
              {permission === 'granted'
                ? 'Este dispositivo recibirá alertas cuando se publiquen avisos o cambios de aula, incluso con la pestaña cerrada.'
                : permission === 'denied'
                ? 'Las notificaciones están bloqueadas en los ajustes del navegador. Habilita los permisos en el icono del candado de la URL.'
                : 'Activa las notificaciones en este navegador para recibir alertas de exámenes o comunicados sin necesidad de tener la web abierta.'}
            </p>

            <div className="flex flex-wrap items-center gap-2 pt-1">
              {permission !== 'granted' ? (
                <Button
                  variant="primary"
                  size="sm"
                  onClick={handleSubscribe}
                  isLoading={isSubscribing}
                  className="rounded-md text-xs h-7 px-3"
                >
                  <BellRing className="w-3.5 h-3.5" />
                  <span>Activar en este dispositivo</span>
                </Button>
              ) : (
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={handleTestNotification}
                  isLoading={isSendingTest}
                  className="rounded-md text-xs h-7 px-3"
                >
                  <Bell className="w-3.5 h-3.5" />
                  <span>Enviar prueba</span>
                </Button>
              )}

              {testSuccess && (
                <span className="text-xs text-emerald-500 font-mono">
                  Prueba enviada.
                </span>
              )}
            </div>
          </div>

          {/* Device Capabilities Info */}
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="p-3 rounded-xl border border-border/60 bg-surface flex items-start gap-2.5">
              <Smartphone className="w-4 h-4 text-foreground-muted shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-foreground text-[11px]">En el móvil</p>
                <p className="text-[10px] text-foreground-subtle leading-normal">
                  Android Chrome / Edge o iPhone (añadiendo la app a la pantalla de inicio).
                </p>
              </div>
            </div>
            <div className="p-3 rounded-xl border border-border/60 bg-surface flex items-start gap-2.5">
              <Laptop className="w-4 h-4 text-foreground-muted shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-foreground text-[11px]">En el ordenador</p>
                <p className="text-[10px] text-foreground-subtle leading-normal">
                  Windows, Mac o Linux con cualquier navegador moderno.
                </p>
              </div>
            </div>
          </div>

          {/* Formulario de emisión de Anuncio (Solo para Delegado / Admin) */}
          {canBroadcast && (
            <div className="pt-2 border-t border-border space-y-2.5">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-foreground">
                  Difundir aviso general
                </span>
                <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-surface-raised border border-border text-foreground-muted font-medium">
                  {currentUser?.role === 'admin' ? 'admin' : 'delegado'}
                </span>
              </div>

              <form onSubmit={handleBroadcast} className="space-y-2">
                <div>
                  <input
                    type="text"
                    value={broadcastTitle}
                    onChange={(e) => setBroadcastTitle(e.target.value)}
                    placeholder="Título del aviso"
                    className="w-full bg-surface-raised border border-border rounded-md px-2.5 py-1.5 text-xs text-foreground placeholder:text-foreground-subtle outline-none focus:border-foreground/50 transition-colors"
                  />
                </div>

                <div>
                  <textarea
                    rows={2}
                    value={broadcastBody}
                    onChange={(e) => setBroadcastBody(e.target.value)}
                    placeholder="Contenido de la alerta que recibirán los dispositivos..."
                    className="w-full bg-surface-raised border border-border rounded-md px-2.5 py-1.5 text-xs text-foreground placeholder:text-foreground-subtle outline-none focus:border-foreground/50 transition-colors resize-none leading-relaxed"
                  />
                </div>

                <div className="flex items-center justify-between gap-2 pt-1">
                  <div className="flex items-center gap-1">
                    {(['Aviso', 'Examen', 'Urgente'] as const).map((tag) => (
                      <button
                        key={tag}
                        type="button"
                        onClick={() => setBroadcastTag(tag)}
                        className={`px-2 py-0.5 rounded text-[11px] font-mono transition-colors border cursor-pointer ${
                          broadcastTag === tag
                            ? 'bg-foreground text-background font-semibold border-foreground'
                            : 'bg-surface text-foreground-muted border-border hover:text-foreground'
                        }`}
                      >
                        {tag.toLowerCase()}
                      </button>
                    ))}
                  </div>

                  <Button
                    type="submit"
                    variant="primary"
                    size="sm"
                    disabled={!broadcastTitle.trim() || !broadcastBody.trim() || isBroadcasting}
                    isLoading={isBroadcasting}
                    className="rounded-md text-xs h-7 px-3"
                  >
                    <Send className="w-3 h-3" />
                    <span>Difundir</span>
                  </Button>
                </div>

                {broadcastFeedback && (
                  <p className="text-xs text-foreground-muted font-mono pt-1">
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
