'use client';

import React, { useState, useEffect } from 'react';
import { Deadline, PanicLevel, SubjectCode } from '@/lib/types';
import { SUBJECTS, PANIC_CONFIG } from '@/lib/subjects';
import { AlertCircle, Calendar, Plus, CheckCircle2, Clock, MapPin, Search, Filter, Flame, X, ShieldAlert } from 'lucide-react';
import confetti from 'canvas-confetti';

interface DeadlinesTabProps {
  deadlines: Deadline[];
  onAddDeadline: (newDeadline: Omit<Deadline, 'id'>) => void;
  currentUsername?: string;
}

export const DeadlinesTab: React.FC<DeadlinesTabProps> = ({
  deadlines,
  onAddDeadline,
  currentUsername = 'chaval_smr',
}) => {
  const [selectedSubject, setSelectedSubject] = useState<string>('ALL');
  const [selectedPanic, setSelectedPanic] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [completedItems, setCompletedItems] = useState<Record<string, boolean>>({});
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Form states
  const [formTitle, setFormTitle] = useState('');
  const [formSubject, setFormSubject] = useState<SubjectCode>('SR');
  const [formDate, setFormDate] = useState('');
  const [formPanic, setFormPanic] = useState<PanicLevel>('marron');
  const [formDescription, setFormDescription] = useState('');
  const [formClassroom, setFormClassroom] = useState('Aula 204');

  const toggleCompleted = (id: string) => {
    setCompletedItems((prev) => {
      const nextState = !prev[id];
      if (nextState) {
        confetti({
          particleCount: 50,
          spread: 60,
          origin: { y: 0.8 },
        });
      }
      return { ...prev, [id]: nextState };
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle.trim() || !formDate) return;

    onAddDeadline({
      title: formTitle.trim(),
      subject: formSubject,
      due_date: new Date(formDate).toISOString(),
      panic_level: formPanic,
      description: formDescription.trim(),
      classroom: formClassroom.trim() || 'Aula 204',
      creator_name: currentUsername,
    });

    // Reset and close
    setFormTitle('');
    setFormDescription('');
    setFormDate('');
    setIsModalOpen(false);

    confetti({
      particleCount: 70,
      spread: 70,
      origin: { y: 0.6 },
    });
  };

  // Filter deadlines
  const filteredDeadlines = deadlines.filter((item) => {
    const matchesSubject = selectedSubject === 'ALL' || item.subject === selectedSubject;
    const matchesPanic = selectedPanic === 'ALL' || item.panic_level === selectedPanic;
    const matchesSearch =
      item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (item.description && item.description.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesSubject && matchesPanic && matchesSearch;
  });

  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Calculate time remaining string
  const formatTimeRemaining = (dateStr: string) => {
    if (!isMounted) {
      return { text: 'Calculando...', urgent: false, overdue: false };
    }
    const target = new Date(dateStr).getTime();
    const now = new Date().getTime();
    const diffHours = Math.round((target - now) / (1000 * 60 * 60));

    if (diffHours < 0) {
      return { text: 'Ya venció', urgent: false, overdue: true };
    }
    if (diffHours < 24) {
      return { text: `¡Hoy/Mañana! (${diffHours}h)`, urgent: true, overdue: false };
    }
    const days = Math.floor(diffHours / 24);
    if (days <= 3) {
      return { text: `Quedan ${days} días`, urgent: true, overdue: false };
    }
    return { text: `Quedan ${days} días`, urgent: false, overdue: false };
  };

  return (
    <div className="space-y-6">
      {/* Header of Section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-zinc-800">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight flex items-center gap-2">
            <Flame className="w-6 h-6 text-rose-500" />
            El Calendario de Marrones
          </h2>
          <p className="text-xs sm:text-sm text-zinc-400 mt-1">
            Exámenes, entregas de prácticas y fechas límite de 2º SMR para no llevarte sorpresas.
          </p>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl font-mono text-xs font-bold bg-emerald-500 hover:bg-emerald-400 text-zinc-950 transition-all shadow-lg shadow-emerald-500/10 cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Añadir Marrón</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-zinc-900/70 border border-zinc-800 rounded-2xl p-4 space-y-3">
        <div className="flex flex-col md:flex-row gap-3">
          {/* Search box */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-zinc-400 absolute left-3.5 top-3" />
            <input
              type="text"
              placeholder="Buscar por práctica, examen, Debian, GPO..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-zinc-950 border border-zinc-800 rounded-xl text-xs sm:text-sm text-zinc-200 placeholder:text-zinc-500 focus:outline-none focus:border-emerald-500 transition-colors"
            />
          </div>

          {/* Panic filter */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 md:pb-0">
            <span className="text-xs text-zinc-400 font-mono flex items-center gap-1 shrink-0">
              <ShieldAlert className="w-3.5 h-3.5 text-zinc-500" /> Nivel:
            </span>
            <select
              value={selectedPanic}
              onChange={(e) => setSelectedPanic(e.target.value)}
              className="bg-zinc-950 border border-zinc-800 text-xs text-zinc-300 rounded-xl px-3 py-2 focus:outline-none focus:border-emerald-500 font-mono"
            >
              <option value="ALL">Cualquier Pánico</option>
              <option value="chill">🟢 Paseo</option>
              <option value="medio">🔵 Renta mirárselo</option>
              <option value="marron">🟠 Marrón gordo</option>
              <option value="f">🔴 F en el chat</option>
            </select>
          </div>
        </div>

        {/* Subject Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
          <button
            onClick={() => setSelectedSubject('ALL')}
            className={`px-3 py-1.5 rounded-lg font-mono font-medium transition-colors shrink-0 ${
              selectedSubject === 'ALL'
                ? 'bg-zinc-100 text-zinc-900 font-bold'
                : 'bg-zinc-800/80 text-zinc-400 hover:text-white'
            }`}
          >
            Todas ({deadlines.length})
          </button>
          {Object.values(SUBJECTS).map((sub) => {
            const count = deadlines.filter((d) => d.subject === sub.code).length;
            const isSelected = selectedSubject === sub.code;
            return (
              <button
                key={sub.code}
                onClick={() => setSelectedSubject(sub.code)}
                className={`px-3 py-1.5 rounded-lg font-mono transition-colors shrink-0 flex items-center gap-1.5 ${
                  isSelected
                    ? `${sub.bgColor} ${sub.borderColor} ${sub.color} border font-bold`
                    : 'bg-zinc-800/60 text-zinc-400 hover:text-white border border-transparent'
                }`}
              >
                <span>{sub.code}</span>
                <span className="text-[10px] opacity-75">({count})</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Deadlines List */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredDeadlines.length === 0 ? (
          <div className="col-span-full py-12 text-center bg-zinc-900/40 border border-zinc-800 rounded-2xl p-6">
            <CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto mb-3 opacity-80" />
            <h3 className="text-base font-bold text-white">Servidores en calma: no hay marrones a la vista</h3>
            <p className="text-xs text-zinc-400 mt-1 max-w-sm mx-auto">
              No coincide ningún examen o entrega con los filtros actuales. Vete al bar o aprovecha para dormir.
            </p>
          </div>
        ) : (
          filteredDeadlines.map((item) => {
            const sub = SUBJECTS[item.subject] || SUBJECTS.GENERAL;
            const panic = PANIC_CONFIG[item.panic_level] || PANIC_CONFIG.medio;
            const timeInfo = formatTimeRemaining(item.due_date);
            const isDone = completedItems[item.id] || false;
            const formattedDate = new Date(item.due_date).toLocaleDateString('es-ES', {
              weekday: 'short',
              day: 'numeric',
              month: 'short',
              hour: '2-digit',
              minute: '2-digit',
            });

            return (
              <div
                key={item.id}
                className={`border rounded-2xl p-4 sm:p-5 flex flex-col justify-between transition-all relative overflow-hidden ${
                  isDone
                    ? 'bg-zinc-950/40 border-zinc-800/60 opacity-60'
                    : 'bg-zinc-900/90 border-zinc-800 hover:border-zinc-700 shadow-md'
                }`}
              >
                {/* Panic accent strip */}
                <div
                  className={`absolute top-0 left-0 right-0 h-1 ${
                    item.panic_level === 'f'
                      ? 'bg-rose-500 animate-pulse'
                      : item.panic_level === 'marron'
                      ? 'bg-amber-500'
                      : item.panic_level === 'chill'
                      ? 'bg-emerald-500'
                      : 'bg-sky-500'
                  }`}
                />

                <div>
                  {/* Top tags */}
                  <div className="flex items-center justify-between gap-2 mb-2 flex-wrap">
                    <div className="flex items-center gap-1.5">
                      <span
                        className={`text-[11px] font-mono font-bold px-2 py-0.5 rounded border ${sub.bgColor} ${sub.borderColor} ${sub.color}`}
                      >
                        {sub.code} · {sub.name}
                      </span>
                      <span
                        className={`text-[10px] font-mono px-2 py-0.5 rounded border ${panic.bgColor} ${panic.borderColor} ${panic.color}`}
                      >
                        {panic.badge}
                      </span>
                    </div>

                    <div
                      className={`text-xs font-mono font-bold px-2.5 py-0.5 rounded-full ${
                        timeInfo.urgent
                          ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40 animate-pulse'
                          : timeInfo.overdue
                          ? 'bg-zinc-800 text-zinc-500'
                          : 'bg-zinc-800 text-zinc-300'
                      }`}
                    >
                      {timeInfo.text}
                    </div>
                  </div>

                  {/* Title */}
                  <h3
                    className={`text-base font-bold text-white mb-2 leading-snug ${
                      isDone ? 'line-through text-zinc-500' : ''
                    }`}
                  >
                    {item.title}
                  </h3>

                  {/* Description */}
                  {item.description && (
                    <p className="text-xs text-zinc-400 mb-3 leading-relaxed">
                      {item.description}
                    </p>
                  )}
                </div>

                {/* Bottom meta & personal completion checkbox */}
                <div className="pt-3 border-t border-zinc-800/80 flex items-center justify-between gap-2 text-xs flex-wrap">
                  <div className="flex items-center gap-3 text-zinc-400 font-mono text-[11px]">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5 text-zinc-500" />
                      {formattedDate}
                    </span>
                    {item.classroom && (
                      <span className="flex items-center gap-1 hidden sm:flex">
                        <MapPin className="w-3.5 h-3.5 text-zinc-500" />
                        {item.classroom}
                      </span>
                    )}
                  </div>

                  <button
                    onClick={() => toggleCompleted(item.id)}
                    className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-mono transition-colors cursor-pointer ${
                      isDone
                        ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                        : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-300'
                    }`}
                  >
                    <CheckCircle2 className={`w-3.5 h-3.5 ${isDone ? 'text-emerald-400' : 'text-zinc-500'}`} />
                    <span>{isDone ? 'Hecho' : 'Yo ya lo tengo'}</span>
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Modal: Añadir Marrón */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-zinc-900 border border-zinc-700 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden">
            <div className="px-6 py-4 border-b border-zinc-800 flex items-center justify-between">
              <h3 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                <Flame className="w-5 h-5 text-rose-500" />
                Meter un nuevo marrón a la clase
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
                  Título del marrón o práctica *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ej: Práctica Apache SSL y VirtualHosts"
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  className="w-full px-3.5 py-2 bg-zinc-950 border border-zinc-800 rounded-xl text-xs sm:text-sm text-zinc-200 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-mono text-zinc-300 mb-1">
                    Asignatura *
                  </label>
                  <select
                    value={formSubject}
                    onChange={(e) => setFormSubject(e.target.value as SubjectCode)}
                    className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-xl text-xs sm:text-sm text-zinc-200 focus:outline-none focus:border-emerald-500 font-mono"
                  >
                    {Object.values(SUBJECTS).map((sub) => (
                      <option key={sub.code} value={sub.code}>
                        {sub.code} - {sub.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-mono text-zinc-300 mb-1">
                    Nivel de pánico de la clase *
                  </label>
                  <select
                    value={formPanic}
                    onChange={(e) => setFormPanic(e.target.value as PanicLevel)}
                    className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-xl text-xs sm:text-sm text-zinc-200 focus:outline-none focus:border-emerald-500 font-mono"
                  >
                    <option value="chill">🟢 Paseo (Fácil)</option>
                    <option value="medio">🔵 Renta mirárselo (Normal)</option>
                    <option value="marron">🟠 Se viene marrón (Chungo)</option>
                    <option value="f">🔴 F en el chat (Rezar)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-mono text-zinc-300 mb-1">
                    Fecha y hora límite *
                  </label>
                  <input
                    type="datetime-local"
                    required
                    value={formDate}
                    onChange={(e) => setFormDate(e.target.value)}
                    className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-xl text-xs sm:text-sm text-zinc-200 focus:outline-none focus:border-emerald-500 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-mono text-zinc-300 mb-1">
                    Aula / Taller
                  </label>
                  <input
                    type="text"
                    placeholder="Aula 204"
                    value={formClassroom}
                    onChange={(e) => setFormClassroom(e.target.value)}
                    className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-xl text-xs sm:text-sm text-zinc-200 focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-mono text-zinc-300 mb-1">
                  Detalles y pistas (¿Qué pide el profe? ¿Algún truco?)
                </label>
                <textarea
                  rows={3}
                  placeholder="Ej: Ojo que pide hacerlo en Debian con dos interfaces de red y capturas de Wireshark..."
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-xl text-xs sm:text-sm text-zinc-200 focus:outline-none focus:border-emerald-500"
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
                  className="px-5 py-2 rounded-xl text-xs font-mono font-bold bg-emerald-500 hover:bg-emerald-400 text-zinc-950 shadow-md"
                >
                  Guardar y Avisar a Todos
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
