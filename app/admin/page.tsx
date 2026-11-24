'use client';

import React from 'react';
import Link from 'next/link';
import { ArrowLeft, Lock } from 'lucide-react';

export default function AdminPage() {
  return (
    <main className="min-h-screen bg-background text-foreground font-sans flex items-center justify-center p-6">
      <div className="max-w-md w-full border border-border rounded-lg bg-surface p-6 sm:p-8 space-y-5 text-center">
        <div className="w-10 h-10 rounded-full border border-border bg-surface-raised mx-auto flex items-center justify-center text-foreground-muted">
          <Lock className="w-5 h-5" />
        </div>

        <div className="space-y-2">
          <span className="font-mono text-xs uppercase px-2 py-0.5 border border-border bg-surface-raised text-foreground-subtle rounded">
            ADMINISTRACIÓN DESHABILITADA
          </span>
          <h1 className="text-xl font-bold tracking-tight text-foreground">
            Web cerrada. A estudiar.
          </h1>
          <p className="text-xs sm:text-sm text-foreground-muted leading-relaxed">
            Las funciones administrativas, el casino y el saldo de fichas han sido suspendidos. Consulta el horario lectivo en la página principal.
          </p>
        </div>

        <div className="pt-2">
          <Link
            href="/"
            className="inline-flex items-center justify-center gap-2 w-full py-2 px-4 text-xs font-mono font-medium rounded border border-border bg-foreground text-background hover:opacity-90 transition-opacity"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Volver al horario</span>
          </Link>
        </div>
      </div>
    </main>
  );
}
