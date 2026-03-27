import { render, act } from '@testing-library/react';
import { QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router';
import type { ReactNode } from 'react';
import { I18nextProvider } from 'react-i18next';
import i18n from '~/i18n/config';
import { WeekGrid } from '~/components/calendar/WeekGrid';
import type { SessionsByDay, TrainingSession, ReorderSessionInput } from '~/types/training';
import { DAYS_OF_WEEK } from '~/types/training';
import { createTestQueryClient } from '~/test/utils/query-client';

// Capture the onDragEnd callback from DndContext so we can fire it manually
let capturedOnDragEnd:
  | ((event: {
      active: { id: string; data: { current: { day: string } } };
      over: { id: string } | null;
    }) => void)
  | null = null;

vi.mock('@dnd-kit/core', () => ({
  DndContext: ({
    children,
    onDragEnd,
  }: {
    children: ReactNode;
    onDragEnd: typeof capturedOnDragEnd;
  }) => {
    capturedOnDragEnd = onDragEnd ?? null;
    return <>{children}</>;
  },
  useDroppable: () => ({ setNodeRef: vi.fn(), isOver: false }),
  PointerSensor: class {},
  KeyboardSensor: class {},
  useSensor: vi.fn(),
  useSensors: vi.fn(() => []),
}));

vi.mock('@dnd-kit/sortable', () => ({
  SortableContext: ({ children }: { children: ReactNode }) => <>{children}</>,
  useSortable: () => ({
    attributes: {},
    listeners: {},
    setNodeRef: vi.fn(),
    transform: null,
    transition: null,
    isDragging: false,
  }),
  verticalListSortingStrategy: {},
}));

vi.mock('~/lib/context/AuthContext', () => ({
  useAuth: () => ({
    effectiveAthleteId: 'athlete-1',
    user: { id: 'coach-1', role: 'coach', name: 'Coach' },
  }),
}));

function makeWrapper() {
  const queryClient = createTestQueryClient();
  function Wrapper({ children }: { children: ReactNode }) {
    return (
      <MemoryRouter>
        <QueryClientProvider client={queryClient}>
          <I18nextProvider i18n={i18n}>{children}</I18nextProvider>
        </QueryClientProvider>
      </MemoryRouter>
    );
  }
  return Wrapper;
}

function makeSession(
  id: string,
  day: TrainingSession['dayOfWeek'],
  sortOrder: number,
): TrainingSession {
  return {
    id,
    weekPlanId: 'wp-1',
    dayOfWeek: day,
    sortOrder,
    trainingType: 'run',
    description: 'Easy run',
    coachComments: null,
    plannedDurationMinutes: 30,
    plannedDistanceKm: 5,
    typeSpecificData: { type: 'run' },
    isCompleted: false,
    completedAt: null,
    actualDurationMinutes: null,
    actualDistanceKm: null,
    actualPace: null,
    avgHeartRate: null,
    maxHeartRate: null,
    rpe: null,
    coachPostFeedback: null,
    athleteNotes: null,
    stravaActivityId: null,
    stravaSyncedAt: null,
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
  };
}

function makeSessionsByDay(overrides: Partial<SessionsByDay> = {}): SessionsByDay {
  const base = DAYS_OF_WEEK.reduce((acc, d) => ({ ...acc, [d]: [] }), {} as SessionsByDay);
  return { ...base, ...overrides };
}

beforeEach(() => {
  capturedOnDragEnd = null;
});

describe('WeekGrid drag-and-drop', () => {
  it('calls onReorderSession with target day and appended sortOrder on cross-day drop', () => {
    const onReorderSession = vi.fn();
    const sessionsByDay = makeSessionsByDay({
      monday: [makeSession('s1', 'monday', 0)],
      thursday: [makeSession('s2', 'thursday', 0)],
    });

    const Wrapper = makeWrapper();
    render(
      <Wrapper>
        <WeekGrid
          sessionsByDay={sessionsByDay}
          readonly={false}
          onReorderSession={onReorderSession}
          weekStart="2026-03-16"
        />
      </Wrapper>,
    );

    // DndContext should be mounted and capturedOnDragEnd should be set
    expect(capturedOnDragEnd).not.toBeNull();

    act(() => {
      capturedOnDragEnd!({
        active: { id: 's1', data: { current: { day: 'monday' } } },
        over: { id: 'thursday' },
      });
    });

    expect(onReorderSession).toHaveBeenCalledWith(
      expect.objectContaining({ sessionId: 's1', dayOfWeek: 'thursday' }),
    );
  });

  it('calls onReorderSession with same dayOfWeek on within-day drop', () => {
    const onReorderSession = vi.fn();
    const sessionsByDay = makeSessionsByDay({
      monday: [makeSession('s1', 'monday', 0), makeSession('s2', 'monday', 1)],
    });

    const Wrapper = makeWrapper();
    render(
      <Wrapper>
        <WeekGrid
          sessionsByDay={sessionsByDay}
          readonly={false}
          onReorderSession={onReorderSession}
          weekStart="2026-03-16"
        />
      </Wrapper>,
    );

    expect(capturedOnDragEnd).not.toBeNull();

    act(() => {
      capturedOnDragEnd!({
        active: { id: 's1', data: { current: { day: 'monday' } } },
        over: { id: 'monday' },
      });
    });

    const result: ReorderSessionInput = onReorderSession.mock.calls[0][0];
    expect(result.sessionId).toBe('s1');
    expect(result.dayOfWeek).toBe('monday');
    expect(typeof result.sortOrder).toBe('number');
  });

  it('does NOT call onReorderSession when drop is cancelled (over is null)', () => {
    const onReorderSession = vi.fn();
    const sessionsByDay = makeSessionsByDay({
      monday: [makeSession('s1', 'monday', 0)],
    });

    const Wrapper = makeWrapper();
    render(
      <Wrapper>
        <WeekGrid
          sessionsByDay={sessionsByDay}
          readonly={false}
          onReorderSession={onReorderSession}
          weekStart="2026-03-16"
        />
      </Wrapper>,
    );

    expect(capturedOnDragEnd).not.toBeNull();

    act(() => {
      capturedOnDragEnd!({
        active: { id: 's1', data: { current: { day: 'monday' } } },
        over: null,
      });
    });

    expect(onReorderSession).not.toHaveBeenCalled();
  });
});
