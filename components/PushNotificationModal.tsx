'use client';

import React, { useState, useEffect } from 'react';
import {
  Bell,
  BellRing,
  BellOff,
  CheckCircle2,
  AlertTriangle,
  Send,
  Sparkles,
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
            <div className="w-8 h-8 rounded-xl bg-accent/10 border border-accent/20 flex items-center justify-center text-accent">
              <BellRing className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-foreground">Notificaciones fuera de la web</h2>
              <p className="text-[11px] text-foreground-subtle">
                Avisos y exámenes instantáneos en tu móvil y PC
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              sound.tap();
              onClose();
            }}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-foreground-subtle hover:text-foreground hover:bg-surface-raised cursor-pointer transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content body */}
        <div className="p-5 space-y-5 overflow-y-auto">
          {/* Status Box */}
          <div className="p-3.5 rounded-xl border border-border/70 bg-surface-raised/40 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-medium">
                {permission === 'granted' ? (
                  <>
                    <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                    <span className="text-foreground">Notificaciones activadas</span>
                  </>
                ) : permission === 'denied' ? (
                  <>
                    <BellOff className="w-4 h-4 text-rose-500" />
                    <span className="text-foreground">Bloqueadas en el navegador</span>
                  </>
                ) : (
                  <>
                    <Bell className="w-4 h-4 text-amber-500" />
                    <span className="text-foreground">Permiso pendiente</span>
                  </>
                )}
              </div>

              <span
                className={`text-[10px] font-mono px-2 py-0.5 rounded-md uppercase font-semibold ${
                  permission === 'granted'
                    ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20'
                    : permission === 'denied'
                    ? 'bg-rose-500/10 text-rose-500 border border-rose-500/20'
                    : 'bg-amber-500/10 text-amber-500 border border-amber-500/20'
                }`}
              >
                {permission === 'granted'
                  ? 'Activo'
                  : permission === 'denied'
                  ? 'Bloqueado'
                  : 'Desactivado'}
              </span>
            </div>

            <p className="text-xs text-foreground-muted leading-relaxed">
              {permission === 'granted'
                ? 'Este dispositivo recibirá alertas en tiempo real de exámenes, cambios de aula o avisos urgentes del delegado, incluso si cierras la pestaña o bloqueas la pantalla.'
                : permission === 'denied'
                ? 'Las notificaciones están bloqueadas en la configuración de tu navegador. Para activarlas, pulsa en el candado de la barra de direcciones y habilita "Notificaciones".'
                : 'Activa las notificaciones Web Push nativas para enterarte de avisos de clase importantes cuando estés fuera de la web.'}
            </p>

            <div className="flex flex-wrap items-center gap-2 pt-1">
              {permission !== 'granted' ? (
                <Button
                  variant="primary"
                  size="sm"
                  onClick={handleSubscribe}
                  isLoading={isSubscribing}
                  className="rounded-lg text-xs"
                >
                  <BellRing className="w-3.5 h-3.5" />
                  <span>Activar notificaciones en este dispositivo</span>
                </Button>
              ) : (
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={handleTestNotification}
                  isLoading={isSendingTest}
                  className="rounded-lg text-xs"
                >
                  <Sparkles className="w-3.5 h-3.5 text-accent" />
                  <span>Probar notificación ahora</span>
                </Button>
              )}

              {testSuccess && (
                <span className="text-xs text-emerald-500 font-medium animate-in fade-in">
                  ¡Notificación enviada con éxito!
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
            <div className="pt-2 border-t border-border/70 space-y-3">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-foreground">
                  Emitir Anuncio a toda la clase
                </span>
                <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-accent/10 text-accent font-medium">
                  {currentUser?.role === 'admin' ? 'Admin' : 'Delegado'}
                </span>
              </div>

              <form onSubmit={handleBroadcast} className="space-y-2.5">
                <div>
                  <input
                    type="text"
                    value={broadcastTitle}
                    onChange={(e) => setBroadcastTitle(e.target.value)}
                    placeholder="Título del aviso (ej: Examen de SOR o Práctica de Redes)"
                    className="w-full bg-surface-raised border border-border/80 rounded-lg px-3 py-2 text-xs text-foreground placeholder:text-foreground-subtle outline-none focus:border-accent transition-colors"
                  />
                </div>

                <div>
                  <textarea
                    rows={2}
                    value={broadcastBody}
                    onChange={(e) => setBroadcastBody(e.target.value)}
                    placeholder="Detalles del aviso que se enviará como notificación al móvil y PC de todos..."
                    className="w-full bg-surface-raised border border-border/80 rounded-lg px-3 py-2 text-xs text-foreground placeholder:text-foreground-subtle outline-none focus:border-accent transition-colors resize-none leading-relaxed"
                  />
                </div>

                <div className="flex items-center justify-between gap-2 pt-1">
                  <div className="flex items-center gap-1.5">
                    {(['Aviso', 'Examen', 'Urgente'] as const).map((tag) => (
                      <button
                        key={tag}
                        type="button"
                        onClick={() => setBroadcastTag(tag)}
                        className={`px-2 py-1 rounded-md text-[11px] font-mono transition-colors border cursor-pointer ${
                          broadcastTag === tag
                            ? 'bg-foreground text-background font-semibold border-foreground'
                            : 'bg-surface text-foreground-muted border-border/70 hover:text-foreground'
                        }`}
                      >
                        {tag}
                      </button>
                    ))}
                  </div>

                  <Button
                    type="submit"
                    variant="primary"
                    size="sm"
                    disabled={!broadcastTitle.trim() || !broadcastBody.trim() || isBroadcasting}
                    isLoading={isBroadcasting}
                    className="rounded-lg text-xs"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>Lanzar anuncio</span>
                  </Button>
                </div>

                {broadcastFeedback && (
                  <p className="text-xs text-accent font-medium pt-1 animate-in fade-in">
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
