export type LevelId = 1 | 2 | 3 | 4 | 5 | 6 | 7;

export interface Hint {
  id: number;
  cost: number;
  text: string;
}

export interface LevelData {
  id: LevelId;
  title: string;
  category: string;
  difficulty: 'Fácil' | 'Media' | 'Avanzada' | 'Experto';
  points: number;
  objective: string;
  lesson: {
    overview: string;
    howItWorks: string;
    vulnerableCodeExample: string;
    vulnerableCodeLang: string;
    whyItHappens: string;
    realWorldImpact: string;
  };
  challenge: {
    description: string;
    targetHint: string;
    devtoolsTab: 'Elements (Inspector)' | 'Console' | 'Network (Red)' | 'Application (Cookies/Storage)' | 'Terminal';
  };
  hints: Hint[];
  flag: string;
  solution: {
    steps: string[];
    explanation: string;
    secureCodeExample: string;
    secureCodeLang: string;
    defenseRecommendations: string[];
  };
}

export interface LabProgress {
  currentLevel: LevelId;
  completedLevels: LevelId[];
  score: number;
  unlockedHints: Record<number, number[]>; // levelId -> array of hint ids unlocked
  unlockedSolutions: number[];
  flagSubmissions: Record<number, string>;
  hasAcceptedEthics: boolean;
}

export interface TerminalEntry {
  id: string;
  type: 'input' | 'output' | 'error' | 'success' | 'system';
  content: string;
}

export interface MockFile {
  name: string;
  path: string;
  content: string;
  isDir?: boolean;
}
