import type {
  WeekPlan,
  TrainingSession,
  CreateWeekPlanInput,
  UpdateWeekPlanInput,
  CreateSessionInput,
  UpdateSessionInput,
  TraineeSessionUpdate,
  TypeSpecificData,
} from '~/types/training';

// ---------------------------------------------------------------------------
// In-memory data stores
// ---------------------------------------------------------------------------

const weekPlans = new Map<string, WeekPlan>();
const sessions = new Map<string, TrainingSession>();

let idCounter = 100;
function nextId() {
  return `mock-${++idCounter}`;
}

// ---------------------------------------------------------------------------
// Seed data — 3 weeks of realistic training
// ---------------------------------------------------------------------------

function seed() {
  // Week W09 (Feb 23 – Mar 1, 2026) — previous week, mostly done
  const w09: WeekPlan = {
    id: 'wp-w09',
    weekStart: '2026-02-23',
    year: 2026,
    weekNumber: 9,
    loadType: 'medium',
    totalPlannedKm: 42,
    description: 'Base building week with tempo midweek',
    coachComments: 'Good recovery after last week\'s race. Keep easy pace easy.',
    createdAt: '2026-02-20T10:00:00Z',
    updatedAt: '2026-02-20T10:00:00Z',
  };
  weekPlans.set(w09.weekStart, w09);

  const w09Sessions: Omit<TrainingSession, 'createdAt' | 'updatedAt'>[] = [
    {
      id: 's-w09-1', weekPlanId: w09.id, dayOfWeek: 'monday', sortOrder: 0,
      trainingType: 'run', description: 'Easy recovery run',
      coachComments: 'Keep HR below 140', plannedDurationMinutes: 35, plannedDistanceKm: 5,
      typeSpecificData: { type: 'run', pace_target: '6:30/km', hr_zone: 2, terrain: 'road' },
      isCompleted: true, completedAt: '2026-02-23T08:00:00Z', traineeNotes: 'Felt great, legs fresh',
      stravaActivityId: null, stravaSyncedAt: null,
    },
    {
      id: 's-w09-2', weekPlanId: w09.id, dayOfWeek: 'tuesday', sortOrder: 0,
      trainingType: 'strength', description: 'Upper body + core',
      coachComments: null, plannedDurationMinutes: 45, plannedDistanceKm: null,
      typeSpecificData: { type: 'strength', muscle_groups: ['core', 'upper body'], exercises: [
        { name: 'Plank', sets: 3, reps: '60s' },
        { name: 'Push-ups', sets: 3, reps: 15 },
        { name: 'Pull-ups', sets: 3, reps: 8 },
      ]},
      isCompleted: true, completedAt: '2026-02-24T17:00:00Z', traineeNotes: null,
      stravaActivityId: null, stravaSyncedAt: null,
    },
    {
      id: 's-w09-3', weekPlanId: w09.id, dayOfWeek: 'wednesday', sortOrder: 0,
      trainingType: 'run', description: 'Tempo run — 3x2km @ 5:00/km',
      coachComments: 'Focus on steady effort, 2min jog recovery',
      plannedDurationMinutes: 50, plannedDistanceKm: 10,
      typeSpecificData: { type: 'run', pace_target: '5:00/km', hr_zone: 4, terrain: 'road',
        intervals: [
          { repeat: 3, distance_m: 2000, pace: '5:00/km', rest_seconds: 120, description: 'Tempo repeat' },
        ],
      },
      isCompleted: true, completedAt: '2026-02-25T07:00:00Z', traineeNotes: 'Last rep was tough but managed',
      stravaActivityId: null, stravaSyncedAt: null,
    },
    {
      id: 's-w09-4', weekPlanId: w09.id, dayOfWeek: 'thursday', sortOrder: 0,
      trainingType: 'yoga', description: 'Flexibility & recovery yoga',
      coachComments: null, plannedDurationMinutes: 30, plannedDistanceKm: null,
      typeSpecificData: { type: 'yoga', focus_area: 'Hips & hamstrings', style: 'Yin yoga' },
      isCompleted: true, completedAt: '2026-02-26T18:00:00Z', traineeNotes: null,
      stravaActivityId: null, stravaSyncedAt: null,
    },
    {
      id: 's-w09-5', weekPlanId: w09.id, dayOfWeek: 'friday', sortOrder: 0,
      trainingType: 'rest_day', description: null,
      coachComments: 'Full rest — hydrate well', plannedDurationMinutes: null, plannedDistanceKm: null,
      typeSpecificData: { type: 'rest_day', activity_suggestion: 'Light walk if you feel like it' },
      isCompleted: false, completedAt: null, traineeNotes: null,
      stravaActivityId: null, stravaSyncedAt: null,
    },
    {
      id: 's-w09-6', weekPlanId: w09.id, dayOfWeek: 'saturday', sortOrder: 0,
      trainingType: 'run', description: 'Long easy run',
      coachComments: 'Stay conversational pace throughout',
      plannedDurationMinutes: 90, plannedDistanceKm: 15,
      typeSpecificData: { type: 'run', pace_target: '6:15/km', hr_zone: 2, terrain: 'trail' },
      isCompleted: true, completedAt: '2026-02-28T09:00:00Z', traineeNotes: 'Beautiful trail run, hit 15.2km',
      stravaActivityId: null, stravaSyncedAt: null,
    },
    {
      id: 's-w09-7', weekPlanId: w09.id, dayOfWeek: 'sunday', sortOrder: 0,
      trainingType: 'cycling', description: 'Easy spin for active recovery',
      coachComments: null, plannedDurationMinutes: 60, plannedDistanceKm: 25,
      typeSpecificData: { type: 'cycling', avg_speed_target_kmh: 25, hr_zone: 1, terrain: 'road' },
      isCompleted: false, completedAt: null, traineeNotes: 'Skipped — rain all day',
      stravaActivityId: null, stravaSyncedAt: null,
    },
  ];

  for (const s of w09Sessions) {
    sessions.set(s.id, { ...s, createdAt: w09.createdAt, updatedAt: w09.updatedAt } as TrainingSession);
  }

  // Week W10 (Mar 2 – 8, 2026) — current week, partially completed
  const w10: WeekPlan = {
    id: 'wp-w10',
    weekStart: '2026-03-02',
    year: 2026,
    weekNumber: 10,
    loadType: 'hard',
    totalPlannedKm: 55,
    description: 'Peak week — high mileage with quality sessions',
    coachComments: 'Big week ahead! Prioritise sleep and nutrition.',
    createdAt: '2026-02-28T10:00:00Z',
    updatedAt: '2026-02-28T10:00:00Z',
  };
  weekPlans.set(w10.weekStart, w10);

  const w10Sessions: Omit<TrainingSession, 'createdAt' | 'updatedAt'>[] = [
    {
      id: 's-w10-1', weekPlanId: w10.id, dayOfWeek: 'monday', sortOrder: 0,
      trainingType: 'run', description: 'Easy aerobic run',
      coachComments: 'Shake out the legs', plannedDurationMinutes: 40, plannedDistanceKm: 7,
      typeSpecificData: { type: 'run', pace_target: '6:00/km', hr_zone: 2, terrain: 'road' },
      isCompleted: true, completedAt: '2026-03-02T07:30:00Z', traineeNotes: 'Good start to the week',
      stravaActivityId: null, stravaSyncedAt: null,
    },
    {
      id: 's-w10-2', weekPlanId: w10.id, dayOfWeek: 'tuesday', sortOrder: 0,
      trainingType: 'strength', description: 'Leg strength + plyometrics',
      coachComments: 'Focus on single-leg exercises',
      plannedDurationMinutes: 50, plannedDistanceKm: null,
      typeSpecificData: { type: 'strength', muscle_groups: ['legs', 'glutes'], exercises: [
        { name: 'Bulgarian Split Squat', sets: 3, reps: 10, weight_kg: 20 },
        { name: 'Box Jumps', sets: 3, reps: 8 },
        { name: 'Single-leg Deadlift', sets: 3, reps: 10, weight_kg: 15 },
        { name: 'Calf Raises', sets: 3, reps: 15 },
      ]},
      isCompleted: true, completedAt: '2026-03-03T17:30:00Z', traineeNotes: 'Legs were heavy from yesterday',
      stravaActivityId: null, stravaSyncedAt: null,
    },
    {
      id: 's-w10-3', weekPlanId: w10.id, dayOfWeek: 'wednesday', sortOrder: 0,
      trainingType: 'run', description: 'Interval session — 6x1km @ 4:30/km',
      coachComments: '3min jog between reps. Aim for consistent splits.',
      plannedDurationMinutes: 55, plannedDistanceKm: 12,
      typeSpecificData: { type: 'run', pace_target: '4:30/km', hr_zone: 5, terrain: 'track',
        intervals: [
          { repeat: 6, distance_m: 1000, pace: '4:30/km', rest_seconds: 180, description: 'VO2max intervals' },
        ],
      },
      isCompleted: false, completedAt: null, traineeNotes: null,
      stravaActivityId: null, stravaSyncedAt: null,
    },
    {
      id: 's-w10-4', weekPlanId: w10.id, dayOfWeek: 'thursday', sortOrder: 0,
      trainingType: 'mobility', description: 'Hip & ankle mobility routine',
      coachComments: null, plannedDurationMinutes: 25, plannedDistanceKm: null,
      typeSpecificData: { type: 'mobility', focus_area: 'Hips, ankles, thoracic spine' },
      isCompleted: false, completedAt: null, traineeNotes: null,
      stravaActivityId: null, stravaSyncedAt: null,
    },
    {
      id: 's-w10-5', weekPlanId: w10.id, dayOfWeek: 'friday', sortOrder: 0,
      trainingType: 'run', description: 'Easy run with strides',
      coachComments: '6x100m strides at the end',
      plannedDurationMinutes: 35, plannedDistanceKm: 6,
      typeSpecificData: { type: 'run', pace_target: '6:00/km', hr_zone: 2, terrain: 'road' },
      isCompleted: false, completedAt: null, traineeNotes: null,
      stravaActivityId: null, stravaSyncedAt: null,
    },
    {
      id: 's-w10-6', weekPlanId: w10.id, dayOfWeek: 'saturday', sortOrder: 0,
      trainingType: 'run', description: 'Long run with tempo finish',
      coachComments: 'Last 5km at marathon pace (5:15/km)',
      plannedDurationMinutes: 110, plannedDistanceKm: 20,
      typeSpecificData: { type: 'run', pace_target: '5:45/km', hr_zone: 3, terrain: 'road',
        intervals: [
          { repeat: 1, distance_m: 5000, pace: '5:15/km', description: 'Marathon pace finish' },
        ],
      },
      isCompleted: false, completedAt: null, traineeNotes: null,
      stravaActivityId: null, stravaSyncedAt: null,
    },
    {
      id: 's-w10-7', weekPlanId: w10.id, dayOfWeek: 'sunday', sortOrder: 0,
      trainingType: 'swimming', description: 'Recovery swim',
      coachComments: 'Easy laps, focus on breathing',
      plannedDurationMinutes: 40, plannedDistanceKm: null,
      typeSpecificData: { type: 'swimming', laps: 30, pool_length_m: 25, stroke_type: 'freestyle' },
      isCompleted: false, completedAt: null, traineeNotes: null,
      stravaActivityId: null, stravaSyncedAt: null,
    },
  ];

  for (const s of w10Sessions) {
    sessions.set(s.id, { ...s, createdAt: w10.createdAt, updatedAt: w10.updatedAt } as TrainingSession);
  }

  // Week W11 (Mar 9 – 15, 2026) — next week, nothing done yet
  const w11: WeekPlan = {
    id: 'wp-w11',
    weekStart: '2026-03-09',
    year: 2026,
    weekNumber: 11,
    loadType: 'easy',
    totalPlannedKm: 30,
    description: 'Recovery week — lower volume, keep it easy',
    coachComments: 'Deload before the half-marathon block.',
    createdAt: '2026-03-05T10:00:00Z',
    updatedAt: '2026-03-05T10:00:00Z',
  };
  weekPlans.set(w11.weekStart, w11);

  const w11Sessions: Omit<TrainingSession, 'createdAt' | 'updatedAt'>[] = [
    {
      id: 's-w11-1', weekPlanId: w11.id, dayOfWeek: 'monday', sortOrder: 0,
      trainingType: 'run', description: 'Easy jog',
      coachComments: null, plannedDurationMinutes: 30, plannedDistanceKm: 5,
      typeSpecificData: { type: 'run', pace_target: '6:30/km', hr_zone: 2, terrain: 'road' },
      isCompleted: false, completedAt: null, traineeNotes: null,
      stravaActivityId: null, stravaSyncedAt: null,
    },
    {
      id: 's-w11-2', weekPlanId: w11.id, dayOfWeek: 'tuesday', sortOrder: 0,
      trainingType: 'cycling', description: 'Easy spin',
      coachComments: null, plannedDurationMinutes: 45, plannedDistanceKm: null,
      typeSpecificData: { type: 'cycling', avg_speed_target_kmh: 22, hr_zone: 1, terrain: 'indoor' },
      isCompleted: false, completedAt: null, traineeNotes: null,
      stravaActivityId: null, stravaSyncedAt: null,
    },
    {
      id: 's-w11-3', weekPlanId: w11.id, dayOfWeek: 'wednesday', sortOrder: 0,
      trainingType: 'run', description: 'Fartlek — 8x30s fast / 90s easy',
      coachComments: 'Keep it fun and relaxed',
      plannedDurationMinutes: 40, plannedDistanceKm: 7,
      typeSpecificData: { type: 'run', pace_target: '5:30/km', hr_zone: 3, terrain: 'road' },
      isCompleted: false, completedAt: null, traineeNotes: null,
      stravaActivityId: null, stravaSyncedAt: null,
    },
    {
      id: 's-w11-4', weekPlanId: w11.id, dayOfWeek: 'thursday', sortOrder: 0,
      trainingType: 'strength', description: 'Full body maintenance',
      coachComments: 'Light weights, higher reps',
      plannedDurationMinutes: 40, plannedDistanceKm: null,
      typeSpecificData: { type: 'strength', muscle_groups: ['full body'], exercises: [
        { name: 'Goblet Squat', sets: 3, reps: 12, weight_kg: 16 },
        { name: 'Dumbbell Row', sets: 3, reps: 12, weight_kg: 12 },
        { name: 'Plank', sets: 3, reps: '45s' },
      ]},
      isCompleted: false, completedAt: null, traineeNotes: null,
      stravaActivityId: null, stravaSyncedAt: null,
    },
    {
      id: 's-w11-5', weekPlanId: w11.id, dayOfWeek: 'friday', sortOrder: 0,
      trainingType: 'yoga', description: 'Restorative yoga',
      coachComments: null, plannedDurationMinutes: 30, plannedDistanceKm: null,
      typeSpecificData: { type: 'yoga', focus_area: 'Full body', style: 'Restorative' },
      isCompleted: false, completedAt: null, traineeNotes: null,
      stravaActivityId: null, stravaSyncedAt: null,
    },
    {
      id: 's-w11-6', weekPlanId: w11.id, dayOfWeek: 'saturday', sortOrder: 0,
      trainingType: 'run', description: 'Moderate long run',
      coachComments: 'Comfortable pace, enjoy it',
      plannedDurationMinutes: 70, plannedDistanceKm: 12,
      typeSpecificData: { type: 'run', pace_target: '6:00/km', hr_zone: 2, terrain: 'trail' },
      isCompleted: false, completedAt: null, traineeNotes: null,
      stravaActivityId: null, stravaSyncedAt: null,
    },
    {
      id: 's-w11-7', weekPlanId: w11.id, dayOfWeek: 'sunday', sortOrder: 0,
      trainingType: 'rest_day', description: null,
      coachComments: 'Full rest before the new block',
      plannedDurationMinutes: null, plannedDistanceKm: null,
      typeSpecificData: { type: 'rest_day', activity_suggestion: 'Meal prep for next week' },
      isCompleted: false, completedAt: null, traineeNotes: null,
      stravaActivityId: null, stravaSyncedAt: null,
    },
  ];

  for (const s of w11Sessions) {
    sessions.set(s.id, { ...s, createdAt: w11.createdAt, updatedAt: w11.updatedAt } as TrainingSession);
  }
}

// Run seed once
seed();

// ---------------------------------------------------------------------------
// Mock query implementations — same signatures as the real ones
// ---------------------------------------------------------------------------

function delay(ms = 150): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

// --- Week Plans ---

export async function mockFetchWeekPlanByDate(
  weekStart: string
): Promise<WeekPlan | null> {
  await delay();
  return weekPlans.get(weekStart) ?? null;
}

export async function mockCreateWeekPlan(
  input: CreateWeekPlanInput
): Promise<WeekPlan> {
  await delay();
  const plan: WeekPlan = {
    id: nextId(),
    weekStart: input.weekStart,
    year: input.year,
    weekNumber: input.weekNumber,
    loadType: input.loadType ?? null,
    totalPlannedKm: input.totalPlannedKm ?? null,
    description: input.description ?? null,
    coachComments: input.coachComments ?? null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  weekPlans.set(plan.weekStart, plan);
  return plan;
}

export async function mockUpdateWeekPlan(
  input: UpdateWeekPlanInput
): Promise<WeekPlan> {
  await delay();
  let found: WeekPlan | undefined;
  for (const wp of weekPlans.values()) {
    if (wp.id === input.id) { found = wp; break; }
  }
  if (!found) throw new Error(`Week plan ${input.id} not found`);

  const updated: WeekPlan = {
    ...found,
    ...(input.loadType !== undefined && { loadType: input.loadType }),
    ...(input.totalPlannedKm !== undefined && { totalPlannedKm: input.totalPlannedKm }),
    ...(input.description !== undefined && { description: input.description }),
    ...(input.coachComments !== undefined && { coachComments: input.coachComments }),
    updatedAt: new Date().toISOString(),
  };
  weekPlans.set(updated.weekStart, updated);
  return updated;
}

export async function mockGetOrCreateWeekPlan(
  weekStart: string,
  year: number,
  weekNumber: number
): Promise<WeekPlan> {
  const existing = await mockFetchWeekPlanByDate(weekStart);
  if (existing) return existing;
  return mockCreateWeekPlan({ weekStart, year, weekNumber });
}

// --- Sessions ---

export async function mockFetchSessionsByWeekPlan(
  weekPlanId: string
): Promise<TrainingSession[]> {
  await delay();
  const result: TrainingSession[] = [];
  for (const s of sessions.values()) {
    if (s.weekPlanId === weekPlanId) result.push(s);
  }
  return result.sort((a, b) => a.sortOrder - b.sortOrder);
}

export async function mockCreateSession(
  input: CreateSessionInput
): Promise<TrainingSession> {
  await delay();
  const session: TrainingSession = {
    id: nextId(),
    weekPlanId: input.weekPlanId,
    dayOfWeek: input.dayOfWeek,
    sortOrder: input.sortOrder ?? 0,
    trainingType: input.trainingType,
    description: input.description ?? null,
    coachComments: input.coachComments ?? null,
    plannedDurationMinutes: input.plannedDurationMinutes ?? null,
    plannedDistanceKm: input.plannedDistanceKm ?? null,
    typeSpecificData: input.typeSpecificData ?? ({ type: input.trainingType } as TypeSpecificData),
    isCompleted: false,
    completedAt: null,
    traineeNotes: null,
    stravaActivityId: null,
    stravaSyncedAt: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  sessions.set(session.id, session);
  return session;
}

export async function mockUpdateSession(
  input: UpdateSessionInput
): Promise<TrainingSession> {
  await delay();
  const existing = sessions.get(input.id);
  if (!existing) throw new Error(`Session ${input.id} not found`);

  const updated: TrainingSession = {
    ...existing,
    ...(input.trainingType !== undefined && { trainingType: input.trainingType }),
    ...(input.description !== undefined && { description: input.description }),
    ...(input.coachComments !== undefined && { coachComments: input.coachComments }),
    ...(input.plannedDurationMinutes !== undefined && { plannedDurationMinutes: input.plannedDurationMinutes }),
    ...(input.plannedDistanceKm !== undefined && { plannedDistanceKm: input.plannedDistanceKm }),
    ...(input.typeSpecificData !== undefined && { typeSpecificData: input.typeSpecificData }),
    ...(input.sortOrder !== undefined && { sortOrder: input.sortOrder }),
    updatedAt: new Date().toISOString(),
  };
  sessions.set(updated.id, updated);
  return updated;
}

export async function mockDeleteSession(sessionId: string): Promise<void> {
  await delay();
  sessions.delete(sessionId);
}

export async function mockUpdateTraineeSession(
  input: TraineeSessionUpdate
): Promise<TrainingSession> {
  await delay();
  const existing = sessions.get(input.id);
  if (!existing) throw new Error(`Session ${input.id} not found`);

  const updated: TrainingSession = {
    ...existing,
    ...(input.isCompleted !== undefined && {
      isCompleted: input.isCompleted,
      completedAt: input.isCompleted ? new Date().toISOString() : null,
    }),
    ...(input.traineeNotes !== undefined && { traineeNotes: input.traineeNotes }),
    updatedAt: new Date().toISOString(),
  };
  sessions.set(updated.id, updated);
  return updated;
}
