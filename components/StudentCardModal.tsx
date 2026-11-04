'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import Image from 'next/image';
import {
  X,
  CheckCircle2,
  CalendarCheck,
  Copy,
  Check,
  Monitor,
  Flame,
  Clock,
  Sparkles,
  Edit2,
  Save,
  BookOpen,
  Hash,
  User,
} from 'lucide-react';
import { UserProfile } from '@/lib/types';
import { sound } from '@/lib/audio';
import { Button } from '@/components/ui/Button';
import {
  getCurrentScheduleStatus,
  SCHEDULE_GRID,
  SMR2_SUBJECTS,
  TIME_SLOTS,
  DAYS,
  DayKey,
} from '@/lib/scheduleData';
import { saveStudentIdentification } from '@/lib/authService';

interface StudentCardModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: UserProfile | null;
  onUpdateUser: (updated: UserProfile) => void;
}

export const StudentCardModal: React.FC<StudentCardModalProps> = ({
  isOpen,
  onClose,
  user,
  onUpdateUser,
}) => {
  const [mounted, setMounted] = useState(false);
  const [copied, setCopied] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [fullNameInput, setFullNameInput] = useState(user?.full_name || '');
  const [studentNumberInput, setStudentNumberInput] = useState(user?.student_number || '');
  const [selectedSeat, setSelectedSeat] = useState<string>('PC-01');
  const [savingEdit, setSavingEdit] = useState(false);
  const [attendanceClaimed, setAttendanceClaimed] = useState(false);
  const [attendanceStreak, setAttendanceStreak] = useState(1);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Sincronizar datos de usuario
  useEffect(() => {
    if (user) {
      setFullNameInput(user.full_name || '');
      setStudentNumberInput(user.student_number || '');
      try {
        const savedSeat = localStorage.getItem(`smr2_pc_seat_${user.id}`);
        if (savedSeat) setSelectedSeat(savedSeat);

        const todayKey = new Date().toISOString().slice(0, 10);
        const lastAtt = localStorage.getItem(`smr2_attendance_date_${user.id}`);
        const savedStreak = parseInt(localStorage.getItem(`smr2_attendance_streak_${user.id}`) || '1', 10);
        setAttendanceStreak(isNaN(savedStreak) ? 1 : savedStreak);
        setAttendanceClaimed(lastAtt === todayKey);
      } catch {}
    }
  }, [user]);

  // Bloquear scroll de fondo cuando está abierto
  useEffect(() => {
    if (isOpen) {
      const prev = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = prev;
      };
    }
  }, [isOpen]);

  // Horario de hoy para este estudiante
  const todaySchedule = useMemo(() => {
    const now = new Date();
    const day = now.getDay();
    const dayMap: Record<number, DayKey> = {
      1: 'lunes',
      2: 'martes',
      3: 'miercoles',
      4: 'jueves',
      5: 'viernes',
    };
    const dayKey = dayMap[day];
    if (!dayKey) return null;

    const codes = SCHEDULE_GRID[dayKey] || [];
    return codes.map((code, idx) => ({
      slot: TIME_SLOTS[idx],
      code,
      subject: SMR2_SUBJECTS[code] || null,
    }));
  }, []);

  const liveStatus = useMemo(() => getCurrentScheduleStatus(), []);

  if (!isOpen || !mounted || !user) return null;

  // Registrar asistencia de clase
  const handleClaimAttendance = () => {
    if (attendanceClaimed) return;

    try {
      const todayKey = new Date().toISOString().slice(0, 10);
      const newStreak = attendanceStreak + 1;
      setAttendanceStreak(newStreak);
      setAttendanceClaimed(true);

      localStorage.setItem(`smr2_attendance_date_${user.id}`, todayKey);
      localStorage.setItem(`smr2_attendance_streak_${user.id}`, String(newStreak));

      // Otorgar bono de puntualidad (+25 fichas)
      const bonusCoins = 25;
      const updatedUser: UserProfile = {
        ...user,
        coins: (user.coins || 0) + bonusCoins,
        streak_count: newStreak,
      };

      onUpdateUser(updatedUser);
      sound.jackpot();
    } catch {}
  };

  // Guardar puesto de PC
  const handleSelectSeat = (seat: string) => {
    setSelectedSeat(seat);
    try {
      localStorage.setItem(`smr2_pc_seat_${user.id}`, seat);
      sound.tap();
    } catch {}
  };

  // Copiar ficha de estudiante al portapapeles
  const handleCopyCard = () => {
    const text = `--- FICHA DE ESTUDIANTE SMR2 ---\nNombre: ${user.full_name || user.username}\nUsuario: @${user.username}\nNIA: ${user.student_number || 'No asignado'}\nCurso: 2º SMR · Aula 35 (${selectedSeat})\nEstado: Alumno Oficial Activo (2026/2027)\nPortal: https://smr2web.vercel.app`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    sound.tap();
    setTimeout(() => setCopied(false), 2000);
  };

  // Guardar edición de datos
  const handleSaveEdit = async () => {
    if (!fullNameInput.trim() || !studentNumberInput.trim()) return;
    setSavingEdit(true);
    try {
      const res = await saveStudentIdentification(user.id, fullNameInput.trim(), studentNumberInput.trim());
      if (res.success && res.user) {
        onUpdateUser(res.user);
        setIsEditing(false);
        sound.coinWin();
      }
    } catch {}
    setSavingEdit(false);
  };

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
        className="relative z-10 w-full max-w-xl max-h-[92dvh] rounded-3xl bg-[#09090b] border border-neutral-800 shadow-2xl flex flex-col overflow-hidden text-neutral-200 animate-in fade-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Cabecera del modal */}
        <header className="px-5 sm:px-6 py-4 border-b border-neutral-800/80 flex items-center justify-between shrink-0 bg-[#09090b]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-neutral-900 border border-neutral-800 p-1.5 flex items-center justify-center shadow-xs">
              <Image
                src="/logo.png"
                alt="SMR2 Logo"
                width={24}
                height={24}
                className="object-contain"
                priority
              />
            </div>
            <div>
              <h2 id="student-card-title" className="text-sm font-semibold tracking-tight text-white">
                Ficha Oficial de Estudiante
              </h2>
              <p className="text-[11px] text-neutral-500 font-mono">
                Credencial Digital · 2º SMR · Aula 35
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
          {/* ============================================================== */}
          {/* CARNET DIGITAL APPLE WALLET / CAMPUS PASS                     */}
          {/* ============================================================== */}
          <div className="relative rounded-2xl bg-gradient-to-br from-neutral-900 via-[#101014] to-neutral-950 border border-neutral-700/80 p-5 sm:p-6 shadow-2xl text-white overflow-hidden select-none">
            {/* Luz ambiental sutil en la tarjeta */}
            <div className="absolute -top-12 -right-12 w-48 h-48 bg-sky-500/10 rounded-full blur-2xl pointer-events-none" />
            <div className="absolute -bottom-12 -left-12 w-48 h-48 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none" />

            {/* Fila 1: Logo y Centro */}
            <div className="flex items-center justify-between border-b border-neutral-800/80 pb-3">
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs font-bold tracking-widest uppercase text-neutral-300">
                  2º SMR CAMPUS PASS
                </span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-950/80 border border-emerald-800 text-emerald-400 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  OFICIAL
                </span>
              </div>
              <span className="text-[10px] font-mono text-neutral-400">
                2026 — 2027
              </span>
            </div>

            {/* Fila 2: Chip inteligente y datos */}
            <div className="pt-4 pb-2 flex items-start justify-between gap-4">
              <div className="space-y-1">
                <div className="text-[10px] font-mono uppercase tracking-wider text-neutral-400">
                  Estudiante Oficial
                </div>
                <div className="text-lg sm:text-xl font-bold tracking-tight text-white leading-tight">
                  {user.full_name || 'Nombre no configurado'}
                </div>
                <div className="text-xs text-neutral-400 font-mono">
                  @{user.username}
                </div>
              </div>

              {/* Chip metálico NFC decorativo */}
              <div className="w-11 h-8 rounded-md bg-gradient-to-tr from-amber-600 via-amber-400 to-amber-200 border border-amber-300/60 shadow-inner flex flex-col justify-around p-1 shrink-0 opacity-90">
                <div className="w-full h-[1px] bg-amber-800/50" />
                <div className="w-full h-[1px] bg-amber-800/50" />
                <div className="w-full h-[1px] bg-amber-800/50" />
              </div>
            </div>

            {/* Fila 3: NIA, Puesto y Aula */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-3 border-t border-neutral-800/80">
              <div>
                <span className="text-[10px] font-mono uppercase text-neutral-400 block">
                  Número NIA
                </span>
                <span className="text-xs font-mono font-bold text-sky-400">
                  {user.student_number ? `NIA-${user.student_number}` : 'SIN ASIGNAR'}
                </span>
              </div>

              <div>
                <span className="text-[10px] font-mono uppercase text-neutral-400 block">
                  Puesto Taller
                </span>
                <span className="text-xs font-mono font-medium text-emerald-400">
                  {selectedSeat}
                </span>
              </div>

              <div className="col-span-2 sm:col-span-1">
                <span className="text-[10px] font-mono uppercase text-neutral-400 block">
                  Ubicación
                </span>
                <span className="text-xs font-mono font-medium text-neutral-300">
                  Aula 35
                </span>
              </div>
            </div>

            {/* Fila 4: Código de barras visual */}
            <div className="mt-4 pt-3 border-t border-neutral-800/60 flex items-center justify-between">
              <div className="font-mono text-[9px] tracking-widest text-neutral-500">
                ||| | |||| | ||| |||| | || | ||| |||| | ||| ||
              </div>
              <div className="text-[10px] font-mono text-neutral-400">
                Sistemas Microinformáticos y Redes
              </div>
            </div>
          </div>

          {/* ============================================================== */}
          {/* UTILIDAD 1: CHECK-IN DIARIO DE ASISTENCIA A CLASE              */}
          {/* ============================================================== */}
          <div className="rounded-2xl border border-neutral-800 bg-neutral-900/50 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="p-1.5 rounded-lg bg-emerald-950/80 border border-emerald-800 text-emerald-400">
                  <CalendarCheck className="w-4 h-4" />
                </span>
                <div>
                  <h3 className="text-xs font-semibold text-white">
                    Check-in Diario de Asistencia
                  </h3>
                  <p className="text-[11px] text-neutral-400">
                    Confirma tu asistencia en el aula para ganar fichas y sumar racha
                  </p>
                </div>
              </div>

              {/* Contador de racha */}
              <div className="flex items-center gap-1 text-xs font-mono font-semibold text-amber-400 bg-amber-950/40 border border-amber-800/60 px-2.5 py-1 rounded-full">
                <Flame className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                <span>Racha: {attendanceStreak}d</span>
              </div>
            </div>

            <div className="pt-1">
              {attendanceClaimed ? (
                <div className="p-3 rounded-xl bg-emerald-950/30 border border-emerald-800/60 flex items-center justify-between text-xs text-emerald-400">
                  <span className="flex items-center gap-2 font-medium">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    ¡Asistencia registrada con éxito para hoy!
                  </span>
                  <span className="font-mono text-[11px] text-emerald-300">
                    +25 fichas reclamadas
                  </span>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={handleClaimAttendance}
                  className="w-full py-2.5 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-neutral-950 font-semibold text-xs transition-all flex items-center justify-center gap-2 cursor-pointer shadow-md active:scale-98"
                >
                  <Sparkles className="w-4 h-4" />
                  <span>Confirmar asistencia hoy (+25 fichas)</span>
                </button>
              )}
            </div>
          </div>

          {/* ============================================================== */}
          {/* UTILIDAD 2: MI PUESTO EN EL TALLER DE INFORMÁTICA              */}
          {/* ============================================================== */}
          <div className="rounded-2xl border border-neutral-800 bg-neutral-900/50 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="p-1.5 rounded-lg bg-neutral-800 border border-neutral-700 text-neutral-300">
                  <Monitor className="w-4 h-4" />
                </span>
                <div>
                  <h3 className="text-xs font-semibold text-white">
                    Mi Puesto de PC en el Aula 35
                  </h3>
                  <p className="text-[11px] text-neutral-400">
                    Selecciona en qué ordenador del taller te sientas habitualmente
                  </p>
                </div>
              </div>

              <span className="text-xs font-mono font-bold text-sky-400 px-2 py-0.5 rounded bg-sky-950/80 border border-sky-800">
                {selectedSeat}
              </span>
            </div>

            {/* Selector de puestos tipo rejilla rápida */}
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
                        ? 'bg-sky-500 text-neutral-950 font-bold border-sky-400 shadow-sm'
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
                    ? 'bg-sky-500 text-neutral-950 font-bold border-sky-400 shadow-sm'
                    : 'bg-neutral-950/80 border-neutral-800 text-neutral-400 hover:text-white hover:bg-neutral-800'
                }`}
              >
                Portátil propio (Sin PC fijo)
              </button>
            </div>
          </div>

          {/* ============================================================== */}
          {/* UTILIDAD 3: MIS CLASES DE HOY (HORARIO PERSONALIZADO)          */}
          {/* ============================================================== */}
          <div className="rounded-2xl border border-neutral-800 bg-neutral-900/50 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="p-1.5 rounded-lg bg-sky-950/80 border border-sky-800 text-sky-400">
                  <Clock className="w-4 h-4" />
                </span>
                <div>
                  <h3 className="text-xs font-semibold text-white">
                    Mis Clases de Hoy
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
                Hoy es fin de semana. No hay clases hasta el lunes a las 08:15 (SR).
              </div>
            )}
          </div>

          {/* ============================================================== */}
          {/* UTILIDAD 4: EDITAR DATOS DE LA FICHA                           */}
          {/* ============================================================== */}
          <div className="rounded-2xl border border-neutral-800 bg-neutral-900/50 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="p-1.5 rounded-lg bg-neutral-800 border border-neutral-700 text-neutral-300">
                  <Edit2 className="w-4 h-4" />
                </span>
                <div>
                  <h3 className="text-xs font-semibold text-white">
                    Modificar Datos de Identificación
                  </h3>
                  <p className="text-[11px] text-neutral-400">
                    Corrige tu nombre real o número NIA si hubo algún error
                  </p>
                </div>
              </div>

              {!isEditing && (
                <button
                  type="button"
                  onClick={() => setIsEditing(true)}
                  className="text-xs text-sky-400 hover:underline cursor-pointer"
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
                    className="w-full px-3 py-2 text-xs rounded-xl bg-neutral-950 border border-neutral-800 text-white focus:outline-none focus:border-sky-500"
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
                    className="w-full px-3 py-2 text-xs font-mono uppercase rounded-xl bg-neutral-950 border border-neutral-800 text-white focus:outline-none focus:border-sky-500"
                    placeholder="Ej. 10482910"
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-1">
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => setIsEditing(false)}
                    className="rounded-xl text-xs"
                  >
                    Cancelar
                  </Button>
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={handleSaveEdit}
                    isLoading={savingEdit}
                    className="rounded-xl text-xs bg-white text-black hover:bg-neutral-200"
                  >
                    <Save className="w-3.5 h-3.5 mr-1" />
                    <span>Guardar cambios</span>
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <footer className="px-5 sm:px-6 py-3.5 border-t border-neutral-800/80 bg-neutral-950/80 flex items-center justify-between shrink-0">
          <div className="text-[11px] font-mono text-neutral-500">
            Ficha oficial · 2º SMR · 2026/2027
          </div>

          <Button
            variant="secondary"
            size="sm"
            onClick={onClose}
            className="rounded-xl text-xs px-4 py-1.5 cursor-pointer"
          >
            Cerrar
          </Button>
        </footer>
      </div>
    </div>,
    document.body
  );
};

export default StudentCardModal;
