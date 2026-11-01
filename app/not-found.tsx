import React from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';

export default function NotFound() {
  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center p-6 text-center space-y-4">
      <span className="text-3xl font-mono font-bold text-foreground-subtle">
        404
      </span>

      <div className="space-y-1">
        <h2 className="text-base font-semibold text-foreground">
          Página no encontrada
        </h2>
        <p className="text-xs text-foreground-muted">
          La ruta solicitada no existe o ha sido reubicada.
        </p>
      </div>

      <div className="pt-2">
        <Link href="/">
          <Button variant="primary" size="md">
            Volver al inicio
          </Button>
        </Link>
      </div>
    </div>
  );
}
