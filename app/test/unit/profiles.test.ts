import { describe, it, expect, beforeEach } from 'vitest';
import {
  mockFetchSelfPlanPermission,
  mockUpdateSelfPlanPermission,
  resetMockSelfPlan,
} from '~/lib/queries/profile';

describe('Self-plan permission — mock store', () => {
  beforeEach(() => {
    resetMockSelfPlan();
  });

  it('returns true for seeded athlete-1 by default', async () => {
    const result = await mockFetchSelfPlanPermission('athlete-1');
    expect(result).toBe(true);
  });

  it('returns true for seeded athlete-2 by default', async () => {
    const result = await mockFetchSelfPlanPermission('athlete-2');
    expect(result).toBe(true);
  });

  it('returns true for an unknown athlete (safe default)', async () => {
    const result = await mockFetchSelfPlanPermission('unknown-athlete');
    expect(result).toBe(true);
  });

  it('persists an updated value', async () => {
    await mockUpdateSelfPlanPermission('athlete-1', false);
    const result = await mockFetchSelfPlanPermission('athlete-1');
    expect(result).toBe(false);
  });

  it('subsequent fetch returns the updated value', async () => {
    await mockUpdateSelfPlanPermission('athlete-2', false);
    await mockUpdateSelfPlanPermission('athlete-2', true);
    const result = await mockFetchSelfPlanPermission('athlete-2');
    expect(result).toBe(true);
  });

  it('resetMockSelfPlan restores all athletes to true', async () => {
    await mockUpdateSelfPlanPermission('athlete-1', false);
    await mockUpdateSelfPlanPermission('athlete-2', false);
    resetMockSelfPlan();
    expect(await mockFetchSelfPlanPermission('athlete-1')).toBe(true);
    expect(await mockFetchSelfPlanPermission('athlete-2')).toBe(true);
  });
});
