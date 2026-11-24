'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import Link from 'next/link';
import {
  Shield,
  Terminal as TerminalIcon,
  Lock,
  Unlock,
  CheckCircle,
  HelpCircle,
  Award,
  ArrowLeft,
  ChevronRight,
  Code2,
  BookOpen,
  Sparkles,
  AlertTriangle,
  RotateCcw,
  Lightbulb,
  Check,
} from 'lucide-react';
import { LAB_LEVELS } from '@/lib/lab/levelsData';
import { LevelId, LabProgress } from '@/lib/lab/types';
import { LabTerminal } from '@/components/lab/LabTerminal';
import { EthicalNoticeModal } from '@/components/lab/EthicalNoticeModal';
import { LevelChallenges } from '@/components/lab/LevelChallenges';

const STORAGE_KEY = 'smr2_ctf_lab_v1';

const INITIAL_PROGRESS: LabProgress = {
  currentLevel: 1,
  completedLevels: [],
  score: 1000,
  unlockedHints: {},
  unlockedSolutions: [],
  flagSubmissions: {},
  hasAcceptedEthics: false,
};

export default function LabPage() {
  const [progress, setProgress] = useState<LabProgress>(INITIAL_PROGRESS);
  const [activeTab, setActiveTab] = useState<'challenge' | 'lesson' | 'hints' | 'solution'>('challenge');
  const [flagInput, setFlagInput] = useState('');
  const [flagStatus, setFlagStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [flagMsg, setFlagMsg] = useState('');
  const [isTerminalOpen, setIsTerminalOpen] = useState(false);
  const [isEthicsOpen, setIsEthicsOpen] = useState(false);

  // Cargar progreso de localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
          const parsed = JSON.parse(stored);
          setProgress(parsed);
          if (!parsed.hasAcceptedEthics) {
            setIsEthicsOpen(true);
          }
        } else {
          setIsEthicsOpen(true);
        }
      } catch {
        setIsEthicsOpen(true);
      }
    }
  }, []);

  // Guardar progreso en localStorage
  const saveProgress = useCallback((newProgress: LabProgress) => {
    setProgress(newProgress);
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(newProgress));
      } catch {}
    }
  }, []);

  const handleAcceptEthics = () => {
    setIsEthicsOpen(false);
    saveProgress({
      ...progress,
      hasAcceptedEthics: true,
    });
  };

  const handleResetProgress = () => {
    if (window.confirm('¿Seguro que deseas reiniciar tu progreso del laboratorio?')) {
      const reset = { ...INITIAL_PROGRESS, hasAcceptedEthics: true };
      saveProgress(reset);
      setFlagStatus('idle');
      setFlagMsg('');
    }
  };

  const activeLevel = useMemo(() => {
    return LAB_LEVELS.find((l) => l.id === progress.currentLevel) || LAB_LEVELS[0];
  }, [progress.currentLevel]);

  const isLevelCompleted = useCallback(
    (lvlId: LevelId) => progress.completedLevels.includes(lvlId),
    [progress.completedLevels]
  );

  const isLevelLocked = useCallback(
    (lvlId: LevelId) => {
      if (lvlId === 1) return false;
      const prevLvl = (lvlId - 1) as LevelId;
      return !progress.completedLevels.includes(prevLvl);
    },
    [progress.completedLevels]
  );

  // Manejo de envío de flags
  const handleFlagSubmit = (submitted: string) => {
    const cleanFlag = submitted.trim();
    if (!cleanFlag) return;

    if (cleanFlag === activeLevel.flag) {
      setFlagStatus('success');
      setFlagMsg(`¡Excelente trabajo! Has capturado la bandera de ${activeLevel.title}. +${activeLevel.points} puntos.`);

      if (!progress.completedLevels.includes(activeLevel.id)) {
        const updatedCompleted = [...progress.completedLevels, activeLevel.id];
        const nextLevelId = (activeLevel.id < 7 ? activeLevel.id + 1 : activeLevel.id) as LevelId;
        saveProgress({
          ...progress,
          completedLevels: updatedCompleted,
          currentLevel: nextLevelId,
          score: progress.score + activeLevel.points,
          flagSubmissions: {
            ...progress.flagSubmissions,
            [activeLevel.id]: cleanFlag,
          },
        });
      }
    } else {
      setFlagStatus('error');
      setFlagMsg('Bandera incorrecta. Vuelve a comprobar el objetivo o solicita una pista.');
    }
  };

  // Desbloquear pista con penalización de puntos
  const handleUnlockHint = (hintId: number, cost: number) => {
    const currentHints = progress.unlockedHints[activeLevel.id] || [];
    if (currentHints.includes(hintId)) return;

    if (window.confirm(`Desbloquear esta pista restará ${cost} puntos de tu marcador. ¿Deseas continuar?`)) {
      saveProgress({
        ...progress,
        score: Math.max(0, progress.score - cost),
        unlockedHints: {
          ...progress.unlockedHints,
          [activeLevel.id]: [...currentHints, hintId],
        },
      });
    }
  };

  // Desbloquear solución directamente si se rinde
  const handleUnlockSolution = () => {
    if (progress.unlockedSolutions.includes(activeLevel.id)) return;
    if (window.confirm('Ver la solución antes de resolverlo restará 100 puntos y se registrará como ayuda. ¿Continuar?')) {
      saveProgress({
        ...progress,
        score: Math.max(0, progress.score - 100),
        unlockedSolutions: [...progress.unlockedSolutions, activeLevel.id],
      });
      setActiveTab('solution');
    }
  };

  const isSolutionVisible =
    isLevelCompleted(activeLevel.id) || progress.unlockedSolutions.includes(activeLevel.id);

  return (
    <main className="min-h-screen bg-neutral-950 text-neutral-100 font-sans selection:bg-emerald-500 selection:text-neutral-950">
      <EthicalNoticeModal isOpen={isEthicsOpen} onAccept={handleAcceptEthics} />

      {/* Barra superior de navegación del laboratorio */}
      <header className="border-b border-neutral-800 bg-neutral-900/80 backdrop-blur sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 py-3 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="p-1.5 rounded hover:bg-neutral-800 text-neutral-400 hover:text-neutral-200 transition-colors"
              title="Volver al horario"
            >
              <ArrowLeft className="w-4 h-4" />
            </Link>
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
                <Shield className="w-4 h-4" />
              </div>
              <div>
                <span className="font-mono text-xs uppercase tracking-wider text-emerald-400 font-bold block">
                  SMR2 // CYBER LAB
                </span>
                <span className="text-xs text-neutral-400">Plataforma Didáctica CTF · 2º SMR</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-4 font-mono text-xs">
            {/* Marcador de puntuación */}
            <div className="px-3 py-1 rounded bg-neutral-900 border border-neutral-800 flex items-center gap-1.5 text-amber-400">
              <Award className="w-3.5 h-3.5" />
              <span>{progress.score} PTS</span>
            </div>

            {/* Contador de niveles completados */}
            <div className="px-3 py-1 rounded bg-neutral-900 border border-neutral-800 text-neutral-300 hidden sm:flex items-center gap-1.5">
              <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
              <span>
                {progress.completedLevels.length}/{LAB_LEVELS.length} Retos
              </span>
            </div>

            {/* Botón de Terminal */}
            <button
              onClick={() => setIsTerminalOpen(!isTerminalOpen)}
              type="button"
              className={`px-3 py-1 rounded border font-semibold flex items-center gap-1.5 cursor-pointer transition-colors ${
                isTerminalOpen
                  ? 'bg-emerald-500 text-neutral-950 border-emerald-400'
                  : 'bg-neutral-900 hover:bg-neutral-800 text-emerald-400 border-neutral-800'
              }`}
            >
              <TerminalIcon className="w-3.5 h-3.5" />
              <span>Terminal</span>
            </button>

            {/* Botón de reinicio */}
            <button
              onClick={handleResetProgress}
              type="button"
              className="p-1.5 rounded hover:bg-neutral-800 text-neutral-500 hover:text-neutral-300 transition-colors cursor-pointer"
              title="Reiniciar progreso"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 py-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Mapa de Niveles (Columna Lateral) */}
        <aside className="lg:col-span-4 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="font-mono text-xs font-bold uppercase tracking-wider text-neutral-400">
              Mapa de Niveles CTF
            </h2>
            <span className="text-[11px] font-mono text-neutral-500">Bloqueo progresivo</span>
          </div>

          <div className="space-y-2">
            {LAB_LEVELS.map((level) => {
              const completed = isLevelCompleted(level.id);
              const locked = isLevelLocked(level.id);
              const isCurrent = progress.currentLevel === level.id;

              return (
                <button
                  key={level.id}
                  disabled={locked}
                  onClick={() => {
                    saveProgress({ ...progress, currentLevel: level.id });
                    setFlagStatus('idle');
                    setFlagMsg('');
                    setActiveTab('challenge');
                  }}
                  type="button"
                  className={`w-full p-3 rounded-lg border text-left transition-all cursor-pointer flex items-center justify-between ${
                    isCurrent
                      ? 'bg-neutral-900 border-emerald-500/50 shadow-sm'
                      : completed
                      ? 'bg-neutral-900/40 border-neutral-800/80 hover:bg-neutral-900'
                      : locked
                      ? 'bg-neutral-950/40 border-neutral-900 opacity-40 cursor-not-allowed'
                      : 'bg-neutral-900/40 border-neutral-800 hover:bg-neutral-900'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-7 h-7 rounded-md font-mono text-xs font-bold flex items-center justify-center shrink-0 ${
                        completed
                          ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                          : isCurrent
                          ? 'bg-emerald-500 text-neutral-950 font-bold'
                          : 'bg-neutral-800 text-neutral-400'
                      }`}
                    >
                      {completed ? <Check className="w-3.5 h-3.5" /> : level.id}
                    </div>
                    <div>
                      <div className="text-xs font-semibold text-neutral-200 line-clamp-1">
                        {level.title}
                      </div>
                      <div className="text-[11px] font-mono text-neutral-500">
                        {level.category}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <span
                      className={`text-[10px] font-mono px-1.5 py-0.5 rounded uppercase ${
                        level.difficulty === 'Fácil'
                          ? 'bg-emerald-500/10 text-emerald-400'
                          : level.difficulty === 'Media'
                          ? 'bg-amber-500/10 text-amber-400'
                          : 'bg-rose-500/10 text-rose-400'
                      }`}
                    >
                      {level.difficulty}
                    </span>
                    {locked && <Lock className="w-3.5 h-3.5 text-neutral-600" />}
                  </div>
                </button>
              );
            })}
          </div>

          <div className="p-3 rounded-lg border border-neutral-800 bg-neutral-900/30 text-xs text-neutral-400 space-y-1">
            <span className="font-mono text-[11px] text-neutral-500 uppercase font-semibold block">
              Herramientas de Auditoría
            </span>
            <p className="text-[11px]">
              Pulsa <strong>F12</strong> en tu navegador para abrir el modo Inspeccionar. Usa la pestaña Elements, Console, Network y Application según el reto.
            </p>
          </div>
        </aside>

        {/* Panel del Nivel Activo (Contenido Principal) */}
        <section className="lg:col-span-8 space-y-5">
          
          {/* Cabecera del nivel */}
          <div className="p-4 sm:p-5 rounded-xl border border-neutral-800 bg-neutral-900/60 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2 font-mono text-xs">
              <span className="text-emerald-400 font-bold uppercase tracking-wider">
                NIVEL {activeLevel.id} // {activeLevel.category}
              </span>
              <div className="flex items-center gap-2">
                <span className="text-neutral-400">Recompensa: +{activeLevel.points} PTS</span>
                {isLevelCompleted(activeLevel.id) && (
                  <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 font-bold flex items-center gap-1">
                    <CheckCircle className="w-3 h-3" /> COMPLETADO
                  </span>
                )}
              </div>
            </div>

            <h1 className="text-xl sm:text-2xl font-bold text-neutral-100">
              {activeLevel.title}
            </h1>

            <div className="p-3 bg-neutral-950 rounded-lg border border-neutral-800 text-xs sm:text-sm text-neutral-300">
              <strong className="text-neutral-100 font-mono">OBJETIVO: </strong>
              {activeLevel.objective}
            </div>

            {/* Pestañas de contenido */}
            <div className="flex flex-wrap items-center gap-2 border-b border-neutral-800 pt-2 font-mono text-xs">
              <button
                onClick={() => setActiveTab('challenge')}
                type="button"
                className={`pb-2 px-2.5 font-semibold border-b-2 transition-colors cursor-pointer flex items-center gap-1.5 ${
                  activeTab === 'challenge'
                    ? 'border-emerald-400 text-emerald-400'
                    : 'border-transparent text-neutral-400 hover:text-neutral-200'
                }`}
              >
                <Code2 className="w-3.5 h-3.5" />
                <span>Reto Práctico</span>
              </button>

              <button
                onClick={() => setActiveTab('lesson')}
                type="button"
                className={`pb-2 px-2.5 font-semibold border-b-2 transition-colors cursor-pointer flex items-center gap-1.5 ${
                  activeTab === 'lesson'
                    ? 'border-emerald-400 text-emerald-400'
                    : 'border-transparent text-neutral-400 hover:text-neutral-200'
                }`}
              >
                <BookOpen className="w-3.5 h-3.5" />
                <span>Lección Teórica</span>
              </button>

              <button
                onClick={() => setActiveTab('hints')}
                type="button"
                className={`pb-2 px-2.5 font-semibold border-b-2 transition-colors cursor-pointer flex items-center gap-1.5 ${
                  activeTab === 'hints'
                    ? 'border-emerald-400 text-emerald-400'
                    : 'border-transparent text-neutral-400 hover:text-neutral-200'
                }`}
              >
                <Lightbulb className="w-3.5 h-3.5" />
                <span>Pistas ({activeLevel.hints.length})</span>
              </button>

              <button
                onClick={() => {
                  if (isSolutionVisible) {
                    setActiveTab('solution');
                  } else {
                    handleUnlockSolution();
                  }
                }}
                type="button"
                className={`pb-2 px-2.5 font-semibold border-b-2 transition-colors cursor-pointer flex items-center gap-1.5 ${
                  activeTab === 'solution'
                    ? 'border-emerald-400 text-emerald-400'
                    : 'border-transparent text-neutral-400 hover:text-neutral-200'
                }`}
              >
                {isSolutionVisible ? <CheckCircle className="w-3.5 h-3.5 text-emerald-400" /> : <Lock className="w-3.5 h-3.5" />}
                <span>Solución &amp; Defensa</span>
              </button>
            </div>
          </div>

          {/* Vista de la Pestaña Activa */}
          <div className="space-y-5">
            {/* PESTAÑA 1: RETO PRÁCTICO */}
            {activeTab === 'challenge' && (
              <div className="space-y-4">
                <LevelChallenges
                  levelId={activeLevel.id}
                  onFlagDiscovered={(flag) => {
                    setFlagInput(flag);
                    handleFlagSubmit(flag);
                  }}
                  openTerminal={() => setIsTerminalOpen(true)}
                />
              </div>
            )}

            {/* PESTAÑA 2: LECCIÓN TEÓRICA */}
            {activeTab === 'lesson' && (
              <div className="p-5 rounded-xl border border-neutral-800 bg-neutral-900/60 space-y-4 text-xs sm:text-sm text-neutral-300 leading-relaxed font-sans">
                <div className="space-y-2">
                  <h3 className="text-base font-bold text-neutral-100">
                    ¿Qué es y por qué ocurre esta vulnerabilidad?
                  </h3>
                  <p>{activeLevel.lesson.overview}</p>
                </div>

                <div className="space-y-2">
                  <h4 className="font-mono text-xs font-bold text-emerald-400 uppercase">
                    Mecánica del Ataque
                  </h4>
                  <p>{activeLevel.lesson.howItWorks}</p>
                </div>

                {/* Código vulnerable de ejemplo */}
                <div className="space-y-1.5">
                  <span className="font-mono text-[11px] text-rose-400 font-bold uppercase">
                    Ejemplo de Código Vulnerable en Producción:
                  </span>
                  <div className="p-3 bg-neutral-950 rounded-lg border border-neutral-800 overflow-x-auto font-mono text-xs text-rose-300">
                    <pre>{activeLevel.lesson.vulnerableCodeExample}</pre>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                  <div className="p-3 rounded-lg bg-neutral-950 border border-neutral-800">
                    <strong className="text-neutral-200 block mb-1">Causa Raíz:</strong>
                    <span className="text-neutral-400 text-xs">{activeLevel.lesson.whyItHappens}</span>
                  </div>
                  <div className="p-3 rounded-lg bg-neutral-950 border border-neutral-800">
                    <strong className="text-neutral-200 block mb-1">Impacto Real:</strong>
                    <span className="text-neutral-400 text-xs">{activeLevel.lesson.realWorldImpact}</span>
                  </div>
                </div>
              </div>
            )}

            {/* PESTAÑA 3: PISTAS PROGRESIVAS */}
            {activeTab === 'hints' && (
              <div className="p-5 rounded-xl border border-neutral-800 bg-neutral-900/60 space-y-4">
                <div className="space-y-1">
                  <h3 className="text-base font-bold text-neutral-100">
                    Pistas Progresivas
                  </h3>
                  <p className="text-xs text-neutral-400">
                    Desbloquear una pista penaliza tu puntuación global. Úsalas únicamente si te has atascado.
                  </p>
                </div>

                <div className="space-y-3">
                  {activeLevel.hints.map((hint, idx) => {
                    const isUnlocked = (progress.unlockedHints[activeLevel.id] || []).includes(hint.id);
                    return (
                      <div
                        key={hint.id}
                        className={`p-3.5 rounded-lg border text-xs ${
                          isUnlocked
                            ? 'bg-neutral-950 border-emerald-500/30 text-neutral-200'
                            : 'bg-neutral-900/40 border-neutral-800 text-neutral-500'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="font-mono font-bold text-neutral-300">
                            Pista #{idx + 1}
                          </span>
                          {!isUnlocked ? (
                            <button
                              onClick={() => handleUnlockHint(hint.id, hint.cost)}
                              type="button"
                              className="px-2.5 py-1 rounded bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30 font-mono text-[11px] font-semibold cursor-pointer transition-colors"
                            >
                              Desbloquear (-{hint.cost} PTS)
                            </button>
                          ) : (
                            <span className="font-mono text-emerald-400 text-[11px] font-bold">
                              DESBLOQUEADA
                            </span>
                          )}
                        </div>

                        {isUnlocked ? (
                          <p className="text-neutral-300 text-xs leading-relaxed font-sans mt-1">
                            {hint.text}
                          </p>
                        ) : (
                          <span className="text-neutral-600 font-mono text-xs">
                            [Contenido de la pista oculto]
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* PESTAÑA 4: SOLUCIÓN Y DEFENSA */}
            {activeTab === 'solution' && (
              <div className="p-5 rounded-xl border border-neutral-800 bg-neutral-900/60 space-y-4 text-xs sm:text-sm text-neutral-300 leading-relaxed font-sans">
                {isSolutionVisible ? (
                  <>
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-emerald-400 font-bold font-mono text-xs">
                        <CheckCircle className="w-4 h-4" />
                        <span>GUÍA OFICIAL DEL INSTRUCTOR</span>
                      </div>
                      <h3 className="text-lg font-bold text-neutral-100">
                        Cómo se Explota y Cómo se Soluciona
                      </h3>
                      <p>{activeLevel.solution.explanation}</p>
                    </div>

                    <div className="space-y-2">
                      <strong className="text-neutral-200 font-mono text-xs uppercase block">
                        Pasos Exactos de Explotación:
                      </strong>
                      <ol className="list-decimal list-inside space-y-1.5 text-neutral-400 font-mono text-xs bg-neutral-950 p-3 rounded border border-neutral-800">
                        {activeLevel.solution.steps.map((st, i) => (
                          <li key={i}>{st}</li>
                        ))}
                      </ol>
                    </div>

                    <div className="space-y-1.5">
                      <span className="font-mono text-[11px] text-emerald-400 font-bold uppercase">
                        Código Seguro en Producción (Remediación Defensiva):
                      </span>
                      <div className="p-3 bg-neutral-950 rounded-lg border border-neutral-800 overflow-x-auto font-mono text-xs text-emerald-300">
                        <pre>{activeLevel.solution.secureCodeExample}</pre>
                      </div>
                    </div>

                    <div className="p-3 bg-neutral-950 rounded-lg border border-neutral-800 space-y-2">
                      <strong className="text-neutral-200 font-mono text-xs uppercase block">
                        Recomendaciones para el Administrador / Desarrollador:
                      </strong>
                      <ul className="list-disc list-inside space-y-1 text-neutral-400 text-xs">
                        {activeLevel.solution.defenseRecommendations.map((rec, i) => (
                          <li key={i}>{rec}</li>
                        ))}
                      </ul>
                    </div>
                  </>
                ) : (
                  <div className="p-6 text-center space-y-3">
                    <Lock className="w-8 h-8 text-neutral-600 mx-auto" />
                    <h4 className="font-bold text-neutral-200">Solución Bloqueada</h4>
                    <p className="text-xs text-neutral-400 max-w-md mx-auto">
                      Debes capturar la bandera del nivel o rendirte para visualizar el código de remediación y la solución paso a paso.
                    </p>
                    <button
                      onClick={handleUnlockSolution}
                      type="button"
                      className="px-4 py-2 rounded bg-neutral-800 hover:bg-neutral-700 text-neutral-200 font-mono text-xs cursor-pointer"
                    >
                      Rendirme y ver solución (-100 PTS)
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Caja de Validación de Bandera */}
          <div className="p-4 sm:p-5 rounded-xl border border-neutral-800 bg-neutral-900/80 space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-mono text-xs uppercase tracking-wider text-neutral-400 font-semibold">
                Envío de Bandera // Capture The Flag
              </span>
              <span className="font-mono text-[11px] text-neutral-500">
                Formato: FLAG&#123;...&#125;
              </span>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleFlagSubmit(flagInput);
              }}
              className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2"
            >
              <input
                type="text"
                value={flagInput}
                onChange={(e) => setFlagInput(e.target.value)}
                placeholder="Pega la bandera capturada (p. ej. FLAG{...})"
                className="flex-1 px-3 py-2 rounded-lg bg-neutral-950 border border-neutral-700 text-neutral-100 font-mono text-xs focus:outline-none focus:border-emerald-500"
              />
              <button
                type="submit"
                className="px-5 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-neutral-950 font-mono text-xs font-bold cursor-pointer transition-colors shadow-lg shadow-emerald-500/20"
              >
                Validar Flag
              </button>
            </form>

            {flagStatus !== 'idle' && (
              <div
                className={`p-3 rounded-lg text-xs font-mono border ${
                  flagStatus === 'success'
                    ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                    : 'bg-rose-500/10 border-rose-500/20 text-rose-400'
                }`}
              >
                {flagMsg}
              </div>
            )}
          </div>

        </section>
      </div>

      {/* Terminal Flotante / Emulador en Navegador */}
      <LabTerminal
        currentLevelId={activeLevel.id}
        onFlagSubmit={(flag) => {
          setFlagInput(flag);
          handleFlagSubmit(flag);
        }}
        onRequestHint={() => setActiveTab('hints')}
        isOpen={isTerminalOpen}
        onClose={() => setIsTerminalOpen(false)}
      />
    </main>
  );
}
