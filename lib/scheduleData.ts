export interface SubjectInfo {
  code: string;
  name: string;
  description: string;
  badgeColor: string;
  cardBg: string;
  border: string;
  text: string;
  gradient: string;
}

export const SMR2_SUBJECTS: Record<string, SubjectInfo> = {
  SR: {
    code: 'SR',
    name: 'Servicios en Red',
    description: 'Configuración de servidores DNS, DHCP, Web, FTP, Correo y monitorización.',
    badgeColor: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
    cardBg: 'bg-blue-950/20 hover:bg-blue-900/30',
    border: 'border-blue-500/30',
    text: 'text-blue-400',
    gradient: 'from-blue-600 to-cyan-500',
  },
  SOR: {
    code: 'SOR',
    name: 'Sistemas Operativos en Red',
    description: 'Administración de servidores Windows Server (AD, GPO) y Linux Server.',
    badgeColor: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
    cardBg: 'bg-amber-950/20 hover:bg-amber-900/30',
    border: 'border-amber-500/30',
    text: 'text-amber-400',
    gradient: 'from-amber-500 to-orange-500',
  },
  SI: {
    code: 'SI',
    name: 'Seguridad Informática',
    description: 'Criptografía, firewalls, copias de seguridad, análisis de vulnerabilidades y malware.',
    badgeColor: 'bg-purple-500/20 text-purple-300 border-purple-500/30',
    cardBg: 'bg-purple-950/20 hover:bg-purple-900/30',
    border: 'border-purple-500/30',
    text: 'text-purple-400',
    gradient: 'from-purple-500 to-violet-600',
  },
  AW: {
    code: 'AW',
    name: 'Aplicaciones Web',
    description: 'Instalación y gestión de CMS (WordPress, Moodle), bases de datos y despliegue web.',
    badgeColor: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
    cardBg: 'bg-emerald-950/20 hover:bg-emerald-900/30',
    border: 'border-emerald-500/30',
    text: 'text-emerald-400',
    gradient: 'from-emerald-500 to-teal-500',
  },
  MEP: {
    code: 'MEP',
    name: 'Módulo de Empresa / Profesional',
    description: 'Empresa e iniciativa emprendedora, orientación laboral y gestión de proyectos IT.',
    badgeColor: 'bg-rose-500/20 text-rose-300 border-rose-500/30',
    cardBg: 'bg-rose-950/20 hover:bg-rose-900/30',
    border: 'border-rose-500/30',
    text: 'text-rose-400',
    gradient: 'from-rose-500 to-pink-600',
  },
  IP2: {
    code: 'IP2',
    name: 'Inglés Profesional 2',
    description: 'Vocabulario técnico de redes, soporte a usuarios y documentación en inglés.',
    badgeColor: 'bg-sky-500/20 text-sky-300 border-sky-500/30',
    cardBg: 'bg-sky-950/20 hover:bg-sky-900/30',
    border: 'border-sky-500/30',
    text: 'text-sky-400',
    gradient: 'from-sky-500 to-indigo-500',
  },
  PI: {
    code: 'PI',
    name: 'Proyecto Intermodular',
    description: 'Diseño, implantación y defensa de un proyecto integral de sistemas y redes.',
    badgeColor: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30',
    cardBg: 'bg-yellow-950/20 hover:bg-yellow-900/30',
    border: 'border-yellow-500/30',
    text: 'text-yellow-400',
    gradient: 'from-yellow-400 to-amber-500',
  },
  DIG: {
    code: 'DIG',
    name: 'Digitalización Aplicada',
    description: 'Herramientas de digitalización, automatización e industria 4.0 en el sector productivo.',
    badgeColor: 'bg-fuchsia-500/20 text-fuchsia-300 border-fuchsia-500/30',
    cardBg: 'bg-fuchsia-950/20 hover:bg-fuchsia-900/30',
    border: 'border-fuchsia-500/30',
    text: 'text-fuchsia-400',
    gradient: 'from-fuchsia-500 to-pink-500',
  },
  RECREO: {
    code: 'RECREO',
    name: 'Recreo',
    description: 'Descanso de media mañana. Momento para el almuerzo y partidas en el Arcade.',
    badgeColor: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
    cardBg: 'bg-emerald-950/30 hover:bg-emerald-900/40',
    border: 'border-emerald-500/40',
    text: 'text-emerald-400',
    gradient: 'from-emerald-500 to-green-600',
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
  { index: 1, label: '8.15 - 9.05', startMinutes: 8 * 60 + 15, endMinutes: 9 * 60 + 5 },
  { index: 2, label: '9.05 - 10.00', startMinutes: 9 * 60 + 5, endMinutes: 10 * 60 },
  { index: 3, label: '10.00 - 10.55', startMinutes: 10 * 60, endMinutes: 10 * 60 + 55 },
  { index: 4, label: '10.55 - 11.25', startMinutes: 10 * 60 + 55, endMinutes: 11 * 60 + 25, isRecreo: true },
  { index: 5, label: '11.25 - 12.20', startMinutes: 11 * 60 + 25, endMinutes: 12 * 60 + 20 },
  { index: 6, label: '12.20 - 13.15', startMinutes: 12 * 60 + 20, endMinutes: 13 * 60 + 15 },
  { index: 7, label: '13.15 - 14.05', startMinutes: 13 * 60 + 15, endMinutes: 14 * 60 + 5 },
];

export type DayKey = 'lunes' | 'martes' | 'miercoles' | 'jueves' | 'viernes';

export interface DayInfo {
  key: DayKey;
  label: string;
  shortLabel: string;
  dayIndex: number; // 1 = Monday, 5 = Friday
}

export const DAYS: DayInfo[] = [
  { key: 'lunes', label: 'LUNES', shortLabel: 'Lun', dayIndex: 1 },
  { key: 'martes', label: 'MARTES', shortLabel: 'Mar', dayIndex: 2 },
  { key: 'miercoles', label: 'MIÉRCOLES', shortLabel: 'Mié', dayIndex: 3 },
  { key: 'jueves', label: 'JUEVES', shortLabel: 'Jue', dayIndex: 4 },
  { key: 'viernes', label: 'VIERNES', shortLabel: 'Vie', dayIndex: 5 },
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
      message: 'Fin de semana · Próxima clase: Lunes 8:15 (SR)',
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
      message: `Empieza en ${diff} min (${firstSubjectCode} a las 8:15)`,
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
      message: `Clases finalizadas por hoy · Próxima: ${nextSubjectCode} a las 8:15`,
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

      const timeToRecreo =
        currentMinutes < 10 * 60 + 55 ? 10 * 60 + 55 - currentMinutes : null;

      let msg = `En clase: ${subjectCode} · Quedan ${remaining} min`;
      if (timeToRecreo !== null && timeToRecreo > 0 && timeToRecreo <= 90) {
        msg += ` · Recreo en ${timeToRecreo}m`;
      }

      return {
        status: 'in_class',
        currentSubjectCode: subjectCode,
        currentSubject: subject,
        currentSlot: slot,
        nextSubjectCode,
        nextSubject: nextSubjectCode ? SMR2_SUBJECTS[nextSubjectCode] : null,
        minutesRemaining: remaining,
        message: msg,
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
    message: 'Horario escolar SMR2',
  };
}
