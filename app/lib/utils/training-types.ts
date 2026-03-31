import {
  Footprints,
  Bike,
  Dumbbell,
  Sparkles,
  StretchHorizontal,
  Waves,
  Moon,
  Activity,
  PersonStanding,
  Mountain,
  Trophy,
} from 'lucide-react';
import type { ElementType } from 'react';
import type { TrainingType, LoadType } from '~/types/training';

export const iconMap: Record<string, ElementType> = {
  Footprints,
  Bike,
  Dumbbell,
  Sparkles,
  StretchHorizontal,
  Waves,
  Moon,
  Activity,
  PersonStanding,
  Mountain,
  Trophy,
};

export const competitionConfig = {
  color: 'text-amber-700 dark:text-amber-300',
  bgColor: 'bg-amber-100 dark:bg-amber-900',
  borderColor: 'border-amber-400 dark:border-amber-500',
  icon: 'Trophy',
} as const;

export const trainingTypeConfig: Record<
  TrainingType,
  { color: string; bgColor: string; icon: string }
> = {
  run: {
    color: 'text-blue-700 dark:text-blue-300',
    bgColor: 'bg-blue-100 dark:bg-blue-900',
    icon: 'Footprints',
  },
  cycling: {
    color: 'text-green-700 dark:text-green-300',
    bgColor: 'bg-green-100 dark:bg-green-900',
    icon: 'Bike',
  },
  strength: {
    color: 'text-orange-700 dark:text-orange-300',
    bgColor: 'bg-orange-100 dark:bg-orange-900',
    icon: 'Dumbbell',
  },
  yoga: {
    color: 'text-purple-700 dark:text-purple-300',
    bgColor: 'bg-purple-100 dark:bg-purple-900',
    icon: 'Sparkles',
  },
  mobility: {
    color: 'text-teal-700 dark:text-teal-300',
    bgColor: 'bg-teal-100 dark:bg-teal-900',
    icon: 'StretchHorizontal',
  },
  swimming: {
    color: 'text-cyan-700 dark:text-cyan-300',
    bgColor: 'bg-cyan-100 dark:bg-cyan-900',
    icon: 'Waves',
  },
  walk: {
    color: 'text-amber-700 dark:text-amber-300',
    bgColor: 'bg-amber-100 dark:bg-amber-900',
    icon: 'PersonStanding',
  },
  hike: {
    color: 'text-lime-700 dark:text-lime-300',
    bgColor: 'bg-lime-100 dark:bg-lime-900',
    icon: 'Mountain',
  },
  pilates: {
    color: 'text-pink-700 dark:text-pink-300',
    bgColor: 'bg-pink-100 dark:bg-pink-900',
    icon: 'PersonStanding',
  },
  elliptical: {
    color: 'text-indigo-700 dark:text-indigo-300',
    bgColor: 'bg-indigo-100 dark:bg-indigo-900',
    icon: 'Activity',
  },
  rest_day: {
    color: 'text-gray-500 dark:text-gray-400',
    bgColor: 'bg-gray-100 dark:bg-gray-800',
    icon: 'Moon',
  },
  other: {
    color: 'text-slate-600 dark:text-slate-300',
    bgColor: 'bg-slate-100 dark:bg-slate-800',
    icon: 'Activity',
  },
};

export const DISTANCE_BASED_TYPES = [
  'run',
  'cycling',
  'swimming',
  'walk',
  'hike',
  'elliptical',
] as const;

export function isDistanceBased(trainingType: TrainingType): boolean {
  return (DISTANCE_BASED_TYPES as readonly string[]).includes(trainingType);
}

export const loadTypeConfig: Record<LoadType, { color: string; bgColor: string; label: string }> = {
  easy: {
    color: 'text-green-700 dark:text-green-300',
    bgColor: 'bg-green-100 dark:bg-green-900',
    label: 'Easy',
  },
  medium: {
    color: 'text-yellow-700 dark:text-yellow-300',
    bgColor: 'bg-yellow-100 dark:bg-yellow-900',
    label: 'Medium',
  },
  hard: {
    color: 'text-red-700 dark:text-red-300',
    bgColor: 'bg-red-100 dark:bg-red-900',
    label: 'Hard',
  },
};
