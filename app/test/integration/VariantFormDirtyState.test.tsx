import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';
import { VariantForm } from '~/components/strength/VariantForm';
import { renderWithProviders } from '~/test/utils/render';
import type { StrengthVariant } from '~/types/training';

const initialVariant: StrengthVariant = {
  id: 'variant-1',
  userId: 'user-1',
  name: 'Push A',
  description: 'desc',
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-01T00:00:00Z',
  exercises: [
    {
      id: 'ex1',
      variantId: 'variant-1',
      name: 'Bench Press',
      videoUrl: '',
      sets: 3,
      repsMin: 8,
      repsMax: 10,
      perSetReps: null,
      loadUnit: 'kg',
      sortOrder: 0,
      supersetGroup: null,
      progressionIncrement: 2.5,
      createdAt: '2024-01-01T00:00:00Z',
    },
  ],
};

describe('VariantForm dirty state', () => {
  it('disables save when editing an unchanged variant', () => {
    renderWithProviders(<VariantForm initial={initialVariant} onSave={() => {}} />, {
      initialRoute: '/coach/strength/variant-1',
    });

    expect(screen.getByRole('button', { name: 'Save' })).toBeDisabled();
  });

  it('submits once the variant changes', async () => {
    const user = userEvent.setup();
    const onSave = vi.fn();

    renderWithProviders(<VariantForm initial={initialVariant} onSave={onSave} />, {
      initialRoute: '/coach/strength/variant-1',
    });

    await user.type(screen.getByLabelText(/description/i), ' updated');
    await user.click(screen.getByRole('button', { name: 'Save' }));

    expect(onSave).toHaveBeenCalledTimes(1);
  });
});
