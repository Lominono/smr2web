export type PanicLevel = 'chill' | 'medio' | 'marron' | 'f';

export type SubjectCode = 'SR' | 'SOR' | 'SI' | 'AW' | 'EIE' | 'FCT' | 'GENERAL';

export interface SubjectInfo {
  code: SubjectCode;
  name: string;
  fullName: string;
  color: string;
  bgColor: string;
  borderColor: string;
}

export interface Profile {
  id: string;
  username: string;
  full_name?: string;
  avatar_url?: string;
  rank: 'Script Kiddie' | 'Crimpador Novato' | 'Admin de DHCP' | 'Master de Active Directory' | 'Root Supremo del Aula';
  karma_points: number;
  created_at?: string;
}

export interface Deadline {
  id: string;
  title: string;
  subject: SubjectCode;
  due_date: string; // ISO date string
  panic_level: PanicLevel;
  description?: string;
  classroom?: string;
  created_by?: string;
  creator_name?: string;
  created_at?: string;
  done_by_user?: boolean;
}

export type ResourceCategory = 'chuleta' | 'apuntes' | 'script_bash' | 'script_ps' | 'packet_tracer' | 'examen_viejo';

export interface Resource {
  id: string;
  title: string;
  subject: SubjectCode;
  category: ResourceCategory;
  description: string;
  command?: string; // If it's a quick terminal command to copy
  link_url?: string; // If it's a PDF, Drive, GitHub repo
  upvotes: number;
  created_by?: string;
  creator_name?: string;
  created_at?: string;
}

export interface Quote {
  id: string;
  quote: string;
  teacher_name: string;
  subject?: SubjectCode;
  context: string;
  date: string;
  upvotes: number;
  created_by?: string;
  creator_name?: string;
}

export type WallTag = 'aviso' | 'queja' | 'meme' | 'duda';

export interface WallMessage {
  id: string;
  author_name: string;
  author_rank?: string;
  content: string;
  tag: WallTag;
  created_at: string;
}

export interface ScheduleClass {
  id: string;
  dayOfWeek: number; // 1 = Lunes, 5 = Viernes
  startHour: string; // "08:30"
  endHour: string;   // "09:25"
  subject: SubjectCode;
  classroom: string;
  teacher: string;
}
