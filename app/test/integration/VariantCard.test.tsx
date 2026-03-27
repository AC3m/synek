import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '~/test/utils/render';
import { VariantCard } from '~/components/strength/VariantCard';
import type { StrengthVariant } from '~/types/training';

const mockVariant: StrengthVariant = {
  id: 'v1',
  userId: 'u1',
  name: 'Push Day',
  description: 'Chest and shoulders',
  exercises: [
    {
      id: 'e1',
      variantId: 'v1',
      name: 'Bench Press',
      videoUrl: null,
      sets: 4,
      repsMin: 8,
      repsMax: 12,
      loadUnit: 'kg',
      sortOrder: 0,
      supersetGroup: null,
      createdAt: '2024-01-01T00:00:00Z',
    },
  ],
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-01T00:00:00Z',
};

function renderCard(onDelete = vi.fn(), onEdit = vi.fn()) {
  return renderWithProviders(
    <VariantCard variant={mockVariant} onEdit={onEdit} onDelete={onDelete} />,
  );
}

describe('VariantCard deletion flow', () => {
  it('renders delete button', () => {
    renderCard();
    expect(screen.getByRole('button', { name: /delete/i })).toBeInTheDocument();
  });

  it('clicking delete opens confirm dialog', async () => {
    renderCard();
    await userEvent.click(screen.getByRole('button', { name: /delete/i }));
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('cancel closes dialog without calling onDelete', async () => {
    const onDelete = vi.fn();
    renderCard(onDelete);

    await userEvent.click(screen.getByRole('button', { name: /delete/i }));
    expect(screen.getByRole('dialog')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: /cancel/i }));
    expect(onDelete).not.toHaveBeenCalled();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('confirm calls onDelete with variant id', async () => {
    const onDelete = vi.fn();
    renderCard(onDelete);

    await userEvent.click(screen.getByRole('button', { name: /delete/i }));
    // Click the confirm/delete button inside the dialog
    const deleteButtons = screen.getAllByRole('button', { name: /delete/i });
    // The one inside the dialog is the last one rendered
    await userEvent.click(deleteButtons[deleteButtons.length - 1]);

    expect(onDelete).toHaveBeenCalledWith('v1');
  });
});
