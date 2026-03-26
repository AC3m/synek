import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '~/test/utils/render';
import { ConfirmDialog } from '~/components/ui/confirm-dialog';

function renderDialog(props: Partial<React.ComponentProps<typeof ConfirmDialog>> = {}) {
  const defaults = {
    open: true,
    onOpenChange: vi.fn(),
    title: 'Delete?',
    onConfirm: vi.fn(),
  };
  return renderWithProviders(<ConfirmDialog {...defaults} {...props} />);
}

describe('ConfirmDialog', () => {
  it('renders title and description', () => {
    renderDialog({ title: 'Are you sure?', description: 'This cannot be undone.' });
    expect(screen.getByRole('heading', { name: 'Are you sure?' })).toBeInTheDocument();
    expect(screen.getByText('This cannot be undone.')).toBeInTheDocument();
  });

  it('does not render description when omitted', () => {
    renderDialog({ title: 'No desc' });
    expect(screen.queryByRole('paragraph')).not.toBeInTheDocument();
  });

  it('cancel closes without calling onConfirm', async () => {
    const onConfirm = vi.fn();
    const onOpenChange = vi.fn();
    renderDialog({ onConfirm, onOpenChange });

    await userEvent.click(screen.getByRole('button', { name: /cancel/i }));
    expect(onConfirm).not.toHaveBeenCalled();
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it('confirm calls onConfirm and closes', async () => {
    const onConfirm = vi.fn();
    const onOpenChange = vi.fn();
    renderDialog({ onConfirm, onOpenChange });

    await userEvent.click(screen.getByRole('button', { name: /confirm/i }));
    expect(onConfirm).toHaveBeenCalledTimes(1);
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it('destructive confirm button has destructive variant', () => {
    renderDialog({ destructive: true, confirmLabel: 'Remove' });
    const btn = screen.getByRole('button', { name: 'Remove' });
    expect(btn.className).toMatch(/destructive/);
  });

  it('custom labels override defaults', () => {
    renderDialog({ confirmLabel: 'Yes, remove it', cancelLabel: 'No, keep it' });
    expect(screen.getByRole('button', { name: 'Yes, remove it' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'No, keep it' })).toBeInTheDocument();
  });

  it('is not visible when open is false', () => {
    renderDialog({ open: false });
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
});
