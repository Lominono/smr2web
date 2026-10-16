'use client';

import React, { useState } from 'react';
import { Dices, Sparkles, User, RefreshCw, Trophy, Plus, Trash2, Award } from 'lucide-react';
import { CLASS_MATES_LIST } from '@/lib/mock-data';
import confetti from 'canvas-confetti';

export const SwitchRouletteTab: React.FC = () => {
  const [names, setNames] = useState<string[]>(CLASS_MATES_LIST);
  const [newName, setNewName] = useState('');
  const [selectedTask, setSelectedTask] = useState<string>(
    '¿A quién le toca preguntarle al profe la duda que nadie entiende?'
  );
  const [isSpinning, setIsSpinning] = useState(false);
  const [winner, setWinner] = useState<string | null>(null);
  const [highlightedIndex, setHighlightedIndex] = useState<number | null>(null);

  const presetTasks = [
    '¿A quién le toca preguntarle al profe la duda que nadie entiende?',
    '¿Quién baja a la cafetería a por los cafés y bocatas en el recreo?',
    '¿Quién expone primero la presentación de diapositivas de EIE?',
    '¿Quién coge la crimpadora y prueba el cable en el rack de comunicaciones?',
    '¿Quién le pide al profe 5 minutos más de recreo?',
    '¿Quién comparte pantalla en el proyector de clase?',
  ];

  const handleAddName = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;
    if (names.includes(newName.trim())) return;
    setNames([...names, newName.trim()]);
    setNewName('');
  };

  const handleRemoveName = (indexToRemove: number) => {
    setNames(names.filter((_, i) => i !== indexToRemove));
  };

  const spin = () => {
    if (names.length === 0 || isSpinning) return;

    setIsSpinning(true);
    setWinner(null);

    let speed = 60;
    let iterations = 0;
    const maxIterations = 25 + Math.floor(Math.random() * 10);

    const interval = setInterval(() => {
      const randomIndex = Math.floor(Math.random() * names.length);
      setHighlightedIndex(randomIndex);
      iterations++;

      if (iterations >= maxIterations) {
        clearInterval(interval);
        const finalWinner = names[randomIndex];
        setWinner(finalWinner);
        setIsSpinning(false);

        // Big celebratory confetti
        confetti({
          particleCount: 120,
          spread: 80,
          origin: { y: 0.5 },
        });
      }
    }, speed);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-zinc-800">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight flex items-center gap-2">
            <Dices className="w-6 h-6 text-purple-400" />
            La Ruleta del Cable Cruzado
          </h2>
          <p className="text-xs sm:text-sm text-zinc-400 mt-1">
            Sorteo rápido para turnos de exposición, quién pregunta dudas o quién va a por los cafés.
          </p>
        </div>
      </div>

      {/* Main Roulette Box */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Roulette & Winner Stage */}
        <div className="lg:col-span-2 bg-gradient-to-b from-zinc-900 to-zinc-950 border border-zinc-800 rounded-3xl p-6 sm:p-8 flex flex-col items-center justify-center text-center relative overflow-hidden shadow-xl">
          {/* Decorative glow */}
          <div className="absolute w-72 h-72 bg-purple-500/10 rounded-full blur-3xl pointer-events-none -top-20 -left-20"></div>
          <div className="absolute w-72 h-72 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none -bottom-20 -right-20"></div>

          {/* Current Question / Task */}
          <div className="w-full max-w-md mb-6">
            <label className="block text-xs font-mono text-zinc-400 mb-1">
              Misión o marrón a sortear:
            </label>
            <select
              value={selectedTask}
              onChange={(e) => setSelectedTask(e.target.value)}
              className="w-full bg-zinc-950 border border-zinc-700 rounded-xl px-3 py-2 text-xs sm:text-sm text-purple-300 font-medium focus:outline-none focus:border-purple-500"
            >
              {presetTasks.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>

          {/* Wheel / Slot Display */}
          <div className="w-full max-w-lg min-h-[160px] flex items-center justify-center p-6 rounded-2xl bg-zinc-950/80 border-2 border-dashed border-zinc-800 my-4 relative">
            {winner ? (
              <div className="animate-in zoom-in-95 duration-300 flex flex-col items-center">
                <span className="px-3 py-1 rounded-full text-xs font-mono font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40 mb-2 flex items-center gap-1.5">
                  <Trophy className="w-4 h-4 text-amber-400" />
                  ¡LE HA TOCADO EL MARRÓN!
                </span>
                <h3 className="text-2xl sm:text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 via-teal-300 to-cyan-400">
                  {winner}
                </h3>
                <p className="text-xs text-zinc-400 mt-2">
                  No hay marcha atrás, el switch ha hablado.
                </p>
              </div>
            ) : isSpinning && highlightedIndex !== null ? (
              <div className="text-2xl sm:text-3xl font-black text-purple-400 font-mono tracking-wider animate-pulse">
                {names[highlightedIndex]}
              </div>
            ) : (
              <div className="text-center text-zinc-500">
                <Dices className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p className="text-sm font-medium">Pulsa el botón para empezar el sorteo</p>
                <p className="text-xs text-zinc-600 mt-0.5">{names.length} compañeros en la lista</p>
              </div>
            )}
          </div>

          {/* Spin Button */}
          <button
            onClick={spin}
            disabled={isSpinning || names.length === 0}
            className={`mt-4 px-8 py-3.5 rounded-2xl font-mono text-sm sm:text-base font-black tracking-wider transition-all shadow-xl cursor-pointer flex items-center gap-2 ${
              isSpinning
                ? 'bg-zinc-800 text-zinc-500 cursor-not-allowed'
                : 'bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-400 hover:to-indigo-500 text-white shadow-purple-500/25 active:scale-95'
            }`}
          >
            <RefreshCw className={`w-5 h-5 ${isSpinning ? 'animate-spin' : ''}`} />
            <span>{isSpinning ? 'GIRANDO SWITCH...' : '¡GIRAR RULETA!'}</span>
          </button>
        </div>

        {/* Right: Classmates List Manager */}
        <div className="bg-zinc-900/90 border border-zinc-800 rounded-3xl p-5 flex flex-col justify-between shadow-md">
          <div>
            <div className="flex items-center justify-between mb-3 pb-2 border-b border-zinc-800">
              <span className="text-xs font-mono font-bold text-zinc-300 uppercase tracking-wider flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-zinc-500" />
                Compañeros ({names.length})
              </span>
              <button
                onClick={() => setNames(CLASS_MATES_LIST)}
                className="text-[11px] font-mono text-purple-400 hover:underline"
              >
                Restaurar lista
              </button>
            </div>

            {/* Add new name */}
            <form onSubmit={handleAddName} className="flex gap-2 mb-3">
              <input
                type="text"
                placeholder="Nombre o mote..."
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                className="flex-1 px-3 py-1.5 bg-zinc-950 border border-zinc-800 rounded-xl text-xs text-zinc-200 focus:outline-none focus:border-purple-500"
              />
              <button
                type="submit"
                className="p-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white transition-colors"
              >
                <Plus className="w-4 h-4" />
              </button>
            </form>

            {/* Names pill list */}
            <div className="max-h-72 overflow-y-auto space-y-1.5 pr-1">
              {names.map((name, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between px-3 py-1.5 rounded-lg bg-zinc-950/60 border border-zinc-800/80 text-xs text-zinc-300 group hover:border-zinc-700"
                >
                  <span className="truncate">{name}</span>
                  <button
                    onClick={() => handleRemoveName(i)}
                    className="text-zinc-600 hover:text-rose-400 p-0.5 opacity-60 group-hover:opacity-100 transition-opacity"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          <p className="text-[11px] text-zinc-500 italic mt-3 pt-2 border-t border-zinc-800">
            Tip: Puedes borrar a los que hayan faltado hoy a clase antes de tirar la ruleta.
          </p>
        </div>
      </div>
    </div>
  );
};
