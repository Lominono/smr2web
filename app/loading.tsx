import React from 'react';

export default function Loading() {
  return (
    <div className="min-h-[50vh] flex flex-col items-center justify-center p-6 space-y-3">
      <div className="w-5 h-5 border-2 border-foreground-muted border-t-transparent rounded-full animate-spin" />
      <p className="text-xs font-mono text-foreground-subtle">
        Cargando datos...
      </p>
    </div>
  );
}
