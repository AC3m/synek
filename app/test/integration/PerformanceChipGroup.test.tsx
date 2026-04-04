import { render, screen } from '@testing-library/react';
import { PerformanceChipGroup } from '~/components/training/PerformanceChipGroup';
import type { TrainingSession } from '~/types/training';

function makeSession(overrides: Partial<TrainingSession> = {}): TrainingSession {
  return {
    id: 's1',
    weekPlanId: 'w1',
    dayOfWeek: 'monday',
    sortOrder: 0,
    trainingType: 'run',
    description: null,
    coachComments: null,
    plannedDurationMinutes: null,
    plannedDistanceKm: null,
    typeSpecificData: { type: 'run' },
    isCompleted: true,
    completedAt: null,
    actualDurationMinutes: null,
    actualDistanceKm: null,
    actualPace: null,
    avgHeartRate: null,
    maxHeartRate: null,
    rpe: null,
    calories: null,
    coachPostFeedback: null,
    athleteNotes: null,
    stravaActivityId: null,
    stravaSyncedAt: null,
    createdAt: '',
    updatedAt: '',
    ...overrides,
  };
}

describe('PerformanceChipGroup', () => {
  it('avgHr chip receives delay-[125ms] when it is the only visible chip', () => {
    // duration/distance/pace hidden, only avgHeartRate set
    const session = makeSession({ avgHeartRate: 150 });
    const { container } = render(
      <PerformanceChipGroup
        session={session}
        isMasked={false}
        shouldShowMaskedPlaceholders={false}
        animate={true}
      />,
    );
    // The single rendered chip div should have delay-[125ms] class
    const chipDiv = container.querySelector('[class*="delay-"]');
    expect(chipDiv).not.toBeNull();
    expect(chipDiv!.className).toContain('delay-[125ms]');
  });

  it('isMasked=true: container has blur-[3px] and select-none', () => {
    const session = makeSession({ actualDurationMinutes: 45 });
    const { container } = render(
      <PerformanceChipGroup
        session={session}
        isMasked={true}
        shouldShowMaskedPlaceholders={true}
      />,
    );
    const wrapper = container.firstChild as HTMLElement;
    expect(wrapper.className).toContain('blur-[3px]');
    expect(wrapper.className).toContain('select-none');
  });

  it('isMasked=true: chips display --- instead of actual values', () => {
    const session = makeSession({ actualDurationMinutes: 45, avgHeartRate: 150 });
    render(
      <PerformanceChipGroup
        session={session}
        isMasked={true}
        shouldShowMaskedPlaceholders={true}
      />,
    );
    const maskedValues = screen.getAllByText('---');
    expect(maskedValues.length).toBeGreaterThan(0);
  });

  it('isMasked=false: actual values are rendered', () => {
    const session = makeSession({ actualDurationMinutes: 45 });
    render(
      <PerformanceChipGroup
        session={session}
        isMasked={false}
        shouldShowMaskedPlaceholders={false}
      />,
    );
    expect(screen.getByText(/45/)).toBeTruthy();
  });

  it('shouldShowMaskedPlaceholders=true renders chips even when session values are null', () => {
    const session = makeSession(); // all null
    const { container } = render(
      <PerformanceChipGroup
        session={session}
        isMasked={true}
        shouldShowMaskedPlaceholders={true}
      />,
    );
    // All chips should be rendered (7 including calories)
    const chipDivs = container.querySelectorAll('.flex.flex-col');
    expect(chipDivs.length).toBe(7);
  });

  it('size="compact" applies text-[10px] to value spans', () => {
    const session = makeSession({ actualDurationMinutes: 30 });
    const { container } = render(
      <PerformanceChipGroup
        session={session}
        isMasked={false}
        shouldShowMaskedPlaceholders={false}
        size="compact"
      />,
    );
    const valueSpan = container.querySelector('span.text-\\[10px\\].font-semibold');
    expect(valueSpan).not.toBeNull();
  });

  it('animate=true: visible chips have animate-in fade-in class', () => {
    const session = makeSession({ actualDurationMinutes: 45 });
    const { container } = render(
      <PerformanceChipGroup
        session={session}
        isMasked={false}
        shouldShowMaskedPlaceholders={false}
        animate={true}
      />,
    );
    const chipDiv = container.querySelector('[class*="animate-in"]');
    expect(chipDiv).not.toBeNull();
    expect(chipDiv!.className).toContain('fade-in');
  });
});
