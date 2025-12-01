import { Achievement, UserStats, Session } from './types';
import { Trophy, Flame, Clock, BookOpen, Zap, Target } from 'lucide-react';

export const XP_PER_MINUTE = 10;
export const BASE_LEVEL_XP = 500; // Base XP needed for level 1 -> 2
export const LEVEL_MULTIPLIER = 1.2; // Exponential growth for levels

export const calculateNextLevelXP = (level: number) => {
  return Math.floor(BASE_LEVEL_XP * Math.pow(LEVEL_MULTIPLIER, level - 1));
};

export const INITIAL_STATS: UserStats = {
  level: 1,
  currentXP: 0,
  nextLevelXP: BASE_LEVEL_XP,
  totalStudyMinutes: 0,
  streakDays: 0,
  lastStudyDate: null,
};

// Define Achievements
// Note: In a real app, we might store 'unlocked' state in DB. 
// Here we re-evaluate or store in local storage.
export const ACHIEVEMENTS_DATA: Omit<Achievement, 'unlocked'>[] = [
  {
    id: 'first_step',
    title: 'Novice Scholar',
    description: 'Complete your first study session.',
    icon: '🌱',
    condition: (_, sessions) => sessions.length >= 1
  },
  {
    id: 'dedicated',
    title: 'Dedicated Student',
    description: 'Study for a total of 5 hours.',
    icon: '📚',
    condition: (stats) => stats.totalStudyMinutes >= 300
  },
  {
    id: 'streak_3',
    title: 'On Fire',
    description: 'Reach a 3-day study streak.',
    icon: '🔥',
    condition: (stats) => stats.streakDays >= 3
  },
  {
    id: 'deep_work',
    title: 'Deep Focus',
    description: 'Complete a single session longer than 60 minutes.',
    icon: '🧘',
    condition: (_, sessions) => sessions.some(s => s.durationMinutes >= 60)
  },
  {
    id: 'master',
    title: 'Grandmaster',
    description: 'Reach Level 10.',
    icon: '👑',
    condition: (stats) => stats.level >= 10
  }
];