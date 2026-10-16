'use client';

import React, { useState } from 'react';
import { Resource, ResourceCategory, SubjectCode } from '@/lib/types';
import { SUBJECTS } from '@/lib/subjects';
import { Terminal, Copy, Check, ThumbsUp, Plus, Search, ExternalLink, FileText, Code2, Sparkles, X } from 'lucide-react';
import confetti from 'canvas-confetti';

interface CheatsheetsTabProps {
  resources: Resource[];
  onAddResource: (newResource: Omit<Resource, 'id'>) => void;
  onUpvoteResource: (id: string) => void;
  currentUsername?: string;
}

export const CheatsheetsTab: React.FC<CheatsheetsTabProps> = ({
  resources,
  onAddResource,
  onUpvoteResource,
  currentUsername = 'chaval_smr',
}) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Form states
  const [formTitle, setFormTitle] = useState('');
  const [formSubject, setFormSubject] = useState<SubjectCode>('SR');
  const [formCategory, setFormCategory] = useState<ResourceCategory>('chuleta');
  const [formDescription, setFormDescription] = useState('');
  const [formCommand, setFormCommand] = useState('');
  const [formLink, setFormLink] = useState('');

  const copyToClipboard = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleUpvote = (id: string) => {
    onUpvoteResource(id);
    confetti({
      particleCount: 35,
      spread: 50,
      origin: { y: 0.7 },
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle.trim() || !formDescription.trim()) return;

    onAddResource({
      title: formTitle.trim(),
      subject: formSubject,
      category: formCategory,
      description: formDescription.trim(),
      command: formCommand.trim() || undefined,
      link_url: formLink.trim() || undefined,
      upvotes: 1,
      creator_name: currentUsername,
    });

    setFormTitle('');
    setFormDescription('');
    setFormCommand('');
    setFormLink('');
    setIsModalOpen(false);

    confetti({
      particleCount: 60,
      spread: 60,
      origin: { y: 0.6 },
    });
  };

  const filteredResources = resources.filter((r) => {
    const matchesCategory = selectedCategory === 'ALL' || r.category === selectedCategory;
    const matchesSearch =
      r.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (r.command && r.command.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesCategory && matchesSearch;
  });

  const categoryLabels: Record<string, string> = {
    chuleta: 'Comando Rápido',
    apuntes: 'Apuntes / Guía',
    script_bash: 'Script Bash',
    script_ps: 'Script PowerShell',
    packet_tracer: 'Packet Tracer / Topología',
    examen_viejo: 'Examen de Años Pasados',
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-zinc-800">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight flex items-center gap-2">
            <Terminal className="w-6 h-6 text-emerald-400" />
            El Baúl de Chuletas & Scripts
          </h2>
          <p className="text-xs sm:text-sm text-zinc-400 mt-1">
            Comandos salvavidas de Linux, Windows Server, PowerShell y apuntes compartidos por la clase.
          </p>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl font-mono text-xs font-bold bg-emerald-500 hover:bg-emerald-400 text-zinc-950 transition-all shadow-lg shadow-emerald-500/10 cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Compartir Chuleta</span>
        </button>
      </div>

      {/* Filter and Search */}
      <div className="bg-zinc-900/70 border border-zinc-800 rounded-2xl p-4 space-y-3">
        <div className="relative">
          <Search className="w-4 h-4 text-zinc-400 absolute left-3.5 top-3" />
          <input
            type="text"
            placeholder="Buscar por comando: iptables, Get-ADUser, bind9, subnetting..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-zinc-950 border border-zinc-800 rounded-xl text-xs sm:text-sm text-zinc-200 placeholder:text-zinc-500 focus:outline-none focus:border-emerald-500"
          />
        </div>

        {/* Category filters */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
          <button
            onClick={() => setSelectedCategory('ALL')}
            className={`px-3 py-1.5 rounded-lg font-mono font-medium transition-colors shrink-0 ${
              selectedCategory === 'ALL'
                ? 'bg-zinc-100 text-zinc-900 font-bold'
                : 'bg-zinc-800/80 text-zinc-400 hover:text-white'
            }`}
          >
            Todo ({resources.length})
          </button>
          {['chuleta', 'script_bash', 'script_ps', 'apuntes', 'packet_tracer'].map((cat) => {
            const count = resources.filter((r) => r.category === cat).length;
            const isSelected = selectedCategory === cat;
            return (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1.5 rounded-lg font-mono transition-colors shrink-0 ${
                  isSelected
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-bold'
                    : 'bg-zinc-800/60 text-zinc-400 hover:text-white border border-transparent'
                }`}
              >
                <span>{categoryLabels[cat] || cat}</span>
                <span className="text-[10px] opacity-75 ml-1">({count})</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Resource cards */}
      <div className="space-y-4">
        {filteredResources.length === 0 ? (
          <div className="py-12 text-center bg-zinc-900/40 border border-zinc-800 rounded-2xl p-6">
            <Code2 className="w-12 h-12 text-zinc-600 mx-auto mb-3" />
            <h3 className="text-base font-bold text-white">No hay chuletas con ese término</h3>
            <p className="text-xs text-zinc-400 mt-1 max-w-sm mx-auto">
              Si tienes algún script o comando útil de clase, ¡súbelo arriba con el botón verde!
            </p>
          </div>
        ) : (
          filteredResources.map((res) => {
            const sub = SUBJECTS[res.subject] || SUBJECTS.GENERAL;
            const isCopied = copiedId === res.id;

            return (
              <div
                key={res.id}
                className="bg-zinc-900/90 border border-zinc-800 hover:border-zinc-700 rounded-2xl p-4 sm:p-5 transition-all shadow-md"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span
                      className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded border ${sub.bgColor} ${sub.borderColor} ${sub.color}`}
                    >
                      {sub.code} · {sub.name}
                    </span>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-zinc-800 text-zinc-400">
                      {categoryLabels[res.category] || res.category}
                    </span>
                    {res.creator_name && (
                      <span className="text-[11px] text-zinc-500 font-mono">
                        por @{res.creator_name}
                      </span>
                    )}
                  </div>

                  <button
                    onClick={() => handleUpvote(res.id)}
                    className="self-start sm:self-auto flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-mono bg-zinc-800 hover:bg-emerald-500/10 hover:text-emerald-300 border border-zinc-700/80 text-zinc-300 transition-colors cursor-pointer"
                  >
                    <ThumbsUp className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Me ha salvado la vida ({res.upvotes})</span>
                  </button>
                </div>

                <h3 className="text-base font-bold text-white mb-1.5">{res.title}</h3>
                <p className="text-xs text-zinc-400 mb-3">{res.description}</p>

                {/* If it contains a terminal command */}
                {res.command && (
                  <div className="relative group rounded-xl bg-zinc-950 border border-zinc-800/80 p-3 my-2 overflow-x-auto font-mono text-xs text-emerald-400 flex items-center justify-between gap-4">
                    <code className="select-all break-all">{res.command}</code>
                    <button
                      onClick={() => copyToClipboard(res.id, res.command!)}
                      className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-sans font-medium transition-all shrink-0 cursor-pointer ${
                        isCopied
                          ? 'bg-emerald-500 text-zinc-950 font-bold'
                          : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-200'
                      }`}
                    >
                      {isCopied ? (
                        <>
                          <Check className="w-3 h-3" />
                          <span>¡Copiado, crack!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3 h-3" />
                          <span>Copiar</span>
                        </>
                      )}
                    </button>
                  </div>
                )}

                {/* If it contains a link */}
                {res.link_url && (
                  <div className="pt-2">
                    <a
                      href={res.link_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-xs font-mono text-emerald-400 hover:underline"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      <span>Abrir archivo o enlace de Drive</span>
                    </a>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Modal: Subir Chuleta */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-zinc-900 border border-zinc-700 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden">
            <div className="px-6 py-4 border-b border-zinc-800 flex items-center justify-between">
              <h3 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                <Terminal className="w-5 h-5 text-emerald-400" />
                Compartir Chuleta o Comando
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
                  Título de la chuleta *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ej: Levantar Apache y comprobar syntax de VirtualHosts"
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
                    Tipo de recurso *
                  </label>
                  <select
                    value={formCategory}
                    onChange={(e) => setFormCategory(e.target.value as ResourceCategory)}
                    className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-xl text-xs sm:text-sm text-zinc-200 focus:outline-none focus:border-emerald-500 font-mono"
                  >
                    <option value="chuleta">Comando Rápido</option>
                    <option value="script_bash">Script Bash (Linux)</option>
                    <option value="script_ps">Script PowerShell (Win)</option>
                    <option value="apuntes">Apuntes / PDF</option>
                    <option value="packet_tracer">Packet Tracer / Cisco</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-mono text-zinc-300 mb-1">
                  Comando de terminal (opcional)
                </label>
                <input
                  type="text"
                  placeholder="sudo systemctl restart apache2 && apache2ctl configtest"
                  value={formCommand}
                  onChange={(e) => setFormCommand(e.target.value)}
                  className="w-full px-3.5 py-2 bg-zinc-950 border border-zinc-800 rounded-xl text-xs sm:text-sm text-emerald-400 font-mono focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-mono text-zinc-300 mb-1">
                  Enlace a Drive / GitHub / PDF (opcional)
                </label>
                <input
                  type="url"
                  placeholder="https://drive.google.com/..."
                  value={formLink}
                  onChange={(e) => setFormLink(e.target.value)}
                  className="w-full px-3.5 py-2 bg-zinc-950 border border-zinc-800 rounded-xl text-xs sm:text-sm text-zinc-200 focus:outline-none focus:border-emerald-500 font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-mono text-zinc-300 mb-1">
                  Explicación breve (¿Para qué sirve? ¿Cuándo usarlo?) *
                </label>
                <textarea
                  rows={2}
                  required
                  placeholder="Para reiniciar Apache sin que pete el servidor si tienes un typo en el .conf..."
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  className="w-full px-3.5 py-2 bg-zinc-950 border border-zinc-800 rounded-xl text-xs sm:text-sm text-zinc-200 focus:outline-none focus:border-emerald-500"
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
                  Compartir con la Clase
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
