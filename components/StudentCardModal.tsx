'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import Image from 'next/image';
import {
  X,
  Copy,
  Check,
  CalendarCheck,
  Monitor,
  Flame,
  Sparkles,
  Edit2,
  Save,
  Clock,
  Coins,
  CheckCircle2,
  User,
  Send,
  IdCard,
} from 'lucide-react';
import { UserProfile } from '@/lib/types';
import { sound } from '@/lib/audio';
import { BANNER_PRESETS } from './VipShopView';
import {
  getCurrentScheduleStatus,
  SCHEDULE_GRID,
  SMR2_SUBJECTS,
  TIME_SLOTS,
  DayKey,
} from '@/lib/scheduleData';
import { saveStudentIdentification } from '@/lib/authService';

interface StudentCardModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: UserProfile | null;
  inspectedUser?: Partial<UserProfile> | null;
  onUpdateUser?: (updated: UserProfile) => void;
  onTipUser?: (username: string, amount: number) => void;
}

export const StudentCardModal: React.FC<StudentCardModalProps> = ({
  isOpen,
  onClose,
  user,
  inspectedUser,
  onUpdateUser,
  onTipUser,
}) => {
  const [mounted, setMounted] = useState(false);
  const [copied, setCopied] = useState(false);
  const [copiedNia, setCopiedNia] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [fullNameInput, setFullNameInput] = useState('');
  const [studentNumberInput, setStudentNumberInput] = useState('');
  const [selectedSeat, setSelectedSeat] = useState<string>('PC-01');
  const [savingEdit, setSavingEdit] = useState(false);
  const [attendanceClaimed, setAttendanceClaimed] = useState(false);
  const [attendanceStreak, setAttendanceStreak] = useState(1);
  const [tipSent, setTipSent] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const isViewingOther = Boolean(
    inspectedUser &&
      (!user ||
        (inspectedUser.username &&
          inspectedUser.username.toLowerCase() !== user.username.toLowerCase()) ||
        (inspectedUser.id && user.id && inspectedUser.id !== user.id))
  );

  const displayUser: Partial<UserProfile> | null = isViewingOther
    ? inspectedUser!
    : user;

  useEffect(() => {
    if (!isViewingOther && user) {
      setFullNameInput(user.full_name || '');
      setStudentNumberInput(user.student_number || '');
      try {
        const savedSeat = localStorage.getItem(`smr2_pc_seat_${user.id}`);
        if (savedSeat) setSelectedSeat(savedSeat);

        const todayKey = new Date().toISOString().slice(0, 10);
        const lastAtt = localStorage.getItem(`smr2_attendance_date_${user.id}`);
        const savedStreak = parseInt(
          localStorage.getItem(`smr2_attendance_streak_${user.id}`) || '1',
          10
        );
        setAttendanceStreak(isNaN(savedStreak) ? 1 : savedStreak);
        setAttendanceClaimed(lastAtt === todayKey);
      } catch {}
    } else if (isViewingOther && inspectedUser) {
      if (inspectedUser.pc_seat) {
        setSelectedSeat(inspectedUser.pc_seat);
      }
    }
  }, [user, inspectedUser, isViewingOther]);

  const liveStatus = useMemo(() => getCurrentScheduleStatus(), []);

  const todaySchedule = useMemo(() => {
    const d = new Date().getDay();
    const map: Record<number, DayKey> = {
      1: 'lunes',
      2: 'martes',
      3: 'miercoles',
      4: 'jueves',
      5: 'viernes',
    };
    const dayKey = map[d];
    if (!dayKey) return null;

    const daySubjects = SCHEDULE_GRID[dayKey];
    return TIME_SLOTS.map((slot, index) => {
      const code = daySubjects[index];
      const subject = SMR2_SUBJECTS[code];
      return { slot, code, subject };
    });
  }, []);

  if (!isOpen || !mounted || !displayUser) return null;

  const handleClaimAttendance = () => {
    if (isViewingOther || !user || attendanceClaimed) return;
    try {
      const todayKey = new Date().toISOString().slice(0, 10);
      const newStreak = attendanceStreak + 1;
      setAttendanceStreak(newStreak);
      setAttendanceClaimed(true);

      localStorage.setItem(`smr2_attendance_date_${user.id}`, todayKey);
      localStorage.setItem(`smr2_attendance_streak_${user.id}`, String(newStreak));

      const bonusCoins = 25;
      const updatedUser: UserProfile = {
        ...user,
        coins: (user.coins || 0) + bonusCoins,
        streak_count: newStreak,
      };

      if (onUpdateUser) onUpdateUser(updatedUser);
      sound.jackpot();
    } catch {}
  };

  const handleSelectSeat = (seat: string) => {
    if (isViewingOther || !user) return;
    setSelectedSeat(seat);
    try {
      localStorage.setItem(`smr2_pc_seat_${user.id}`, seat);
      sound.tap();
    } catch {}
  };

  const handleCopyCard = () => {
    const targetName = displayUser.full_name || displayUser.username || 'Estudiante';
    const targetUser = displayUser.username || 'estudiante';
    const targetNia = displayUser.student_number || 'No asignado';
    const targetSeat = displayUser.pc_seat || selectedSeat || 'Aula 35';

    const text = `--- FICHA OFICIAL SMR2 ---\nNombre: ${targetName}\nUsuario: @${targetUser}\nNIA: ${targetNia}\nPuesto: Aula 35 (${targetSeat})\nEstado: Alumno Activo (2026/2027)\nPortal: https://smr2web.vercel.app`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    sound.tap();
    setTimeout(() => setCopied(false), 2000);
  };

  const handleCopyNiaOnly = () => {
    if (!displayUser.student_number) return;
    navigator.clipboard.writeText(displayUser.student_number);
    setCopiedNia(true);
    sound.tap();
    setTimeout(() => setCopiedNia(false), 2000);
  };

  const handleSendTip = () => {
    if (!isViewingOther || !displayUser.username || !onTipUser || !user || (user.coins || 0) < 50) return;
    onTipUser(displayUser.username, 50);
    setTipSent(true);
    sound.coinWin();
    setTimeout(() => setTipSent(false), 3000);
  };

  const handleSaveEdit = async () => {
    if (!user || !fullNameInput.trim() || !studentNumberInput.trim()) return;
    setSavingEdit(true);
    try {
      const res = await saveStudentIdentification(user.id, fullNameInput.trim(), studentNumberInput.trim());
      if (res.success && res.user && onUpdateUser) {
        onUpdateUser(res.user);
        setIsEditing(false);
        sound.coinWin();
      }
    } catch {}
    setSavingEdit(false);
  };

  const displayName = displayUser.full_name || displayUser.username || 'Estudiante';
  const displayUsername = displayUser.username || 'usuario';
  const displayNia = displayUser.student_number ? `NIA-${displayUser.student_number}` : 'SIN ASIGNAR';
  const displaySeat = isViewingOther ? (displayUser.pc_seat || selectedSeat || 'Aula 35') : selectedSeat;
  const displayRole =
    displayUser.role === 'admin'
      ? 'Administrador'
      : displayUser.role === 'delegado'
      ? 'Delegado'
      : 'Estudiante 2º SMR';

  const hasVipBanner = Boolean(
    (displayUser?.banner_estilo && displayUser.banner_estilo !== 'cuadricula') ||
    displayUser?.items_comprados?.includes('banner_vip_13m') ||
    displayUser?.titulo_personalizado
  );
  const bannerPreset =
    BANNER_PRESETS.find((p) => p.id === displayUser?.banner_estilo) || BANNER_PRESETS[0];
  const isCustomImageBanner = Boolean(
    displayUser?.banner_estilo && displayUser.banner_estilo.startsWith('http')
  );

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="student-card-title"
      className="fixed inset-0 z-[99999] flex items-center justify-center p-3 sm:p-6 bg-black/85 backdrop-blur-md font-sans select-none animate-in fade-in duration-200"
    >
      <div
        className="fixed inset-0"
        onClick={onClose}
        aria-hidden="true"
      />

      <div
        className="relative z-10 w-full max-w-lg max-h-[90dvh] rounded-3xl bg-[#09090b] border border-neutral-800 shadow-2xl flex flex-col overflow-hidden text-neutral-200 animate-in fade-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Cabecera del modal */}
        <header className="px-5 sm:px-6 py-4 border-b border-neutral-800/80 flex items-center justify-between shrink-0 bg-[#09090b]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-neutral-900 border border-neutral-800 p-1.5 flex items-center justify-center shadow-xs">
              <IdCard className="w-4 h-4 text-white" />
            </div>
            <div>
              <h2 id="student-card-title" className="text-sm font-semibold tracking-tight text-white flex items-center gap-1.5">
                <span>{isViewingOther ? 'Ficha de Estudiante' : 'Mi Ficha Oficial de Estudiante'}</span>
                {isViewingOther && (
                  <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-neutral-800 text-neutral-300">
                    Compañero
                  </span>
                )}
              </h2>
              <p className="text-[11px] text-neutral-500 font-mono">
                {isViewingOther
                  ? `@${displayUsername} · 2º SMR`
                  : 'Credencial Oficial de Aula · 2º SMR'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={handleCopyCard}
              title="Copiar datos de la ficha"
              className="px-2.5 py-1.5 text-xs text-neutral-400 hover:text-white rounded-lg bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-emerald-400 text-[11px]">Copiado</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span className="text-[11px]">Copiar</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={onClose}
              aria-label="Cerrar ficha"
              className="w-8 h-8 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-900 border border-transparent hover:border-neutral-800 flex items-center justify-center transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </header>

        {/* Contenido con scroll */}
        <div className="flex-1 p-5 sm:p-6 overflow-y-auto space-y-5 select-text">
          {/* BANNER VIP PERSONALIZADO DE 13 MILLONES */}
          {hasVipBanner && (
            <div
              className={`rounded-2xl overflow-hidden border ${bannerPreset.border} ${bannerPreset.glow} p-4 sm:p-5 text-white relative shadow-xl animate-in fade-in duration-300`}
              style={
                isCustomImageBanner && displayUser.banner_estilo
                  ? {
                      backgroundImage: `url(${displayUser.banner_estilo})`,
                      backgroundSize: 'cover',
                      backgroundPosition: 'center',
                    }
                  : undefined
              }
            >
              {!isCustomImageBanner && (
                <div className={`absolute inset-0 ${bannerPreset.gradient} opacity-95`} />
              )}
              <div className="absolute inset-0 bg-black/45 backdrop-blur-[1px]" />

              <div className="relative z-10 space-y-2">
                <div className="flex items-center justify-between">
                  <span
                    className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-md border ${bannerPreset.badgeBg} uppercase tracking-wider`}
                  >
                    {isCustomImageBanner ? '🖼️ CUSTOM BANNER' : bannerPreset.badge}
                  </span>
                  <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-black/60 text-amber-300 border border-amber-400/40 flex items-center gap-1 shadow-sm">
                    <Sparkles className="w-3 h-3 text-amber-400" />
                    <span>13M VIP</span>
                  </span>
                </div>

                <div>
                  <h3 className="text-base sm:text-lg font-black tracking-tight drop-shadow-md text-white">
                    {displayUser.titulo_personalizado || '👑 Magnate del Botellón'}
                  </h3>
                  {displayUser.frase && (
                    <p className="text-xs italic text-neutral-200 drop-shadow-sm mt-0.5 line-clamp-2">
                      «{displayUser.frase}»
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ============================================================== */}
          {/* TARJETA DIGITAL ESTILO APPLE PASS / WALLET                     */}
          {/* ============================================================== */}
          <div className="rounded-2xl bg-[#121215] border border-neutral-800 p-5 sm:p-6 shadow-xl text-white select-none space-y-4">
            <div className="flex items-center justify-between border-b border-neutral-800/80 pb-3">
              <div className="flex items-center gap-2">
                <span className="font-mono text-[11px] font-semibold tracking-wider uppercase text-neutral-400">
                  2º SMR · AULA 35
                </span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-neutral-900 border border-neutral-700 text-neutral-300 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                  <span>Activo</span>
                </span>
              </div>
              <span className="text-[10px] font-mono text-neutral-500">
                2026 / 2027
              </span>
            </div>

            <div className="flex items-start justify-between gap-4">
              <div className="space-y-0.5">
                <div className="text-[11px] font-mono text-neutral-400">
                  {displayRole}
                </div>
                <div className="text-xl font-bold tracking-tight text-white">
                  {displayName}
                </div>
                <div className="text-xs text-neutral-400 font-mono">
                  @{displayUsername}
                </div>
              </div>

              <div className="w-10 h-10 rounded-xl bg-neutral-900 border border-neutral-800 p-2 flex items-center justify-center shrink-0">
                <Image
                  src="/logo.png"
                  alt="SMR2 Logo"
                  width={24}
                  height={24}
                  className="object-contain"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-3 border-t border-neutral-800/80">
              <div>
                <span className="text-[10px] font-mono uppercase text-neutral-500 block">
                  Número NIA
                </span>
                <span className="text-xs font-mono font-semibold text-neutral-200">
                  {displayNia}
                </span>
              </div>

              <div>
                <span className="text-[10px] font-mono uppercase text-neutral-500 block">
                  Puesto Taller
                </span>
                <span className="text-xs font-mono font-semibold text-white">
                  {displaySeat}
                </span>
              </div>

              <div>
                <span className="text-[10px] font-mono uppercase text-neutral-500 block">
                  Ubicación
                </span>
                <span className="text-xs font-mono text-neutral-300">
                  Aula 35
                </span>
              </div>
            </div>
          </div>

          {/* ============================================================== */}
          {/* MODO INSPECCIÓN DE COMPAÑERO                                   */}
          {/* ============================================================== */}
          {isViewingOther ? (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-2.5">
                <div className="p-3.5 rounded-2xl bg-neutral-900/60 border border-neutral-800">
                  <span className="text-[10px] font-mono uppercase text-neutral-500 block mb-1">
                    Saldo
                  </span>
                  <div className="flex items-center gap-1.5 text-xs font-mono font-semibold text-white">
                    <Coins className="w-3.5 h-3.5 text-amber-400" />
                    <span>{(displayUser.coins ?? 1000).toLocaleString('es-ES')} fichas</span>
                  </div>
                </div>

                <div className="p-3.5 rounded-2xl bg-neutral-900/60 border border-neutral-800">
                  <span className="text-[10px] font-mono uppercase text-neutral-500 block mb-1">
                    Racha en Clase
                  </span>
                  <div className="flex items-center gap-1.5 text-xs font-mono font-semibold text-neutral-200">
                    <Flame className="w-3.5 h-3.5 text-amber-400" />
                    <span>{displayUser.streak_count || 1} días</span>
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-neutral-800 bg-neutral-900/40 p-4 space-y-2.5">
                <h3 className="text-xs font-semibold text-white">
                  Acciones con @{displayUsername}
                </h3>

                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(`@${displayUsername}`);
                      sound.tap();
                    }}
                    className="px-3 py-1.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-xs text-neutral-200 transition-colors flex items-center gap-1.5 cursor-pointer font-mono"
                  >
                    <User className="w-3.5 h-3.5" />
                    <span>Copiar @{displayUsername}</span>
                  </button>

                  {displayUser.student_number && (
                    <button
                      type="button"
                      onClick={handleCopyNiaOnly}
                      className="px-3 py-1.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-xs text-neutral-200 transition-colors flex items-center gap-1.5 cursor-pointer font-mono"
                    >
                      {copiedNia ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copiedNia ? '¡Copiado!' : `Copiar NIA (${displayUser.student_number})`}</span>
                    </button>
                  )}

                  {user && onTipUser && (user.coins || 0) >= 50 && (
                    <button
                      type="button"
                      onClick={handleSendTip}
                      disabled={tipSent}
                      className="px-3 py-1.5 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-xs text-amber-300 transition-colors flex items-center gap-1.5 cursor-pointer font-mono"
                    >
                      <Send className="w-3.5 h-3.5" />
                      <span>{tipSent ? '¡50 fichas enviadas!' : 'Enviar 50 fichas'}</span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          ) : (
            /* ============================================================== */
            /* MODO PROPIO: ASISTENCIA Y PUESTO DE TALLER                     */
            /* ============================================================== */
            <>
              {/* CHECK-IN DE ASISTENCIA DIARIA */}
              <div className="rounded-2xl border border-neutral-800 bg-neutral-900/50 p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="p-1.5 rounded-lg bg-neutral-800 text-neutral-300">
                      <CalendarCheck className="w-4 h-4" />
                    </span>
                    <div>
                      <h3 className="text-xs font-semibold text-white">
                        Asistencia a Clase
                      </h3>
                      <p className="text-[11px] text-neutral-400">
                        Confirma tu asistencia hoy para sumar racha
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 text-xs font-mono font-medium text-neutral-300 bg-neutral-800 px-2.5 py-1 rounded-full border border-neutral-700">
                    <Flame className="w-3.5 h-3.5 text-amber-400" />
                    <span>Racha: {attendanceStreak}d</span>
                  </div>
                </div>

                <div className="pt-1">
                  {attendanceClaimed ? (
                    <div className="p-3 rounded-xl bg-emerald-950/30 border border-emerald-800/60 flex items-center justify-between text-xs text-emerald-400">
                      <span className="flex items-center gap-2 font-medium">
                        <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                        ¡Asistencia confirmada para hoy!
                      </span>
                      <span className="font-mono text-[11px] text-emerald-300">
                        +25 fichas
                      </span>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={handleClaimAttendance}
                      className="w-full py-2.5 px-4 rounded-xl bg-white hover:bg-neutral-200 text-black font-semibold text-xs transition-all flex items-center justify-center gap-2 cursor-pointer shadow-md active:scale-98"
                    >
                      <Sparkles className="w-4 h-4" />
                      <span>Confirmar asistencia hoy (+25 fichas)</span>
                    </button>
                  )}
                </div>
              </div>

              {/* ASIGNACIÓN DE PUESTO EN EL TALLER */}
              <div className="rounded-2xl border border-neutral-800 bg-neutral-900/50 p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="p-1.5 rounded-lg bg-neutral-800 text-neutral-300">
                      <Monitor className="w-4 h-4" />
                    </span>
                    <div>
                      <h3 className="text-xs font-semibold text-white">
                        Mi Puesto de Ordenador en Aula 35
                      </h3>
                      <p className="text-[11px] text-neutral-400">
                        Selecciona el equipo del taller donde te sientas
                      </p>
                    </div>
                  </div>

                  <span className="text-xs font-mono font-bold text-white px-2 py-0.5 rounded bg-neutral-800 border border-neutral-700">
                    {selectedSeat}
                  </span>
                </div>

                <div className="grid grid-cols-4 sm:grid-cols-6 gap-1.5 pt-1">
                  {Array.from({ length: 24 }, (_, i) => {
                    const pcId = `PC-${String(i + 1).padStart(2, '0')}`;
                    const isSelected = selectedSeat === pcId;
                    return (
                      <button
                        key={pcId}
                        type="button"
                        onClick={() => handleSelectSeat(pcId)}
                        className={`py-1.5 text-center text-xs font-mono rounded-lg transition-all cursor-pointer border ${
                          isSelected
                            ? 'bg-white text-black font-bold border-white shadow-xs'
                            : 'bg-neutral-950/80 border-neutral-800 text-neutral-400 hover:text-white hover:bg-neutral-800'
                        }`}
                      >
                        {pcId}
                      </button>
                    );
                  })}
                  <button
                    type="button"
                    onClick={() => handleSelectSeat('Portátil')}
                    className={`col-span-4 sm:col-span-6 py-1.5 text-center text-xs font-mono rounded-lg transition-all cursor-pointer border ${
                      selectedSeat === 'Portátil'
                        ? 'bg-white text-black font-bold border-white shadow-xs'
                        : 'bg-neutral-950/80 border-neutral-800 text-neutral-400 hover:text-white hover:bg-neutral-800'
                    }`}
                  >
                    Portátil propio (Sin PC de torre)
                  </button>
                </div>
              </div>
            </>
          )}

          {/* CLASES DE HOY */}
          <div className="rounded-2xl border border-neutral-800 bg-neutral-900/50 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="p-1.5 rounded-lg bg-neutral-800 text-neutral-300">
                  <Clock className="w-4 h-4" />
                </span>
                <div>
                  <h3 className="text-xs font-semibold text-white">
                    Clases de Hoy (2º SMR)
                  </h3>
                  <p className="text-[11px] text-neutral-400">
                    {liveStatus.message}
                  </p>
                </div>
              </div>

              <span className="text-[10px] font-mono text-neutral-400">
                {liveStatus.status === 'in_class' ? 'En curso' : 'Horario lectivo'}
              </span>
            </div>

            {todaySchedule && todaySchedule.length > 0 ? (
              <div className="space-y-1.5 pt-1">
                {todaySchedule.map((item, idx) => {
                  const isRecreo = item.code === 'RECREO';
                  return (
                    <div
                      key={idx}
                      className={`px-3 py-2 rounded-xl text-xs flex items-center justify-between border ${
                        isRecreo
                          ? 'bg-neutral-950/60 border-neutral-800/60 text-neutral-400'
                          : 'bg-neutral-950 border-neutral-800 text-neutral-200'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-[10px] text-neutral-400 w-24 shrink-0">
                          {item.slot.label}
                        </span>
                        <span className="font-semibold text-white">
                          {isRecreo ? 'Recreo (30 min)' : item.subject?.name || item.code}
                        </span>
                      </div>
                      <span className="font-mono text-[10px] text-neutral-400">
                        {item.code}
                      </span>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="p-3 text-center text-xs text-neutral-400 font-mono">
                Hoy no hay clases lectivas programadas.
              </div>
            )}
          </div>

          {/* MODIFICAR DATOS */}
          {!isViewingOther && (
            <div className="rounded-2xl border border-neutral-800 bg-neutral-900/50 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="p-1.5 rounded-lg bg-neutral-800 text-neutral-300">
                    <Edit2 className="w-4 h-4" />
                  </span>
                  <div>
                    <h3 className="text-xs font-semibold text-white">
                      Modificar Datos de la Ficha
                    </h3>
                    <p className="text-[11px] text-neutral-400">
                      Actualiza tu nombre completo o número NIA
                    </p>
                  </div>
                </div>

                {!isEditing && (
                  <button
                    type="button"
                    onClick={() => setIsEditing(true)}
                    className="text-xs text-white underline underline-offset-2 hover:text-neutral-300 cursor-pointer"
                  >
                    Editar
                  </button>
                )}
              </div>

              {isEditing && (
                <div className="space-y-3 pt-2">
                  <div className="space-y-1">
                    <label className="text-[11px] font-medium text-neutral-400 block">
                      Nombre y apellidos completos
                    </label>
                    <input
                      type="text"
                      value={fullNameInput}
                      onChange={(e) => setFullNameInput(e.target.value)}
                      className="w-full px-3 py-2 text-xs rounded-xl bg-neutral-950 border border-neutral-800 text-white focus:outline-none focus:border-neutral-500"
                      placeholder="Ej. Juan Pérez Gómez"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-medium text-neutral-400 block">
                      Número de estudiante / NIA
                    </label>
                    <input
                      type="text"
                      value={studentNumberInput}
                      onChange={(e) => setStudentNumberInput(e.target.value.toUpperCase())}
                      className="w-full px-3 py-2 text-xs font-mono uppercase rounded-xl bg-neutral-950 border border-neutral-800 text-white focus:outline-none focus:border-neutral-500"
                      placeholder="Ej. 10482910"
                    />
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => setIsEditing(false)}
                      className="px-3.5 py-1.5 rounded-xl border border-neutral-800 bg-neutral-900 text-xs text-neutral-300 hover:text-white"
                    >
                      Cancelar
                    </button>
                    <button
                      type="button"
                      onClick={handleSaveEdit}
                      disabled={savingEdit}
                      className="px-3.5 py-1.5 rounded-xl bg-white text-black font-semibold text-xs hover:bg-neutral-200 flex items-center gap-1.5"
                    >
                      <Save className="w-3.5 h-3.5" />
                      <span>{savingEdit ? 'Guardando...' : 'Guardar'}</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <footer className="px-5 sm:px-6 py-3.5 border-t border-neutral-800/80 bg-neutral-950/80 flex items-center justify-between shrink-0">
          <div className="text-[11px] font-mono text-neutral-500">
            {isViewingOther ? `@${displayUsername} · 2º SMR` : 'Ficha oficial · 2º SMR · 2026/2027'}
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-xl text-xs px-4 py-1.5 bg-neutral-900 border border-neutral-800 hover:bg-neutral-800 text-white cursor-pointer"
          >
            Cerrar
          </button>
        </footer>
      </div>
    </div>,
    document.body
  );
};

export default StudentCardModal;
