export interface SubjectInfo {
  code: string;
  name: string;
  description: string;
  badgeColor: string;
  cardBg: string;
  border: string;
  text: string;
  accentHex: string;
}

export const SMR2_SUBJECTS: Record<string, SubjectInfo> = {
  SR: {
    code: 'SR',
    name: 'Servicios en Red',
    description: 'Configuración de servidores DNS, DHCP, Web, FTP, Correo y monitorización.',
    badgeColor: 'bg-sky-500/10 text-sky-400 border-sky-500/20',
    cardBg: 'bg-sky-500/[0.04] hover:bg-sky-500/[0.08]',
    border: 'border-sky-500/20 hover:border-sky-500/40',
    text: 'text-sky-400',
    accentHex: '#38bdf8',
  },
  SOR: {
    code: 'SOR',
    name: 'Sistemas Operativos en Red',
    description: 'Administración de servidores Windows Server (AD, GPO) y Linux Server.',
    badgeColor: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
    cardBg: 'bg-amber-500/[0.04] hover:bg-amber-500/[0.08]',
    border: 'border-amber-500/20 hover:border-amber-500/40',
    text: 'text-amber-400',
    accentHex: '#fbbf24',
  },
  SI: {
    code: 'SI',
    name: 'Seguridad Informática',
    description: 'Criptografía, firewalls, copias de seguridad, análisis de vulnerabilidades y malware.',
    badgeColor: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
    cardBg: 'bg-purple-500/[0.04] hover:bg-purple-500/[0.08]',
    border: 'border-purple-500/20 hover:border-purple-500/40',
    text: 'text-purple-400',
    accentHex: '#c084fc',
  },
  AW: {
    code: 'AW',
    name: 'Aplicaciones Web',
    description: 'Instalación y gestión de CMS (WordPress, Moodle), bases de datos y despliegue web.',
    badgeColor: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    cardBg: 'bg-emerald-500/[0.04] hover:bg-emerald-500/[0.08]',
    border: 'border-emerald-500/20 hover:border-emerald-500/40',
    text: 'text-emerald-400',
    accentHex: '#34d399',
  },
  MEP: {
    code: 'MEP',
    name: 'Módulo de Empresa / Profesional',
    description: 'Empresa e iniciativa emprendedora, orientación laboral y gestión de proyectos IT.',
    badgeColor: 'bg-rose-500/10 text-rose-400 border-rose-500/20',
    cardBg: 'bg-rose-500/[0.04] hover:bg-rose-500/[0.08]',
    border: 'border-rose-500/20 hover:border-rose-500/40',
    text: 'text-rose-400',
    accentHex: '#fb7185',
  },
  IP2: {
    code: 'IP2',
    name: 'Inglés Profesional 2 (Tortura de materia)',
    description: 'Vocabulario técnico de redes, soporte a usuarios y documentación en inglés.',
    badgeColor: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20',
    cardBg: 'bg-cyan-500/[0.04] hover:bg-cyan-500/[0.08]',
    border: 'border-cyan-500/20 hover:border-cyan-500/40',
    text: 'text-cyan-400',
    accentHex: '#22d3ee',
  },
  PI: {
    code: 'PI',
    name: 'Proyecto Intermodular',
    description: 'Diseño, implantación y defensa de un proyecto integral de sistemas y redes.',
    badgeColor: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
    cardBg: 'bg-yellow-500/[0.04] hover:bg-yellow-500/[0.08]',
    border: 'border-yellow-500/20 hover:border-yellow-500/40',
    text: 'text-yellow-400',
    accentHex: '#facc15',
  },
  DIG: {
    code: 'DIG',
    name: 'Digitalización Aplicada',
    description: 'Herramientas de digitalización, automatización e industria 4.0 en el sector productivo.',
    badgeColor: 'bg-fuchsia-500/10 text-fuchsia-400 border-fuchsia-500/20',
    cardBg: 'bg-fuchsia-500/[0.04] hover:bg-fuchsia-500/[0.08]',
    border: 'border-fuchsia-500/20 hover:border-fuchsia-500/40',
    text: 'text-fuchsia-400',
    accentHex: '#e879f9',
  },
  RECREO: {
    code: 'RECREO',
    name: 'Recreo',
    description: 'Descanso de media mañana de 30 minutos.',
    badgeColor: 'bg-zinc-800 text-zinc-300 border-zinc-700/50',
    cardBg: 'bg-zinc-900/40',
    border: 'border-white/[0.06]',
    text: 'text-zinc-400',
    accentHex: '#a1a1aa',
  },
};

export interface TimeSlot {
  index: number;
  label: string;
  startMinutes: number; // minutes from 00:00
  endMinutes: number;
  isRecreo?: boolean;
}

export const TIME_SLOTS: TimeSlot[] = [
  { index: 1, label: '08:15 — 09:05', startMinutes: 8 * 60 + 15, endMinutes: 9 * 60 + 5 },
  { index: 2, label: '09:05 — 10:00', startMinutes: 9 * 60 + 5, endMinutes: 10 * 60 },
  { index: 3, label: '10:00 — 10:55', startMinutes: 10 * 60, endMinutes: 10 * 60 + 55 },
  { index: 4, label: '10:55 — 11:25', startMinutes: 10 * 60 + 55, endMinutes: 11 * 60 + 25, isRecreo: true },
  { index: 5, label: '11:25 — 12:20', startMinutes: 11 * 60 + 25, endMinutes: 12 * 60 + 20 },
  { index: 6, label: '12:20 — 13:15', startMinutes: 12 * 60 + 20, endMinutes: 13 * 60 + 15 },
  { index: 7, label: '13:15 — 14:05', startMinutes: 13 * 60 + 15, endMinutes: 14 * 60 + 5 },
];

export type DayKey = 'lunes' | 'martes' | 'miercoles' | 'jueves' | 'viernes';

export interface DayInfo {
  key: DayKey;
  label: string;
  shortLabel: string;
  dayIndex: number; // 1 = Monday, 5 = Friday
}

export const DAYS: DayInfo[] = [
  { key: 'lunes', label: 'Lunes', shortLabel: 'Lun', dayIndex: 1 },
  { key: 'martes', label: 'Martes', shortLabel: 'Mar', dayIndex: 2 },
  { key: 'miercoles', label: 'Miércoles', shortLabel: 'Mié', dayIndex: 3 },
  { key: 'jueves', label: 'Jueves', shortLabel: 'Jue', dayIndex: 4 },
  { key: 'viernes', label: 'Viernes', shortLabel: 'Vie', dayIndex: 5 },
];

/**
 * Matriz del Horario SMR2:
 * Cada día tiene un array de 7 elementos correspondientes a los 7 TIME_SLOTS.
 */
export const SCHEDULE_GRID: Record<DayKey, string[]> = {
  lunes: ['SR', 'SR', 'SOR', 'RECREO', 'SOR', 'MEP', 'MEP'],
  martes: ['SI', 'SI', 'SI', 'RECREO', 'AW', 'AW', 'AW'],
  miercoles: ['IP2', 'SOR', 'SOR', 'RECREO', 'SOR', 'SR', 'SR'],
  jueves: ['SI', 'SI', 'SR', 'RECREO', 'SR', 'SOR', 'SOR'],
  viernes: ['PI', 'DIG', 'IP2', 'RECREO', 'IP2', 'AW', 'AW'],
};

export interface LiveScheduleStatus {
  status: 'in_class' | 'recreo' | 'before_school' | 'after_school' | 'weekend';
  currentSubjectCode: string | null;
  currentSubject: SubjectInfo | null;
  currentSlot: TimeSlot | null;
  nextSubjectCode: string | null;
  nextSubject: SubjectInfo | null;
  minutesRemaining: number;
  message: string;
}

export function getCurrentScheduleStatus(now: Date = new Date()): LiveScheduleStatus {
  const day = now.getDay(); // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
  const currentMinutes = now.getHours() * 60 + now.getMinutes();

  if (day === 0 || day === 6) {
    return {
      status: 'weekend',
      currentSubjectCode: null,
      currentSubject: null,
      currentSlot: null,
      nextSubjectCode: 'SR',
      nextSubject: SMR2_SUBJECTS['SR'],
      minutesRemaining: 0,
      message: 'Fin de semana · Próxima clase: Lunes 08:15 (SR)',
    };
  }

  const dayKeys: Record<number, DayKey> = {
    1: 'lunes',
    2: 'martes',
    3: 'miercoles',
    4: 'jueves',
    5: 'viernes',
  };

  const todayKey = dayKeys[day];
  const todaySchedule = SCHEDULE_GRID[todayKey];

  const firstSlot = TIME_SLOTS[0];
  const lastSlot = TIME_SLOTS[TIME_SLOTS.length - 1];

  // Antes de empezar las clases (antes de las 8:15)
  if (currentMinutes < firstSlot.startMinutes) {
    const diff = firstSlot.startMinutes - currentMinutes;
    const firstSubjectCode = todaySchedule[0];
    return {
      status: 'before_school',
      currentSubjectCode: null,
      currentSubject: null,
      currentSlot: null,
      nextSubjectCode: firstSubjectCode,
      nextSubject: SMR2_SUBJECTS[firstSubjectCode] || null,
      minutesRemaining: diff,
      message: `Empieza en ${diff} min · ${firstSubjectCode} a las 08:15`,
    };
  }

  // Después de terminar las clases (después de las 14:05)
  if (currentMinutes >= lastSlot.endMinutes) {
    const nextDayKey = day === 5 ? 'lunes' : dayKeys[day + 1];
    const nextSubjectCode = SCHEDULE_GRID[nextDayKey][0];
    return {
      status: 'after_school',
      currentSubjectCode: null,
      currentSubject: null,
      currentSlot: null,
      nextSubjectCode,
      nextSubject: SMR2_SUBJECTS[nextSubjectCode] || null,
      minutesRemaining: 0,
      message: `Clases finalizadas por hoy · Próxima: ${nextSubjectCode} a las 08:15`,
    };
  }

  // Durante la jornada escolar (8:15 a 14:05)
  for (let i = 0; i < TIME_SLOTS.length; i++) {
    const slot = TIME_SLOTS[i];
    if (currentMinutes >= slot.startMinutes && currentMinutes < slot.endMinutes) {
      const subjectCode = todaySchedule[i];
      const subject = SMR2_SUBJECTS[subjectCode] || null;
      const remaining = slot.endMinutes - currentMinutes;
      const nextSlot = i < TIME_SLOTS.length - 1 ? TIME_SLOTS[i + 1] : null;
      const nextSubjectCode = nextSlot ? todaySchedule[i + 1] : null;

      if (slot.isRecreo) {
        return {
          status: 'recreo',
          currentSubjectCode: 'RECREO',
          currentSubject: SMR2_SUBJECTS['RECREO'],
          currentSlot: slot,
          nextSubjectCode,
          nextSubject: nextSubjectCode ? SMR2_SUBJECTS[nextSubjectCode] : null,
          minutesRemaining: remaining,
          message: `Recreo · Restan ${remaining} min · Próxima: ${nextSubjectCode}`,
        };
      }

      return {
        status: 'in_class',
        currentSubjectCode: subjectCode,
        currentSubject: subject,
        currentSlot: slot,
        nextSubjectCode,
        nextSubject: nextSubjectCode ? SMR2_SUBJECTS[nextSubjectCode] : null,
        minutesRemaining: remaining,
        message: `En clase: ${subject?.name || subjectCode} · Quedan ${remaining} min`,
      };
    }
  }

  return {
    status: 'after_school',
    currentSubjectCode: null,
    currentSubject: null,
    currentSlot: null,
    nextSubjectCode: null,
    nextSubject: null,
    minutesRemaining: 0,
    message: 'Horario escolar SMR2 · Aula 204',
  };
}
