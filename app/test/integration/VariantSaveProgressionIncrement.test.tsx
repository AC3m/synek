import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';
import { VariantDetailView } from '~/components/strength/VariantDetailView';
import { VariantFormModal } from '~/components/strength/VariantFormModal';
import { renderWithProviders } from '~/test/utils/render';

const { updateVariantMutateAsync, upsertExercisesMutateAsync, createVariantMutateAsync } =
  vi.hoisted(() => ({
    updateVariantMutateAsync: vi.fn(),
    upsertExercisesMutateAsync: vi.fn(),
    createVariantMutateAsync: vi.fn(),
  }));

const savePayload = {
  name: 'Push A',
  description: 'desc',
  exercises: [
    {
      id: 'ex1',
      name: 'Bench Press',
      videoUrl: '',
      sets: 3,
      repsMin: 8,
      repsMax: 10,
      perSetReps: null,
      loadUnit: 'kg' as const,
      supersetGroup: null,
      progressionIncrement: 2.5,
    },
  ],
};

vi.mock('sonner', () => ({
  toast: Object.assign(vi.fn(), { error: vi.fn() }),
}));

vi.mock('~/lib/context/AuthContext', () => ({
  useAuth: () => ({
    user: { id: 'user-1', role: 'coach', name: 'Coach', email: 'coach@example.com' },
  }),
}));

vi.mock('~/lib/hooks/useStrengthVariants', () => ({
  useStrengthVariant: () => ({
    data: {
      id: 'variant-1',
      userId: 'user-1',
      name: 'Push A',
      description: 'desc',
      exercises: [],
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-01T00:00:00Z',
    },
    isLoading: false,
  }),
  useUpdateStrengthVariant: () => ({
    mutateAsync: updateVariantMutateAsync,
  }),
  useUpsertVariantExercises: () => ({
    mutateAsync: upsertExercisesMutateAsync,
  }),
  useCreateStrengthVariant: () => ({
    mutateAsync: createVariantMutateAsync,
    isPending: false,
  }),
}));

vi.mock('~/components/strength/VariantForm', () => ({
  VariantForm: ({ onSave }: { onSave: (data: typeof savePayload) => void }) => (
    <button type="button" onClick={() => onSave(savePayload)}>
      Save variant
    </button>
  ),
}));

vi.mock('~/components/ui/form-modal', () => ({
  FormModal: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

describe('strength variant save payloads', () => {
  beforeEach(() => {
    updateVariantMutateAsync.mockReset();
    upsertExercisesMutateAsync.mockReset();
    createVariantMutateAsync.mockReset();
    updateVariantMutateAsync.mockResolvedValue(undefined);
    upsertExercisesMutateAsync.mockResolvedValue(undefined);
    createVariantMutateAsync.mockResolvedValue({
      id: 'variant-1',
      userId: 'user-1',
      name: 'Push A',
      description: 'desc',
      exercises: [],
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-01T00:00:00Z',
    });
  });

  it('passes progressionIncrement when updating a variant', async () => {
    const user = userEvent.setup();
    renderWithProviders(
      <VariantDetailView variantId="variant-1" canEdit baseRoute="/coach/strength" />,
      { initialRoute: '/coach/strength/variant-1' },
    );

    await user.click(screen.getByRole('button', { name: /save variant/i }));

    expect(upsertExercisesMutateAsync).toHaveBeenCalledWith(
      expect.objectContaining({
        exercises: [
          expect.objectContaining({
            progressionIncrement: 2.5,
          }),
        ],
      }),
    );
  });

  it('passes progressionIncrement when creating a variant', async () => {
    const user = userEvent.setup();
    renderWithProviders(<VariantFormModal open onClose={() => {}} onCreated={() => {}} />, {
      initialRoute: '/coach/strength',
    });

    await user.click(screen.getByRole('button', { name: /save variant/i }));

    expect(createVariantMutateAsync).toHaveBeenCalledWith(
      expect.objectContaining({
        exercises: [
          expect.objectContaining({
            progressionIncrement: 2.5,
          }),
        ],
      }),
    );
  });
});
