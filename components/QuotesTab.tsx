'use client';

import React, { useState } from 'react';
import { Quote, SubjectCode } from '@/lib/types';
import { SUBJECTS } from '@/lib/subjects';
import { MessageSquareQuote, Flame, Plus, Heart, Sparkles, X, User } from 'lucide-react';
import confetti from 'canvas-confetti';

interface QuotesTabProps {
  quotes: Quote[];
  onAddQuote: (newQuote: Omit<Quote, 'id'>) => void;
  onUpvoteQuote: (id: string) => void;
  currentUsername?: string;
}

export const QuotesTab: React.FC<QuotesTabProps> = ({
  quotes,
  onAddQuote,
  onUpvoteQuote,
  currentUsername = 'chaval_smr',
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formQuote, setFormQuote] = useState('');
  const [formTeacher, setFormTeacher] = useState('');
  const [formContext, setFormContext] = useState('');
  const [formSubject, setFormSubject] = useState<SubjectCode>('SR');

  const handleUpvote = (id: string) => {
    onUpvoteQuote(id);
    confetti({
      particleCount: 40,
      spread: 60,
      origin: { y: 0.7 },
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formQuote.trim() || !formTeacher.trim()) return;

    onAddQuote({
      quote: formQuote.trim(),
      teacher_name: formTeacher.trim(),
      context: formContext.trim() || 'En mitad de la clase',
      subject: formSubject,
      date: 'Hoy',
      upvotes: 1,
      creator_name: currentUsername,
    });

    setFormQuote('');
    setFormTeacher('');
    setFormContext('');
    setIsModalOpen(false);

    confetti({
      particleCount: 70,
      spread: 70,
      origin: { y: 0.6 },
    });
  };

  // Sort by upvotes descending
  const sortedQuotes = [...quotes].sort((a, b) => b.upvotes - a.upvotes);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-zinc-800">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight flex items-center gap-2">
            <MessageSquareQuote className="w-6 h-6 text-amber-400" />
            Frases Célebres del Claustro
          </h2>
          <p className="text-xs sm:text-sm text-zinc-400 mt-1">
            Las perlas míticas que sueltan los profesores de 2º SMR durante las clases.
          </p>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl font-mono text-xs font-bold bg-amber-500 hover:bg-amber-400 text-zinc-950 transition-all shadow-lg shadow-amber-500/10 cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Soltar Perla</span>
        </button>
      </div>

      {/* Quotes Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {sortedQuotes.map((item, index) => {
          const sub = item.subject ? SUBJECTS[item.subject] : null;

          return (
            <div
              key={item.id}
              className="bg-zinc-900/90 border border-zinc-800 hover:border-zinc-700 rounded-2xl p-5 flex flex-col justify-between shadow-md relative group transition-all"
            >
              {/* Top ranking badge */}
              <div className="flex items-center justify-between gap-2 mb-3">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs font-bold text-amber-400/90 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded">
                    #{index + 1} del Top
                  </span>
                  {sub && (
                    <span
                      className={`text-[10px] font-mono px-2 py-0.5 rounded border ${sub.bgColor} ${sub.borderColor} ${sub.color}`}
                    >
                      {sub.code}
                    </span>
                  )}
                </div>

                <button
                  onClick={() => handleUpvote(item.id)}
                  className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono bg-zinc-800 hover:bg-rose-500/20 hover:text-rose-300 border border-zinc-700/80 text-zinc-300 transition-colors cursor-pointer"
                >
                  <Heart className="w-3.5 h-3.5 text-rose-500 fill-rose-500" />
                  <span className="font-bold">{item.upvotes}</span>
                  <span className="text-[10px] text-zinc-400 hidden sm:inline">JAJAJA</span>
                </button>
              </div>

              {/* Quote text */}
              <div className="mb-4">
                <blockquote className="text-sm sm:text-base font-medium text-white italic border-l-2 border-amber-400/70 pl-3 py-1 leading-relaxed">
                  &ldquo;{item.quote}&rdquo;
                </blockquote>
              </div>

              {/* Author & Context Footer */}
              <div className="pt-3 border-t border-zinc-800/80 flex items-center justify-between text-xs text-zinc-400">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-full bg-zinc-800 border border-zinc-700 text-zinc-300">
                    <User className="w-3 h-3" />
                  </div>
                  <div>
                    <span className="font-bold text-zinc-200 block">{item.teacher_name}</span>
                    <span className="text-[11px] text-zinc-400 italic block">{item.context}</span>
                  </div>
                </div>

                <span className="font-mono text-[11px] text-zinc-400">{item.date}</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Modal: Soltar Perla */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-zinc-900 border border-zinc-700 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden">
            <div className="px-6 py-4 border-b border-zinc-800 flex items-center justify-between">
              <h3 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                <MessageSquareQuote className="w-5 h-5 text-amber-400" />
                Inmortalizar Perla del Profe
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-mono text-zinc-300 mb-1">
                  ¿Qué frase exacta ha soltado? *
                </label>
                <textarea
                  rows={3}
                  required
                  placeholder="Ej: Como vuelva a ver a alguien jugar al CS en clase tiro el switch general..."
                  value={formQuote}
                  onChange={(e) => setFormQuote(e.target.value)}
                  className="w-full px-3.5 py-2 bg-zinc-950 border border-zinc-800 rounded-xl text-xs sm:text-sm text-zinc-200 focus:outline-none focus:border-amber-500 italic"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-mono text-zinc-300 mb-1">
                    ¿Qué profe ha sido? *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ej: Profe de Redes / Manuel"
                    value={formTeacher}
                    onChange={(e) => setFormTeacher(e.target.value)}
                    className="w-full px-3.5 py-2 bg-zinc-950 border border-zinc-800 rounded-xl text-xs sm:text-sm text-zinc-200 focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-mono text-zinc-300 mb-1">
                    Asignatura
                  </label>
                  <select
                    value={formSubject}
                    onChange={(e) => setFormSubject(e.target.value as SubjectCode)}
                    className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-xl text-xs sm:text-sm text-zinc-200 focus:outline-none focus:border-amber-500 font-mono"
                  >
                    {Object.values(SUBJECTS).map((sub) => (
                      <option key={sub.code} value={sub.code}>
                        {sub.code} - {sub.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-mono text-zinc-300 mb-1">
                  Contexto del momento (¿Por qué lo dijo?)
                </label>
                <input
                  type="text"
                  placeholder="Ej: David intentó crimpar un cable con tijeras de cocina..."
                  value={formContext}
                  onChange={(e) => setFormContext(e.target.value)}
                  className="w-full px-3.5 py-2 bg-zinc-950 border border-zinc-800 rounded-xl text-xs sm:text-sm text-zinc-200 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-medium bg-zinc-800 hover:bg-zinc-700 text-zinc-300"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl text-xs font-mono font-bold bg-amber-500 hover:bg-amber-400 text-zinc-950 shadow-md"
                >
                  Guardar Perla
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
