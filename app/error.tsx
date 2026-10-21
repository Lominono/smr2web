'use client';

import React, { useEffect } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Application error:', error);
  }, [error]);

  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center p-6 text-center space-y-4">
      <div className="p-3 rounded-[var(--radius)] border border-danger/30 bg-danger-subtle text-danger text-xs font-mono">
        Error en la aplicación
      </div>

      <div className="space-y-1 max-w-md">
        <h2 className="text-base font-semibold text-foreground">
          Ocurrió un problema inesperado
        </h2>
        <p className="text-xs text-foreground-muted leading-relaxed">
          {error.message || 'No fue posible completar la operación en el servidor.'}
        </p>
      </div>

      <div className="flex items-center gap-2 pt-2">
        <Button variant="primary" size="md" onClick={() => reset()}>
          Reintentar
        </Button>
        <Link href="/">
          <Button variant="secondary" size="md">
            Volver al inicio
          </Button>
        </Link>
      </div>
    </div>
  );
}
