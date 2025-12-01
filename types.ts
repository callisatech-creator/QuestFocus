export interface Session {
  id: string;
  startTime: number;
  endTime: number;
  durationMinutes: number;
  subject: string;
  xpEarned: number;
}

export interface UserStats {
  level: number;
  currentXP: number;
  nextLevelXP: number;
  totalStudyMinutes: number;
  streakDays: number;
  lastStudyDate: string | null; // ISO Date string
}

export interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: string;
  unlocked: boolean;
  condition: (stats: UserStats, sessions: Session[]) => boolean;
}

export enum AppView {
  TIMER = 'TIMER',
  STATS = 'STATS',
  ACHIEVEMENTS = 'ACHIEVEMENTS'
}

export interface GeminiFeedback {
  message: string;
  type: 'encouragement' | 'victory' | 'tip';
}