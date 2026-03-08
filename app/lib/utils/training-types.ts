import type { TrainingType, LoadType } from '~/types/training';

export const trainingTypeConfig: Record<
  TrainingType,
  { color: string; bgColor: string; icon: string }
> = {
  run: { color: 'text-blue-700', bgColor: 'bg-blue-100', icon: 'Footprints' },
  cycling: {
    color: 'text-green-700',
    bgColor: 'bg-green-100',
    icon: 'Bike',
  },
  strength: {
    color: 'text-orange-700',
    bgColor: 'bg-orange-100',
    icon: 'Dumbbell',
  },
  yoga: {
    color: 'text-purple-700',
    bgColor: 'bg-purple-100',
    icon: 'Sparkles',
  },
  mobility: {
    color: 'text-teal-700',
    bgColor: 'bg-teal-100',
    icon: 'StretchHorizontal',
  },
  swimming: {
    color: 'text-cyan-700',
    bgColor: 'bg-cyan-100',
    icon: 'Waves',
  },
  rest_day: {
    color: 'text-gray-500',
    bgColor: 'bg-gray-100',
    icon: 'Moon',
  },
  other: {
    color: 'text-slate-600',
    bgColor: 'bg-slate-100',
    icon: 'Activity',
  },
};

export const loadTypeConfig: Record<
  LoadType,
  { color: string; bgColor: string; label: string }
> = {
  easy: { color: 'text-green-700', bgColor: 'bg-green-100', label: 'Easy' },
  medium: {
    color: 'text-yellow-700',
    bgColor: 'bg-yellow-100',
    label: 'Medium',
  },
  hard: { color: 'text-red-700', bgColor: 'bg-red-100', label: 'Hard' },
};
