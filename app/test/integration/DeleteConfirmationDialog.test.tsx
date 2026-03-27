import { render, screen, fireEvent } from '@testing-library/react';
import { DeleteConfirmationDialog } from '~/components/training/DeleteConfirmationDialog';

function renderDialog(overrides: Partial<Parameters<typeof DeleteConfirmationDialog>[0]> = {}) {
  const props = {
    open: true,
    onOpenChange: vi.fn(),
    title: 'Delete Session',
    description: 'Are you sure you want to delete this session?',
    confirmLabel: 'Delete',
    cancelLabel: 'Cancel',
    onConfirm: vi.fn(),
    ...overrides,
  };
  return { ...render(<DeleteConfirmationDialog {...props} />), props };
}

describe('DeleteConfirmationDialog', () => {
  it('renders title, description, confirmLabel, and cancelLabel', () => {
    renderDialog();
    expect(screen.getByText('Delete Session')).toBeTruthy();
    expect(screen.getByText('Are you sure you want to delete this session?')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Delete' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeTruthy();
  });

  it('confirm button is disabled when isPending=true', () => {
    renderDialog({ isPending: true });
    const confirmBtn = screen.getByRole('button', { name: 'Delete' });
    expect(confirmBtn).toBeDisabled();
  });

  it('onConfirm is NOT called when confirm button is clicked while isPending=true', () => {
    const { props } = renderDialog({ isPending: true });
    fireEvent.click(screen.getByRole('button', { name: 'Delete' }));
    expect(props.onConfirm).not.toHaveBeenCalled();
  });

  it('confirm button fires onConfirm when isPending=false', () => {
    const { props } = renderDialog({ isPending: false });
    fireEvent.click(screen.getByRole('button', { name: 'Delete' }));
    expect(props.onConfirm).toHaveBeenCalledTimes(1);
  });

  it('cancel button calls onOpenChange(false) when isPending=false', () => {
    const { props } = renderDialog({ isPending: false });
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(props.onOpenChange).toHaveBeenCalledWith(false);
  });

  it('cancel button calls onOpenChange(false) even when isPending=true', () => {
    const { props } = renderDialog({ isPending: true });
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(props.onOpenChange).toHaveBeenCalledWith(false);
  });
});
